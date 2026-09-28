# MoonHold'em

MoonHold'em 是一个使用 MoonBit 编写的德州扑克规则与牌力分析项目。它提供标准 52 张牌的牌型判断、最佳五张选择、多人摊牌比较和精确胜负概率计算，并配有一个可以直接操作的网页界面。

![alt text](./_build/multiplayer-desktop.png)

项目名称在代码中使用 `MoonHoldem`，网页界面使用 `MoonHold'em`。

## 功能

- 解析和校验标准扑克牌记法，例如 `As Kh Td 2c`。
- 判断高牌、一对、两对、三条、顺子、同花、葫芦、四条和同花顺。
- 从五至七张牌中选择最佳五张，处理 A2345 小顺子、踢脚牌和完全平局。
- 比较 2 至 23 名玩家的最终牌力。网页牌桌限制为 2 至 9 人。
- 在底牌全部已知、公共牌有 3 至 5 张时，精确枚举所有剩余公共牌。
- 返回每位玩家的独赢、共同获胜、落败次数和权益。多人平局时，按获胜人数平分权益。
- 提供中文牌力解释，并高亮决定比较结果的牌。
- 转牌阶段按最终获胜玩家列出所有可能的河牌，突出逆转和共同获胜的结果，支持点击查看与返回转牌分析。
- 网页支持牌力速查、牌局自动保存、图片预览和 PNG 下载。

项目只处理牌力和牌局分析，不包含下注流程、弃牌、边池、对手范围、翻牌前未知手牌概率或策略 AI。

## 环境要求

- MoonBit 编译器 `moonc >= 0.10.14`
- Node.js 18 或更高版本（仅运行网页演示需要）

项目使用 MoonBit 标准库，没有第三方 Mooncakes 依赖。

## 本地运行

在仓库目录执行：

```sh
moon check --deny-warn
moon build --deny-warn
moon test --deny-warn
moon run cmd/demo
```

`cmd/demo` 展示七选五、双人摊牌和转牌阶段的精确概率计算。

如需验证全部五张牌组合：

```sh
moon run cmd/verify --release
```

该命令会遍历 2,598,960 种五张牌组合，并检查九种牌型的数量是否符合数学计数。

## 网页演示

```sh
node scripts/serve-web.mjs
```

然后打开 <http://127.0.0.1:端口号>。脚本会先构建 MoonBit 的 JavaScript 接口，再启动本地服务；不需要执行 `npm install`。。

网页操作流程：

1. 添加或移除玩家，牌桌支持 2 至 9 人。
2. 点击牌位，再从牌组中选择底牌和公共牌。选满一组牌后会自动取消选中，避免误替换。
3. 点击“计算牌力与概率”，查看全桌概率表、当前领先玩家和牌力解释。
4. 点击结果表中的任意一行，查看该玩家的最佳五张和比较说明。
5. 使用示例按钮可以快速载入 AA 对 KK、同花听牌、公共牌平局和四人牌局。
6. 公共牌为四张时，在“哪张河牌会改变结果？”中点击牌面，可填入该牌并查看最终结果；点击“返回转牌分析”恢复原牌局。保持领先的牌组可展开查看。

牌力和精确概率由 MoonBit 核心完成，浏览器代码负责交互和展示。所有底牌已知时，结果是精确枚举，不是随机模拟。

## 牌局保存与图片导出

网页会静默保存最近一桌牌面到当前浏览器，刷新后自动恢复。保存内容只存在本地浏览器，不会上传，也不会在不同设备之间同步。

在“牌局分析”区域点击“下载牌局图片”后，会先打开图片预览。点击“确认下载”才会保存，点击“取消”或按 Esc 则不会下载。图片包含玩家底牌、公共牌、牌型、概率、权益和生成时间。

文件名格式如下：

```text
MoonHold'em-2人牌局-2026.09.28-185636.png
```

## API 示例

发布包后，可以在其他 MoonBit 项目中导入：

```text
import {
  "Ryan-1125/moonholdem" @holdem,
}
```

五至七张牌评估：

```moonbit nocheck
let cards = @holdem.parse_cards("As Ad Ah Ks Kd Kh 2c").unwrap()
let hand = @holdem.evaluate(cards).unwrap()
// hand.category: FullHouse
// hand.tie_break: [14, 13]
```

双人精确概率：

```moonbit nocheck
let hero = @holdem.parse_cards("As Ad").unwrap()
let villain = @holdem.parse_cards("Ks Kd").unwrap()
let board = @holdem.parse_cards("2c 3d 7h 9s").unwrap()
let equity = @holdem.exact_equity(hero, villain, board).unwrap()
// 转牌阶段共有 44 种河牌结局
```

多人精确概率使用 `exact_table_equity(hands, board)`，其中 `hands` 包含 2 至 9 组两张底牌，`board` 包含 3 至 5 张公共牌。返回的每位玩家数据包括：

- `wins`：独自获胜的结局数；
- `ties`：与其他玩家并列第一的结局数；
- `losses`：没有获胜的结局数；
- `equity`：在所有结局中的平均牌池份额。

`compare(a, b)` 返回 `1`、`0` 或 `-1`，分别表示左侧更强、平局或右侧更强。

## 算法与验证

五张牌评估通过点数计数、同花判断和顺子判断构造可比较的牌力值。七张牌评估枚举 21 个五张组合并选择最强组合。概率计算枚举剩余公共牌的无序组合：翻牌阶段枚举两张公共牌，转牌阶段枚举一张河牌，河牌阶段只有一个最终结果。

测试覆盖九种牌型、同牌型比较、A2345、小顺子、踢脚牌、三对取最佳两对、平局、重复牌、多人共同获胜、2 至 9 人权益分配和浏览器接口。GitHub Actions 会执行格式检查、编译、测试、网页构建、网页接口测试、示例和牌型穷举验证。

## 目录

- `cards.mbt`：牌的表示、解析和重复检查。
- `evaluator.mbt`：牌型评估和最佳五张选择。
- `holdem.mbt`：摊牌和双人精确概率。
- `multiplayer.mbt`：多人精确概率和权益计算。
- `explanation.mbt`：中文比较说明和关键牌提取。
- `moonholdem_test.mbt`：核心测试。
- `cmd/demo`：命令行示例。
- `cmd/verify`：五张牌组合穷举验证。
- `web`：网页界面。
- `web_bridge`：MoonBit 到浏览器的接口。
- `scripts`：网页构建、服务和接口测试脚本。
- `docs/RELEASE.md`：发布与验收清单。

## 许可证

本项目采用 MIT License，见 [LICENSE](LICENSE)。代码按通用德州扑克规则独立实现。
