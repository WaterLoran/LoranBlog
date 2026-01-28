# **JavaScript 面向对象编程全面指南**

## **一、对象的基本概念**

### **1. 对象的创建**
```javascript
// 1. 对象字面量（最常用）
const person = {
  name: 'Alice',
  age: 25,
  greet() {
    console.log(`Hello, I'm ${this.name}`);
  }
};

// 2. Object构造函数
const obj = new Object();
obj.key = 'value';

// 3. Object.create()
const prototypeObj = { greeting: 'Hello' };
const newObj = Object.create(prototypeObj);
newObj.name = 'Bob';
console.log(newObj.greeting); // 'Hello' (继承自原型)
```

### **2. 属性描述符**
```javascript
const obj = {};

Object.defineProperty(obj, 'readOnlyProp', {
  value: 42,
  writable: false,      // 不可写
  enumerable: true,     // 可枚举
  configurable: false   // 不可配置（不能删除，不能修改描述符）
});

console.log(obj.readOnlyProp); // 42
obj.readOnlyProp = 100;        // 静默失败（严格模式会报错）
console.log(obj.readOnlyProp); // 42

// 一次性定义多个属性
Object.defineProperties(obj, {
  prop1: { value: 'a', enumerable: true },
  prop2: { value: 'b', enumerable: false }
});
```

## **二、构造函数模式**

### **1. 基本构造函数**
```javascript
function Person(name, age) {
  // 实例属性
  this.name = name;
  this.age = age;
  
  // 实例方法（每个实例都会创建新函数，浪费内存）
  this.greet = function() {
    console.log(`Hello, I'm ${this.name}`);
  };
}

const alice = new Person('Alice', 25);
const bob = new Person('Bob', 30);

console.log(alice.greet === bob.greet); // false（不同的函数实例）
```

### **2. 构造函数原理**
```javascript
// new 关键字的作用
function myNew(constructor, ...args) {
  // 1. 创建新对象，原型指向构造函数的prototype
  const obj = Object.create(constructor.prototype);
  
  // 2. 执行构造函数，绑定this到新对象
  const result = constructor.apply(obj, args);
  
  // 3. 如果构造函数返回对象，则使用该对象；否则返回新对象
  return result instanceof Object ? result : obj;
}

// 测试
const person = myNew(Person, 'Alice', 25);
```

## **三、原型和原型链**

### **1. 原型对象**
```javascript
function Person(name) {
  this.name = name;
}

// 将方法添加到原型上，所有实例共享
Person.prototype.greet = function() {
  console.log(`Hello, I'm ${this.name}`);
};

Person.prototype.species = 'Human';

const alice = new Person('Alice');
const bob = new Person('Bob');

console.log(alice.greet === bob.greet); // true（共享同一个函数）

// 原型链
console.log(alice.__proto__ === Person.prototype); // true
console.log(Person.prototype.__proto__ === Object.prototype); // true
console.log(Object.prototype.__proto__); // null
```

### **2. 原型链继承**
```javascript
function Animal(name) {
  this.name = name;
}

Animal.prototype.eat = function() {
  console.log(`${this.name} is eating`);
};

function Dog(name, breed) {
  // 调用父类构造函数
  Animal.call(this, name);
  this.breed = breed;
}

// 设置原型链
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog; // 修复constructor指向

Dog.prototype.bark = function() {
  console.log(`${this.name} is barking`);
};

const myDog = new Dog('Buddy', 'Golden Retriever');
myDog.eat();  // 继承自Animal
myDog.bark(); // Dog自己的方法
```

## **四、ES6 Class 语法**

### **1. 基本类定义**
```javascript
class Person {
  // 构造函数
  constructor(name, age) {
    // 实例属性
    this.name = name;
    this.age = age;
  }
  
  // 实例方法（添加到原型）
  greet() {
    console.log(`Hello, I'm ${this.name}`);
  }
  
  // 静态方法（类方法）
  static compareAge(a, b) {
    return a.age - b.age;
  }
  
  // Getter
  get description() {
    return `${this.name} is ${this.age} years old`;
  }
  
  // Setter
  set nickname(value) {
    this._nickname = value;
  }
  
  get nickname() {
    return this._nickname || this.name;
  }
}

const alice = new Person('Alice', 25);
alice.greet(); // Hello, I'm Alice
console.log(alice.description); // Alice is 25 years old

// 静态方法通过类调用
console.log(Person.compareAge(alice, new Person('Bob', 30)));
```

### **2. 类继承**
```javascript
class Animal {
  constructor(name) {
    this.name = name;
  }
  
  eat() {
    console.log(`${this.name} is eating`);
  }
  
  // 私有方法（约定，非真正私有）
  _internalMethod() {
    // 内部逻辑
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name); // 必须调用super
    this.breed = breed;
  }
  
  bark() {
    console.log(`${this.name} is barking`);
  }
  
  // 重写父类方法
  eat() {
    super.eat(); // 调用父类方法
    console.log(`${this.name} eats like a dog`);
  }
}

const myDog = new Dog('Buddy', 'Golden');
myDog.eat(); // 先执行父类eat，再执行子类新增逻辑
```

## **五、封装与私有成员**

### **1. 传统方式（约定）**
```javascript
class BankAccount {
  constructor(balance) {
    this._balance = balance; // _表示私有（约定）
  }
  
  deposit(amount) {
    this._balance += amount;
  }
  
  getBalance() {
    return this._balance;
  }
}

// 但外部仍然可以访问 _balance
const account = new BankAccount(100);
account._balance = 1000; // 不应该这样，但可以做到
```

### **2. 闭包实现真正私有**
```javascript
function BankAccount(balance) {
  // 私有变量
  let _balance = balance;
  let _transactionHistory = [];
  
  // 公共方法（特权方法）
  this.deposit = function(amount) {
    _balance += amount;
    _transactionHistory.push({ type: 'deposit', amount });
  };
  
  this.getBalance = function() {
    return _balance;
  };
  
  this.getHistory = function() {
    return [..._transactionHistory]; // 返回副本
  };
}

// 无法从外部访问 _balance 和 _transactionHistory
```

### **3. ES2022 私有字段**
```javascript
class BankAccount {
  // 私有字段（以#开头）
  #balance;
  #transactionHistory = [];
  
  constructor(balance) {
    this.#balance = balance;
  }
  
  deposit(amount) {
    this.#balance += amount;
    this.#transactionHistory.push({ type: 'deposit', amount });
  }
  
  getBalance() {
    return this.#balance;
  }
  
  // 静态私有字段
  static #bankCode = 'ABC123';
  
  static getBankCode() {
    return this.#bankCode;
  }
}

const account = new BankAccount(100);
// account.#balance = 1000; // 语法错误
console.log(account.getBalance()); // 100
```

## **六、多态**

```javascript
class Shape {
  area() {
    throw new Error('子类必须实现area方法');
  }
}

class Circle extends Shape {
  constructor(radius) {
    super();
    this.radius = radius;
  }
  
  area() {
    return Math.PI * this.radius ** 2;
  }
}

class Rectangle extends Shape {
  constructor(width, height) {
    super();
    this.width = width;
    this.height = height;
  }
  
  area() {
    return this.width * this.height;
  }
}

// 多态：不同对象调用相同方法，表现不同
function printArea(shape) {
  console.log(`面积: ${shape.area()}`);
}

const circle = new Circle(5);
const rect = new Rectangle(4, 6);

printArea(circle); // 78.53981633974483
printArea(rect);   // 24
```

## **七、组合 vs 继承**

### **1. 继承的问题**
```javascript
// 经典的继承问题：橡皮鸭问题
class Bird {
  fly() {
    console.log('Flying');
  }
  
  eat() {
    console.log('Eating');
  }
}

class Duck extends Bird {
  quack() {
    console.log('Quack');
  }
}

class Penguin extends Bird {
  // 企鹅不会飞！但继承了fly方法
  fly() {
    throw new Error('Penguins cannot fly!');
  }
}
```

### **2. 组合模式**
```javascript
// 定义可复用的行为
const canFly = {
  fly() {
    console.log('Flying');
  }
};

const canSwim = {
  swim() {
    console.log('Swimming');
  }
};

const canQuack = {
  quack() {
    console.log('Quack');
  }
};

// 组合对象
class Duck {
  constructor() {
    Object.assign(this, canFly, canSwim, canQuack);
  }
  
  eat() {
    console.log('Eating');
  }
}

class Penguin {
  constructor() {
    Object.assign(this, canSwim);
  }
  
  eat() {
    console.log('Eating');
  }
}

const duck = new Duck();
duck.fly();  // Flying
duck.swim(); // Swimming

const penguin = new Penguin();
penguin.swim(); // Swimming
// penguin.fly(); // 错误：没有fly方法
```

### **3. 函数式组合**
```javascript
// 使用高阶函数组合行为
const withFlying = (obj) => ({
  ...obj,
  fly() {
    console.log(`${obj.name} is flying`);
    return this;
  }
});

const withSwimming = (obj) => ({
  ...obj,
  swim() {
    console.log(`${obj.name} is swimming`);
    return this;
  }
});

// 创建对象
const createBird = (name) => ({ name });

const duck = withFlying(withSwimming(createBird('Duck')));
duck.fly().swim();

// 或者使用管道
const pipe = (...fns) => (x) => fns.reduce((v, f) => f(v), x);

const createDuck = pipe(
  createBird,
  withFlying,
  withSwimming
);

const duck2 = createDuck('Donald');
duck2.fly();
```

## **八、设计模式示例**

### **1. 工厂模式**
```javascript
class Car {
  constructor(make, model, year) {
    this.make = make;
    this.model = model;
    this.year = year;
  }
  
  getInfo() {
    return `${this.year} ${this.make} ${this.model}`;
  }
}

class CarFactory {
  createCar(type) {
    switch(type) {
      case 'sedan':
        return new Car('Toyota', 'Camry', 2023);
      case 'suv':
        return new Car('Honda', 'CR-V', 2023);
      case 'truck':
        return new Car('Ford', 'F-150', 2023);
      default:
        throw new Error('未知的汽车类型');
    }
  }
}

const factory = new CarFactory();
const myCar = factory.createCar('suv');
console.log(myCar.getInfo()); // 2023 Honda CR-V
```

### **2. 单例模式**
```javascript
class Logger {
  constructor() {
    if (Logger.instance) {
      return Logger.instance;
    }
    
    this.logs = [];
    Logger.instance = this;
  }
  
  log(message) {
    const timestamp = new Date().toISOString();
    this.logs.push({ message, timestamp });
    console.log(`[${timestamp}] ${message}`);
  }
  
  getLogs() {
    return [...this.logs];
  }
}

// 测试单例
const logger1 = new Logger();
const logger2 = new Logger();

logger1.log('第一条日志');
logger2.log('第二条日志');

console.log(logger1 === logger2); // true
console.log(logger1.getLogs()); // 包含两条日志
```

### **3. 观察者模式**
```javascript
class EventEmitter {
  constructor() {
    this.events = {};
  }
  
  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }
  
  off(event, listener) {
    if (!this.events[event]) return;
    
    const index = this.events[event].indexOf(listener);
    if (index > -1) {
      this.events[event].splice(index, 1);
    }
  }
  
  emit(event, ...args) {
    if (!this.events[event]) return;
    
    this.events[event].forEach(listener => {
      listener.apply(this, args);
    });
  }
}

// 使用
const emitter = new EventEmitter();

const logMessage = (msg) => console.log(`收到消息: ${msg}`);

emitter.on('message', logMessage);
emitter.emit('message', 'Hello World'); // 收到消息: Hello World
emitter.off('message', logMessage);
```

## **九、现代 JavaScript OOP 特性**

### **1. 属性简写和方法简写**
```javascript
const name = 'Alice';
const age = 25;

// ES6+ 对象字面量增强
const person = {
  // 属性简写
  name,
  age,
  
  // 方法简写
  greet() {
    console.log(`Hello, I'm ${this.name}`);
  },
  
  // 计算属性名
  ['prop_' + name]: 'value'
};
```

### **2. 解构赋值**
```javascript
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  
  // 返回数组，便于解构
  toArray() {
    return [this.x, this.y];
  }
  
  // 返回对象，便于解构
  toObject() {
    return { x: this.x, y: this.y };
  }
}

const point = new Point(10, 20);

// 数组解构
const [x, y] = point.toArray();

// 对象解构
const { x: coordX, y: coordY } = point.toObject();

// 参数解构
function drawPoint({ x, y }) {
  console.log(`绘制点(${x}, ${y})`);
}

drawPoint(point.toObject());
```

### **3. 迭代器和生成器**
```javascript
class Range {
  constructor(start, end, step = 1) {
    this.start = start;
    this.end = end;
    this.step = step;
  }
  
  // 使类可迭代
  *[Symbol.iterator]() {
    for (let i = this.start; i <= this.end; i += this.step) {
      yield i;
    }
  }
  
  // 生成器方法
  *filter(predicate) {
    for (const value of this) {
      if (predicate(value)) {
        yield value;
      }
    }
  }
}

const range = new Range(1, 10);

// 使用for...of迭代
for (const num of range) {
  console.log(num); // 1, 2, 3, ..., 10
}

// 使用扩展运算符
const numbers = [...range]; // [1, 2, 3, ..., 10]

// 使用生成器方法
const evens = [...range.filter(n => n % 2 === 0)]; // [2, 4, 6, 8, 10]
```

## **十、TypeScript 中的 OOP**

```typescript
// 1. 类与接口
interface Animal {
  name: string;
  age: number;
  makeSound(): void;
}

class Dog implements Animal {
  constructor(
    public name: string,
    public age: number,
    public breed: string
  ) {}
  
  makeSound(): void {
    console.log('Woof!');
  }
  
  fetch(): void {
    console.log(`${this.name} is fetching`);
  }
}

// 2. 访问修饰符
class Person {
  // 公共属性（默认）
  public name: string;
  
  // 私有属性
  private ssn: string;
  
  // 受保护属性（子类可访问）
  protected age: number;
  
  // 只读属性
  readonly id: number;
  
  constructor(name: string, ssn: string, age: number, id: number) {
    this.name = name;
    this.ssn = ssn;
    this.age = age;
    this.id = id;
  }
  
  // 抽象类
  abstract class Shape {
    abstract area(): number;
    
    printArea(): void {
      console.log(`面积: ${this.area()}`);
    }
  }
}
```

## **十一、最佳实践**

### **1. SOLID 原则在 JavaScript 中的应用**
```javascript
// S: 单一职责原则
// 坏例子
class User {
  constructor(name, email) {
    this.name = name;
    this.email = email;
  }
  
  saveToDatabase() {
    // 保存到数据库
  }
  
  sendEmail() {
    // 发送邮件
  }
}

// 好例子
class User {
  constructor(name, email) {
    this.name = name;
    this.email = email;
  }
}

class UserRepository {
  save(user) {
    // 保存到数据库
  }
}

class EmailService {
  send(user, message) {
    // 发送邮件
  }
}

// O: 开闭原则 - 对扩展开放，对修改关闭
// 使用策略模式
class PaymentProcessor {
  process(paymentMethod) {
    paymentMethod.pay();
  }
}

class CreditCardPayment {
  pay() {
    console.log('信用卡支付');
  }
}

class PayPalPayment {
  pay() {
    console.log('PayPal支付');
  }
}
```

### **2. 内存管理与性能**
```javascript
// 1. 避免在构造函数中创建函数
// 坏例子
function BadPerson(name) {
  this.name = name;
  this.greet = function() {  // 每个实例都会创建新函数
    console.log(`Hello, ${this.name}`);
  };
}

// 好例子
function GoodPerson(name) {
  this.name = name;
}

GoodPerson.prototype.greet = function() {  // 所有实例共享
  console.log(`Hello, ${this.name}`);
};

// 2. 使用对象池
class ObjectPool {
  constructor(createFn) {
    this.createFn = createFn;
    this.pool = [];
  }
  
  acquire() {
    return this.pool.length > 0 ? this.pool.pop() : this.createFn();
  }
  
  release(obj) {
    this.pool.push(obj);
  }
}

// 3. 避免内存泄漏
class LeakyClass {
  constructor() {
    // 移除事件监听器
    window.addEventListener('resize', this.handleResize);
  }
  
  handleResize = () => {
    console.log('resized');
  };
  
  // 添加清理方法
  destroy() {
    window.removeEventListener('resize', this.handleResize);
  }
}
```

## **总结**

JavaScript 的面向对象编程有以下关键点：

1. **原型链是核心**：理解 `__proto__`、`prototype` 和原型链的机制
2. **ES6 Class 是语法糖**：底层还是基于原型链的实现
3. **多种继承方式**：原型链继承、构造函数继承、组合继承、ES6类继承
4. **封装有多种方案**：从约定私有（_property）到真正的私有字段（#property）
5. **组合优于继承**：考虑使用组合模式来提高代码的灵活性
6. **设计模式**：在 JavaScript 中实现常见的设计模式
7. **现代特性**：合理使用解构、迭代器、生成器等现代特性
8. **关注性能**：注意内存管理和性能优化

JavaScript 的 OOP 既灵活又强大，但也需要深入理解其原理，才能写出高效、可维护的代码。