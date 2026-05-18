import { postService } from '../services/postService'
import { formatDate, truncate } from '../utils/format'

export interface PostSummary {
  slug: string
  title: string
  preview: string
  publishedAt: string | null
}

export function createPost(input: {
  authorId: string
  title: string
  body: string
}): PostSummary {
  const post = postService.create(input)
  return summarize(post)
}

export function publishPost(id: string): PostSummary {
  const post = postService.publish(id)
  return summarize(post)
}

export function listAuthorPosts(authorId: string): PostSummary[] {
  return postService.byAuthor(authorId).map(summarize)
}

function summarize(post: ReturnType<typeof postService.create>): PostSummary {
  return {
    slug: post.slug,
    title: truncate(post.record.title, 60),
    preview: post.preview(),
    publishedAt: post.record.publishedAt
      ? formatDate(post.record.publishedAt)
      : null,
  }
}
