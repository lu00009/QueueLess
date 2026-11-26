import { TicketStatus, CounterStatus } from './enums';

export interface TicketCreatedPayload {
  ticketId: string;
  ticketNumber: string;
  sequenceNumber: number;
  serviceId: string;
  queueId: string;
  position: number;
  estimatedWaitMinutes: number;
}

export interface TicketCalledPayload {
  ticketId: string;
  ticketNumber: string;
  counterId: string;
  counterNumber: string;
  counterName: string;
  calledAt: string;
}

export interface TicketStateChangedPayload {
  ticketId: string;
  ticketNumber: string;
  status: TicketStatus;
  counterId?: string;
  timestamp: string;
}

export interface QueuePositionUpdatedPayload {
  ticketId: string;
  currentPosition: number;
  estimatedWaitMinutes: number;
}

export interface CounterStateChangedPayload {
  counterId: string;
  status: CounterStatus;
  currentStaffId?: string;
  activeTicketId?: string;
}
