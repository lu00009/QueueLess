import { Router } from 'express';
import { TicketController } from '../controllers/ticket.controller';
import { authenticateToken } from '../middleware/auth.middleware';

export const ticketRouter = Router();

ticketRouter.post('/tickets/join', authenticateToken, TicketController.joinQueue);
ticketRouter.get('/tickets/active', authenticateToken, TicketController.getActiveTickets);
ticketRouter.get('/tickets/history', authenticateToken, TicketController.getTicketHistory);
ticketRouter.get('/tickets/:id', authenticateToken, TicketController.getTicketById);
ticketRouter.post('/tickets/:id/cancel', authenticateToken, TicketController.cancelTicket);
