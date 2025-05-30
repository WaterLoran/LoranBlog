### 什么是钩子函数？

钩子函数在pytest称之为Hook函数,它pytest框架的开发者，为了让用户更好的去扩展开发预留的一些函数。而预留的这些函数，在整个测试执行的生命周期中特定的阶段会自动去调用执行。如下图：

![pytest的钩子函数](/images/pytest/pytest的钩子函数.jpg)

关于pytest中的预留钩子，可以通过开发插件，和在conftest.py去实现这些钩子。每个钩子函数可以在多个插件中实现，每个钩子和执行的函数比是：1：N。

pytest中的钩子函数按功能一共分为6类：引导钩子，初始化钩子、用例收集钩子、用例执行钩子、报告钩子、调试钩子，本文主要给大家介绍引导钩子和初始化钩子。

## 一、引导钩子

引导钩子调用足够早，主要作用是用来解析命令和注册插件（内部插件和 setuptools 插件）。

#### 1、pytest_load_initial_conftests

> ###### 参数：
>
> - early_config：pytest 配置对象。
> - args：命令行上传递的参数。
> - parser：命令行添加的选项。
>
> **触发时机**：
>
> - 当在命令行通过pytest执行命令时，会先执行该钩子函数
>
> **默认作用：**
>
> - 加载conftest.py文件
>
> **注意点：**
>
> - 该钩子函数只有定义在插件中才会调用，在conftest定义则不会调用

#### 2、pytest_cmdline_main

> **触发时机：**执行运行主命令后执行
>
> ##### 默认作用：
>
> - 调用命令解析钩子`pytest_cmdline_parse`和执行runtest_mainloop
>
> ###### 参数
>
> - config：pytest 配置对象

#### 3、pytest_cmdline_parse

> ###### 参数
>
> - args：命令行上传递的参数。
> - pluginmanager  ：插件管理器
>
> ###### 默认作用：
>
> - 用来初始化配置对象，解析指定的参数
>
> ###### 注意点：
>
> - 该钩子函数只有定义在插件中才会调用，在conftest定义则不会调用

## 二、初始化钩子

初始化钩子用来调用插件和`conftest.py`文件的初始化

#### 1、pytest_addoption

> ###### 参数
>
> - parser ：参数解析器
> - pluginmanager ：插件管理器
>
> ###### 触发时机：
>
> - conftest文件加载完之后执行， 在测试运行开始时调用一次。
>
> ###### 作用：
>
> - 添加运行命令的命令行参数，pytest.ini的配置参数
>
> ###### Demo:
>
> ```python
> python
> 
>  体验AI代码助手
>  代码解读
> 复制代码# 添加一个运行参数：--name
> def pytest_addoption(parser,pluginmanager ):
> parser.addoption(
>   "--name",
>   action="store",
>   dest="name",
>   default="World",
>   help='参数的帮助提示信息',
> )
>   
> # 添加一个ini文件的配置项
> def pytest_addoption(parser,pluginmanager ):
> parser.addini(
>   "name",
>   help='参数的帮助提示信息',
>   type="string",
>   default="musen",
> )
> ```

#### 2、pytest_configure

> ###### 参数
>
> - config：pytest配置对象
>
> ###### 触发时机：
>
> - 在解析命令行选项后，每个插件和初始 conftest 文件都会调用此钩子,
> - 在导入其他 conftest 文件时调用该钩子。
>
> ###### 默认作用：
>
> - 允许插件和 conftest 文件执行初始配置。

#### 3、pytest_unconfigure

> ###### 参数
>
> - config：pytest配置对象
>
> ###### 触发时机：
>
> - 在退出测试过程之前调用

#### 4、pytest_sessionstart

> ###### 参数
>
> - session：pytest 会话对象
>
> ###### 触发时机：
>
> - 在创建Session对象之后、执行收集测试用例之前调用

#### 5、pytest_sessionfinish

> ###### 参数
>
> - session： pytest 会话对象
> - exitstatus： pytest 将返回系统的状态
>
> ###### 触发时机：
>
> - 在整个测试运行完成后调用，就在将退出状态返回给系统之前

#### 6、pytest_plugin_registered

> ###### 参数
>
> - plugin ：   插件模块或实例
> - manager ：  pytest 插件管理器
>
> ###### 作用：
>
> - 注册一个新的插件

#### 7、pytest_addhooks

> ###### 参数
>
> - pluginmanager ：插件管理器
>
> ###### 触发时机：
>
> - 注册插件时调用，添加钩子函数到执行列表
>
> ###### 默认作用：
>
> - 调用 `pluginmanager.add_hookspecs(module_or_class, prefix)` 注册插件

## 三、收集用钩子函数：

#### 1、pytest_collection

设置pytest收集用例执行的流程，这个钩子函数一般不需要重写，除非你想自己制定pytest用例收集的流程。

> ###### 参数
>
> - session：pytest 会话对象
>
> ###### 触发时机：
>
> - 收集用例之前执行,执行该钩子进行用例收集

> ##### pytest默认的用例收集流程为
>
> 1、以 `session`作为初始收集器 ，按照下面的流程，收集所有测试用例
>
> - 执行`pytest_collectstart(collector)`开始收集
> - 执行`report = pytest_make_collect_report(collector)`,创建一个收集报告对象
> - 收集过程中，如果出现交互异常，则执行`pytest_exception_interact(collector, call, report)`
> - 对收集的节点进行判断，如果是用例执行`pytest_itemcollected(item)`，如果是收集器则进行递归处理。
> - 执行`pytest_collectreport(report)`，处理收集的报告
>
> 2、对收集到的用例进行修改。
>
> - 执行`pytest_collection_modifyitems(session, config, items)`
>
> 3、整理收集到的测试用例。
>
> - 执行`pytest_collection_finish(session)`
>
> 4、将收集的用例保存到session.items中。
>
> 5、将收集的用例数量设置为 session.testscollected 属性。

#### 2、pytest_ignore_collect

> ###### 参数
>
> - collection_path:  路径
> - config: pytest配置对象
>
> ###### 触发时机：
>
> - 对文件和目录进行收集之前会执行改钩子函数
>
> ##### 返回值：
>
> - 布尔值（会根据返回值为True还是False来决定是否收集改路径下的用例）

#### 3、pytest_collect_file

搜索测试文件路径的钩子函数

> ###### 参数
>
> - file_path :  收集的路径
> - parent : 父级目录路径
>
> ###### 触发时机：
>
> - 对每个路径进行收集之前会执行改钩子函数
>
> ##### 返回值：
>
> - 布尔值（会根据返回值为True还是False来决定是否收集该路径下的用例）

#### 4、pytest_pycollect_makemodule

收集测试模块的钩子函数，每个测试模块都会调用该钩子函数进行收集

> ###### 参数
>
> - module_path  :  模块路径
>
> ###### 触发时机：
>
> - 搜索测试模块触发的钩子函数
>
> ##### 返回值：
>
> - 模块

#### 5、pytest_pycollect_makeitem

收集模块中用例的钩子函数，对模块中的用例进行收集

> ###### 参数
>
> - collector: 模块对象
> - name: 名称
> - obj: 对象
>
> ###### 触发时机：
>
> - 对文件和目录进行收集之前会执行改钩子函数
>
> ##### 返回值：
>
> - 

#### 6、pytest_generate_tests

根据用例参数化传入的参数数量生成测试用例，生成测试用例

> ###### 参数
>
> - *metafunc* : 元函数
>
> ###### 触发时机：
>
> - 对用例方法进行参数化，生成用例

#### 7、pytest_make_parametrize_id

参数化生成用例时，生成parametrize_id(默认情况下参数化生成的用例名由原用例名和parametrize_id组成)，可以通过该钩子函数修改生成用例的方法名。

> ###### 参数
>
> - config  :  pytest 配置对象
> - val :  参数化值
> - argname:   pytest 生成的自动参数名称
>
> ###### 触发时机：
>
> - 对用例方法进行参数化，生成用例名称
>
> 返回参数化的id

#### 8、pytest_markeval_namespace

收集用例时 评估 被xfail或skipif标记用例的条件，改变测试跳过的钩子：

> ###### 参数
>
> - config  :  pytest 配置对象
>
> ###### 触发时机：
>
> - 收集的用例被xfail或skipif标记用例时触发

#### 9、pytest_collection_modifyitems

用例收集完成后，可以通过该钩子函数修改用例的顺序，删除或以其他方式修改测试用例。

> ###### 参数
>
> - session: pytest会话对象
> - config  :  pytest 配置对象
> - items: 测试用例列表
>
> ###### 触发时机：
>
> - 用例收集完后调用该钩子函数

#### 10、pytest_collection_finish

> ###### 参数
>
> - session: pytest会话对象
>
> ###### 触发时机：
>
> - 在收集完用例和修改收用例集之后调用

## 四、用例执行钩子

#### 1、pytest_runtestloop

​	 收集完成后执行主运行测试循环的钩子函数。

> ###### 参数
>
> - session：pytest 会话对象
>
> ###### 触发时机：
>
> - 用例收集完后执行

默认钩子实现对会话 ( ) 中收集的所有项目执行 runtest 协议`session.items`，除非收集失败或`collectonly`设置了 pytest 选项。如果在任何时候`pytest.exit()`调用，循环将立即终止。如果在任何点`session.shouldfail`或`session.shouldstop`设置，循环在当前项目的运行测试协议完成后终止。

#### 2、pytest_runtest_protocol

​	这个钩子函数是用来执行单个用例的，对单个测试项执行 **runtest 协议**

> ##### 参数
>
> - Item：执行的用例
> - nextitem: 指定的下一条执行的测试用例

pytest默认的runtest协议为如下三个阶段：

> ###### 1、设置阶段：
>
> ​	这个阶段主要执行用例：前置夹具
>
> - `call = pytest_runtest_setup(item)`
> - `report = pytest_runtest_makereport(item, call)`
> - `pytest_runtest_logreport(report)`
> - `pytest_exception_interact(call, report)`
>
> ###### 2、调用阶段
>
> ​	这个阶段负责执行测试用例
>
> - `call = pytest_runtest_call(item)`
> - `report = pytest_runtest_makereport(item, call)`
> - `pytest_runtest_logreport(report)`
> - `pytest_exception_interact(call, report)`
>
> ###### 3、拆解阶段
>
> 这个阶段主要执行用例：后置夹具
>
> - `call = pytest_runtest_teardown(item, nextitem)`
> - `report = pytest_runtest_makereport(item, call)`
> - `pytest_runtest_logreport(report)`
> - `pytest_exception_interact(call, report)`

#### 3、pytest_runtest_logstart

​	在单个项目运行 `runtest 协议`开始时调用

- ##### 参数

  > - **nodeid** : 完整的节点ID
  > - **location** ：包含如下三个值的元组`(filename, lineno, testname) `,分别为文件名、行号、用例名称

#### 4、 **pytest_runtest_logfinish**

​	在单个项目运行 `runtest 协议`结束时调用

- ##### 参数

  > - **nodeid** : 完整的节点ID
  > - **location** ：包含如下三个值的元组`(filename, lineno, testname) `,分别为文件名、行号、用例名称

#### 5、pytest_runtest_setup

​	在运行runTest协议时,**设置阶段**执行的钩子函数。该钩子函数默认实现的行为是负责执行前置的测试夹具，以及获取前置夹具中yeild返回的数据。

> ##### 参数
>
> - Item：执行的用例

#### 6、pytest_runtest_call

在运行runTest协议时,**调用阶段**执行的钩子函数,该钩子函数的默认实现的行为是执行：`item.runtest()`

> ##### 参数
>
> - Item：执行的用例

#### 7、pytest_runtest_teardown

- ​	在运行runTest协议时, **拆卸阶段** 执行的钩子函数。该钩子函数默认实现的行为是负责执行后置的测试夹具。

  > ##### 参数
  >
  > - Item：执行的用例
  > - nextitem:  执行的下一条用例。

#### 8、pytest_runtest_makereport

​	该钩子函数，在用例执行**runTest协议**的过程中，每个阶段都会调用一次。期作用是为了创建测试执行记录器，记录每个阶段执行的结果。

> ##### 参数
>
> - Item：执行的用例
> - call:  用例执行的阶段。

为了更深入地理解，您可以查看这些钩子的默认实现，也可以查看`_pytest.runner`其中`_pytest.pdb`的交互`_pytest.capture` 及其输入/输出捕获，以便在发生测试失败时立即进入交互式调试。

#### 9、pytest_pyfunc_call

该钩子函数的作用是为了调用底层的测试执行函数。

> ##### 参数
>
> - **pyfuncitem**: 最终执行的用例函数

## 五、测试报告钩子

### 1、`pytest_report_header`

​	该钩子函数返回要显示为终端报告的标题信息的字符串或字符串列表

> **参数:**
>
> - config:  pytest 配置对象。
> - start_path: 执行的起始路径
> - startdir： 执行的起始路径(7.0版本后弃用了)
>
> ###### 返回值：
>
> ​		字符串或者 包含多个字符串的列表

### 2、`pytest_report_collectionfinish`

返回用例收集完成后要显示的字符串或字符串列表 , 返回的这些字符串将显示在标准的“收集的 X 用例”消息之后

> **参数:**
>
> - config:  pytest 配置对象。
> - start_path: 执行的起始路径
> - startdir： 执行的起始路径(7.0版本后弃用了)
> - items： 待执行的用例列表
>
> ###### 返回值：
>
> ​		字符串或者 包含多个字符串的列表

### 3、`pytest_report_teststatus`

该钩子函数 返回状态报告的结果类别、短字母和详细字词。

- **结果类别  :   ** 是计算结果的类别，例如“通过”、“跳过”、“错误”或空字符串。
- **短字母 :**     例如  “.”、“s”、“E”或空字符串
- **详细字词： **例如“PASSED”、“SKIPPED”、“ERROR”或空字符串

> ###### 参数：
>
> - config  :  pytest 配置对象。
> - report ：要返回其状态的报告对象
>
> ###### 返回值
>
> - 返回的是一个包含结果信息的元组，具体结构Demo: ("通过", "P", ("Pass", {"res": '执行通过啦'}) )

在该钩子函数的内部，可以判断传入进来的report对象的信息，返回对应的结果。

### 4、`pytest_report_to_serializable`

将给定的报告对象进行序列化，例如：序列化为 JSON 格式的数据

> ##### 参数：
>
> - config  :  pytest 配置对象。
> - report ：要返回其状态的报告对象
>
> ##### 返回值：
>
> 任何类型都可以

### 5、`pytest_report_from_serializable`

将序列化后的报告数据，还原为报告对象。

> - ##### 参数：
>
>   - config  :  pytest 配置对象。
>   - report ：要返回其状态的报告对象
>
> ##### 返回值：
>
> 任何类型都可以

### 6、`pytest_terminal_summary`

在终端摘要报告中添加一个部分

> ##### 参数
>
> - terminalreporter： -- 内部终端报告对象。
> - exitstatus： – 将报告回操作系统的退出状态。
> - config： -- pytest 配置对象

### 7、`pytest_fixture_setup`

执行前置测试夹具的钩子函数

> ###### 参数
>
> - fixturedef
> - request
>
> ###### 返回值：测试夹具函数的返回值

### 8、`pytest_fixture_post_finalizer`

在执行完后置夹具之后，清除缓存之前调用

> ###### 参数
>
> - fixturedef
> - request
>
> ###### 返回值：测试夹具函数的返回值

### 9、`pytest_warning_recorded`

捕获pytest执行用例时出现的warning警告的钩子函数

> ##### 参数：
>
> - warning_message:捕获的警告
> - when
>   - `"config"`：在 pytest 配置/初始化阶段。
>   - `"collect"`: 在测试收集期间。
>   - `"runtest"`: 在测试执行期间。
> - nodeid： 测试用例的ID
> - location: 保存有关捕获的警告的执行上下文的信息（文件名、行号、函数）。`function`当执行上下文处于模块级别时，计算结果为 。

### 10、`pytest_runtest_logreport`

处理项目的[`TestReport`](https://link.juejin.cn?target=https%3A%2F%2Fdocs.pytest.org%2Fen%2Flatest%2Freference%2Freference.html%23pytest.TestReport)每个设置、调用和拆卸运行测试阶段的生成。

> ###### 参数：
>
> - report: 用例执行的结果信息

### 11、`pytest_assertrepr_compare`

断言失败时执行的钩子函数， 返回用例断言失败，表达式中比较内容的解释

> ###### 参数：
>
> - config：pytest执行的配置对象
> - op：断言的比较运算符
> - left : 预期结果(比较运算符左边的内容)
> - right :  实际结果(比较运算符右边的内容)
>
> ###### 返回值：
>
> - 对断言结果的描述(字符串或列表类型)

### 12、`pytest_assertion_pass`

断言通过时执行的钩子函数

> ###### 参数：
>
> - item ：执行的测试用例
> - lineno：  -- 断言语句的行号。
> - orig  ：-- 带有原始断言的字符串。
> - expl ： -- 带有断言解释的字符串。

作者：测试开发木森
链接：https://juejin.cn/post/7133830944414236680
来源：稀土掘金
著作权归作者所有。商业转载请联系作者获得授权，非商业转载请注明出处。