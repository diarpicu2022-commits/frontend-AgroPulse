import { BaseRepository } from '../core/ApiService'
import type { SystemSettingDto } from '../types'

export class SystemSettingRepository extends BaseRepository {
  private static instance: SystemSettingRepository

  static getInstance(): SystemSettingRepository {
    if (!SystemSettingRepository.instance) {
      SystemSettingRepository.instance = new SystemSettingRepository()
    }
    return SystemSettingRepository.instance
  }

  list(): Promise<SystemSettingDto[]> {
    return this.get('/api/system-settings')
  }

  update(key: string, value: string): Promise<SystemSettingDto> {
    return this.put(`/api/system-settings/${key}`, { value })
  }
}

export const systemSettingRepository = SystemSettingRepository.getInstance()
