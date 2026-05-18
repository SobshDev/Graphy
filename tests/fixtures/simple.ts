export function add(a: number, b: number): number {
  return a + b
}

export function greet(name: string): string {
  return `Hello, ${name}`
}

function privateHelper(x: number): number {
  return x * 2
}

export const arrowFn = (n: number): number => n + 1
