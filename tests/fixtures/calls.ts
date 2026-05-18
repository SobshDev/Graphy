import { add } from './simple'

function helperA(x: number): number {
  return x + 1
}

function helperB(x: number): number {
  return helperA(x) * 2
}

export function run(): number {
  return helperB(add(1, 2))
}

class Calc {
  double(n: number): number {
    return this.triple(n) - n
  }

  triple(n: number): number {
    return n * 3
  }
}

export function useCalc(): number {
  const c = new Calc()
  return c.double(5)
}
