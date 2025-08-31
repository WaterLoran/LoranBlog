kafka测试环境可用性的解决

---

### 问题一：KafkaContainer 可重用性问题

**问题根源**：Testcontainers 的默认 `KafkaContainer` 会生成随机的容器主机名（如 `random-uuid.container-host.com`），而 Kafka Broker 会将 `advertised.listeners` 配置为该随机主机名。当容器重启后，主机名变化，之前客户端连接的 Broker 地址失效，导致无法重用。

**解决方案**：创建一个定制化的 `FixedHostKafkaContainer` 类，强制让容器对外暴露的主机名和端口固定为 `localhost` 和一个固定端口（或随机端口但通过固定的方式映射）。

#### 方法1：使用固定端口和主机名（推荐，最稳定）

此方法通过继承 `KafkaContainer` 并重写配置，使容器始终使用 `localhost:9092`。

**1. 创建自定义 `FixedHostKafkaContainer` 类**

```java
import org.testcontainers.containers.KafkaContainer;
import org.testcontainers.utility.DockerImageName;

public class FixedHostKafkaContainer extends KafkaContainer {

    // 定义一个固定的外部访问端口，避免端口冲突可更改
    private static final int KAFKA_FIXED_PORT = 9092; 

    public FixedHostKafkaContainer(final DockerImageName dockerImageName) {
        super(dockerImageName);
        // 固定暴露端口（容器内部端口9093映射到主机固定端口9092）
        this.withExposedPorts(KAFKA_FIXED_PORT);
    }

    @Override
    public String getBootstrapServers() {
        // 重写该方法，始终返回 localhost:9092
        return String.format("PLAINTEXT://localhost:%d", KAFKA_FIXED_PORT);
    }

    @Override
    // 这个方法是关键：它配置了Kafka Broker的advertised.listeners
    protected void configure() {
        super.configure();
        String advertisedListeners = String.format("PLAINTEXT://localhost:%d", KAFKA_FIXED_PORT);
        
        // 将固定地址注入到容器的环境变量中，Kafka容器启动脚本会读取这个变量
        withEnv("KAFKA_ADVERTISED_LISTENERS", advertisedListeners);
        // 如果你需要外部连接（非localhost），还需要设置监听器
        withEnv("KAFKA_LISTENERS", "PLAINTEXT://0.0.0.0:" + KAFKA_FIXED_PORT + ",BROKER://0.0.0.0:9092");
        // 禁用自动创建topic，通常测试中我们更希望手动控制
        withEnv("KAFKA_AUTO_CREATE_TOPICS_ENABLE", "false");
    }
}
```

**2. 在测试中使用自定义容器**

```java
import org.junit.jupiter.api.Test;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
public class MyKafkaTest {

    // 使用自定义的容器类
    @Container
    private static final FixedHostKafkaContainer kafka = 
        new FixedHostKafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.4.0"));

    @Test
    void myTest() {
        String bootstrapServers = kafka.getBootstrapServers(); // 永远是 "localhost:9092"
        // ... 你的测试逻辑，现在可以安全地缓存这个连接字符串了
    }
}
```

**3. 启用 Testcontainers 重用功能**

在你的用户根目录（`~`）或项目根目录下创建或修改 `.testcontainers.properties` 文件，添加以下内容：

```properties
# 启用Testcontainers守护容器重用功能
testcontainers.reuse.enable=true

# (可选) 设置生命周期策略，避免大量停止的容器堆积
testcontainers.envryonment.keep.alive.ms=300000 # 5分钟无引用后自动清理
```

**4. 在代码中显式声明需要重用**

在声明容器时，通过 `withReuse(true)` 方法标记该容器可被重用。

```java
@Container
private static final FixedHostKafkaContainer kafka = 
    new FixedHostKafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.4.0"))
        .withReuse(true); // <-- 添加这行
```

#### 方法2：使用 GenericContainer 和 Docker Compose（替代方案）

对于更复杂的集群配置，使用 Docker Compose 定义整个环境，并通过 `org.testcontainers.containers.DockerComposeContainer` 来管理。

**1. 创建 `docker-compose-kafka.yml` 文件**

```yaml
version: '3.8'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.4.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  kafka:
    image: confluentinc/cp-kafka:7.4.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092" # 固定端口映射
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "false"
```

**2. 在测试中启动 Docker Compose 环境**

```java
public class MyKafkaTest {

    @Container
    private static final DockerComposeContainer<?> environment = 
        new DockerComposeContainer<>(new File("src/test/resources/docker-compose-kafka.yml"))
            .withExposedService("kafka_1", 9092)
            .withLocalCompose(true) // 使用本地docker-compose
            .withOptions("--compatibility") // 兼容性选项
            .withReuse(true); // 启用重用

    @Test
    void myTest() {
        String bootstrapServers = "localhost:9092"; // 直接从Compose文件定义中得知
        // ... 测试逻辑
    }
}
```

---

### 问题二：集群配置复杂性

**解决方案**：利用代码和配置模板化来自动化集群的创建和配置。我们使用 Java 代码和 Kafka AdminClient 来实现。

#### 方法：使用 AdminClient 自动化主题管理

**1. 创建主题配置模板（YAML 格式）**

`src/test/resources/kafka-topics-config.yml`

```yaml
topics:
  - name: "user-behavior-events"
    numPartitions: 6
    replicationFactor: 1
    config:
      retention.ms: "604800000" # 7天
      cleanup.policy: "delete"

  - name: "order-events"
    numPartitions: 3
    replicationFactor: 1
    config:
      retention.ms: "2592000000" # 30天
      cleanup.policy: "compact"
      min.cleanable.dirty.ratio: "0.5"
```

**2. 编写一个主题管理工具类**

```java
import org.apache.kafka.clients.admin.*;
import org.apache.kafka.common.config.ConfigResource;
import org.springframework.core.io.ClassPathResource;
import org.yaml.snakeyaml.Yaml;

import java.io.InputStream;
import java.util.*;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

public class KafkaTopicManager {

    private final AdminClient adminClient;

    public KafkaTopicManager(String bootstrapServers) {
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(AdminClientConfig.REQUEST_TIMEOUT_MS_CONFIG, "30000");
        this.adminClient = AdminClient.create(props);
    }

    public void createTopicsFromConfig(String configFile) throws Exception {
        // 加载YAML配置
        Yaml yaml = new Yaml();
        InputStream inputStream = new ClassPathResource(configFile).getInputStream();
        Map<String, Object> config = yaml.load(inputStream);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> topicsConfig = (List<Map<String, Object>>) config.get("topics");

        // 构建NewTopic列表
        List<NewTopic> newTopics = topicsConfig.stream().map(topicConfig -> {
            NewTopic newTopic = new NewTopic(
                (String) topicConfig.get("name"),
                (Integer) topicConfig.get("numPartitions"),
                ((Integer) topicConfig.get("replicationFactor")).shortValue()
            );

            @SuppressWarnings("unchecked")
            Map<String, String> configMap = (Map<String, String>) topicConfig.get("config");
            if (configMap != null) {
                newTopic.configs(configMap);
            }
            return newTopic;
        }).collect(Collectors.toList());

        // 创建主题
        CreateTopicsResult result = adminClient.createTopics(newTopics);
        result.all().get(); // 同步等待创建完成
        System.out.println("All topics created successfully.");
    }

    public void deleteAllTopics() throws ExecutionException, InterruptedException {
        ListTopicsResult listResult = adminClient.listTopics();
        Set<String> topicNames = listResult.names().get();

        // 不要删除Kafka内部主题（如__consumer_offsets）
        Set<String> topicsToDelete = topicNames.stream()
                .filter(name -> !name.startsWith("__"))
                .collect(Collectors.toSet());

        if (!topicsToDelete.isEmpty()) {
            DeleteTopicsResult deleteResult = adminClient.deleteTopics(topicsToDelete);
            deleteResult.all().get();
            System.out.println("Deleted topics: " + topicsToDelete);
        }
    }

    public void close() {
        adminClient.close();
    }
}
```

**3. 在测试类初始化和清理时调用**

```java
@Testcontainers
public class MyIntegrationTest {

    @Container
    private static final FixedHostKafkaContainer kafka = 
        new FixedHostKafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.4.0"))
            .withReuse(true);

    private static KafkaTopicManager topicManager;

    @BeforeAll
    static void setUp() throws Exception {
        topicManager = new KafkaTopicManager(kafka.getBootstrapServers());
        topicManager.createTopicsFromConfig("kafka-topics-config.yml");
    }

    @AfterAll
    static void tearDown() throws Exception {
        // 注意：如果启用了容器重用，通常不需要删除Topic，以免影响下一个测试
        // topicManager.deleteAllTopics();
        topicManager.close();
    }

    @Test
    void testWithPreparedTopic() {
        // 测试可以安全地假设 'user-behavior-events' 主题已存在，且有6个分区
    }
}
```

---

### 问题三：资源清理与隔离

**解决方案**：实施严格的、分层次的清理策略，确保测试之间完全隔离。

#### 层次1：主题清理（最常用）

在每个测试方法执行后，清理所有测试产生的数据，但保留主题结构本身（避免重复创建删除的开销）。

```java
import org.apache.kafka.clients.admin.*;
import org.junit.jupiter.api.AfterEach;

import java.util.Arrays;
import java.util.Properties;
import java.util.concurrent.ExecutionException;

public class TestIsolationExample {

    private AdminClient adminClient;

    @AfterEach
    void purgeAllTopics() throws ExecutionException, InterruptedException {
        // 注意：此方法需要Kafka版本 >= 2.4.0，因为使用了`deleteRecords`
        if (adminClient == null) {
            Properties props = new Properties();
            props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
            adminClient = AdminClient.create(props);
        }

        ListTopicsResult listResult = adminClient.listTopics();
        Set<String> topicNames = listResult.names().get();

        // 为每个非内部主题创建"将所有记录删除到最新偏移量"的配置
        Map<TopicPartition, RecordsToDelete> recordsToDelete = new HashMap<>();
        for (String topicName : topicNames) {
            if (topicName.startsWith("__")) continue;

            DescribeTopicsResult describeResult = adminClient.describeTopics(Arrays.asList(topicName));
            TopicDescription description = describeResult.values().get(topicName).get();

            for (PartitionInfo partitionInfo : description.partitions()) {
                recordsToDelete.put(
                    new TopicPartition(topicName, partitionInfo.partition()),
                    RecordsToDelete.beforeOffset(Long.MAX_VALUE) // 删除所有记录
                );
            }
        }

        if (!recordsToDelete.isEmpty()) {
            DeleteRecordsResult deleteResult = adminClient.deleteRecords(recordsToDelete);
            deleteResult.all().get(); // 等待所有记录删除操作完成
        }
    }
}
```

#### 层次2：完整的主题删除与重建

对于需要完全隔离的测试（例如测试主题创建逻辑本身），在 `@AfterEach` 中删除所有测试主题。

```java
@AfterEach
void deleteAllTestTopics() throws ExecutionException, InterruptedException {
    // ... 使用前面KafkaTopicManager中的deleteAllTopics方法 ...
}
```

#### 层次3：容器级别的完全隔离（最彻底）

如果测试污染了容器本身的环境（例如修改了Broker配置），最安全的方法是**不重用容器**，而是在每个测试类或套件完成后彻底重启容器。

**配置示例**：在 `@BeforeAll` 中启动容器，在 `@AfterAll` 中关闭容器。通过 Testcontainers 的生命周期管理，确保每个测试类都从一个全新的环境开始。

```java
@Testcontainers
public class IsolatedTest {

    // 注意：这里不使用 `static`，意味着每个测试类实例都有自己的容器
    // 但请谨慎使用，因为这可能会显著增加测试时间
    @Container
    private final FixedHostKafkaContainer kafka = 
        new FixedHostKafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.4.0"));

    @Test
    void test() {
        // 这个测试拥有一个全新的Kafka Broker
    }
}
```

**总结与命令**：

1.  **日常开发/调试**：使用 **FixedHostKafkaContainer + 主题清理 (`deleteRecords`)** 的组合。它提供了重用带来的速度优势，并通过数据清理保证了隔离性。
2.  **CI/CD 流水线**：通常选择 **不重用容器**。在流水线中，每个测试任务都在一个全新的 Docker 容器中运行，通过 `docker run --rm` 确保测试完成后自动清理所有资源。这提供了最强的隔离性，虽然速度稍慢，但结果最可靠。
3.  **手动清理命令（备用）**：如果一切 else fails，可以直接使用 Docker 命令清理所有 Testcontainers 相关的容器。
    ```bash
    # 停止并删除所有Testcontainers启动的容器
    docker stop $(docker ps -q -f "label=org.testcontainers=true")
    docker rm $(docker ps -a -q -f "label=org.testcontainers=true")
    ```