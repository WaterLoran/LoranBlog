### **Windows 上设置 pip 源**

#### **1. 找到或创建配置文件路径**
在 Windows 系统中，`pip` 的配置文件可以放在以下路径：
```plaintext
C:\Users\<用户名>\pip\pip.ini
```

例如，当前用户为 `john`，则完整路径为：
```plaintext
C:\Users\john\pip\pip.ini
```

#### **2. 创建或编辑 `pip.ini` 文件**
1. 打开 `C:\Users\john` 目录（`john` 是当前用户名）。
2. 创建一个名为 `pip` 的文件夹（如果不存在）。
3. 在 `pip` 文件夹中，创建一个名为 `pip.ini` 的文件。
4. 用记事本或代码编辑器打开 `pip.ini`，添加以下内容（以清华大学镜像为例）：
   ```ini
   [global]
   index-url = https://pypi.tuna.tsinghua.edu.cn/simple/

   [install]
   trusted-host = pypi.tuna.tsinghua.edu.cn
   ```

---

### **3. 常用国内镜像源**
| 镜像源       | 配置地址                                    |
| ------------ | ------------------------------------------- |
| 阿里云       | `https://mirrors.aliyun.com/pypi/simple/`   |
| 清华大学     | `https://pypi.tuna.tsinghua.edu.cn/simple/` |
| 中国科技大学 | `https://pypi.mirrors.ustc.edu.cn/simple/`  |
| 豆瓣         | `https://pypi.douban.com/simple/`           |

---

### **4. 验证配置是否生效**
在命令提示符中运行以下命令：
```bash
pip config list
```

输出中应包含以下内容：
```plaintext
global.index-url='https://pypi.tuna.tsinghua.edu.cn/simple/'
```

---

### **5. 临时换源（不修改配置文件）**

如果您希望临时使用其他镜像源，可以通过 `-i` 参数指定：
```bash
pip install <package_name> -i <镜像地址>
```

示例：
```bash
pip install numpy -i https://mirrors.aliyun.com/pypi/simple/
```

---

### **6. 配置优先级说明**
`pip` 会按以下顺序加载配置文件，优先级由高到低：
1. 当前用户目录下的 `pip.ini` 文件：
   ```plaintext
   C:\Users\<用户名>\pip\pip.ini
   ```
2. `AppData` 下的全局配置文件：
   ```plaintext
   %APPDATA%\pip\pip.ini
   ```
3. 系统范围内的全局配置（通常在 Python 安装目录下的 `pip.ini`）。

通过使用用户主目录的路径（如 `C:\Users\john\pip\pip.ini`），可以更简单地管理 `pip` 的配置文件，无需依赖 `AppData` 目录。

---

这个方式更加简洁实用，更新后的文档可以直接满足您的需求！