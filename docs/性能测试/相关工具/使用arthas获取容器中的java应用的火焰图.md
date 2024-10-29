使用 **Arthas** 来获取容器中运行的 Java 应用的火焰图是一个非常有效的方法来分析应用的性能瓶颈。**Arthas** 是阿里巴巴开源的一个 Java 诊断工具，特别适合用于运行中的 Java 应用进行实时监控和分析。以下是关于如何使用 Arthas 获取容器中 Java 应用火焰图的详细步骤。

如果你在宿主机上已经下载了 Arthas 的 jar 包，你可以将这个 jar 包通过 Docker 的文件拷贝工具传入到正在运行的容器中。以下是将 Arthas jar 文件传入 Docker 容器的详细步骤。

### 1. **准备 Arthas jar 包**
假设你已经在宿主机上下载好了 Arthas 的 jar 包，比如文件名为 `arthas-boot.jar`，并且它位于宿主机的某个目录（例如 `/home/user/arthas`）。

```shell
curl -O https://arthas.aliyun.com/arthas-boot.jar
```

### 2. **使用 Docker 拷贝工具 (`docker cp`) 传输文件**
`docker cp` 是 Docker 提供的命令，用于在宿主机和 Docker 容器之间拷贝文件。假设你的 Docker 容器 ID 为 `<container-id>`，你可以使用以下命令将 `arthas-boot.jar` 传入容器中。

```bash
docker cp /home/user/arthas/arthas-boot.jar <container-id>:/opt/arthas-boot.jar
```

- **参数说明**：
  - `/home/user/arthas/arthas-boot.jar`：宿主机上 `arthas-boot.jar` 的路径。
  - `<container-id>`：目标 Docker 容器的 ID（你可以用 `docker ps` 获取容器 ID）。
  - `/opt/arthas-boot.jar`：这是你希望将 `arthas-boot.jar` 放入容器的目标路径。在这里选择了 `/opt` 目录，你可以根据自己的需求选择其他位置。

### 3. **进入容器内部**
拷贝完成后，你需要进入 Docker 容器内部来执行 `arthas-boot.jar`。

```bash
docker exec -it <container-id> /bin/bash
```

- **`<container-id>`** 替换为你的容器 ID。

进入到容器内部后，你就可以看到 `/opt/arthas-boot.jar` 文件。

### 4. **启动 Arthas**
在容器内部启动 Arthas，连接到 Java 应用程序。

```bash
java -jar /opt/arthas-boot.jar
```

当你运行这个命令后，Arthas 会列出当前容器中所有正在运行的 Java 进程。你可以选择要分析的进程的 **PID**。

### 5. **分析火焰图**
在连接到目标 Java 进程后，你可以使用 `profiler` 命令来生成火焰图。

- **开始性能采样**：

  ```sh
  profiler start
  ```

- **等待一段时间（例如 30 秒）后，停止采样并生成火焰图**：

  ```sh
  profiler stop
  ```

停止后，Arthas 会自动生成火焰图的 `.svg` 文件，通常位于 `arthas-output` 目录下，比如路径可能是 `/root/arthas-output/xxx.svg`。

### 6. **将火焰图拷贝到宿主机**
你可以使用 `docker cp` 命令将生成的火焰图从容器中拷贝到宿主机上，方便你使用浏览器进行查看。

```bash
docker cp <container-id>:/root/arthas-output/xxx.svg /home/user/arthas/
```

- **参数说明**：
  - `<container-id>`：目标 Docker 容器的 ID。
  - `/root/arthas-output/xxx.svg`：在容器中生成的火焰图文件的路径。
  - `/home/user/arthas/`：宿主机上的目标目录。

### 7. **使用浏览器查看火焰图**
拷贝出来的 `.svg` 文件可以直接用浏览器打开，浏览器能够很好地渲染 SVG 格式，可以帮助你直观地分析系统性能瓶颈。

### 总结
1. **将 Arthas jar 包传入容器**：
   ```bash
   docker cp /home/user/arthas/arthas-boot.jar <container-id>:/opt/arthas-boot.jar
   ```
   
2. **进入容器内部并启动 Arthas**：
   ```bash
   docker exec -it <container-id> /bin/bash
   java -jar /opt/arthas-boot.jar
   ```
   
3. **生成火焰图**：
   - 开始采样：`profiler start`
   - 停止采样并生成火焰图：`profiler stop`
   
4. **将火焰图从容器中拷贝到宿主机**：
   ```bash
   docker cp <container-id>:/root/arthas-output/xxx.svg /home/user/arthas/
   ```
   
5. **使用浏览器查看火焰图**。

**补充: 应用为k8s相关技术栈**

```shell
[root@master ~]# kubectl cp /root/arthas-boot.jar viewer-service-5b6b965f9-447ql:/opt/arthas-boot.jar -n performance
[root@master ~]# kubectl exec -it viewer-service-5b6b965f9-447ql   -n performance sh

# 进入容器
root@viewer-service-5b6b965f9-447ql:/opt# /opt/java/openjdk/bin/java -jar /opt/arthas-boot.jar 
[INFO] JAVA_HOME: /opt/java/openjdk/jre
[INFO] arthas-boot version: 3.7.1
[INFO] Found existing java process, please choose one and input the serial number of the process, eg : 1. Then hit ENTER.
* [1]: 8 server-0.0.1-SNAPSHOT.jar
1
[INFO] Start download arthas from remote server: https://arthas.aliyun.com/download/4.0.2?mirror=aliyun
[INFO] File size: 15.27 MB, downloaded size: 3.86 MB, downloading ...
[INFO] File size: 15.27 MB, downloaded size: 6.26 MB, downloading ...
[INFO] File size: 15.27 MB, downloaded size: 8.54 MB, downloading ...
[INFO] File size: 15.27 MB, downloaded size: 11.27 MB, downloading ...
[INFO] File size: 15.27 MB, downloaded size: 14.02 MB, downloading ...
[INFO] Download arthas success.
[INFO] arthas home: /root/.arthas/lib/4.0.2/arthas
[INFO] Try to attach process 8
Picked up JAVA_TOOL_OPTIONS: 
[INFO] Attach process 8 success.
[INFO] arthas-client connect 127.0.0.1 3658
  ,---.  ,------. ,--------.,--.  ,--.  ,---.   ,---.                           
 /  O  \ |  .--. ''--.  .--'|  '--'  | /  O  \ '   .-'                          
|  .-.  ||  '--'.'   |  |   |  .--.  ||  .-.  |`.  `-.                          
|  | |  ||  |\  \    |  |   |  |  |  ||  | |  |.-'    |                         
`--' `--'`--' '--'   `--'   `--'  `--'`--' `--'`-----'                          

wiki       https://arthas.aliyun.com/doc                                        
tutorials  https://arthas.aliyun.com/doc/arthas-tutorials.html                  
version    4.0.2                                                                
main_class                                                                      
pid        8                                                                    
time       2024-10-29 15:12:46.384                                              

[arthas@8]$ profiler start 
Profiling started
[arthas@8]$ profiler stop
OK
profiler output file: /usr/local/arthas-output/20241029-151325.html
[arthas@8]$ 
[arthas@8]$ exit
root@viewer-service-5b6b965f9-447ql:/opt# 
root@viewer-service-5b6b965f9-447ql:/opt# exit
exit
# exit 


# 退出到宿主机
[root@master ~]# 
[root@master ~]# kubectl cp viewer-service-5b6b965f9-447ql:/usr/local/arthas-output/20241029-151325.html /root/20241029-151325.html -n performance
tar: Removing leading `/' from member names
[root@master ~]# 
[root@master ~]# 
[root@master ~]# ll
total 264
-rw-r--r--  1 root root 120795 Oct 29 15:18 20241029-151325.html
-rw-------. 1 root root   1268 Jul 27  2023 anaconda-ks.cfg
-rw-r--r--. 1 root root 142141 Jun 26 17:33 arthas-boot.jar
drwxr-xr-x  2 root root     72 Oct 25 15:15 monitor
[root@master ~]# 

```

```txt
为什么出现  "tar: Removing leading `/' from member names"  这个提示
原因：kubectl cp 使用 tar 在 Pod 和宿主机之间传输文件。Kubernetes 中，kubectl cp 实际上在后台会调用 tar 命令来压缩和解压文件。这个信息表示 tar 在处理路径时去掉了 / 这个根目录前缀，以防止生成绝对路径的文件。
影响：这种提示一般是无害的，不会影响文件的实际拷贝过程。
```

通过这些步骤，你可以成功在容器中使用 Arthas 来分析 Java 应用的性能，生成火焰图以便找出系统的性能瓶颈。

