import { BaseRepository } from '../core/ApiService'
import type { ActuatorDto, ActuatorListResponse } from '../types'

export class ActuatorRepository extends BaseRepository {
  private static instance: ActuatorRepository

  static getInstance(): ActuatorRepository {
    if (!ActuatorRepository.instance) {
      ActuatorRepository.instance = new ActuatorRepository()
    }
    return ActuatorRepository.instance
  }

  list(greenhouseId?: number | null): Promise<ActuatorListResponse> {
    const q = greenhouseId ? `?greenhouseId=${greenhouseId}` : ''
    return this.get(`/api/actuators${q}`)
  }

  getById(id: number): Promise<ActuatorDto> {
    return this.get(`/api/actuators/${id}`)
  }

  create(data: Partial<ActuatorDto>): Promise<ActuatorDto> {
    return this.post('/api/actuators', data)
  }

  update(id: number, data: Partial<ActuatorDto>): Promise<ActuatorDto> {
    return this.put(`/api/actuators/${id}`, data)
  }

  remove(id: number): Promise<void> {
    return this.delete(`/api/actuators/${id}`)
  }
}

export const actuatorRepository = ActuatorRepository.getInstance()
