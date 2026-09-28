# 发布与验收清单

当前阶段是本地开发；此文件不是验收通过证明。

1. 确认 Mooncakes 账号及命名空间。若不是 Ryan-1125，修改 moon.mod 和 cmd/*/moon.pkg 的 import，并同步 README。
2. 执行 `moonc -v`，最低 v0.10.14。
3. 执行 `moon info`、`moon fmt`、`moon check --deny-warn`、`moon build --deny-warn`、`moon test --deny-warn`。
4. 执行 `moon run cmd/demo` 与 `moon run cmd/verify --release`。
5. 在 GitHub Desktop 检查修改，按实际开发成果提交，推送到公开仓库。提交数量不代替功能与测试。
6. 查看 GitHub Actions 实际结果，必须全部通过；在新目录 clone 后复现 README。
7. 执行 `moon package --list` 检查发布内容，确认 README、LICENSE、源代码、示例完整。
8. `moon login` 后执行 `moon publish`。该命令会实际发布，应在确认包名与版本后执行。
9. 在独立使用方项目中 `moon add <账号>/moonholdem@0.1.0`，按 README 导入并执行示例。
10. 更新 README 的发布状态，保存 Mooncakes 链接和 CI 结果。之后按赛事要求提交/维护。

后续增强候选：用户可输入参数的 CLI、网页展示、结构化错误类型、评估性能优化。
不把未实现功能写成已完成，也不通过空提交制造开发记录。
