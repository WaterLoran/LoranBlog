# **JavaScript 判断与循环全面指南**

## **一、判断语句 (Conditional Statements)**

### **1. if...else 语句**

```javascript
// 基础 if
if (condition) {
  // 条件为真时执行
}

// if...else
if (condition) {
  // 条件为真时执行
} else {
  // 条件为假时执行
}

// if...else if...else
let score = 85;

if (score >= 90) {
  console.log('优秀');
} else if (score >= 80) {
  console.log('良好');  // 执行这里
} else if (score >= 60) {
  console.log('及格');
} else {
  console.log('不及格');
}

// 嵌套 if
if (isLoggedIn) {
  if (isAdmin) {
    console.log('欢迎管理员');
  } else {
    console.log('欢迎用户');
  }
}
```

### **2. 三元运算符 (Ternary Operator)**
```javascript
// 语法：condition ? expression1 : expression2

let age = 18;
let status = age >= 18 ? '成人' : '未成年';
console.log(status); // '成人'

// 嵌套三元运算（可读性差，不推荐）
let grade = score >= 90 ? 'A' : 
            score >= 80 ? 'B' : 
            score >= 70 ? 'C' : 'D';

// 赋默认值
let userName = inputName ? inputName : '游客';
// 更简洁的写法：
let userName = inputName || '游客';
```

### **3. switch 语句**
```javascript
let day = 3;
let dayName;

switch (day) {
  case 1:
    dayName = '星期一';
    break;  // 必须加 break，否则会继续执行后面的 case
  case 2:
    dayName = '星期二';
    break;
  case 3:
    dayName = '星期三';  // dayName = '星期三'
    break;
  case 4:
    dayName = '星期四';
    break;
  case 5:
    dayName = '星期五';
    break;
  default:  // 可选的
    dayName = '周末';
}

// case 合并（多个条件执行相同代码）
let fruit = 'apple';

switch (fruit) {
  case 'apple':
  case 'banana':
  case 'orange':
    console.log('这是水果');
    break;
  case 'carrot':
  case 'broccoli':
    console.log('这是蔬菜');
    break;
}

// switch 中使用表达式
let num = 25;

switch (true) {  // 比较技巧
  case num < 0:
    console.log('负数');
    break;
  case num >= 0 && num < 10:
    console.log('个位数');
    break;
  case num >= 10 && num < 100:
    console.log('两位数');  // 执行这里
    break;
}
```

### **4. 逻辑运算符与短路求值**
```javascript
// && (AND) - 条件都成立时执行
isLoggedIn && showDashboard();

// 用于条件赋值
let user = isAuthenticated && getUser();

// || (OR) - 第一个为真时返回第一个值，否则返回第二个
let name = inputName || '默认名';

// 连续判断
if (user && user.profile && user.profile.email) {
  // 旧写法
}

// 使用可选链（更简洁）
if (user?.profile?.email) {
  // 新写法
}

// ! (NOT) - 取反
if (!isLoggedIn) {
  redirectToLogin();
}
```

## **二、循环语句 (Loops)**

### **1. for 循环**
```javascript
// 基本 for 循环
for (let i = 0; i < 5; i++) {
  console.log(i);  // 0, 1, 2, 3, 4
}

// 遍历数组
const fruits = ['apple', 'banana', 'orange'];

for (let i = 0; i < fruits.length; i++) {
  console.log(fruits[i]);
}

// 倒序循环
for (let i = fruits.length - 1; i >= 0; i--) {
  console.log(fruits[i]);  // orange, banana, apple
}

// 跳步循环
for (let i = 0; i < 10; i += 2) {
  console.log(i);  // 0, 2, 4, 6, 8
}

// 无限循环（危险！）
// for (;;) {
//   console.log('无限循环');
// }
```

### **2. while 循环**
```javascript
// 先判断后执行
let count = 0;

while (count < 5) {
  console.log(count);  // 0, 1, 2, 3, 4
  count++;
}

// 读取用户输入直到满足条件
let userInput;
while (userInput !== 'quit') {
  userInput = prompt('输入 quit 退出:');
  console.log(`你输入了: ${userInput}`);
}

// 复杂条件
let attempts = 0;
const maxAttempts = 3;
let correct = false;

while (attempts < maxAttempts && !correct) {
  const answer = prompt('请输入答案:');
  correct = answer === '42';
  attempts++;
}
```

### **3. do...while 循环**
```javascript
// 先执行一次，再判断条件
let i = 0;

do {
  console.log(i);  // 至少执行一次: 0
  i++;
} while (i < 5);

// 菜单系统示例
let choice;

do {
  console.log('1. 添加');
  console.log('2. 删除');
  console.log('3. 退出');
  choice = prompt('请选择:');
  
  switch (choice) {
    case '1': addItem(); break;
    case '2': deleteItem(); break;
  }
} while (choice !== '3');
```

### **4. for...in 循环**
```javascript
// 遍历对象的可枚举属性
const person = {
  name: 'Alice',
  age: 25,
  city: 'New York'
};

for (let key in person) {
  console.log(`${key}: ${person[key]}`);
  // name: Alice
  // age: 25
  // city: New York
}

// 遍历数组（不推荐，会遍历所有可枚举属性，包括原型链）
const arr = ['a', 'b', 'c'];
arr.customProp = 'custom';  // 添加自定义属性

for (let index in arr) {
  console.log(index, arr[index]);
  // 0 a
  // 1 b
  // 2 c
  // customProp custom
}

// 只遍历自身属性
for (let key in person) {
  if (person.hasOwnProperty(key)) {
    console.log(key);
  }
}
```

### **5. for...of 循环 (ES6)**
```javascript
// 遍历可迭代对象（数组、字符串、Map、Set等）
const fruits = ['apple', 'banana', 'orange'];

for (let fruit of fruits) {
  console.log(fruit);  // apple, banana, orange
}

// 遍历字符串
for (let char of 'Hello') {
  console.log(char);  // H, e, l, l, o
}

// 遍历 Map
const map = new Map([
  ['a', 1],
  ['b', 2],
  ['c', 3]
]);

for (let [key, value] of map) {
  console.log(key, value);  // a 1, b 2, c 3
}

// 遍历 Set
const set = new Set([1, 2, 3, 3, 4]);

for (let num of set) {
  console.log(num);  // 1, 2, 3, 4 (去重)
}

// 获取索引和值（使用 entries()）
for (let [index, value] of fruits.entries()) {
  console.log(index, value);  // 0 apple, 1 banana, 2 orange
}
```

### **6. 数组迭代方法**
```javascript
const numbers = [1, 2, 3, 4, 5];

// forEach - 遍历
numbers.forEach((num, index, array) => {
  console.log(num, index);
});

// map - 映射新数组
const doubled = numbers.map(num => num * 2);
console.log(doubled);  // [2, 4, 6, 8, 10]

// filter - 过滤
const evens = numbers.filter(num => num % 2 === 0);
console.log(evens);  // [2, 4]

// reduce - 归约
const sum = numbers.reduce((acc, curr) => acc + curr, 0);
console.log(sum);  // 15

// some - 至少一个满足条件
const hasEven = numbers.some(num => num % 2 === 0);
console.log(hasEven);  // true

// every - 全部满足条件
const allPositive = numbers.every(num => num > 0);
console.log(allPositive);  // true

// find - 查找元素
const firstEven = numbers.find(num => num % 2 === 0);
console.log(firstEven);  // 2

// findIndex - 查找索引
const firstEvenIndex = numbers.findIndex(num => num % 2 === 0);
console.log(firstEvenIndex);  // 1
```

## **三、循环控制语句**

### **1. break - 跳出循环**
```javascript
// 跳出当前循环
for (let i = 0; i < 10; i++) {
  if (i === 5) {
    break;  // 当 i 等于 5 时跳出循环
  }
  console.log(i);  // 0, 1, 2, 3, 4
}

// 在 while 循环中使用
let num = 0;
while (true) {
  console.log(num);
  num++;
  if (num >= 5) {
    break;  // 跳出无限循环
  }
}

// 在 switch 中跳出
switch (value) {
  case 1:
    // ...
    break;  // 跳出 switch
}
```

### **2. continue - 跳过本次迭代**
```javascript
// 跳过特定条件的迭代
for (let i = 0; i < 10; i++) {
  if (i % 2 === 0) {
    continue;  // 跳过偶数
  }
  console.log(i);  // 1, 3, 5, 7, 9
}

// 处理数据时跳过无效值
const data = [1, null, 3, undefined, 5];

for (let item of data) {
  if (item == null) {  // null 或 undefined
    continue;
  }
  console.log(item);  // 1, 3, 5
}
```

### **3. 标签语句 (Labeled Statements)**
```javascript
// 给循环添加标签
outerLoop: for (let i = 0; i < 3; i++) {
  console.log(`外层循环: ${i}`);
  
  innerLoop: for (let j = 0; j < 3; j++) {
    if (i === 1 && j === 1) {
      break outerLoop;  // 跳出外层循环
      // break innerLoop;  // 跳出内层循环
    }
    console.log(`  内层循环: ${j}`);
  }
}
// 输出:
// 外层循环: 0
//   内层循环: 0
//   内层循环: 1
//   内层循环: 2
// 外层循环: 1
//   内层循环: 0
```

## **四、判断与循环的实用技巧**

### **1. 提前返回 (Early Return)**
```javascript
// 坏代码
function processUser(user) {
  if (user) {
    if (user.isActive) {
      if (user.hasPermission) {
        // 真正的业务逻辑
        return '处理成功';
      } else {
        return '无权限';
      }
    } else {
      return '用户未激活';
    }
  } else {
    return '用户不存在';
  }
}

// 好代码（提前返回）
function processUser(user) {
  if (!user) return '用户不存在';
  if (!user.isActive) return '用户未激活';
  if (!user.hasPermission) return '无权限';
  
  // 真正的业务逻辑
  return '处理成功';
}
```

### **2. 循环优化**
```javascript
// 1. 缓存数组长度（老式优化）
const arr = [/* 大量数据 */];
for (let i = 0, len = arr.length; i < len; i++) {
  // 处理
}

// 2. 减少循环内的计算
// 坏代码
for (let i = 0; i < arr.length; i++) {
  const result = expensiveCalculation(arr[i]) + anotherExpensiveCalculation(arr[i]);
}

// 好代码
for (let i = 0; i < arr.length; i++) {
  const item = arr[i];
  const calc1 = expensiveCalculation(item);
  const calc2 = anotherExpensiveCalculation(item);
  const result = calc1 + calc2;
}

// 3. 使用 for 而不是 forEach（性能敏感时）
// forEach 会创建函数作用域，性能稍差
```

### **3. 异步循环处理**
```javascript
// 使用 for...of 处理异步操作
async function processItems(items) {
  for (const item of items) {
    await processItem(item);  // 顺序执行
  }
}

// 并行处理
async function processItemsParallel(items) {
  const promises = items.map(item => processItem(item));
  await Promise.all(promises);  // 并行执行
}

// 限制并发数
async function processWithConcurrency(items, concurrency = 3) {
  const results = [];
  
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map(item => processItem(item))
    );
    results.push(...chunkResults);
  }
  
  return results;
}
```

### **4. 条件判断的优雅写法**
```javascript
// 1. 使用对象映射代替 switch
const statusMap = {
  'pending': '待处理',
  'processing': '处理中',
  'completed': '已完成',
  'failed': '失败'
};

const statusText = statusMap[status] || '未知状态';

// 2. 使用数组的 includes 方法
const validColors = ['red', 'green', 'blue'];
if (validColors.includes(color)) {
  // 有效颜色
}

// 3. 使用逻辑运算符简化
const isAdmin = user && user.role === 'admin';
// 等同于：
const isAdmin = user?.role === 'admin';

// 4. 解构配合默认值
function displayUser({ 
  name = '匿名', 
  age = 0, 
  isActive = false 
} = {}) {
  console.log(`${name}, ${age}岁, ${isActive ? '活跃' : '非活跃'}`);
}
```

## **五、常见模式与陷阱**

### **1. 循环中的闭包问题**
```javascript
// 问题：所有按钮点击都显示 5
for (var i = 0; i < 5; i++) {
  setTimeout(() => {
    console.log(i);  // 5, 5, 5, 5, 5
  }, 100);
}

// 解决方案1：使用 let（块级作用域）
for (let i = 0; i < 5; i++) {
  setTimeout(() => {
    console.log(i);  // 0, 1, 2, 3, 4
  }, 100);
}

// 解决方案2：使用 IIFE
for (var i = 0; i < 5; i++) {
  (function(index) {
    setTimeout(() => {
      console.log(index);  // 0, 1, 2, 3, 4
    }, 100);
  })(i);
}
```

### **2. 避免无限循环**
```javascript
// 危险的无限循环
// while (true) {
//   // 没有退出条件
// }

// 安全的循环
let counter = 0;
const maxIterations = 1000;

while (someCondition) {
  // 处理逻辑
  counter++;
  
  // 安全阀
  if (counter > maxIterations) {
    console.error('可能进入无限循环');
    break;
  }
}
```

### **3. 循环中修改数组**
```javascript
const numbers = [1, 2, 3, 4, 5];

// 危险：遍历时修改数组
for (let i = 0; i < numbers.length; i++) {
  if (numbers[i] % 2 === 0) {
    numbers.splice(i, 1);  // 删除元素，改变数组长度
    i--;  // 需要调整索引
  }
}

// 更好：从后往前遍历
for (let i = numbers.length - 1; i >= 0; i--) {
  if (numbers[i] % 2 === 0) {
    numbers.splice(i, 1);
  }
}

// 最好：使用 filter
const oddNumbers = numbers.filter(num => num % 2 !== 0);
```

## **六、性能比较**

```javascript
const largeArray = Array.from({ length: 1000000 }, (_, i) => i);

// 1. for 循环 (最快)
console.time('for');
for (let i = 0; i < largeArray.length; i++) {
  // 操作
}
console.timeEnd('for');

// 2. for...of (稍慢)
console.time('for...of');
for (const item of largeArray) {
  // 操作
}
console.timeEnd('for...of');

// 3. forEach (最慢，但最声明式)
console.time('forEach');
largeArray.forEach(item => {
  // 操作
});
console.timeEnd('forEach');
```

## **七、现代 JavaScript 模式**

```javascript
// 1. 使用可选链和空值合并
const userName = user?.profile?.name ?? '匿名';

// 2. 使用对象解构
const { name, age, ...rest } = user;

// 3. 使用数组解构
const [first, second, ...others] = items;

// 4. 逻辑赋值
let config = {};
config.host ||= 'localhost';
config.port ??= 3000;

// 5. 使用 Map 和 Set 进行高效查找
const uniqueValues = new Set(array);
const valueMap = new Map(array.map(item => [item.id, item]));
```

## **八、最佳实践总结**

1. **选择正确的循环**：
   - 已知次数：使用 `for`
   - 遍历数组值：使用 `for...of`
   - 遍历对象属性：使用 `for...in`（配合 `hasOwnProperty`）
   - 函数式编程：使用 `map`、`filter`、`reduce`

2. **条件判断优化**：
   - 使用提前返回减少嵌套
   - 使用卫语句处理异常情况
   - 使用对象映射代替复杂的 switch

3. **性能考虑**：
   - 避免在循环内创建函数
   - 缓存需要重复计算的变量
   - 大数据量时考虑性能差异

4. **代码可读性**：
   - 使用有意义的变量名
   - 复杂条件提取为函数或变量
   - 注释说明复杂逻辑

5. **异步处理**：
   - 注意循环中的异步操作
   - 合理使用 `Promise.all` 并行处理
   - 控制并发数量避免资源耗尽

掌握判断和循环是编写高效 JavaScript 代码的基础，合理使用这些结构可以使代码更清晰、更高效。