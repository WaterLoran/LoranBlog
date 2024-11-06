# Mysql常用操作

## 1.接入与权限

### 1.1 连接Mysql操作

mysql -h 主机地址 -u 用户名 －p   然后根据提示输入密码



## 2.数据库与表的增删查改

| 行为目的         | 操作方法                                                     |
| ---------------- | ------------------------------------------------------------ |
| 查询当前各种信息 | status                                                       |
| 显示数据库       | show databases;                                              |
| 创建数据库       | create database 数据库名称;                                  |
| 删除数据库       | drop databases 数据库名称;                                   |
| 指定使用数据库   | use databases 数据库名称;                                    |
| 显示数据表       | show tables; (需要先使用use 数据库名称来指定数据库)          |
| 显示表结构       | describe 表名; 或者disc 表名                                 |
| 创建数据表       | mysql> create table book(<br/>    -> book_id INT NOT NULL AUTO_INCREMENT,<br/>    -> book_name VARCHAR(100) NOT NULL,<br/>    -> PRIMARY KEY (book_id)<br/>    -> )<br/>    -> ENGINE=InnoDB DEFAULT CHARSET=utf8;<br /><br />#PRIMARY KEY (book_id)用于指定key,是必须的<br />#ENGINE表示所用引擎 |
| 删除数据表       | drop table 表名; #直接删除数据表,无法恢复<br />truncate table 表名; #删除数据表数据,不删除表结构,不能与where使用<br />delete from 表名; #删除指定表名中的所有数据<br />delete from 表名 where user_id = 1; #通过与where联用来删除指定行 |

## 3.表复制及备份还原

| 行为目的                       | 操作方法                                                     |
| ------------------------------ | ------------------------------------------------------------ |
| 复制含有主键等信息的完整表结构 | create table 新表名 like book;                               |
| 仅复制表结构但不含主键         | create table 新表名 select * from 旧表名;<br />或create table 新表名 as (select * from 旧表名);<br />或create table 新表名 select * from 旧表名 where key=XX; |
| 将旧表中的数据灌入新表         | insert into 已存在表名 select * from 旧表                    |
| 查询输入创建表的DDL语句        | show create table 表名;                                      |
| 清空表数据                     | truncate table 表名;                                         |
| 备份数据库                     | mysqldump -u root -p 被备份数据库名>备份数据库名<br />#然后输入密码 |
| 导入或恢复数据库               | source 备份数据库的绝对路径                                  |

##  4.数据库表中数据操作

| 行为目的           | 操作方法                                                     |
| ------------------ | ------------------------------------------------------------ |
| 清除mysql表中数据  | delete from 表名<br /># 一条条删除完所有的数据<br />truncate table 表名 |
| 删除表中的某些数据 | delete from 表名 where XXXX                                  |

## 5.修改表的列与表名

| 行为目的                           | 操作方法                                                     |
| ---------------------------------- | ------------------------------------------------------------ |
| 给列更名                           | alter table 表名 change 旧字段名称 新字段名称                |
| 给表更名                           | alter table 表名 rename 新表名                               |
| 修改某表的字段类型即指定是否非空   | alter table 表名 change 字段名称 字段类型[是否允许非空]<br />alter table 表名 modify 字段名称 字段类型[是否允许非空] |
| 修改某表的字段名称及指定是否为非空 | alter table 表名 change 字段原名称 字段新名称 字段类型[是否允许非空]<br />#例如alter table 表名 change birth new_birth varchar(20) NULL |

## 6.修改表中的数据

| 行为目的                                         | 操作方法                                                     |
| ------------------------------------------------ | ------------------------------------------------------------ |
| 增加一个字段                                     | alter table 表名 add column 新增列名 type default value;<br />#type指数据类型,value指该字段的默认数值 |
| 更改一个字段的名字<br />(可同时修改类型和默认值) | alter table 表名 change 原列(字段)名 新列(字段)名 type default value; |
| 改变一个字段的默认值                             | alter table 表名 alter 列(字段)名 set default value;         |
| 改变一个字段的数据类型                           | alter table 表名 change column 原列名 新列名 type            |
| 向一个表中增加一个列并作为主键                   | alter table 表名 add column 列名 type auto_increment PRIMARYKEY; |
| 数据库某表的备份                                 | mysqldump -u root -p 库名 表名 > 备份表名                    |
| 导出数据                                         | select_statment into outfile "dest_file"<br />#例如select XX,XX from 表名 limit 10 into outfile "home/out.file" |
| 导入数据                                         | load data infile "filename" into table 表名                  |
| 将两个表的数据拼接后插入到另一个表里             | insert into 表名 select t1.com1,concat(t1.com2,t2.com1) from t1, t2 |
| 删除字段                                         | alter table 表名 drop column 列名                            |

## 7.查询表

| 行为目的                         | 操作方法                                                     |
| :------------------------------- | ------------------------------------------------------------ |
| 查询数值型数据                   | select * from 表名 where 字段名 > 20;<br />#查询谓词: >, =, <, !=, !>, !<, =>, =< |
| 查询字符串                       | select * from 表名 where 字段名 = "XX"<br />select * from 表名 where 字段名 like "刘%"<br /># 百分号%代表N个字符,类似于正则里面的.*  ,并且可以放在字符串前后 |
| 查询日期型数据                   | select * from 表名 where date = "2022-03-08"                 |
| 查询逻辑性数据                   | select * from 表名 where type = "T"<br /># 逻辑运算符and or not |
| 查询非空数据                     | select * from tableName where field is not null              |
| 利用变量查询数值型数据           | select * from 表名 where id = "$varlible"                    |
| 利用变量查询字符串数据           | select * from 表名 where name like "%$var%"                  |
| 查询前n条记录                    | select * from 表名 limit 0, n<br /># 0,n 也可以变为n,m即指定范围的数据 |
| 查询后n条数据                    | select * from 表名 order by id ASC LIMIT  $n                 |
| 查询统计结果中的前n条记录        | SELECT \* ,(yw+sx+wy) AS total FROM tb_score ORDER BY (yw+sx+wy) DESC LIMIT 0,$num |
| 查询指定时间段的数据             | select field from 表名 where field BETWEEN 初始值 AND 终止值 |
| 按月查询统计数据                 | select * from 表名 where month(date) = '$_POST[date]' ORDER by date |
| 查询大于指定条件的记录           | select * from 表名 where age > $_POST[age] ORDER BY age      |
| 查询结果不显示重复记录           | select DISCTINCT 字段名 from 表名 where 查询条件             |
| NOT 与谓词进行组合条件的查询     | NOT BETWEEN ... AND ...<br />IS NOT NULL<br />IS NULL<br />NOT IN |
| 显示数据表中的重复记录和记录条数 | select name, age, count(*), age from 表名 where age='19' group by date |
| 对数据进行降序或升序查询         | select 字段名 from 表名 where 条件 order by 字段 DESC; #降序<br />select 字段名 from 表名 where 条件 order by 字段 ASC; #升序 |
| 对数据进行多条件查询             | select 字段名 from 表名 where 条件 order by 字段1 ASC 字段2 DESC |
| 对统计结果进行排序               | select name,SUM(price) AS sumprice from 表名 GRPOUP BY name  |
| 单列数据分组统计                 | SELECT id,name,SUM(price) AS title,date FROM tb_price GROUP BY pid ORDER BY title DESC<br/> # 当分组语句group by排序语句order by同时出现在SQL语句中时，要将分组语句书写在排序语句的前面，否则会出现错误<br/> |
| 多列数据分组统计                 | SELECT *，SUM(字段1*字段2) AS (新字段1) FROM 表名 GROUP BY 字段 ORDER BY 新字段1 DESC<br/> SELECT id,name,SUM(price*num) AS sumprice  FROM tb_price GROUP BY pid ORDER BY sumprice DESC<br/> # group by语句后面一般为不是聚合函数的数列，即不是要分组的列<br/> |
| 多表分组统计                     | SELECT a.name,AVG(a.price),b.name,AVG(b.price) FROM tb_demo058 AS a,tb_demo058_1 AS b WHERE a.id=b.id GROUP BY b.type; |

