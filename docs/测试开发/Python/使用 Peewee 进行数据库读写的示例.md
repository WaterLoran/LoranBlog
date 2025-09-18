# 使用 Peewee 进行数据库读写的示例

Peewee 是一个轻量级的 Python ORM（对象关系映射）库，它简单易用且功能强大。下面我将通过一个完整的示例展示如何使用 Peewee 进行数据库的读写操作。

## 安装 Peewee

首先，你需要安装 Peewee 库：

```bash
pip install peewee
```

## 基本示例

以下是一个使用 Peewee 进行数据库操作的完整示例：

```python
from peewee import *
import datetime

# 定义数据库（这里使用 SQLite，你也可以使用 MySQL 或 PostgreSQL）
database = SqliteDatabase('my_database.db')

# 定义基模型
class BaseModel(Model):
    class Meta:
        database = database

# 定义用户模型（对应数据库表）
class User(BaseModel):
    username = CharField(unique=True, max_length=50)
    email = CharField(max_length=100)
    join_date = DateTimeField(default=datetime.datetime.now)
    is_active = BooleanField(default=True)

# 定义文章模型（与用户关联）
class Article(BaseModel):
    title = CharField(max_length=100)
    content = TextField()
    author = ForeignKeyField(User, backref='articles')
    created_at = DateTimeField(default=datetime.datetime.now)
    views = IntegerField(default=0)

# 连接数据库并创建表
def create_tables():
    with database:
        database.create_tables([User, Article])

# 添加示例数据
def add_sample_data():
    # 创建用户
    user1 = User.create(username='john_doe', email='john@example.com')
    user2 = User.create(username='jane_smith', email='jane@example.com')
    
    # 创建文章
    Article.create(
        title='My First Post',
        content='This is the content of my first post.',
        author=user1
    )
    
    Article.create(
        title='Python Tips',
        content='Here are some useful Python tips...',
        author=user1
    )
    
    Article.create(
        title='Web Development',
        content='Introduction to web development...',
        author=user2
    )

# 查询示例
def query_examples():
    print("=== 查询所有用户 ===")
    users = User.select()
    for user in users:
        print(f"{user.id}: {user.username} - {user.email}")
    
    print("\n=== 查询特定用户 ===")
    john = User.get(User.username == 'john_doe')
    print(f"Found user: {john.username}")
    
    print("\n=== 查询活跃用户 ===")
    active_users = User.select().where(User.is_active == True)
    for user in active_users:
        print(f"Active user: {user.username}")
    
    print("\n=== 查询用户及其文章 (JOIN) ===")
    query = (User
             .select(User, Article)
             .join(Article)
             .where(User.username == 'john_doe'))
    
    for user in query:
        print(f"{user.username}'s article: {user.article.title}")

# 更新示例
def update_examples():
    # 更新单个记录
    user = User.get(User.username == 'john_doe')
    user.email = 'john.doe@newemail.com'
    user.save()
    
    print(f"Updated email: {user.email}")
    
    # 批量更新
    query = User.update(is_active=False).where(User.join_date < datetime.datetime(2023, 1, 1))
    updated_count = query.execute()
    print(f"Updated {updated_count} users")

# 删除示例
def delete_examples():
    # 删除单个记录
    user = User.get(User.username == 'jane_smith')
    user.delete_instance()
    print(f"Deleted user: {user.username}")
    
    # 批量删除
    query = Article.delete().where(Article.views < 10)
    deleted_count = query.execute()
    print(f"Deleted {deleted_count} articles")

# 事务示例
def transaction_example():
    with database.atomic() as transaction:
        try:
            # 创建用户
            new_user = User.create(username='test_user', email='test@example.com')
            
            # 创建文章
            Article.create(
                title='Test Article',
                content='This is a test article.',
                author=new_user
            )
            
            print("Transaction completed successfully")
        except Exception as e:
            print(f"Transaction failed: {e}")
            # 发生异常时会自动回滚
            raise

# 主函数
def main():
    # 创建表
    create_tables()
    
    # 添加示例数据
    add_sample_data()
    
    # 执行查询
    query_examples()
    
    # 执行更新
    update_examples()
    
    # 执行删除
    delete_examples()
    
    # 事务示例
    transaction_example()
    
    # 关闭数据库连接
    database.close()

if __name__ == '__main__':
    main()
```

## 更复杂的查询示例

```python
# 复杂查询示例
def complex_queries():
    # 使用表达式
    from peewee import fn
    
    print("=== 统计每个用户的文章数量 ===")
    query = (User
             .select(User.username, fn.COUNT(Article.id).alias('article_count'))
             .join(Article, JOIN.LEFT_OUTER)
             .group_by(User.username))
    
    for user in query:
        print(f"{user.username}: {user.article_count} articles")
    
    print("\n=== 查询浏览量最高的文章 ===")
    most_viewed = (Article
                   .select()
                   .order_by(Article.views.desc())
                   .limit(1)
                   .get())
    print(f"Most viewed: '{most_viewed.title}' with {most_viewed.views} views")
    
    print("\n=== 使用子查询 ===")
    # 查找文章数量大于1的用户
    subquery = (Article
                .select(fn.COUNT(Article.id))
                .where(Article.author == User.id)
                .group_by(Article.author)
                .having(fn.COUNT(Article.id) > 1))
    
    users_with_multiple_articles = User.select().where(subquery.exists())
    for user in users_with_multiple_articles:
        print(f"User with multiple articles: {user.username}")

# 分页示例
def pagination_example():
    page_number = 1
    page_size = 10
    
    # 获取第2页的文章，每页10条
    query = Article.select().order_by(Article.created_at.desc())
    total_count = query.count()
    total_pages = (total_count + page_size - 1) // page_size
    
    articles = query.paginate(page_number, page_size)
    
    print(f"Page {page_number} of {total_pages} (total: {total_count} articles)")
    for article in articles:
        print(f"- {article.title}")

# 在main函数中添加这些示例
def main():
    # ... 之前的代码 ...
    
    # 复杂查询
    complex_queries()
    
    # 分页示例
    pagination_example()
    
    # ... 其余的代码 ...
```

## 使用 MySQL 或 PostgreSQL

如果你想使用 MySQL 或 PostgreSQL 而不是 SQLite，只需要更改数据库连接配置：

```python
# 对于 MySQL
from peewee import MySQLDatabase

database = MySQLDatabase(
    'my_database',
    user='your_username',
    password='your_password',
    host='localhost',
    port=3306
)

# 对于 PostgreSQL
from peewee import PostgresqlDatabase

database = PostgresqlDatabase(
    'my_database',
    user='your_username',
    password='your_password',
    host='localhost',
    port=5432
)
```

## 最佳实践

1. **使用连接池**（对于高并发应用）：
   ```python
   from playhouse.pool import PooledPostgresqlDatabase
   
   database = PooledPostgresqlDatabase(
       'my_database',
       max_connections=20,
       stale_timeout=300,
       user='your_username',
       password='your_password'
   )
   ```

2. **使用迁移工具**（对于生产环境）：
   Peewee 本身不包含迁移工具，但你可以使用 `peewee-migrations` 或 `peewee-db-evolve` 等第三方库。

3. **优化查询**：
   - 使用 `select()` 时只选择需要的字段
   - 使用 `prefetch()` 或 `join()` 来减少查询次数
   - 对常用查询字段添加索引

4. **错误处理**：
   ```python
   try:
       user = User.get(User.id == 123)
   except User.DoesNotExist:
       print("User not found")
   except Exception as e:
       print(f"Error: {e}")
   ```

这个示例展示了 Peewee 的基本用法，包括模型定义、CRUD 操作、复杂查询和事务处理。Peewee 的 API 设计非常直观，使得数据库操作变得简单而高效。