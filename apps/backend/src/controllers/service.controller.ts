import { Response, NextFunction } from 'express';
import { ServiceService } from '../services/service.service';
import { createServiceSchema, updateServiceSchema } from '../validators/org-management.validator';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class ServiceController {
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.membership?.organizationId || req.body.organizationId;
      const validated = createServiceSchema.parse(req.body);
      const result = await ServiceService.create(req.params.branchId, orgId, validated);
      res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async listByBranch(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await ServiceService.listByBranch(req.params.branchId);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.membership?.organizationId || req.body.organizationId;
      const validated = updateServiceSchema.parse(req.body);
      const result = await ServiceService.update(req.params.id, orgId, validated);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.membership?.organizationId || req.body.organizationId;
      const result = await ServiceService.delete(req.params.id, orgId);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }
}
