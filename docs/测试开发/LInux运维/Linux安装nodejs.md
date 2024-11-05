要在 Linux 上安装 `Node.js 18.18.0`，您可以使用多种方法，其中最常见的是使用 **Node Version Manager (NVM)** 来管理不同版本的 Node.js。以下是几种常见的安装方法。

### 方法 1: 使用 NVM 安装 Node.js 18.18.0

**步骤 1: 安装 NVM**
1. 安装 `nvm`（如果尚未安装）：
   
   执行以下命令来下载并安装 `nvm`：

   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
   ```

2. 安装完成后，重新加载 shell 配置文件：

   ```bash
   source ~/.bashrc
   ```

   或者，如果您使用的是 Zsh：

   ```bash
   source ~/.zshrc
   ```

3. 验证 `nvm` 是否安装成功：

   ```bash
   nvm --version
   ```

   如果显示版本号，则表示安装成功。

**步骤 2: 使用 NVM 安装 Node.js 18.18.0**
1. 使用 `nvm` 安装 Node.js 18.18.0：

   ```bash
   nvm install 18.18.0
   ```

2. 安装完成后，使用以下命令设置为默认版本：

   ```bash
   nvm use 18.18.0
   ```

3. 验证安装是否成功：

   ```bash
   node -v
   ```

   这应该显示类似于 `v18.18.0` 的版本号。

---

### 方法 2: 使用包管理器（如 `yum` 或 `apt`）

**对于 CentOS/RHEL（使用 `yum`）**

1. 安装 EPEL 仓库（如果尚未安装）：

   ```bash
   sudo yum install epel-release -y
   ```

2. 添加 NodeSource 仓库来获取 Node.js 18.x 版本：

   ```bash
   curl -sL https://rpm.nodesource.com/setup_18.x | sudo bash -
   ```

3. 安装 Node.js 18.18.0：

   ```bash
   sudo yum install nodejs -y
   ```

4. 验证安装：

   ```bash
   node -v
   ```

**对于 Ubuntu/Debian（使用 `apt`）**

1. 添加 NodeSource 仓库：

   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   ```

2. 安装 Node.js 18.x 版本：

   ```bash
   sudo apt install -y nodejs
   ```

3. 验证安装：

   ```bash
   node -v
   ```

---

### 方法 3: 手动安装 Node.js

如果您不想使用 NVM 或包管理器，也可以手动安装 Node.js：

1. 访问 Node.js 官方下载页面：[Node.js Download](https://nodejs.org/en/download/)

2. 选择适合 Linux 系统的 `18.18.0` 版本的 `.tar.xz` 文件。

3. 下载并解压文件：

   ```bash
   wget https://nodejs.org/dist/v18.18.0/node-v18.18.0-linux-x64.tar.xz
   tar -xJf node-v18.18.0-linux-x64.tar.xz
   ```

4. 将解压后的文件移动到 `/usr/local/` 目录，并配置环境变量：

   ```bash
   sudo mv node-v18.18.0-linux-x64 /usr/local/node
   ```

5. 配置环境变量：

   ```bash
   echo "export PATH=/usr/local/node/bin:$PATH" >> ~/.bashrc
   source ~/.bashrc
   ```

6. 验证安装：

   ```bash
   node -v
   ```

---

### 卸载 Node.js

1. **卸载 Node.js**： 在终端运行以下命令来卸载 Node.js：

   ```
   bash复制代码sudo yum remove nodejs
   ```

   这将会卸载 `nodejs` 包和它相关的依赖项。

2. **验证是否卸载成功**： 卸载完成后，您可以使用以下命令来验证 Node.js 是否已经被卸载：

   ```
   bash复制代码node -v
   ```

   如果 Node.js 已成功卸载，您应该会看到类似以下的错误信息：

   ```
   bash复制代码bash: node: command not found
   ```

3. **清理缓存（可选）**： 如果您希望清理 `yum` 缓存，可以使用以下命令：

   ```
   bash复制代码sudo yum clean all
   ```

这会移除安装过程中使用的缓存文件。

### 总结

推荐使用 **NVM** 来安装和管理 Node.js 的不同版本，尤其是当您需要在不同版本之间切换时。如果您希望在服务器上安装并固定某个版本的 Node.js，使用包管理器（如 `yum` 或 `apt`）也是一种有效的选择。如果您喜欢手动控制安装过程，可以通过下载并解压 `.tar.xz` 文件来手动安装。

选择最适合您需求的方式来安装 Node.js 18.18.0。