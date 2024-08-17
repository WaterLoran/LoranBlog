# Litemall性能测试实战_05搭建监控系统

## 部署prometheus

1. 下载并上传二进制的prometheus安装包到Linux后台
   [root@localhost software]# ll
   -rw-rw-r--. 1 water water 75820407 2月  27 17:42 prometheus-2.33.4.linux-amd64.tar.gz
   [root@localhost software]#
2. 解压文件到指定目录
   [root@localhost software]# tar xf prometheus-2.33.4.linux-amd64.tar.gz -C /usr/local/
3. 设置环境变量
   [root@localhost prometheus-2.33.4.linux-amd64]# vim /etc/profile
   [root@localhost prometheus-2.33.4.linux-amd64]#
   export PROMETHEUS_HOME=/usr/local/prometheus-2.25.0.linux-amd64
   PATH=$PROMETHEUS_HOME:/bin
   export PATH
4. 使用nohup的方式拉起prometheus服务
   [root@localhost prometheus-2.33.4.linux-amd64]# nohup ./prometheus --config.file="prometheus.yml" &
   [1] 12093
   [root@localhost prometheus-2.33.4.linux-amd64]# nohup: 忽略输入并把输出追加到"nohup.out"
5. 关闭centos防火墙
   阿里云的虚拟机默认不打开防火墙,但需要在安全组中放开端口
   其他虚拟机需要检查一下防火墙
   可以使用netstat -tlunp来检查在监听哪一些端口

## 部署node_exporter

1. 下载node_exporter二进制安装包并上传到Linux后台
2. 解压到指定目录
   [root@localhost software]# tar xf node_exporter-1.3.1.linux-amd64.tar.gz -C /usr/local/
   [root@localhost software]# ll /usr/local/ | grep node
   drwxr-xr-x. 2 3434 3434  56 12月  5 19:15 node_exporter-1.3.1.linux-amd64
   [root@localhost software]# 
3. 使用nohup拉起该服务
   [root@localhost node_exporter-1.3.1.linux-amd64]# nohup ./node_exporter &
   [2] 12417
   [root@localhost node_exporter-1.3.1.linux-amd64]# nohup: 忽略输入并把输出追加到"nohup.out"
4. 修改prometheus的启动配置文件并重启
    - job_name:"Centos7"
       static_configs:- targets: ["localhost:9100"]
5. 重启prometheus,用于接收node_exporter的数据
   nohup ./prometheus --config.file="prometheus.yml" &

## 部署grafana

1. 下载并上传文件到Linux
   下载地址: https://grafana.com/grafana/download?platform=linux
   二进制下载地址   https://dl.grafana.com/enterprise/release/grafana-enterprise-8.4.2.linux-amd64.tar.gz
2. 解压到指定目录
   [root@localhost software]# tar xf grafana-enterprise-8.4.2.linux-amd64.tar.gz -C /usr/local
3. 设置环境变量
   vim /etc/profile
   export GRAFANA_HOME=/usr/local/grafana-8.4.2
   PATH=$PATH:$GRAFANA_HOME/bin
   export PATH
4. 使用nohup拉起服务
   nohup grafana-server &
5. 修改grafana原始密码
   原始密码为admin/admin
6. 在grafana上对接prometheus
   添加数据源
7. 导入dashboard的模板
   node_exporter专用的dashboard为1860,比较全面

## 部署mysqld_exporter

1. 下载安装包
   wget https://github.com/prometheus/mysqld_exporter/releases/download/v0.14.0/mysqld_exporter-0.14.0.linux-amd64.tar.gz

2. 解压安装包到  /usr/local

   tar xf mysqld_exporter-0.14.0.linux-amd64.tar.gz -C /usr/local/

3. 如果直接在mysqld_exporter目录执行拉起服务的话,不用配置环境变量
   不用配置环境变量

4. 进入mysql创建用户  mysql_monitor ,用于读取mysql数据,不直接使用root用户是为了安全考虑,面向生产

   CREATE USER 'mysql_monitor'@'localhost' IDENTIFIED BY 'Litemall@123';

   flush privileges;

5. 修改配置文件

   vim /opt/mysqld_exporter/.my.cnf

   输入

   [client]

   user=mysql_monitor

   password=Litemall@123

6. 使用nohup拉起进程,并且指定配置文件
   nohup ./mysqld_exporter --config.my-cnf=./.my.cnf &

7. 查看是否开启监听9104默认端口

   netstat -tlunp

8. 配置prometheus添加mysqld_exporter工程

   追加

     \- job_name: "Mysql_exporter"

   ​    static_configs:

   ​      \- targets: ["localhost:9104"]

9. 重启prometheus

   pkil prometheus

   nohup ./prometheus --config.file="prometheus.yml" &

10. grafana端导入dashboard的时候,使用  7362  dashboard模板

## 部署jmx_exporter

1. 创建工作目录
   mkdir -p /usr/local/jmx_exporter

2. 下载jmx_exporter
   wget https://repo1.maven.org/maven2/io/prometheus/jmx/jmx_prometheus_javaagent/0.16.1/jmx_prometheus_javaagent-0.16.1.jar

3. 配置文件jmx_exporter
   vim /usr/local/jmx_exporter/jmx_exporter.yml
   输入下面内容

   ```
   ---  
   lowercaseOutputLabelNames: true
   lowercaseOutputName: true
   whitelistObjectNames: ["java.lang:type=OperatingSystem"]
   blacklistObjectNames: []
   rules:
     - pattern: 'java.lang<type=OperatingSystem><>(committed_virtual_memory|free_physical_memory|free_swap_space|total_physical_memory|total_swap_space)_size:'
       name: os_$1_bytes
       type: GAUGE
       attrNameSnakeCase: true
     - pattern: 'java.lang<type=OperatingSystem><>((?!process_cpu_time)\w+):'
       name: os_$1
       type: GAUGE
       attrNameSnakeCase: true
   ```

4. 使用java启动重新启动之前的litemall编译出来的jar包

   ```
   xxxxxxxxxx nohup java -javaagent:/usr/local/jmx_exporter/jmx_prometheus_javaagent-0.16.1.jar=3010:/usr/local/jmx_exporter/jmx_exporter.yml -Dfile.encoding=UTF-8 -jar  /usr/local/litemall/litemall-all/target/litemall-all-0.1.0-exec.jar &
   ```

   注意: /root/.m2/repository/org/linlinjava/litemall-all/0.1.0/litemall-all-0.1.0-exec.jar 这个包是我们要监控的软件程序的对应的jar包, 那么在运行软件的时候,就可以同时被监控了,-javaagent表示启动参数

5. 导入Dashboard模板8563, 注意job的输入需要和那个prometheus.yml文件中配置的一致,这个和其他的不太一样

6. 重启prometheus
   pkil prometheus
   nohup ./prometheus --config.file="prometheus.yml" &

## 停止所有的监控服务

```
pkill prometheus
pkill node_exporter
pkill grafana
pkill mysqld_exporter
```

## 启动所有的监控服务

```
cd /usr/local/prometheus-2.33.4.linux-amd64
nohup ./prometheus --config.file="./prometheus.yml" &
 
cd  /usr/local/grafana-8.4.2
 nohup ./bin/grafana-server &
 
cd /usr/local/mysqld_exporter-0.14.0.linux-amd64
nohup ./mysqld_exporter --config.my-cnf=./.my.cnf &

cd /usr/local/node_exporter-1.*.linux-amd64
nohup ./node_exporter &
```

