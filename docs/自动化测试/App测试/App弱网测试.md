# App弱网测试

## 使用Charles开启代理

charles, 点击Proxy, 点击Proxy Settings, 点击Proxies,勾选Support HTTP/2, 勾选Enable transparent HTTP proxying

并设置代理的端口,要求不能和其他的冲突

这个时候,毕竟代理环境的复杂性,可以将其他代理软件关闭

## mumu模拟器端设置代理服务器

1、设置--WLAN--鼠标左键长按--修改网络--代理--手动--设置服务器主机名和端口号保存即可。
 2、然后在浏览器中打开：chls.pro/ssl 模拟器中会下载一个包含CA证书的数据文件，完成后打开。

参考地址: https://www.jianshu.com/p/8d49f00c0ebf

## charles设置Throttle风门

charles, 点击Proxy, 点击Throttle Settings,勾选Enable Throtting,并且根据实际测试需要,设置Throttle preset,从而达到设置速率

