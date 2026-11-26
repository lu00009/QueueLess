import { Response, NextFunction } from 'express';
import { StaffService } from '../services/staff.service';
import { inviteStaffSchema, updateStaffRoleSchema, assignStaffSchema } from '../validators/org-management.validator';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class StaffController {
  static async listByOrg(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.membership?.organizationId || req.params.organizationId || req.params.id;
      const result = await StaffService.listByOrg(orgId);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async invite(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.membership?.organizationId || req.params.organizationId || req.params.id;
      const validated = inviteStaffSchema.parse(req.body);
      const result = await StaffService.inviteOrAdd(orgId, validated);
      res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async updateRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.membership?.organizationId || req.params.organizationId || req.params.id;
      const validated = updateStaffRoleSchema.parse(req.body);
      const result = await StaffService.updateRole(orgId, req.params.userId, validated.role);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async assignStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.membership?.organizationId || req.params.organizationId || req.params.id;
      const validated = assignStaffSchema.parse(req.body);
      const result = await StaffService.assignStaff(orgId, validated);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.membership?.organizationId || req.params.organizationId || req.params.id;
      await StaffService.remove(orgId, req.params.userId);
      res.status(200).json({ success: true, message: 'Staff member removed from organization' });
    } catch (err) { next(err); }
  }
}
