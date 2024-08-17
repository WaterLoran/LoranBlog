# Pytest

## 执行用例的方式

| 功能                               | 参考示例                                                     | 备注                                                         |
| ---------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| 执行目录下的所有用例               | pytest -v 测试目录                                           |                                                              |
| 执行时指定生成报告的地址           | pytest -v  --alluredir=E:\development_space\AutoTEST\allure-result | E:\development_space\AutoTEST                                |
| 生成报告                           |                                                              | allure generate E:\development_space\AutoTEST\allure-result -o E:\development_space\AutoTEST\allure_report --clean |
| 使用配套的allure根据报告展示在前端 | allure serve E:\development_space\AutoTEST                   |                                                              |

