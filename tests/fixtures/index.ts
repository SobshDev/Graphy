import { registerUser } from './api/userController'
import { createPost, listAuthorPosts, publishPost } from './api/postController'

function seedDemo(): void {
  const author = registerUser({
    email: 'alice@example.com',
    displayName: 'alice',
    role: 'author',
  })

  const draft = createPost({
    authorId: author.id,
    title: 'Hello, Graphy',
    body: 'A short post body that the parser will summarize.',
  })

  publishPost(draft.slug)

  const all = listAuthorPosts(author.id)
  console.log(`Author ${author.displayName} has ${all.length} post(s)`)
}

seedDemo()
