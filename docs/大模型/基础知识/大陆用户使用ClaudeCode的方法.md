# 大陆用户使用ClaudeCode的方法

在中国大陆使用 Claude Code 并替换为国内模型，主要思路是通过一些技巧将其“大脑”设置为你自己的智谱 API 来实现。目前最主流、成功率最高的方式是 **修改配置文件**，其他方式可作为备选参考。

### ⚙️ 核心方法：修改配置文件，一步到位 (CLI用户首选)

这是目前适配度最高、最通用的办法，能同时实现“绕过登录”和“接入智谱 API”的目标。

1.  **准备工作**：确保已安装 Node.js 环境，并使用 `npm install -g @anthropic-ai/claude-code` 命令成功安装 Claude Code。

2.  **获取智谱 API Key**：访问智谱AI开放平台 ([bigmodel.cn](http://bigmodel.cn))，注册、登录并实名认证后，创建一个新的 API Key 并妥善保存。

3.  **编辑配置文件 (关键步骤)**：
    打开以下两个文件（若没有则新建），进行精确配置：
    *   **`settings.json` 文件**：路径通常为 `C:\Users\你的用户名\.claude\settings.json` (Windows) 或 `~/.claude/settings.json` (Mac/Linux)。将其内容设置如下，并替换 `YOUR_ZHIPU_API_KEY`：
        ```json
        {
           "env": {
              "ANTHROPIC_AUTH_TOKEN": "YOUR_ZHIPU_API_KEY",
              "ANTHROPIC_BASE_URL": "https://open.bigmodel.cn/api/anthropic",
              "ANTHROPIC_MODEL": "glm-4-flash"
           }
        }
        ```
        > 智谱提供多个模型可选，如追求最佳性能，可参考使用 `glm-4.7` 或最新的 `glm-5`；追求免费体验，`glm-4-flash` 是一个不错的选择。

    *   **`.claude.json` 文件**：路径为用户根目录 `C:\Users\你的用户名\.claude.json` (Windows) 或 `~/.claude.json` (Mac/Linux)。添加以下内容以跳过首次登录引导：
        ```json
        {
           "hasCompletedOnboarding": true
        }
        ```

4.  **启动验证**：配置完成后，打开新的终端，cd 到你的项目目录，输入 `claude` 命令。如果提示 "Do you want to use this API key?"，选择 "Yes" 即可开始使用。

---

### 🛠️ 备选方案：选择最适合你的工具

除了手动配置，你也可以根据需要，参考以下四种主流思路：

#### **方案一：桌面版应用 (GUI用户优选)**

最新的 Claude Code **桌面版**提供了官方支持的 `Developer Mode`（开发者模式），操作直观，但并非所有版本都包含。
*   在桌面版菜单栏 `Help → Troubleshooting` 中启用 `Developer Mode`。
*   重启后，在 `Developer` 菜单中找到 `Configure Third-Party Inference`。
*   在弹出的窗口中选择 `Gateway` 模式，填入智谱 AI 的 API 地址和 Key。

#### **方案二：OpenClaude CN (体验统一工具)**

这是一个NPM封装的工具包，本身作为一个网关（Gateway），能翻译和处理各种国产模型请求。安装后运行 `openclaude-cn`，其向导会引导你完成配置。

#### **方案三：CC-Switch (便捷模型切换)**

一个开源的桌面图形软件。主要提供图形化界面，让用户可以通过下拉菜单和点击按钮来管理不同大模型的 API 配置，实现一键切换。

#### **方案四：开源国产替代品 (无需登录替代)**

除了使用 Claude Code，还可以考虑由纯 Rust 构建、MIT 开源的国产替代品 [AtomCode](https://github.com/atomgit/atomcode)，原生支持国产模型。

---

### 💎 推荐与总结

综合来看，最推荐的还是 **通过修改配置文件接入智谱API**。但如果你想了解更全面的信息，可以参考一下 **两种主流方案定位**：

*   **手动修改配置文件**：技术门槛低，**官方原生工具**，稳定性最佳，适用于 **CLI 重度用户**和追求 **稳定性** 的开发者。
*   **桌面版 Developer Mode**：**界面操作直观**，有官方原生支持，适合 **GUI 用户**。

建议从最通用的**配置文件方法**开始尝试。如果在配置过程中遇到任何问题，比如找不到对应文件、配置文件修改不生效等，可以随时带着具体的信息来问我。祝使用愉快～