import { Router, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { authenticateToken, requireOrgAccess } from '../middleware/auth.middleware';
import { OrgRole } from '@queueless/shared-types';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const adminAnalyticsRouter = Router();

/**
 * Audit Logs for an organization
 */
adminAnalyticsRouter.get(
  '/organizations/:id/audit-logs',
  authenticateToken,
  requireOrgAccess([OrgRole.ORG_ADMIN, OrgRole.ORG_OWNER]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const orgId = req.membership?.organizationId || req.params.id;
      const logs = await prisma.auditLog.findMany({
        where: { organizationId: orgId },
        include: {
          user: {
            select: { id: true, fullName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      res.status(200).json({ success: true, data: logs });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Executive Analytics & Reports for organization
 */
adminAnalyticsRouter.get(
  '/organizations/:id/analytics',
  authenticateToken,
  requireOrgAccess([OrgRole.ORG_ADMIN, OrgRole.ORG_OWNER]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const orgId = req.membership?.organizationId || req.params.id;

      const [totalBranches, totalServices, totalCounters, totalStaff, totalTicketsIssued, completedTickets, ticketsByStatus] =
        await Promise.all([
          prisma.branch.count({ where: { organizationId: orgId } }),
          prisma.service.count({ where: { organizationId: orgId } }),
          prisma.serviceCounter.count({ where: { organizationId: orgId } }),
          prisma.organizationMembership.count({ where: { organizationId: orgId } }),
          prisma.queueTicket.count({ where: { organizationId: orgId } }),
          prisma.queueTicket.findMany({
            where: {
              organizationId: orgId,
              status: 'COMPLETED',
              servingStartedAt: { not: null },
              completedAt: { not: null },
            },
            select: { servingStartedAt: true, completedAt: true, createdAt: true },
          }),
          prisma.queueTicket.groupBy({
            by: ['status'],
            where: { organizationId: orgId },
            _count: { status: true },
          }),
        ]);

      // Calculate average service duration in minutes
      const totalDurationSeconds = completedTickets.reduce((acc, curr) => {
        if (curr.completedAt && curr.servingStartedAt) {
          return acc + Math.round((curr.completedAt.getTime() - curr.servingStartedAt.getTime()) / 1000);
        }
        return acc;
      }, 0);

      const avgServiceMinutes =
        completedTickets.length > 0 ? Math.round(totalDurationSeconds / completedTickets.length / 60) : 0;

      // Group tickets by status for charts
      const statusBreakdown = ticketsByStatus.map((g) => ({
        status: g.status,
        count: g._count.status,
      }));

      // Service distribution
      const servicesWithCounts = await prisma.service.findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          name: true,
          code: true,
          _count: {
            select: { tickets: true },
          },
        },
      });

      res.status(200).json({
        success: true,
        data: {
          summary: {
            totalBranches,
            totalServices,
            totalCounters,
            totalStaff,
            totalTicketsIssued,
            completedTicketsCount: completedTickets.length,
            avgServiceMinutes,
          },
          statusBreakdown,
          servicePerformance: servicesWithCounts.map((s) => ({
            name: s.name,
            code: s.code,
            ticketCount: s._count.tickets,
          })),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);
