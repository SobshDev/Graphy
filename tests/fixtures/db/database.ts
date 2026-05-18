import type { UserRecord } from '../models/user'
import type { PostRecord } from '../models/post'

export class Database {
  private users = new Map<string, UserRecord>()
  private posts = new Map<string, PostRecord>()

  saveUser(record: UserRecord): void {
    this.users.set(record.id, record)
  }

  findUser(id: string): UserRecord | undefined {
    return this.users.get(id)
  }

  savePost(record: PostRecord): void {
    this.posts.set(record.id, record)
  }

  findPost(id: string): PostRecord | undefined {
    return this.posts.get(id)
  }

  listPostsByAuthor(authorId: string): PostRecord[] {
    const all: PostRecord[] = []
    for (const post of this.posts.values()) {
      if (post.authorId === authorId) all.push(post)
    }
    return all
  }
}

export const db = new Database()
