export interface UserRecord {
  id: string
  email: string
  displayName: string
  role: 'admin' | 'reader' | 'author'
  createdAt: Date
}

export class User {
  constructor(public record: UserRecord) {}

  get id(): string {
    return this.record.id
  }

  canPublish(): boolean {
    return this.record.role === 'admin' || this.record.role === 'author'
  }

  canModerate(): boolean {
    return this.record.role === 'admin'
  }

  toPublic(): Pick<UserRecord, 'id' | 'displayName'> {
    return { id: this.record.id, displayName: this.record.displayName }
  }
}
