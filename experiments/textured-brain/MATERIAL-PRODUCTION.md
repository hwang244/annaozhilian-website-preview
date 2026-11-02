# 选项 2 精细神经纤维材质记录

模式：内置 `image_gen.imagegen`，使用原静态图作为风格参考生成平面材质。
本次生成的是贴在真实三维曲面上的位图材质，不用于替代三维结构。

参考图：`../../dark/assets/brain-hero.webp`。

项目内保存：`assets/neural-microfibers-v2.png`（实际 1254×1254）。

工具原始输出文件名：`exec-107534ca-d536-471f-abef-a86f7878d577.png`（本地保留）。
公开模型已内嵌烘焙后的完整材质。

采用三向连续颜色场烘焙到球面 UV，皮质图集 4096×2048、小脑图集
2048×1024、脑干图集 1536×768，并将极点颜色收敛。烘焙尺寸不代表
生成源图的原生清晰度。所有图集内嵌到 `annobrain-neural-complete.glb`。

完整实际提示词：

```text
Use case: stylized-concept. Asset type: seamless high-resolution emissive color texture for a premium 3D brain model, not a picture of a brain. Input image is a STYLE AND MATERIAL REFERENCE ONLY: the original luminous blue neural brain. Generate ONE square 2048x2048 or higher highly detailed continuous texture swatch that can be tiled over the surface of an existing anatomical mesh. Fill the entire square edge to edge with exquisite extremely thin flowing luminous blue neural microfibers, layered silky sapphire strands, delicate pale-cyan filaments, tiny pinpoint white and cyan synaptic lights, and very occasional warm-white microscopic points. The reference's subtle translucency, layered hair-fine curved strands and dark cobalt depth are essential. These fibers should be about hairline thickness relative to the image, densely layered but clearly separated, primarily smooth flowing sinuous bundles with varied gentle directions, a sophisticated photorealistic fiber-optic material. Contrast: 85% deep midnight/cobalt, 12% delicate blue filaments, 3% restrained bright cyan/white pinpoints. Keep the larger scale tone uniform and dark blue so 3D geometry remains readable. There must be NO brain silhouette, NO anatomical lobes, NO large gyri or closed doughnut loops or macro blobs in the texture itself: shape is supplied by the real 3D mesh. No coarse painted streaks, no thick glowing ropes, no chunky marble, no mottled stone, no grid, no scan lines, no polygon wireframe, no circuitry, no text, no UI, no labels, no borders, no logo, no watermark. Flat head-on texture swatch with no perspective and no directional cast shadow; luminous appearance baked into the fibers. Opposite edges should match seamlessly; keep scale and brightness consistent at all edges. Professional medical-technology material quality. The final should look close-up enough to reveal thousands of delicate strands and tiny points, rather than sparse graphic outlines.
```
