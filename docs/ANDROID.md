# 牌局实验室 Android APP

Android 版本复用 MoonHold'em 的 MoonBit 核心与网页界面，采用 Capacitor 8。网页、Worker 和编译后的计算引擎均随 APK 打包，使用时不需要开启电脑或访问 GitHub Pages。

## 手机安装

将 `artifacts/PokerLab-0.1.1.apk` 传到 Android 手机并打开，按系统提示允许当前文件管理器安装应用。已安装旧版时直接覆盖安装，无需卸载。最低 Android 7.0（API 24），需要较新的 Android System WebView。原生 HarmonyOS 不属于此 APK 的支持范围。

首次打开为空白二人牌桌。APP 会在设备上保留牌局与玩家名，重新打开自动恢复；网页仍保持「新进入为空桌、刷新恢复」规则。

图片导出：预览 → 确认下载 → 系统文件选择器 → 保存。可修改文件名与目录，取消不显示保存成功。不申请通讯录、定位或全部文件访问权限。返回键优先关闭预览/牌力表，在主页面返回桌面。

图标采用墨绿底与金色黑桃，源文件为 `mobile/assets/icon-source.png`。`scripts/build-icons.mjs` 生成各密度桌面图标、自适应图标图层及 APP 页头图标。系统状态栏和窗口底色统一为页面的 `#101b19`，保持浅色状态栏文字。

## 构建

需要 MoonBit >= 0.10.14、Node.js 22+、JDK 21，以及 Android SDK Platform 36 / Build Tools 36.0.0。可以通过 Android Studio 安装 SDK。设置 `JAVA_HOME` 和 `ANDROID_HOME` 指向安装位置。

```sh
npm ci
npm run android:apk
```

本机也可自动使用 `.tools/jdk/` 与 `.tools/android-sdk/` 中已安装的工具。此目录、依赖缓存和 APK 均不进入 Git。

构建步骤：MoonBit 编译 → 复制网页到 `dist-app` → 生成 Android 适配入口 → Capacitor 同步资源 → Gradle 编译、签名与 lint → 输出 APK。

首次本地构建会生成 `.local/android-signing/pokerlab.jks` 与 `signing.json`。**请将整个签名目录私下备份**，不要上传 GitHub，也不要随缓存一起清理。以后必须使用同一签名才能覆盖安装更新。发布新版本时递增 `android/app/build.gradle` 的 `versionCode`，同步更新 `versionName` 和 package.json 的版本号；产物名自动采用 package.json 的版本号。

```sh
npm run android:sync
npm run android:open
```

以上命令用于同步资源并在 Android Studio 中打开工程。网页原有 `node scripts/serve-web.mjs` 与 GitHub Pages 流程不需要 npm 依赖，也不受 Android 工程影响。

## 验证

```sh
moon test --deny-warn
npm run build:app
npm run test:web
npx playwright install chromium
npm run test:app
```

Windows 已安装 Edge 时，可设置 `$env:PLAYWRIGHT_CHANNEL='msedge'`，无需另装 Chromium。浏览器测试覆盖网页和模拟原生桥接的状态恢复、计算、导出取消/成功及手机宽度布局；不能替代真实手机测试。

GitHub 的 `Android APK` 工作流会构建测试 APK 并上传为运行附件。CI 的临时 debug 签名与本机 release 签名不同，请用本机 release APK 做持续使用和覆盖更新。

真机检查：飞行模式计算、2–9 人示例、动画、后台恢复、返回键、系统文件选择器取消/保存、中文文件名、刘海屏和键盘遮挡。不同厂商 WebView 的动画与文件选择器行为以真机结果为准。

## 目录

- `mobile/native.js`：原生桥接入口、返回键及 PNG 导出调用。
- `android/`：原生工程、系统图片保存插件、签名配置。
- `scripts/build-app.mjs`：独立 APP 资源构建，保留网页名称。
- `scripts/build-android.mjs`：本地签名与 APK 构建。
- `docs/APP-PROGRESS.md`：中断后的任务接续记录。

应用没有账号、广告、统计上报或服务端。牌局保存在应用本地存储，卸载或清除应用数据会移除；主动导出的 PNG 文件独立保存。
