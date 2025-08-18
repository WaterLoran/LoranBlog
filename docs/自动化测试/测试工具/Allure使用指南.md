X# Allure使用指南

## Allure常用命令

| 功能                 | 命令                                                        |
| -------------------- | ----------------------------------------------------------- |
| 执行pytest并生成结果 | pytest -vs .\test_good.py --alluredir ./allure_result       |
| 生成报告             | allure generate .\allure_result\ -o .\allure_report --clean |
| 根据报告启动web服务  | allure open -h 127.0.0.1 -p 8083 .\allure_report\           |
| 生成并打开测试报告   | allure server ./allure_result                               |
| 查看allure当前报告   | allure --version                                            |



## Allure命令行参数

使用pytest -h 即可查看具体内容

具体的使用命令为pytest -v --alluredir ./report/allure --allure-epics=epics名称

| 功能                           | 具体命令                           |
| ------------------------------ | ---------------------------------- |
| 根据严重程度标记去筛选用例     | --allure-severities=SEVERITIES_SET |
| 根据epics标记去筛选用例        | --allure-epics=EPICS_SET           |
| 根据features标记去筛选用例     | --allure-features=FEATURES_SET     |
| 根据stories标记去筛选用例      | --allure-stories=STORIES_SET       |
| 根据ids标记去筛选用例          | --allure-ids=IDS_SET               |
| 根据link-pattern标记去筛选用例 | --allure-link-pattern=LINK_PATTERN |
|                                |                                    |



## Allure用例描述

| Allure用例描述            |                    |                                               |
| ------------------------- | ------------------ | --------------------------------------------- |
| 使用方法                  | 参数值             | 参数说明                                      |
| @allure.epic()            | epic描述           | 定义项目、当有多个项目是使用。往下是feature   |
| @allure.feature()         | 模块名称           | 用例按照模块区分，有多个模块时给每个起名字    |
| @allure.story()           | 用例名称           | 一个用例的描述                                |
| @allure.title(用例的标题) | 用例标题           | 一个用例标题                                  |
| @allure.testcase()        | 测试用例的连接地址 | 自动化用例对应的功能用例存放系统的地址        |
| @allure.issue()           | 缺陷地址           | 对应缺陷管理系统里边的缺陷地址                |
| @allure.description()     | 用例描述           | 对测试用例的详细描述                          |
| @allure.step()            | 操作步骤           | 测试用例的操作步骤                            |
| @allure.severity()        | 用例等级           | blocker 、critical 、normal 、minor 、trivial |
| @allure.link()            | 定义连接           | 用于定义一个需要在测试报告中展示的连接        |
| @allure.attachment()      | 附件               | 添加测试报告附件                              |



## Allure动态更新信息

| 功能            | 代码表达式或函数             |
| --------------- | ---------------------------- |
| 修改feature     | allure.dynamic.feature()     |
| 修改link        | allure.dynamic.link()        |
| 修改issue       | allure.dynamic.issue()       |
| 修改testcase    | allure.dynamic.testcase()    |
| 修改story       | allure.dynamic.story()       |
| 修改title       | allure.dynamic.title()       |
| 修改description | allure.dynamic.description() |











