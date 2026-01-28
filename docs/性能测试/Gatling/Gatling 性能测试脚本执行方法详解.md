# Gatling 性能测试脚本执行方法详解

Gatling 提供了多种执行性能测试脚本的方式，以下是完整的方法列举和详细说明：

## 1. Gatling 核心执行方式

### 方法1：使用 Gatling Bundle（推荐）

**步骤：**
1. 下载并解压 Gatling Open Source Bundle
2. 将 Scala 脚本放入 `user-files/simulations/` 目录
3. 运行执行命令

```bash
# 进入 Gatling 目录
cd gatling-charts-highcharts-bundle-3.9.5

# 方式1：交互式选择要运行的脚本
./bin/gatling.sh

# 方式2：直接指定脚本（非交互式）
./bin/gatling.sh -s com.example.MySimulation

# 方式3：使用重定向自动选择（适用于 CI/CD）
echo "1" | ./bin/gatling.sh -s com.example.MySimulation

# 方式4：指定结果目录和描述
./bin/gatling.sh -s com.example.MySimulation -rd "My Test Description"

# 方式5：批量运行多个测试
./bin/gatling.sh -s com.example.Simulation1
./bin/gatling.sh -s com.example.Simulation2
```

### 方法2：使用 Maven Gatling Plugin

**pom.xml 配置：**
```xml
<project>
    <properties>
        <gatling.version>3.9.5</gatling.version>
        <gatling-maven-plugin.version>4.5.0</gatling-maven-plugin.version>
    </properties>
    
    <dependencies>
        <dependency>
            <groupId>io.gatling</groupId>
            <artifactId>gatling-app</artifactId>
            <version>${gatling.version}</version>
        </dependency>
        <dependency>
            <groupId>io.gatling.highcharts</groupId>
            <artifactId>gatling-charts-highcharts</artifactId>
            <version>${gatling.version}</version>
        </dependency>
    </dependencies>
    
    <build>
        <plugins>
            <plugin>
                <groupId>io.gatling</groupId>
                <artifactId>gatling-maven-plugin</artifactId>
                <version>${gatling-maven-plugin.version}</version>
                <configuration>
                    <simulationClass>com.example.MySimulation</simulationClass>
                    <resultsFolder>/target/gatling/results</resultsFolder>
                    <runMultipleSimulations>true</runMultipleSimulations>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

**Maven 执行命令：**
```bash
# 运行所有测试
mvn gatling:test

# 运行特定测试类
mvn gatling:test -Dgatling.simulationClass=com.example.MySimulation

# 运行多个测试类
mvn gatling:test -Dgatling.simulationClass=com.example.Simulation1,com.example.Simulation2

# 指定测试描述
mvn gatling:test -Dgatling.simulationClass=com.example.MySimulation -Dgatling.runDescription="Load Test v1.0"

# 在测试阶段自动运行
mvn test

# 使用不同配置文件
mvn gatling:test -Pload-test -Dgatling.simulationClass=com.example.MySimulation
```

### 方法3：使用 SBT（Scala Build Tool）

**build.sbt 配置：**
```scala
enablePlugins(GatlingPlugin)

libraryDependencies += "io.gatling.highcharts" % "gatling-charts-highcharts" % "3.9.5" % "test,it"
libraryDependencies += "io.gatling" % "gatling-test-framework" % "3.9.5" % "test,it"
```

**SBT 执行命令：**
```bash
# 运行所有 Gatling 测试
sbt gatling:test

# 运行特定测试
sbt "gatling:testOnly com.example.MySimulation"

# 仅编译不运行
sbt gatling:compile

# 在集成测试阶段运行
sbt it:test
```

## 2. 集成开发环境执行方式

### 方法4：IntelliJ IDEA 中执行

**配置步骤：**
1. 安装 Scala 插件
2. 创建运行配置：
   - 类型：Application
   - Main class：`io.gatling.app.Gatling`
   - Program arguments：`-s com.example.MySimulation`
   - Working directory：项目根目录
   - Use classpath of module：选择你的模块

**直接运行：**
```scala
// 在脚本中可以直接右键运行
package com.example

import io.gatling.core.Predef._
import io.gatling.http.Predef._

class MySimulation extends Simulation {
  // 你的测试脚本
  setUp(
    scenario("My Scenario")
      .exec(http("request").get("/"))
      .inject(atOnceUsers(1))
  )
}
```

### 方法5：使用 Scala IDE / Eclipse

1. 安装 Scala IDE
2. 配置 Gatling 库依赖
3. 创建 Scala Application 运行配置
4. 指定主类和参数

## 3. 持续集成执行方式

### 方法6：Jenkins 集成

**Jenkinsfile 配置：**
```groovy
pipeline {
    agent any
    stages {
        stage('Load Test') {
            steps {
                script {
                    // 方式1：使用 Maven
                    sh 'mvn gatling:test -Dgatling.simulationClass=com.example.MySimulation'
                    
                    // 方式2：使用 Gatling Bundle
                    sh '''
                        cd gatling-bundle
                        ./bin/gatling.sh -s com.example.MySimulation -rf results
                    '''
                    
                    // 发布报告
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'target/gatling',
                        reportFiles: 'index.html',
                        reportName: 'Gatling Report',
                        reportTitles: ''
                    ])
                }
            }
            post {
                always {
                    // 归档测试结果
                    archiveArtifacts artifacts: 'target/gatling/**/*', fingerprint: true
                }
            }
        }
    }
}
```

### 方法7：GitLab CI/CD

**.gitlab-ci.yml 配置：**
```yaml
stages:
  - test
  - performance

load_test:
  stage: performance
  image: openjdk:11
  before_script:
    - apt-get update
    - apt-get install -y wget unzip
    - wget https://repo1.maven.org/maven2/io/gatling/highcharts/gatling-charts-highcharts-bundle/3.9.5/gatling-charts-highcharts-bundle-3.9.5-bundle.zip
    - unzip gatling-charts-highcharts-bundle-3.9.5-bundle.zip
    - cd gatling-charts-highcharts-bundle-3.9.5
  script:
    - bin/gatling.sh -s com.example.MySimulation -rf ../results
  artifacts:
    paths:
      - results/
    reports:
      junit: results/**/*.log
    when: always
  only:
    - main
    - tags
```

## 4. 容器化执行方式

### 方法8：Docker 容器执行

**Dockerfile：**
```dockerfile
FROM openjdk:11-jre-slim

RUN apt-get update && apt-get install -y wget unzip

# 下载 Gatling
RUN wget -q -O gatling.zip https://repo1.maven.org/maven2/io/gatling/highcharts/gatling-charts-highcharts-bundle/3.9.5/gatling-charts-highcharts-bundle-3.9.5-bundle.zip && \
    unzip gatling.zip && \
    rm gatling.zip && \
    mv gatling-charts-highcharts-bundle-3.9.5 /gatling

# 复制测试脚本
COPY simulations/ /gatling/user-files/simulations/
COPY resources/ /gatling/user-files/resources/
COPY conf/ /gatling/conf/

WORKDIR /gatling

ENTRYPOINT ["./bin/gatling.sh"]
```

**Docker 执行命令：**
```bash
# 构建镜像
docker build -t gatling-test .

# 运行测试
docker run -it --rm gatling-test -s com.example.MySimulation

# 挂载本地目录运行
docker run -it --rm -v $(pwd)/results:/gatling/results gatling-test -s com.example.MySimulation

# 使用 Docker Compose
docker-compose up gatling-test
```

### 方法9：Kubernetes 执行

**gatling-job.yaml：**
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: gatling-load-test
spec:
  template:
    spec:
      containers:
      - name: gatling
        image: gatling-test:latest
        command: ["./bin/gatling.sh"]
        args: ["-s", "com.example.MySimulation", "-rf", "/results"]
        volumeMounts:
        - name: results
          mountPath: /results
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
      volumes:
      - name: results
        persistentVolumeClaim:
          claimName: gatling-results-pvc
      restartPolicy: Never
  backoffLimit: 1
```

## 5. 高级执行方式

### 方法10：编程式执行

**通过 Java/Scala 代码调用：**
```scala
import io.gatling.app.Gatling
import io.gatling.core.config.GatlingPropertiesBuilder

object GatlingRunner {
  def main(args: Array[String]): Unit = {
    val props = new GatlingPropertiesBuilder()
      .resourcesDirectory(IDEPathHelper.resourcesDirectory.toString)
      .resultsDirectory(IDEPathHelper.resultsDirectory.toString)
      .binariesDirectory(IDEPathHelper.mavenBinariesDirectory.toString)
      .simulationClass("com.example.MySimulation")
      .runDescription("Programmatic execution")
    
    Gatling.fromMap(props.build)
  }
}
```

### 方法11：分布式执行

**使用 Gatling Frontline（企业版）：**
```bash
# 配置多个注入节点
./bin/gatling.sh -s com.example.MySimulation \
  -i injector1,injector2,injector3 \
  -rf /shared/results
```

### 方法12：参数化执行

**使用系统属性传递参数：**
```scala
package com.example

import io.gatling.core.Predef._
import io.gatling.http.Predef._

class ParametrizedSimulation extends Simulation {
  
  // 从系统属性获取参数，提供默认值
  val users = System.getProperty("users", "100").toInt
  val rampTime = System.getProperty("rampTime", "30").toInt
  val baseUrl = System.getProperty("baseUrl", "http://localhost:8080")
  
  val httpProtocol = http.baseUrl(baseUrl)
  
  val scn = scenario("Parametrized Scenario")
    .exec(http("request").get("/api/test"))
  
  setUp(
    scn.inject(rampUsers(users).during(rampTime))
  ).protocols(httpProtocol)
}
```

**执行命令：**
```bash
./bin/gatling.sh -s com.example.ParametrizedSimulation \
  -Dusers=500 \
  -DrampTime=60 \
  -DbaseUrl=http://api.example.com
```

## 6. 测试数据驱动执行

### 方法13：数据文件驱动

**CSV 数据文件：** `user-files/resources/user-data.csv`
```csv
userId,username,email
1,user1,user1@test.com
2,user2,user2@test.com
3,user3,user3@test.com
```

**数据驱动脚本：**
```scala
package com.example

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class DataDrivenSimulation extends Simulation {
  
  val httpProtocol = http.baseUrl("http://localhost:8080")
  
  // 读取 CSV 数据
  val userFeeder = csv("user-data.csv").circular
  
  val scn = scenario("Data Driven Scenario")
    .feed(userFeeder)
    .exec(http("Create User")
      .post("/api/users")
      .body(StringBody("""{"id": "${userId}", "name": "${username}", "email": "${email}"}"""))
      .asJson
      .check(status.is(201)))
  
  setUp(
    scn.inject(
      constantUsersPerSec(10).during(1.minute)
    )
  ).protocols(httpProtocol)
}
```

## 7. 执行配置和优化

### 方法14：配置文件执行

**application.conf 配置：**
```hocon
gatling {
  core {
    simulationClass = "com.example.MySimulation"
    runDescription = "Production Load Test"
    outputDirectoryBaseName = "${simulationName}"
  }
  charting {
    noReports = false
  }
  http {
    fetchedCssCacheMaxCapacity = 200
    fetchedCssCacheTtl = 600
  }
}
```

**使用配置执行：**
```bash
./bin/gatling.sh -s com.example.MySimulation -conf /path/to/application.conf
```

### 方法15：性能优化执行

**JVM 参数优化：**
```bash
./bin/gatling.sh -s com.example.MySimulation \
  -J-Xmx4g \
  -J-Xms2g \
  -J-XX:+UseG1GC \
  -J-XX:MaxGCPauseMillis=100
```

## 8. 执行结果处理

### 方法16：自动化报告生成

**后处理脚本：**
```bash
#!/bin/bash

# 运行测试
./bin/gatling.sh -s com.example.MySimulation -rf results

# 处理结果
LATEST_RUN=$(ls results | grep -E '^[0-9]' | sort -nr | head -1)
REPORT_DIR="results/$LATEST_RUN"

# 生成自定义报告
python generate_custom_report.py "$REPORT_DIR"

# 上传到云存储
aws s3 sync "$REPORT_DIR" s3://my-bucket/gatling-reports/$LATEST_RUN/

# 发送通知
curl -X POST -H 'Content-type: application/json' \
  --data "{\"text\":\"Gatling test completed: $REPORT_DIR\"}" \
  $SLACK_WEBHOOK_URL
```

## 总结对比

| 执行方法           | 适用场景            | 优点                   | 缺点              |
| ------------------ | ------------------- | ---------------------- | ----------------- |
| **Gatling Bundle** | 本地测试、简单部署  | 独立完整，无需构建工具 | 需要手动管理依赖  |
| **Maven Plugin**   | Java项目、CI/CD集成 | 集成构建流程，依赖管理 | 需要Maven项目结构 |
| **SBT Plugin**     | Scala项目           | 原生Scala支持，热重载  | 学习曲线较陡      |
| **IDE执行**        | 开发调试            | 快速调试，断点支持     | 不适合生产部署    |
| **Docker容器**     | 环境一致性、云部署  | 环境隔离，易于扩展     | 额外的容器管理    |
| **编程式调用**     | 自定义框架集成      | 完全控制执行流程       | 复杂度较高        |
| **参数化执行**     | 灵活测试配置        | 运行时动态配置         | 需要参数验证      |

**推荐执行策略：**
- **开发阶段**：使用 IDE 或 Gatling Bundle 进行快速测试
- **CI/CD 集成**：使用 Maven/Gradle 插件
- **生产环境**：使用 Docker 容器化部署
- **大规模测试**：使用 Gatling Frontline 分布式执行

选择合适的方法取决于你的具体需求：团队技术栈、基础设施、测试规模和自动化要求。