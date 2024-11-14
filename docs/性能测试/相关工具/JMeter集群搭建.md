在JMeter集群中使用Windows作为主控节点（Master），并将两台Linux机器作为从属节点（Slave），可以按照以下步骤进行配置。JMeter的主节点将负责控制和协调负载测试，而从节点将执行实际的负载生成。

### 前提条件
1. **Java环境**：确保Windows主节点和Linux从节点都安装了Java（JMeter依赖Java）。
2. **JMeter安装**：在Windows和Linux系统上安装相同版本的JMeter。
3. **网络连接**：确保Windows主节点和Linux从节点之间可以通过网络互相通信，并允许端口1099和其他JMeter需要的端口（如4445等）开放。

### 步骤 1：在所有节点上安装并配置 JMeter

1. **下载并安装 JMeter**：
   - 下载最新版本的 JMeter（[Apache JMeter下载页面](https://jmeter.apache.org/download_jmeter.cgi)）。
   - 将 JMeter 解压到所有节点的某个目录下，比如 `C:\jmeter`（Windows）和 `/home/user/jmeter`（Linux）。

2. **配置 jmeter.properties 文件**：
   - 在JMeter的`/bin`目录下找到 `jmeter.properties` 文件。
   - 找到以下配置并进行修改，使得JMeter主节点可以通过IP连接到从节点。

     ```properties
     remote_hosts=linux_slave1_IP:1099,linux_slave2_IP:1099
     ```

     替换 `linux_slave1_IP` 和 `linux_slave2_IP` 为Linux从节点的实际IP地址。

### 步骤 2：配置 Linux 从节点

1. **确认Java安装**：
   - 在每个Linux从节点上确认安装了Java环境，并确保路径已配置好。
   - 可以用以下命令确认Java版本：
     ```bash
     java -version
     ```

2. **启动 JMeter Server**：
   - 在每个Linux从节点上，进入JMeter的`/bin`目录，然后启动JMeter服务器：
     ```bash
     ./jmeter-server
     ```
   - 启动后，JMeter从节点会监听默认的1099端口和其他需要的端口，等待来自主节点的连接。

### 步骤 3：配置 Windows 主节点

1. **确认Java安装**：
   
- 在Windows主节点上确认Java安装和配置，确保JMeter可以正常运行。
   
2. **启动JMeter主节点**：
   - 在Windows上进入JMeter的`/bin`目录，然后使用以下命令启动JMeter GUI：
     ```cmd
     jmeter.bat
     ```
   - 如果使用非GUI模式进行负载测试，也可以使用以下命令：
     ```cmd
     jmeter.bat -n -t test_plan.jmx -R linux_slave1_IP,linux_slave2_IP
     ```
     - `-n`：非GUI模式
     - `-t`：指定JMeter测试计划文件路径（`test_plan.jmx`）
     - `-R`：指定从节点的IP地址，多个IP用逗号分隔

3. **测试连接**：
   - 在JMeter主节点的GUI中，进入菜单**Run -> Remote Start**，你会看到配置的从节点。
   - 选择**Remote Start All**，测试能否成功启动所有从节点。如果配置无误，所有从节点会同时开始执行测试计划。

### 步骤 4：运行测试

1. **设置负载参数**：
   - 在JMeter测试计划中配置线程数、持续时间等负载参数，确保负载均匀分布到各个从节点上。
2. **启动测试**：
   - 通过主节点启动远程测试，从节点将自动开始执行负载测试。
3. **监控与收集结果**：
   - 测试完成后，从节点会将数据传回主节点，主节点可以收集和分析所有从节点的测试结果。

### 注意事项

- **防火墙配置**：确认所有节点的防火墙允许1099和其他JMeter所需端口的流量。
- **网络延迟**：确保主从节点之间的网络延迟尽可能低，避免影响测试结果的准确性。
- **相同JMeter版本**：确保所有节点的JMeter版本一致，否则可能出现兼容性问题。
  

通过上述步骤，可以搭建一个Windows主控、Linux从属的JMeter集群，用于分布式性能测试。