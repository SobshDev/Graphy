import { greet } from "./simple"

export function modulo(a: number, b: number): number {
  return a / b
}

export function sqrt(a: number, b: number): number {
  return Math.sqrt(a * a + b * b)
}

function test() {
    greet("hello");
}