import { Response, NextFunction } from 'express';
import { BranchService } from '../services/branch.service';
import { createBranchSchema, updateBranchSchema, operatingHoursSchema } from '../validators/org-management.validator';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class BranchController {
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.membership?.organizationId || req.params.organizationId || req.params.orgId;
      const validated = createBranchSchema.parse(req.body);
      const result = await BranchService.create(orgId, validated);
      res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async listByOrg(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.membership?.organizationId || req.params.organizationId || req.params.orgId;
      const result = await BranchService.listByOrg(orgId);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await BranchService.getById(req.params.id);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.membership?.organizationId || req.body.organizationId;
      const validated = updateBranchSchema.parse(req.body);
      const result = await BranchService.update(req.params.id, orgId, validated);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async setOperatingHours(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.membership?.organizationId || req.body.organizationId;
      const validated = operatingHoursSchema.parse(req.body);
      const result = await BranchService.setOperatingHours(req.params.id, orgId, validated);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async discoverPublic(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { search, lat, lng, radiusKm } = req.query;
      const result = await BranchService.discoverPublic({
        search: search ? String(search) : undefined,
        lat: lat ? parseFloat(String(lat)) : undefined,
        lng: lng ? parseFloat(String(lng)) : undefined,
        radiusKm: radiusKm ? parseFloat(String(radiusKm)) : undefined,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }
}
