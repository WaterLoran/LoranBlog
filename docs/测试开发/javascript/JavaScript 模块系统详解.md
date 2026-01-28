# JavaScript 模块系统详解

JavaScript 主要有两种模块系统：ES6 模块（ESM）和 CommonJS（主要用于 Node.js）。以下是详细介绍和示例：

## 1. ES6 模块 (ES Modules - ESM)

### 导出方式

#### 1.1 命名导出 (Named Export)
```javascript
// math.js
export const PI = 3.14159;
export const add = (a, b) => a + b;
export const multiply = (a, b) => a * b;

// 或者先定义后统一导出
const subtract = (a, b) => a - b;
const divide = (a, b) => a / b;
export { subtract, divide };

// 导出时可以重命名
export { subtract as sub, divide as div };
```

#### 1.2 默认导出 (Default Export)
```javascript
// utils.js
const greet = (name) => `Hello, ${name}!`;
export default greet;

// 也可以直接导出匿名函数/类
export default function() {
  console.log('Default export');
}

// 或者
export default class Calculator {
  add(a, b) { return a + b; }
}
```

### 导入方式

#### 2.1 导入命名导出
```javascript
// 导入特定的命名导出
import { PI, add } from './math.js';
console.log(PI); // 3.14159
console.log(add(2, 3)); // 5

// 导入所有命名导出为对象
import * as MathUtils from './math.js';
console.log(MathUtils.multiply(2, 3)); // 6

// 导入时重命名
import { subtract as sub } from './math.js';
console.log(sub(5, 2)); // 3
```

#### 2.2 导入默认导出
```javascript
// 导入默认导出（可以任意命名）
import greeting from './utils.js';
console.log(greeting('World')); // Hello, World!

// 同时导入默认导出和命名导出
import Calculator, { PI } from './calculator.js';
```

#### 2.3 动态导入 (Dynamic Import)
```javascript
// 按需加载模块
async function loadModule() {
  const module = await import('./math.js');
  console.log(module.add(1, 2)); // 3
}

// 或者在需要时导入
button.addEventListener('click', async () => {
  const utils = await import('./utils.js');
  utils.someFunction();
});
```

## 2. CommonJS 模块 (主要用于Node.js)

### 导出方式
```javascript
// module.js
// 方式1：exports对象
exports.add = (a, b) => a + b;
exports.PI = 3.14159;

// 方式2：module.exports
module.exports = {
  multiply: (a, b) => a * b,
  divide: (a, b) => a / b
};

// 方式3：导出单个值
module.exports = function(x, y) {
  return x * y;
};

// 方式4：导出类
class Person {
  constructor(name) {
    this.name = name;
  }
}
module.exports = Person;
```

### 导入方式
```javascript
// 导入整个模块
const math = require('./math.js');
console.log(math.add(2, 3));

// 使用解构赋值导入特定方法
const { add, multiply } = require('./math.js');

// 导入默认导出
const myFunction = require('./myFunction.js');

// 导入内置模块
const fs = require('fs');
const path = require('path');

// 导入npm包
const axios = require('axios');
const lodash = require('lodash');
```

## 3. 在浏览器中使用ES6模块

### HTML中引入
```html
<!-- 必须设置 type="module" -->
<script type="module" src="./main.js"></script>

<!-- 或者内联模块 -->
<script type="module">
  import { add } from './math.js';
  console.log(add(1, 2));
</script>
```

### 模块路径规则
```javascript
// 相对路径
import { foo } from './module.js';  // 当前目录
import { bar } from '../utils.js'; // 上级目录

// 绝对路径
import { baz } from '/js/modules/module.js';

// 裸模块（从node_modules导入）
import lodash from 'lodash-es';
import axios from 'axios';
```

## 4. 包管理和导入

### package.json配置
```json
{
  "name": "my-project",
  "type": "module",  // 指定使用ESM，默认为commonjs
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",  // ESM入口
      "require": "./dist/cjs/index.js"  // CommonJS入口
    },
    "./utils": "./dist/esm/utils.js"
  },
  "dependencies": {
    "axios": "^1.0.0"
  }
}
```

## 5. 实际示例项目结构

```
project/
├── index.html
├── package.json
├── src/
│   ├── main.js
│   ├── math.js
│   ├── utils/
│   │   ├── stringUtils.js
│   │   └── dateUtils.js
│   └── components/
│       ├── Button.js
│       └── Modal.js
└── node_modules/
```

### 跨模块导入示例
```javascript
// src/main.js
import { add, multiply } from './math.js';
import { capitalize } from './utils/stringUtils.js';
import Button from './components/Button.js';

// 重新导出（聚合模块）
// utils/index.js
export { capitalize } from './stringUtils.js';
export { formatDate } from './dateUtils.js';

// main.js中可以这样导入
import { capitalize, formatDate } from './utils/index.js';
```

## 6. 注意事项和最佳实践

1. **文件扩展名**：ES6模块通常需要完整扩展名（如 `.js`）
2. **严格模式**：ES6模块自动启用严格模式
3. **顶层导入**：`import` 语句必须在顶层，不能嵌套在条件语句中（动态导入除外）
4. **循环依赖**：尽量避免，如无法避免要小心处理
5. **Tree Shaking**：使用命名导出有利于打包工具进行树摇优化

## 7. Node.js中同时支持两种模块

```javascript
// package.json 设置
{
  "type": "module",  // 默认使用ESM
  "main": "./dist/index.cjs",  // CommonJS入口
  "exports": {
    "import": "./dist/index.mjs",  // ESM入口
    "require": "./dist/index.cjs"  // CommonJS入口
  }
}

// 在CommonJS中导入ESM（异步）
async function loadESM() {
  const { readFile } = await import('fs/promises');
  // 使用...
}
```

这两种模块系统各有用途，现代前端开发主要使用ES6模块，而Node.js中两者都在使用，但趋势是向ES6模块迁移。