# **JavaScript 语法糖大全**

语法糖（Syntactic Sugar）指的是让代码更易读、更简洁的语法特性，它们不改变语言的功能，只是提供了更便捷的写法。

## **一、ES6+ 核心语法糖**

### **1. 箭头函数 (Arrow Functions)**
```javascript
// 传统写法
const add = function(a, b) {
  return a + b;
};

// 语法糖写法
const add = (a, b) => a + b;

// 更简洁
const numbers = [1, 2, 3];
numbers.map(function(n) { return n * 2; });  // 传统
numbers.map(n => n * 2);                    // 箭头函数
```

### **2. 模板字符串 (Template Literals)**
```javascript
// 传统拼接
const name = 'Alice';
const greeting = 'Hello, ' + name + '! Today is ' + new Date().toDateString();

// 模板字符串
const greeting = `Hello, ${name}! Today is ${new Date().toDateString()}`;

// 多行字符串
const html = `
  <div class="container">
    <h1>${title}</h1>
    <p>${content}</p>
  </div>
`;
```

### **3. 解构赋值 (Destructuring)**
```javascript
// 数组解构
const arr = [1, 2, 3, 4];
const [first, second, ...rest] = arr;  // first=1, second=2, rest=[3,4]

// 交换变量
let a = 1, b = 2;
[a, b] = [b, a];  // a=2, b=1

// 对象解构
const user = { name: 'John', age: 30, city: 'NYC' };
const { name, age } = user;  // name='John', age=30

// 重命名
const { name: userName, age: userAge } = user;

// 函数参数解构
function printUser({ name, age }) {
  console.log(`${name} is ${age} years old`);
}
```

### **4. 扩展运算符 (Spread Operator)**
```javascript
// 数组展开
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];
const combined = [...arr1, ...arr2];  // [1,2,3,4,5,6]

// 对象展开
const obj1 = { a: 1, b: 2 };
const obj2 = { c: 3, d: 4 };
const merged = { ...obj1, ...obj2, e: 5 };  // {a:1,b:2,c:3,d:4,e:5}

// 函数参数展开
function sum(a, b, c) {
  return a + b + c;
}
const numbers = [1, 2, 3];
sum(...numbers);  // 6
```

### **5. 默认参数 (Default Parameters)**
```javascript
// 传统写法
function greet(name) {
  name = name || 'Guest';
  return `Hello, ${name}`;
}

// ES6 默认参数
function greet(name = 'Guest') {
  return `Hello, ${name}`;
}

// 复杂默认值
function createUser(name, options = { active: true, role: 'user' }) {
  // ...
}
```

### **6. 增强的对象字面量 (Enhanced Object Literals)**
```javascript
const name = 'Alice';
const age = 25;

// 传统写法
const user = {
  name: name,
  age: age,
  greet: function() {
    return `Hello, ${this.name}`;
  }
};

// 语法糖写法
const user = {
  name,      // 属性简写
  age,
  greet() {  // 方法简写
    return `Hello, ${this.name}`;
  },
  [ 'prop_' + name ]: 'value'  // 计算属性名
};
```

## **二、ES2020+ 新增语法糖**

### **1. 可选链操作符 (Optional Chaining)**
```javascript
const user = {
  profile: {
    name: 'Alice'
  }
};

// 传统写法
const city = user && user.address && user.address.city;

// 可选链写法
const city = user?.address?.city;  // undefined (不会报错)

// 函数调用
user.profile?.getName?.();

// 数组访问
const firstItem = arr?.[0];
```

### **2. 空值合并运算符 (Nullish Coalescing)**
```javascript
// 传统写法
const value = input !== null && input !== undefined ? input : 'default';

// 空值合并
const value = input ?? 'default';

// 与逻辑或的区别
const price = 0;
console.log(price || 100);  // 100 (0 被视为 false)
console.log(price ?? 100);  // 0 (只有 null/undefined 会被替换)
```

### **3. 逻辑赋值运算符 (Logical Assignment)**
```javascript
let a, b, c;

// 或赋值
a ||= 'default';  // 等价于 a = a || 'default'

// 与赋值
b &&= 'changed';  // 等价于 if (b) b = 'changed'

// 空值合并赋值
c ??= 'fallback'; // 等价于 c = c ?? 'fallback'

// 实际应用
function config(options) {
  options.timeout ||= 3000;    // 设置默认超时
  options.retries &&= 3;       // 如果存在则修改
  options.host ??= 'localhost'; // 只有null/undefined时设置
}
```

### **4. 顶层 await (Top-level await)**
```javascript
// 以前必须在 async 函数中
async function init() {
  const data = await fetchData();
}

// 现在可以直接在模块顶层使用
const data = await fetchData();
export { data };
```

## **三、数组和对象语法糖**

### **1. 数组方法链式调用**
```javascript
// 传统写法
const result = [];
for (let i = 0; i < numbers.length; i++) {
  if (numbers[i] > 5) {
    result.push(numbers[i] * 2);
  }
}

// 语法糖写法
const result = numbers
  .filter(n => n > 5)
  .map(n => n * 2)
  .reduce((sum, n) => sum + n, 0);
```

### **2. 数组的 includes 方法**
```javascript
const colors = ['red', 'green', 'blue'];

// 传统写法
if (colors.indexOf('green') !== -1) {
  // 存在
}

// includes 写法
if (colors.includes('green')) {
  // 存在
}
```

### **3. Object 的便利方法**
```javascript
const obj = { a: 1, b: 2, c: 3 };

// 获取键、值、键值对数组
const keys = Object.keys(obj);      // ['a', 'b', 'c']
const values = Object.values(obj);  // [1, 2, 3]
const entries = Object.entries(obj);// [['a', 1], ['b', 2], ['c', 3]]

// 从数组重建对象
const newObj = Object.fromEntries([
  ['a', 1],
  ['b', 2]
]);  // { a: 1, b: 2 }
```

## **四、函数相关语法糖**

### **1. 立即执行函数表达式 (IIFE)**
```javascript
// 传统 IIFE
(function() {
  var private = 'secret';
  console.log(private);
})();

// 箭头函数 IIFE
(() => {
  const private = 'secret';
  console.log(private);
})();

// 异步 IIFE
(async () => {
  const data = await fetch('/api');
  console.log(data);
})();
```

### **2. 参数收集 (Rest Parameters)**
```javascript
// 传统写法
function sum() {
  let total = 0;
  for (let i = 0; i < arguments.length; i++) {
    total += arguments[i];
  }
  return total;
}

// rest 参数写法
function sum(...numbers) {
  return numbers.reduce((acc, curr) => acc + curr, 0);
}
```

## **五、类与模块语法糖**

### **1. Class 语法**
```javascript
// 传统构造函数
function Person(name) {
  this.name = name;
}
Person.prototype.greet = function() {
  return `Hello, ${this.name}`;
};

// Class 语法
class Person {
  constructor(name) {
    this.name = name;
  }
  
  greet() {
    return `Hello, ${this.name}`;
  }
  
  // Getter/Setter
  get fullName() {
    return `${this.first} ${this.last}`;
  }
  
  // 静态方法
  static createAnonymous() {
    return new Person('Anonymous');
  }
}
```

### **2. 模块导入导出**
```javascript
// 传统写法（CommonJS）
const fs = require('fs');
module.exports = { myFunction };

// ES6 模块语法
import fs from 'fs';
import { func1, func2 } from './module.js';
import * as utils from './utils.js';
export { myFunction };
export default MyClass;
```

## **六、异步编程语法糖**

### **1. Async/Await**
```javascript
// 传统 Promise
function fetchData() {
  return fetch('/api/data')
    .then(response => response.json())
    .then(data => {
      return fetch(`/api/details/${data.id}`);
    })
    .catch(error => {
      console.error('Error:', error);
    });
}

// Async/Await
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    const details = await fetch(`/api/details/${data.id}`);
    return details;
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### **2. Promise 相关语法**
```javascript
// Promise.all
const [user, posts] = await Promise.all([
  fetch('/api/user'),
  fetch('/api/posts')
]);

// Promise.race
const result = await Promise.race([
  fetch('/api/data'),
  timeout(5000)  // 超时控制
]);

// Promise.allSettled
const promises = [fetch('/api1'), fetch('/api2')];
const results = await Promise.allSettled(promises);
```

## **七、实用小技巧**

### **1. 短路求值**
```javascript
// 设置默认值
const username = userInput || 'default';

// 条件执行函数
isLoggedIn && showDashboard();

// 条件赋值
const value = condition ? 'yes' : 'no';
```

### **2. 数字分隔符**
```javascript
// 大数字更易读
const billion = 1_000_000_000;
const hex = 0xFF_FF_FF;
const binary = 0b1010_0001;
```

### **3. 字符串方法**
```javascript
// startsWith / endsWith
const filename = 'document.pdf';
if (filename.endsWith('.pdf')) {
  // 处理 PDF
}

// padStart / padEnd
const num = '5';
num.padStart(3, '0');  // '005'
```

## **八、使用建议**

### **何时使用语法糖**
1. **提高代码可读性**：如模板字符串替代拼接
2. **减少冗余代码**：如解构赋值
3. **防止常见错误**：如可选链防止空指针
4. **现代化代码风格**：使用最新的语言特性

### **注意事项**
```javascript
// 1. 箭头函数的 this 绑定
const obj = {
  name: 'Alice',
  traditional: function() {
    console.log(this.name);  // Alice
  },
  arrow: () => {
    console.log(this.name);  // undefined（指向外层this）
  }
};

// 2. 扩展运算符的性能
// 对于大数组/对象，扩展运算符可能影响性能

// 3. 可选链的浏览器兼容性
// 旧浏览器需要 Babel 转译
```

## **九、现代 JavaScript 工作流**

```javascript
// 使用现代语法糖的示例
async function fetchUserData(userId) {
  try {
    // 解构 + 可选链 + 默认值
    const { 
      data: { 
        user = {},
        posts = [] 
      } = {} 
    } = await fetch(`/api/users/${userId}`).then(res => res.json());
    
    // 模板字符串 + 数组方法
    const summary = `
      User: ${user?.name ?? 'Unknown'}
      Posts: ${posts.length}
      Latest: ${posts[0]?.title || 'No posts'}
    `;
    
    return { user, posts, summary };
  } catch (error) {
    console.error(`Failed to fetch user ${userId}:`, error);
    throw error;
  }
}
```

语法糖让 JavaScript 代码更简洁、更表达力强，是现代 JavaScript 开发的重要组成部分。合理使用可以显著提高开发效率和代码质量。