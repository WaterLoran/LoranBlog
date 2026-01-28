# **JavaScript 数组全面指南**

数组是 JavaScript 中最常用的数据结构之一，用于存储有序的数据集合。

## **一、创建数组**

### **1. 基本创建方式**
```javascript
// 字面量创建（最常用）
const arr1 = [1, 2, 3, 4, 5];
const arr2 = ['a', 'b', 'c'];
const arr3 = [1, 'hello', true, { name: 'John' }]; // 混合类型

// Array 构造函数
const arr4 = new Array();          // 空数组 []
const arr5 = new Array(5);         // 长度为5的稀疏数组 [empty × 5]
const arr6 = new Array(1, 2, 3);   // [1, 2, 3]

// Array.of() - 解决构造函数的问题
Array.of(7);       // [7] (不是长度为7的数组)
Array.of(1, 2, 3); // [1, 2, 3]

// Array.from() - 从类数组或可迭代对象创建
Array.from('hello');           // ['h', 'e', 'l', 'l', 'o']
Array.from([1, 2, 3], x => x * 2); // [2, 4, 6]
Array.from({ length: 5 }, (_, i) => i + 1); // [1, 2, 3, 4, 5]
```

### **2. 特殊数组**
```javascript
// 空槽数组（稀疏数组）
const sparse = [1, , 3];  // [1, empty, 3]
console.log(sparse[1]);   // undefined
console.log(1 in sparse); // false (没有这个属性)

// 多维数组
const matrix = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9]
];
console.log(matrix[1][2]); // 6
```

## **二、数组基本操作**

### **1. 访问和修改元素**
```javascript
const fruits = ['apple', 'banana', 'orange'];

// 访问
console.log(fruits[0]);    // 'apple'
console.log(fruits.at(-1)); // 'orange' (ES2022)

// 修改
fruits[1] = 'grape';
console.log(fruits); // ['apple', 'grape', 'orange']

// 长度
console.log(fruits.length); // 3

// 动态调整长度
fruits.length = 5;
console.log(fruits); // ['apple', 'grape', 'orange', empty × 2]

fruits.length = 2;
console.log(fruits); // ['apple', 'grape'] (被截断)
```

### **2. 添加/删除元素**
```javascript
const arr = [1, 2, 3];

// 末尾添加/删除
arr.push(4);          // [1, 2, 3, 4] 返回新长度 4
const last = arr.pop(); // [1, 2, 3] 返回删除的元素 4

// 开头添加/删除
arr.unshift(0);         // [0, 1, 2, 3] 返回新长度 4
const first = arr.shift(); // [1, 2, 3] 返回删除的元素 0

// 任意位置添加/删除/替换
arr.splice(1, 0, 'a', 'b');  // [1, 'a', 'b', 2, 3]
// 参数：起始索引，删除数量，要添加的元素

arr.splice(2, 2);            // [1, 'a', 3] (删除2个)
arr.splice(1, 1, 'x', 'y');  // [1, 'x', 'y', 3] (替换)
```

## **三、数组遍历方法**

### **1. 基本遍历**
```javascript
const numbers = [10, 20, 30];

// for 循环
for (let i = 0; i < numbers.length; i++) {
  console.log(numbers[i]);
}

// for...of 循环
for (const num of numbers) {
  console.log(num);
}

// for...in (不推荐用于数组，会遍历所有可枚举属性)
for (const index in numbers) {
  console.log(index, numbers[index]);
}
```

### **2. 高阶函数遍历**
```javascript
const users = [
  { id: 1, name: 'Alice', age: 25 },
  { id: 2, name: 'Bob', age: 30 },
  { id: 3, name: 'Charlie', age: 28 }
];

// forEach - 遍历执行
users.forEach((user, index) => {
  console.log(`${index}: ${user.name}`);
});

// map - 映射新数组
const names = users.map(user => user.name); // ['Alice', 'Bob', 'Charlie']
const agesDoubled = users.map(user => ({ ...user, age: user.age * 2 }));

// filter - 过滤
const adults = users.filter(user => user.age >= 28); // Bob, Charlie

// find/findIndex - 查找
const bob = users.find(user => user.name === 'Bob');
const bobIndex = users.findIndex(user => user.name === 'Bob');

// some/every - 测试条件
const hasAdult = users.some(user => user.age >= 18); // true
const allAdults = users.every(user => user.age >= 18); // true
```

## **四、数组转换方法**

### **1. 排序和反转**
```javascript
const arr = [3, 1, 4, 1, 5, 9];

// 排序（修改原数组）
arr.sort();                     // [1, 1, 3, 4, 5, 9] (字符串排序)
arr.sort((a, b) => a - b);      // 数字升序
arr.sort((a, b) => b - a);      // 数字降序

// 自定义排序
const items = [
  { name: 'Edward', value: 21 },
  { name: 'Sharpe', value: 37 }
];
items.sort((a, b) => a.value - b.value);

// 反转
arr.reverse(); // [9, 5, 4, 3, 1, 1]
```

### **2. 连接和拆分**
```javascript
const arr1 = [1, 2], arr2 = [3, 4];

// 连接数组
const combined = arr1.concat(arr2, [5, 6]); // [1, 2, 3, 4, 5, 6]

// 连接为字符串
const str = arr1.join(', '); // "1, 2"

// 拆分字符串为数组
const str2 = '1,2,3,4';
const arr3 = str2.split(','); // ['1', '2', '3', '4']
```

### **3. 扁平化和切片**
```javascript
// slice - 切片（不修改原数组）
const arr = [1, 2, 3, 4, 5];
const slice1 = arr.slice(1, 3);    // [2, 3] (索引1到3，不包括3)
const slice2 = arr.slice(2);       // [3, 4, 5] (从索引2开始)
const copy = arr.slice();          // 浅拷贝

// flat - 扁平化
const nested = [1, [2, [3, [4]]]];
nested.flat();          // [1, 2, [3, [4]]] (默认深度1)
nested.flat(2);         // [1, 2, 3, [4]]
nested.flat(Infinity);  // [1, 2, 3, 4]

// flatMap - 映射后扁平化
const arr4 = [1, 2, 3];
const result = arr4.flatMap(x => [x, x * 2]); // [1, 2, 2, 4, 3, 6]
```

## **五、数组聚合方法**

### **1. 归约计算**
```javascript
const numbers = [1, 2, 3, 4, 5];

// reduce - 从左到右归约
const sum = numbers.reduce((acc, curr) => acc + curr, 0); // 15
const max = numbers.reduce((acc, curr) => Math.max(acc, curr), -Infinity); // 5

// reduceRight - 从右到左归约
const reversed = numbers.reduceRight((acc, curr) => [...acc, curr], []); // [5, 4, 3, 2, 1]

// 复杂归约
const fruits = ['apple', 'banana', 'apple', 'orange', 'banana'];
const count = fruits.reduce((acc, fruit) => {
  acc[fruit] = (acc[fruit] || 0) + 1;
  return acc;
}, {});
// { apple: 2, banana: 2, orange: 1 }
```

### **2. 查找和包含检查**
```javascript
const arr = [10, 20, 30, 40, 50];

// 包含检查
console.log(arr.includes(30));      // true
console.log(arr.includes(30, 3));   // false (从索引3开始找)

// 查找索引
console.log(arr.indexOf(30));       // 2
console.log(arr.indexOf(30, 3));    // -1 (从索引3开始)
console.log(arr.lastIndexOf(30));   // 2 (从后往前找)
```

## **六、ES6+ 新增特性**

### **1. 扩展运算符和结构**
```javascript
// 扩展运算符
const parts = ['shoulders', 'knees'];
const body = ['head', ...parts, 'toes']; // ['head', 'shoulders', 'knees', 'toes']

// 复制数组
const original = [1, 2, 3];
const copy = [...original];

// 合并数组
const merged = [...arr1, ...arr2];

// 解构赋值
const [first, second, ...rest] = [1, 2, 3, 4, 5];
// first = 1, second = 2, rest = [3, 4, 5]

// 交换变量
let a = 1, b = 2;
[a, b] = [b, a]; // a=2, b=1
```

### **2. 数组静态方法**
```javascript
// Array.isArray - 类型检查
console.log(Array.isArray([1, 2]));  // true
console.log(Array.isArray('hello')); // false

// Array.from 的应用场景
// 1. 从类数组对象
const arrayLike = { 0: 'a', 1: 'b', length: 2 };
Array.from(arrayLike); // ['a', 'b']

// 2. 从 Set/Map
Array.from(new Set([1, 2, 2, 3])); // [1, 2, 3]

// 3. 生成序列
Array.from({ length: 5 }, (_, i) => i * 2); // [0, 2, 4, 6, 8]
```

## **七、实用技巧和模式**

### **1. 数组去重**
```javascript
const duplicates = [1, 2, 2, 3, 4, 4, 5];

// 方法1: Set
const unique1 = [...new Set(duplicates)];

// 方法2: filter
const unique2 = duplicates.filter((item, index) => 
  duplicates.indexOf(item) === index
);

// 方法3: reduce
const unique3 = duplicates.reduce((acc, curr) => 
  acc.includes(curr) ? acc : [...acc, curr], []
);
```

### **2. 数组分块**
```javascript
function chunkArray(arr, size) {
  return Array.from(
    { length: Math.ceil(arr.length / size) },
    (_, i) => arr.slice(i * size, i * size + size)
  );
}

chunkArray([1, 2, 3, 4, 5, 6], 2); // [[1, 2], [3, 4], [5, 6]]
```

### **3. 数组分组**
```javascript
function groupBy(arr, key) {
  return arr.reduce((acc, obj) => {
    const groupKey = typeof key === 'function' ? key(obj) : obj[key];
    acc[groupKey] = acc[groupKey] || [];
    acc[groupKey].push(obj);
    return acc;
  }, {});
}

const users = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 },
  { name: 'Charlie', age: 25 }
];

groupBy(users, 'age');
// { 25: [{name:'Alice',age:25}, {name:'Charlie',age:25}], 30: [{name:'Bob',age:30}] }
```

### **4. 数组比较**
```javascript
// 判断两个数组是否相等
function arraysEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;
  return arr1.every((value, index) => value === arr2[index]);
}

// 判断数组是否包含另一个数组的所有元素
function arrayContains(arr1, arr2) {
  return arr2.every(item => arr1.includes(item));
}
```

## **八、性能考虑**

### **1. 方法性能对比**
```javascript
// push vs concat (添加元素)
const arr = [];
// 快：修改原数组
for (let i = 0; i < 10000; i++) {
  arr.push(i);
}

// 慢：创建新数组
let arr2 = [];
for (let i = 0; i < 10000; i++) {
  arr2 = arr2.concat(i);
}

// for vs forEach (遍历)
// for 循环最快
for (let i = 0; i < arr.length; i++) {}

// forEach 次之
arr.forEach(item => {});

// for...of 较慢
for (const item of arr) {}
```

### **2. 大数据处理技巧**
```javascript
// 分批处理大数据
async function processLargeArray(array, batchSize, processFn) {
  for (let i = 0; i < array.length; i += batchSize) {
    const batch = array.slice(i, i + batchSize);
    await Promise.all(batch.map(processFn));
  }
}

// 流式处理
function* processInChunks(array, chunkSize) {
  for (let i = 0; i < array.length; i += chunkSize) {
    yield array.slice(i, i + chunkSize);
  }
}
```

## **九、TypeScript 中的数组**

```typescript
// 类型化数组
const numbers: number[] = [1, 2, 3];
const strings: Array<string> = ['a', 'b', 'c'];

// 只读数组
const readonlyArr: readonly number[] = [1, 2, 3];
// readonlyArr.push(4); // 错误

// 元组（固定长度和类型的数组）
const tuple: [string, number] = ['hello', 42];

// 多维数组
const matrix: number[][] = [
  [1, 2, 3],
  [4, 5, 6]
];
```

## **十、常见陷阱和最佳实践**

```javascript
// 1. 避免稀疏数组
const sparse = new Array(3); // [empty × 3] (有问题)
const dense = Array.from({ length: 3 }, () => 0); // [0, 0, 0] (正确)

// 2. 注意引用类型
const arr1 = [{ id: 1 }];
const arr2 = [...arr1];
arr2[0].id = 2;
console.log(arr1[0].id); // 2 (浅拷贝问题)

// 3. 使用 const 声明数组
const arr = [1, 2, 3];
arr.push(4); // 可以
// arr = [5, 6]; // 错误

// 4. 优先使用不可变方法
const original = [1, 2, 3];
// 不好：修改原数组
original.reverse();
// 好：返回新数组
const reversed = [...original].reverse();

// 5. 链式调用优化
const result = numbers
  .filter(n => n > 0)
  .map(n => n * 2)
  .reduce((sum, n) => sum + n, 0);
```

JavaScript 数组功能强大且灵活，掌握这些方法和技巧可以让你更高效地处理数据。记住选择合适的方法，考虑性能影响，并遵循最佳实践。