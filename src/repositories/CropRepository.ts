import { BaseRepository } from '../core/ApiService'
import type { CropDto, CropListResponse } from '../types'

export class CropRepository extends BaseRepository {
  private static instance: CropRepository

  static getInstance(): CropRepository {
    if (!CropRepository.instance) {
      CropRepository.instance = new CropRepository()
    }
    return CropRepository.instance
  }

  list(greenhouseId?: number | null): Promise<CropListResponse> {
    if (greenhouseId) return this.get(`/api/crops?greenhouseId=${greenhouseId}`)
    return this.get('/api/crops')
  }

  getById(id: number): Promise<CropDto> {
    return this.get(`/api/crops/${id}`)
  }

  create(data: Partial<CropDto>): Promise<CropDto> {
    return this.post('/api/crops', data)
  }

  update(id: number, data: Partial<CropDto>): Promise<CropDto> {
    return this.put(`/api/crops/${id}`, data)
  }

  remove(id: number): Promise<void> {
    return this.delete(`/api/crops/${id}`)
  }
}

export const cropRepository = CropRepository.getInstance()
