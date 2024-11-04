# App自动化测试的价值与体系

## UI自动化价值

| 作用     | 具体                                 |
| -------- | ------------------------------------ |
| 提高效率 | 融入企业迭代流水线,与CICD.Devops结合 |
|          | 回归测试,功能测试加速                |
| 提高质量 | 兼容性测试                           |
|          | 专项/非功能测试                      |
|          | 自动化探索测试                       |

## 概论总结

| App测试的时代背景 | 技术选型                                  | UI自动化用例适用场景 |
| ----------------- | ----------------------------------------- | -------------------- |
| 发布周期缩短      | Appium (跨语言, 跨平台, 底层多引擎可切换) | 业务流程不频繁改动   |
| 多端发布          | Airtest                                   | UI元素不频繁变动     |
| 多环境发布        | 其他框架: calanash macaca stx             | 需要频繁回归的场景   |
| 多机型发布        | IOS: KIF WDA XCUITest                     | 核心场景等           |
| 多版本共存        | Android: Robotium Uiautomator2            |                      |
| 历史回归测试任务  |                                           |                      |

## 基本使用

| 目的作用                           | 操作方法                   |
| ---------------------------------- | -------------------------- |
| 连接模拟器(mumu模拟器的端口为7555) | adb connect 127.0.0.1:7555 |
| 查看所连接的设备                   | adb devices                |



## 元素定位不到的场景与解决方法

| 原因                   | 解决方案                                     |
| ---------------------- | -------------------------------------------- |
| 定位不正确             | 在定位工具中先测试定位表达式是否正确         |
| 存在动态ID             | 定位方式使用css或者xpath的相对定位           |
| 页面还没有加载完成     | 添加死等验证，使用显示等待或隐式等待进行优化 |
| 页面有iframe           | 切换到iframe 后定位                          |
| 页面切换window         | 切换到对应窗口后定位                         |
| 要定位的元素为隐藏元素 | 要定位元素为隐藏无素使用js 操作该元素        |

## 元素定位场景与解决方案

| 名称                | 场景                                                         | 解决方法                                                     |
| ------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| 混合定位场景        | 属性动态变化(id,text) <br />重复元素属性(id,text, class)     | 参考相对位置关系进行定位(CSS, Path) <br /><br /使用find_element遍历查找 |
| 使用等待机制的场景  | 控件动态出现 <br />控件出现特定特征                          | 元素定位结合隐私等待与显示等待                               |
| Web弹框定位         | web页面alert弹框                                             | web需要使用driver.switchTo().alert()处理                     |
| APP toast提示框定位 | app Toast提示框                                              | 使用driver.page_source拿到页面布局结构文件,<br />分析toast弹框组件的标签内容 然后通过id/text/class等属性,<br />使用xpath完成元素定位 结合隐式等待 |
| 下拉框/日期定位     | input标签组合的下拉框无法定位,<br />input标签组合的日期空间无法定位 | 面对这些元素,我们可以引入注入js技术来解决问题                |

## [Appium Desired Capabilities详解](https://www.cnblogs.com/star12111/p/12891422.html)

| 参数                | 描述                                                         | 实例                                                  |
| ------------------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| `automationName`    | 自动化测试引擎                                               | `Appium`或 `Selendroid`                               |
| `platformName`      | 手机操作系统                                                 | `iOS`, `Android`, 或 `FirefoxOS`                      |
| `platformVersion`   | 手机操作系统版本                                             | 如： `7.1`, `4.4`；ios的 `9.0`                        |
| `deviceName`        | 手机或模拟器设备名称                                         | android的忽略，ios如`iPhone Simulator`                |
| `app`               | `.ipa` `.apk`文件路径                                        | 比如`/abs/path/to/my.apk`或`http://myapp.com/app.ipa` |
| `browserName`       | 启动手机浏览器                                               | iOS如:`Safari，Android`如:`Chrome,Chromium,Browser`   |
| `newCommandTimeout` | 设置命令超时时间，单位：秒。                                 | 比如 `60`                                             |
| `autoLaunch`        | Appium是否需要自动安装和启动应用。默认值`true`               | `true`, `false`                                       |
| `language`          | (Sim/Emu-only) 设定模拟器 ( simulator / emulator ) 的语言。  | 如： `fr`                                             |
| `locale`            | (Sim/Emu-only) 设定模拟器 ( simulator / emulator ) 的区域设置。 | 如： `fr_CA`                                          |
| `udid`              | ios真机的唯一设备标识                                        | 如： `1ae203187fc012g`                                |
| `orientation`       | 设置横屏或竖屏                                               | `LANDSCAPE` (横向) 或 `PORTRAIT` (纵向)               |
| `autoWebview`       | 直接转换到 WebView 上下文。 默认值 `false`、                 | `true`, `false`                                       |
| `noReset`           | 不要在会话前重置应用状态。默认值`false`。                    | `true`, `false`                                       |
| `fullReset`         | (iOS) 删除整个模拟器目录。(Android)通过卸载默认值 `false`    | `true`, `false`                                       |

## 安卓特有的参数

| 关键字                      | 描述                                                         | 实例                                                         |
| --------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `appActivity`               | 启动app包,一般点开头                                         | 如：`.MainActivity`, `.Settings`                             |
| `appPackage`                | Android应用的包名                                            | 比如`com.example.android.myApp`                              |
| `appWaitActivity`           | 等待启动的Activity名称                                       | `SplashActivity`                                             |
| `deviceReadyTimeout`        | 设置超时时间                                                 | `5`                                                          |
| `androidCoverage`           | 用于执行测试的 instrumentation类                             | `com.my.Pkg/com.my.Pkg.instrumentation.MyInstrumentation`    |
| `enablePerformanceLogging`  | (仅适用于 Chrome 和 webview) 开启 Chromedriver 的性能日志。(默认 `false`) | `true`, `false`                                              |
| `androidDeviceReadyTimeout` | 等待设备在启动应用后超时时间，单位秒                         | 如 `30`                                                      |
| `androidDeviceSocket`       | 开发工具的 socket 名称。Chromedriver 把它作为开发者工具来进行连接。 | 如 `chrome_devtools_remote`                                  |
| `avd`                       | 需要启动的 AVD (安卓模拟器设备) 名称。                       | 如 `api19`                                                   |
| `avdLaunchTimeout`          | 以毫秒为单位，等待 AVD 启动并连接到 ADB的超时时间。(默认值 `120000`) | `300000`                                                     |
| `avdReadyTimeout`           | 以毫秒为单位，等待 AVD 完成启动动画的超时时间。(默认值 `120000`) | `300000`                                                     |
| `avdArgs`                   | 启动 AVD 时需要加入的额外的参数。                            | 如 `-netfast`                                                |
| `useKeystore`               | 使用一个自定义的 keystore 来对 apk 进行重签名。默认值 `false` | `true` or `false`                                            |
| `keystorePath`              | 自定义keystore路径。默认~/.android/debug.keystore            | 如 `/path/to.keystore`                                       |
| `keystorePassword`          | 自定义 keystore 的密码。                                     | 如 `foo`                                                     |
| `keyAlias`                  | key 的别名                                                   | 如 `androiddebugkey`                                         |
| `keyPassword`               | key 的密码                                                   | 如 `foo`                                                     |
| `chromedriverExecutable`    | webdriver可执行文件的绝对路径 应该用它代替Appium 自带的 webdriver) | `/abs/path/to/webdriver`                                     |
| `autoWebviewTimeout`        | 毫秒为单位，Webview上下文激活的时间。默认`2000`              | 如 `4`                                                       |
| `intentAction`              | 用于启动activity的intent action。(默认值 `android.intent.action.MAIN`) | 如 `android.intent.action.MAIN`, `android.intent.action.VIEW` |
| `intentCategory`            | 用于启动 activity 的 intent category。 (默认值 `android.intent.category.LAUNCHER`) | 如 `android.intent.category.LAUNCHER`, `android.intent.category.APP_CONTACTS` |
| `intentFlags`               | 用于启动activity的标识(flags) (默认值 `0x10200000`)          | 如 `0x10200000`                                              |
| `optionalIntentArguments`   | 用于启动 activity 的额外 intent 参数。请查看 [Intent 参数](http://developer.android.com/tools/help/adb.html#IntentSpec) | 如 `--esn <EXTRA_KEY>`, `--ez <EXTRA_KEY> <EXTRA_BOOLEAN_VALUE>` |
| `dontStopAppOnReset`        | 在使用 adb 启动应用时不要停止被测应用的进程。默认值： `false` | `true` 或 `false`                                            |
| `unicodeKeyboard`           | 使用 Unicode 输入法。默认值 `false`                          | `true` 或 `false`                                            |
| `resetKeyboard`             | 重置输入法到原有状态，默认值 `false`                         | `true` 或 `false`                                            |
| `noSign`                    | 跳过检查和对应用进行 debug 签名的步骤。默认值 `false`        | `true` 或 `false`                                            |
| `ignoreUnimportantViews`    | 调用 uiautomator 的函数这个关键字能加快测试执行的速度。默认值 `false` | `true` 或 `false`                                            |
| `disableAndroidWatchers`    | 关闭 android 监测应用无响ANR和崩溃crash的监视器默认值： `false`。 | `true` 或者 `false`                                          |
| `chromeOptions`             | 允许传入 chrome driver 使用的 chromeOptions 参数。请查阅 [chromeOptions](https://sites.google.com/a/chromium.org/chromedriver/capabilities) 了解更多信息。 | `chromeOptions: {args: [‘--disable-popup-blocking‘]}`        |

## IOS特有的参数

| 关键字                        | 描述                                                         | 实例                                                         |
| ----------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `calendarFormat`              | (Sim-only) 为iOS的模拟器设置日历格式                         | 如 `gregorian` (公历)                                        |
| `bundleId`                    | **被测应用的bundle ID，真机上执行测试时，你可以不提供 `app` 关键字，但你必须提供udid** | 如 `io.appium.TestApp`                                       |
| `udid`                        | **连接真机的唯一设备编号 ( Unique device identifier )**      | 如 `1ae203187fc012g`                                         |
| `launchTimeout`               | 以毫秒为单位，在Appium运行失败之前设置一个等待 instruments的时间 | 比如： `20000`                                               |
| `locationServicesEnabled`     | (Sim-only) 强制打开或关闭定位服务。默认值是保持当前模拟器的设定 | `true` 或 `false`                                            |
| `locationServicesAuthorized`  | 使用这个关键字时，你同时需要使用 `bundleId` 关键字来发送你的应用的 bundle ID。 | `true` 或者 `false`                                          |
| `autoAcceptAlerts`            | 当 iOS 的个人信息访问警告 (如 位置、联系人、图片) 出现时，自动选择接受( Accept )。默认值 `false`。 | `true` 或者 `false`                                          |
| `autoDismissAlerts`           | 当 iOS 的个人信息访问警告 (如 位置、联系人、图片) 出现时，自动选择不接受( Dismiss )。默认值 `false`。 | `true` 或者 `false`                                          |
| `nativeInstrumentsLib`        | 使用原生 intruments 库 (即关闭 instruments-without-delay )   | `true` 或者 `false`                                          |
| `nativeWebTap`                | (Sim-only) 在Safari中允许"真实的"，默认值： `false`。注意：取决于 viewport 大小/比例， 点击操作不一定能精确地点中对应的元素。 | `true` 或者 `false`                                          |
| `safariInitialUrl`            | (Sim-only) (>= 8.1) Safari 的初始地址。默认值是一个本地的欢迎页面 | 例如： `https://www.github.com`                              |
| `safariAllowPopups`           | (Sim-only) 允许 javascript 在 Safari 中创建新窗口。默认保持模拟器当前设置。 | `true` 或者 `false`                                          |
| `safariIgnoreFraudWarning`    | (Sim-only) 阻止 Safari 显示此网站可能存在风险的警告。默认保持浏览器当前设置。 | `true` 或者 `false`                                          |
| `safariOpenLinksInBackground` | (Sim-only) Safari 是否允许链接在新窗口打开。默认保持浏览器当前设置。 | `true` 或者 `false`                                          |
| `keepKeyChains`               | (Sim-only) 当 Appium 会话开始/结束时是否保留存放密码存放记录 (keychains) (库(Library)/钥匙串(Keychains)) | `true` 或者 `false`                                          |
| `localizableStringsDir`       | 从哪里查找本地化字符串。默认值 `en.lproj`                    | `en.lproj`                                                   |
| `processArguments`            | 通过 instruments 传递到 AUT 的参数                           | 如 `-myflag`                                                 |
| `interKeyDelay`               | 以毫秒为单位，按下每一个按键之间的延迟时间。                 | 如 `100`                                                     |
| `showIOSLog`                  | 是否在 Appium 的日志中显示设备的日志。默认值 `false`         | `true` 或者 `false`                                          |
| `sendKeyStrategy`             | 输入文字到文字框的策略。模拟器默认值：`oneByOne` (一个接着一个) 。真实设备默认值：`grouped` (分组输入) | `oneByOne`, `grouped` 或 `setValue`                          |
| `screenshotWaitTimeout`       | 以秒为单位，生成屏幕截图的最长等待时间。默认值： 10。        | 如 `5`                                                       |
| `waitForAppScript`            | 用于判断 "应用是否被启动” 的 iOS 自动化脚本代码。默认情况下系统等待直到页面内容非空。结果必须是布尔类型。 | 例如 `true;`, `target.elements().length > 0;`, `$.delay(5000); true;` |

[官方文档](https://github.com/appium/appium/blob/master/docs/en/writing-running-appium/caps.md)
[参考博客](https://www.cnblogs.com/yoyoketang/p/7606856.html)

## 元素定位示例

| 定位方法               | 具体代码                                                     |
| ---------------------- | ------------------------------------------------------------ |
| 通过ID                 | driver.find_element_by_id("io.manong.developerdaily:id/edt_phone") |
| 通过class_name         | driver.find_element_by_class_name('android.widget.Button')   |
| 通过Xpath              | xpath = "//*[@resource-id='io.manong.developerdaily:id/tab_layout']//android.widget.RelativeLayout[2]"<br/>driver.find_element_by_xpath(xpath) |
|                        | xpath = "//*[@resource-id='io.manong.developerdaily:id/tab_layout']//android.widget.LinearLayout//[@index=1]"<br/>driver.find_element_by_xpath(xpath) |
| Android通过text        | driver.find_element_by_android_uiautomator('new UiSelector().text("%s")')  #对应uiautomator名称：“text” |
| Android通过description | driver.find_element_by_android_uiautomator('new UiSelector().description("%s")')  # 对应uiautomator名称：“content-desc” |
| Android通过className   | driver.find_element_by_android_uiautomator('new UiSelector().className("%s")') # 对应uiautomator名称：“class” |
| Android通过index       | driver.find_element_by_android_uiautomator('new UiSelector().index("%s")') # 对应uiautomator名称：“index” |

## 元素的常用方法

| 操作方法     | 相关代码                    |
| ------------ | --------------------------- |
| 点击方法     | element.click()             |
| 输入操作     | element.send_keys('appium') |
| 设置元素的值 | element.set_value(''appium) |
| 清除操作     | element.clear()             |
| 是否可见     | element.isplayed()          |
| 是否可用     | element.is_enabled()        |
| 是否被选中   | element.is_selected()       |
| 获取属性值   | get_attribute(name)         |

## 各种等待

| 等待类型 | 特点描述                                                   |
| -------- | ---------------------------------------------------------- |
| 强制等待 | 即直接在线程中等待                                         |
| 隐式等待 | 在等待的时间内一直轮询检查元素是否可见,如果可以则马上操作  |
| 显式等待 | 在等待的时间内一直轮询元素是否可操作,如果可操作,则马上操作 |

## PO模式

| 原则                                      | 解释                                                         |
| ----------------------------------------- | ------------------------------------------------------------ |
| 公共方法代表页面提供的服务                | 要封装页面中的功能(服务),比如点击页面中的元素,可以进入到新的页面,于是可以为这个服务封装"进入新页面" |
| 不要暴露页面细节                          | 封装细节,对外子提供方法名(或者接口)                          |
| 不要把断言和操作细节混用                  | 封装的操作熊姐中不要使用断言,把断言放到单独的模块中,比如test_case中 |
| 方法可以return到新打开的页面              | 点击一个按钮会开启新的页面,可以用return方法表示跳转,比如return MainPage()表示跳转到新的PO |
| 不要把整页内容都放到PO中                  | 只为页面中重要的元素进行PO设计,舍弃不重要的内容              |
| 相同行为为产生不同的结果,可以封装不同结果 | 一个动作可能产生不同结果,比如点击按钮后,可能点击成功,也可能点击失败,click_success和click_error |

## 运行第一个App_ui自动化脚本

启动mumu模拟器

启动Appium Server GUI,并监听本地4723端口

在终端执行adb connect 127.0.0.1:7555 并回显connected to 127.0.0.1:7555







