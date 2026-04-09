# 使用RagFlow对本地git仓库做知识库

用 Git 管理 md 文件，变更后自动同步到向量库，再通过 API 检索——**RAGFlow 完全能够支持，而且正好契合它的设计定位**。

它提供了完整的 RESTful API，覆盖从知识库管理、文档上传解析到向量检索的全流程，可以很方便地集成到你的脚本或 CI/CD 流水线中。

---

### 一、整体实现思路

你可以设计一个简单的自动化流程：

```
Git push/md文件变更 → 触发脚本 → 调用RAGFlow API → 更新向量数据库
```

然后在你的 Agent 应用中，通过 RAGFlow 的检索 API 直接获取相关内容。


### 二、需要调用的核心 API 接口

以下是基于 RAGFlow API 实现你需求的关键步骤，每个接口都有明确的用途：

| 步骤                      | 接口                                           | 说明                                                         |
| ------------------------- | ---------------------------------------------- | ------------------------------------------------------------ |
| **1. 创建/获取知识库**    | `POST /api/v1/datasets`                        | 创建一个知识库（Dataset），得到 `dataset_id`，这是后续操作的容器 |
| **2. 上传 md 文件**       | `POST /api/v1/datasets/{dataset_id}/documents` | 将你的 markdown 文件上传到指定知识库                         |
| **3. 触发解析**           | `POST /api/v1/datasets/{dataset_id}/chunks`    | 启动异步解析流程，RAGFlow 会自动分块、向量化并写入向量库     |
| **4. 查询解析状态**       | `GET /api/v1/files/{file_id}/status`           | 轮询检查文档是否解析完成，确保检索前数据已就绪               |
| **5. 检索内容**           | `POST /api/v1/retrieval`                       | 传入 `dataset_ids` 和 `question`，返回语义相关的 chunks      |
| **6. （可选）对话式问答** | `POST /api/v1/chats/{chat_id}/completions`     | 如果需要 LLM 基于检索结果生成答案，可以用这个接口            |


### 三、具体操作示例

#### 1. 创建知识库

```bash
curl --request POST \
     --url http://{ragflow_address}/api/v1/datasets \
     --header 'Content-Type: application/json' \
     --header 'Authorization: Bearer <YOUR_API_KEY>' \
     --data '{
      "name": "my_md_knowledge_base",
      "chunk_method": "naive",
      "embedding_model": "BAAI/bge-large-zh-v1.5@BAAI"
     }'
```

#### 2. 编写同步脚本

你可以写一个简单的 Python 脚本，放在 Git 仓库中，在文件变更后自动执行：

```python
import os
import time
import requests

RAGFLOW_URL = "http://your-ragflow-server:9380"
API_KEY = "your_api_key"
DATASET_ID = "your_dataset_id"
MD_DIR = "./docs"  # 你的 md 文件目录

headers = {"Authorization": f"Bearer {API_KEY}"}

def upload_and_parse(file_path):
    # 1. 上传文档
    with open(file_path, "rb") as f:
        files = {"file": f}
        upload_resp = requests.post(
            f"{RAGFLOW_URL}/api/v1/datasets/{DATASET_ID}/documents",
            headers=headers,
            files=files
        )
    file_id = upload_resp.json()["data"][0]["id"]
    
    # 2. 触发解析
    parse_resp = requests.post(
        f"{RAGFLOW_URL}/api/v1/datasets/{DATASET_ID}/chunks",
        headers=headers,
        json={"document_ids": [file_id]}
    )
    
    # 3. 轮询等待解析完成
    while True:
        status_resp = requests.get(
            f"{RAGFLOW_URL}/api/v1/files/{file_id}/status",
            headers=headers
        )
        if status_resp.json()["data"]["status"] == "parsed":
            print(f"✅ {file_path} 解析完成")
            break
        time.sleep(2)

# 监听文件变更（可配合 git hook 或 watchdog）
# 这里仅示意，实际使用时可以监听文件变更事件
for filename in os.listdir(MD_DIR):
    if filename.endswith(".md"):
        upload_and_parse(os.path.join(MD_DIR, filename))
```

#### 3. 检索 API 调用

在 Agent 应用中，直接调用检索接口获取相关内容：

```bash
curl --request POST \
     --url http://{ragflow_address}/api/v1/retrieval \
     --header 'Content-Type: application/json' \
     --header 'Authorization: Bearer <YOUR_API_KEY>' \
     --data '{
      "question": "你的查询问题",
      "dataset_ids": ["your_dataset_id"],
      "top_k": 5
     }'
```

返回结果包含 `content`（原文片段）、`source`（文件名）、`vector_similarity`（相似度分数）等，可以直接用于你的 Agent。


### 四、几个需要留意的地方

1. **文件变更检测**：你可以在 Git 仓库中配置 post-commit 或 post-merge hook，在 `git pull` 或 commit 后自动触发同步脚本。也可以用 `inotifywait`（Linux）或 fswatch（macOS）监听文件目录变化。

2. **解析是异步的**：文档上传后不会立即完成索引，需要轮询状态接口确认 `parsed` 后再进行检索，否则可能查不到新内容。

3. **批量操作**：如果有大量 md 文件，可以参考社区项目 `ragflow-upload` 的做法，实现批量遍历上传。

4. **更新 vs 删除**：
   - **更新**：可以先删除原文档再上传新版本，或者直接上传同名文档（RAGFlow 会生成新 file_id，旧数据仍在）。
   - **删除**：需要调用文档删除接口（`DELETE /api/v1/datasets/{dataset_id}/documents/{document_id}`）来清理向量库中的对应数据。

5. **API 鉴权**：所有接口都需要在 Header 中携带 `Authorization: Bearer <api_key>`，API Key 需要在 RAGFlow 管理后台生成。


### 五、与自研方案的对比

基于你描述的场景，用 RAGFlow 相比自研有几个明显的优势：

| 维度         | 用 RAGFlow                       | 自研                                               |
| ------------ | -------------------------------- | -------------------------------------------------- |
| **开发成本** | 几天完成脚本集成                 | 需要自己处理分块策略、向量化、向量库运维、API 封装 |
| **维护成本** | 升级 RAGFlow 版本即可获得优化    | 需要持续维护所有组件                               |
| **功能扩展** | 内置混合检索、重排序、多格式支持 | 需要自己实现                                       |
| **文件更新** | API 覆盖完整 CRUD 操作           | 自己设计增量更新逻辑                               |

如果你的核心价值在于 Agent 的业务逻辑，而不是 RAG 基础设施本身，用 RAGFlow 是非常合适的方案。