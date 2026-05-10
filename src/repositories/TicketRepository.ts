import { BaseRepository } from '../core/ApiService'
import type { TicketDto, TicketListResponse } from '../types'

export class TicketRepository extends BaseRepository {
  private static instance: TicketRepository

  static getInstance(): TicketRepository {
    if (!TicketRepository.instance) {
      TicketRepository.instance = new TicketRepository()
    }
    return TicketRepository.instance
  }

  list(): Promise<TicketListResponse> {
    return this.get('/api/tickets')
  }

  getById(id: number): Promise<TicketDto> {
    return this.get(`/api/tickets/${id}`)
  }

  create(data: Partial<TicketDto>): Promise<TicketDto> {
    return this.post('/api/tickets', data)
  }

  update(id: number, data: Partial<TicketDto>): Promise<TicketDto> {
    return this.put(`/api/tickets/${id}`, data)
  }

  remove(id: number): Promise<void> {
    return this.delete(`/api/tickets/${id}`)
  }
}

export const ticketRepository = TicketRepository.getInstance()
