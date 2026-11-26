class TicketModel {
  final String id;
  final String ticketNumber;
  final int sequenceNumber;
  final String status;
  final String customerName;
  final String? customerPhone;
  final String verificationCode;
  final int currentPosition;
  final int estimatedWaitMinutes;
  final String serviceId;
  final String serviceName;
  final String? serviceCode;
  final String branchId;
  final String branchName;
  final String organizationName;
  final String? counterNumber;
  final String? counterName;
  final String createdAt;

  TicketModel({
    required this.id,
    required this.ticketNumber,
    required this.sequenceNumber,
    required this.status,
    required this.customerName,
    this.customerPhone,
    required this.verificationCode,
    required this.currentPosition,
    required this.estimatedWaitMinutes,
    required this.serviceId,
    required this.serviceName,
    this.serviceCode,
    required this.branchId,
    required this.branchName,
    required this.organizationName,
    this.counterNumber,
    this.counterName,
    required this.createdAt,
  });

  factory TicketModel.fromJson(Map<String, dynamic> json) {
    final service = json['service'] as Map<String, dynamic>?;
    final branch = json['branch'] as Map<String, dynamic>?;
    final org = branch?['organization'] as Map<String, dynamic>?;
    final counter = json['counter'] as Map<String, dynamic>?;

    return TicketModel(
      id: json['id'] ?? '',
      ticketNumber: json['ticketNumber'] ?? '',
      sequenceNumber: json['sequenceNumber'] ?? 0,
      status: json['status'] ?? 'WAITING',
      customerName: json['customerName'] ?? '',
      customerPhone: json['customerPhone'],
      verificationCode: json['verificationCode'] ?? '',
      currentPosition: json['currentPosition'] ?? 0,
      estimatedWaitMinutes: json['estimatedWaitMinutes'] ?? 0,
      serviceId: json['serviceId'] ?? '',
      serviceName: service?['name'] ?? 'Service',
      serviceCode: service?['code'],
      branchId: json['branchId'] ?? '',
      branchName: branch?['name'] ?? 'Branch',
      organizationName: org?['name'] ?? '',
      counterNumber: counter?['number'],
      counterName: counter?['name'],
      createdAt: json['createdAt'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'ticketNumber': ticketNumber,
      'sequenceNumber': sequenceNumber,
      'status': status,
      'customerName': customerName,
      'customerPhone': customerPhone,
      'verificationCode': verificationCode,
      'currentPosition': currentPosition,
      'estimatedWaitMinutes': estimatedWaitMinutes,
      'serviceId': serviceId,
      'createdAt': createdAt,
      'service': {
        'id': serviceId,
        'name': serviceName,
        'code': serviceCode,
      },
      'branch': {
        'id': branchId,
        'name': branchName,
        'organization': {
          'name': organizationName,
        },
      },
      'counter': counterNumber != null
          ? {
              'number': counterNumber,
              'name': counterName,
            }
          : null,
    };
  }
}
