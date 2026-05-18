function test(a: number, b:number):number {
    return a-b;
}

let addNumbers = (a: number, b: number): number => {
    return a+b;
};

class Calc {
    add(a: number, b: number): number {
        return a+b;
    }
}


console.log(addNumbers(2, 2));