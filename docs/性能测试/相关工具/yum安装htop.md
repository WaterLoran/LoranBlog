你可以通过 `yum` 安装 `htop` 工具。`htop` 是一个交互式的系统监控工具，比 `top` 更加直观，提供了更丰富的系统信息。

### 安装步骤

1. **更新系统的包索引**：
   首先，建议更新系统的包索引：
   ```bash
   sudo yum update
   ```

2. **安装 `htop`**：
   在 CentOS/RHEL 系统上，默认的 `yum` 源库可能没有 `htop`，你需要启用 `EPEL`（Extra Packages for Enterprise Linux）仓库。

   安装 `EPEL` 仓库：
   ```bash
   sudo yum install epel-release
   ```

   安装 `htop`：
   ```bash
   sudo yum install htop
   ```

3. **运行 `htop`**：
   安装完成后，运行 `htop`：
   ```bash
   htop
   ```

这将启动 `htop` 工具，显示系统资源的使用情况，包括 CPU、内存、任务等信息。你可以使用键盘快捷键与 `htop` 进行交互，如按 `F10` 退出，按 `F6` 排序等。