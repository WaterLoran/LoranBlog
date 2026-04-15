# Agentic AI基础设施实践经验系列（四）：MCP服务器从本地到云端的部署演进

by [AWS Team](https://aws.amazon.com/cn/blogs/china/author/zhyawenm/) on 19 9月 2025 in [Generative AI](https://aws.amazon.com/cn/blogs/china/category/artificial-intelligence/generative-ai/) [Permalink](https://aws.amazon.com/cn/blogs/china/agentic-ai-infrastructure-practice-experience-series-four-mcp-server-from-local/) [ Share](https://aws.amazon.com/cn/blogs/china/agentic-ai-infrastructure-practice-experience-series-four-mcp-server-from-local/#)

![AWS 中国博客横幅 – Agentic AI 基础设施实践系列](/images/AgenticAI基础设施实践经验/MCP服务器从本地到云端的部署演进/aws-china-blog-banner-agentic-ai-series.png)

## 引言

随着人工智能技术的快速发展，特别是大语言模型（LLM）的广泛应用，Agentic AI（智能体AI）正在成为下一个技术热点。在 Agentic AI 的工作流程中，AI 智能体需要调用各种外部工具来扩展其能力边界——从数据库查询到 API 调用，从文件操作到复杂的业务逻辑处理。

许多推理框架和Agentic AI框架提供了内置工具以供大语言模型使用，而为了标准化 AI 模型与外部工具之间的交互，Anthropic 在 2024 年 11 月推出了模型上下文协议（Model Context Protocol，简称 MCP）。MCP 就像是 AI 应用的”USB-C 接口”，提供了一种标准化的方式来连接 AI 模型与不同的数据源和工具。

然而，随着 MCP 在实际应用中的推广，一个重要的架构问题浮现出来：MCP 服务器应该部署在哪里？本文将深入探讨 MCP 协议，MCP 服务器本地部署和云端部署的适用场景和参考架构，以及如何在 AWS 云平台上实现这一目标。

## 第一部分：理解工具调用和 MCP 协议

### 从工具调用说起

工具调用（Tool use）指模型了解，选择并调用外部工具的能力。例如用户希望检索 Amazon EC2 的最新一代实例价格，而具体价格并没有内置在大模型本身的知识中，仅靠大模型无法回答，或价目表已经陈旧不具备回答价值。但大模型拥有工具调用能力时，大语言模型会根据事先传入的已安装工具列表，选择合适的工具，并生成对应工具的调用参数。但大语言模型自身无法直接运行工具，该执行过程是由推理框架或AI 智能体框架负责执行，再将执行结果返回给大语言模型。大语言模型根据执行结果进一步生成回复。

许多 Agentic AI 框架内置了一些基础工具供大模型调用。例如 Strands Agents SDK 提供了 30 种内置工具，包含计算器，HTTP 请求，文件系统操作等工具。在上述的实例价格查询场景中，大模型根据自身知识，了解到可以使用 Strands Agents SDK 内置的HTTP 请求工具，调用 AWS Pricing API 获取价格。此时大模型就会生成工具调用请求， Strands Agent SDK 会根据请求中的 URL 和请求参数，调用 AWS Pricing API，并将结果返回给大模型。

但 Agentic AI 框架内置的工具也有其局限性。内置的工具主要为基础工具，无法应对复杂的业务需求。有些业务甚至需要定制化的工具。且内置工具的版本更新和维护需要与框架的发布周期同步，工具无法单独频繁迭代。应对这种场景，就需要外挂工具，将工具与Agentic AI框架解耦。而MCP协议就应运而生。

### MCP 的架构设计

模型上下文协议（MCP）通过引入标准化的客户端-服务器架构和统一协议，试图解决大模型的工具管理，集成和通讯的问题。MCP 客户端通常集成在 AI 应用中，如 Amazon Q Developer、Claude Desktop、Cursor 等工具。这些客户端负责与 MCP 服务器通信。而MCP 服务器则充当了 AI 应用和具体工具之间的转换桥梁。MCP 服务器一般作为代理（Proxy）或边车（Sidecar）服务存在，它将标准的 MCP 请求转换为特定工具能理解的格式，执行相应操作后再将结果返回给客户端。

以 Claude 提供的示例 [Git MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/git) 为例，客户端通过 MCP 协议向 MCP Server 发起操作 Git 存储库的请求，Git MCP Server 利用内置的 Git SDK 对存储库进行操作后，以 MCP 协议向客户端返回操作结果。这种设计实现了协议层面的解耦，使得工具的升级和变更不会直接影响到 AI 应用。

![图 1：MCP 客户端和服务器的关系](/images/AgenticAI基础设施实践经验/MCP服务器从本地到云端的部署演进/fig-01-mcp-client-server-relationship.jpg)

MCP 协议带来的最大优势是松耦合架构。AI 智能体只需要支持 MCP 协议，不需要关心工具的更新和变化，也不再需要学习和适配各种不同的 API 格式，所有的工具调用都通过统一的 MCP 协议进行，使用相同的数据格式和通信方式，这大大简化了开发者使用多种工具的集成复杂度，让大量工具的集成变得可行。而对工具提供方而言，每个工具的 MCP 服务器由相应的厂商或社区独立开发和维护，而无需考虑与AI 智能体进行集成。这样就实现了责任的清晰分工。

## 第二部分：部署方案的选择

### MCP 的部署模式

MCP 协议支持两种主要的部署模式：本地部署和远程部署。二者最明显的区别是 MCP 服务器是否与客户端位于同一地。不同的部署模式适应不同场景，有各自的优缺点。下文中我们将会详细比较这两种部署模式。

### 本地部署

![图 2：本地环境运行Agent Tools](/images/AgenticAI基础设施实践经验/MCP服务器从本地到云端的部署演进/fig-02-local-environment-agent-tools.jpg)

绝大多数 MCP 服务器默认提供本地部署方式。本地部署模式中，MCP 服务器作为本地进程或容器运行。用户需要配置启动命令（如 npx ， uv 等包管理器，或 docker 等容器运行时）以及对应的启动参数和环境变量。配置完成后，客户端通过系统调用创建子进程，启动服务端程序，并建立与子进程的输入输出管道连接。客户端只要监测服务器进程，即可了解 MCP 服务器的运行状况。这种基于进程生命周期的连接管理机制简单有效，避免了复杂的网络连接管理问题。

客户端与服务端通过标准输入输出流，采用 UTF-8 编码的 JSON-RPC 2.0 规范进行通信。这种机制提供了原生的双向通信。同时本地通信通过系统级别的管道传输，避免了网络层的复杂性，保证了通信的可靠性和效率。

本地部署架构简单，方便，适合在以下场景中使用：

- 在功能方面，一些需要本地数据访问和工具集成的场景必须使用本地部署。例如在开发环境中，它可以让AI助手直接访问本地文件系统、执行构建脚本、运行测试用例，提供无缝的开发体验。对于数据分析任务，本地部署的MCP服务可以直接访问本地数据库、处理本地文件，避免了数据传输的延迟和安全风险。
- 性能方面，本地部署避免了网络开销，具有更低的延迟和更高的吞吐量。对于需要频繁交互的应用场景，如实时代码分析、交互式数据探索等，这种性能优势尤为明显。

虽然本地部署在部署和操作层面比较方便，但在生产环境中面临诸多挑战：

- 版本管理困难：当后端工具升级时，其 API 可能发生变化，相应的 MCP 服务器就需要更新以适配新的 API。MCP 服务器 自身也在不断迭代增加新功能和修补漏洞，这些因素导致 MCP 服务器更新非常频繁。常用的 npm 和 uv 包管理器在缓存命中时，不会自动更新已安装的包，用户必须主动检查更新。本地部署模式下，这种更新完全依赖手动操作，在 MCP 服务器数量较多时，很难及时响应变化。
- 安全风险：虽然本地部署可以避免内容在网络上传输导致的风险，但也带来了更多权限泄露风险。本地 MCP 服务器默认情况下运行在与用户相同的命名空间下，权限与当前用户相同。理论上可以访问当前用户能访问的所有文件和资源。同时本地 MCP 服务器需要将所需的凭证（例如 API Key，用户名密码等）存储在本地，如配置不当，其他应用也可读取并使用该凭证，造成横向权限泄露。
- 资源和性能限制：每个 MCP 服务器都是独立的进程，且都会随着 MCP 客户端启动。当需要启动大量 MCP 服务器时，会显著影响本地机器的性能。特别是在资源受限的开发环境中，这种影响会更加明显。

### 远程部署

远程部署模式则将 MCP 服务器部署在其他的远程服务器上，服务器暴露一个 HTTP 端点，客户端与服务器通过 Streamable HTTP 协议进行通信。Streamable HTTP 协议是 HTTP 协议的扩展，在标准 HTTP 1.1 的基础上支持轻量级的 Server-sent Event（简称SSE，服务端发送消息）。MCP 客户端启动时，会连接远程 MCP 服务器的 HTTP 端点以初始化 Session。初始化完成后，客户端可通过 HTTP POST 方法发送请求，MCP 服务器在处理完成后，可以直接以 JSON 格式返回结果。如任务耗时较长，也可以将连接升级至 SSE，以流式形式逐步返回结果。

许多 MCP 服务器提供方已经开始支持远程部署模式，例如 [Remote GitHub MCP Server](https://github.com/github/github-mcp-server) 和 [AWS Knowledge MCP Server](https://awslabs.github.io/mcp/servers/aws-knowledge-mcp-server/) 。这种模式虽然增加了网络延迟，但在安全性、性能和可维护性方面具有显著优势。

![图 3：远程环境运行Agent Tools](/images/AgenticAI基础设施实践经验/MCP服务器从本地到云端的部署演进/fig-03-remote-environment-agent-tools.jpg)

远程部署在以下领域有独到优势：

- 版本更新更便捷：开发者可以通过持续集成部署（CI/CD）流水线，直接在单一可控的环境更新 MCP 服务器。用户无需进行操作，只需重新连接都能获得最新版本的工具。这种自动化机制彻底解决了本地部署中手动维护和更新的痛点，大大降低了运维负担，也减少了版本不一致所带来的问题。
- 更加安全可靠：云端部署在安全性方面提供了多层保护，而权限隔离是其中的核心优势。MCP 服务器在受控的云环境中运行，MCP 客户端在调用服务器时只发送具体的工具调用请求，不包含完整的对话上下文或敏感信息。这种设计大大降低了信息泄露的风险，即使 MCP 服务器被攻击，攻击者也无法获取到完整的用户数据。同时，MCP 服务器可通过 OAuth 等标准协议进行身份认证鉴权。这使得无需将凭证分发至本地，也可以在通过身份认证后，利用远程MCP 服务器的凭证进行一些需要高权限的操作，或访问受访问控制保护的知识库。降低凭证泄露或被滥用的风险。
- 更优性能和性价比：资源优化是云端部署的另一个显著优势。客户端只需要维护简单的 HTTP 连接，而不用担心本地资源消耗。对于一些有大量计算需求的场景，可以直接在云端环境中满足，无需在本地进行复杂的环境配置或消耗本地资源。按需计费的模式进一步降低了总体成本，特别是对于使用频率不高的 MCP 服务器。
- 更好的可观测和可维护性：现代 LLMOps 越来越重视可观测性，云端部署在这方面具有明显优势。统一监控系统可以提供请求量和响应时间的实时监控，详细记录资源使用情况，错误率等性能指标。而安全审计功能为企业级应用提供了必要的合规支持。系统可以记录所有工具调用请求的完整日志，实现可疑行为的自动检测和告警，并生成详细的合规性报告。这些功能在本地环境中很难实现，但在云端环境中可以通过专业的监控和分析工具轻松提供。

考虑到这些优势，远程部署的 MCP 服务器特别适用于需要集中管理和共享资源的企业环境。在大型组织中，IT 团队可以部署统一的 MCP 服务器集群，为不同部门的 AI 应用提供标准化的工具和数据访问接口。这种集中式架构不仅简化了权限管理和审计追踪，还能够实现资源的统一监控和性能优化。

对于跨地域协作的团队，远程 MCP 服务器提供了理想的解决方案。团队成员无论身处何地，都可以通过标准的 HTTP 协议访问相同的服务器资源，确保了协作环境的一致性。这种部署方式还特别适用于需要高可用性的生产环境，管理员可以通过负载均衡、故障转移等技术手段构建健壮的服务架构。

云原生环境是远程 MCP 服务器的另一个重要应用场景。在容器化和微服务架构中，MCP 服务器可以作为独立的服务组件进行部署和扩展，与其他业务服务保持松耦合关系。这种架构模式支持按需扩容、滚动更新等现代运维实践，为 AI 应用的规模化部署提供了技术基础。

但远程部署仍然有其局限性：

- 网络延迟和可靠性是影响远程部署性能和稳定性的主要因素。特别是在需要频繁交互的场景中，网络往返时间可能会显著影响用户体验。相比本地部署的进程间通信，HTTP 传输必然会引入额外的网络开销，且网络中断或不稳定会直接影响服务的可用性。
- 在安全性方面，远程部署需要将 HTTP 端点暴露到 Internet 或其他网络环境，天生比本地部署拥有更大的攻击面。数据需要通过网络传输，增加了被截获或篡改的风险。攻击者也会通过暴露的 HTTP 端点试图获得工具的访问权限。需要谨慎的安全设计和额外的安全投入（如认证鉴权，加密等）。
- 兼容性方面，Streamable HTTP 协议推出时间较晚，部分客户端对此支持较差。但可通过本地第三方工具，将其转换为 stdio 模式，兼容更多客户端。

## 

## 第三部分：在亚马逊云上构建和部署 MCP 服务器

根据您对基础设施的选择，AWS 提供了两种主要的部署选项：

- 部署在 Amazon Bedrock AgentCore Runtime，由 AWS 完全托管的 MCP 服务器运行时；
- 部署在 AWS 计算服务，如 AWS Lambda 或 Amazon ECS with AWS Fargate，以获得更多的基础设施灵活性。

您可以根据您期望部署的区域选择合适的部署模式。Bedrock AgentCore 目前处于公开预览阶段，仅在海外部分区域可用。在亚马逊云科技中国区域（含北京和宁夏区域），您可以在计算服务上部署 MCP 服务器。

#### 1. 使用 Amazon Bedrock AgentCore Runtime 快速构建和部署 MCP 服务器

Amazon Bedrock AgentCore 是亚马逊云科技推出的一项全新服务，专门用于帮助开发者快速构建、部署和运行企业级的 Agentic AI应用，让开发者能够专注于创新，而不是底层的技术细节。它是为Agentic AI量身打造的开箱即用的”工具箱”，核心服务包括**：**

- **Runtime****（运行时）**：提供会话完全隔离，安全的无服务器的运行环境，可用于Agent, MCP服务器托管部署；
- **Gateway****（网关）**：帮助Agent安全地以MCP协议连接现有工具和API服务，简化工具集成
- 以及Memory（记忆功能），Code Interpreter（代码解释器），Browser（浏览器工具），Identity（身份管理），Observability（可观察性）等其他Agent 运行部署所需要的组件。

Amazon Bedrock AgentCore Runtime 是专门为 Agent 或 MCP 服务器构建的无服务器运行环境，提供会话级的安全隔离以及按量付费的计费模式。

![图 4：Bedrock AgentCore Runtime 部署MCP Server](/images/AgenticAI基础设施实践经验/MCP服务器从本地到云端的部署演进/fig-04-bedrock-agentcore-runtime-mcp-server.jpg)

Amazon Bedrock AgentCore Runtime 提供 MCP 服务器支持，您可以使用 bedrock-agentcore-starter-toolkit 快速将您的 MCP 服务器从源代码部署到 Amazon Bedrock AgentCore Runtime，而无需管理任何基础设施。

在准备好源代码后，您仅需执行agentcore configure 和 agentcore launch 两条命令，即可通过 CodeBuild 在 AWS 托管环境构建容器镜像，配置基于 Amazon Cognito 的身份认证机制，将构建完成的 MCP 服务器镜像部署到 Amazon Bedrock AgentCore Runtime，并创建一个访问端点。已认证的客户端可通过托管的端点，使用 Streamable HTTP 传输方式访问 MCP 服务器。

我们提供基于 Jupyter Notebook 的快速使用指导，帮助您快速上手 Amazon Bedrock AgentCore Runtime。您可以从 [此处](https://github.com/awslabs/amazon-bedrock-agentcore-samples/tree/main/01-tutorials/01-AgentCore-runtime/02-hosting-MCP-server) 获取此快速使用指导。

#### 2. 利用 AWS Lambda 部署无状态 MCP 服务器

![图 5：Lambda 部署无状态MCP Server](/images/AgenticAI基础设施实践经验/MCP服务器从本地到云端的部署演进/fig-05-lambda-stateless-mcp-server.jpg)

Amazon Lambda 特别适合处理无状态的 MCP 服务器场景。这类场景通常包括网络搜索、API 调用等无状态操作，采用单次请求-响应模式，任务运行时间相对较短。Lambda 的事件驱动特性与这种使用模式高度契合。

Lambda 的优势在于其独特的计费模式和运行特性。毫秒级计费意味着只需为实际运行时间付费，对于间歇性使用的 MCP 服务器来说成本极低。强大的自动伸缩能力让系统可以在10秒内启动1000个实例，轻松应对突发流量。零服务器管理的特性让开发者无需关心底层基础设施的维护和升级。最重要的是，Lambda 提供的请求级隔离确保每个请求都运行在独立的执行环境中，这对于安全性要求较高的企业应用非常重要。

技术实现方面，可以使用 Lambda Web Adapter 将基于 FastMCP 的 Web 应用部署到 Lambda。这个适配器作为一个层（Layer）集成到 Lambda 函数中，能够将传统的 Web 应用请求转换为 Lambda 能够处理的格式。使得您可以使用现有框架进行开发而无需进行代码改动。

在 Lambda 上部署的服务器可通过 API Gateway 暴露给用户。API Gateway 是 AWS 托管的 API 网关，可将部署到 Lambda 的 MCP 服务器安全的暴露到 Internet 或 VPC 内。API Gateway 支持基于 API Key 或 Lambda 的认证功能，您可以通过配置 API Key 或 Lambda 函数控制哪些用户可以访问 MCP 服务器。API Gateway 与 WAF 的集成更能有效防止恶意流量访问或嗅探 MCP 服务器，确保访问安全。

我们提供了基于SAM（Serverless Application Model）的模板来帮助您快速开始在 Lambda 上开发无状态的 MCP 服务器。该模板包含基于 FastMCP 框架的 Python 源代码，用于部署的 SAM 模板，以及部署脚本。利用该模板，您可以快速部署运行在 AWS Lambda 上的MCP 服务器， API Gateway，以及其他支持资源。具体部署参数可在 SAM 模板中定义，包括运行时环境、内存配置、环境变量等参数。您可以在 [此处](https://github.com/aws-samples/sample-serverless-mcp-servers/tree/main/stateless-mcp-on-lambda-python) 获取该模板。

### 3. 利用 Amazon ECS with Amazon Fargate 部署有状态 MCP 服务器

![图 6：ECS Fargate 部署有状态MCP Server](/images/AgenticAI基础设施实践经验/MCP服务器从本地到云端的部署演进/fig-06-ecs-fargate-stateful-mcp-server.jpg)

与无状态的 Amazon Lambda 相比，容器环境无疑适合处理有状态的 MCP 服务器场景。这类场景包括多轮对话场景（如 Playwright 自动化），需要保持状态的长时间运行任务，以及处理时间较长，需要通过 Server-Sent Events (SSE) 不断发送进程或中间结果的应用。容器化部署更为灵活，对于复杂，或依赖外部组件的 MCP 服务器更为方便。您可以将依赖的组件和 MCP 服务器构建在同一个容器镜像中，MCP 服务器和依赖项可通过跨进程调用或本地网络进行交互，降低复杂度。

AWS 提供多种容器运行时选择。您可以使用现有的容器基础设施（如 Amazon ECS，Amazon EKS 等），在 Amazon EC2 上运行 MCP 服务器。如您不希望管理基础设施，您可以使用 Amazon ECS 管理容器，并使用 AWS Fargate 运行环境运行容器。Amazon ECS 是全托管，易上手的容器编排服务，您无需学习 Kubernetes 的复杂操作方式，即可将容器运行在 AWS 托管的运行环境上。而 AWS Fargate 作为全托管的运行环境，您无需管理操作系统，容器运行时等运行环境，有效减少了运维工作量。AWS Fargate 按实际使用的 CPU 和内存进行计费，且支持基于 ECS Autoscaling 的指标跟踪弹性伸缩，尽可能的节省成本。

我们需要使用 ALB 将启用 Server-Side Event 的 MCP 服务器暴露到 Internet 或 VPC。在配置 ALB 时，需要启用 Sticky Sessions 机制。该机制可以有效保持状态，确保同一用户的多个请求能够路由到同一个实例。

我们提供了基于 CloudFormation 模板来帮助您快速开始在 Amazon ECS 上开发有状态的 MCP 服务器。该模板包含基于 FastMCP 框架的 Python 源代码，用于部署的 CloudFormation 模板，以及部署脚本。利用该模板，您可以快速部署 ECS 集群以及其他支持资源，构建容器镜像，并将容器镜像运行在 ECS Fargate 上。具体部署参数可在 CloudFormation 模板中定义，包括运行时环境、资源配置，VPC 配置 等参数。您可以在 此处 获取该模板。

## 第四部分：快速迁移现有的工具或 MCP 服务器至云上

如果您已有现有的 Lambda 函数或 API， 利用 Amazon Bedrock AgentCore Gateway 可以快速的将现有工具以 MCP 协议暴露出来，以供客户端使用。如果您已经开发了基于 stdio 本地部署的 MCP 服务器，也可以利用AWS 解决方案，快速将MCP服务器部署到云上。

#### 使用 Amazon Bedrock AgentCore Gateway 转换现有 API

![图 7：Bedrock AgentCore Gateway 架构](/images/AgenticAI基础设施实践经验/MCP服务器从本地到云端的部署演进/fig-07-bedrock-agentcore-gateway-architecture.jpg)

Amazon Bedrock AgentCore Gateway 是一项全托管的工具网关服务，其**主要作用是作为一个统一的连接层**，将各种不同的工具和资源转换为 MCP 兼容的工具，使 Agent 能够通过单一的端点访问背后的多种工具。

Amazon Bedrock AgentCore Gateway 支持将 Lambda 函数、OpenAPI 规范 API、Smithy 模型 API 快速转换为基于 Streamable HTTP 的 MCP 端点，并提供内置的认证鉴权。 例如，很多企业内部已经有现成的REST API，而 Amazon Bedrock AgentCore Gateway 就可以把这些现有 API 服务快速的转换成一个MCP 服务器，供 AI Agent 使用。多个 API 可以挂载到同一个端点，以简化客户端配置。

在某些真实业务场景下，Agent需要选择的工具多达几百甚至上千种。Amazon Bedrock AgentCore Gateway 支持语义检索。语义检索作为一个特殊的工具，可以根据Agent提出的需求，找出跟当前任务最相关的工具列表，再注入对应的工具描述给Agent进行选择。该功能可以帮助 Agent 智能地发现和选择最适合其任务的工具，大幅度减少输入Token消耗，防止工具过多导致的延迟和效率问题。

我们提供基于 Jupyter Notebook 的快速使用指导，帮助您快速上手 Amazon Bedrock AgentCore Gateway。完整的示例代码请参考[此处](https://github.com/awslabs/amazon-bedrock-agentcore-samples/tree/main/01-tutorials/02-AgentCore-gateway)

### 在亚马逊中国区域快速将现有 MCP 服务器部署至云上

![图 8：mcp-proxy接口转换](/images/AgenticAI基础设施实践经验/MCP服务器从本地到云端的部署演进/fig-08-mcp-proxy-stdio-http-bridge.jpg)

为了简化现有 MCP 服务器到云端的迁移过程，我们开发了一款自动化转换解决方案。该解决方案将现有基于 stdio 交互模式的 MCP 服务器转换至可在云上部署的，基于 Streamable HTTP 的 MCP 服务器。该解决方案基于社区开源的 [mcp-proxy ](https://github.com/punkpeye/mcp-proxy)项目，该项目本质上是一个 HTTP 服务器，将收到的请求转发至 MCP 服务器进程中，以完成 Streamable HTTP 至 stdio 的转换而无需修改源代码。

利用该解决方案，您只需输入 MCP 服务器的运行命令或 GitHub 仓库地址，该解决方案会自动生成包含所有必要的运行时环境和依赖包的 Dockerfile，自动化构建容器镜像。随后使用 CloudFormation 模板将该容器镜像部署至现有的 ECS 集群中，并创建 ALB 将其暴露至 Internet。

这种自动化工具大大降低了从本地到云端迁移的技术门槛。开发者只需要提供 MCP 服务器的运行命令，和基本的部署参数，工具就能自动完成整个部署流程。这对于那些有大量现有 MCP 服务器需要迁移的团队来说特别有价值。您可以在 [Github 上](https://github.com/aws-samples/sample-mcp-server-automation) 获取该解决方案。

## 结论

随着 Agentic AI 技术的不断发展，MCP 协议正在成为连接 AI 智能体与外部工具的标准桥梁。虽然本地部署 MCP 服务器在开发阶段具有便利性，但云端部署在生产环境中展现出了明显的优势。

通过将 MCP 服务器部署到 AWS 云平台，企业可以获得自动化的版本管理、增强的安全性、更好的可扩展性和全面的可观测性。特别是在版本管理方面，云端部署彻底解决了本地部署中包管理器更新滞后的问题，确保用户始终能够使用最新版本的 MCP 服务器。

在安全性方面，云端部署通过物理隔离和精细化的权限控制，大大降低了权限泄露和恶意行为的风险。同时，统一的监控和日志记录也为企业提供了完整的安全审计能力。

成本方面，云端部署的按需付费模式相比本地部署的固定成本投入更加经济高效。特别是对于使用频率不高的 MCP 服务器，云端部署可以显著降低总体拥有成本。

许多用户已经将 MCP 服务器部署到云上，[翰德](https://aws.amazon.com/cn/blogs/china/hudson-reshapes-the-new-paradigm-of-intelligent-recruitment-based-on-mcp-agent/)在 AWS 上海峰会上展示的简历分析 MCP 服务器是一个成功案例。他们在初期选择了 ECS Fargate 平台部署有状态服务，支持复杂的简历处理流程。随着业务的发展和对成本优化的需求，团队正在评估将部分功能迁移到 Lambda 平台，以进一步降低运营成本。从业务价值角度看，这个 MCP 服务器实现了简历筛选的自动化，大大提高了猎头团队的工作效率，减少了人工审核的工作量。

展望未来，随着更多企业采用 Agentic AI 解决方案，MCP 服务器的云端部署将成为主流选择。自动化部署工具的发展也将进一步降低迁移门槛，让现有的 MCP 服务器能够更容易地迁移到云端。

AWS 提供多种方式帮助您部署 MCP 服务器到云端。您可以使用专门为Agentic AI工作负载提供无服务器运行环境的托管服务 Amazon Bedrock AgentCore Runtime，也可以使用多样化的计算服务例如 AWS Lambda 或 Amazon ECS with AWS Fargate 应对各种复杂需求。对于正在考虑部署 MCP 服务器的开发者和企业来说，建议优先考虑云端部署方案。这不仅能够获得更好的技术优势，也能为未来的扩展和维护打下坚实的基础。

## 本文提到的技术资料链接：

1. 无服务器部署MCP

   服务器示例代码库：

   - https://github.com/aws-samples/sample-serverless-mcp-servers/tree/main

2. Amazon Bedrock AgentCore Runtime 

   部署MCP 

   示例代码库：

   - https://github.com/awslabs/amazon-bedrock-agentcore-samples/tree/main/01-tutorials/01-AgentCore-runtime/02-hosting-MCP-server

3. Amazon Bedrock AgentCore Gateway 

   部署MCP 

   示例代码库：

   - https://github.com/awslabs/amazon-bedrock-agentcore-samples/tree/main/01-tutorials/02-AgentCore-gateway

**关于Agentic AI****基础设施的更多实践经验参考，欢迎点击：**

[Agentic AI基础设施实践经验系列（一）：Agent应用开发与落地实践思考](https://aws.amazon.com/cn/blogs/china/agentive-ai-infrastructure-practice-series-1)

[Agentic AI基础设施实践经验系列（二）：专用沙盒环境的必要性与实践方案](https://aws.amazon.com/cn/blogs/china/agentic-ai-sandbox-practice/)

[Agentic AI基础设施实践经验系列（三）：Agent记忆模块的最佳实践](https://aws.amazon.com/cn/blogs/china/agentic-ai-infrastructure-deep-practice-experience-thinking-series-three-best-practices-for-agent-memory-module)

[Agentic AI基础设施实践经验系列（四）：MCP服务器从本地到云端的部署演进](https://aws.amazon.com/cn/blogs/china/agentic-ai-infrastructure-practice-experience-series-four-mcp-server-from-local)

[Agentic AI基础设施实践经验系列（五）：Agent应用系统中的身份认证与授权管理](https://aws.amazon.com/cn/blogs/china/agentic-ai-infrastructure-practice-series-5/)

[Agentic AI基础设施实践经验系列（六）：Agent质量评估](https://aws.amazon.com/cn/blogs/china/agent-quality-evaluation/)

[Agentic AI基础设施实践经验系列（七）：可观测性在Agent应用的挑战与实践](https://aws.amazon.com/cn/blogs/china/agentic-ai-infrastructure-practice-series-7/)

[Agentic AI基础设施实践经验系列（八）：Agent应用的隐私和安全](https://aws.amazon.com/cn/blogs/china/privacy-and-security-of-agent-applications)