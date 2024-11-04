`requests` 库是 Python 中一个非常流行且易于使用的 HTTP 客户端库，广泛用于发送 HTTP 请求。以下是 `requests` 库的一些基本用法和功能介绍。

### 安装

可以使用 `pip` 安装 `requests` 库：

```bash
pip install requests
```

### 基本用法

1. **发送 GET 请求**

```python
import requests

response = requests.get('https://api.example.com/data')
print(response.status_code)  # 打印状态码
print(response.text)         # 打印响应内容
```

2. **发送 POST 请求**

```python
data = {'key1': 'value1', 'key2': 'value2'}
response = requests.post('https://api.example.com/submit', data=data)
print(response.json())       # 打印 JSON 格式的响应
```

3. **添加请求头**

```python
headers = {'Authorization': 'Bearer YOUR_TOKEN'}
response = requests.get('https://api.example.com/protected', headers=headers)
print(response.text)
```

4. **发送 JSON 数据**

```python
import json

json_data = {'key': 'value'}
response = requests.post('https://api.example.com/submit', json=json_data)
print(response.json())
```

5. **处理查询参数**

```python
params = {'search': 'python', 'page': 2}
response = requests.get('https://api.example.com/search', params=params)
print(response.url)          # 打印最终请求的 URL
```

6. **上传文件**

```python
files = {'file': open('report.xls', 'rb')}
response = requests.post('https://api.example.com/upload', files=files)
print(response.text)
```

### 错误处理

在处理请求时，可以使用异常处理来捕获错误：

```python
try:
    response = requests.get('https://api.example.com/data')
    response.raise_for_status()  # 抛出HTTPError异常，如果响应状态码为4xx或5xx
except requests.exceptions.RequestException as e:
    print(f'请求错误: {e}')
```

### 其他功能

- **会话对象**：可以使用 `requests.Session()` 来保持某些参数的持久性（如 cookie、头部等）。

```python
session = requests.Session()
session.headers.update({'Authorization': 'Bearer YOUR_TOKEN'})
response = session.get('https://api.example.com/protected')
```

- **超时设置**：可以设置请求的超时时间，以防止请求挂起。

```python
response = requests.get('https://api.example.com/data', timeout=5)  # 超时设置为5秒
```

### 总结

`requests` 库提供了一个简单而强大的 API，使得在 Python 中发送 HTTP 请求变得非常容易。它支持 GET、POST 等多种请求方式，能够处理 JSON 数据、文件上传以及自定义请求头等。使用 `requests` 时，务必注意错误处理和超时设置，以提升代码的健壮性。