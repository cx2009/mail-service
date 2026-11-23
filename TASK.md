# mail-service 上线任务清单

> 目标形态：前端 → `POST https://mail-service.<子域>.workers.dev/api/send` → Worker → Resend → 收件方；
> `/api/track` → Worker → D1。
> 代码已就绪（本目录），本清单只需产出 **1 个域名 + 2 个密钥**。
> 勾选规则：每一步都有独立可验证的完成标准，验证不通过不勾。

---

## 阶段 1 · 准备账号（约 10 分钟）

- [ ] 注册 DigitalPlat（拿免费域名）— https://dashboard.digitalplat.org/auth/register
- [ ] 注册 Resend（实际投递）— https://resend.com/signup
- [ ] 注册 Cloudflare（部署 Worker + D1）— https://dash.cloudflare.com/sign-up
- [ ] 三个账号统一用 `imj2009@proton.me`，并检查 Proton **垃圾箱**是否收到验证信

---

## 阶段 2 · 申请域名

- [ ] 登录 DigitalPlat FreeDomain 控制台，搜索 `tonwallect`，命名空间选 `dpdns.org`
- [ ] 用途栏粘贴以下说明并提交：
  ```
  tonwallect.dpdns.org will serve as the official site and transactional email domain of
  Yuanbu Technology. We send only transactional messages (registration verification
  codes and service notifications) to our own registered users, low volume
  (<100/day). No bulk marketing, no purchased lists. DNS managed via Cloudflare.
  ```
- [ ] 等待人工审核（几小时到几天），回控制台确认状态为通过
- [ ] 确认后台**有 DNS 记录管理面板**
- [ ] 确认记录类型里**有 MX 选项**（阶段 4 依赖）
- [ ] 若 `tonwallect` 被占：改用 `tonwallectkeji` 或 `tonwallect-tech`，用途说明里的域名同步替换

---

## 阶段 3 · Resend 添加域名

- [ ] Resend 控制台 → Domains → Add Domain：填 `tonwallect.dpdns.org`，区域选 `us-east-1`（或推荐区域）
- [ ] 记录页面给出的真实记录值（以页面为准，下表为常见形态）

| 类型 | 名称 | 值 | 优先级 |
|---|---|---|---|
| MX | send | feedback-smtp.us-east-1.amazonses.com | 10 |
| TXT | send | v=spf1 include:amazonses.com ~all | — |
| TXT | resend._domainkey | p=MIGf...（页面公钥） | — |
| TXT | _dmarc | v=DMARC1; p=none; rua=mailto:imj2009@proton.me; adkim=r; aspf=r | — |

> 最后一条 DMARC 需自己添加，Resend 不提供。

---

## 阶段 4 · 配置 DNS（决定邮件能否验证通过）

- [ ] 在 DigitalPlat DNS 面板添加上述 4 条记录
- [ ] 名称格式按面板要求填写（不确定就填完整域名，多数面板接受）

| 面板要求 | MX 名称 | DKIM 名称 |
|---|---|---|
| 只填前缀（相对名） | `send` | `resend._domainkey` |
| 要完整域名（FQDN） | `send.tonwallect.dpdns.org` | `resend._domainkey.tonwallect.dpdns.org` |

- [ ] 回 Resend 点 **Verify**，等待 5–30 分钟
- [ ] 浏览器自查（本机 DNS 不可靠）：
  `https://dns.google/resolve?name=resend._domainkey.tonwallect.dpdns.org&type=TXT`
  标准：`Status` 为 0 且有 `Answer`
- [ ] Resend 域名状态变为 **Verified**

### 若面板没有 MX 类型（说明不是完整 DNS 服务）

- [ ] Cloudflare 添加站点 `tonwallect.dpdns.org`
- [ ] 若提示“子域需要 Business 计划”，改用 FreeDNS（https://freedns.afraid.org）托管子域
- [ ] 把拿到的两个 NS 填回 DigitalPlat 的委托设置
- [ ] 在 Cloudflare / FreeDNS 里重新添加上述 4 条记录，再回 Resend 验证

---

## 阶段 5 · 部署 Worker

在 `F:\元步科技\mail-service` 目录执行。

- [ ] 登录：`npx wrangler login`（弹浏览器，点允许）
- [ ] 创建 D1：`npx wrangler d1 create mail-service`，复制输出的 `database_id`
- [ ] 把 `database_id` 填入 [wrangler.toml](file:///F:/元步科技/mail-service/wrangler.toml) 的 `REPLACE_WITH_YOUR_D1_DATABASE_ID`
- [ ] 建表：`npm run db:init:remote`
- [ ] 写入 Resend Key（仅 **Sending** 权限）：
  `npx wrangler secret put RESEND_API_KEY`
- [ ] 写入发件人（域名必须已验证）：
  `npx wrangler secret put RESEND_FROM` → `元步科技 <noreply@tonwallect.dpdns.org>`
- [ ] 放开跨域：编辑 `wrangler.toml` 的 `ALLOWED_ORIGINS`，写成完整 origin 逗号分隔（含 `https://`，无路径、无尾斜杠）
- [ ] 部署：`npm run deploy`（首次按要求设置 workers.dev 子域）
- [ ] 记下部署输出的 URL：`https://mail-service.<xxx>.workers.dev`

### 部署后验证

- [ ] `curl https://mail-service.<xxx>.workers.dev/api/health` → `{"ok":true,...}`
- [ ] `curl https://mail-service.<xxx>.workers.dev/api/templates` → `{"templates":["welcome"]}`
- [ ] 真实发信：
  ```
  curl -X POST https://mail-service.<xxx>.workers.dev/api/send \
    -H 'Content-Type: application/json' \
    -d '{"to":"另一个邮箱","template":"welcome","data":{"name":"测试","code":"123456"}}'
  ```
  期望 `{"ok":true,"id":"...","log_id":"..."}`，且 Resend → Logs 能看到该邮件

---

## 阶段 6 · 前端接入

- [ ] 配置 `const API = "https://mail-service.<xxx>.workers.dev";`
- [ ] 接入发信：
  ```js
  await fetch(`${API}/api/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, template: "welcome", data: { name, code } }),
  });
  ```
- [ ] 接入埋点：
  ```js
  await fetch(`${API}/api/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "page_view",
      props: { path: location.pathname },
      url: location.href,
      referrer: document.referrer,
    }),
  });
  ```

约束：

- [ ] `ALLOWED_ORIGINS` 为完整 origin（含 `https://`），不带路径和尾斜杠
- [ ] 事件名只用小写字母、数字、`_`、`-`，最长 64
- [ ] `props` 序列化后不超过 2 KB

---

## 阶段 7 · 送达率验证（重点，不可跳过）

- [ ] 打开 https://www.mail-tester.com 拿临时邮箱
- [ ] 用 `/api/send` 给它发一封
- [ ] 评分 ≥ 9/10
- [ ] SPF、DKIM、DMARC 三项全绿
- [ ] 分别向 Gmail、Outlook 各发一封，确认落点（收件箱 / 垃圾箱）

若 Gmail 进垃圾箱（`*.dpdns.org` 免费子域有天然声誉劣势），按顺序处理：

- [ ] 前两周每天 ≤ 50 封
- [ ] 4 周后 DMARC 从 `p=none` 升到 `p=quarantine`
- [ ] 退信率保持 < 5%
- [ ] 长期方案：业务稳定后换正式注册域名

---

## 阶段 8 · 埋点数据核对

- [ ] 执行查询，确认数据落在 D1 的 `track_event` 表：
  ```
  npx wrangler d1 execute mail-service --remote \
    --command="SELECT event, COUNT(*) AS c FROM track_event WHERE day = date('now') GROUP BY event"
  ```
- [ ] 看板页暂不做（前端已有项目，统计放前端侧展示）；需要时再加 Worker 查询接口

---

## 阶段 9 · 排错对照

| 现象 | 原因 | 处理 |
|---|---|---|
| Resend 域名一直 Pending | DNS 未生效或名称写错 | 用 dns.google 查，核对是相对名还是 FQDN |
| 提示“子域需要付费计划” | Cloudflare 限制子域 zone | 改用 FreeDNS 托管 |
| `/api/send` 返回 502 `send_failed` | Key 错 / 域名未验证 / From 域不匹配 | 重设 secret，确认 Resend 为 Verified |
| 前端 CORS 报错 | `ALLOWED_ORIGINS` 缺前端 origin | 补上后重新 `npm run deploy` |
| `/api/track` 返回 403 | 跨域白名单 | 同上 |
| 返回 429 | 当天配额用尽 | 调 `DAILY_SEND_LIMIT` 或次日再发 |
| 邮件进垃圾箱 | 域名声誉 | 见阶段 7 |

---

## 阶段 10 · 额度与安全

| 资源 | 免费额度（以官网为准） |
|---|---|
| Workers | 10 万请求 / 天 |
| D1 | 5 GB 存储，每日读 500 万行 / 写 10 万行 |
| Resend | 100 封 / 天，3000 封 / 月 |

安全红线：

- [ ] Resend Key 只建 **Sending** 权限，绝不写进前端代码
- [ ] 密钥只通过 `wrangler secret` 写入，不进仓库
- [ ] 本轮若用过 API Token，配置完立即在 Cloudflare 撤销
- [ ] 免费域名遵守 AUP，营销群发会被回收

---

## 阶段 11 · 回传清单（交给后续接手方）

- [ ] 实际拿到的域名
- [ ] Worker 部署后的 URL
- [ ] 阶段 5 测试发信的结果
- [ ] mail-tester 评分截图
