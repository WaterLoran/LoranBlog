# Gatling集成到CICD

---

### 核心概念与目标

在 CI 中运行 Gatling 的目标通常不是进行大规模的压力测试（这需要独立的环境），而是：
1.  **回归检测**：确保新代码提交没有引入明显的性能回归。
2.  **基准测试**：建立性能基准，监控关键指标（如 p95 响应时间、错误率）的变化趋势。
3.  **快速反馈**：为开发团队提供快速的性能反馈，通常是在预发布或测试环境中进行。

---

### 示例 1: 使用 GitHub Actions

这是在开源项目或使用 GitHub 的公司中最常见的方式。`github/workflows/gatling.yml` 文件内容如下：

```yaml
name: Performance Tests with Gatling

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
  # 也可以手动触发
  workflow_dispatch:

jobs:
  performance-tests:
    name: Run Gatling Performance Tests
    # 通常在 Linux 环境下运行
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Run Gatling tests with Maven
        run: mvn gatling:test -Dgatling.simulationClass=com.myapp.ci.CIPerformanceTest
        # 传递环境变量给测试脚本，例如测试环境的URL
        env:
          APP_BASE_URL: ${{ secrets.TEST_ENV_URL }}
          TEST_USER_API_KEY: ${{ secrets.TEST_USER_API_KEY }}

      - name: Upload Gatling HTML Report
        # 上传报告作为artifact，可供后续下载查看
        uses: actions/upload-artifact@v3
        with:
          name: gatling-report
          path: target/gatling/
          # 可选：如果报告很大，可以只上传最新的一个
          # path: target/gatling/*/simulation.log

      - name: (Optional) Publish HTML Report
        # 使用第三方Action将HTML报告发布到GitHub Pages或提供临时链接
        # 例如：https://github.com/peaceiris/actions-gh-pages
        uses: peaceiris/actions-gh-pages@v3
        if: always() # 即使测试失败也发布报告
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./target/gatling/your-simulation-20240301-123456
          # 或者使用 find 命令动态获取最新目录
          # publish_dir: ./target/gatling/$(ls -td ./target/gatling/*/ | head -n 1)

      - name: Fail build on performance regression
        # 一个简单的脚本，解析simulation.log或根据断言结果决定CI成败
        run: |
          if grep -q "Please open the following file" target/gatling/*/simulation.log; then
            echo "Gatling tests completed. Check the report for details."
            # 如果只想在断言失败时让CI失败，Gatling的maven插件默认就会这样做
            # 所以这步可能不需要，除非你有自定义逻辑
          else
            echo "Gatling simulation failed to run."
            exit 1
          fi
```

**关键点：**
*   ** Secrets (`secrets.TEST_ENV_URL`)**: 用于安全地存储测试环境的凭据和URL，避免硬编码。
*   **Artifacts**: 将 HTML 报告保存起来，开发者可以从 GitHub Actions 界面下载并查看详细的测试结果。
*   **发布报告**: 可以配置为将报告自动发布到 GitHub Pages，提供一个可直接访问的 URL。
*   **Maven 插件**: `mvn gatling:test` 会运行所有 Simulation 或指定的一个。如果脚本中的**断言失败**，Maven 构建会失败，从而**令 CI 流水线失败**，这是实现自动化回归检测的核心。

---

### 示例 2: 使用 Jenkins

Jenkins 是经典的企业级 CI/CD 工具，通过 `Jenkinsfile` (Declarative Pipeline) 实现。

```groovy
pipeline {
    agent any
    tools {
        // 在Jenkins中预配置的Maven版本
        maven 'M3'
    }
    environment {
        // 在Jenkins的凭据管理中配置
        APP_BASE_URL = credentials('test-env-url')
        API_KEY = credentials('test-api-key')
    }
    stages {
        stage('Build') {
            steps {
                sh 'mvn clean compile'
            }
        }
        stage('Performance Test') {
            steps {
                // 运行Gatling测试
                sh 'mvn gatling:test -Dgatling.simulationClass=com.myapp.ci.JenkinsPerformanceTest'
            }
        }
    }
    post {
        always {
            // 1. 发布HTML报告 (需要安装 "HTML Publisher" 插件)
            publishHTML(target: [
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'target/gatling',
                reportFiles: 'index.html',
                reportName: 'Gatling HTML Report'
            ])

            // 2. 归档JUnit格式的报告 (可选)
            junit 'target/gatling/**/simulation.log' // 注意：这不是标准的JUnit XML，可能需要转换

            // 3. 存档Gatling报告目录 (备选方案)
            archiveArtifacts artifacts: 'target/gatling/**/*', fingerprint: true
        }
        failure {
            // 当性能测试失败（断言失败）时通知团队
            emailext (
                subject: "🚨 Performance Regression Detected in Build: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: "The Gatling performance tests have failed. Please check the report: ${env.BUILD_URL}HTML_Report/",
                to: "dev-team@mycompany.com"
            )
        }
    }
}
```

**关键点：**
*   **`credentials()`**: Jenkins 的安全凭据管理功能。
*   **HTML Publisher Plugin**: 这是**最重要的插件**，它会在 Jenkins job 页面生成一个直接可点击的链接，用于查看漂亮的 HTML 报告，体验极佳。
*   **Post Actions**: 使用 `post { always { ... } }` 确保无论测试成功与否，报告都会被保存和发布。
*   **通知**: 在失败时自动发送邮件告警。

---

### 示例 3: 使用 GitLab CI

GitLab CI 使用 `.gitlab-ci.yml` 文件进行配置。

```yaml
stages:
  - build
  - performance

variables:
  # 设置Maven缓存，加速构建
  MAVEN_OPTS: >-
    -Dmaven.repo.local=.m2/repository
    -Dorg.slf4j.simpleLogger.log.org.apache.maven.cli.transfer.Slf4jMavenTransferListener=WARN
    -Dorg.slf4j.simpleLogger.showDateTime=true
    -Djava.awt.headless=true
  MAVEN_CLI_OPTS: >-
    -s .m2/settings.xml
    --batch-mode
    --errors
    --fail-at-end
    --show-version
    -DinstallAtEnd=true
    -DdeployAtEnd=true

# 缓存Maven依赖
cache:
  key: "${CI_JOB_NAME}"
  paths:
    - .m2/repository

build:
  stage: build
  image: maven:3.9-eclipse-temurin-17
  script:
    - mvn $MAVEN_CLI_OPTS compile

performance-test:
  stage: performance
  image: maven:3.9-eclipse-temurin-17
  script:
    - mvn $MAVEN_CLI_OPTS gatling:test -Dgatling.simulationClass=com.myapp.ci.GitLabPerformanceTest
    # 重命名报告目录，以便Artifacts有固定的路径
    - mv target/gatleytics/ target/public/
  artifacts:
    paths:
      - target/public/ # 将整个报告目录暴露为Artifacts
    expire_in: 1 week # 报告保留一周
    when: always
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

**关键点：**
*   **Artifacts**: GitLab 会自动将 `target/public/` 目录提供下载，并在 Merge Request 或 Pipeline 界面显示一个 **“Browse”** 按钮，可以直接查看报告。
*   **Rules**: 配置为在合并请求 (Merge Request) 和默认分支（如 `main`）提交时触发，非常灵活。
*   **Cache**: 缓存 Maven 依赖项可以显著加快后续流水线的运行速度。

---

### 高级实践与优化建议

1.  **使用 Docker**：
    *   在所有 CI 示例中，强烈建议使用 Docker 镜像（如 `maven:3.9-eclipse-temurin-17`）作为运行环境。这能保证环境的一致性，避免“在我机器上是好的”问题。

2.  **环境管理**：
    *   **永远不要在 CI 中对生产环境进行测试**。
    *   使用一个独立的、稳定的预发布 (Staging) 环境来运行 CI 性能测试。
    *   通过环境变量或 CI 的 Secrets 管理功能将环境 URL 和凭据传递给 Gatling 脚本。

3.  **测试数据管理**：
    *   CI 中的测试需要是**幂等的**。使用专门的测试账户，并在测试前后清理测试数据（如通过 API 调用清理创建的订单）。
    *   避免测试数据相互冲突。

4.  **失败条件（断言）**：
    *   在 Gatling Simulation 中必须定义严格的断言（Assertions），例如：
        ```scala
        .assertions(
          global.responseTime.percentile(95).lte(1000), // p95 < 1秒
          global.failedRequests.percent.lte(1.0) // 错误率 < 1%
        )
        ```
    *   当这些断言不满足时，Gatling Maven 插件会以非零退出码退出，从而**自动令 CI 任务失败**。

5.  **趋势分析**：
    *   简单的 CI 测试只能给出“通过/失败”的结果。对于更高级的趋势分析（如响应时间随时间的变化），需要将 Gatling 的日志数据发送到外部监控系统，如：
        *   **Gatling Enterprise**（原名 FrontLine）：官方企业版解决方案，提供强大的图表、比较和报告功能。
        *   **InfluxDB + Grafana**: 一个流行的开源方案。可以使用工具将 `simulation.log` 导入 InfluxDB，然后在 Grafana 中制作漂亮的监控看板。
        *   **Prometheus**: 类似。

通过以上这些例子和实践，你可以将 Gatling 无缝地集成到你的 CI/CD 流程中，从而持续地监控应用性能，并在性能回归影响到用户之前就发现并解决它们。