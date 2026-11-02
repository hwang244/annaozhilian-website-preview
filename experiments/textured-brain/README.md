# 完整三维脑形 · 发光神经模型

预览：https://hwang244.github.io/annaozhilian-website-preview/experiments/textured-brain/

模型：[annobrain-neural-complete.glb](annobrain-neural-complete.glb)

当前版本使用双侧大脑半球、小脑和脑干的完整空间结构，替换此前按原图
前后拼合的曲面。可以拖动旋转、查看上下方向，或使用六个方向按钮。
默认静止，仅在操作及尺寸变化时绘制。原网站首页仍使用静态图。

## 结构与修复

基础结构来自 BodyParts3D，经 OrganUI 转换的 GLB：
https://github.com/organui/brain-3d/blob/main/public/models/brain.glb
（源 blob：744407ab0488d71b234a41bc26f9ab74eb867b00）。

各解剖结构保留共同坐标关系，仅作整体平移与等比缩放。将同一半球的
脑叶作体素并集，进行轻微闭运算、平滑并重建封闭表面，去除微小的离散
重建碎片。小脑和脑干分别重建。保留半球之间的纵裂及各部分的解剖关系。
基础外表面数据未包含全部深部组织；各半球在原皮质包络内增加保守的
内部支撑体积，避免脑叶之间形成贯穿空洞。该补足属于艺术推测，不能视为
数据集提供的独立组织分割，也不用于具体深部结构标注。

选项 2 在曲面重建后增加七轮 Taubin 平滑（λ=0.5、μ=-0.53），降低体素重建的
细碎起伏。降低凹陷遮蔽的强度，避免表面显得粗硬。

纹理使用内置 imagegen 工具，以原静态图为风格参考生成细密神经纤维材质，
源图为 1254×1254；分别烘焙为大脑 4096×2048、小脑 2048×1024、
脑干 1536×768 的材质图。更大的烘焙尺寸用于覆盖与采样，并非源图原生分辨率。
实际提示词、素材路径和生成模式见 [MATERIAL-PRODUCTION.md](MATERIAL-PRODUCTION.md)。三向混合
后烘焙到周期性球面贴图，接缝处拆分 UV 并使用重复采样；顶部和底部的
颜色场连续，避免旧版本侧面拉伸、上下交界折边与黑色贴图侧壁。
材质保留原图的自发光颜色，并加入根据实际曲面凹陷计算的轻微遮蔽，
让脑回凹凸在各个视角下更清楚。GLB 内嵌该材质和遮蔽顶点颜色。

这是按解剖来源制作的展示模型，未作独立专业解剖验证。参考图风格重新制作
为覆盖全表面的艺术材质，不再承诺初始角度逐像素一致；神经纤维和光点
不是实际测量的神经连接或脑活动。

## 署名和许可

BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.

官方数据：https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html

官方许可：https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html

许可全文：https://creativecommons.org/licenses/by/4.0/

原始上游修改说明见 [MODEL-ATTRIBUTION.md](MODEL-ATTRIBUTION.md)。本次新增
修改包括分组、体素并集、平滑、曲面重建、微小碎片清理、UV、贴图及材质。
数据提供者和上游作者不为本展示背书。原图权利归属不因纹理加工而改变。

Three.js 0.160.1 为 MIT 许可，见相邻 neural-brain/vendor/LICENSE.txt。

## 公开预览包

GLB 内嵌所有纹理，运行时依赖均随公开预览提供。构建脚本、旧投影试验和
中间贴图保存在本地工作目录，不在本次公开包中。
