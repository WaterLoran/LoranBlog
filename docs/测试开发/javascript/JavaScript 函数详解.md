# JavaScript 函数详解

JavaScript 函数是一等公民，可以作为参数传递、作为返回值、赋值给变量，并支持多种声明方式。以下是详细分类和示例：

## 1. 函数声明方式

### 1.1 函数声明（Function Declaration）
```javascript
// 基础声明
function greet(name) {
    return `Hello, ${name}!`;
}
console.log(greet('Alice')); // Hello, Alice!

// 带默认参数
function multiply(a, b = 1) {
    return a * b;
}
console.log(multiply(5)); // 5
console.log(multiply(5, 3)); // 15

// 使用 arguments 对象
function sum() {
    let total = 0;
    for (let i = 0; i < arguments.length; i++) {
        total += arguments[i];
    }
    return total;
}
console.log(sum(1, 2, 3, 4)); // 10
```

### 1.2 函数表达式（Function Expression）
```javascript
// 匿名函数表达式
const square = function(x) {
    return x * x;
};
console.log(square(4)); // 16

// 命名函数表达式（有名字的函数表达式）
const factorial = function fact(n) {
    return n <= 1 ? 1 : n * fact(n - 1);
};
console.log(factorial(5)); // 120

// IIFE - 立即调用函数表达式
(function() {
    console.log('立即执行！');
})();

// 带参数的 IIFE
const result = (function(a, b) {
    return a + b;
})(3, 4);
console.log(result); // 7
```

### 1.3 箭头函数（Arrow Function）
```javascript
// 基础箭头函数
const add = (a, b) => a + b;
console.log(add(2, 3)); // 5

// 单参数可省略括号
const double = x => x * 2;
console.log(double(5)); // 10

// 无参数需要括号
const getRandom = () => Math.random();
console.log(getRandom());

// 多行函数体需要大括号和 return
const max = (a, b) => {
    if (a > b) return a;
    return b;
};
console.log(max(10, 20)); // 20

// 返回对象需要括号包裹
const createUser = (name, age) => ({ name, age });
console.log(createUser('Bob', 30)); // {name: 'Bob', age: 30}
```

### 1.4 构造函数（不推荐，仅了解）
```javascript
const add = new Function('a', 'b', 'return a + b');
console.log(add(2, 3)); // 5
```

## 2. 函数参数处理

### 2.1 默认参数
```javascript
function createOrder(item, quantity = 1, price = 9.99) {
    return {
        item,
        quantity,
        price,
        total: quantity * price
    };
}
console.log(createOrder('Book')); // {item: 'Book', quantity: 1, price: 9.99, total: 9.99}
console.log(createOrder('Book', 3)); // {item: 'Book', quantity: 3, price: 9.99, total: 29.97}
```

### 2.2 剩余参数（Rest Parameters）
```javascript
function join(separator, ...strings) {
    return strings.join(separator);
}
console.log(join('-', 'a', 'b', 'c')); // a-b-c

function sumAll(...numbers) {
    return numbers.reduce((acc, num) => acc + num, 0);
}
console.log(sumAll(1, 2, 3, 4, 5)); // 15
```

### 2.3 参数解构
```javascript
// 对象参数解构
function displayUser({ name, age, city = 'Unknown' }) {
    return `${name} is ${age} years old from ${city}`;
}
const user = { name: 'Alice', age: 25 };
console.log(displayUser(user)); // Alice is 25 years old from Unknown

// 数组参数解构
function getFirstTwo([first, second]) {
    return [second, first]; // 交换位置
}
console.log(getFirstTwo([1, 2, 3])); // [2, 1]

// 混合解构
function processOrder({ id, items: [firstItem, ...rest] }) {
    return `Order ${id}: ${firstItem} + ${rest.length} more items`;
}
const order = { id: 123, items: ['Book', 'Pen', 'Notebook'] };
console.log(processOrder(order)); // Order 123: Book + 2 more items
```

## 3. 函数类型

### 3.1 纯函数（Pure Functions）
```javascript
// 纯函数：相同输入总是得到相同输出，无副作用
const pureAdd = (a, b) => a + b;
const toUpperCase = str => str.toUpperCase();

// 不纯的函数示例
let counter = 0;
const impureAdd = () => ++counter; // 依赖外部状态
const randomAdd = (a, b) => a + b + Math.random(); // 输出不确定
```

### 3.2 高阶函数（Higher-Order Functions）
```javascript
// 接收函数作为参数
function calculate(a, b, operation) {
    return operation(a, b);
}
console.log(calculate(10, 5, (x, y) => x + y)); // 15
console.log(calculate(10, 5, (x, y) => x * y)); // 50

// 返回函数
function createMultiplier(multiplier) {
    return function(number) {
        return number * multiplier;
    };
}
const double = createMultiplier(2);
const triple = createMultiplier(3);
console.log(double(5)); // 10
console.log(triple(5)); // 15

// 函数组合
const compose = (f, g) => x => f(g(x));
const toUpperCase = str => str.toUpperCase();
const exclaim = str => str + '!';
const shout = compose(exclaim, toUpperCase);
console.log(shout('hello')); // HELLO!
```

### 3.3 递归函数
```javascript
// 阶乘
function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}
console.log(factorial(5)); // 120

// 斐波那契数列（带缓存优化）
function fibonacci(n, memo = {}) {
    if (n in memo) return memo[n];
    if (n <= 2) return 1;
    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);
    return memo[n];
}
console.log(fibonacci(10)); // 55

// 遍历嵌套对象
function deepFind(obj, targetKey) {
    for (let key in obj) {
        if (key === targetKey) return obj[key];
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            const result = deepFind(obj[key], targetKey);
            if (result !== undefined) return result;
        }
    }
    return undefined;
}
const data = { a: { b: { c: 'found!' } } };
console.log(deepFind(data, 'c')); // found!
```

### 3.4 生成器函数（Generator Functions）
```javascript
function* numberGenerator() {
    let num = 0;
    while (true) {
        yield num++;
    }
}

const gen = numberGenerator();
console.log(gen.next().value); // 0
console.log(gen.next().value); // 1
console.log(gen.next().value); // 2

// 实际应用：ID生成器
function* idGenerator() {
    let id = 1;
    while (true) {
        yield id++;
    }
}

const userIds = idGenerator();
console.log(userIds.next().value); // 1
console.log(userIds.next().value); // 2
```

### 3.5 异步函数（Async/Await）
```javascript
async function fetchUserData(userId) {
    try {
        const response = await fetch(`https://api.example.com/users/${userId}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching user:', error);
        return null;
    }
}

// 并行执行多个异步操作
async function fetchMultipleUsers(userIds) {
    const promises = userIds.map(id => fetchUserData(id));
    const users = await Promise.all(promises);
    return users.filter(user => user !== null);
}
```

## 4. 函数作用域和闭包

```javascript
// 词法作用域
function outer() {
    const outerVar = 'I am outside!';
    
    function inner() {
        const innerVar = 'I am inside!';
        console.log(outerVar); // 可以访问外部变量
        return innerVar;
    }
    
    // console.log(innerVar); // 错误：innerVar未定义
    return inner();
}
console.log(outer());

// 闭包示例
function createCounter() {
    let count = 0;
    
    return {
        increment() {
            count++;
            return count;
        },
        decrement() {
            count--;
            return count;
        },
        getCount() {
            return count;
        }
    };
}

const counter = createCounter();
console.log(counter.increment()); // 1
console.log(counter.increment()); // 2
console.log(counter.decrement()); // 1
console.log(counter.getCount()); // 1

// 模块模式
const calculator = (function() {
    let memory = 0;
    
    return {
        add(a, b) {
            return a + b;
        },
        subtract(a, b) {
            return a - b;
        },
        store(value) {
            memory = value;
        },
        recall() {
            return memory;
        }
    };
})();

console.log(calculator.add(5, 3)); // 8
calculator.store(100);
console.log(calculator.recall()); // 100
```

## 5. 函数方法和属性

```javascript
// call, apply, bind
function introduce(greeting, punctuation) {
    console.log(`${greeting}, I'm ${this.name}${punctuation}`);
}

const person1 = { name: 'Alice' };
const person2 = { name: 'Bob' };

// call - 立即调用，逐个传递参数
introduce.call(person1, 'Hello', '!'); // Hello, I'm Alice!

// apply - 立即调用，数组传递参数
introduce.apply(person2, ['Hi', '!']); // Hi, I'm Bob!

// bind - 返回新函数，延迟执行
const introduceBob = introduce.bind(person2, 'Hey');
introduceBob('...'); // Hey, I'm Bob...

// 函数属性
function exampleFunc(a, b, c) {
    return a + b + c;
}

console.log(exampleFunc.length); // 3 - 参数个数
console.log(exampleFunc.name); // "exampleFunc"

// 自定义函数属性
function getNextId() {
    return getNextId.currentId++;
}
getNextId.currentId = 1;
console.log(getNextId()); // 1
console.log(getNextId()); // 2
```

## 6. 函数柯里化（Currying）

```javascript
// 手动柯里化
function curryAdd(a) {
    return function(b) {
        return function(c) {
            return a + b + c;
        };
    };
}
console.log(curryAdd(1)(2)(3)); // 6

// 通用柯里化函数
function curry(fn) {
    return function curried(...args) {
        if (args.length >= fn.length) {
            return fn.apply(this, args);
        } else {
            return function(...args2) {
                return curried.apply(this, args.concat(args2));
            };
        }
    };
}

function multiplyThree(a, b, c) {
    return a * b * c;
}

const curriedMultiply = curry(multiplyThree);
console.log(curriedMultiply(2)(3)(4)); // 24
console.log(curriedMultiply(2, 3)(4)); // 24
console.log(curriedMultiply(2)(3, 4)); // 24
```

## 7. 函数式编程工具函数

```javascript
// 节流函数（Throttle）
function throttle(func, delay) {
    let lastCall = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            return func.apply(this, args);
        }
    };
}

// 防抖函数（Debounce）
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

// 记忆函数（Memoization）
function memoize(fn) {
    const cache = new Map();
    return function(...args) {
        const key = JSON.stringify(args);
        if (cache.has(key)) {
            return cache.get(key);
        }
        const result = fn.apply(this, args);
        cache.set(key, result);
        return result;
    };
}

const memoizedFibonacci = memoize(fibonacci);
console.time('First call');
console.log(memoizedFibonacci(40)); // 第一次计算
console.timeEnd('First call');

console.time('Second call');
console.log(memoizedFibonacci(40)); // 从缓存读取
console.timeEnd('Second call');
```

## 8. 实际应用示例

```javascript
// 表单验证器
function createValidator(rules) {
    return function validate(data) {
        const errors = {};
        
        for (const [field, validators] of Object.entries(rules)) {
            for (const validator of validators) {
                const error = validator(data[field], field, data);
                if (error) {
                    errors[field] = error;
                    break;
                }
            }
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    };
}

const userValidator = createValidator({
    username: [
        value => !value && '用户名不能为空',
        value => value.length < 3 && '用户名至少3个字符'
    ],
    email: [
        value => !value && '邮箱不能为空',
        value => !/^\S+@\S+\.\S+$/.test(value) && '邮箱格式不正确'
    ]
});

const user = { username: 'ab', email: 'invalid' };
const result = userValidator(user);
console.log(result); // {isValid: false, errors: {...}}

// 中间件模式
function createMiddlewarePipeline(middlewares) {
    return function(context, next) {
        let index = -1;
        
        function dispatch(i) {
            if (i <= index) return Promise.reject(new Error('next() called multiple times'));
            index = i;
            
            let fn = middlewares[i];
            if (i === middlewares.length) fn = next;
            if (!fn) return Promise.resolve();
            
            try {
                return Promise.resolve(fn(context, () => {
                    return dispatch(i + 1);
                }));
            } catch (err) {
                return Promise.reject(err);
            }
        }
        
        return dispatch(0);
    };
}

const middlewares = [
    async (ctx, next) => {
        console.log('Middleware 1 start');
        await next();
        console.log('Middleware 1 end');
    },
    async (ctx, next) => {
        console.log('Middleware 2 start');
        ctx.data = 'processed';
        await next();
        console.log('Middleware 2 end');
    }
];

const pipeline = createMiddlewarePipeline(middlewares);
const context = {};
pipeline(context).then(() => {
    console.log('Pipeline complete:', context.data);
});
```

JavaScript 函数非常强大和灵活，理解这些概念和模式对于编写高质量、可维护的代码至关重要。