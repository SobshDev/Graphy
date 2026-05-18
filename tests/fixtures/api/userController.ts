import { userService } from '../services/userService'
import { capitalize } from '../utils/format'

export function registerUser(input: {
  email: string
  displayName: string
  role: 'admin' | 'reader' | 'author'
}): { id: string; displayName: string } {
  const user = userService.create({
    email: input.email,
    displayName: capitalize(input.displayName),
    role: input.role,
  })
  return user.toPublic()
}

export function fetchUser(
  id: string,
): { id: string; displayName: string } | null {
  const user = userService.get(id)
  return user ? user.toPublic() : null
}
