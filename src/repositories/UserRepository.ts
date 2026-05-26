import { BaseRepository } from '../core/ApiService'
import type { UserDto, UserListResponse } from '../types'

export class UserRepository extends BaseRepository {
  private static instance: UserRepository

  static getInstance(): UserRepository {
    if (!UserRepository.instance) {
      UserRepository.instance = new UserRepository()
    }
    return UserRepository.instance
  }

  list(): Promise<UserListResponse> {
    return this.get('/api/users')
  }

  create(data: Partial<UserDto>): Promise<UserDto> {
    return this.post('/api/users', data)
  }

  update(id: number, data: Partial<UserDto>): Promise<UserDto> {
    return this.put(`/api/users/${id}`, data)
  }

  remove(id: number): Promise<void> {
    return this.delete(`/api/users/${id}`)
  }

  // Auth-scoped
  login(username: string, password: string): Promise<UserDto> {
    return this.post('/api/auth/login', { username, password })
  }

  googleLogin(email: string, name: string, googleId: string): Promise<UserDto> {
    return this.post('/api/auth/login', { email, name, googleId })
  }

  register(username: string, password: string, fullName: string, email?: string): Promise<UserDto> {
    return this.post('/api/auth/register', { username, password, fullName, ...(email ? { email } : {}) })
  }

  me(): Promise<UserDto> {
    return this.get('/api/auth/me')
  }

  // JWT token is sent automatically via ApiService; no manual headers needed
  listAll(): Promise<UserListResponse> {
    return this.get('/api/auth/users')
  }

  bootstrapAdmin(email: string): Promise<UserDto> {
    return this.post('/api/auth/bootstrap-admin', { email })
  }

  changeRole(userId: number, role: string): Promise<void> {
    return this.put(`/api/auth/users/${userId}/role`, { role })
  }

  getGreenhouses(userId: number): Promise<{ ids: number[] }> {
    return this.get(`/api/users/${userId}/greenhouses`)
  }

  setGreenhouses(userId: number, ids: number[]): Promise<{ ids: number[] }> {
    return this.put(`/api/auth/users/${userId}/greenhouses`, { ids })
  }
}

export const userRepository = UserRepository.getInstance()
