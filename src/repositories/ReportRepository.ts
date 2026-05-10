import { BaseRepository } from '../core/ApiService'

export class ReportRepository extends BaseRepository {
  private static instance: ReportRepository

  static getInstance(): ReportRepository {
    if (!ReportRepository.instance) {
      ReportRepository.instance = new ReportRepository()
    }
    return ReportRepository.instance
  }

  dailyCsv(): Promise<unknown> {
    return this.get('/api/reports/daily-csv')
  }

  weeklyStats(): Promise<unknown> {
    return this.get('/api/reports/weekly-stats')
  }

  sendEmail(data: Record<string, unknown>): Promise<unknown> {
    return this.post('/api/reports/send-email', data)
  }

  schedule(data: Record<string, unknown>): Promise<unknown> {
    return this.post('/api/reports/schedule', data)
  }

  history(limit = 10): Promise<unknown> {
    return this.get(`/api/reports/history?limit=${limit}`)
  }
}

export const reportRepository = ReportRepository.getInstance()
