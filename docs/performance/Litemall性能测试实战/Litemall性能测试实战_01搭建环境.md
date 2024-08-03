# Litemall性能测试实战_01搭建环境

## 为什么是Litemall

1. 开源免费,容易获取,容易分享
2. 架构不复杂,仅仅是部署在单机上,并未上微服务架构,部署简单,对资源的诉求简单
3. 有沟通群体,该开源项目有创建项目的交流群,以及最近自学的时候也解决该项目实例,对于解决问题上 很大信息和资源

### 源代码地址

```
https://github.com/linlinjava/litemall
```

## 快速启动

## Git clone 代码

1. 前置条件
   在使用yum安装Git
   在Linux上生成公钥和私钥,并上传到自己的GIthub账号上
   sh-keygen -t rsa -C XXXXXXXX@qq.com -b 4096

2. Clone之前先将代码fork到自己的仓库

3. 执行命令clone代码

   ```
   yum install git
   git clone git@github.com:WaterLoran/litemall.git
   ```

### 配置最小开发环境

1. Mysql
   相关命令
   配置Mysql 8.0安装源

   ```
   sudo rpm -Uvh https://dev.mysql.com/get/mysql80-community-release-el7-1.noarch.rpm
   ```

   安装Mysql 8.0

   ```
   rpm --import https://repo.mysql.com/RPM-GPG-KEY-mysql-2022
   sudo yum --enablerepo=mysql80-community install mysql-community-server
   ```

   启动Mysql服务

   ```
   sudo service mysqld start
   ```

   查看Mysql服务状态

   ```
   service mysqld status
   ```

   查看临时密码

   ```
   grep "A temporary password" /var/log/mysqld.log
   ```

   查到密码为   3%:(VcqMVB=-

   更改密码

   ```
   ALTER USER 'root'@'localhost' IDENTIFIED BY 'Litemall@123';
   ```

   即密码修改为  Litemall@123
   参考博客: 
   https://zhuanlan.zhihu.com/p/372582996
   https://blog.csdn.net/CAG55688/article/details/123480634

   如果需要远程登录
   
   ```
   执行   use mysql;
   执行   update user set host = '%' where user = 'root';
   执行   FLUSH PRIVILEGES;
   ```
   
   
   
2. JDK1.8或以上

   ```
   yum list java*
   yum install java-1.8.0*
   ```

3. Maven
   下载安装包3.6.3版本

   ```
   wget https://mirrors.tuna.tsinghua.edu.cn/apache/maven/maven-3/3.6.3/binaries/apache-maven-3.6.3-bin.tar.gz
   ```

   创建/usr/local/maven目录

   ```
   mkdir -p  /usr/local/maven
   ```

   将maven包解压到/usr/local/maven目录

   ```
   tar -xzvf apache-maven-3.6.3-bin.tar.gz -C /usr/local/maven
   ```

   配置环境变量

   vim /etc/profile
   并在最后加上
   MAVEN_HOME=/usr/local/maven/apache-maven-3.6.3
   export MAVEN_HOME
   export PATH=${PATH}:${MAVEN_HOME}/bin

   然后 :wq 保存退出
   注意: MAVEN_HOME的路径需要根据真是的路径而设置, 可以通过 cd /usr/local/maven 然后ls 查看,再对应修改

   使环境变量重新生效

   source /etc/profile

4. Nodejs
   使用yum安装

   ```
   # yum安装设置Node.js v16版本
   curl --silent --location https://rpm.nodesource.com/setup_16.x | sudo bash
   (setup_16里16是版本号，可根据自己需要修改)
   # yum方式安装
   sudo yum -y install nodejs
   # 其它参考：以上命令安装不成功可执行：
   sudo yum clean all
   # 若本地存在多个nodesoucre，可以执行以下命令，在重新yum安装命令
   sudo rm -fv /etc/yum.repos.d/nodesource*
   
   链接：https://www.jianshu.com/p/959ca0e5495a
   ```

   直接二进制安装(实际使用)

   ```
   wget https://nodejs.org/dist/v16.17.0/node-v16.17.0-linux-x64.tar.xz
   xz -d node-v16.17.0-linux-x64.tar.xz
   mkdir -p /usr/local/nodejs
   tar xvf node-v16.17.0-linux-x64.tar -C /usr/local/nodejs
   ln -s /usr/local/nodejs/node-v16.17.0-linux-x64/bin/node /usr/bin/node
   ln -s /usr/local/nodejs/node-v16.17.0-linux-x64/bin/npm /usr/bin/npm
   ```
   
   
   
5. 微信开发者工具
   此处并未规划测试微信端小程序,所以暂不部署微信开发者相关工具

### 数据库依次导入litemall-db/sql的数据库文件

问题解决参考地址 https://www.jianshu.com/p/b437566ccf98

登录mysql,执行一下命令

```
set global validate_password.policy=0;
set global validate_password.length=4;
退出后执行 mysql_secure_installation
```

执行一下命令并输入密码Litemall@123,将数据导入数据库, < 符号前的litemall应该数数据库名称

```
mysql -u root -p < /usr/local/litemall/litemall-db/sql/litemall_schema.sql
mysql -u root -p litemall < /usr/local/litemall/litemall-db/sql/litemall_table.sql
mysql -u root -p litemall < /usr/local/litemall/litemall-db/sql/litemall_data.sql
```

无报错即导入成功

### 启动小商场和管理后台的后端服务

这里还要一个重要的问题,就是需要 JDBC相关文件进行修改,文件路径为/usr/local/litemall/litemall-db/src/main/resources/application-db.yml
具体的修改内容需要根据实际环境来修改,需要修改的有username和password

```
      url:  jdbc:mysql://localhost:3306/litemall?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true&verifyServerCertificate=false&useSSL=false
      driver-class-name:  com.mysql.cj.jdbc.Driver
      username:  root
      password:  Litemall@123
```

实际部署命令

```
cd /usr/local/litemall
mvn install
mvn clean package
cd /usr/local/litemall
nohup java -Dfile.encoding=UTF-8 -jar litemall-all/target/litemall-all-0.1.0-exec.jar &
备注: 
需要编译出jar文件
mvn install
mvn clean package
```

如果需要被监控JVM的时候,使用如下的命令

```
nohup java -javaagent:/usr/local/jmx_exporter/jmx_prometheus_javaagent-0.16.1.jar=3010:/usr/local/jmx_exporter/jmx_exporter.yml -Dfile.encoding=UTF-8 -jar  /usr/local/litemall/litemall-all/target/litemall-all-0.1.0-exec.jar &
```



### 启动管理后台前端


如果遇到问题,参考的解决方法

```
rm -rf node_modules package-lock.json & npm install & npm run dev
```


实际部署命令

```
npm install -g cnpm --registry=https://registry.npm.taobao.org
cd /usr/local/litemall/litemall-admin
npm install
nohup npm run dev &
```

### 启动小商城前端

该前端为微信相关的,此次测试暂不涉及,所以不启动

### 启动轻商城前端

这里有个问题,用cnpm的时候,有些包会没有办法下载和安装,所以需要使用npm
如果有问题.考虑的处理方法是 

```
rm -rf node_modules package-lock.json & npm install & npm run dev
```

实际执行的命令是

```
npm install -g cnpm --registry=https://registry.npm.taobao.org
cd /usr/local/litemall/litemall-vue
npm install
nohup npm run dev &
```

### 开启重新拉起所有服务

```
cd /usr/local/litemall
nohup java -Dfile.encoding=UTF-8 -jar litemall-all/target/litemall-all-0.1.0-exec.jar &
cd /usr/local/litemall/litemall-admin
nohup npm run dev &
cd /usr/local/litemall/litemall-vue
nohup npm run dev &
exit
```

如果需要被监控JVM的时候,使用如下的命令

```
cd /usr/local/litemall
nohup java -javaagent:/usr/local/jmx_exporter/jmx_prometheus_javaagent-0.16.1.jar=3010:/usr/local/jmx_exporter/jmx_exporter.yml -Dfile.encoding=UTF-8 -jar  /usr/local/litemall/litemall-all/target/litemall-all-0.1.0-exec.jar &
cd /usr/local/litemall/litemall-admin
nohup npm run dev &
cd /usr/local/litemall/litemall-vue
nohup npm run dev &
exit
```

如果启动后台服务jar包,并且被skywalking监控的话,对应使用一下的命令

```
nohup java -javaagent:/usr/local/apache-skywalking-apm-bin/agent/skywalking-agent.jar -Dskywalking.agent.service_name=litemall -Dskywalking.collector.backend_service=192.168.0.107:11800 -javaagent:/usr/local/jmx_exporter/jmx_prometheus_javaagent-0.16.1.jar=3010:/usr/local/jmx_exporter/jmx_exporter.yml -Dfile.encoding=UTF-8 -jar  /usr/local/litemall/litemall-all/target/litemall-all-0.1.0-exec.jar &
```

使用skywalking891的agent启动

```
nohup java -javaagent:/usr/local/apache-skywalking-java-agent-8.9.0/skywalking-agent/skywalking-agent.jar -Dskywalking.agent.service_name=litemall -Dskywalking.collector.backend_service=192.168.0.105:11800 -javaagent:/usr/local/jmx_exporter/jmx_prometheus_javaagent-0.16.1.jar=3010:/usr/local/jmx_exporter/jmx_exporter.yml -Dfile.encoding=UTF-8 -jar  /usr/local/litemall/litemall-all/target/litemall-all-0.1.0-exec.jar &
```

