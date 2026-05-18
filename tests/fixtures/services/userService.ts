import { db } from '../db/database'
import { User } from '../models/user'
import type { UserRecord } from '../models/user'
import { assertEmail } from '../utils/validate'

export class UserService {
  create(input: Omit<UserRecord, 'id' | 'createdAt'>): User {
    assertEmail(input.email)
    const record: UserRecord = {
      id: makeId(),
      email: input.email,
      displayName: input.displayName,
      role: input.role,
      createdAt: new Date(),
    }
    db.saveUser(record)
    return new User(record)
  }

  get(id: string): User | null {
    const record = db.findUser(id)
    if (!record) return null
    return new User(record)
  }
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export const userService = new UserService()
