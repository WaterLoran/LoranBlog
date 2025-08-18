Allure 生成的报告目录中，`report` 目录（或你指定的输出目录）包含以下关键子目录和文件，每个都有特定用途：

---

### **核心目录结构说明**
```bash
report/
├── data/                  # 核心测试数据（JSON格式）
├── export/                # 导出文件（如PDF报告）
├── history/               # 历史执行数据（用于趋势图）
├── plugins/               # 插件资源（JS/CSS等）
├── widgets/               # 首页小部件数据
├── index.html             # 报告主入口
├── styles.css             # 全局样式
└── favicon.ico            # 网站图标
```

---

### **详细文件说明**

#### **1. `data/` 目录**  
存储报告的核心数据源（JSON格式），UI 通过这些文件渲染内容：
- **`test-cases/`**  
  - 每个测试用例的详细数据（如 `c3d0b5a0.json`）  
  - 包含：步骤描述、状态、附件、参数化数据、历史记录等。
- **`attachments/`**  
  - 测试中的附件（截图、日志等），文件名为 UUID（如 `a1b2c3d4.png`）。
- **`suites.json`**  
  测试套件的层级结构（按包/类/方法组织）。
- **`behaviors.json`**  
  行为驱动开发（BDD）数据（Epic/Feature/Story 层级）。
- **`categories.json`**  
  自定义分类规则（如：`Product Defect`/`Test Defect`）。
- **`executors.json`**  
  执行环境信息（CI 构建链接、Jenkins 任务等）。
- **`history-trend.json`**  
  当前构建的统计数据（总用例数、通过率等，用于历史趋势图）。

---

#### **2. `history/` 目录**  
**用于历史趋势图的核心数据**：  
- 每次生成新报告时，会将当前构建的 `history-trend.json` **复制到此目录**（文件名格式：`{build_number}-history-trend.json`）。  
- 同时保存每个测试用例的**历史状态**（`{test_case_id}-history.json`）。  
- **作用**：  
  - 当生成新报告时，Allure 会读取此目录下的所有文件，聚合历史数据渲染趋势图。  
  - 若删除此目录，历史趋势图将消失。

---

#### **3. `widgets/` 目录**  
首页小部件的 JSON 数据源：  
- **`summary.json`**：测试结果摘要（通过/失败/跳过数量）。  
- **`duration.json`**：测试执行时长分布。  
- **`categories.json`**：按分类的失败统计。  
- **`suites.json`**：套件层级概览。  
- **`behaviors.json`**：Epic/Feature 覆盖情况。  
- **`environment.json`**：环境变量（来自 `environment.properties`）。

---

#### **4. `plugins/` 目录**  
扩展插件资源（JS/CSS/图片等）：  
- 例如：`custom-logo-plugin.js`（自定义 Logo 插件）。  
- 官方插件如：`behaviors-plugin`, `packages-plugin` 等。

---

#### **5. `export/` 目录**  
**手动导出报告时生成**（非默认存在）：  
- 通过报告页面点击 **Export → PDF** 生成 `report.pdf`。  
- 其他格式（如 CSV）也会保存在此。

---

#### **6. 根目录关键文件**  
- **`index.html`**：  
  报告单页应用（SPA）主入口，加载所有 JS/CSS 资源。  
- **`app.js`**：  
  报告的核心 JavaScript 逻辑（渲染导航、图表等）。  
- **`styles.css`**：  
  全局样式表（可覆盖自定义样式）。  
- **`favicon.ico`**：  
  Allure 的默认网站图标。

---

### **技术原理总结**
1. **数据驱动**：  
   UI 通过 `data/` 和 `widgets/` 中的 JSON 文件动态渲染内容，无需后端服务。  
2. **历史趋势实现**：  
   - 依赖 `history/` 目录下累积的 `{build_number}-history-trend.json` 文件。  
   - 新报告读取并聚合这些文件生成趋势图。  
3. **静态化部署**：  
   整个 `report/` 目录可托管到任何 Web 服务器（如 Nginx/S3/GitHub Pages）。  
4. **扩展性**：  
   - 通过 `plugins/` 添加自定义插件。  
   - 通过覆盖 `styles.css` 定制样式。

> ⚠️ **注意事项**：  
> - 若需保留历史趋势，每次生成新报告时需**保留 `history/` 目录**（通过 `--history-dir` 指定路径）。  
> - 附件（`data/attachments/`）需随报告一起部署，否则无法加载。