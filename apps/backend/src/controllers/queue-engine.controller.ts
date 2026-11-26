import { Response, NextFunction } from 'express';
import { QueueEngineService } from '../services/queue-engine.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class QueueEngineController {
  static async callNext(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ticket = await QueueEngineService.callNext(req.params.counterId, req.user!.userId);
      res.status(200).json({ success: true, message: 'Next ticket called successfully', data: ticket });
    } catch (err) { next(err); }
  }

  static async callSpecific(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ticket = await QueueEngineService.callSpecificTicket(
        req.params.counterId,
        req.params.ticketId,
        req.user!.userId
      );
      res.status(200).json({ success: true, message: 'Ticket called successfully', data: ticket });
    } catch (err) { next(err); }
  }

  static async startServing(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ticket = await QueueEngineService.startServing(req.params.id, req.user!.userId);
      res.status(200).json({ success: true, message: 'Serving started', data: ticket });
    } catch (err) { next(err); }
  }

  static async completeTicket(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ticket = await QueueEngineService.completeTicket(req.params.id, req.user!.userId);
      res.status(200).json({ success: true, message: 'Ticket completed successfully', data: ticket });
    } catch (err) { next(err); }
  }

  static async skipTicket(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body;
      const ticket = await QueueEngineService.skipTicket(req.params.id, req.user!.userId, reason);
      res.status(200).json({ success: true, message: 'Ticket skipped', data: ticket });
    } catch (err) { next(err); }
  }

  static async recallTicket(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { counterId } = req.body;
      const ticket = await QueueEngineService.recallTicket(req.params.id, req.user!.userId, counterId);
      res.status(200).json({ success: true, message: 'Ticket recalled successfully', data: ticket });
    } catch (err) { next(err); }
  }

  static async getWaitingList(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const list = await QueueEngineService.getWaitingList(req.params.queueId);
      res.status(200).json({ success: true, data: list });
    } catch (err) { next(err); }
  }

  static async getCurrentCounterTicket(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ticket = await QueueEngineService.getCurrentCounterTicket(req.params.counterId);
      res.status(200).json({ success: true, data: ticket });
    } catch (err) { next(err); }
  }

  static async getQueueStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { branchId } = req.params;
      const orgId = req.membership?.organizationId;
      const stats = await QueueEngineService.getQueueStats(branchId, orgId);
      res.status(200).json({ success: true, data: stats });
    } catch (err) { next(err); }
  }

  static async getSkippedTickets(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { branchId } = req.params;
      const skipped = await QueueEngineService.getSkippedTickets(branchId);
      res.status(200).json({ success: true, data: skipped });
    } catch (err) { next(err); }
  }
}
