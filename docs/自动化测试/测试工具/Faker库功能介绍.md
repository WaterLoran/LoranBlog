# Faker库功能介绍

Faker 库支持的功能非常丰富，涵盖了各种类型的数据生成。以下是 Faker 库支持的所有主要功能分类：

## 1. 基础信息 (Base)

### 布尔值和空值
```python
fake.boolean()           # 随机布尔值
fake.null_boolean()      # 随机 None 或布尔值
```

### 二进制和编码
```python
fake.binary()            # 随机二进制数据
fake.md5()               # MD5 哈希
fake.sha1()              # SHA1 哈希
fake.sha256()            # SHA256 哈希
fake.uuid4()             # UUID4
```

### 其他基础
```python
fake.password()          # 随机密码
fake.locale()            # 随机区域设置
fake.language_code()     # 语言代码
```

## 2. 个人信息 (Person)

### 姓名相关
```python
fake.name()              # 全名
fake.first_name()        # 名
fake.last_name()         # 姓
fake.prefix()            # 前缀 (Mr., Dr.等)
fake.suffix()            # 后缀 (Jr., PhD等)
fake.name_male()         # 男性全名
fake.name_female()       # 女性全名
fake.first_name_male()   # 男性名
fake.first_name_female() # 女性名
fake.last_name_male()    # 男性姓
fake.last_name_female()  # 女性姓
```

### 个人资料
```python
fake.profile()           # 完整个人资料
fake.simple_profile()    # 简化个人资料
fake.ssn()               # 社会安全号码
```

## 3. 地址信息 (Address)

### 地址组件
```python
fake.address()           # 完整地址
fake.street_address()    # 街道地址
fake.street_name()       # 街道名
fake.street_suffix()     # 街道后缀
fake.building_number()   # 建筑编号
fake.secondary_address() # 次要地址
```

### 地理位置
```python
fake.city()              # 城市
fake.city_suffix()       # 城市后缀
fake.city_prefix()       # 城市前缀
fake.state()             # 州/省
fake.state_abbr()        # 州/省缩写
fake.zipcode()           # 邮编
fake.postcode()          # 邮政编码
fake.country()           # 国家
fake.country_code()      # 国家代码
```

### 坐标
```python
fake.latitude()          # 纬度
fake.longitude()         # 经度
fake.latlng()            # 经纬度元组
fake.local_latlng()      # 本地坐标
```

## 4. 网络信息 (Internet)

### 邮箱
```python
fake.email()             # 随机邮箱
fake.safe_email()        # 安全邮箱
fake.free_email()        # 免费邮箱
fake.company_email()     # 公司邮箱
```

### 网络地址
```python
fake.url()               # URL
fake.domain_name()       # 域名
fake.domain_word()       # 域名词
fake.tld()               # 顶级域名
fake.uri()               # URI
fake.uri_extension()     # URI扩展
fake.uri_page()          # URI页面
fake.uri_path()          # URI路径
```

### IP地址和网络
```python
fake.ipv4()              # IPv4地址
fake.ipv6()              # IPv6地址
fake.mac_address()       # MAC地址
fake.port_number()       # 端口号
```

### 用户信息
```python
fake.user_name()         # 用户名
fake.user_agent()        # 用户代理
```

## 5. 联系方式 (Phone Number)

```python
fake.phone_number()      # 电话号码
fake.msisdn()            # MSISDN号码
fake.cell_phone()        # 手机号码
```

## 6. 公司信息 (Company)

```python
fake.company()           # 公司名
fake.company_suffix()    # 公司后缀
fake.catch_phrase()      # 口号/标语
fake.bs()                # 商业术语
```

## 7. 职业信息 (Job)

```python
fake.job()               # 职业
```

## 8. 日期和时间 (Date Time)

### 日期
```python
fake.date()              # 日期
fake.date_time()         # 日期时间
fake.date_time_this_century()    # 本世纪内
fake.date_time_this_decade()     # 最近十年内
fake.date_time_this_year()       # 今年内
fake.date_time_this_month()      # 本月内
```

### 时间范围
```python
fake.date_time_between() # 指定时间范围内
fake.time_delta()        # 时间增量
fake.date_time_ad()      # 公元后日期
```

### 特定日期
```python
fake.future_date()       # 未来日期
fake.future_datetime()   # 未来日期时间
fake.past_date()         # 过去日期
fake.past_datetime()     # 过去日期时间
```

### 日期组件
```python
fake.year()              # 年份
fake.month()             # 月份
fake.month_name()        # 月份名称
fake.day_of_week()       # 星期几
fake.day_of_month()      # 月中的某天
fake.time()              # 时间
fake.am_pm()             # AM/PM
```

### 时间戳
```python
fake.unix_time()         # Unix时间戳
fake.date_of_birth()     # 出生日期
```

## 9. 文本和内容 (Lorem)

### 文本生成
```python
fake.word()              # 单词
fake.words()             # 多个单词
fake.sentence()          # 句子
fake.sentences()         # 多个句子
fake.paragraph()         # 段落
fake.paragraphs()        # 多个段落
fake.text()              # 文本
fake.texts()             # 多个文本
```

### 特定长度文本
```python
fake.word(ext_word_list=None)    # 指定词表
fake.sentence(nb_words=6)        # 指定单词数
fake.paragraph(nb_sentences=3)   # 指定句子数
fake.text(max_nb_chars=200)      # 指定字符数
```

## 10. 金融数据 (Finance)

### 货币
```python
fake.currency()          # 货币信息
fake.currency_code()     # 货币代码
fake.currency_name()     # 货币名称
fake.currency_symbol()   # 货币符号
fake.cryptocurrency()    # 加密货币
fake.cryptocurrency_code() # 加密货币代码
fake.cryptocurrency_name() # 加密货币名称
```

### 银行信息
```python
fake.bban()              # 基本银行账号
fake.iban()              # IBAN号码
fake.swift()             # SWIFT代码
fake.swift11()           # 11位SWIFT代码
fake.swift8()            # 8位SWIFT代码
```

### 信用卡
```python
fake.credit_card_full()  # 完整信用卡信息
fake.credit_card_number() # 信用卡号
fake.credit_card_provider() # 信用卡提供商
fake.credit_card_expire() # 信用卡过期日期
fake.credit_card_security_code() # 安全码
```

### 价格
```python
fake.pricetag()          # 价格标签
```

## 11. 文件和路径 (File)

```python
fake.file_name()         # 文件名
fake.file_extension()    # 文件扩展名
fake.file_path()         # 文件路径
fake.unix_device()       # Unix设备
fake.unix_partition()    # Unix分区
fake.mime_type()         # MIME类型
```

## 12. 颜色 (Color)

```python
fake.color_name()        # 颜色名称
fake.hex_color()         # 十六进制颜色
fake.rgb_color()         # RGB颜色
fake.rgb_css_color()     # RGB CSS颜色
fake.safe_color_name()   # 安全颜色名称
fake.safe_hex_color()    # 安全十六进制颜色
```

## 13. 条形码 (Barcode)

```python
fake.ean()               # EAN码
fake.ean8()              # EAN-8码
fake.ean13()             # EAN-13码
fake.upc_a()             # UPC-A码
fake.upc_e()             # UPC-E码
```

## 14. Python特定 (Python)

```python
fake.pybool()            # Python布尔值
fake.pydecimal()         # Python Decimal
fake.pydict()            # Python字典
fake.pyfloat()           # Python浮点数
fake.pyint()             # Python整数
fake.pyiterable()        # Python可迭代对象
fake.pylist()            # Python列表
fake.pyobject()          # Python对象
fake.pyset()             # Python集合
fake.pystr()             # Python字符串
fake.pystr_format()      # 格式化字符串
fake.pytuple()           # Python元组
```

## 15. 杂项 (Misc)

```python
fake.random_digit()      # 随机数字
fake.random_digit_not_null() # 非零随机数字
fake.random_digit_above_two() # 大于2的随机数字
fake.random_element()    # 随机元素
fake.random_letters()    # 随机字母
fake.random_lowercase_letter() # 随机小写字母
fake.random_number()     # 随机数字
fake.random_uppercase_letter() # 随机大写字母
fake.randomize_nb_elements() # 随机元素数量
```

## 16. 特定领域提供者

### 汽车 (Automotive)
```python
fake.license_plate()     # 车牌号
```

### 银行 (Bank)
```python
fake.bank_country()      # 银行国家
```

### 生物 (Biology)
```python
fake.dna_sequence()      # DNA序列
```

### 美食 (Food)
```python
fake.dish()              # 菜肴
fake.fruit()             # 水果
fake.vegetable()         # 蔬菜
```

### 医疗 (Medical)
```python
fake.medical_profession() # 医疗职业
fake.medical_code()      # 医疗代码
```

## 17. 本地化支持

Faker 支持多种语言和地区，例如：
- `zh_CN` - 中文(中国)
- `zh_TW` - 中文(台湾)
- `ja_JP` - 日语
- `ko_KR` - 韩语
- `en_US` - 英语(美国)
- `en_GB` - 英语(英国)
- `fr_FR` - 法语
- `de_DE` - 德语
- `es_ES` - 西班牙语
- 等等...

## 18. 自定义提供者

你可以创建自定义提供者：

```python
from faker import Faker
from faker.providers import BaseProvider

class MyProvider(BaseProvider):
    def custom_method(self):
        return "自定义数据"

fake = Faker()
fake.add_provider(MyProvider)
print(fake.custom_method())
```

## 19. 查看所有可用方法

```python
from faker import Faker

fake = Faker()

# 查看所有可用方法
methods = [method for method in dir(fake) if not method.startswith('_')]
print("可用方法数量:", len(methods))
print("方法列表:", methods)

# 查看特定提供者的方法
print("\nPerson提供者的方法:")
person_methods = [method for method in dir(fake) if not method.startswith('_') and hasattr(fake, method)]
print(person_methods[:10])  # 显示前10个
```

## 20. 实用功能

### 唯一值生成
```python
fake.unique.boolean()    # 唯一布尔值
```

### 随机种子
```python
Faker.seed(1234)         # 设置随机种子
```

### 批量生成
```python
# 生成多个相同类型的数据
names = [fake.name() for _ in range(10)]
emails = [fake.email() for _ in range(10)]
```

Faker 库的功能非常全面，几乎涵盖了所有常见的数据类型生成需求。要查看最新和完整的功能列表，建议查阅官方文档或使用 `dir(fake)` 查看当前安装版本的所有可用方法。