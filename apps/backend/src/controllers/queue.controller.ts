import { Response, NextFunction } from 'express';
import { QueueService } from '../services/queue.service';
import { updateQueueConfigSchema, updateQueueStatusSchema } from '../validators/org-management.validator';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class QueueController {
  static async listByBranch(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.membership?.organizationId;
      const result = await QueueService.listByBranch(req.params.branchId, orgId);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async updateConfig(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.membership?.organizationId || req.body.organizationId;
      const validated = updateQueueConfigSchema.parse(req.body);
      const result = await QueueService.updateConfig(req.params.id, orgId, validated);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.membership?.organizationId || req.body.organizationId;
      const validated = updateQueueStatusSchema.parse(req.body);
      const result = await QueueService.updateStatus(req.params.id, orgId, validated.status);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }
}
