import { z } from 'zod';

export const joinQueueSchema = z.object({
  serviceId: z.string().uuid(),
  customerName: z.string().min(2).nullable().optional(),
  customerPhone: z.string().nullable().optional(),
});

export const cancelTicketSchema = z.object({
  reason: z.string().max(200).nullable().optional(),
}).optional().default({});
