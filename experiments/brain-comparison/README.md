# A / B 大脑模型对比

公开预览：https://hwang244.github.io/annaozhilian-website-preview/experiments/brain-comparison/

首页：[A / 选项 1](https://hwang244.github.io/annaozhilian-website-preview/dark/index.html?brain=a) · [B / 选项 2](https://hwang244.github.io/annaozhilian-website-preview/dark/index.html?brain=b)

- **A / 选项 1**：保留用户截图对应的发光线条版本。`option-a/` 保存
  `../neural-brain/` 的模型数据、着色器、材质和后处理；只增加对比页所需的
  视角同步、俯仰控制与自适应取景，原有独立实验页保持不变。
- **B / 选项 2**：使用 `../textured-brain/` 的完整模型，增加七轮表面平滑，
  换用参照最初静态图制作的细密发光纤维材质，减弱凹陷遮蔽。

两个模型默认静止，操作时才绘制。支持同步拖动、共同切换六个视角、
关闭同步后分别旋转，以及打开最初静态图作参考。桌面并排，手机纵向排列。

GitHub Pages 提供两个完整首页入口和并排对比入口。默认首页保持静态原图，
3D 首页先显示原图，首次三维绘制完成后切换模型。
模型加载数据记录在页面 DOM 中；首页链接追加 `&metrics=1` 可查看本次加载计时。

模型来源与许可见 [B 版模型说明](../textured-brain/README.md) 和
[A 版许可说明](../neural-brain/NOTICE.md)。材质生成记录见
[MATERIAL-PRODUCTION.md](../textured-brain/MATERIAL-PRODUCTION.md)。
