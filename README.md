# 安脑智联官网 · GitHub Pages 公开预览包

**首页视觉已确认采用 A：** [中文首页](https://hwang244.github.io/annaozhilian-website-preview/dark/index.html?v=approvedA1) · [English home](https://hwang244.github.io/annaozhilian-website-preview/dark/en/index.html?v=approvedA1) · [历史 A / B 对比](https://hwang244.github.io/annaozhilian-website-preview/experiments/brain-comparison/)

中文与英文深色首页默认加载约 **1.58 MB** 的 A 资源，默认静止、拖动旋转，可重置视角。
正文和原始静态图先显示，首次三维绘制后显示模型；加载失败时继续保留原图。
首页不显示评审切换栏。Cloudflare 正式站与 GitHub Pages 均使用该默认行为；
运行时资源位于 `dark/assets/brain3d/`，随正式构建完整发布。
[加载测量、网络情况和测试边界](experiments/brain-comparison/PERFORMANCE.md)。

本仓库只含静态预览文件：根目录版本选择页、`dark/` 深色首页及栏目页、`white/` 白色设计版。两版各有六个中文页面和对应六个英文页面。原始 Word 策划、研究摘录、构建脚本和未优化的 `pictures/` 图片不在发布包中。

`dark/` 当前设计：页眉使用官方 REHABILITATION 完整 Logo；中文版显示“安脑智联”，英文版显示“AnnoBrain”。首页、产品方案和技术平台统一深蓝与青色配色；其他栏目保留各自的首屏图片。首页 01 使用放大的居家康复场景图，03 使用三张训练场景图，04 展示五类健康商城商品与服务。首页和动态页的“前沿动态”一次展示一个全宽主题，左右箭头切换。页面采用自然纵向滚动。

前沿动态包含安脑智联企业文化文章及注明来源与日期的**行业选读**，两类内容按来源分别标识。“长征精神——路，在脚下延伸！”位于首页与动态页首位，文章链接为 `news.html?article=long-march`。人物与产品图片为场景概念示意。预约表单通过官网 `/api/demo` 接口写入 Cloudflare D1，返回成功后才展示预约编号。

英文公司全称统一为 **AnnoBrain Intelligence Technology (Shanghai) Co., Ltd.**。`annobrain.com` 是正式访问域名；GitHub Pages 地址仅用于设计预览。

技术平台的专家数字分身、数据安全模块采用提供的插图。产品页 `#hardware` 展示家庭康复陪伴机器人，05 `#marketplace` 展示智慧健康商城，介绍康复辅具、医用器材、护理耗材以及购买、租赁和上门服务。中英文、深浅主题统一以“手机视觉训练、康复机器人与智能设备协同”描述产品体系。图片为 WebP，按屏幕宽度选择尺寸并延迟加载；手机图片约 38–67 KB / 张，完整图片约 99–446 KB / 张。样式位于两版的 `platform-content.css`。
产品与技术详情模块统一复用 `split-content` 双栏布局：桌面文字在左、图片在右，插图采用一致的 16:9 展示区域；手机按文字、图片顺序排列。产品插图为静态展示，页脚五项导航在桌面横向均匀分布。
关于我们以创始人设计的吉祥物“安心”呈现品牌理念；`#team` 团队介绍紧随 `#mascot`，展示医学、算法与产品工程协同，以及人工智能、计算机视觉、大模型研发、游戏引擎架构四个方向。

GitHub Pages 配置：Settings → Pages → Deploy from a branch → `main` → `/(root)`。网站入口：`https://hwang244.github.io/annaozhilian-website-preview/`。

## Cloudflare Pages 正式站

阿里云保留 `annobrain.com` 的注册商管理；Cloudflare Pages 从本仓库 `main` 分支自动部署。Cloudflare 项目使用以下设置：

- Framework preset：`None`
- Build command：`node scripts/build-cloudflare.mjs`
- Build output directory：`dist`
- Root directory：仓库根目录（留空）

构建会把深色版发布到网站根目录，白色版放在 `/white/` 供预览。正式页移除设计预览专用的 `noindex` 标记并添加 canonical、站点地图；白色预览页仍保持 `noindex`。GitHub Pages 的版本选择页不受影响。预约接口由仓库根目录 `functions/api/demo.js` 提供，需绑定 D1 数据库，限流盐由服务端自动生成并保存在数据库中。静态页面和图片不计入 Functions 请求额度。

若需让 `annobrain.com` 和 `www.annobrain.com` 都通过 Cloudflare Pages 访问，先在 Cloudflare 添加该域名，再到阿里云把域名的权威 DNS 服务器改为 Cloudflare 分配的两条 NS；注册商仍为阿里云。以后迁到 VPS，只需把 Cloudflare 中的站点 DNS 记录改指 VPS，或把权威 DNS 改回阿里云并在阿里云创建 A/AAAA 记录。

技术平台配图统一为 16:9 WebP，手机端 800×450（每张约 48–55 KB），桌面端 1440×810（约 103–128 KB），首屏之后的配图以低优先级提前加载。可通过 `scripts/optimize-tech-images.mjs` 重新生成，需安装 Sharp，或用 `SHARP_MODULE_PATH` 指定已有 Sharp 模块。全站页头“预约演示”直达联系表单。

## 预约表单接收

- 正式接口：`POST https://annobrain.com/api/demo`。中英文、深浅主题以及 GitHub Pages 预览均使用该接口。
- D1 数据库：`annobrain-demo-requests`，Pages 生产环境绑定名 `DEMO_DB`，由 `wrangler.json` 随 Git 版本配置；Cloudflare 分支预览不绑定生产数据库。首次接收时自动以幂等语句初始化表；SQL 留存在 `migrations/0001_demo_requests.sql`，与 `server/demo-schema.mjs` 保持一致。
- 服务端自动生成限流盐，保存在私有 `demo_settings` 表中，前端与 Git 均不包含该值，无需再配置 API 密钥。
- 表单只收集预约联系信息，服务端验证字段和同意状态。只有数据库实际保存后返回成功；同一请求重试不重复保存，失败时保留填写内容。
- 支持官网、GitHub Pages 及本地 8770 预览的明确来源；原始 IP 不写入数据库，仅保存短期匿名限流计数。单一网络每十分钟最多 20 个新预约，不影响已保存预约的重试。
- 免费额度按 Cloudflare 平台统计：Workers 每日 100,000 请求，D1 每日 100,000 行写入（索引、限流计数等也会消耗写入，不能等同为 100,000 个预约）。
- 在 Cloudflare → Storage & databases → D1 → 该数据库 → Explore 查看 `demo_requests`，或在 Console 查询、导出数据。邮件由服务端 Secret `DEMO_NOTIFY_EMAIL` 指定接收地址，通过 `DEMO_MAILER` 服务绑定调用内部 Worker `annobrain-demo-mailer`，由 Cloudflare 原生邮件服务发送。收件地址已在 Cloudflare 验证；失败保留待发送状态，并在后续提交时重试（目前没有独立定时重试）；数据保存不依赖邮件。`notification_state=sent` 仅表示 Cloudflare 接受发送，不代表收件箱实际送达。
- 添加或更新生产环境的邮箱 Secret 后，重新部署生产版本，让运行中的预约接口使用新配置。
- 后端校验和真实 SQLite 持久化测试：`node --test tests/demo.test.mjs`。

## Cloudflare 预约邮件 Worker

- 源码：`workers/demo-mailer/index.mjs`。独立 Worker `annobrain-demo-mailer`，使用 `EMAIL` 类型为 `send_email` 的绑定；在 Cloudflare Dashboard 编辑部署。
- `workers.dev` 生产 URL 和 Preview URLs 均关闭，不添加自定义域名或公开路由；仅由 Pages 的 Service binding 调用。
- Worker 私有运行时配置 `DEMO_NOTIFY_EMAIL` 与 Pages 同名 Secret 保持一致，代码拒绝向其他邮箱发送；不要把真实收件邮箱写入公开 Git。
- 发件人固定为 `notifications@annobrain.com`，域名通过 Email Routing 配置 MX、SPF、DKIM。仅发送至账号中已验证的公司收件地址，邮件发送免费；Worker 执行另受平台请求额度限制。
- Pages 的 `wrangler.json` 声明生产 `DEMO_MAILER` 服务绑定；preview 的 D1 和 Service bindings 为空，防止预览发送生产邮件。
- 客户填写的邮箱只用作 Reply-To；不自动向客户发送邮件。使用纯文本正文，避免用户输入被当作 HTML。
- 验证：`node --test tests/demo.test.mjs tests/demo-mailer.test.mjs`（Node 22+），再提交无客户信息的生产测试，并核对 D1 的通知状态及实际收件箱。
