import { BaseRepository } from '../core/ApiService'
import type { AlertDto, AlertListResponse } from '../types'

export class AlertRepository extends BaseRepository {
  private static instance: AlertRepository

  static getInstance(): AlertRepository {
    if (!AlertRepository.instance) {
      AlertRepository.instance = new AlertRepository()
    }
    return AlertRepository.instance
  }

  list(): Promise<AlertListResponse> {
    return this.get('/api/alerts')
  }

  create(data: Partial<AlertDto>): Promise<AlertDto> {
    return this.post('/api/alerts', data)
  }

  markRead(id: number): Promise<void> {
    return this.put(`/api/alerts/${id}/read`, {})
  }

  remove(id: number): Promise<void> {
    return this.delete(`/api/alerts/${id}`)
  }
}

export const alertRepository = AlertRepository.getInstance()
