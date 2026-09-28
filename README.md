# MoonHoldem

纯 MoonBit 德州扑克牌力评估、摊牌判定与已知双方底牌的精确概率计算库。
Pure MoonBit Texas Hold'em hand evaluation, showdown and exact heads-up equity.

## 当前状态

v0.1.0 本地开发版本，尚未发布到 Mooncakes。包命名空间暂定为
`Ryan-1125/moonholdem`，发布前须核对 Mooncakes 账号。CI 配置已提供，
GitHub 上的实际执行结果以 Actions 页面为准。

## 功能与边界

- 标准 52 张牌，无鬼牌；ASCII 记法 `As Kh Td 2c`，大小写敏感，T 表示 10。
- 五张牌的九种牌型；皇家同花顺作为 A 高同花顺处理。
- 五至七张牌中选择最佳五张，正确处理小顺子、踢脚牌和平局。花色不分大小。
- 2 至 23 名玩家的摊牌比较（两张底牌、五张公共牌），返回全部赢家的零基索引。
- 双方底牌已知，公共牌为 3、4 或 5 张时枚举所有剩余公共牌，返回赢、输、平局计数。
- 输入检查：张数、非法记法、同一副牌中重复的实体牌。

首版不包含下注流程、边池、弃牌状态、对手范围、翻牌前概率、策略 AI 或网页界面。
概率模型假定未见牌等可能出现，没有额外已知死牌；平局权益按双方各一半计算。
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
概率：翻牌枚举 C(45,2)=990 个无序组合，转牌枚举 44 张河牌，河牌只有 1 个结果。
双方权益计算只比较最终牌力，不推断打法或下注收益。

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
- `holdem.mbt`：摊牌和精确概率。
- `moonholdem_test.mbt`：公共 API 黑盒测试。
- `cmd/demo`：三个可运行用例。
- `cmd/verify`：全部五张牌组合验证。
- `docs/RELEASE.md`：发布与验收步骤。

## 许可证与来源

MIT，见 LICENSE。当前代码按通用扑克规则独立实现，由 AI 辅助编写，未移植第三方库源代码。
使用 MoonBit 标准库；语言与工具链文档：https://docs.moonbitlang.com/ 。
不宣称是 MoonBit 首个此类项目，也不宣称已经通过赛事审核。
