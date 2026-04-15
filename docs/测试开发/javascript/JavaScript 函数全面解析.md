# JavaScript 函数全面解析

## 一、函数定义方式

### 1. **函数声明（Function Declaration）**
```javascript
// 1.1 基本函数声明
function greet(name) {
    return `Hello, ${name}!`;
}

// 1.2 有默认参数的函数
function calculateArea(width = 10, height = 20) {
    return width * height;
}

// 1.3 函数提升（可以在声明前调用）
console.log(square(5)); // 25，不会报错
function square(x) {
    return x * x;
}
```

### 2. **函数表达式（Function Expression）**
```javascript
// 2.1 匿名函数表达式
const multiply = function(x, y) {
    return x * y;
};

// 2.2 命名函数表达式（便于调试）
const factorial = function fact(n) {
    return n <= 1 ? 1 : n * fact(n - 1);
};

// 2.3 立即调用函数表达式（IIFE）
(function() {
    console.log('立即执行');
})();

// 2.4 现代IIFE写法（推荐）
(() => {
    console.log('箭头函数IIFE');
})();
```

### 3. **箭头函数（Arrow Function）** - ES6+
```javascript
// 3.1 基本箭头函数
const add = (a, b) => a + b;

// 3.2 单个参数可省略括号
const square = x => x * x;

// 3.3 无参数需要括号
const getTime = () => new Date();

// 3.4 多行函数体需要大括号和return
const sumArray = arr => {
    let total = 0;
    arr.forEach(num => total += num);
    return total;
};

// 3.5 返回对象需要用括号包裹
const createUser = (name, age) => ({ name, age });
```

### 4. **构造函数（Function Constructor）** - 不推荐使用
```javascript
const add = new Function('a', 'b', 'return a + b');
console.log(add(2, 3)); // 5
```

### 5. **生成器函数（Generator Function）** - ES6
```javascript
function* numberGenerator() {
    let num = 1;
    while (true) {
        yield num++;
    }
}

const gen = numberGenerator();
console.log(gen.next().value); // 1
console.log(gen.next().value); // 2
```

### 6. **异步函数（Async Function）** - ES2017
```javascript
async function fetchData(url) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('获取数据失败:', error);
        throw error;
    }
}
```

## 二、函数参数处理

### 1. **默认参数** - ES6
```javascript
function createOrder(product, quantity = 1, discount = 0) {
    return {
        product,
        quantity,
        discount,
        total: product.price * quantity * (1 - discount)
    };
}
```

### 2. **剩余参数（Rest Parameters）** - ES6
```javascript
// 将所有剩余参数收集到数组中
function sum(...numbers) {
    return numbers.reduce((total, num) => total + num, 0);
}

console.log(sum(1, 2, 3, 4, 5)); // 15

// 结合普通参数使用
function join(separator, ...strings) {
    return strings.join(separator);
}
```

### 3. **参数解构** - ES6
```javascript
// 3.1 对象参数解构
function printUser({ name, age, city = 'Unknown' }) {
    console.log(`${name} is ${age} years old from ${city}`);
}

printUser({ name: 'Alice', age: 25 });

// 3.2 数组参数解构
function getFirstAndLast([first, ...rest]) {
    return { first, last: rest.pop() };
}

console.log(getFirstAndLast([1, 2, 3, 4])); // {first: 1, last: 4}
```

## 三、函数调用方式

### 1. **普通调用**
```javascript
function sayHello(name) {
    console.log(`Hello, ${name}!`);
}

sayHello('World'); // 普通调用
```

### 2. **方法调用**
```javascript
const calculator = {
    value: 0,
    add: function(x) {
        this.value += x;
        return this;
    },
    multiply: function(x) {
        this.value *= x;
        return this;
    },
    getValue: function() {
        return this.value;
    }
};

// 方法链式调用
calculator.add(5).multiply(3).add(10);
console.log(calculator.getValue()); // 25
```

### 3. **构造函数调用**
```javascript
function Person(name, age) {
    this.name = name;
    this.age = age;
    
    this.introduce = function() {
        console.log(`I'm ${this.name}, ${this.age} years old.`);
    };
}

const person = new Person('Alice', 25);
person.introduce(); // I'm Alice, 25 years old.
```

### 4. **使用 call/apply/bind 调用**
```javascript
const user = {
    name: 'Alice',
    age: 25
};

function introduce(greeting, punctuation) {
    console.log(`${greeting}, I'm ${this.name}${punctuation}`);
}

// 4.1 call - 立即调用，参数逐个传递
introduce.call(user, 'Hello', '!');

// 4.2 apply - 立即调用，参数以数组传递
introduce.apply(user, ['Hi', '!!']);

// 4.3 bind - 创建新函数，延迟调用
const boundIntroduce = introduce.bind(user, 'Hey');
boundIntroduce('...'); // Hey, I'm Alice...

// 4.4 实用示例：借用数组方法
const arrayLike = { 0: 'a', 1: 'b', length: 2 };
const realArray = Array.prototype.slice.call(arrayLike);
```

## 四、高阶函数（Higher-Order Functions）

### 1. **函数作为参数**
```javascript
// 1.1 回调函数
function processData(data, callback) {
    console.log('处理数据中...');
    setTimeout(() => {
        const result = data.toUpperCase();
        callback(null, result);
    }, 1000);
}

processData('hello', (error, result) => {
    if (error) console.error(error);
    else console.log('结果:', result);
});

// 1.2 数组高阶函数
const numbers = [1, 2, 3, 4, 5];

// map - 映射
const doubled = numbers.map(n => n * 2);

// filter - 过滤
const even = numbers.filter(n => n % 2 === 0);

// reduce - 累积
const sum = numbers.reduce((acc, curr) => acc + curr, 0);

// sort - 排序
const sorted = numbers.sort((a, b) => b - a);
```

### 2. **函数作为返回值**
```javascript
// 2.1 工厂函数
function createMultiplier(factor) {
    return function(number) {
        return number * factor;
    };
}

const double = createMultiplier(2);
const triple = createMultiplier(3);

console.log(double(5)); // 10
console.log(triple(5)); // 15

// 2.2 函数组合
function compose(...functions) {
    return function(value) {
        return functions.reduceRight((acc, fn) => fn(acc), value);
    };
}

const add5 = x => x + 5;
const multiply2 = x => x * 2;
const square = x => x * x;

const complexOperation = compose(square, multiply2, add5);
console.log(complexOperation(3)); // ((3+5)*2)^2 = 256
```

### 3. **柯里化（Currying）**
```javascript
// 3.1 手动柯里化
function curryAdd(a) {
    return function(b) {
        return function(c) {
            return a + b + c;
        };
    };
}

console.log(curryAdd(1)(2)(3)); // 6

// 3.2 通用柯里化函数
function curry(fn) {
    return function curried(...args) {
        if (args.length >= fn.length) {
            return fn.apply(this, args);
        } else {
            return function(...moreArgs) {
                return curried.apply(this, args.concat(moreArgs));
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
```

## 五、作用域和闭包

### 1. **作用域类型**
```javascript
// 1.1 全局作用域
const globalVar = 'I am global';

// 1.2 函数作用域
function outer() {
    const outerVar = 'I am outer';
    
    function inner() {
        const innerVar = 'I am inner';
        console.log(globalVar);    // 可以访问
        console.log(outerVar);     // 可以访问
        console.log(innerVar);     // 可以访问
    }
    
    inner();
    // console.log(innerVar); // 错误：innerVar未定义
}

// 1.3 块级作用域（ES6 let/const）
{
    let blockScoped = 'I am block scoped';
    const alsoBlockScoped = 'Me too';
}

// console.log(blockScoped); // 错误：blockScoped未定义
```

### 2. **闭包（Closure）**
```javascript
// 2.1 基本闭包
function createCounter() {
    let count = 0;
    
    return {
        increment: function() {
            count++;
            return count;
        },
        decrement: function() {
            count--;
            return count;
        },
        getCount: function() {
            return count;
        }
    };
}

const counter = createCounter();
console.log(counter.increment()); // 1
console.log(counter.increment()); // 2
console.log(counter.getCount());  // 2

// 2.2 模块模式
const calculatorModule = (function() {
    let memory = 0;
    
    function add(x, y) {
        return x + y;
    }
    
    function store(value) {
        memory = value;
    }
    
    function recall() {
        return memory;
    }
    
    return {
        add,
        store,
        recall
    };
})();

console.log(calculatorModule.add(2, 3)); // 5
calculatorModule.store(10);
console.log(calculatorModule.recall()); // 10
```

## 六、this 关键字详解

### 1. **this 的绑定规则**
```javascript
// 1.1 默认绑定（严格模式 vs 非严格模式）
function showThis() {
    console.log(this);
}

showThis(); // 浏览器中：Window对象 / Node中：global对象

// 1.2 隐式绑定
const obj = {
    name: 'Alice',
    greet: function() {
        console.log(`Hello, ${this.name}`);
    }
};

obj.greet(); // Hello, Alice

// 1.3 显式绑定
function introduce() {
    console.log(`I'm ${this.name}`);
}

const person = { name: 'Bob' };
introduce.call(person); // I'm Bob

// 1.4 new 绑定
function Person(name) {
    this.name = name;
}

const alice = new Person('Alice');
console.log(alice.name); // Alice

// 1.5 箭头函数（没有自己的this）
const obj2 = {
    name: 'Charlie',
    regularFunc: function() {
        console.log('Regular:', this.name); // Charlie
    },
    arrowFunc: () => {
        console.log('Arrow:', this.name); // undefined（继承外层）
    }
};

obj2.regularFunc();
obj2.arrowFunc();
```

### 2. **this 绑定优先级**
```javascript
// 优先级：new绑定 > 显式绑定 > 隐式绑定 > 默认绑定

const obj1 = { name: 'obj1' };
const obj2 = { name: 'obj2' };

function Person(name) {
    this.name = name;
}

// 1. 显式绑定
const boundPerson = Person.bind(obj1);
const instance = new boundPerson('obj3');

console.log(obj1.name); // obj1（bind被new覆盖）
console.log(instance.name); // obj3
```

## 七、异步函数进阶

### 1. **Async/Await 模式**
```javascript
// 1.1 基本用法
async function fetchUserData(userId) {
    try {
        const userResponse = await fetch(`/api/users/${userId}`);
        const user = await userResponse.json();
        
        const postsResponse = await fetch(`/api/users/${userId}/posts`);
        const posts = await postsResponse.json();
        
        return { user, posts };
    } catch (error) {
        console.error('获取用户数据失败:', error);
        throw new Error('无法加载用户数据');
    }
}

// 1.2 并行请求优化
async function fetchUserDataParallel(userId) {
    const [userResponse, postsResponse] = await Promise.all([
        fetch(`/api/users/${userId}`),
        fetch(`/api/users/${userId}/posts`)
    ]);
    
    const user = await userResponse.json();
    const posts = await postsResponse.json();
    
    return { user, posts };
}

// 1.3 错误处理模式
async function processWithRetry(operation, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            console.log(`第 ${i + 1} 次尝试失败，重试中...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
    }
}
```

### 2. **生成器与异步**
```javascript
// 2.1 使用生成器处理异步
function* asyncGenerator() {
    const result1 = yield fetchData1();
    const result2 = yield fetchData2(result1);
    return processResults(result2);
}

// 2.2 手动执行生成器
function runGenerator(generator) {
    const iterator = generator();
    
    function handle(result) {
        if (result.done) return Promise.resolve(result.value);
        
        return Promise.resolve(result.value)
            .then(res => handle(iterator.next(res)))
            .catch(err => handle(iterator.throw(err)));
    }
    
    return handle(iterator.next());
}
```

## 八、函数最佳实践

### 1. **纯函数（Pure Functions）**
```javascript
// 纯函数：相同输入 => 相同输出，无副作用
function pureAdd(a, b) {
    return a + b;
}

// 不纯的函数：有副作用
let total = 0;
function impureAdd(x) {
    total += x; // 修改了外部状态
    return total;
}
```

### 2. **函数式编程实践**
```javascript
// 2.1 避免副作用
// 不好
function addItemToCart(cart, item) {
    cart.push(item); // 修改了参数
    return cart;
}

// 好
function addItemToCart(cart, item) {
    return [...cart, item]; // 返回新数组
}

// 2.2 函数组合
const users = [
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 30 },
    { name: 'Charlie', age: 35 }
];

const getAdults = users => users.filter(user => user.age >= 18);
const getNames = users => users.map(user => user.name);
const capitalize = name => name.charAt(0).toUpperCase() + name.slice(1);

// 组合函数
const getCapitalizedAdultNames = users => 
    getNames(getAdults(users)).map(capitalize);

// 或使用管道操作符（提案阶段）
// const getCapitalizedAdultNames = users => 
//     users |> getAdults |> getNames |> map(capitalize);
```

### 3. **性能优化**
```javascript
// 3.1 函数记忆化（Memoization）
function memoize(fn) {
    const cache = new Map();
    
    return function(...args) {
        const key = JSON.stringify(args);
        
        if (cache.has(key)) {
            console.log('从缓存读取');
            return cache.get(key);
        }
        
        console.log('计算新值');
        const result = fn.apply(this, args);
        cache.set(key, result);
        return result;
    };
}

// 3.2 防抖（Debounce）
function debounce(fn, delay) {
    let timeoutId;
    
    return function(...args) {
        clearTimeout(timeoutId);
        
        timeoutId = setTimeout(() => {
            fn.apply(this, args);
        }, delay);
    };
}

// 3.3 节流（Throttle）
function throttle(fn, limit) {
    let inThrottle;
    
    return function(...args) {
        if (!inThrottle) {
            fn.apply(this, args);
            inThrottle = true;
            
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}
```

## 九、ES2022+ 新特性

### 1. **顶层 await**
```javascript
// ES2022 允许在模块顶层使用 await
const response = await fetch('https://api.example.com/data');
const data = await response.json();
console.log(data);

// 以前需要包裹在 async 函数中
(async function() {
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();
    console.log(data);
})();
```

### 2. **私有类方法**（虽然不是函数，但相关）
```javascript
class Counter {
    #count = 0; // 私有字段
    
    // 私有方法
    #increment() {
        this.#count++;
    }
    
    // 公共方法
    tick() {
        this.#increment();
        return this.#count;
    }
}
```

## 十、调试和测试

### 1. **函数调试**
```javascript
// 1.1 使用 debugger 语句
function complexCalculation(input) {
    debugger; // 在此处暂停
    
    const step1 = input * 2;
    console.log('Step 1:', step1);
    
    const step2 = Math.sqrt(step1);
    console.log('Step 2:', step2);
    
    return step2;
}

// 1.2 性能分析
function measurePerformance(fn) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    console.log(`函数执行时间: ${end - start}ms`);
    return result;
}
```

### 2. **函数测试**
```javascript
// 2.1 简单的测试框架
function test(description, testFn) {
    try {
        testFn();
        console.log(`✓ ${description}`);
    } catch (error) {
        console.error(`✗ ${description}`);
        console.error(error);
    }
}

// 2.2 测试示例
test('add 函数应该正确相加', () => {
    if (add(2, 3) !== 5) {
        throw new Error('2 + 3 应该等于 5');
    }
    
    if (add(-1, 1) !== 0) {
        throw new Error('-1 + 1 应该等于 0');
    }
});

// 2.3 使用专业测试框架（如Jest）
describe('add 函数', () => {
    test('adds 2 + 3 to equal 5', () => {
        expect(add(2, 3)).toBe(5);
    });
    
    test('adds negative numbers correctly', () => {
        expect(add(-1, 1)).toBe(0);
    });
});
```

## 总结

JavaScript 函数是语言的核心，掌握函数的不同特性对于编写高质量代码至关重要：

1. **选择合适的定义方式**：声明、表达式、箭头函数各有用处
2. **理解作用域和闭包**：这是JavaScript的独特优势
3. **掌握this的绑定规则**：避免常见的陷阱
4. **善用异步编程**：async/await让异步代码更清晰
5. **遵循函数式编程原则**：纯函数、无副作用
6. **合理使用高阶函数**：让代码更简洁、可复用

记住：函数在JavaScript中是一等公民，可以像变量一样传递和使用，这是函数式编程的基础。