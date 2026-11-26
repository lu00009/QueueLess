import { Response, NextFunction } from 'express';
import { CounterService } from '../services/counter.service';
import {
  createCounterSchema,
  updateCounterSchema,
  counterServicesSchema,
  updateCounterStatusSchema,
} from '../validators/org-management.validator';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class CounterController {
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.membership?.organizationId || req.body.organizationId;
      const validated = createCounterSchema.parse(req.body);
      const result = await CounterService.create(req.params.branchId, orgId, validated);
      res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async listByBranch(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await CounterService.listByBranch(req.params.branchId);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.membership?.organizationId || req.body.organizationId;
      const validated = updateCounterSchema.parse(req.body);
      const result = await CounterService.update(req.params.id, orgId, validated);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async setSupportedServices(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.membership?.organizationId || req.body.organizationId;
      const validated = counterServicesSchema.parse(req.body);
      const result = await CounterService.setSupportedServices(req.params.id, orgId, validated.serviceIds);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.membership?.organizationId || req.body.organizationId;
      const validated = updateCounterStatusSchema.parse(req.body);
      const staffId = req.user?.userId;
      const result = await CounterService.updateStatus(req.params.id, orgId, validated.status, staffId);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }
}
