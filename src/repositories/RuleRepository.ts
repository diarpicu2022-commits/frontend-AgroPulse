import { BaseRepository } from '../core/ApiService'
import type { RuleDto, RuleListResponse } from '../types'

export class RuleRepository extends BaseRepository {
  private static instance: RuleRepository

  static getInstance(): RuleRepository {
    if (!RuleRepository.instance) {
      RuleRepository.instance = new RuleRepository()
    }
    return RuleRepository.instance
  }

  list(): Promise<RuleListResponse> {
    return this.get('/api/rules')
  }

  create(data: Partial<RuleDto>): Promise<RuleDto> {
    return this.post('/api/rules', data)
  }

  update(id: number, data: Partial<RuleDto>): Promise<RuleDto> {
    return this.put(`/api/rules/${id}`, data)
  }

  remove(id: number): Promise<void> {
    return this.delete(`/api/rules/${id}`)
  }
}

export const ruleRepository = RuleRepository.getInstance()
