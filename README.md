# 安脑智联官网 · GitHub Pages 公开预览包

本仓库只含静态预览文件：根目录版本选择页、`dark/` 深色首页及栏目页、`white/` 白色设计版。两版各有六个中文页面和对应六个英文页面。原始 Word 策划、研究摘录、构建脚本和未优化的 `pictures/` 图片不在发布包中。

`dark/` 当前设计：左上角图形 Logo 与“安脑智联”中文名称；产品、技术、动态、关于与联系栏目分别使用同系但不同的整页配色和首屏图片；首页 01 使用放大的居家康复场景图，03 使用三张训练场景图，04 展示五类健康商城商品与服务。首页和动态页的“前沿动态”一次展示一个全宽主题，左右箭头切换。

动态内容是注明来源与日期的**行业选读**，不是安脑智联公众号文章或公司新闻。人物与产品图片为场景概念示意。预约表单仅在浏览器中生成预览摘要，不向服务器发送或保存。

英文公司全称统一为 **AnnoBrain Intelligence Technology (Shanghai) Co., Ltd.**。`annobrain.com` 为推荐域名；此 GitHub Pages 地址仅用于设计预览。

GitHub Pages 配置：Settings → Pages → Deploy from a branch → `main` → `/(root)`。网站入口：`https://hwang244.github.io/annaozhilian-website-preview/`。

## Cloudflare Pages 正式站

阿里云保留 `annobrain.com` 的注册商管理；Cloudflare Pages 从本仓库 `main` 分支自动部署。Cloudflare 项目使用以下设置：

- Framework preset：`None`
- Build command：`node scripts/build-cloudflare.mjs`
- Build output directory：`dist`
- Root directory：仓库根目录（留空）

构建会把深色版发布到网站根目录，白色版放在 `/white/` 供预览。正式页移除设计预览专用的 `noindex` 标记并添加 canonical、站点地图；白色预览页仍保持 `noindex`。GitHub Pages 的版本选择页不受影响。尚未配置真实后端，预约演示表单只在浏览器内生成摘要，不会发送给公司。

若需让 `annobrain.com` 和 `www.annobrain.com` 都通过 Cloudflare Pages 访问，先在 Cloudflare 添加该域名，再到阿里云把域名的权威 DNS 服务器改为 Cloudflare 分配的两条 NS；注册商仍为阿里云。以后迁到 VPS，只需把 Cloudflare 中的站点 DNS 记录改指 VPS，或把权威 DNS 改回阿里云并在阿里云创建 A/AAAA 记录。
