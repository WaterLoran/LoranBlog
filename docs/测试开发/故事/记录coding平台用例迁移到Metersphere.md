算一个优秀实践, 但不大, 反而有点小

## 背景

因为某些原因要把用例迁移到自建的Metersphere平台

### 思路

找GPT编写脚本, 然后二次修改和验证

问GPT的原话

```txt
我有两个Excel文件, 第一个文件是 coding上的所有用例导出.csv,  他里面只有一个页
他的第一行有下面的这些标题

分组 
编号	
标题	
关联需求	
所属标签	
等级	
前置条件	
用例说明	
类型	
步骤	
预期结果	
评估工时	
评审状态	
创建人	
创建时间	
更新人	
更新时间

我想将这个csv文件转换成另外一个excel文件的格式, 新的文件名是  metersphere用例模板.xlsx

ID
用例名称
所属模块
前置条件
步骤描述
预期结果	
编辑模式	
备注	
标签	
责任人	
用例等级

然后我给你说一下对应的映射关系

分组  转成  所属模块
编号	 转成 ID
标题     	转成 用例名称
关联需求	不转换
所属标签	不转换
等级	   转成  用例等级
前置条件	转成 前置条件
用例说明     不转换 
类型	    转成  编辑模式
步骤	   转成  步骤描述
预期结果	 转成  预期结果 
评估工时	不转换 
评审状态	不转换 
创建人	    转成 责任人  
创建时间	不转换 
更新人	     不转换 
更新时间     不转换 

帮我写一个 python 脚本, 来帮我实现这些事情, 要注意代码的可读性, 解耦, 优先使用openpyxl 
```

得出来的脚本还需要根据实际验证, 小小修改, 比如有那个BOM问题, 最终修改的代码如下

相关脚本如下

```python
import csv
from openpyxl import Workbook

# 定义CSV到目标Excel的列映射
COLUMN_MAPPING = {
    "分组": "所属模块",
    "编号": "ID",
    "标题": "用例名称",
    "等级": "用例等级",
    "前置条件": "前置条件",
    "类型": "编辑模式",
    "步骤": "步骤描述",
    "预期结果": "预期结果",
    "创建人": "责任人"
}

# 从CSV读取数据
def read_csv_file(csv_file_path):
    data = []
    with open(csv_file_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        # 处理BOM问题
        if reader.fieldnames:
            reader.fieldnames = [field.replace('\ufeff', '') for field in reader.fieldnames]
        for row in reader:

            ########################################################################################
            # 下面是直接对原始数据进行修改, 后面可考虑抽离出去
            # 给分组加上前置的  /
            if not str(row["分组"]).startswith("/"):
                row["分组"] = '/' + row["分组"]
            row["分组"] = "/conding导入" + row["分组"]

            # 如果 编辑模式 是 文本的, 先处理成 步骤, 加上前置的 [1], 最后再修改成TEXT, 对原始数据进行修改
            if row["类型"] == "文本":
                row["步骤"] = '[1]' + row["步骤"]
                row["预期结果"] = '[1]' + row["预期结果"]
            row["类型"] = "TEXT"

            if row["创建人"] == "xingming":
                row["创建人"] = "姓名"

            # 对用例ID增加  "coding_"   前缀
            row["编号"] = "coding_" + row["编号"]

            ########################################################################################
            data.append(row)

    return data

# 创建Excel文件并写入数据
def write_to_excel(data, excel_file_path):
    wb = Workbook()
    ws = wb.active

    # 写入目标Excel的标题行
    headers = ["ID", "用例名称", "所属模块", "前置条件", "步骤描述", "预期结果", "编辑模式", "备注", "标签", "责任人", "用例等级"]
    ws.append(headers)

    # 写入数据
    for row in data:
        new_row = [
            row.get("编号", ""),           # ID
            row.get("标题", ""),           # 用例名称
            row.get("分组", ""),           # 所属模块
            row.get("前置条件", ""),       # 前置条件
            row.get("步骤", ""),           # 步骤描述
            row.get("预期结果", ""),       # 预期结果
            row.get("类型", ""),           # 编辑模式
            "",                            # 备注 (没有映射)
            "",                            # 标签 (没有映射)
            row.get("创建人", ""),         # 责任人
            row.get("等级", "")            # 用例等级
        ]
        ws.append(new_row)

    # 保存Excel文件
    wb.save(excel_file_path)

# 主函数
def convert_csv_to_excel(csv_file_path, excel_file_path):
    # 读取CSV文件
    data = read_csv_file(csv_file_path)

    # 写入到Excel文件
    write_to_excel(data, excel_file_path)

# 执行转换
if __name__ == "__main__":
    csv_file = "coding上的所有用例导出.csv"
    excel_file = "MS格式的Coding老用例.xlsx"
    convert_csv_to_excel(csv_file, excel_file)

```

最终花费2H, 将用例迁移过来了

