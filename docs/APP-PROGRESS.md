# 牌局实验室 Android 开发进度

更新时间：2026-10-02。任务：将现有 MoonHold'em 网页打包为可离线使用的 Android 安装包，应用名称「牌局实验室」。不发布商店，不提交或推送 Git。用户不采用此前生成的图标。

## 最新更新：0.1.1 图标与状态栏
后续网页改动（尚未同步 APP，按用户要求不打包）：网页标题/品牌/导出改为 Poker Lab；全局字体改用 system-ui,sans-serif，包括牌面和图片导出；示例改为默认折叠 details；页脚移除计算核心等小字，保留品牌和 Ryan；所有牌背字母由 M 统一改为 R，覆盖开场发牌、玩家与公共牌翻牌、分析结果及牌力速查。
下一次用户明确要求更新 APP 时，再同步这些网页改动，并修改 capacitor.config.json / Android strings.xml 的应用名、build-app.mjs 旧名称替换逻辑、app.js nativeApp 分支导出名称和 test-app.mjs APP 名称断言；递增版本。此轮没有运行 build:app、cap sync 或 Gradle，dist-app 与现有 APK 保持 0.1.1。

- 用户已在手机安装并使用 0.1.0，反馈系统状态栏背后为白色，并提供新的墨绿底金色黑桃图标参考。
- 用 imagegen 基于该参考制作无水印、四角满底版本，保存为 mobile/assets/icon-source.png；此前四款概念图不使用。
- build-icons.mjs 使用 sharp 做安装包规格转换：五种密度普通/圆形/自适应桌面资源，及 APP 页头图标。启动页也沿用新图标，网页原版标志不变。
- 白底根因：Capacitor SystemBars 用 android:windowBackground 绘制安全区，原先未设置该主题属性。现将 application/activity/splash 的 windowBackground、状态栏/导航栏、WebView 底色统一为 #101b19；保留系统安全区与浅色文字。
- 新产物 artifacts/PokerLab-0.1.1.apk，3,587,933 字节，versionCode 2；与 0.1.0 签名证书一致，可覆盖升级。
- SHA256：2048773D4307048AEF5665651E30655BBD16EF05159D3AAEFB13C591A0989CA5。
- 构建及 lintRelease 通过（APP 0 errors / 15 warnings）；签名核验、编译后的底色资源值验证通过；网页/APP 模拟桥接回归和页头图标加载测试通过。
- 需要用户安装新版本确认厂商手机状态栏实际效果。没有在本机连接手机验证，不能声称真机已验证修复。

## 方案
- 保留 MoonBit 核心和 web 源码，用 Capacitor Android 加载安装包内资源。
- 单独构建 dist-app，网页部署保持原路径与行为。
- Android 增加系统文件保存、返回键、持久保存牌局；网页原有下载与刷新规则保持。
- 构建环境位于忽略目录 .tools，产物 artifacts；密钥禁止入库。

## 已确认
- 初始 git status 干净，没有 AGENTS.md。
- Node 22.22.1、Java 17；没有检测到 Android SDK。
- 已获得项目目录写入和网络权限（本会话）。

## 已完成
- Capacitor 8.5.2 工程、APP 名称/离线资源入口和 Android 系统图片保存插件。
- 返回键关闭对话框/收起键盘/返回桌面，APP 本地牌局保存，网页保持 sessionStorage 逻辑。
- 独立 JDK 21 与 SDK 36 安装在 .tools；Gradle 8.14.3 构建完成。
- 26 个 MoonBit 测试与网页接口测试通过。
- Playwright Edge 手机宽度测试通过：网页/模拟原生桥接计算、名字、刷新、重新进入、PNG 下载/取消/保存、无横向溢出。
- .local/android-signing 中已生成私有签名（禁止打印/上传），构建脚本自动复用。
- Android 构建/测试 CI 和 docs/ANDROID.md 已添加，尚未推送运行。

## 最终产物与验证
- `artifacts/PokerLab-0.1.0.apk`：3,220,187 字节，release 签名版本。
- SHA256：`4DD0B85C315A06DA701E70B75A0B1E831467A83451D8593EBAED91CA28E44802`。
- apksigner 验证通过（v2），应用名「牌局实验室」，包名 `io.github.ryan1125.pokerlab`，versionCode 1，最低 API 24、目标 API 36。
- APK 内六个页面/引擎资源与最新 dist-app 逐一一致，附带项目与 Capacitor 许可证。
- 最终构建及 lintRelease 完成；APP lint 为 0 errors、15 warnings（主要为工程模板未使用资源、图标密度和版本更新建议）。Capacitor 依赖自带 lint baseline。
- Playwright 模拟原生桥接额外验证了图片保存失败后可重试，错误提示留在预览中。
- git diff --check 通过；.moonignore 防止 Android 工程、工具与私有签名进入 Mooncakes。申报书仍忽略。
- npm 运行时依赖 audit 无漏洞；构建 CLI 的 iOS/xcode 间接依赖报告 3 项 moderate，不在 Android 页面 bundle 中，未强制降级框架。
- 无 commit、push、商店发布或 GitHub CI 远程运行。

## 后续真机验收
用户尚未提供手机型号。未实际安装到手机或模拟器，不能称为真机通过。请验证离线计算、动画、刘海/导航栏、返回键、后台恢复、系统图片保存/取消/文件名。图标仍为工程占位图，用户已拒绝此前生成图标。

后续改动请递增 Android versionCode 并保留 .local/android-signing；不要删除签名目录。用户可以发送 APK 到 Android 手机安装。

本机测试命令：`$env:PLAYWRIGHT_CHANNEL='msedge'; npm run test:app`。APK 构建命令：`npm run android:apk`。

继续任务时先读此文件和 git diff，不能因为中断而重置现有改动。
