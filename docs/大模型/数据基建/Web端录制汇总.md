# Web端录制汇总

基于我们之前的讨论，以及 Chrome 扩展能提供的能力范围，我为你完整地梳理了**可以通过插件监控到的所有内容**。这分为五大类，你可以根据自己的需求组合使用。

### 📡 一、网络请求层（API 调用）
这是 MeterSphere 原有插件的核心能力，也是性能数据的主要来源。

| 监控内容                     | 说明                                         | 实现 API                                                     |
| :--------------------------- | :------------------------------------------- | :----------------------------------------------------------- |
| **请求 URL、方法、头、正文** | 捕获 HTTP/HTTPS 请求的完整元数据。           | `webRequest.onBeforeRequest`                                 |
| **响应状态码、响应头**       | 获取服务器返回的状态码和头部信息。           | `webRequest.onHeadersReceived`                               |
| **响应体（Body）**           | 获取服务器返回的完整原始数据（需高级方案）。 | `chrome.debugger` + CDP 或 `devtools.network`                |
| **请求耗时**                 | 计算从发起、连接、接收等各阶段耗时。         | `webRequest` 各事件时间差                                    |
| **WebSocket 帧**             | 捕获 WebSocket 连接发送和接收的消息帧。      | `chrome.webRequest` 不直接支持，需用 `chrome.debugger` + CDP |
| **Fetch / XHR 请求**         | 特指由 JavaScript 发起的异步请求。           | 同上，`webRequest` 按类型过滤                                |
| **图片、CSS、JS 等静态资源** | 所有浏览器加载的资源文件。                   | `webRequest` 监听 `<all_urls>` 并按类型过滤                  |

### 🌐 二、页面导航与生命周期（标签页/窗口变化）
用于记录用户“去了哪里”、“打开了什么”。

| 监控内容                            | 说明                                                     | 实现 API                                                     |
| :---------------------------------- | :------------------------------------------------------- | :----------------------------------------------------------- |
| **新标签页创建**                    | 用户点击链接或通过 `window.open` 等行为打开新标签页。    | `tabs.onCreated`                                             |
| **新窗口创建**                      | 新浏览器窗口打开（包括弹窗）。                           | `windows.onCreated`                                          |
| **标签页关闭**                      | 用户关闭标签页。                                         | `tabs.onRemoved`                                             |
| **页面开始加载**                    | 浏览器开始解析新文档，可用于区分是刷新、前进还是后退。   | `webNavigation.onBeforeNavigate`                             |
| **页面提交（已收到响应）**          | 文档已收到首个字节，即将开始渲染。比 `onUpdated` 更早。  | `webNavigation.onCommitted`                                  |
| **页面完全加载完成**                | 页面及其所有依赖资源（CSS、图片等）加载完毕。            | `tabs.onUpdated` (status === 'complete')                     |
| **页面 DOM 就绪**                   | DOM 结构解析完毕，但图片等可能未加载。                   | `tabs.onUpdated` (status === 'loading') 或 `webNavigation.onDOMContentLoaded` |
| **页面标题变化**                    | 页面 `<title>` 更新（对捕获用户上下文有用）。            | `tabs.onUpdated` (changeInfo.title)                          |
| **地址栏 URL 变化（传统跳转）**     | 整个页面刷新或跳转新 URL。                               | `webNavigation.onCommitted` / `tabs.onUpdated`               |
| **SPA 路由变化（无刷新 URL 变更）** | 单页应用通过 `history.pushState` 等 API 实现的虚拟跳转。 | `webNavigation.onHistoryStateUpdated`                        |
| **前进 / 后退导航**                 | 用户点击浏览器前进/后退按钮导致的历史记录切换。          | `webNavigation.onCommitted` (transitionType 包含 `forward_back`) |

### 📄 三、页面内容与 DOM 变化
捕获“页面里有什么”、“发生了什么改变”。

| 监控内容                   | 说明                                                         | 实现 API / 方法                                              |
| :------------------------- | :----------------------------------------------------------- | :----------------------------------------------------------- |
| **整个页面的 HTML 源代码** | 当前文档的完整 outerHTML。                                   | `chrome.scripting.executeScript` 注入 `() => document.documentElement.outerHTML` |
| **页面的视觉快照（截图）** | 对当前可视区域或整个页面进行截图。                           | `tabs.captureVisibleTab`                                     |
| **DOM 节点增删改**         | 监控页面某区域的元素被添加、移除或属性变化（如动态加载的内容）。 | Content Script + `MutationObserver`                          |
| **页面滚动位置**           | 用户滚动到了页面哪个位置。                                   | Content Script 监听 `scroll` 事件                            |
| **表单输入内容**           | 用户填写的文本框、选择的单选/多选框等（需注意隐私合规）。    | Content Script 监听 `input`, `change` 事件                   |
| **点击、双击、右键**       | 用户与页面元素的交互位置和目标。                             | Content Script 监听鼠标事件                                  |
| **用户键盘输入**           | 用户敲击了哪些按键（同样需注意隐私）。                       | Content Script 监听 `keydown`, `keyup`                       |
| **焦点变化**               | 用户聚焦或离开某个输入框。                                   | Content Script 监听 `focus`, `blur`                          |
| **控制台输出日志**         | 页面中 `console.log`, `error` 等输出的内容。                 | 通过 Content Script 重写 `console` 方法，或使用 `chrome.debugger` + CDP 的 `Runtime` 域 |
| **JavaScript 异常**        | 页面运行时未捕获的异常。                                     | Content Script 监听 `window.onerror` 或 `unhandledrejection` |
| **页面性能指标**           | 如 FCP, LCP, TTI 等 Web Vitals。                             | Content Script 使用 PerformanceObserver API                  |

### 🧩 四、浏览器存储与本地数据
用于监控网站如何存储用户数据（适合做用户行为回放或一致性校验）。

| 监控内容                               | 说明                                 | 实现 API / 方法                               |
| :------------------------------------- | :----------------------------------- | :-------------------------------------------- |
| **Cookie 变更**                        | Cookie 被添加、删除或修改。          | `cookies.onChanged` API（需 `cookies` 权限）  |
| **LocalStorage / SessionStorage 变更** | 页面通过 `setItem` 等修改本地存储。  | Content Script 代理或重写 Storage 的原生方法  |
| **IndexedDB 操作**                     | 数据库的增删改查（较复杂，需 CDP）。 | `chrome.debugger` + CDP 的 IndexedDB 域       |
| **Cache API 操作**                     | 网站主动缓存的资源。                 | 重写 `cache` 对象方法（较麻烦，一般较少监控） |

### ⚙️ 五、浏览器自身行为与环境
用于诊断浏览器环境对应用的影响。

| 监控内容                       | 说明                                     | 实现 API                                                  |
| :----------------------------- | :--------------------------------------- | :-------------------------------------------------------- |
| **浏览器语言、用户代理**       | 当前浏览器的语言设置、UA 字符串。        | `chrome.i18n` 或 `navigator` 信息（通过 Content Script）  |
| **标签页是否激活（可见性）**   | 用户是否正在看该标签页。                 | `tabs.onActivated` / `visibilityState` via Content Script |
| **窗口大小变化**               | 浏览器窗口的宽高变化（响应式布局测试）。 | `windows.onBoundsChanged`                                 |
| **设备像素比、色深等**         | 屏幕硬件信息。                           | Content Script 读取 `window.devicePixelRatio`             |
| **扩展本身的安装、更新、卸载** | 监控插件自己的生命周期。                 | `runtime.onInstalled`                                     |
| **网络连接状态**               | 浏览器是否在线（离线/在线事件）。        | `window.ononline` / `window.onoffline` via Content Script |

### 📌 重点提示

1. **权限声明**：上述大部分功能都需要在 `manifest.json` 中声明相应的权限，例如 `webRequest`、`tabs`、`webNavigation`、`cookies`、`host_permissions`（如 `<all_urls>`）等。
2. **隐私合规**：监控表单输入、键盘事件、响应体内容等可能涉及用户敏感信息，务必在插件中明确告知用户并获得同意。
3. **性能影响**：全量监控所有内容会产生海量数据，严重影响性能。建议通过**过滤规则**（域名、URL 类型）、**采样率**、**批量上传**和**用户可配置开关**来控制。
4. **Manifest V3 限制**：部分旧版 API（如 `background` 持久页面）已被 `Service Worker` 替代，部分功能需要改用 `chrome.scripting` 或 `chrome.offscreen`（离屏文档）来实现。

如果你希望快速实现一个“录制一切”的原型，可以先从**网络请求 + SPA 路由 + 页面 HTML** 这三类开始，它们已经能覆盖绝大部分用户操作痕迹。