## **Easy-Object 库用法详解**

`easy-object` 是一个让 JavaScript 对象支持**点号安全访问**的轻量级库，类似于 Python 中的 `easydict`。

### **1. 安装**
```bash
# 使用 npm
npm install easy-object

# 使用 yarn
yarn add easy-object
```

### **2. 基本用法**

#### **创建 EasyObject**
```javascript
const EasyObject = require('easy-object');

// 从普通对象创建
const obj = new EasyObject({
  name: 'Alice',
  age: 25,
  address: {
    city: 'Beijing',
    zip: '100000'
  },
  hobbies: ['reading', 'coding']
});

// 或创建空对象
const empty = new EasyObject();
```

#### **属性访问**
```javascript
// 点号访问（主要特点）
console.log(obj.name);        // 'Alice'
console.log(obj.address.city); // 'Beijing'

// 方括号访问也支持
console.log(obj['name']);     // 'Alice'
console.log(obj['address']['city']); // 'Beijing'

// 访问数组
console.log(obj.hobbies[0]);  // 'reading'
```

#### **安全访问（不会报错）**
```javascript
// 访问不存在的属性 - 返回 undefined，不报错
console.log(obj.nonexistent.property); // undefined

// 对比原生对象会报错
const nativeObj = { a: 1 };
// console.log(nativeObj.b.c); // TypeError: Cannot read property 'c' of undefined

// 但 EasyObject 很安全
console.log(obj.b.c.d.e); // undefined（全程不会报错）
```

### **3. 动态属性操作**

#### **设置属性**
```javascript
// 设置新属性
obj.newProp = 'Hello';
console.log(obj.newProp); // 'Hello'

// 设置嵌套属性
obj.some.deep.nested.value = 'World';
console.log(obj.some.deep.nested.value); // 'World'

// 使用方括号设置
obj['dynamic' + 'Prop'] = 'Dynamic';
console.log(obj.dynamicProp); // 'Dynamic'
```

#### **删除属性**
```javascript
obj.toDelete = 'delete me';
console.log(obj.toDelete); // 'delete me'

delete obj.toDelete;
console.log(obj.toDelete); // undefined
```

### **4. 特殊方法和特性**

#### **转换为普通对象**
```javascript
// 获取底层普通对象
const plain = obj.toObject();
console.log(typeof plain); // 'object'（普通对象）

// 或使用展开运算符
const plain2 = { ...obj };
```

#### **JSON 序列化**
```javascript
// JSON.stringify 正常工作
const jsonString = JSON.stringify(obj);
console.log(jsonString); 
// '{"name":"Alice","age":25,"address":{"city":"Beijing","zip":"100000"},"hobbies":["reading","coding"]}'

// 解析后会自动转为普通对象
const parsed = JSON.parse(jsonString);
console.log(parsed.address.city); // 'Beijing'（现在这是普通对象）
```

#### **遍历对象**
```javascript
// for...in 循环
for (const key in obj) {
  console.log(key, obj[key]);
}
// 输出: name Alice, age 25, address {...}, etc.

// Object.keys, Object.values, Object.entries 正常工作
console.log(Object.keys(obj)); // ['name', 'age', 'address', 'hobbies']
console.log(Object.values(obj)); // ['Alice', 25, {...}, [...]]
```

### **5. 实际应用场景**

#### **配置管理**
```javascript
class ConfigManager {
  constructor() {
    this.config = new EasyObject({
      database: {
        host: 'localhost',
        port: 3306,
        credentials: {
          username: 'admin',
          password: 'secret'
        }
      },
      server: {
        port: 8080
      }
    });
  }
  
  getDatabaseConfig() {
    // 安全访问，即使配置不完整也不会报错
    return {
      host: this.config.database.host,
      port: this.config.database.port,
      username: this.config.database.credentials.username,
      password: this.config.database.credentials.password
    };
  }
  
  updateConfig(path, value) {
    // 动态更新配置
    const keys = path.split('.');
    let current = this.config;
    
    keys.slice(0, -1).forEach(key => {
      if (!current[key]) current[key] = new EasyObject();
      current = current[key];
    });
    
    current[keys[keys.length - 1]] = value;
  }
}

const manager = new ConfigManager();
console.log(manager.getDatabaseConfig());
// { host: 'localhost', port: 3306, username: 'admin', password: 'secret' }

// 安全访问不存在的配置
console.log(manager.config.logging.level); // undefined（不报错）
```

#### **API 响应处理**
```javascript
async function fetchUserData() {
  // 模拟 API 响应
  const apiResponse = {
    status: 'success',
    data: {
      user: {
        id: 123,
        profile: {
          name: 'Bob',
          email: 'bob@example.com'
        }
      }
    }
  };
  
  // 包装为 EasyObject
  const response = new EasyObject(apiResponse);
  
  // 安全访问，即使响应结构变化也不会报错
  console.log(response.data.user.profile.name); // 'Bob'
  console.log(response.data.user.profile.phone); // undefined（安全）
  
  // 可以安全地进行链式操作
  const phone = response.data.user.profile.phone || 'No phone provided';
  console.log(phone); // 'No phone provided'
  
  return response;
}

fetchUserData();
```

#### **动态表单数据**
```javascript
class FormData {
  constructor() {
    this.data = new EasyObject();
  }
  
  setField(path, value) {
    // 自动创建嵌套结构
    const keys = path.split('.');
    let current = this.data;
    
    keys.slice(0, -1).forEach(key => {
      if (!current[key]) {
        current[key] = new EasyObject();
      }
      current = current[key];
    });
    
    current[keys[keys.length - 1]] = value;
  }
  
  getField(path) {
    // 安全获取
    const keys = path.split('.');
    let current = this.data;
    
    for (const key of keys) {
      if (current[key] === undefined) {
        return undefined;
      }
      current = current[key];
    }
    
    return current;
  }
}

const form = new FormData();
form.setField('user.personal.name', 'Charlie');
form.setField('user.personal.age', 30);
form.setField('user.address.city', 'Shanghai');

console.log(form.getField('user.personal.name')); // 'Charlie'
console.log(form.getField('user.personal.phone')); // undefined（安全）
```

### **6. 注意事项**

```javascript
// 1. 原型链属性会被忽略
const obj = new EasyObject();
console.log(obj.toString); // undefined（而不是函数）
console.log(obj.valueOf);  // undefined

// 2. 性能考虑
// EasyObject 使用 Proxy，性能略低于普通对象
// 适合配置、API 响应等场景，不适合高频操作

// 3. 类型检查
const easyObj = new EasyObject({ value: 42 });
console.log(easyObj instanceof EasyObject); // true
console.log(typeof easyObj); // 'object'
console.log(Array.isArray(easyObj)); // false

// 4. 与数组一起使用
const withArray = new EasyObject({
  items: [1, 2, 3]
});
console.log(withArray.items.length); // 3
console.log(withArray.items.map(x => x * 2)); // [2, 4, 6]
```

### **7. 与原生对象的互操作**

```javascript
// EasyObject 可以与原生对象混合使用
const easyObj = new EasyObject({ a: 1 });
const nativeObj = { b: 2 };

// 合并对象
const merged = new EasyObject({ ...easyObj, ...nativeObj });
console.log(merged.a, merged.b); // 1, 2

// 作为函数参数
function processData(data) {
  // data 可以是 EasyObject 或普通对象
  console.log(data.value || data.getValue?.());
}

processData(new EasyObject({ value: 10 }));
processData({ getValue: () => 20 });
```

### **总结**

`easy-object` 的核心价值在于：
1. **安全访问**：访问不存在的属性时返回 `undefined` 而不报错
2. **点号友好**：支持深层嵌套属性的点号访问
3. **自动转换**：可以轻松与普通对象互相转换
4. **轻量级**：体积小，无依赖

适合用于：
- 配置管理
- API 响应处理
- 动态表单数据
- 不确定结构的动态数据

避免用于：
- 需要极致性能的场景
- 大量数据的高频操作
- 需要严格类型检查的 TypeScript 项目（除非有完善的类型定义）