# App启动性能分析

## 启动性能分析执行

| 目的                               | 命令                                                         | 期望                                                         |
| ---------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| 指定App的包名                      | package=com.xueqiu.android                                   |                                                              |
| 清楚缓存                           | adb shell pm clear $package                                  |                                                              |
| 强制停止App                        | adb shell am force-stop $package                             |                                                              |
| 启动App                            | adb shell am start -S -W $package/.view.WelcomeActivityAlias | Stopping: com.xueqiu.android<br/>Starting: Intent { act=android.intent.action.MAIN cat=[android.intent.category.LAUNCHER] cmp=com.xueqiu.android/.view.WelcomeActivityAlias }<br/>Status: ok<br/>Activity: com.xueqiu.android/.view.WelcomeActivityAlias<br/>ThisTime: 1317<br/>TotalTime: 1317<br/>WaitTime: 1322<br/>Complete |
| 调用logcat查看启动过程信息获取数据 | adb logcat \| grep -i displayed                              | 04-09 12:42:20.374   731   752 I ActivityManager: Displayed com.mumu.launcher/.Launcher: +952ms<br/>04-09 13:18:59.143   731   752 I ActivityManager: Displayed com.xueqiu.android/.view.WelcomeActivityAlias: +1s317ms<br/>04-09 13:19:01.032   731   752 I ActivityManager: Displayed com.xueqiu.android/.common.MainActivity: +573ms<br/>04-09 13:19:05.566   731   752 I ActivityManager: Displayed com.xueqiu.android/.common.UpdateDialogActivity: +32ms |

一个App由多个Activity组成

waittime由系统运行快慢决定

StartTime: 记录刚准备调用startActivityAndWait()的时间点

endTime: 记录startActivityAndWait()函数调用返回的时间点

WaitTime: startActivityAndWait()调用耗时

WaitTime = endTime - startTime

## 使用ffmpeg拆帧

package=com.xueqiu.android

adb shell am force-stop $package

adb shell screenrecord --bugreport --time-limit 30 /data/local/tmp/xueqiu.MP4 &

adb shell am start -S -W $package/.view.WelcomeActivityAlias

wait 

adb pull /data/local/tmp/xueqiu.mp4

ffmpeg -i xueqiu.mp4 xueqiu.gif

ffmpeg -i xueqiu.mp4 -r 10 frames_%03d.jpg

### Windows端的命令

adb shell am force-stop com.xueqiu.android    ##  停止App

adb shell screenrecord --bugreport --time-limit 30 /data/local/tmp/xueqiu.mp4 & (window端不用加&)   ## 使用命令录制视频

adb shell am start -S -W com.xueqiu.android/.view.WelcomeActivityAlias   # 使用命令来启动App,实际上要切换另外一个控制台,因为当前控制台在录制

wait 

adb pull /data/local/tmp/xueqiu.mp4      ##该命令从模拟器中拉取录制的视频

ffmpeg -i xueqiu.mp4 xueqiu.gif    ##该命令将mp4转换成gif动图

ffmpeg -i xueqiu.mp4 -r 10 frames_%03d.jpg    ##该命令将mp4转换成jpg图







