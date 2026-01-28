# **JavaScript 变量全面指南**

## **一、变量声明方式**

### **1. 三种声明关键字**

```javascript
// 1. var (ES5)
var name = "Alice";  // 函数作用域，存在变量提升

// 2. let (ES6)
let age = 25;        // 块级作用域，无变量提升

// 3. const (ES6)
const PI = 3.14159;  // 块级作用域，声明时必须初始化，不能重新赋值
```

### **2. 声明区别对比**

| 特性                       | var                            | let                       | const                     |
| -------------------------- | ------------------------------ | ------------------------- | ------------------------- |
| 作用域                     | 函数作用域                     | 块级作用域                | 块级作用域                |
| 变量提升                   | 是（提升并初始化为 undefined） | 是（提升但不初始化，TDZ） | 是（提升但不初始化，TDZ） |
| 重复声明                   | 允许                           | 不允许                    | 不允许                    |
| 全局声明时成为 window 属性 | 是                             | 否                        | 否                        |
| 必须初始化                 | 否                             | 否                        | 是                        |

## **二、作用域详解**

### **1. 函数作用域 (var)**
```javascript
function testVar() {
  if (true) {
    var x = 10;  // var 是函数作用域
    var y = 20;  // 可以重复声明
    var y = 30;  // 不报错
  }
  console.log(x); // 10 (在if块外可以访问)
}
testVar();
console.log(typeof x); // undefined (函数外不能访问)

// 变量提升示例
console.log(a); // undefined (不会报错，var会提升)
var a = 5;
// 实际执行顺序：
// var a;          // 提升声明
// console.log(a); // undefined
// a = 5;          // 赋值
```

### **2. 块级作用域 (let/const)**
```javascript
function testLet() {
  if (true) {
    let x = 10;
    const y = 20;
    // let x = 30; // 报错：不能重复声明
    // y = 30;     // 报错：const不能重新赋值
  }
  // console.log(x); // 报错：x未定义（块级作用域）
}

// 块级作用域示例
{
  let blockScoped = "inside block";
  const BLOCK_CONST = "constant";
}
// console.log(blockScoped); // 报错
```

### **3. 暂时性死区 (TDZ)**
```javascript
// 变量在声明前不能访问（let/const）
// console.log(tdzVar); // 报错：Cannot access before initialization
let tdzVar = "I'm in TDZ until here";

// 对比 var
console.log(noTdzVar); // undefined (不会报错)
var noTdzVar = "I'm hoisted";
```

## **三、变量命名规则与最佳实践**

### **1. 命名规则**
```javascript
// 合法命名
let userName;      // 驼峰命名法（变量、函数）
let user_name;     // 蛇形命名法
let $price;        // 允许$开头
let _private;      // 允许_开头
let name123;       // 允许数字（不能开头）
let имя;           // Unicode字符

// 非法命名
// let 123name;    // 数字不能开头
// let user-name;  // 连字符不允许
// let let;        // 关键字不能作为变量名

// 保留关键字
// break, case, catch, class, const, continue, ...
```

### **2. 命名约定**
```javascript
// 常量：全大写，下划线分隔
const MAX_SIZE = 100;
const API_BASE_URL = "https://api.example.com";

// 私有变量：下划线开头（约定）
let _internalCounter = 0;

// 构造函数/类：帕斯卡命名法
class UserAccount {}
function DatabaseConnection() {}

// 布尔值：以is, has, can等开头
let isLoading = true;
let hasPermission = false;
let canEdit = true;
```

## **四、变量赋值与操作**

### **1. 基本赋值**
```javascript
// 简单赋值
let a = 10;
let b = a;  // 值传递（基本类型）

a = 20;
console.log(a, b); // 20, 10

// 引用类型赋值
let obj1 = { name: "Alice" };
let obj2 = obj1;  // 引用传递

obj2.name = "Bob";
console.log(obj1.name); // "Bob" (两者引用同一对象)
```

### **2. 复合赋值**
```javascript
let x = 10;

x += 5;   // x = x + 5 → 15
x -= 3;   // x = x - 3 → 12
x *= 2;   // x = x * 2 → 24
x /= 4;   // x = x / 4 → 6
x %= 4;   // x = x % 4 → 2
x **= 3;  // x = x ** 3 → 8

// 字符串拼接
let str = "Hello";
str += " World"; // "Hello World"
```

### **3. 解构赋值**
```javascript
// 数组解构
let [first, second, ...rest] = [1, 2, 3, 4, 5];
console.log(first, second, rest); // 1, 2, [3, 4, 5]

// 对象解构
let person = { name: "Alice", age: 25, city: "NYC" };
let { name, age } = person;
let { name: userName, city = "Unknown" } = person;

// 函数参数解构
function printUser({ name, age = 18 }) {
  console.log(`${name} is ${age} years old`);
}
```

## **五、变量类型与类型转换**

### **1. 动态类型**
```javascript
// JavaScript是动态类型语言
let dynamic = "Hello";  // 字符串
dynamic = 42;           // 数字
dynamic = true;         // 布尔值
dynamic = { x: 1 };     // 对象
```

### **2. 类型判断**
```javascript
let value = "Hello";

typeof value;           // "string"
typeof 42;              // "number"
typeof true;            // "boolean"
typeof undefined;       // "undefined"
typeof null;            // "object" (历史遗留问题)
typeof {};              // "object"
typeof [];              // "object"
typeof function(){};    // "function"

// 更准确的类型检查
Array.isArray([]);      // true
value instanceof Date;  // 检查实例
Object.prototype.toString.call(value); // "[object String]"
```

### **3. 类型转换**
```javascript
// 显式转换
String(123);        // "123"
Number("42");       // 42
Boolean(0);         // false
parseInt("10px");   // 10
parseFloat("3.14"); // 3.14

// 隐式转换
"5" + 2;            // "52" (字符串拼接)
"5" - 2;            // 3 (数学运算)
+"10";              // 10 (一元加号转换)
!!"hello";          // true (双重非运算)
```

## **六、变量提升与执行上下文**

### **1. 变量提升机制**
```javascript
// 实际代码
console.log(myVar); // undefined
var myVar = 5;
console.log(myVar); // 5

// 实际执行顺序
var myVar;          // 声明提升到作用域顶部
console.log(myVar); // undefined
myVar = 5;          // 赋值留在原地
console.log(myVar); // 5

// 函数提升
sayHello(); // "Hello" (函数声明整体提升)
function sayHello() {
  console.log("Hello");
}

// 函数表达式不会提升
// sayHi(); // 报错
let sayHi = function() {
  console.log("Hi");
};
```

### **2. 执行上下文示例**
```javascript
var globalVar = "global";

function outer() {
  console.log(globalVar); // "global"
  var outerVar = "outer";
  
  function inner() {
    console.log(outerVar); // "outer"
    var innerVar = "inner";
  }
  
  inner();
  // console.log(innerVar); // 报错：innerVar未定义
}

outer();
```

## **七、全局变量与模块化**

### **1. 全局变量问题**
```javascript
// 全局变量污染
var globalVar = "I'm global"; // 成为window对象的属性

// 在浏览器中
console.log(window.globalVar); // "I'm global"

// 避免污染的方法
// 1. 使用IIFE
(function() {
  var privateVar = "I'm private";
  // 这里可以安全地使用变量
})();

// 2. 使用模块模式
const myModule = (function() {
  let privateCounter = 0;
  
  return {
    increment: function() {
      privateCounter++;
    },
    getCount: function() {
      return privateCounter;
    }
  };
})();
```

### **2. ES6 模块作用域**
```javascript
// module.js
export const MODULE_CONST = 100;
export let moduleVar = "module";
export function moduleFunc() {}

// 或者默认导出
export default class MyClass {}

// main.js
import { MODULE_CONST, moduleVar } from './module.js';
import MyClass from './module.js';

// 模块中的变量是局部作用域
console.log(typeof moduleVar); // "undefined" (不在当前模块)
```

## **八、变量最佳实践**

### **1. 声明原则**
```javascript
// 1. 尽量使用 const，除非需要重新赋值
const DEFAULT_CONFIG = { timeout: 5000 };
let currentUser = null; // 会被重新赋值

// 2. 声明在作用域顶部
function processData(data) {
  // 声明放在一起
  let isValid = false;
  let result = null;
  let error = null;
  
  // 然后才是逻辑代码
  try {
    isValid = validate(data);
    result = transform(data);
  } catch (e) {
    error = e;
  }
  
  return { isValid, result, error };
}

// 3. 一行一个声明
// 不好
let a = 1, b = 2, c = 3;

// 好
let a = 1;
let b = 2;
let c = 3;

// 或者分组
const API_CONFIG = {
  baseURL: "https://api.example.com",
  timeout: 5000
};

const USER_DEFAULTS = {
  role: "guest",
  theme: "light"
};
```

### **2. 避免的陷阱**
```javascript
// 1. 隐式全局变量
function createGlobal() {
  // 忘记声明变量，成为隐式全局变量
  accidentalGlobal = "Oops! I'm global";
}

// 2. 循环中的变量作用域
for (var i = 0; i < 5; i++) {
  setTimeout(() => {
    console.log(i); // 总是5（var是函数作用域）
  }, 100);
}

// 解决方法：使用let
for (let i = 0; i < 5; i++) {
  setTimeout(() => {
    console.log(i); // 0, 1, 2, 3, 4
  }, 100);
}

// 3. const 对象可以修改属性
const user = { name: "Alice" };
user.name = "Bob"; // 允许
// user = { name: "Charlie" }; // 报错

// 要冻结对象
const frozenUser = Object.freeze({ name: "Alice" });
// frozenUser.name = "Bob"; // 静默失败或报错（严格模式）
```

### **3. 现代 JavaScript 变量模式**
```javascript
// 1. 默认参数
function greet(name = "Guest") {
  return `Hello, ${name}`;
}

// 2. 剩余参数
function sum(...numbers) {
  return numbers.reduce((acc, curr) => acc + curr, 0);
}

// 3. 可选链和空值合并
const city = user?.address?.city ?? "Unknown";

// 4. 逻辑赋值
let config = {};
config.host ||= "localhost";
config.port ??= 3000;

// 5. 使用解构简化代码
function processResponse({ data, status, headers }) {
  // 直接使用变量
}
```

## **九、特殊变量和特性**

### **1. 全局对象属性**
```javascript
// 浏览器中的全局对象是 window
window.console.log("Hello");

// Node.js 中的全局对象是 global
global.console.log("Hello");

// 通用全局对象
globalThis.console.log("Hello"); // ES2020
```

### **2. 环境变量**
```javascript
// 环境相关的全局变量
console.log(process.env.NODE_ENV); // Node.js
// console.log(import.meta.env.MODE); // Vite
```

### **3. 内置常量**
```javascript
// JavaScript 内置常量
console.log(Infinity);
console.log(NaN);
console.log(undefined);
console.log(null);

// Math 常量
console.log(Math.PI);
console.log(Math.E);
```

## **十、调试技巧**

### **1. 查看变量信息**
```javascript
let user = { name: "Alice", age: 25, active: true };

console.log(user);           // 完整对象
console.table([user]);       // 表格形式
console.dir(user);           // 目录树形式
console.log("%cStyled text", "color: red; font-size: 20px");

// 分组输出
console.group("User Details");
console.log("Name:", user.name);
console.log("Age:", user.age);
console.groupEnd();
```

### **2. 性能监控**
```javascript
// 计时
console.time("processTime");
// 执行代码
console.timeEnd("processTime");

// 计数
console.count("callCount"); // callCount: 1
console.count("callCount"); // callCount: 2
console.countReset("callCount");
```

## **总结要点**

1. **优先使用 const**，其次是 let，避免使用 var
2. **保持变量作用域最小化**，只在需要的地方声明
3. **变量名要有意义**，使用驼峰命名法
4. **声明时初始化**，避免 undefined 状态
5. **注意引用类型的共享问题**，必要时进行深拷贝
6. **利用解构和默认值**简化代码
7. **理解变量提升**和暂时性死区的概念
8. **在模块化开发中**，避免使用全局变量

掌握变量是 JavaScript 编程的基础，理解这些概念和最佳实践将帮助你编写更健壮、可维护的代码。