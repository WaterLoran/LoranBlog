# Litemall性能测试实战_06开发脚本

## 录制脚本

1. 在测试计划下添加线程组
2. 在线程组下添加Recording Controller用于收集整理录制到的脚本
3. 在测试计划下添加Test Script Recorder
4. 修改Test Script Recorder的Test plan Creation下的Target Controller为步骤2中的Recording Controller
5. 修改Test Script Recorder的Global Settings的Port为8888,并且保持跟系统的全局代理一致(可能这种方法不好用),推荐在Chrome浏览器端使用SwitchyOmega插件来设置代理
6. 修改Test Script Recorder的Requests Filtering,在URL Patterns to Exclude处添加一个推荐的选项
7. Jmeter开启录制,即开启代理
8. 浏览器端开启特定场景的代理,即将请求转发给Jmeter
9. 即可发现在Jmeter下可以发现新录制的请求步骤

## 使用变量

1. 在线程组下添加User Defined Variables,并定义一个变量hostname ,并填写一个实际的值
2. 在请求中,修改Server Name or IP为 ${hostname}

## 添加Throughput Shaping Timer控制请求TPS

1. 安装插件Throughput Shaping Timer
2. 重启Jmeter
3. 在线程组下的Timer下的选择新安装的插件,并根据时间段来设置请求数量

## 添加Transactions per Second监控每秒实际TPS

1. 安装Transactions per Second插件,实际这个插件和另外两个插件已经合并到了一个新的插件中,名字叫做[3 Basic Graphs](https://jmeter-plugins.org/wiki/ResponseTimesOverTime/)
2. 在线程组下的Listener下添加Transactions per Second元件
3. 开启请求后就会刷新出实际的额请求数量,该请求数量是针对于线程组去统计的

