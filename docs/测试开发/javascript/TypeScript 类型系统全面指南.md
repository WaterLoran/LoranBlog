# **TypeScript 类型系统全面指南**

TypeScript 的类型系统是它的核心特性，提供了强大的静态类型检查能力。

## **一、基础类型**

### **1. 原始类型**
```typescript
// 基本类型
let isDone: boolean = false;
let count: number = 42;
let name: string = "TypeScript";
let bigInt: bigint = 100n;

// 特殊类型
let nothing: null = null;
let notDefined: undefined = undefined;
let symbolValue: symbol = Symbol("unique");

// any - 关闭类型检查（慎用）
let anything: any = "可以是任何类型";
anything = 123;
anything = true;

// unknown - 类型安全的any
let unknownValue: unknown = "Hello";
// unknownValue.toUpperCase(); // 错误：需要先进行类型检查
if (typeof unknownValue === "string") {
  unknownValue.toUpperCase(); // 正确：已经确认是string
}

// void - 没有返回值
function logMessage(): void {
  console.log("Hello");
}

// never - 永不返回（总是抛出异常或死循环）
function throwError(message: string): never {
  throw new Error(message);
}

function infiniteLoop(): never {
  while (true) {}
}
```

### **2. 数组和元组**
```typescript
// 数组
let numbers: number[] = [1, 2, 3];
let strings: Array<string> = ["a", "b", "c"]; // 泛型语法

// 只读数组
const readonlyArray: readonly number[] = [1, 2, 3];
// readonlyArray.push(4); // 错误：push不存在

// 元组 - 固定长度和类型的数组
let tuple: [string, number, boolean] = ["Alice", 25, true];
tuple[0] = "Bob"; // 正确
// tuple[0] = 123; // 错误：必须是string

// 可选元素元组
let optionalTuple: [string, number?] = ["hello"];
optionalTuple = ["world", 42]; // 也可以有两个元素

// 带标签的元组（TypeScript 4.0+）
let labeledTuple: [name: string, age: number] = ["Alice", 25];
```

## **二、类型声明与推断**

### **1. 类型注解**
```typescript
// 变量类型注解
let username: string = "Alice";

// 函数参数和返回值类型
function add(x: number, y: number): number {
  return x + y;
}

// 对象类型注解
let user: { name: string; age: number } = {
  name: "Alice",
  age: 25
};

// 可选属性
let config: { width?: number; height?: number } = {
  width: 100
};

// 只读属性
let point: { readonly x: number; readonly y: number } = {
  x: 10,
  y: 20
};
// point.x = 30; // 错误：只读属性
```

### **2. 类型推断**
```typescript
// 基本类型推断
let x = 3;            // 推断为 number
let y = "hello";      // 推断为 string
let z = true;         // 推断为 boolean

// 上下文类型推断（根据使用场景）
window.onmousedown = function(event) {
  // event 被推断为 MouseEvent
  console.log(event.button);
};

// 最佳通用类型推断
let arr = [0, 1, null];  // 推断为 (number | null)[]

// 函数返回值推断
function multiply(a: number, b: number) {
  return a * b;  // 推断返回值为 number
}

// 解构推断
const obj = { a: 1, b: "hello" };
const { a, b } = obj;  // a: number, b: string
```

## **三、接口与类型别名**

### **1. 接口 (Interface)**
```typescript
// 基本接口
interface Person {
  name: string;
  age: number;
  email?: string;  // 可选属性
  readonly id: number;  // 只读属性
}

// 使用接口
const alice: Person = {
  name: "Alice",
  age: 25,
  id: 12345
};

// 函数类型接口
interface SearchFunc {
  (source: string, subString: string): boolean;
}

const mySearch: SearchFunc = function(src, sub) {
  return src.search(sub) > -1;
};

// 可索引类型接口
interface StringArray {
  [index: number]: string;
}

const myArray: StringArray = ["Bob", "Fred"];

// 类类型接口（描述类的结构）
interface ClockInterface {
  currentTime: Date;
  setTime(d: Date): void;
}

class Clock implements ClockInterface {
  currentTime: Date = new Date();
  setTime(d: Date) {
    this.currentTime = d;
  }
}

// 接口继承
interface Animal {
  name: string;
}

interface Dog extends Animal {
  breed: string;
  bark(): void;
}

const myDog: Dog = {
  name: "Buddy",
  breed: "Golden Retriever",
  bark() {
    console.log("Woof!");
  }
};

// 接口合并（同名接口会自动合并）
interface Box {
  height: number;
}

interface Box {
  width: number;
}

const box: Box = { height: 10, width: 20 };
```

### **2. 类型别名 (Type Aliases)**
```typescript
// 基本类型别名
type UserID = string | number;

// 对象类型
type Point = {
  x: number;
  y: number;
};

// 函数类型
type Greeting = (name: string) => string;

// 联合类型
type Status = "pending" | "success" | "error";

// 交叉类型（合并多个类型）
type Person = {
  name: string;
  age: number;
};

type Employee = {
  employeeId: number;
  department: string;
};

type Staff = Person & Employee;  // 必须同时满足Person和Employee

const staff: Staff = {
  name: "Alice",
  age: 30,
  employeeId: 123,
  department: "IT"
};

// 模板字面量类型
type EventName<T extends string> = `${T}Changed`;
type MouseEvent = EventName<"mouse">;  // "mouseChanged"
```

### **3. 接口 vs 类型别名**
| 特性     | 接口 (interface)            | 类型别名 (type)      |
| -------- | --------------------------- | -------------------- |
| 扩展方式 | 使用 `extends`              | 使用 `&`（交叉类型） |
| 合并     | 支持声明合并                | 不支持合并           |
| 实现     | 可以被类实现 (`implements`) | 不能直接被类实现     |
| 描述类型 | 主要用于对象类型            | 可用于任意类型       |
| 性能     | 更好                        | 稍差                 |

```typescript
// 通常建议：
// 1. 定义对象类型优先使用 interface
// 2. 定义联合类型、元组类型使用 type
// 3. 需要使用扩展时考虑 interface 的合并特性
```

## **四、高级类型**

### **1. 联合类型与类型守卫**
```typescript
// 联合类型
type ID = string | number;

function printID(id: ID) {
  if (typeof id === "string") {
    // 这里 id 是 string 类型
    console.log(id.toUpperCase());
  } else {
    // 这里 id 是 number 类型
    console.log(id.toFixed(2));
  }
}

// 类型守卫函数
function isString(value: unknown): value is string {
  return typeof value === "string";
}

function processValue(value: string | number) {
  if (isString(value)) {
    // TypeScript 知道 value 是 string
    return value.length;
  }
  // TypeScript 知道 value 是 number
  return value.toFixed(2);
}

// in 操作符类型守卫
interface Fish {
  swim(): void;
}

interface Bird {
  fly(): void;
}

function move(pet: Fish | Bird) {
  if ("swim" in pet) {
    pet.swim();  // pet 是 Fish
  } else {
    pet.fly();   // pet 是 Bird
  }
}

// instanceof 类型守卫
class Car {
  drive() {
    console.log("Driving a car");
  }
}

class Truck {
  load() {
    console.log("Loading a truck");
  }
}

type Vehicle = Car | Truck;

function useVehicle(vehicle: Vehicle) {
  if (vehicle instanceof Car) {
    vehicle.drive();
  } else {
    vehicle.load();
  }
}
```

### **2. 字面量类型**
```typescript
// 字符串字面量类型
type Direction = "north" | "south" | "east" | "west";
let direction: Direction = "north";
// direction = "up"; // 错误：只能是四个方向之一

// 数字字面量类型
type Dice = 1 | 2 | 3 | 4 | 5 | 6;
let diceRoll: Dice = 3;

// 布尔字面量类型
type True = true;
let alwaysTrue: True = true;

// 对象字面量类型
type Config = {
  protocol: "http" | "https";
  port: 80 | 443;
};

const config: Config = {
  protocol: "https",
  port: 443
};
```

### **3. 条件类型**
```typescript
// 基本条件类型
type IsString<T> = T extends string ? true : false;

type A = IsString<string>;  // true
type B = IsString<number>;  // false

// 条件类型与 infer 关键字
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;

function getString() {
  return "hello";
}

type StringReturn = ReturnType<typeof getString>; // string

// 分布式条件类型
type ToArray<T> = T extends any ? T[] : never;

type StrArrOrNumArr = ToArray<string | number>; // string[] | number[]
// 注意：不是 (string | number)[]

// 从联合类型中排除某些类型
type Exclude<T, U> = T extends U ? never : T;
type T1 = Exclude<"a" | "b" | "c", "a">; // "b" | "c"

// 从联合类型中提取某些类型
type Extract<T, U> = T extends U ? T : never;
type T2 = Extract<"a" | "b" | "c", "a" | "d">; // "a"
```

### **4. 映射类型**
```typescript
// 基本映射类型
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

type Partial<T> = {
  [P in keyof T]?: T[P];
};

type Required<T> = {
  [P in keyof T]-?: T[P];  // -? 表示移除可选
};

// 示例
interface User {
  name?: string;
  age?: number;
}

type ReadonlyUser = Readonly<User>;
// { readonly name?: string; readonly age?: number; }

type RequiredUser = Required<User>;
// { name: string; age: number; }

// 键重映射 (TypeScript 4.1+)
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Person {
  name: string;
  age: number;
}

type PersonGetters = Getters<Person>;
// { getName: () => string; getAge: () => number; }
```

### **5. 模板字面量类型**
```typescript
// 基本模板字面量类型
type EventName = "click" | "scroll" | "mousemove";
type HandlerName = `on${Capitalize<EventName>}`;
// "onClick" | "onScroll" | "onMousemove"

// 字符串处理工具类型
type T1 = Uppercase<"hello">;  // "HELLO"
type T2 = Lowercase<"HELLO">;  // "hello"
type T3 = Capitalize<"hello">; // "Hello"
type T4 = Uncapitalize<"Hello">; // "hello"

// 复杂的模板字面量类型
type PropEventSource<T> = {
  on<K extends string & keyof T>(
    eventName: `${K}Changed`,
    callback: (newValue: T[K]) => void
  ): void;
};

declare function makeWatchedObject<T>(obj: T): T & PropEventSource<T>;

const person = makeWatchedObject({
  firstName: "Alice",
  age: 30
});

person.on("firstNameChanged", (newName) => {
  // newName 是 string 类型
});

person.on("ageChanged", (newAge) => {
  // newAge 是 number 类型
});
```

## **五、泛型**

### **1. 泛型基础**
```typescript
// 泛型函数
function identity<T>(arg: T): T {
  return arg;
}

const output = identity<string>("myString");  // 显式指定类型
const output2 = identity("myString");         // 类型推断

// 泛型接口
interface GenericIdentityFn<T> {
  (arg: T): T;
}

const myIdentity: GenericIdentityFn<number> = identity;

// 泛型类
class GenericNumber<T> {
  zeroValue: T;
  add: (x: T, y: T) => T;
  
  constructor(zeroValue: T, add: (x: T, y: T) => T) {
    this.zeroValue = zeroValue;
    this.add = add;
  }
}

const myNumber = new GenericNumber<number>(0, (x, y) => x + y);
```

### **2. 泛型约束**
```typescript
// 使用 extends 约束泛型
interface Lengthwise {
  length: number;
}

function loggingIdentity<T extends Lengthwise>(arg: T): T {
  console.log(arg.length);
  return arg;
}

loggingIdentity([1, 2, 3]);      // 正确：数组有length属性
loggingIdentity("hello");         // 正确：字符串有length属性
// loggingIdentity(123);         // 错误：数字没有length属性

// 在泛型约束中使用类型参数
function getProperty<T, K extends keyof T>(obj: T, key: K) {
  return obj[key];
}

const person = { name: "Alice", age: 25 };
getProperty(person, "name");  // 正确
// getProperty(person, "email");  // 错误："email"不是person的属性

// 使用类类型
function create<T>(c: { new(): T }): T {
  return new c();
}

class Person {
  name = "Alice";
}

const personInstance = create(Person);
```

### **3. 泛型默认值**
```typescript
interface ApiResponse<T = any> {
  data: T;
  status: number;
}

// 使用默认类型
const response1: ApiResponse = {
  data: { id: 1 },
  status: 200
};

// 指定具体类型
const response2: ApiResponse<string> = {
  data: "success",
  status: 200
};

// 多个类型参数带默认值
function merge<T = object, U = object>(obj1: T, obj2: U): T & U {
  return { ...obj1, ...obj2 };
}
```

## **六、内置工具类型**

### **1. 常用工具类型**
```typescript
// Partial<T> - 所有属性变为可选
interface Todo {
  title: string;
  description: string;
}

type PartialTodo = Partial<Todo>;
// { title?: string; description?: string }

// Readonly<T> - 所有属性变为只读
type ReadonlyTodo = Readonly<Todo>;

// Record<K, T> - 构造对象类型
type PageInfo = {
  title: string;
};

type Page = "home" | "about" | "contact";

const pages: Record<Page, PageInfo> = {
  home: { title: "Home" },
  about: { title: "About" },
  contact: { title: "Contact" }
};

// Pick<T, K> - 选择部分属性
type TodoPreview = Pick<Todo, "title">;
// { title: string }

// Omit<T, K> - 排除部分属性
type TodoWithoutDescription = Omit<Todo, "description">;
// { title: string }

// Exclude<T, U> - 从T中排除可赋值给U的类型
type T0 = Exclude<"a" | "b" | "c", "a">; // "b" | "c"
type T1 = Exclude<string | number | (() => void), Function>; // string | number

// Extract<T, U> - 从T中提取可赋值给U的类型
type T2 = Extract<"a" | "b" | "c", "a" | "f">; // "a"

// NonNullable<T> - 排除null和undefined
type T3 = NonNullable<string | number | undefined>; // string | number
```

### **2. 函数相关工具类型**
```typescript
// ReturnType<T> - 获取函数返回值类型
function getUser() {
  return { name: "Alice", age: 25 };
}

type User = ReturnType<typeof getUser>;
// { name: string; age: number }

// Parameters<T> - 获取函数参数类型
type T0 = Parameters<(s: string) => void>; // [string]

// ConstructorParameters<T> - 获取构造函数参数类型
type T1 = ConstructorParameters<ErrorConstructor>; // [string?]

// InstanceType<T> - 获取实例类型
type T2 = InstanceType<ErrorConstructor>; // Error
```

## **七、类型操作**

### **1. keyof 和 typeof**
```typescript
// keyof - 获取对象类型的键的联合类型
interface Person {
  name: string;
  age: number;
  location: string;
}

type K1 = keyof Person; // "name" | "age" | "location"
type K2 = keyof Person[]; // "length" | "push" | "pop" | ...
type K3 = keyof { [x: string]: Person }; // string | number

// typeof - 获取变量或属性的类型
const person = { name: "Alice", age: 25 };
type PersonType = typeof person;
// { name: string; age: number }

// 结合使用
const colors = {
  red: "#ff0000",
  green: "#00ff00",
  blue: "#0000ff"
};

type Colors = keyof typeof colors; // "red" | "green" | "blue"
```

### **2. 索引访问类型**
```typescript
interface Person {
  name: string;
  age: number;
  address: {
    street: string;
    city: string;
  };
}

// 访问属性类型
type NameType = Person["name"]; // string
type AgeType = Person["age"];   // number

// 访问嵌套属性
type AddressType = Person["address"]; // { street: string; city: string }
type CityType = Person["address"]["city"]; // string

// 使用联合类型访问
type NameOrAge = Person["name" | "age"]; // string | number

// 使用keyof访问所有属性类型
type PersonValues = Person[keyof Person]; // string | number | { street: string; city: string }
```

### **3. 条件类型中的 infer**
```typescript
// 提取数组元素类型
type ElementType<T> = T extends (infer U)[] ? U : never;

type StrArray = string[];
type StrElement = ElementType<StrArray>; // string

type NumArray = number[];
type NumElement = ElementType<NumArray>; // number

// 提取Promise的返回值类型
type PromiseType<T> = T extends Promise<infer U> ? U : never;

type StringPromise = Promise<string>;
type StringValue = PromiseType<StringPromise>; // string

// 提取函数返回值类型
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;

// 提取函数参数类型
type Parameters<T> = T extends (...args: infer P) => any ? P : never;
```

## **八、类型声明与模块**

### **1. 声明文件 (.d.ts)**
```typescript
// 声明全局变量
declare const VERSION: string;
declare function greet(name: string): void;

// 声明全局类型
declare global {
  interface Window {
    myCustomProperty: string;
  }
}

// 声明模块
declare module "my-module" {
  export const value: number;
  export function doSomething(): void;
}

// 声明命名空间
declare namespace MyLibrary {
  interface Config {
    apiUrl: string;
  }
  
  function initialize(config: Config): void;
}
```

### **2. 环境声明**
```typescript
// 三斜线指令引用其他声明文件
/// <reference types="node" />
/// <reference path="./my-types.d.ts" />

// 使用 DefinitelyTyped 的类型定义
// npm install --save-dev @types/node
// npm install --save-dev @types/lodash
```

## **九、最佳实践**

### **1. 类型安全实践**
```typescript
// 1. 优先使用 interface 定义对象类型
interface User {
  id: number;
  name: string;
}

// 2. 使用类型别名处理复杂类型
type UserMap = Map<string, User>;

// 3. 避免使用 any，优先使用 unknown
function safeParse(json: string): unknown {
  return JSON.parse(json);
}

// 4. 使用类型守卫
function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value
  );
}

// 5. 使用 const 断言
const colors = ["red", "green", "blue"] as const;
// type: readonly ["red", "green", "blue"]
```

### **2. 性能优化**
```typescript
// 使用索引签名避免过度的类型检查
interface StringMap {
  [key: string]: string;
}

// 使用条件类型和映射类型优化复杂类型
type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

// 避免深度嵌套的条件类型（可能导致性能问题）
```

## **总结**

TypeScript 的类型系统提供了：

1. **静态类型检查**：编译时发现错误
2. **类型推断**：减少类型注解的冗余
3. **类型安全**：防止运行时类型错误
4. **代码智能提示**：提升开发效率
5. **重构安全**：大规模重构时保持类型安全
6. **文档化**：类型定义本身就是文档

掌握 TypeScript 的类型系统是编写高质量、可维护 TypeScript 代码的关键。通过合理使用类型系统，可以显著提高代码的可靠性和开发效率。