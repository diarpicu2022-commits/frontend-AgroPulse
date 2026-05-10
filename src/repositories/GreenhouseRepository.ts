import { BaseRepository } from '../core/ApiService'
import type {
  GreenhouseDto,
  GreenhouseListResponse,
  UserListResponse,
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
}

export const greenhouseRepository = GreenhouseRepository.getInstance()
