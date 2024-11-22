以下是一个完整的方案，用于从 PDF 中生成知识图谱并将其存储到 **图数据库（如 Neo4j）** 中。这个方案包括：

1. **从 PDF 提取文本**。
2. **抽取实体和关系，生成知识图谱**。
3. **将知识图谱存入数据库（以 Neo4j 为例）**。

---

### 1. **方案设计**

#### **核心步骤**
1. **PDF 解析**：
   - 提取文本或结构化内容。
   - 使用工具：`PyPDF2`, `pdfplumber`, 或其他 PDF 解析工具。

2. **实体和关系抽取**：
   - 使用 NLP 工具（如 `spaCy`）识别实体及其关系。
   - 基于命名实体识别（NER）和依存句法分析。

3. **存储到图数据库**：
   - 使用 `py2neo` 或 `Neo4j` 驱动将知识图谱写入数据库。
   - 节点表示实体，边表示关系。

#### **适用场景**
- 法律文档分析：提取法规和引用关系。
- 项目文档分析：识别项目、任务和依赖关系。
- 科学文献挖掘：提取研究主题和实验结果。

---

### 2. **代码实现**

#### **工具安装**
```bash
pip install pdfplumber spacy py2neo networkx matplotlib
```

#### **代码示例**

##### **1. 从 PDF 提取文本**
```python
import pdfplumber

def extract_text_from_pdf(pdf_path):
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text += page.extract_text()
    return text

# 示例：提取文本
pdf_path = "sample.pdf"
pdf_text = extract_text_from_pdf(pdf_path)
print(pdf_text[:500])  # 打印前500字符
```

---

##### **2. 抽取实体和关系**
使用 `spaCy` 进行命名实体识别和依存句法分析。

```python
import spacy

nlp = spacy.load("en_core_web_sm")  # 中文用 zh_core_web_sm

def extract_entities_and_relationships(text):
    doc = nlp(text)
    entities = set()
    relationships = []

    # 抽取实体
    for ent in doc.ents:
        entities.add((ent.text, ent.label_))

    # 抽取关系
    for sent in doc.sents:
        tokens = [token for token in sent if token.dep_ in ("nsubj", "dobj", "ROOT")]
        if len(tokens) == 3:
            subject, action, obj = tokens
            relationships.append((subject.text, action.text, obj.text))

    return entities, relationships

# 示例：抽取实体和关系
entities, relationships = extract_entities_and_relationships(pdf_text)
print("Entities:", entities)
print("Relationships:", relationships)
```

---

##### **3. 构建知识图谱**
使用 `NetworkX` 创建知识图谱，用于存储和可视化。

```python
import networkx as nx

def build_knowledge_graph(entities, relationships):
    graph = nx.DiGraph()

    # 添加实体为节点
    for entity, entity_type in entities:
        graph.add_node(entity, label=entity_type)

    # 添加关系为边
    for subject, action, obj in relationships:
        graph.add_edge(subject, obj, label=action)

    return graph

# 构建知识图谱
knowledge_graph = build_knowledge_graph(entities, relationships)
print("Knowledge Graph Nodes:", knowledge_graph.nodes)
print("Knowledge Graph Edges:", knowledge_graph.edges)
```

---

##### **4. 可视化知识图谱**
```python
import matplotlib.pyplot as plt

def visualize_graph(graph):
    plt.figure(figsize=(12, 8))
    pos = nx.spring_layout(graph)  # 使用 Spring 布局
    nx.draw(graph, pos, with_labels=True, node_size=2000, font_size=10, node_color="skyblue")
    edge_labels = nx.get_edge_attributes(graph, "label")
    nx.draw_networkx_edge_labels(graph, pos, edge_labels=edge_labels, font_size=8)
    plt.title("Knowledge Graph")
    plt.show()

# 可视化
visualize_graph(knowledge_graph)
```

---

##### **5. 存储到 Neo4j 图数据库**

安装 Neo4j 并启动服务（确保已安装并运行 Neo4j 数据库），然后用 `py2neo` 连接数据库。

###### **安装 Neo4j 驱动**
```bash
pip install py2neo
```

###### **将知识图谱写入 Neo4j**
```python
from py2neo import Graph, Node, Relationship

# 连接 Neo4j
graph_db = Graph("bolt://localhost:7687", auth=("neo4j", "password"))

def save_to_neo4j(graph, graph_db):
    # 清除现有数据库内容
    graph_db.delete_all()

    # 添加节点
    for node, data in graph.nodes(data=True):
        graph_db.merge(Node(data['label'], name=node), data['label'], "name")

    # 添加边
    for subject, obj, data in graph.edges(data=True):
        subject_node = graph_db.nodes.match(name=subject).first()
        obj_node = graph_db.nodes.match(name=obj).first()
        if subject_node and obj_node:
            rel = Relationship(subject_node, data['label'], obj_node)
            graph_db.merge(rel)

# 保存到 Neo4j
save_to_neo4j(knowledge_graph, graph_db)
print("Knowledge graph saved to Neo4j.")
```

---

### 3. **扩展优化**

#### **扩展 1: PDF 表格解析**
如果 PDF 包含表格，可以用 `pdfplumber` 提取表格并结构化存储。
```python
tables = []
with pdfplumber.open(pdf_path) as pdf:
    for page in pdf.pages:
        if page.extract_tables():
            tables.extend(page.extract_tables())

print(tables)  # 查看提取的表格内容
```

#### **扩展 2: 高级实体和关系抽取**
使用预训练深度学习模型（如 `transformers`）替代 `spaCy`，提升实体和关系抽取的质量。
```bash
pip install transformers
```
```python
from transformers import pipeline

nlp_relation = pipeline("ner", model="dslim/bert-base-NER")

def extract_advanced_entities(text):
    return nlp_relation(text)

entities = extract_advanced_entities(pdf_text)
print(entities)
```

#### **扩展 3: 数据库增强查询**
利用 Neo4j 的 Cypher 查询语言对知识图谱进行复杂查询，例如查找某实体的所有关系。
```python
query = """
MATCH (a)-[r]->(b) 
RETURN a.name AS Entity1, type(r) AS Relation, b.name AS Entity2
"""
results = graph_db.run(query).data()
print(results)
```

---

### 4. **总结**
- **技术栈**：`pdfplumber`（PDF 解析）、`spaCy`（实体和关系抽取）、`NetworkX`（知识图谱构建）、`Neo4j`（图数据库）。
- **流程**：
  1. 提取 PDF 文本。
  2. 抽取实体和关系，构建知识图谱。
  3. 将知识图谱存储到 Neo4j 并进行查询。
- **适用场景**：适用于法律、医学、学术等领域需要从文档中提取关系的任务。

如果需要更多功能（如大规模处理或多文档整合），可以进一步扩展！