import { BaseRepository } from '../core/ApiService'
import type { SensorReadingDto, ReadingListResponse } from '../types'

export class ReadingRepository extends BaseRepository {
  private static instance: ReadingRepository

  static getInstance(): ReadingRepository {
    if (!ReadingRepository.instance) {
      ReadingRepository.instance = new ReadingRepository()
    }
    return ReadingRepository.instance
  }

  list(sensorId?: number | null, limit = 100, greenhouseId?: number | null): Promise<ReadingListResponse> {
    if (sensorId)     return this.get(`/api/readings?sensor=${sensorId}&limit=${limit}`)
    if (greenhouseId) return this.get(`/api/readings?greenhouseId=${greenhouseId}&limit=${limit}`)
    return this.get(`/api/readings?limit=${limit}`)
  }

  create(data: Partial<SensorReadingDto>): Promise<SensorReadingDto> {
    return this.post('/api/readings', data)
  }
}

export const readingRepository = ReadingRepository.getInstance()
