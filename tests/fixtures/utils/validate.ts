const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const isEmail = (value: string): boolean => EMAIL_RE.test(value)

export const isNonEmpty = (value: string): boolean => value.trim().length > 0

export function assertEmail(value: string): void {
  if (!isEmail(value)) {
    throw new Error(`Invalid email: ${value}`)
  }
}

export function assertTitle(value: string): void {
  if (!isNonEmpty(value)) {
    throw new Error('Title must not be empty')
  }
  if (value.length > 120) {
    throw new Error('Title too long (max 120)')
  }
}
