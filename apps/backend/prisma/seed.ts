import 'dotenv/config';
import { PrismaClient, UserRole, OrgRole, OrgStatus, MembershipStatus, TicketStatus, TicketEventType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive QueueLess database seed with Ethiopian public & private institutions...');

  const passwordHash = await bcrypt.hash('Password@123456', 10);

  // -------------------------------------------------------------
  // 1. SYSTEM ADMIN
  // -------------------------------------------------------------
  const admin = await prisma.user.upsert({
    where: { email: 'admin@queueless.com' },
    update: {},
    create: {
      email: 'admin@queueless.com',
      passwordHash,
      fullName: 'System Administrator (ስርዓት አስተዳዳሪ)',
      role: UserRole.SYSTEM_ADMIN,
      phone: '+251911000001',
    },
  });

  // -------------------------------------------------------------
  // 2. BASE ORGANIZATIONS (Kept for compatibility with existing tests)
  // -------------------------------------------------------------
  const orgMetro = await prisma.organization.upsert({
    where: { slug: 'metro-health' },
    update: {
      name: 'Metro Health Specialized Clinic (Addis Ababa)',
      address: 'Namibia St, Bole Sub-City, Addis Ababa, Ethiopia',
      timezone: 'Africa/Addis_Ababa',
    },
    create: {
      name: 'Metro Health Specialized Clinic (Addis Ababa)',
      slug: 'metro-health',
      address: 'Namibia St, Bole Sub-City, Addis Ababa, Ethiopia',
      timezone: 'Africa/Addis_Ababa',
      status: OrgStatus.ACTIVE,
    },
  });

  const mainBranch = await prisma.branch.upsert({
    where: { organizationId_code: { organizationId: orgMetro.id, code: 'MAIN' } },
    update: {},
    create: {
      organizationId: orgMetro.id,
      name: 'Metro Health Main Campus',
      code: 'MAIN',
      address: 'Bole Sub-City, Woreda 03, Addis Ababa, Ethiopia',
      phone: '+251 11 661 2345',
      latitude: 9.005401,
      longitude: 38.789123,
      isActive: true,
    },
  });

  for (let day = 0; day <= 6; day++) {
    await prisma.operatingHour.upsert({
      where: { branchId_dayOfWeek: { branchId: mainBranch.id, dayOfWeek: day } },
      update: {},
      create: {
        branchId: mainBranch.id,
        dayOfWeek: day,
        openTime: '08:00',
        closeTime: day === 0 ? '14:00' : '18:00',
        isClosed: day === 0,
      },
    });
  }

  const genService = await prisma.service.upsert({
    where: { branchId_code: { branchId: mainBranch.id, code: 'GEN' } },
    update: {},
    create: {
      organizationId: orgMetro.id,
      branchId: mainBranch.id,
      name: 'General Consultation',
      code: 'GEN',
      description: 'Primary healthcare, triage and general clinical outpatient consultation',
      estimatedDurationMinutes: 15,
      priorityLevel: 2,
    },
  });

  const pharmService = await prisma.service.upsert({
    where: { branchId_code: { branchId: mainBranch.id, code: 'PHARM' } },
    update: {},
    create: {
      organizationId: orgMetro.id,
      branchId: mainBranch.id,
      name: 'Pharmacy & Dispensing',
      code: 'PHARM',
      description: 'Prescription pickup, dosage consultation and medicines',
      estimatedDurationMinutes: 5,
      priorityLevel: 1,
    },
  });

  for (const s of [genService, pharmService]) {
    const q = await prisma.queue.upsert({
      where: { branchId_serviceId: { branchId: mainBranch.id, serviceId: s.id } },
      update: {},
      create: {
        organizationId: orgMetro.id,
        branchId: mainBranch.id,
        serviceId: s.id,
        name: `${s.name} Queue`,
        prefix: s.code.slice(0, 2),
      },
    });

    await prisma.queueConfiguration.upsert({
      where: { queueId: q.id },
      update: {},
      create: {
        queueId: q.id,
        maxWaitingCapacity: 100,
        autoCallNext: false,
        allowRemoteJoin: true,
        geofenceRadiusMeters: 10000,
        notificationThresholdAhead: 3,
        bufferMinutes: 5,
      },
    });
  }

  const counter1 = await prisma.serviceCounter.upsert({
    where: { branchId_number: { branchId: mainBranch.id, number: '1' } },
    update: {},
    create: {
      organizationId: orgMetro.id,
      branchId: mainBranch.id,
      name: 'Counter 1 (General)',
      number: '1',
      status: 'IDLE',
    },
  });

  const counter2 = await prisma.serviceCounter.upsert({
    where: { branchId_number: { branchId: mainBranch.id, number: '2' } },
    update: {},
    create: {
      organizationId: orgMetro.id,
      branchId: mainBranch.id,
      name: 'Counter 2 (Pharmacy)',
      number: '2',
      status: 'IDLE',
    },
  });

  await prisma.counterServiceAssignment.upsert({
    where: { counterId_serviceId: { counterId: counter1.id, serviceId: genService.id } },
    update: {},
    create: { counterId: counter1.id, serviceId: genService.id },
  });

  await prisma.counterServiceAssignment.upsert({
    where: { counterId_serviceId: { counterId: counter2.id, serviceId: pharmService.id } },
    update: {},
    create: { counterId: counter2.id, serviceId: pharmService.id },
  });

  const metroOwner = await prisma.user.upsert({
    where: { email: 'owner@metrohealth.com' },
    update: {},
    create: {
      email: 'owner@metrohealth.com',
      passwordHash,
      fullName: 'Dr. Sara Mebratu (ዶ/ር ሳራ መብራቱ)',
      role: UserRole.CUSTOMER,
      phone: '+251911400101',
    },
  });

  await prisma.organizationMembership.upsert({
    where: { userId_organizationId: { userId: metroOwner.id, organizationId: orgMetro.id } },
    update: {},
    create: {
      userId: metroOwner.id,
      organizationId: orgMetro.id,
      role: OrgRole.ORG_OWNER,
      status: MembershipStatus.ACTIVE,
    },
  });

  const metroStaff = await prisma.user.upsert({
    where: { email: 'staff@metrohealth.com' },
    update: {},
    create: {
      email: 'staff@metrohealth.com',
      passwordHash,
      fullName: 'Jemal Mohammed (ጀማል መሀመድ)',
      role: UserRole.CUSTOMER,
      phone: '+251911400102',
    },
  });

  await prisma.organizationMembership.upsert({
    where: { userId_organizationId: { userId: metroStaff.id, organizationId: orgMetro.id } },
    update: {},
    create: {
      userId: metroStaff.id,
      organizationId: orgMetro.id,
      role: OrgRole.ORG_STAFF,
      status: MembershipStatus.ACTIVE,
    },
  });

  // Metro Health Demo Login Shortcuts
  const metroAdminDemo = await prisma.user.upsert({
    where: { email: 'admin@metrohealth.demo' },
    update: {},
    create: {
      email: 'admin@metrohealth.demo',
      passwordHash,
      fullName: 'Dr. Fasil Tadesse (ፋሲል ታደሰ)',
      role: UserRole.CUSTOMER,
      phone: '+251911400103',
    },
  });

  await prisma.organizationMembership.upsert({
    where: { userId_organizationId: { userId: metroAdminDemo.id, organizationId: orgMetro.id } },
    update: {},
    create: {
      userId: metroAdminDemo.id,
      organizationId: orgMetro.id,
      role: OrgRole.ORG_ADMIN,
      status: MembershipStatus.ACTIVE,
    },
  });

  const metroStaffDemo = await prisma.user.upsert({
    where: { email: 'staff@metrohealth.demo' },
    update: {},
    create: {
      email: 'staff@metrohealth.demo',
      passwordHash,
      fullName: 'Meskerem Assefa (መስከረም አሰፋ)',
      role: UserRole.CUSTOMER,
      phone: '+251911400104',
    },
  });

  await prisma.organizationMembership.upsert({
    where: { userId_organizationId: { userId: metroStaffDemo.id, organizationId: orgMetro.id } },
    update: {},
    create: {
      userId: metroStaffDemo.id,
      organizationId: orgMetro.id,
      role: OrgRole.ORG_STAFF,
      status: MembershipStatus.ACTIVE,
    },
  });

  // Base Customer
  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {
      fullName: 'Kassahun Tadesse (ካሳሁን ታደሰ)',
      phone: '+251912345678',
    },
    create: {
      email: 'customer@example.com',
      passwordHash,
      fullName: 'Kassahun Tadesse (ካሳሁን ታደሰ)',
      role: UserRole.CUSTOMER,
      phone: '+251912345678',
    },
  });

  // -------------------------------------------------------------
  // 3. ETHIOPIAN CUSTOMERS (Real Ethiopian Citizens)
  // -------------------------------------------------------------
  const ethiopianCustomersData = [
    { email: 'abebe.bikila@gmail.com', name: 'Abebe Bikila (አበበ ቢቂላ)', phone: '+251911223344' },
    { email: 'almaz.ayana@gmail.com', name: 'Almaz Ayana (አልማዝ አያና)', phone: '+251922334455' },
    { email: 'haile.gebres@gmail.com', name: 'Haile Gebrselassie (ኃይሌ ገብረስላሴ)', phone: '+251933445566' },
    { email: 'aster.aweke@gmail.com', name: 'Aster Aweke (አስቴር አወቀ)', phone: '+251944556677' },
    { email: 'derartu.tulu@gmail.com', name: 'Derartu Tulu (ደራርቱ ቱሉ)', phone: '+251955667788' },
    { email: 'kenenisa.bekele@gmail.com', name: 'Kenenisa Bekele (ቀነኒሳ በቀለ)', phone: '+251966778899' },
    { email: 'tirunesh.dibaba@gmail.com', name: 'Tirunesh Dibaba (ጥሩነሽ ዲባባ)', phone: '+251977889900' },
    { email: 'mulatu.astatke@gmail.com', name: 'Mulatu Astatke (ሙላቱ አስታጥቄ)', phone: '+251988990011' },
    { email: 'solomon.bogale@gmail.com', name: 'Solomon Bogale (ሰለሞን ቦጋለ)', phone: '+251911335577' },
    { email: 'hiwot.tadesse@gmail.com', name: 'Hiwot Tadesse (ህይወት ታደሰ)', phone: '+251922446688' },
  ];

  const ethCustomers: Record<string, any> = {};
  for (const c of ethiopianCustomersData) {
    const userObj = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        email: c.email,
        passwordHash,
        fullName: c.name,
        role: UserRole.CUSTOMER,
        phone: c.phone,
      },
    });
    ethCustomers[c.email] = userObj;
  }

  // -------------------------------------------------------------
  // 4. ORGANIZATION: COMMERCIAL BANK OF ETHIOPIA (CBE)
  // -------------------------------------------------------------
  const orgCbe = await prisma.organization.upsert({
    where: { slug: 'commercial-bank-of-ethiopia' },
    update: {},
    create: {
      name: 'Commercial Bank of Ethiopia (የኢትዮጵያ ንግድ ባንክ)',
      slug: 'commercial-bank-of-ethiopia',
      address: 'Ras Desta Damtew St, Churchill Rd, Addis Ababa, Ethiopia',
      timezone: 'Africa/Addis_Ababa',
      status: OrgStatus.ACTIVE,
    },
  });

  // CBE Staff
  const cbeStaffList = [
    { email: 'dawit.haile@cbe.com.et', name: 'Dr. Dawit Hailemariam (ዳዊት ኃይለማርያም)', role: OrgRole.ORG_OWNER, phone: '+251911200101' },
    { email: 'almaz.tefera@cbe.com.et', name: 'Almaz Tefera (አልማዝ ተፈራ)', role: OrgRole.ORG_ADMIN, phone: '+251911200102' },
    { email: 'yonas.bekele@cbe.com.et', name: 'Yonas Bekele (ዮናስ በቀለ)', role: OrgRole.ORG_STAFF, phone: '+251911200103' },
    { email: 'bethlehem.tadesse@cbe.com.et', name: 'Bethlehem Tadesse (ቤተልሔም ታደሰ)', role: OrgRole.ORG_STAFF, phone: '+251911200104' },
    { email: 'abel.kebede@cbe.com.et', name: 'Abel Kebede (አቤል ከበደ)', role: OrgRole.ORG_STAFF, phone: '+251911200105' },
  ];

  for (const staffMember of cbeStaffList) {
    const userStaff = await prisma.user.upsert({
      where: { email: staffMember.email },
      update: {},
      create: {
        email: staffMember.email,
        passwordHash,
        fullName: staffMember.name,
        role: UserRole.CUSTOMER,
        phone: staffMember.phone,
      },
    });

    await prisma.organizationMembership.upsert({
      where: { userId_organizationId: { userId: userStaff.id, organizationId: orgCbe.id } },
      update: {},
      create: {
        userId: userStaff.id,
        organizationId: orgCbe.id,
        role: staffMember.role,
        status: MembershipStatus.ACTIVE,
      },
    });
  }

  // CBE Branches
  const cbeBranchesData = [
    {
      code: 'CBE-FIN',
      name: 'CBE Finfine Main Branch (ፊንፊኔ ቅርንጫፍ)',
      address: 'Churchill Ave, Piassa, Arada Sub-City, Addis Ababa',
      phone: '+251 11 155 1200',
      lat: 9.0305,
      lng: 38.7525,
      services: [
        { code: 'ACC', name: 'New Account & Digital Banking (የሂሳብ መክፈቻ)', desc: 'Open individual, joint, or youth bank accounts and CBE Birr', dur: 15, tier: 2 },
        { code: 'CSH', name: 'Cash Deposit & Withdrawal (ገንዘብ ገቢና ወጪ)', desc: 'Bulk cash deposit, large check clearance and withdrawals', dur: 5, tier: 1 },
        { code: 'REM', name: 'Forex & Remittance (ሐዋላና የውጭ ምንዛሬ)', desc: 'Western Union, MoneyGram, and currency exchange', dur: 10, tier: 2 },
        { code: 'CRD', name: 'Loan & Credit Advisory (የብድር ምክር)', desc: 'Mortgage, automotive, business and agriculture loans', dur: 25, tier: 3 },
      ],
      counters: [
        { number: '01', name: 'Counter 1 (Account Opening / አዲስ ሂሳብ)' },
        { number: '02', name: 'Counter 2 (Cash Teller / ገንዘብ ተቀባይ)' },
        { number: '03', name: 'Counter 3 (Cash Teller / ገንዘብ ተቀባይ)' },
        { number: '04', name: 'Counter 4 (Remittance & Forex / የውጭ ምንዛሬ)' },
        { number: '05', name: 'Counter 5 (Customer Care / የደንበኞች ድጋፍ)' },
      ],
    },
    {
      code: 'CBE-BOL',
      name: 'CBE Bole Medhanialem Branch (ቦሌ መድኃኒዓለም ቅርንጫፍ)',
      address: 'Cameroon St, Next to Edna Mall, Bole, Addis Ababa',
      phone: '+251 11 662 4500',
      lat: 8.9982,
      lng: 38.7885,
      services: [
        { code: 'VIP', name: 'Priority & Diaspora Banking (ፕሪሚየም ባንኪንግ)', desc: 'Exclusive express service for diaspora and high-value depositors', dur: 15, tier: 3 },
        { code: 'CSH', name: 'Standard Teller Services (የቴለር አገልግሎት)', desc: 'General deposit and cash withdrawal', dur: 5, tier: 1 },
        { code: 'CBEB', name: 'CBE Birr & Mobile Support (የሲቢኢ ብር ድጋፍ)', desc: 'Merchant PIN reset, agent float, and mobile banking link', dur: 8, tier: 2 },
      ],
      counters: [
        { number: '01', name: 'Counter 1 (Priority VIP Desk)' },
        { number: '02', name: 'Counter 2 (Fast Cash Desk)' },
        { number: '03', name: 'Counter 3 (Digital Solutions Desk)' },
      ],
    },
    {
      code: 'CBE-MEG',
      name: 'CBE Megenagna Hub Branch (መገናኛ አደባባይ ቅርንጫፍ)',
      address: 'Ring Road, Megenagna Square, Yeka, Addis Ababa',
      phone: '+251 11 646 7890',
      lat: 9.0205,
      lng: 38.8021,
      services: [
        { code: 'ACC', name: 'Account Opening (አዲስ አካውንት)', desc: 'Personal and student savings accounts', dur: 12, tier: 2 },
        { code: 'CSH', name: 'Cash Transactions (ገንዘብ ክፍያ)', desc: 'Daily teller transactions and check clearance', dur: 6, tier: 1 },
      ],
      counters: [
        { number: '01', name: 'Counter 1 (Cash Services)' },
        { number: '02', name: 'Counter 2 (Customer Service)' },
      ],
    },
  ];

  for (const bData of cbeBranchesData) {
    const branch = await prisma.branch.upsert({
      where: { organizationId_code: { organizationId: orgCbe.id, code: bData.code } },
      update: {},
      create: {
        organizationId: orgCbe.id,
        name: bData.name,
        code: bData.code,
        address: bData.address,
        phone: bData.phone,
        latitude: bData.lat,
        longitude: bData.lng,
        isActive: true,
      },
    });

    for (let day = 0; day <= 6; day++) {
      await prisma.operatingHour.upsert({
        where: { branchId_dayOfWeek: { branchId: branch.id, dayOfWeek: day } },
        update: {},
        create: {
          branchId: branch.id,
          dayOfWeek: day,
          openTime: '08:00',
          closeTime: day === 0 ? '12:00' : '17:30',
          isClosed: day === 0,
        },
      });
    }

    const createdServices: Record<string, any> = {};
    for (const s of bData.services) {
      const serv = await prisma.service.upsert({
        where: { branchId_code: { branchId: branch.id, code: s.code } },
        update: {},
        create: {
          organizationId: orgCbe.id,
          branchId: branch.id,
          name: s.name,
          code: s.code,
          description: s.desc,
          estimatedDurationMinutes: s.dur,
          priorityLevel: s.tier,
        },
      });
      createdServices[s.code] = serv;

      const q = await prisma.queue.upsert({
        where: { branchId_serviceId: { branchId: branch.id, serviceId: serv.id } },
        update: {},
        create: {
          organizationId: orgCbe.id,
          branchId: branch.id,
          serviceId: serv.id,
          name: `${s.name} Queue`,
          prefix: s.code.slice(0, 2),
        },
      });

      await prisma.queueConfiguration.upsert({
        where: { queueId: q.id },
        update: {},
        create: {
          queueId: q.id,
          maxWaitingCapacity: 150,
          autoCallNext: false,
          allowRemoteJoin: true,
          geofenceRadiusMeters: 8000,
          notificationThresholdAhead: 3,
          bufferMinutes: 4,
        },
      });
    }

    for (const c of bData.counters) {
      const counterObj = await prisma.serviceCounter.upsert({
        where: { branchId_number: { branchId: branch.id, number: c.number } },
        update: {},
        create: {
          organizationId: orgCbe.id,
          branchId: branch.id,
          name: c.name,
          number: c.number,
          status: 'IDLE',
        },
      });

      // Link first service as default
      const firstService = Object.values(createdServices)[0];
      if (firstService) {
        await prisma.counterServiceAssignment.upsert({
          where: { counterId_serviceId: { counterId: counterObj.id, serviceId: firstService.id } },
          update: {},
          create: { counterId: counterObj.id, serviceId: firstService.id },
        });
      }
    }
  }

  // -------------------------------------------------------------
  // 5. ORGANIZATION: TIKUR ANBESSA SPECIALIZED HOSPITAL
  // -------------------------------------------------------------
  const orgTikur = await prisma.organization.upsert({
    where: { slug: 'tikur-anbessa-hospital' },
    update: {},
    create: {
      name: 'Tikur Anbessa Specialized Hospital (ጥቁር አንበሳ ሆስፒታል)',
      slug: 'tikur-anbessa-hospital',
      address: 'Zambia St, Lideta Sub-City, Addis Ababa, Ethiopia',
      timezone: 'Africa/Addis_Ababa',
      status: OrgStatus.ACTIVE,
    },
  });

  const tikurStaffList = [
    { email: 'fikre.wolde@tikuranbessa.edu.et', name: 'Dr. Fikre Sellassie Wolde (ዶ/ር ፍቅረስላሴ ወልዴ)', role: OrgRole.ORG_OWNER, phone: '+251911300101' },
    { email: 'selamawit.alemu@tikuranbessa.edu.et', name: 'Selamawit Alemu (ሰላማዊት አለሙ)', role: OrgRole.ORG_ADMIN, phone: '+251911300102' },
    { email: 'tariku.mengistu@tikuranbessa.edu.et', name: 'Tariku Mengistu (ታሪኩ መንግስቱ)', role: OrgRole.ORG_STAFF, phone: '+251911300103' },
    { email: 'rahel.girma@tikuranbessa.edu.et', name: 'Rahel Girma (ራሔል ግርማ)', role: OrgRole.ORG_STAFF, phone: '+251911300104' },
  ];

  for (const s of tikurStaffList) {
    const userStaff = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        passwordHash,
        fullName: s.name,
        role: UserRole.CUSTOMER,
        phone: s.phone,
      },
    });

    await prisma.organizationMembership.upsert({
      where: { userId_organizationId: { userId: userStaff.id, organizationId: orgTikur.id } },
      update: {},
      create: {
        userId: userStaff.id,
        organizationId: orgTikur.id,
        role: s.role,
        status: MembershipStatus.ACTIVE,
      },
    });
  }

  const tikurMainBranch = await prisma.branch.upsert({
    where: { organizationId_code: { organizationId: orgTikur.id, code: 'TASH-MAIN' } },
    update: {},
    create: {
      organizationId: orgTikur.id,
      name: 'Tikur Anbessa Main Referral Hospital (ጥቁር አንበሳ ዋናው ግቢ)',
      code: 'TASH-MAIN',
      address: 'Zambia St, Lideta Sub-City, Addis Ababa',
      phone: '+251 11 551 1211',
      latitude: 9.0142,
      longitude: 38.7495,
      isActive: true,
    },
  });

  for (let day = 0; day <= 6; day++) {
    await prisma.operatingHour.upsert({
      where: { branchId_dayOfWeek: { branchId: tikurMainBranch.id, dayOfWeek: day } },
      update: {},
      create: {
        branchId: tikurMainBranch.id,
        dayOfWeek: day,
        openTime: '07:30',
        closeTime: '20:00',
        isClosed: false, // Hospital open 7 days
      },
    });
  }

  const tikurServicesData = [
    { code: 'OPD', name: 'Outpatient Triage & Referral (የውጭ ታካሚዎች ምርመራ)', desc: 'Specialist clinical assessment and outpatient referral entry', dur: 20, tier: 2 },
    { code: 'PED', name: 'Pediatrics & Neonatal Care (የህጻናት ህክምና)', desc: 'Infant consultation, vaccination, and growth checkup', dur: 15, tier: 3 },
    { code: 'PHARM', name: 'Central Pharmacy & Dispensing (ማዕከላዊ ፋርማሲ)', desc: 'Inpatient and outpatient prescription medicine distribution', dur: 8, tier: 1 },
    { code: 'LAB', name: 'Diagnostic Laboratory (የላቦራቶሪ ምርመራ)', desc: 'Blood analysis, pathology, and diagnostic imaging intake', dur: 10, tier: 2 },
  ];

  const createdTikurServices: Record<string, any> = {};
  for (const s of tikurServicesData) {
    const serv = await prisma.service.upsert({
      where: { branchId_code: { branchId: tikurMainBranch.id, code: s.code } },
      update: {},
      create: {
        organizationId: orgTikur.id,
        branchId: tikurMainBranch.id,
        name: s.name,
        code: s.code,
        description: s.desc,
        estimatedDurationMinutes: s.dur,
        priorityLevel: s.tier,
      },
    });
    createdTikurServices[s.code] = serv;

    const q = await prisma.queue.upsert({
      where: { branchId_serviceId: { branchId: tikurMainBranch.id, serviceId: serv.id } },
      update: {},
      create: {
        organizationId: orgTikur.id,
        branchId: tikurMainBranch.id,
        serviceId: serv.id,
        name: `${s.name} Queue`,
        prefix: s.code.slice(0, 2),
      },
    });

    await prisma.queueConfiguration.upsert({
      where: { queueId: q.id },
      update: {},
      create: {
        queueId: q.id,
        maxWaitingCapacity: 200,
        autoCallNext: false,
        allowRemoteJoin: true,
        geofenceRadiusMeters: 15000,
        notificationThresholdAhead: 4,
        bufferMinutes: 6,
      },
    });
  }

  // Hospital Counters
  const tikurCountersData = [
    { number: '01', name: 'Station 01 (Triage & Vital Signs / የቅድመ-ምርመራ ጣቢያ)' },
    { number: '02', name: 'Station 02 (Internal Medicine / የውስጥ ደዌ)' },
    { number: '03', name: 'Station 03 (Pediatric Wing / የህጻናት ክፍል)' },
    { number: '04', name: 'Station 04 (Main Pharmacy Counter / ፋርማሲ)' },
    { number: '05', name: 'Station 05 (Laboratory Sample Intake / ላቦራቶሪ)' },
  ];

  for (const c of tikurCountersData) {
    await prisma.serviceCounter.upsert({
      where: { branchId_number: { branchId: tikurMainBranch.id, number: c.number } },
      update: {},
      create: {
        organizationId: orgTikur.id,
        branchId: tikurMainBranch.id,
        name: c.name,
        number: c.number,
        status: 'IDLE',
      },
    });
  }

  // -------------------------------------------------------------
  // 6. ORGANIZATION: IMMIGRATION & CITIZENSHIP SERVICE (ICS ETHIOPIA)
  // -------------------------------------------------------------
  const orgIcs = await prisma.organization.upsert({
    where: { slug: 'ethiopia-immigration' },
    update: {},
    create: {
      name: 'Immigration & Citizenship Service (ኢሚግሬሽንና ዜግነት አገልግሎት)',
      slug: 'ethiopia-immigration',
      address: 'King George VI St, Arat Kilo, Addis Ababa, Ethiopia',
      timezone: 'Africa/Addis_Ababa',
      status: OrgStatus.ACTIVE,
    },
  });

  const icsStaffList = [
    { email: 'getachew.assefa@ics.gov.et', name: 'Getachew Assefa (ጌታቸው አሰፋ)', role: OrgRole.ORG_OWNER, phone: '+251911400201' },
    { email: 'tigist.worku@ics.gov.et', name: 'Tigist Worku (ትዕግስት ወርቁ)', role: OrgRole.ORG_ADMIN, phone: '+251911400202' },
    { email: 'henok.berhanu@ics.gov.et', name: 'Henok Berhanu (ሄኖክ ብርሃኑ)', role: OrgRole.ORG_STAFF, phone: '+251911400203' },
  ];

  for (const s of icsStaffList) {
    const userStaff = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        passwordHash,
        fullName: s.name,
        role: UserRole.CUSTOMER,
        phone: s.phone,
      },
    });

    await prisma.organizationMembership.upsert({
      where: { userId_organizationId: { userId: userStaff.id, organizationId: orgIcs.id } },
      update: {},
      create: {
        userId: userStaff.id,
        organizationId: orgIcs.id,
        role: s.role,
        status: MembershipStatus.ACTIVE,
      },
    });
  }

  const icsBranch = await prisma.branch.upsert({
    where: { organizationId_code: { organizationId: orgIcs.id, code: 'ICS-HQ' } },
    update: {},
    create: {
      organizationId: orgIcs.id,
      name: 'ICS Central Directorate (ዋናው መምሪያ - አራት ኪሎ)',
      code: 'ICS-HQ',
      address: 'King George VI St, Near Ministry of Education, Arat Kilo, Addis Ababa',
      phone: '+251 11 155 3899',
      latitude: 9.0345,
      longitude: 38.7612,
      isActive: true,
    },
  });

  for (let day = 0; day <= 6; day++) {
    await prisma.operatingHour.upsert({
      where: { branchId_dayOfWeek: { branchId: icsBranch.id, dayOfWeek: day } },
      update: {},
      create: {
        branchId: icsBranch.id,
        dayOfWeek: day,
        openTime: '08:30',
        closeTime: day === 0 ? '12:00' : '17:00',
        isClosed: day === 0,
      },
    });
  }

  const icsServicesData = [
    { code: 'NEWPASS', name: 'New Passport Application (አዲስ ፓስፖርት ማውጣት)', desc: 'First time electronic e-passport submission and review', dur: 15, tier: 2 },
    { code: 'RENEW', name: 'Urgent Passport Renewal (አስቸኳይ ፓስፖርት እድሳት)', desc: 'Expired or damaged passport renewal service', dur: 12, tier: 3 },
    { code: 'BIOM', name: 'Biometrics & Photo Capture (የጣት አሻራና ፎቶ ምዝገባ)', desc: 'Live fingerprint scan, facial photography, and digital signature', dur: 8, tier: 2 },
    { code: 'DELIV', name: 'Passport Collection & Delivery (ፓስፖርት መረከቢያ)', desc: 'Printed passport verification and collection counter', dur: 5, tier: 1 },
  ];

  for (const s of icsServicesData) {
    const serv = await prisma.service.upsert({
      where: { branchId_code: { branchId: icsBranch.id, code: s.code } },
      update: {},
      create: {
        organizationId: orgIcs.id,
        branchId: icsBranch.id,
        name: s.name,
        code: s.code,
        description: s.desc,
        estimatedDurationMinutes: s.dur,
        priorityLevel: s.tier,
      },
    });

    const q = await prisma.queue.upsert({
      where: { branchId_serviceId: { branchId: icsBranch.id, serviceId: serv.id } },
      update: {},
      create: {
        organizationId: orgIcs.id,
        branchId: icsBranch.id,
        serviceId: serv.id,
        name: `${s.name} Queue`,
        prefix: s.code.slice(0, 2),
      },
    });

    await prisma.queueConfiguration.upsert({
      where: { queueId: q.id },
      update: {},
      create: {
        queueId: q.id,
        maxWaitingCapacity: 300,
        autoCallNext: false,
        allowRemoteJoin: true,
        geofenceRadiusMeters: 25000,
        notificationThresholdAhead: 5,
        bufferMinutes: 5,
      },
    });
  }

  for (let i = 1; i <= 6; i++) {
    await prisma.serviceCounter.upsert({
      where: { branchId_number: { branchId: icsBranch.id, number: `0${i}` } },
      update: {},
      create: {
        organizationId: orgIcs.id,
        branchId: icsBranch.id,
        name: `Passport Station 0${i} (የፓስፖርት ጣቢያ)`,
        number: `0${i}`,
        status: 'IDLE',
      },
    });
  }

  // -------------------------------------------------------------
  // 7. REAL LIVE SEEDED QUEUE TICKETS (With Active Waiting/Serving)
  // -------------------------------------------------------------
  console.log('🎟️ Seeding real Ethiopian active & historical queue tickets...');

  // Find CBE Finfine Branch & Services
  const finfineBranch = await prisma.branch.findFirst({
    where: { code: 'CBE-FIN' },
    include: { queues: { include: { service: true } }, counters: true },
  });

  if (finfineBranch && finfineBranch.queues.length > 0) {
    const cashQueue = finfineBranch.queues.find((q) => q.service.code === 'CSH') || finfineBranch.queues[0];
    const accountQueue = finfineBranch.queues.find((q) => q.service.code === 'ACC') || finfineBranch.queues[1];
    const counter1 = finfineBranch.counters[0];
    const counter2 = finfineBranch.counters[1];

    // Ticket 1: SERVING (Abebe Bikila at Counter 2)
    const t1 = await prisma.queueTicket.upsert({
      where: { queueId_sequenceNumber: { queueId: cashQueue.id, sequenceNumber: 101 } },
      update: {},
      create: {
        organizationId: orgCbe.id,
        branchId: finfineBranch.id,
        serviceId: cashQueue.serviceId,
        queueId: cashQueue.id,
        counterId: counter2?.id,
        userId: ethCustomers['abebe.bikila@gmail.com']?.id,
        customerName: 'Abebe Bikila (አበበ ቢቂላ)',
        customerPhone: '+251911223344',
        ticketNumber: 'CS-101',
        sequenceNumber: 101,
        priorityScore: 1,
        status: TicketStatus.SERVING,
        servingStartedAt: new Date(Date.now() - 3 * 60000), // 3 mins ago
        calledAt: new Date(Date.now() - 4 * 60000),
        verificationCode: 'ET8921',
      },
    });

    // Ticket 2: CALLED (Almaz Ayana at Counter 1)
    const t2 = await prisma.queueTicket.upsert({
      where: { queueId_sequenceNumber: { queueId: accountQueue.id, sequenceNumber: 201 } },
      update: {},
      create: {
        organizationId: orgCbe.id,
        branchId: finfineBranch.id,
        serviceId: accountQueue.serviceId,
        queueId: accountQueue.id,
        counterId: counter1?.id,
        userId: ethCustomers['almaz.ayana@gmail.com']?.id,
        customerName: 'Almaz Ayana (አልማዝ አያና)',
        customerPhone: '+251922334455',
        ticketNumber: 'AC-201',
        sequenceNumber: 201,
        priorityScore: 2,
        status: TicketStatus.CALLED,
        calledAt: new Date(Date.now() - 1 * 60000),
        verificationCode: 'ET4412',
      },
    });

    // Ticket 3: WAITING (Haile Gebrselassie - Position 1)
    const t3 = await prisma.queueTicket.upsert({
      where: { queueId_sequenceNumber: { queueId: cashQueue.id, sequenceNumber: 102 } },
      update: {},
      create: {
        organizationId: orgCbe.id,
        branchId: finfineBranch.id,
        serviceId: cashQueue.serviceId,
        queueId: cashQueue.id,
        userId: ethCustomers['haile.gebres@gmail.com']?.id,
        customerName: 'Haile Gebrselassie (ኃይሌ ገብረስላሴ)',
        customerPhone: '+251933445566',
        ticketNumber: 'CS-102',
        sequenceNumber: 102,
        priorityScore: 1,
        status: TicketStatus.WAITING,
        estimatedServiceTime: new Date(Date.now() + 5 * 60000),
        verificationCode: 'ET7733',
      },
    });

    // Ticket 4: WAITING (Aster Aweke - Position 2)
    const t4 = await prisma.queueTicket.upsert({
      where: { queueId_sequenceNumber: { queueId: cashQueue.id, sequenceNumber: 103 } },
      update: {},
      create: {
        organizationId: orgCbe.id,
        branchId: finfineBranch.id,
        serviceId: cashQueue.serviceId,
        queueId: cashQueue.id,
        userId: ethCustomers['aster.aweke@gmail.com']?.id,
        customerName: 'Aster Aweke (አስቴር አወቀ)',
        customerPhone: '+251944556677',
        ticketNumber: 'CS-103',
        sequenceNumber: 103,
        priorityScore: 1,
        status: TicketStatus.WAITING,
        estimatedServiceTime: new Date(Date.now() + 10 * 60000),
        verificationCode: 'ET5521',
      },
    });

    // Ticket 5: WAITING (Demo Customer Kassahun Tadesse - Position 3)
    const tDemo = await prisma.queueTicket.upsert({
      where: { queueId_sequenceNumber: { queueId: cashQueue.id, sequenceNumber: 104 } },
      update: {},
      create: {
        organizationId: orgCbe.id,
        branchId: finfineBranch.id,
        serviceId: cashQueue.serviceId,
        queueId: cashQueue.id,
        userId: customer.id,
        customerName: customer.fullName,
        customerPhone: customer.phone,
        ticketNumber: 'CS-104',
        sequenceNumber: 104,
        priorityScore: 1,
        status: TicketStatus.WAITING,
        estimatedServiceTime: new Date(Date.now() + 15 * 60000),
        verificationCode: 'A3F9B2',
      },
    });

    // Completed tickets for analytics history
    const completedSample = [
      { num: 'CS-095', name: 'Derartu Tulu (ደራርቱ ቱሉ)', seq: 95, dur: 7 },
      { num: 'CS-096', name: 'Kenenisa Bekele (ቀነኒሳ በቀለ)', seq: 96, dur: 5 },
      { num: 'CS-097', name: 'Tirunesh Dibaba (ጥሩነሽ ዲባባ)', seq: 97, dur: 9 },
      { num: 'CS-098', name: 'Mulatu Astatke (ሙላቱ አስታጥቄ)', seq: 98, dur: 6 },
    ];

    for (const item of completedSample) {
      await prisma.queueTicket.upsert({
        where: { queueId_sequenceNumber: { queueId: cashQueue.id, sequenceNumber: item.seq } },
        update: {},
        create: {
          organizationId: orgCbe.id,
          branchId: finfineBranch.id,
          serviceId: cashQueue.serviceId,
          queueId: cashQueue.id,
          customerName: item.name,
          ticketNumber: item.num,
          sequenceNumber: item.seq,
          status: TicketStatus.COMPLETED,
          calledAt: new Date(Date.now() - (30 + item.dur) * 60000),
          servingStartedAt: new Date(Date.now() - (28 + item.dur) * 60000),
          completedAt: new Date(Date.now() - 28 * 60000),
          verificationCode: `ET${item.seq}0`,
        },
      });
    }

    // Also seed a historical completed ticket for demo customer
    await prisma.queueTicket.upsert({
      where: { queueId_sequenceNumber: { queueId: cashQueue.id, sequenceNumber: 80 } },
      update: {},
      create: {
        organizationId: orgCbe.id,
        branchId: finfineBranch.id,
        serviceId: cashQueue.serviceId,
        queueId: cashQueue.id,
        userId: customer.id,
        customerName: customer.fullName,
        customerPhone: customer.phone,
        ticketNumber: 'CS-080',
        sequenceNumber: 80,
        status: TicketStatus.COMPLETED,
        calledAt: new Date(Date.now() - 3600000 * 24), // Yesterday
        servingStartedAt: new Date(Date.now() - 3600000 * 24 + 60000),
        completedAt: new Date(Date.now() - 3600000 * 24 + 600000),
        verificationCode: 'ET8080',
      },
    });

    console.log('✅ Seeded active tickets CS-101 (SERVING), AC-201 (CALLED), CS-102 & CS-104 (WAITING)');
  }

  // Also seed Tikur Anbessa Live Tickets
  const tashBranch = await prisma.branch.findFirst({
    where: { code: 'TASH-MAIN' },
    include: { queues: { include: { service: true } } },
  });

  if (tashBranch && tashBranch.queues.length > 0) {
    const opdQueue = tashBranch.queues.find((q) => q.service.code === 'OPD') || tashBranch.queues[0];
    await prisma.queueTicket.upsert({
      where: { queueId_sequenceNumber: { queueId: opdQueue.id, sequenceNumber: 101 } },
      update: {},
      create: {
        organizationId: orgTikur.id,
        branchId: tashBranch.id,
        serviceId: opdQueue.serviceId,
        queueId: opdQueue.id,
        customerName: 'Solomon Bogale (ሰለሞን ቦጋለ)',
        customerPhone: '+251911335577',
        ticketNumber: 'OP-101',
        sequenceNumber: 101,
        status: TicketStatus.WAITING,
        estimatedServiceTime: new Date(Date.now() + 18 * 60000),
        verificationCode: 'MED789',
      },
    });
  }

  console.log('✅ Ethiopian Real Data Seed successfully completed:');
  console.log('🏛️ Organizations:');
  console.log(`  - Commercial Bank of Ethiopia (CBE): ${orgCbe.id} (Slug: commercial-bank-of-ethiopia)`);
  console.log(`  - Tikur Anbessa Specialized Hospital: ${orgTikur.id} (Slug: tikur-anbessa-hospital)`);
  console.log(`  - Immigration & Citizenship Service (ICS): ${orgIcs.id} (Slug: ethiopia-immigration)`);
  console.log(`  - Metro Health Center (Addis Ababa): ${orgMetro.id} (Slug: metro-health)`);
  console.log('👤 Staff & Admins:');
  console.log(`  - System Admin: admin@queueless.com`);
  console.log(`  - CBE Owner: dawit.haile@cbe.com.et`);
  console.log(`  - Tikur Anbessa Lead: fikre.wolde@tikuranbessa.edu.et`);
  console.log(`  - ICS Director: getachew.assefa@ics.gov.et`);
  console.log(`  - Metro Health Admin: admin@metrohealth.demo`);
  console.log(`  - Metro Health Staff: staff@metrohealth.demo`);
  console.log('👥 Customers:');
  console.log(`  - Demo Customer: customer@example.com`);
  console.log(`  - Abebe Bikila: abebe.bikila@gmail.com`);
  console.log(`  - Almaz Ayana: almaz.ayana@gmail.com`);
  console.log(`  - Haile Gebrselassie: haile.gebres@gmail.com`);
  console.log(`  - All default passwords: Password@123456`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
