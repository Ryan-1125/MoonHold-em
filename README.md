# MoonHoldem

纯 MoonBit 德州扑克牌力评估、摊牌判定与已知所有玩家底牌的精确概率计算库。
Pure MoonBit Texas Hold'em hand evaluation, showdown and exact 2–8 player equity.

## 当前状态

v0.1.0 本地开发版本，尚未发布到 Mooncakes。包命名空间暂定为
`Ryan-1125/moonholdem`，发布前须核对 Mooncakes 账号。CI 配置已提供，
GitHub 上的实际执行结果以 Actions 页面为准。

## 功能与边界

- 标准 52 张牌，无鬼牌；ASCII 记法 `As Kh Td 2c`，大小写敏感，T 表示 10。
- 五张牌的九种牌型；皇家同花顺作为 A 高同花顺处理。
- 五至七张牌中选择最佳五张，正确处理小顺子、踢脚牌和平局。花色不分大小。
- 2 至 23 名玩家的摊牌比较（两张底牌、五张公共牌），返回全部赢家的零基索引。
- 2–8 人底牌全部已知，公共牌为 3、4 或 5 张时精确枚举剩余公共牌，返回每人的独赢、共同获胜、落败计数和权益。原双人接口继续保留。
- 输入检查：张数、非法记法、同一副牌中重复的实体牌。

首版不包含下注流程、边池、弃牌状态、对手范围、翻牌前概率、策略 AI 。
概率模型假定未见牌等可能出现，没有额外已知死牌；多人共同获胜时，每人分得 1 / 获胜人数；权益是各结局份额的平均值。
结果中的数组供读取展示，请勿修改后再将结果用于比较。

## 环境与本地运行

需要 `moonc >= 0.10.14`。验证环境：v0.10.14，默认 `wasm-gc` 目标。
没有第三方 Mooncakes 依赖。

```sh
git clone https://github.com/Ryan-1125/MoonHold-em.git
cd MoonHold-em
moonc -v
moon check --deny-warn
moon build --deny-warn
moon test --deny-warn
moon run cmd/demo
```

尚未推送的本地开发阶段，请直接在本仓库目录运行上述 `moon` 命令。

示例覆盖三种用例：七选五、多人摊牌、转牌阶段精确概率。
最后一例 `As Ad` 对 `Ks Kd`，公共牌 `2c 3d 7h 9s`，输出应为：

```text
42 wins, 2 losses, 0 ties, 44 possible rivers
Win probability: 0.9545454545454546
Pot equity: 0.9545454545454546
```

## 交互式网页演示

安装 Node.js 18 或更高版本（开发环境使用 v22），在仓库目录执行：

```sh
node scripts/serve-web.mjs
```

脚本会自动将 MoonBit 计算接口编译为 JavaScript，并启动仅本机可访问的服务。
浏览器打开 **http://127.0.0.1:4173**。保持终端运行，按 Ctrl+C 停止。
无需 npm install，没有第三方前端依赖；请勿直接双击 HTML 文件。

1. 点击“添加玩家”增至最多 8 人，点击座位上的 × 移除玩家（至少保留 2 人）。点击牌位，再从下方牌组选择牌。
2. 为所有玩家各选两张底牌，公共牌选三至五张；已使用的牌会禁用。移除玩家会释放其底牌，后续座位重新编号。
3. 点击“计算牌力与概率”，查看全桌概率表；点击结果表中的玩家，查看其最佳五张、关键牌高亮和中文比较解释。
4. 点击“AA 对 KK”“同花听牌”“公共牌平局”“四人对局”可直接载入并计算示例。载入示例会替换当前牌桌与人数。
5. 修改牌面会清除旧结果；“移除当前牌”删除选中牌位，“清空牌桌”清除牌面并保留人数。

牌力和精确概率由 `web_bridge` 调用本库计算，浏览器 JavaScript 只负责界面。
计算在 Web Worker 中执行。首版不支持未知底牌、翻牌前或随机胜率模拟。
当前牌力领先与最终获胜概率分别展示。网页不上传牌面，不依赖外部 CDN。

```sh
node scripts/build-web.mjs
node scripts/test-web.mjs
```

第一条命令构建网页计算模块，第二条验证浏览器桥接接口。生成的 `web/engine.mjs`
不提交到 Git；需要部署时先构建，再托管整个 `web/` 目录。
若 4173 端口被占用，可在 PowerShell 执行 `$env:PORT=4174` 后重新启动。

## 使用 API

发布后可执行以下命令（当前尚未发布，不能保证安装成功）：

```sh
moon add Ryan-1125/moonholdem@0.1.0
```

在调用方 `moon.pkg` 中添加：

```text
import {
  "Ryan-1125/moonholdem" @holdem,
}
```

```moonbit nocheck
let cards = @holdem.parse_cards("As Ad Ah Ks Kd Kh 2c").unwrap()
let hand = @holdem.evaluate(cards).unwrap()
// hand.category: FullHouse
// hand.tie_break: [14, 13]，即 A 三条配 K 对子
let hero = @holdem.parse_cards("As Ad").unwrap()
let villain = @holdem.parse_cards("Ks Kd").unwrap()
let board = @holdem.parse_cards("2c 3d 7h 9s").unwrap()
let equity = @holdem.exact_equity(hero, villain, board).unwrap()
// equity.wins = 42, equity.losses = 2, equity.total = 44
```

可编译的完整示例见 `cmd/demo/main.mbt`。所有可失败的公共函数返回 `Result[..., String]`；
示例对固定合法输入使用 `unwrap()`，处理用户输入时应匹配 `Ok` / `Err`。

`compare(a, b)` 返回 1（a 更强）、0（平局）、-1（b 更强）。
`tie_break` 按比较优先级排列，点数 2–14，A 为 14，小顺子的最高点数为 5。
`best_five` 是选中的五张实体牌，不保证按牌力排序；多个等价组合取输入顺序中的第一个。
`win_probability()` 不包含平局；`pot_equity()` 为 `(wins + ties / 2) / total`。

## 算法与验证

五张牌：统计点数、判断同花和顺子，再按牌型及踢脚牌构造可比较的值。
七张牌：枚举 C(7,5)=21 个组合；这优先保证可理解性，没有声称达到查表算法的性能。
概率：N 人翻牌枚举 C(49−2N,2) 个无序组合，转牌枚举 48−2N 张河牌，河牌只有 1 个结果。例如两人翻牌 990 种，八人翻牌 528 种。
全桌权益计算只比较最终牌力，不推断打法或下注收益。

测试覆盖九种牌型、同牌型比较、A 小顺子、两组三条、三对、公共牌平局、
非法输入、120 种五张牌排列不变性、精确转牌计数、翻牌组合总数与双方交换对称性。

额外的穷举验证遍历全部 2,598,960 种五张牌组合，检查九类牌型总数：

```sh
moon run cmd/verify --release
```

数学计数推导见 `docs/verification.md`。该检查验证分类总数，不能单独证明所有踢脚牌排序正确，
因此需要与单元测试一起使用。

GitHub Actions 在 push / pull request 时执行格式、检查、构建、测试、示例、穷举及打包。
CI 安装当前稳定工具链并检查最低版本，因此未来工具链变化可能需要维护兼容性。

## 目录

- `cards.mbt`：牌的表示、解析和重复检查。
- `evaluator.mbt`：牌型和最佳五张评估。
- `holdem.mbt`：摊牌和双人精确概率。
- `multiplayer.mbt`：2–8 人精确概率及按共同获胜人数平分权益。
- `explanation.mbt`：中文比较说明和决定胜负的牌。
- `moonholdem_test.mbt`：公共 API 黑盒测试。
- `cmd/demo`：三个可运行用例。
- `cmd/verify`：全部五张牌组合验证。
- `docs/RELEASE.md`：发布与验收步骤。

## 许可证与来源

MIT，见 LICENSE。当前代码按通用扑克规则独立实现，由 AI 辅助编写，未移植第三方库源代码。
使用 MoonBit 标准库；语言与工具链文档：https://docs.moonbitlang.com/ 。
不宣称是 MoonBit 首个此类项目，也不宣称已经通过赛事审核。

## 多人计算 API

`exact_table_equity(hands, board)` 接受 2–8 组底牌和 3–5 张公共牌。
返回 `TableEquity`：`total` 为枚举结局数，`players` 按输入座位顺序排列。
每位玩家的 `wins` 为独自获胜次数，`ties` 为并列第一次数，`losses` 为其余次数，
`equity` 为平均份额。注意：多人情况下不能简单使用 `(wins + ties / 2) / total`。
所有人的权益之和为 1（浮点误差除外），本接口不计算边池或不等额投入。

网页的“当前领先”是当前公共牌下最佳五张的比较；概率表则基于全桌最终结果。
结果详情会注明对比玩家，逐对解释不代表概率是单挑计算。
