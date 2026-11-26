import { Response, NextFunction } from 'express';
import { OrganizationService } from '../services/organization.service';
import { createOrgSchema, updateOrgSchema } from '../validators/org-management.validator';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class OrganizationController {
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createOrgSchema.parse(req.body);
      const result = await OrganizationService.create(validated);
      res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await OrganizationService.getById(req.params.id);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async listAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await OrganizationService.listAll();
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = updateOrgSchema.parse(req.body);
      const result = await OrganizationService.update(req.params.id, validated);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }
}
