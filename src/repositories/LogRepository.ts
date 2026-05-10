import { BaseRepository } from '../core/ApiService'
import type { LogListResponse } from '../types'

export class LogRepository extends BaseRepository {
  private static instance: LogRepository

  static getInstance(): LogRepository {
    if (!LogRepository.instance) {
      LogRepository.instance = new LogRepository()
    }
    return LogRepository.instance
  }

  list(limit = 100): Promise<LogListResponse> {
    return this.get(`/api/logs?limit=${limit}`)
  }
}

export const logRepository = LogRepository.getInstance()
