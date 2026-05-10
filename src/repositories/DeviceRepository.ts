import { BaseRepository } from '../core/ApiService'
import type { DeviceConfigDto, GpioOptionsDto } from '../types'

export class DeviceRepository extends BaseRepository {
  private static instance: DeviceRepository

  static getInstance(): DeviceRepository {
    if (!DeviceRepository.instance) {
      DeviceRepository.instance = new DeviceRepository()
    }
    return DeviceRepository.instance
  }

  register(data: Record<string, unknown>): Promise<unknown> {
    return this.post('/api/device/register', data)
  }

  getConfig(greenhouseId: number): Promise<DeviceConfigDto> {
    return this.get(`/api/device/config/${greenhouseId}`)
  }

  getGpios(greenhouseId: number): Promise<GpioOptionsDto> {
    return this.get(`/api/device/gpios/${greenhouseId}`)
  }
}

export const deviceRepository = DeviceRepository.getInstance()
