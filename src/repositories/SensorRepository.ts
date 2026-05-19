import { BaseRepository } from '../core/ApiService'
import type { SensorDto, SensorListResponse, SensorThresholdDto } from '../types'

export class SensorRepository extends BaseRepository {
  private static instance: SensorRepository

  static getInstance(): SensorRepository {
    if (!SensorRepository.instance) {
      SensorRepository.instance = new SensorRepository()
    }
    return SensorRepository.instance
  }

  list(greenhouseId?: number | null): Promise<SensorListResponse> {
    const q = greenhouseId ? `?greenhouseId=${greenhouseId}` : ''
    return this.get(`/api/sensors${q}`)
  }

  getById(id: number): Promise<SensorDto> {
    return this.get(`/api/sensors/${id}`)
  }

  create(data: Partial<SensorDto>): Promise<SensorDto> {
    return this.post('/api/sensors', data)
  }

  update(id: number, data: Partial<SensorDto>): Promise<SensorDto> {
    return this.put(`/api/sensors/${id}`, data)
  }

  remove(id: number): Promise<void> {
    return this.delete(`/api/sensors/${id}`)
  }

  getThreshold(id: number): Promise<SensorThresholdDto> {
    return this.get(`/api/sensors/${id}/threshold`)
  }

  setThreshold(id: number, data: Partial<SensorThresholdDto>): Promise<SensorThresholdDto> {
    return this.put(`/api/sensors/${id}/threshold`, data)
  }

  deleteThreshold(id: number): Promise<void> {
    return this.delete(`/api/sensors/${id}/threshold`)
  }
}

export const sensorRepository = SensorRepository.getInstance()
