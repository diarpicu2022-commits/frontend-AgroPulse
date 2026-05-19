import { BaseRepository } from '../core/ApiService'
import type {
  GreenhouseDto,
  GreenhouseListResponse,
  UserListResponse,
  AlertRecipient,
} from '../types'

export class GreenhouseRepository extends BaseRepository {
  private static instance: GreenhouseRepository

  static getInstance(): GreenhouseRepository {
    if (!GreenhouseRepository.instance) {
      GreenhouseRepository.instance = new GreenhouseRepository()
    }
    return GreenhouseRepository.instance
  }

  list(): Promise<GreenhouseListResponse> {
    return this.get('/api/greenhouses')
  }

  getById(id: number): Promise<GreenhouseDto> {
    return this.get(`/api/greenhouses/${id}`)
  }

  create(data: Partial<GreenhouseDto>): Promise<GreenhouseDto> {
    return this.post('/api/greenhouses', data)
  }

  update(id: number, data: Partial<GreenhouseDto>): Promise<GreenhouseDto> {
    return this.put(`/api/greenhouses/${id}`, data)
  }

  remove(id: number): Promise<void> {
    return this.delete(`/api/greenhouses/${id}`)
  }

  listUsers(id: number): Promise<UserListResponse> {
    return this.get(`/api/greenhouses/${id}/users`)
  }

  assignUser(id: number, userId: number): Promise<void> {
    return this.post(`/api/greenhouses/${id}/users`, { userId })
  }

  removeUser(id: number, userId: number): Promise<void> {
    return this.delete(`/api/greenhouses/${id}/users/${userId}`)
  }

  listRecipients(id: number): Promise<{ recipients: AlertRecipient[] }> {
    return this.get(`/api/greenhouses/${id}/alert-recipients`)
  }

  addRecipient(id: number, data: Omit<AlertRecipient, 'id' | 'greenhouseId' | 'active'>): Promise<AlertRecipient> {
    return this.post(`/api/greenhouses/${id}/alert-recipients`, data)
  }

  removeRecipient(id: number, recipientId: number): Promise<void> {
    return this.delete(`/api/greenhouses/${id}/alert-recipients/${recipientId}`)
  }
}

export const greenhouseRepository = GreenhouseRepository.getInstance()
