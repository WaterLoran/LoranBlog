# RuoYi_Vue3搭建

## 更新yum源为阿里源

1、首先进入linux的 etc/yum.repos.d 目录下，将Centos-Base.repo进行备份

```
cd /etc/yum.repos.d
zip Centos-Base.repo.zip Centos-Base.repo
```

2、删除Centos-Base.repo

```
rm CentOS-Base.repo 
```

3、下载yum源到etc/yum.repos.d文件目录下

```
wget -O /etc/yum.repos.d/CentOS-Base.repo http://mirrors.aliyun.com/repo/Centos-6.repo
```

4、清理yum并生成缓存

```
yum clean all
```

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



