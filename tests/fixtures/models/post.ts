import { slugify } from '../utils/format'

export interface PostRecord {
  id: string
  authorId: string
  title: string
  body: string
  publishedAt: Date | null
}

export class Post {
  constructor(public record: PostRecord) {}

  get slug(): string {
    return slugify(this.record.title)
  }

  isPublished(): boolean {
    return this.record.publishedAt !== null
  }

  preview(maxLength = 140): string {
    const body = this.record.body
    if (body.length <= maxLength) return body
    return `${body.slice(0, maxLength - 1).trimEnd()}…`
  }
}
