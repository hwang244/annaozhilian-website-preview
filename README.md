# 安脑智联官网 · GitHub Pages 公开预览包

**首页视觉已确认采用 A：** [中文首页](https://hwang244.github.io/annaozhilian-website-preview/dark/index.html?v=approvedA1) · [English home](https://hwang244.github.io/annaozhilian-website-preview/dark/en/index.html?v=approvedA1) · [历史 A / B 对比](https://hwang244.github.io/annaozhilian-website-preview/experiments/brain-comparison/)

中文与英文深色首页默认加载约 **1.58 MB** 的 A 资源，默认静止、拖动旋转，可重置视角。
正文和原始静态图先显示，首次三维绘制后显示模型；加载失败时继续保留原图。
首页不显示评审切换栏。Cloudflare 正式站与 GitHub Pages 均使用该默认行为；
运行时资源位于 `dark/assets/brain3d/`，随正式构建完整发布。
[加载测量、网络情况和测试边界](experiments/brain-comparison/PERFORMANCE.md)。

本仓库只含静态预览文件：根目录版本选择页、`dark/` 深色首页及栏目页、`white/` 白色设计版。两版各有六个中文页面和对应六个英文页面。原始 Word 策划、研究摘录、构建脚本和未优化的 `pictures/` 图片不在发布包中。

`dark/` 当前设计：页眉使用官方 REHABILITATION 完整 Logo；中文版显示“安脑智联”，英文版显示“AnnoBrain”。首页、产品方案和技术平台统一深蓝与青色配色；其他栏目保留各自的首屏图片。首页 01 使用放大的居家康复场景图，03 使用三张训练场景图，04 展示五类健康商城商品与服务。首页和动态页的“前沿动态”一次展示一个全宽主题，左右箭头切换。页面采用自然纵向滚动。

前沿动态包含安脑智联企业文化文章及注明来源与日期的**行业选读**，两类内容按来源分别标识。“长征精神——路，在脚下延伸！”位于首页与动态页首位，文章链接为 `news.html?article=long-march`。人物与产品图片为场景概念示意。预约表单仅在浏览器中生成预览摘要，不向服务器发送或保存。

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

构建会把深色版发布到网站根目录，白色版放在 `/white/` 供预览。正式页移除设计预览专用的 `noindex` 标记并添加 canonical、站点地图；白色预览页仍保持 `noindex`。GitHub Pages 的版本选择页不受影响。尚未配置真实后端，预约演示表单只在浏览器内生成摘要，不会发送给公司。

若需让 `annobrain.com` 和 `www.annobrain.com` 都通过 Cloudflare Pages 访问，先在 Cloudflare 添加该域名，再到阿里云把域名的权威 DNS 服务器改为 Cloudflare 分配的两条 NS；注册商仍为阿里云。以后迁到 VPS，只需把 Cloudflare 中的站点 DNS 记录改指 VPS，或把权威 DNS 改回阿里云并在阿里云创建 A/AAAA 记录。

技术平台配图统一为 16:9 WebP，手机端 800×450（每张约 48–55 KB），桌面端 1440×810（约 103–128 KB），首屏之后的配图以低优先级提前加载。可通过 `scripts/optimize-tech-images.mjs` 重新生成，需安装 Sharp，或用 `SHARP_MODULE_PATH` 指定已有 Sharp 模块。全站页头“预约演示”直达联系表单。
