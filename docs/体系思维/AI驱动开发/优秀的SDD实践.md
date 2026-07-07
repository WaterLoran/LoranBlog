# 优秀的SDD实践

目前行业里最好的 SDD 实践，已经不只是一份文档先行，而是形成了一套 **“规格即代码 + 制品自动生成 + 流水线强制验证”** 的闭环。核心特征就三点：

1.  **规格是唯一事实来源**，存于 Git，参与代码评审、版本管理。
2.  **一切从规格自动衍生**：服务端桩/客户端SDK、Mock 服务、文档、测试套件，都从规格生成，**绝不手写**。
3.  **CI 管道充当“契约警察”**：每次提交都自动校验实现是否偏离规格，并检测规格自身的破坏性变更。

下面以最常见的三种架构形态给你完整例子。

---

### 1. REST API：基于 OpenAPI 的 Design-First 流水线

**场景**：开发一个“订单服务”，提供创建订单接口。

#### ① 先写规格（OpenAPI 3.1 片段）
```yaml
openapi: 3.1.0
info:
  title: 订单服务
  version: 1.0.0
paths:
  /orders:
    post:
      summary: 创建订单
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateOrderRequest'
      responses:
        '201':
          description: 订单创建成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
        '400':
          description: 请求参数不合法
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

components:
  schemas:
    CreateOrderRequest:
      type: object
      required: [items]
      properties:
        items:
          type: array
          items:
            type: string
          minItems: 1
    Order:
      type: object
      properties:
        id: { type: string, format: uuid }
        status: { type: string, enum: [pending, confirmed] }
    Error:
      type: object
      properties:
        code: { type: integer }
        message: { type: string }
```

#### ② 工具链自动化（内置在 CI 里）
- **规范校验**：`spectral lint api.yaml` 检查命名、安全等企业规则。
- **生成服务端接口骨架**：对 Java 项目运行 `openapi-generator generate -i api.yaml -g spring -o ./server`，自动生成 Controller 接口、请求/响应模型。**业务逻辑只需实现这个接口**，不会因手写 API 定义与文档脱节。
- **启动 Mock Server**：`prism mock api.yaml`，前端/调用方可以立刻开发，无需等后端实现。
- **契约测试（验证实现）**：用 `schemathesis run api.yaml --base-url=http://localhost:8080` 自动产生数百个测试用例轰炸真实服务，检查响应结构、状态码是否与规格完全一致。也可以集成 `dredd` 做更直接的“规格→端点”验证。
- **生成客户端 SDK**：同一份规格一键输出 TypeScript、Python 等 SDK，供不同团队使用。

**效果**：只要规格没过时，文档、Mock、SDK 和真实服务就永远同步，前端/移动端/外部集成方拿到的是“即插即用”的真实契约。

---

### 2. gRPC/微服务：Protobuf + Buf 的契约治理

**场景**：内部微服务间用 gRPC 通信，需要强类型、高性能和严格的破坏性变更检查。

#### ① 先定义规格（user.proto）
```protobuf
syntax = "proto3";

package user.v1;

// 用户服务契约
service UserService {
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
}

message GetUserRequest {
  string user_id = 1;
}

message GetUserResponse {
  string user_id = 1;
  string name = 2;
  string email = 3;
}
```

#### ② 业界顶尖实践：用 Buf 取代原生 protoc
- **`buf.yaml` 声明模块**，所有 `.proto` 纳入一个规格仓库。
- **`buf lint`** 自动执行 Google API 设计规范（如字段名用 snake_case，必须写注释）。
- **`buf breaking`** 在 PR 阶段检测：删除了字段？修改了类型？新增了必填参数？任何不兼容变更直接阻断合并，保证微服务之间不会“无声断裂”。
- **`buf generate`** 自动生成 Go/Java/Kotlin 等服务端/客户端代码，并生成 **gRPC 反射文档、OpenAPI 镜像**（供网关或 Web 端使用）。
- 各服务团队**只依赖生成的代码，不手写任何 proto 文件中的结构体**。

**效果**：Proto 仓库成为跨团队圣典，CI 上的 `buf breaking` 就像编译器，强制所有人遵守向前兼容，彻底杜绝“改了一个字段下游全炸”的惨剧。Google、Spotify 等大规模 gRPC 使用者走的都是这条路。

---

### 3. 事件驱动/异步：AsyncAPI 让消息契约可见

**场景**：订单服务发布 `order.placed` 事件，多个下游消费。

#### ① 事件规格（asyncapi.yaml）
```yaml
asyncapi: 2.6.0
info:
  title: 订单事件
  version: 1.0.0
channels:
  orders/placed:
    publish:
      message:
        payload:
          type: object
          required: [orderId, timestamp]
          properties:
            orderId: { type: string, format: uuid }
            timestamp: { type: string, format: date-time }
            total: { type: number }
```

#### ② 从规格生成的资产
- **生成代码**：运行 `asyncapi generate models asyncapi.yaml -o ./model` 可直接生成各语言的消息结构体（Java POJO、TypeScript 类型等），保证发布方和订阅方从同一契约出发。
- **生成文档站点**：将 AsyncAPI 渲染成可交互的 HTML，业务方和测试人员能一目了然看到所有事件、字段和示例。
- **契约验证**：在集成测试中，用专用库加载 `asyncapi.yaml`，校验真实消息 broker 中的消息是否满足 schema 和 required 字段。

**效果**：消息队列这个“黑盒”终于有了一份可执行、可验证的合同，异步通信的可靠性大幅提升，Adidas、Slack 等公司的实践已证明了这一点。

---

### 总结：当前 SDD 最优秀的实践长这样
- **规格即代码**：OpenAPI/Proto/AsyncAPI 存 Git，有 MR 评审。
- **自动化生产管线**：生成骨架、Mock、SDK、文档、测试用例一键完成。
- **永不脱节的强制验证**：lint（规范）→ breaking change（兼容）→ contract test（符合）都在 CI 里自动跑，任何不一致立即红灯。
- **基础设施也 SDD**：Kubernetes YAML、Terraform、Crossplane 本质上也是声明式的“期望状态规格”，它们驱动控制器去调谐实际状态，这就是云原生时代的 SDD。

这种实践让团队真正做到了**“契约既定义，代码、文档、测试皆为同一源头的不同视图”**，是大型、长周期、多团队项目最高效的质量保证。