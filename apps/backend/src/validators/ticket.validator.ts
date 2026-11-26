import { z } from 'zod';

export const joinQueueSchema = z.object({
  serviceId: z.string().uuid(),
  customerName: z.string().min(2).optional(),
  customerPhone: z.string().optional(),
});

export const cancelTicketSchema = z.object({
  reason: z.string().max(200).optional(),
});
