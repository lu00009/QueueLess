import { Response, NextFunction } from 'express';
import { TicketService } from '../services/ticket.service';
import { joinQueueSchema, cancelTicketSchema } from '../validators/ticket.validator';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class TicketController {
  static async joinQueue(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = joinQueueSchema.parse(req.body);
      const result = await TicketService.joinQueue(req.user!.userId, validated);
      res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async getActiveTickets(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await TicketService.getActiveTickets(req.user!.userId);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async getTicketHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await TicketService.getTicketHistory(req.user!.userId);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async getTicketById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await TicketService.getTicketById(req.params.id, req.user!.userId);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  static async cancelTicket(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = cancelTicketSchema.parse(req.body);
      const result = await TicketService.cancelTicket(req.params.id, req.user!.userId, validated.reason);
      res.status(200).json({ success: true, message: 'Ticket cancelled successfully', data: result });
    } catch (err) { next(err); }
  }
}
