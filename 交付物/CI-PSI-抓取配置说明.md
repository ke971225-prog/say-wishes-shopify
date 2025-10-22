# CI 中自动抓取 PSI 配置说明

目标：在 GitHub Actions 中按 URL 清单定时或手动抓取 PageSpeed Insights（移动/桌面），并将报告文件上传为构件。

## 前置准备
- 一个 GitHub 仓库（把当前代码推上去）。
- 可选：Google API Key（提高配额与稳定性）。在 Google Cloud Console：
  - 创建项目 → 启用 PageSpeed Insights API → 创建 API Key。
  - 将 Key 作为仓库 Secret `PSI_API_KEY`（Settings → Secrets and variables → Actions → New repository secret）。

## 仓库内已准备
- 工作流：`.github/workflows/psi.yml`
- URL 清单：`交付物/pages.json`（默认包含首页与集合页）
- 抓取脚本：`fetch-psi-report.js`（支持多 URL、`--key` 密钥、`--strategy` 策略）

## 推送到 GitHub
1. 在本地初始化并推送：
   - `git init`
   - `git add .`
   - `git commit -m "chore: add PSI workflow & scripts"`
   - 在 GitHub 新建空仓库（私有/公开均可）
   - `git branch -M main`
   - `git remote add origin <你的仓库地址>`
   - `git push -u origin main`

## 设置仓库 Secret（可选但推荐）
- 进入仓库：Settings → Secrets and variables → Actions → New repository secret
- 名称：`PSI_API_KEY`，值：你的 Google API Key
- 有密钥时，工作流会自动在请求中附加 `key` 参数。

## 运行工作流
- 在仓库页面选择 Actions → `PSI Fetch` 工作流：
  - 手动触发：点击 “Run workflow”，可填写：
    - `urls`：留空则读取 `交付物/pages.json`；也可填入自定义列表（空格分隔）
    - `locale`：默认 `zh_CN`
    - `strategy`：`both`（或 `mobile`、`desktop`）
  - 定时任务：已配置每天 03:00 UTC 自动运行（可在 `.github/workflows/psi.yml` 修改 cron）。

## 检查输出构件
- 工作流成功后，将看到名为 `psi-deliverables` 的 Artifact，内含：
  - `交付物/性能报告.md`（按 URL 列出移动/桌面分数与核心指标）
  - `交付物/psi-results.json`（完整原始 JSON）
  - `交付物/优化建议.md`（抓取摘要与提示）

## 自定义 URL 清单
- 编辑 `交付物/pages.json`：
```json
{
  "urls": [
    "https://wishesvideo.com/",
    "https://wishesvideo.com/collections/all",
    "https://wishesvideo.com/products/<替换为你的主力产品slug>"
  ]
}
```
- 提交后，工作流下次运行会自动使用新的清单。

## 本地快速重跑（网络放行后）
- 多页面抓取并写入交付物：
  - `npm run psi:fetch -- https://wishesvideo.com/ https://wishesvideo.com/collections/all https://wishesvideo.com/products/<你的产品slug>`
- 仅移动端：
  - `npm run psi:mobile -- https://wishesvideo.com/ https://wishesvideo.com/collections/all`
- 仅桌面端：
  - `npm run psi:desktop -- https://wishesvideo.com/ https://wishesvideo.com/collections/all`
- 使用 API Key：
  - `node fetch-psi-report.js <urls...> --strategy both --locale zh_CN --key <你的Key>`

## 常见问题
- `ETIMEDOUT` / 连接超时：
  - 本地：企业网络可能阻断 `*.googleapis.com`；改用 GitHub Actions 远程运行。
  - CI：GitHub 托管 Runner 通常可直接访问；若失败，检查是否被组织策略限制。
- 构件缺失：确认工作流运行成功；失败时查看日志（脚本输出会说明错误）。
- 结果追加：脚本会在 `性能报告.md` 与 `优化建议.md` 追加新抓取；如需“覆盖”可先清空或改用 `--output` 与 `--json` 指定新的文件名。

## 进阶
- 修改定时：编辑 `.github/workflows/psi.yml` 中 `schedule.cron`（UTC）。
- 扩展指标：可在 `fetch-psi-report.js` 中补充更多 audits 字段到 Markdown。
- 与 Lighthouse 结合：在 CI 同时跑 `lighthouse-ci`，形成双报告以互相验证。