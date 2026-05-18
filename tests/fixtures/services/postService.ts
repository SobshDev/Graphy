import { db } from '../db/database'
import { Post } from '../models/post'
import type { PostRecord } from '../models/post'
import { userService } from './userService'
import { assertTitle } from '../utils/validate'

export class PostService {
  create(input: { authorId: string; title: string; body: string }): Post {
    assertTitle(input.title)
    const author = userService.get(input.authorId)
    if (!author) throw new Error(`Unknown author: ${input.authorId}`)
    if (!author.canPublish()) {
      throw new Error(`User ${author.id} is not allowed to publish`)
    }

    const record: PostRecord = {
      id: makePostId(),
      authorId: input.authorId,
      title: input.title,
      body: input.body,
      publishedAt: null,
    }
    db.savePost(record)
    return new Post(record)
  }

  publish(id: string): Post {
    const record = db.findPost(id)
    if (!record) throw new Error(`Unknown post: ${id}`)
    record.publishedAt = new Date()
    db.savePost(record)
    return new Post(record)
  }

  byAuthor(authorId: string): Post[] {
    return db.listPostsByAuthor(authorId).map((r) => new Post(r))
  }
}

function makePostId(): string {
  return `p_${Math.random().toString(36).slice(2, 10)}`
}

export const postService = new PostService()
