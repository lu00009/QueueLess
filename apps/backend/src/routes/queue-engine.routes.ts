import { Router } from 'express';
import { QueueEngineController } from '../controllers/queue-engine.controller';
import { authenticateToken, requireOrgAccess } from '../middleware/auth.middleware';
import { OrgRole } from '@queueless/shared-types';

export const queueEngineRouter = Router();

// Staff Counter Queue Actions (Staff, Admin, Owner)
queueEngineRouter.post(
  '/counters/:counterId/call-next',
  authenticateToken,
  requireOrgAccess([OrgRole.ORG_STAFF, OrgRole.ORG_ADMIN, OrgRole.ORG_OWNER]),
  QueueEngineController.callNext
);

queueEngineRouter.post(
  '/counters/:counterId/call-ticket/:ticketId',
  authenticateToken,
  requireOrgAccess([OrgRole.ORG_STAFF, OrgRole.ORG_ADMIN, OrgRole.ORG_OWNER]),
  QueueEngineController.callSpecific
);

queueEngineRouter.post(
  '/tickets/:id/start-serving',
  authenticateToken,
  requireOrgAccess([OrgRole.ORG_STAFF, OrgRole.ORG_ADMIN, OrgRole.ORG_OWNER]),
  QueueEngineController.startServing
);

queueEngineRouter.post(
  '/tickets/:id/complete',
  authenticateToken,
  requireOrgAccess([OrgRole.ORG_STAFF, OrgRole.ORG_ADMIN, OrgRole.ORG_OWNER]),
  QueueEngineController.completeTicket
);

queueEngineRouter.post(
  '/tickets/:id/skip',
  authenticateToken,
  requireOrgAccess([OrgRole.ORG_STAFF, OrgRole.ORG_ADMIN, OrgRole.ORG_OWNER]),
  QueueEngineController.skipTicket
);

queueEngineRouter.post(
  '/tickets/:id/recall',
  authenticateToken,
  requireOrgAccess([OrgRole.ORG_STAFF, OrgRole.ORG_ADMIN, OrgRole.ORG_OWNER]),
  QueueEngineController.recallTicket
);

// Queue Waiting List & Counter Status
queueEngineRouter.get(
  '/queues/:queueId/waiting',
  authenticateToken,
  requireOrgAccess(),
  QueueEngineController.getWaitingList
);

queueEngineRouter.get(
  '/counters/:counterId/current',
  authenticateToken,
  requireOrgAccess(),
  QueueEngineController.getCurrentCounterTicket
);

queueEngineRouter.get(
  '/branches/:branchId/stats',
  authenticateToken,
  requireOrgAccess(),
  QueueEngineController.getQueueStats
);

queueEngineRouter.get(
  '/branches/:branchId/skipped',
  authenticateToken,
  requireOrgAccess(),
  QueueEngineController.getSkippedTickets
);
