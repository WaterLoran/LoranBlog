以下为针对 **URL跳转漏洞（开放重定向）** 设计的详细测试用例，严格遵循测试步骤与期望结果一一对应的格式：

---

### **测试用例 1：基础外部域名跳转检测**  
**测试步骤**  
[1] 在目标网站找到包含跳转参数的页面（如登录页、退出页、广告链接）  
[2] 修改跳转参数值为外部恶意域名：`?redirect_url=https://evil-phish.com`  
[3] 提交请求并观察浏览器地址栏变化  
[4] 检查网络请求中`Location`响应头的值  

**期望结果**  
[1] 系统提供明确的跳转参数文档或设计  
[2] 跳转参数拒绝外部域名，返回400错误  
[3] 浏览器地址栏**未显示**恶意域名  
[4] `Location`头**不存在**或仅包含安全域名  

---

### **测试用例 2：编码混淆绕过测试**  
**测试步骤**  
[1] 对恶意域名进行URL编码：`?next=https%3A%2F%2Fattacker.net`  
[2] 使用双重编码：`?url=https%25253A%25252F%25252Fmalicious.com`  
[3] 尝试UTF-8混淆：`?target=аttаckеr.com`（使用西里尔字符）  
[4] 提交特殊构造：`?r=/\evil.com`（路径混淆）  

**期望结果**  
[1] 系统**完全解码**后验证目标域名  
[2] 双重编码被识别为非法输入  
[3] 非常规字符触发**域名格式校验**失败  
[4] 路径混淆被拒绝，保持原页面  

---

### **测试用例 3：协议滥用与XSS组合**  
**测试步骤**  
[1] 测试JavaScript协议：`?redirect=javascript:alert(document.cookie)`  
[2] 尝试Data协议：`?url=data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg`  
[3] 构造伪登录页：`?to=http://target.com.login@evil.com`  
[4] 注入HTML跳转：`<meta http-equiv="refresh" content="0; url=https://evil.com">`  

**期望结果**  
[1] `javascript:` 协议被**完全禁止**  
[2] `data:` 协议触发内容类型检测失败  
[3] `@`符号分割的域名被**解析剥离**  
[4] HTML标签被转义显示为文本  

---

### **测试用例 4：业务链式跳转测试**  
**测试步骤**  
[1] 在OAuth回调中修改`redirect_uri=https://attacker.com`  
[2] 测试支付完成跳转：`?return_url=//evil.com`（协议继承）  
[3] 构造双重跳转：`?first=trusted.com&second=https://malicious.com`  
[4] 模拟短链服务：`/s?t=https%3A%2F%2Fphish.com%2Ffake-login`  

**期望结果**  
[1] OAuth回调地址**严格匹配**预注册域名  
[2] 协议继承被识别为外部请求  
[3] 链式跳转**仅允许单次**且目标需验证  
[4] 短链目标需经过**用户确认页面**  

---

### **测试用例 5：防御机制深度验证**  
**测试步骤**  
[1] 尝试白名单域名绕过：`?next=https://target.com.evil.com`  
[2] 删除Referer头后提交跳转请求  
[3] 测试映射ID跳转：`?page_id=EXTERNAL_LINK`（后端映射外部地址）  
[4] 验证跳转前的用户确认流程  

**期望结果**  
[1] 域名后缀检查**拒绝非常规组合**  
[2] 跳转逻辑**不依赖Referer**头验证  
[3] 映射ID机制**禁止外部域名**关联  
[4] 所有外部跳转**强制显示确认提示页**  

---

### **测试用例 6：移动端与API场景**  
**测试步骤**  
[1] 修改APP深层链接：`myapp://open?url=https://evil.com`  
[2] 测试JSON响应跳转：`{"redirect": "https://phish.com"}`  
[3] 篡改HTTP头跳转：`Link: <https://malicious.com>; rel=redirect`  
[4] 提交非标准端口地址：`?to=http://legit-site.com:8080`  

**期望结果**  
[1] APP协议处理**过滤外部链接**  
[2] JSON接口**不执行**浏览器跳转  
[3] 自定义头跳转被**忽略**  
[4] 端口号在白名单**显式声明**  

---

### **防护标准**  
1. **域名白名单**  
   ```regex
   ^(https:\/\/)?([a-z0-9-]+\.)?example\.com(\/.*)?$
   ```
2. **用户确认流程**  
   ```html
   <!-- 跳转确认页面 -->
   <div class="warning">
     即将离开本站：<span id="display-url"></span>
     <button onclick="safeRedirect()">继续</button>
   </div>
   ```
3. **安全响应头**  
   ```
   Content-Security-Policy: default-src 'self'
   X-Content-Type-Options: nosniff
   ```

> **测试工具推荐**：  
> - Burp Suite：`Proxy → Response modification` 修改Location头  
> - OWASP ZAP：`Forced Browse` 扫描跳转端点  
> - 浏览器控制台：监测`window.location`变化