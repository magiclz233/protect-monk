# AI 美术音效资源生成清单（完整版）

> 生成日期：2026-07-07
> 基于原清单 + 代码实体配置 + 设计文档全面对照后重新整理
> 原清单已废弃，以此文档为准

---

## 使用说明

1. **不要一次把所有提示词发给 AI。** 按本文档顺序，一条提示词生成一批资源。
2. 第一批先生成小兵静态资源，用来确定整体风格；确认满意后，把小兵静态图作为「风格参考图」保存好。
3. 后续每次生成新资源时，都要上传或引用 1-3 张已满意的风格参考图，并追加风格锁定提示词。只写文字很容易跑风格。
4. 静态角色、道具、UI → 单张透明背景 PNG；多个同类资源 → 先生成 sheet 再裁成单张。
5. 动作动画/特效 → 横向透明 PNG sprite sheet（优先），或同一动作的编号透明 PNG 帧序列。
6. PNG 帧序列可以直接接入 Phaser，也可以后续用 Aseprite、TexturePacker 等工具拼成 sprite sheet。
7. 帧序列不是随意散图：每帧必须透明背景、等宽等高、角色脚底锚点稳定、大小稳定，帧号用两位数字。
8. 透明背景必须是真正的 alpha 透明通道；不要把灰白棋盘格、帧号、参考线或底座画进最终 PNG。
9. 背景图不需要透明背景。
10. 音效和 BGM 优先 WAV，44.1kHz，16-bit，后续统一转为 OGG；BGM 首尾需适合无缝循环。
11. 所有资源必须可商用；不要让 AI 模仿任何已有游戏、动画、电影或具体版权角色风格。

---

## 一、美术风格定义：扁平国潮风（Guochao Flat）

### 1.0 为什么选这个风格

| 维度 | 评价 | 说明 |
|------|------|------|
| AI 一致性 | ★★★ | 扁平矢量是最不容易跑偏的风格，几百张素材产出差异最小 |
| 微信包体 | ★★★ | 纯色块 PNG 压缩率极高，128×128 角色通常 3-8KB |
| 小屏可读 | ★★★ | 80×80 棋盘格只能靠轮廓+主色+标志物，扁平粗轮廓最优 |
| 西游适配 | ★★★ | 中式纹样（云纹/水纹/回纹）天然适合扁平化 |
| 免费素材 | ★★ | Kenney、itch.io 的扁平 UI 包可直接混搭 |

**一句话定义**：扁平矢量 + 中式纹样点缀 + 2 层 cel 明暗 + 粗轮廓线 + 高饱和配色，小尺寸靠轮廓和配色识别角色，不靠细节。

### 1.1 项目调色板（基于西游国风修正）

所有生成必须基于以下色板，保证素材与代码中的程序化绘制无缝衔接。

**调色板设计理念**：战斗/角色走京剧年画的高对比路线（保证80×80可读），关卡/地图走唐三彩的暖调路线（营造取经氛围）。两条路线共用色板、按场景调整冷暖占比。

```text
═══════════════════════════════════════════
       守护唐僧 · 国风调色板（扁平国潮）
═══════════════════════════════════════════

▎ 主色系（战斗/角色/特效 — 高对比京剧路线）
───────────────────────────────────────────
  鎏金    #f0c15a  (240,193,90)   边框/光效/法宝/CORE英雄
  朱砂    #c43d30  (196,61,48)    袈裟/火焰/攻击按钮/暴击
  绛红    #8b1a1a  (139,26,26)    受伤/暗部/BOSS/敌方强调
  翠绿    #5bc48a  (91,196,138)   高亮特效/治疗辉光/道法
  石绿    #2ea07a  (46,160,122)   自然/治疗/水纹/道法本体

▎ 辅色系
───────────────────────────────────────────
  暖灰    #c4bbb0  (196,187,176)  普通英雄边框/金属铠甲/银器
  赭石    #8b5a3c  (139,90,60)    武器木柄/山石/暗部/土系
  宣纸    #fff1c9  (255,241,201)  亮部/高光/文字底色/卷轴

▎ 阵营色系
───────────────────────────────────────────
  师徒金红  #f0c15a + #c43d30    孙悟空/猪八戒/沙悟净/白龙马
  仙佛蓝白  #4a90b8 + #c4bbb0    观音/二郎神/哪吒/太上老君/托塔天王
  妖王紫黑  #4a1a5e + #8b1a1a    牛魔王/红孩儿/黑熊精/白骨夫人/蜘蛛精

▎ 背景色系（关卡/地图 — 暖调唐三彩路线）
───────────────────────────────────────────
  玄青    #1a1814  (26,24,20)     场景暗部/山体阴影（暖黑）
  墨蓝    #101826  (16,24,38)     UI底色保留（纯冷黑高对比度）
  土金    #c9a44a  (201,164,74)   关卡节点/标题装饰/佛光底座
  沙色    #d4b896  (212,184,150)  沙漠/岩石/路径底色/土路

▎ 阶级色（不变，来自 VisualConfig.ts）
───────────────────────────────────────────
  白阶  #f4f6f8 → 绿阶 #6ee887 → 蓝阶 #6fa5ff → 紫阶 #d783ff → 金阶 #ffbf47
```

### 1.2 角色比例与造型规范

```text
头身比：Q版 2~2.5 头身（头:身 ≈ 1:1.2~1.5）
眼睛：大而有神，黑色圆点或简单椭圆，不要复杂瞳孔高光
头部：圆润饱满，占身体 40-45%
身体：短小敦实，四肢粗短
轮廓：3-4px 粗描边，颜色比填充深 2 档
阴影：单层 cel shading（亮面 100% + 暗面 75%），不要渐变/多层阴影
高光：仅核心英雄/BOSS 有一层简单白色高光点
```

### 1.3 中式纹样装饰规范

每个角色/元素至少包含一个中式识别元素，但不要过度装饰：

```text
云纹  — 神仙/法术/光环    （简单3瓣卷云，不放太多）
水纹  — 沙悟净/水妖/龙族   （平行波浪线，2-3层即可）
火焰纹 — 红孩儿/火妖/攻击    （锯齿火焰轮廓，3-5个火舌）
回纹  — UI边框/卡牌框       （直角回转线条）
莲花  — 观音/治疗/佛系      （5-7瓣简单莲花）
龙鳞  — 白龙马/龙族/BOSS    （交错弧线，小面积使用）
```

### 1.4 阶级/稀有度视觉层级

| 阶级 | 边框颜色 | 特效 | 适用 |
|------|---------|------|------|
| 白（1阶） | 浅灰 #f4f6f8 | 无 | 小兵1阶 |
| 绿（2阶） | 翠绿 #6ee887 | 微弱辉光 | 小兵2阶 |
| 蓝（3阶） | 宝蓝 #6fa5ff | 淡蓝辉光 | 小兵3阶 |
| 紫（4阶） | 紫罗兰 #d783ff | 紫色辉光 | 小兵4阶 |
| 橙/金（5阶） | 金色 #ffbf47 | 金色辉光 | 小兵5阶 / 核心英雄 / 法宝 |

### 1.5 英文 Prompt 关键词（跨模型通用）

给 Midjourney / ComfyUI / SDXL 等工具使用，中文 AI（即梦等）参考中文提示词：

```text
# 角色生成核心关键词（保持这组不变）
flat vector illustration, chibi character, clean bold outlines 3px,
2-tone cel shading, vibrant high-contrast colors,
Chinese mythology, Journey to the West theme,
45-degree isometric game view, mobile game sprite,
transparent background, isolated on white,
no gradient, no texture, no complex background, no text, no watermark

# 可替换部分（按角色调整）
[角色描述: monkey warrior with golden staff, red and gold armor],
[动作: idle standing pose / attack swinging motion / etc]
```

---

## 二、统一生成规则

### 2.1 可复制提示词流程

不要把整份文档一次发给 AI。实际生成时，先发「第一句」建立全局风格，再每次只复制一个具体资源提示词。AI 出错时，不要重发长提示词，只发纠错提示词让它重做。

**第一句，用来建立风格：**

```text
我在为一款《守护唐僧》Q版西游合成塔防微信小游戏生成可商用2D游戏素材。

美术风格：扁平国潮风（Guochao Flat）—— 扁平矢量 + 中式纹样点缀 + 2层cel明暗 + 3-4px粗轮廓线 + 高饱和配色。
角色比例：Q版2~2.5头身，头大身小，四肢粗短，圆润可爱。
光影：单层cel shading，亮面100%+暗面75%，不要渐变过渡，不要厚涂。
线条：粗轮廓描边，比填充色深2档，小尺寸下轮廓必须清晰可读。
视角：轻微45度俯视棋盘视角，适合80×80或96×96棋盘格。
配色：基于项目调色板（金#f0c15a / 朱红#b83f35 / 青绿#35b58f / 墨蓝#101826），配色鲜明高对比。
纹样：可加简化的中式云纹、水纹、火焰纹、回纹、莲花纹点缀，但不过度装饰。

输出：透明背景PNG（真alpha通道），无文字，无水印，无灰白棋盘格。
绝对禁止：写实/3D/厚涂/渐变/像素风/剪纸/皮影/欧美魔幻/日本动画风，不模仿任何已有游戏、动画、电影或版权角色。
```

**后续每次生成新资源时，先追加这一句：**

```text
请严格保持我上传的参考图风格：
- 相同的扁平国潮风（flat vector + cel shading + 粗轮廓）
- 相同的Q版2~2.5头身比和身体比例
- 相同的线条粗细（3-4px）和描边方式
- 相同的配色饱和度和2层明暗对比
- 相同的45度棋盘视角和角色朝向
- 相同的透明背景

新角色只能改变身份、武器、颜色和动作，不要改变整体画风。
```

**风格锁定提示词（已有满意参考图之后使用）：**

```text
以下图片是已经确认通过的项目风格参考。请把它们当作唯一风格标准，不要重新发明画风。

必须保持：
1. 扁平国潮风：flat vector + 2-tone cel shading，不要渐变，不要厚涂。
2. Q版2~2.5头身比，头大身小，四肢粗短。
3. 3-4px 粗轮廓描边，线条干净利落。
4. 配色基于项目调色板：金#f0c15a / 朱红#b83f35 / 青绿#35b58f / 墨蓝#101826。
5. 中式纹样适度点缀（云纹/水纹/火焰纹/回纹），不堆砌。
6. 45度俯视棋盘视角，80×80或96×96棋盘格下轮廓清晰可读。
7. 透明背景，真alpha通道。

允许改变：
角色身份、武器、服装元素、主色、动作阶段、攻击特效。

禁止改变：
不要变成像素风、厚涂、写实、3D、欧美魔幻、现代卡通、日本动画风、
过度复杂细节、过暗配色、不同镜头角度、剪纸风格、皮影戏风格、扁平剪影、
轮廓过细（<2px）、过度圆润立体（Pixar/迪士尼风格）、水墨渲染。
```

### 2.2 图片通用提示词

**正向提示词（中文 AI 工具使用）：**

```text
为一款《守护唐僧》西游题材Q版合成塔防微信小游戏生成正式美术资源。

美术风格：扁平国潮风。具体特征：
- 扁平矢量感，2层cel shading明暗（亮面+暗面，无渐变过渡）
- 3-4px 粗轮廓描边，线条干净有力
- Q版2~2.5头身，头大身小，四肢粗短圆润
- 配色高饱和高对比，基于项目调色板（金#f0c15a、朱红#b83f35、青绿#35b58f、墨蓝#101826）
- 适度点缀中式纹样（简化的云纹、水纹、火焰纹、回纹、莲花纹），不过度装饰
- 轻微45度俯视棋盘视角，适合80×80或96×96棋盘格显示
- 画面为2D sprite，美术风格统一

输出格式：单体静态资源输出单张透明背景PNG；多个静态资源输出等格sheet后裁切；
动作和特效优先输出横向PNG sprite sheet；如果工具无法输出一张sheet，则输出同一动作或特效的编号透明PNG帧序列。

绝对禁止：不要写实，不要3D，不要厚涂，不要渐变过渡，不要复杂背景，不要文字，不要水印，
不要logo，不要模仿任何已有游戏、动画、电影或版权角色风格。
```

**正向提示词（英文 AI 工具使用，Midjourney/ComfyUI/SDXL）：**

```text
A game sprite for a Chinese mythology Journey to the West mobile tower defense game.

Art style: flat vector guochao illustration, chibi character 2-2.5 heads tall,
big head small body, stubby limbs, round and cute.
Clean bold outlines 3-4px, 2-tone cel shading only (bright side + shadow side, no gradient),
vibrant high-contrast colors based on palette: gold #f0c15a, cinnabar red #b83f35,
jade green #35b58f, ink blue #101826.
Minimal Chinese ornament motifs (simple cloud patterns, wave lines, flame shapes, fret borders).
45-degree isometric board game view, designed for 80x80 or 96x96 grid readability.
Transparent PNG background, true alpha channel.
No text, no watermark, no complex background, no gradient shading, no 3D rendering,
no Pixar style, no anime style, no pixel art, no paper-cut style.
```

**反向提示词（中英文通用）：**

```text
写实照片, 3D渲染, 厚涂, 渐变过渡, 复杂背景, 灰白棋盘格背景,
文字, 水印, logo, 模糊, 低清晰度, 恐怖血腥, 过多细节, 暗色过重,
版权角色, 已有游戏角色风格, 动画截图, 电影截图,
像素风, 赛博朋克, 欧美魔幻, 现代服装,
剪纸风格, 皮影戏风格, 扁平剪影, 纸片人, 轮廓过于生硬,
水墨画风, 水墨晕染, 素描, 油画, 水彩,
Pixar style, Disney style, anime style, manga style,
soft shading, smooth gradient, realistic lighting, detailed texture,
thin outline, no outline, photorealistic, hyperdetailed, cinematic lighting
```

### 2.3 音频通用提示词

```text
为一款 Q 版西游合成塔防微信小游戏生成音频资源。整体听感轻快、国风、可爱但有战斗节奏，适合手机外放，小音量也清楚。使用中国传统乐器元素，如笛子、琵琶、古筝、鼓、锣、木鱼、铃铛，但不要刺耳。音效短促干净，不要人声台词，不要版权旋律，不要模仿任何已有游戏、动画、电影音乐。输出无缝或干净结尾的 WAV 音频。
```

### 2.4 资源类型速查表

| 类型    | 让 AI 生成什么                              | 不要生成什么                        | 推荐原始格式                     | 最终放入项目格式                            |
| ----- | -------------------------------------- | ----------------------------- | -------------------------- | ----------------------------------- |
| 静态角色  | 单张透明背景角色图，或静态 sheet 后手动切成单张 PNG        | 视频、GIF、带背景海报                  | PNG                        | 单张 PNG                              |
| 动作动画  | 横向透明 PNG sprite sheet，或同一动作的透明 PNG 帧序列 | MP4、MOV、GIF、整段视频、不同尺寸散图、带背景散图 | PNG sprite sheet / PNG 帧序列 | 一张 PNG sprite sheet，或一组按编号命名的 PNG 帧 |
| 道具图标  | 透明背景图标 sheet 或单图                       | 带文字图标、带背景海报                   | PNG                        | PNG                                 |
| UI 组件 | 透明背景 UI 组件 sheet 或单图                   | 带中文文字的完整截图                    | PNG                        | PNG                                 |
| 背景图   | 竖屏完整背景图                                | 透明小图、视频背景                     | PNG/JPG                    | PNG/JPG                             |
| 战斗特效  | 横向透明 PNG sprite sheet，或同一特效的透明 PNG 帧序列 | 视频特效、黑底素材、不同尺寸散图、带背景散图        | PNG sprite sheet / PNG 帧序列 | 一张 PNG sprite sheet，或一组按编号命名的 PNG 帧 |
| 音效    | 短音频，例如点击、攻击、升级                         | 视频、带人声台词、长音乐                  | WAV                        | OGG/MP3                             |
| BGM   | 可循环背景音乐                                | 视频、带人声歌曲、版权旋律                 | WAV                        | OGG/MP3                             |

### 2.5 动作动画与帧序列格式要求

所有 `idle`、`move`、`attack`、`hit`、`death`、`skill`、`spawn` 都按下面格式生成：

```text
优先输出横向 sprite sheet，透明背景，最终是一张 PNG 图片，所有帧等宽等高，从左到右依次排列。若工具无法输出一张 sheet，可以输出同一动作的多张透明 PNG 单帧图，帧号从 01 开始连续编号。角色脚底位置稳定，角色大小稳定，不要镜头运动，不要背景，不要视频，不要 GIF，不要 MP4，不要把灰白棋盘格、帧号或文字画进图片。
```

**帧序列命名规则：**

```text
4 帧 idle：xxx_idle_01.png、xxx_idle_02.png、xxx_idle_03.png、xxx_idle_04.png
6 帧 attack：xxx_attack_01.png 到 xxx_attack_06.png
8 帧 BOSS attack：xxx_attack_01.png 到 xxx_attack_08.png
```

**帧序列接入要求：**

```text
同一个动作的所有帧必须在同一目录下，文件名只允许帧号不同。每张图片的像素尺寸必须完全一致。透明区域也算尺寸，不能裁成每帧不同外框。角色或特效的中心点、脚底点要稳定，否则播放时会抖动。
```

**推荐帧数与尺寸：**

| 类型 | idle | move | attack | hit | death | skill/spawn | 帧尺寸 |
|------|------|------|--------|-----|-------|-------------|--------|
| 小兵 | 4帧 | — | 6帧 | — | — | — | 80×80 |
| 普通敌人 | — | 6帧 | — | 4帧 | 6帧 | — | 80×80 |
| 精英敌人 | 4帧 | 6帧 | 6帧 | 4帧 | 6帧 | — | 96×96 |
| BOSS | 4帧 | 6帧 | 8帧 | 4帧 | 8帧 | 8帧(spawn) | 128×128 |
| 英雄 | 4帧 | — | 6帧 | 4帧 | 6帧 | 6帧(skill) | 96×96 |
| 唐僧 | 4帧 | — | — | 4帧 | 6帧 | — | 96×96 |
| 投射物 | — | — | — | — | — | 4帧 | 64×64 |
| 命中特效 | — | — | — | — | — | 6帧 | 96×96 |
| AOE特效 | — | — | — | — | — | 6帧 | 128×128 |
| 环境特效 | — | — | — | — | — | 6~8帧 | 128×128 |

**sprite sheet 整图尺寸计算速查：**

```text
4 帧小兵 idle：每帧 80×80，整张 320×80
6 帧小兵 attack：每帧 80×80，整张 480×80
4 帧英雄 idle：每帧 96×96，整张 384×96
6 帧英雄 attack：每帧 96×96，整张 576×96
6 帧普通敌人 move/death：每帧 80×80，整张 480×80
4 帧精英 idle/hit：每帧 96×96，整张 384×96
8 帧 BOSS attack/death：每帧 128×128，整张 1024×128
6 帧环境特效：每帧 128×128，整张 768×128
4 帧投射物：每帧 64×64，整张 256×64
6 帧 AOE 特效：每帧 128×128，整张 768×128
```

> 如果使用 PNG 帧序列，则不需要整图尺寸，只需要保证每张单帧图片就是对应的每帧尺寸。

### 2.6 静态 sheet 与切图要求

静态角色、道具、UI 如果一次生成多个，按下面格式生成：

```text
静态资源 sheet，透明背景，每个格子等宽等高，每个角色或图标完整居中，格子之间不要重叠，不要加文字、编号、背景、水印。生成后需要裁剪成单张 PNG 放入项目。
```

**常用静态 sheet 尺寸：**

```text
4 行 5 列小兵静态：每格 80×80，整张 400×320，最终裁成 20 张单图
7 个英雄静态横排：每格 96×96，整张 672×96，最终裁成 7 张单图
14 个英雄碎片横排：每格 96×96，整张 1344×96，最终裁成 14 张单图
10 个普通敌人横排：每格 80×80，整张 800×80，最终裁成 10 张单图
7 个 BOSS 横排：每格 128×128，整张 896×128，最终裁成 7 张单图
5 个道具图标横排：每格 128×128，整张 640×128，最终裁成 5 张单图
12 个法宝图标横排：每格 128×128，整张 1536×128，最终裁成 12 张单图
8 个 UI 图标横排：每格 64×64，整张 512×64，最终裁成 8 张单图
10 个段位徽章横排：每格 96×96，整张 960×96，最终裁成 10 张单图
```

### 2.7 纠错提示词

**格式纠错（尺寸/帧数/背景不对时使用）：**

```text
这张不合格。请重新生成同一个资源，只修正这些问题：
1. 必须是一张横向连续【帧数】帧 PNG sprite sheet。
2. 每帧必须是【帧宽】x【帧高】，整张必须是【整图宽】x【整图高】。
3. 必须是真透明背景，不要灰白棋盘格。
4. 不要把编号、文字、水印、参考线或底座画进图片。
5. 每帧角色大小一致，脚底位置保持一致，播放时不能抖动。
```

**风格纠错（画风不一致时使用）：**

```text
这张不合格，主要问题是风格和参考图不一致。请不要改变画风，重新生成同一个资源。

只允许保留这次的角色主题和动作需求，其他全部向参考图靠齐：
1. 线条粗细要和参考图一致，不要更细或更粗。
2. 头身比和Q版比例要和参考图一致，不要变高、变写实或变幼儿卡通。
3. 颜色饱和度和明暗对比要和参考图一致，不要变灰、变暗或变厚涂。
4. 视角和朝向要和参考图一致，保持轻微45度俯视棋盘视角。
5. 细节密度要和参考图一致，不要增加过多装饰。
6. 背景必须是真透明，不要灰白棋盘格、文字、编号、水印。
```

**降级生成（连续两次跑风格时使用）：**

```text
先不要生成完整动作。请只生成这个角色的单帧静态站立图，用来对齐参考图风格。
透明背景，尺寸【80x80/96x96/128x128】。
只要风格和参考图一致，暂时不要攻击动作、特效和复杂姿势。
```

**尺寸修正（帧排列对但尺寸不对时使用）：**

```text
这张图的帧排列方向对了，但尺寸不合格。请重新输出为标准横条 sprite sheet：每帧【帧宽】x【帧高】，共【帧数】帧，整张【整图宽】x【整图高】，不要额外留白，不要边框，不要编号。
```

### 2.8 通用模板

**静态 sheet 模板：**

```text
请生成【资源名称】静态资源。

输出格式：
透明背景 PNG。若一次生成多个角色或图标，请做成等格静态 sheet。
每格【格子宽】x【格子高】，角色或图标完整居中，格子之间不要重叠。

画面内容：
【写每个角色或图标的造型、颜色、武器、识别特征】。

风格要求：
扁平国潮风 — flat vector + 2-tone cel shading + 3-4px 粗轮廓 + 高饱和配色。
Q版2~2.5头身，头大身小，四肢粗短。
基于项目调色板（金/朱红/青绿/墨蓝）。
可加简化中式纹样点缀，不过度装饰。

关键要求：
风格统一，小尺寸可读。
不要背景，不要灰白棋盘格，不要文字，不要编号，不要水印。
```

**动作动画模板：**

```text
请生成【资源名称】【动作名】动作。

输出格式：
一张横向连续【帧数】帧 PNG sprite sheet。
每帧【帧宽】x【帧高】，整张最终尺寸【帧宽 x 帧数】x【帧高】。
透明背景，【帧数】帧从左到右依次排列。

画面内容：
【写角色、武器、动作过程、攻击拖尾或法术效果】。

风格要求：
保持扁平国潮风（flat vector + cel shading + 粗轮廓），
配色基于项目调色板，动作帧之间角色一致。

关键要求：
每帧角色大小一致，脚底位置稳定，播放时不能抖动。
不要背景，不要灰白棋盘格，不要编号文字，不要水印。
```

### 2.9 Phaser 帧序列接入示例

如果拿到的是多张 PNG 单帧图，不需要先合成 sprite sheet，也可以在 Phaser 中直接创建动画：

```ts
function preloadFrameSequence(scene: Phaser.Scene, baseKey: string, urlBase: string, frameCount: number): void {
  for (let index = 1; index <= frameCount; index += 1) {
    const frame = String(index).padStart(2, '0');
    scene.load.image(`${baseKey}_${frame}`, `${urlBase}_${frame}.png`);
  }
}

function createFrameSequenceAnim(scene: Phaser.Scene, key: string, frameCount: number, frameRate = 8, repeat = -1): void {
  scene.anims.create({
    key,
    frames: Array.from({ length: frameCount }, (_, index) => ({
      key: `${key}_${String(index + 1).padStart(2, '0')}`,
    })),
    frameRate,
    repeat,
  });
}

preloadFrameSequence(this, 'soldier_monkey_attack', '/assets/soldiers/soldier_monkey_attack', 6);
createFrameSequenceAnim(this, 'soldier_monkey_attack', 6, 10, 0);
this.add.sprite(x, y, 'soldier_monkey_attack_01').play('soldier_monkey_attack');
```

### 2.10 动作名对照表

```text
idle    待机
move    移动
attack  攻击
hit     受击
death   死亡
skill   技能
spawn   出场
```

---

## 三、目录与命名规范

```text
public/assets/soldiers/    小兵静态和动画
public/assets/heroes/      英雄静态、动画、碎片
public/assets/enemies/     敌人静态和动画
public/assets/items/       道具图标
public/assets/artifacts/   法宝图标
public/assets/ui/          UI 组件
public/assets/effects/     战斗特效
public/assets/audio/       音效和 BGM
```

### 文件命名规则

```text
小兵静态：soldier_{type}_rank_{rank}.png
小兵动画：soldier_{type}_{action}.png
小兵动画帧序列：soldier_{type}_{action}_{frame}.png

英雄静态：hero_{heroId}_stage_{stage}.png
英雄动画：hero_{heroId}_{action}.png
英雄动画帧序列：hero_{heroId}_{action}_{frame}.png
英雄碎片：shard_{heroId}.png

敌人静态：enemy_{enemyId}.png
敌人动画：enemy_{enemyId}_{action}.png
敌人动画帧序列：enemy_{enemyId}_{action}_{frame}.png

法宝图标：artifact_{artifactId}.png
道具图标：item_{itemId}.png

UI 资源：ui_{name}.png
特效资源：effect_{name}.png
特效帧序列：effect_{name}_{frame}.png
音频资源：{type}_{name}.ogg
```

`{frame}` 统一两位数字（01, 02, 03...），不要中文编号。

---

## 四、小兵资源（4 类 × 5 阶）

> **MVP 必做：全部**

### 3.1 小兵静态图（20 张）

生成一张 4 行 5 列静态 sheet，每格 80×80，整张 400×320，裁成 20 张单图。

**输出文件：**
```text
public/assets/soldiers/soldier_monkey_rank_1.png ~ rank_5.png
public/assets/soldiers/soldier_soldier_rank_1.png ~ rank_5.png
public/assets/soldiers/soldier_rider_rank_1.png ~ rank_5.png
public/assets/soldiers/soldier_archer_rank_1.png ~ rank_5.png
```

**提示词：**
```text
生成一张透明背景 2D 静态 sprite sheet，内容是《守护唐僧》Q版西游塔防小兵资源，4 行 5 列，共 20 个独立小兵。每个格子固定 80×80，整张 400×320，每个小兵完整居中，格子之间不要重叠。所有小兵风格统一，头大身小，轮廓清晰。第一行灵猴兵 1-5 阶：金黄/棕色，小猴战士，短棍，敏捷近战。第二行天兵甲士 1-5 阶：蓝/银色，天庭甲士，长枪圆盾。第三行妖王骑 1-5 阶：紫/朱红，骑兽妖兵，重斧，厚重群攻。第四行道法弓手 1-5 阶：青绿，道袍弓手，弓箭符咒，远程法术。阶级颜色 1-5 依次白/绿/蓝/紫/橙，阶级越高装饰越华丽。透明背景，无文字/编号/水印。
```

### 3.2 小兵动作动画（8 组 sprite sheet）

| 类型 | 动作 | 帧数 | 帧尺寸 | 整图尺寸 |
|------|------|------|--------|----------|
| monkey | idle | 4 | 80×80 | 320×80 |
| monkey | attack | 6 | 80×80 | 480×80 |
| soldier | idle | 4 | 80×80 | 320×80 |
| soldier | attack | 6 | 80×80 | 480×80 |
| rider | idle | 4 | 80×80 | 320×80 |
| rider | attack | 6 | 80×80 | 480×80 |
| archer | idle | 4 | 80×80 | 320×80 |
| archer | attack | 6 | 80×80 | 480×80 |

**提示词（以灵猴兵为例，其余类推）：**
```text
生成灵猴兵 Q版西游塔防小兵 idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 320×80。金黄/棕色猴族战士，手持短棍，轻微呼吸和待机晃动，角色位置稳定。无文字/水印。
```
```text
生成灵猴兵 Q版西游塔防小兵 attack 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 480×80。金黄/棕色猴族战士，挥舞短棍，蓄力→打出→收招，金色棍影拖尾，角色位置稳定。无文字/水印。
```

---

## 五、英雄资源（14 名）

> **MVP 必做：** 7 名 MVP 英雄的全部素材（阶段 1~3 静态 + idle/attack 动画 + 碎片）
> **MVP 可后补：** 扩展 7 名英雄的升级形态和动画

### 4.1 英雄静态图

#### 4.1.1 MVP 7 名 stage_1（7 张，MVP 必做）

生成一张 7 列横排静态 sheet，每格 96×96，整张 672×96，裁成 7 张。

**输出文件：**
```text
public/assets/heroes/hero_sunwukong_stage_1.png   孙悟空  CORE  师徒  金箍棒 近战爆发
public/assets/heroes/hero_zhubajie_stage_1.png    猪八戒  NORMAL 师徒  九齿钉耙 肉盾
public/assets/heroes/hero_shawujing_stage_1.png   沙悟净  NORMAL 师徒  月牙铲 控制
public/assets/heroes/hero_bailongma_stage_1.png   白龙马  NORMAL 师徒  龙形箭 穿透远程
public/assets/heroes/hero_guanyin_stage_1.png     观音菩萨 CORE  仙佛  莲花玉净瓶 治疗
public/assets/heroes/hero_honghaier_stage_1.png   红孩儿  CORE  妖王  火尖枪 火焰群攻
public/assets/heroes/hero_nezha_stage_1.png       哪吒    CORE  仙佛  风火轮火尖枪 多目标
```

**提示词：**
```text
生成一张透明背景 2D 静态 sprite sheet，7 个《守护唐僧》Q版西游 MVP 英雄横向排列。每格 96×96，整张 672×96，每个英雄完整居中，后续裁成单张。依次：孙悟空（猴王冠/金箍棒/金色光环，CORE）、猪八戒（大肚/九齿钉耙/坦克感，NORMAL）、沙悟净（蓝灰水纹/月牙铲/防御感，NORMAL）、白龙马（白龙马头/白色箭光/穿透远程，NORMAL）、观音（莲花/玉净瓶/青绿治疗光环，CORE）、红孩儿（火焰头发/火尖枪/红橙火圈，CORE）、哪吒（风火轮/火尖枪/红绫/多目标，CORE）。CORE 金红边框，NORMAL 青绿银边框。透明背景，无文字/水印。
```

#### 4.1.2 扩展 7 名 stage_1（7 张）

**输出文件：**
```text
public/assets/heroes/hero_niumowang_stage_1.png   牛魔王    CORE  妖王  牛角重甲 狂暴坦克
public/assets/heroes/hero_erlangshen_stage_1.png  二郎神    CORE  仙佛  天眼长枪 远程狙击
public/assets/heroes/hero_taishanglaojun_stage_1.png 太上老君 CORE 仙佛  丹炉道袍 持续灼烧
public/assets/heroes/hero_heixiongjing_stage_1.png 黑熊精  NORMAL 妖王  黑棕熊妖 物理肉盾
public/assets/heroes/hero_baigufuren_stage_1.png  白骨夫人  NORMAL 妖王  白骨轮廓 召唤输出
public/assets/heroes/hero_zhizhujing_stage_1.png  蜘蛛精    NORMAL 妖王  蛛网紫纹 范围减速
public/assets/heroes/hero_tuotatianwang_stage_1.png 托塔天王 NORMAL 仙佛 宝塔蓝金 群体控制
```

**提示词：**
```text
生成一张透明背景 2D 静态 sprite sheet，7 个《守护唐僧》Q版西游扩展英雄横向排列。每格 96×96，整张 672×96。依次：牛魔王（牛角/重甲/暗红金/狂暴坦克，CORE）、二郎神（天眼/长枪/蓝金/远程狙击，CORE）、太上老君（丹炉/道袍/紫金/持续灼烧，CORE）、黑熊精（黑棕熊/厚甲/物理肉盾，NORMAL）、白骨夫人（白骨轮廓/灰白紫/召唤输出，NORMAL）、蜘蛛精（蛛网纹/紫/范围减速，NORMAL）、托塔天王（宝塔/蓝金甲/群体控制，NORMAL）。保持与 MVP 英雄完全一致的风格。透明背景，无文字/水印。
```

### 4.2 英雄升级形态

#### 4.2.1 核心英雄升级形态（7名 × 3阶段 = 21张）

每名核心英雄有 stage_2（5-9级）、stage_3（10-14级）、stage_4（15级满级）。

**输出文件（仅列孙悟空示例，其余6名同理）：**
```text
public/assets/heroes/hero_sunwukong_stage_2.png
public/assets/heroes/hero_sunwukong_stage_3.png
public/assets/heroes/hero_sunwukong_stage_4.png
public/assets/heroes/hero_guanyin_stage_2.png ~ stage_4.png
public/assets/heroes/hero_niumowang_stage_2.png ~ stage_4.png
public/assets/heroes/hero_honghaier_stage_2.png ~ stage_4.png
public/assets/heroes/hero_erlangshen_stage_2.png ~ stage_4.png
public/assets/heroes/hero_nezha_stage_2.png ~ stage_4.png
public/assets/heroes/hero_taishanglaojun_stage_2.png ~ stage_4.png
```

**提示词（孙悟空示例）：**
```text
基于孙悟空 stage_1 基础形态，生成升级形态静态 sheet，3 个形态横向排列，透明背景。每格 96×96，整张 288×96。stage_2（5-9级）：金箍棒更亮，金色边框更明显。stage_3（10-14级）：增加猴王冠装饰和金色爆发光。stage_4（15级满级）：金红光环最强，武器拖尾更明显。保持原角色比例、线条和色彩一致。无文字/水印。
```

#### 4.2.2 普通英雄升级形态（7名 × 2阶段 = 14张）

每名普通英雄有 stage_2（5-9级）、stage_3（10级满级）。

**输出文件（仅列猪八戒示例，其余6名同理）：**
```text
public/assets/heroes/hero_zhubajie_stage_2.png ~ stage_3.png
public/assets/heroes/hero_shawujing_stage_2.png ~ stage_3.png
public/assets/heroes/hero_bailongma_stage_2.png ~ stage_3.png
public/assets/heroes/hero_heixiongjing_stage_2.png ~ stage_3.png
public/assets/heroes/hero_baigufuren_stage_2.png ~ stage_3.png
public/assets/heroes/hero_zhizhujing_stage_2.png ~ stage_3.png
public/assets/heroes/hero_tuotatianwang_stage_2.png ~ stage_3.png
```

**提示词（猪八戒示例）：**
```text
基于猪八戒 stage_1 基础形态，生成升级形态静态 sheet，2 个形态横向排列，透明背景。每格 96×96，整张 192×96。stage_2（5-9级）：九齿钉耙更亮，护甲更厚。stage_3（10级满级）：银青边框更明显，坦克感更强。保持原角色一致。无文字/水印。
```

### 4.3 英雄动作动画

#### 4.3.1 全部英雄 idle + attack（14名 × 2 = 28组）

所有 14 名英雄都需要 idle（4帧）和 attack（6帧），每帧 96×96。

**输出文件：**
```text
public/assets/heroes/hero_{heroId}_idle.png    (14个)
public/assets/heroes/hero_{heroId}_attack.png  (14个)
```

**提示词（孙悟空示例，其余类推）：**
```text
生成孙悟空 Q版西游塔防英雄 idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。猴王冠，金箍棒，金色微光环，英武待机姿态。角色位置稳定。无文字/水印。
```
```text
生成孙悟空 Q版西游塔防英雄 attack 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。从蓄力→挥舞金箍棒→收招，金色拖尾，近战爆发感。角色位置稳定。无文字/水印。
```

#### 4.3.2 英雄 hit 动画（14组）

所有英雄受击时播放，4帧，每帧 96×96。

**输出文件：**
```text
public/assets/heroes/hero_{heroId}_hit.png  (14个)
```

**提示词：**
```text
生成【英雄名】Q版西游塔防英雄 hit 受击动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。角色受到攻击微微后仰、闪白或抖动感，脚底位置稳定不能移动。不能血腥。无文字/水印。
```

#### 4.3.3 英雄 death 动画（14组）

英雄死亡时播放，6帧，每帧 96×96。

**输出文件：**
```text
public/assets/heroes/hero_{heroId}_death.png  (14个)
```

**提示词：**
```text
生成【英雄名】Q版西游塔防英雄 death 死亡动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。角色被击败→跪倒→化为金色/对应颜色光粒消散，不能血腥。角色位置稳定。无文字/水印。
```

#### 4.3.4 英雄 skill 动画（5组）

以下英雄有主动技能，需要技能动画：

| 英雄 | 技能 | 描述 |
|------|------|------|
| 孙悟空 | 破甲棍击 | 金色棍棒重击地面，冲击波扩散 |
| 观音 | 莲花护盾 | 青绿色莲花绽放，护盾光圈 |
| 哪吒 | 三头六臂 | 多重枪影同时刺出 |
| 红孩儿 | 三昧真火 | 火焰从身体向外爆发 |
| 白骨夫人 | 召唤分身 | 身体分裂出一个半透明分身 |

**输出文件：**
```text
public/assets/heroes/hero_sunwukong_skill.png
public/assets/heroes/hero_guanyin_skill.png
public/assets/heroes/hero_nezha_skill.png
public/assets/heroes/hero_honghaier_skill.png
public/assets/heroes/hero_baigufuren_skill.png
```

### 4.4 英雄碎片图标（14 张）

**输出文件：**
```text
public/assets/heroes/shard_{heroId}.png  (14个)
```

**提示词：**
```text
生成一张透明背景 2D icon sheet，14 个《守护唐僧》英雄碎片图标横向排列。每格 96×96，整张 1344×96。每个图标为彩色玉片碎片形状，内部带对应英雄简化头像或标志物。CORE 金红边框，NORMAL 青绿银边框。依次：孙悟空/猪八戒/沙悟净/白龙马/观音/红孩儿/哪吒/牛魔王/二郎神/太上老君/黑熊精/白骨夫人/蜘蛛精/托塔天王。无文字/水印。
```

---

## 六、敌人资源（10+4+7=21种）

> **MVP 必做：** 全部静态图 + 每个类型选1个做全套动画（共约30组）
> **MVP 可后补：** 其余敌人的动画

### 5.1 普通敌人静态图（10 张）

| enemyId | 名称 | 视觉特征 |
|---------|------|---------|
| xiaoyao_1 | 小妖喽啰 | 小体型，暗红，杂兵感 |
| xiaoyao_2 | 骷髅妖 | 白骨轮廓，灰白 |
| xiaoyao_3 | 蝙蝠妖 | 翅膀轮廓，深紫 |
| xiaoyao_4 | 巡山妖 | 棕红，山野小妖感 |
| xiaoyao_5 | 水妖 | 蓝绿，水纹感 |
| xiaoyao_6 | 虾兵 | 蓝灰，甲壳和长枪 |
| xiaoyao_7 | 蟹将 | 灰蓝，大钳和甲壳 |
| xiaoyao_8 | 火妖 | 红橙，火焰轮廓 |
| xiaoyao_9 | 熔岩怪 | 暗红岩石，橙色裂纹 |
| xiaoyao_10 | 狮驼小妖 | 暗红棕，狮驼岭杂兵感 |

**输出文件：**
```text
public/assets/enemies/enemy_xiaoyao_1.png ~ enemy_xiaoyao_10.png
```

**提示词：**
```text
生成一张透明背景 2D 静态 sprite sheet，10 个《守护唐僧》Q版西游普通敌人横向排列。每格 80×80，整张 800×80。统一45度俯视移动方向。依次：小妖喽啰（暗红小体杂兵）、骷髅妖（灰白骨骼轮廓）、蝙蝠妖（深紫翅膀）、巡山妖（棕红野妖）、水妖（蓝绿水纹）、虾兵（蓝灰甲壳长枪）、蟹将（灰蓝大钳甲壳）、火妖（红橙火焰）、熔岩怪（暗红岩石橙裂纹）、狮驼小妖（暗红棕杂兵）。Q版但有威胁感，轮廓清晰。透明背景，无文字/水印。
```

### 5.2 精英敌人静态图（4 张）

| enemyId | 名称 | 视觉特征 | 尺寸 |
|---------|------|---------|------|
| elite_huangfeng | 黄风怪 | 黄褐风纹沙尘，精英体型 | 96×96 |
| elite_huli | 狐狸精 | 粉紫狐耳狐尾，灵巧感 | 96×96 |
| elite_kuangtou | 象兵 | 灰色重甲大象轮廓，重型感 | 96×96 |
| elite_dapeng | 大鹏鹰 | 蓝紫宽大翅膀，高速飞行感 | 96×96 |

**输出文件：**
```text
public/assets/enemies/enemy_elite_huangfeng.png
public/assets/enemies/enemy_elite_huli.png
public/assets/enemies/enemy_elite_kuangtou.png
public/assets/enemies/enemy_elite_dapeng.png
```

**提示词：**
```text
生成一张透明背景 2D 静态 sprite sheet，4 个《守护唐僧》Q版西游精英敌人横向排列。每格 96×96，整张 384×96。比普通敌人体型更大，轮廓更强。依次：黄风怪（黄褐风纹沙尘）、狐狸精（粉紫狐耳狐尾灵巧）、象兵（灰重甲大象轮廓）、大鹏鹰（蓝紫宽翅高速飞行）。透明背景，无文字/水印。
```

### 5.3 BOSS 静态图（7 张）

| enemyId | 名称 | 视觉特征 | 尺寸 |
|---------|------|---------|------|
| boss_heixiongjing | 黑熊精 | 黑棕重甲大体型 | 128×128 |
| boss_jinjiao | 金角大王 | 金色角冠金棕配色法宝感 | 128×128 |
| boss_honghaier | 红孩儿 | 红橙火焰火尖枪火焰光环 | 128×128 |
| boss_baigufuren | 白骨夫人 | 白骨紫灰阴冷法术感 | 128×128 |
| boss_qingshi | 青狮 | 青绿狮妖厚重鬃毛 | 128×128 |
| boss_baixiang | 白象 | 灰白巨象重甲防御感 | 128×128 |
| boss_dapengjinchi | 大鹏金翅雕 | 蓝金巨鸟大翅膀高速压迫感 | 128×128 |

**输出文件：**
```text
public/assets/enemies/enemy_boss_heixiongjing.png
public/assets/enemies/enemy_boss_jinjiao.png
public/assets/enemies/enemy_boss_honghaier.png
public/assets/enemies/enemy_boss_baigufuren.png
public/assets/enemies/enemy_boss_qingshi.png
public/assets/enemies/enemy_boss_baixiang.png
public/assets/enemies/enemy_boss_dapengjinchi.png
```

**提示词：**
```text
生成一张透明背景 2D 静态 sprite sheet，7 个《守护唐僧》Q版西游 BOSS 横向排列。每格 128×128，整张 896×128。体型明显大于普通敌人，压迫感强。依次：黑熊精（黑棕重甲）、金角大王（金角冠法宝感）、红孩儿（红橙火焰火尖枪）、白骨夫人（白骨紫灰法术感）、青狮（青绿狮鬃毛）、白象（灰白巨象重甲）、大鹏金翅雕（蓝金巨鸟大翅）。Q版但有威胁感。透明背景，无文字/水印。
```

### 5.4 普通敌人动作动画（10种 × 3动作 = 30组）

每帧 80×80。

**输出文件（以 xiaoyao_1 为例）：**
```text
public/assets/enemies/enemy_xiaoyao_1_move.png    (6帧 480×80)
public/assets/enemies/enemy_xiaoyao_1_hit.png     (4帧 320×80)
public/assets/enemies/enemy_xiaoyao_1_death.png   (6帧 480×80)
; xiaoyao_2 ~ xiaoyao_10 同理
```

**提示词（xiaoyao_1 示例）：**
```text
生成小妖喽啰 Q版西游塔防敌人 move 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 480×80。小体型暗红杂兵，沿道路向右下方小跑移动。角色位置稳定。无文字/水印。
```
```text
生成小妖喽啰 Q版西游塔防敌人 hit 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 320×80。受击闪白、后仰抖动，不能血腥。角色位置稳定。无文字/水印。
```
```text
生成小妖喽啰 Q版西游塔防敌人 death 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 480×80。从受击→倒下→化为烟尘消散，不能血腥。角色位置稳定。无文字/水印。
```

### 5.5 精英敌人动作动画（4种 × 5动作 = 20组）

每帧 96×96。

**输出文件（以 elite_huangfeng 为例）：**
```text
public/assets/enemies/enemy_elite_huangfeng_idle.png    (4帧 384×96)
public/assets/enemies/enemy_elite_huangfeng_move.png    (6帧 576×96)
public/assets/enemies/enemy_elite_huangfeng_attack.png  (6帧 576×96)
public/assets/enemies/enemy_elite_huangfeng_hit.png     (4帧 384×96)
public/assets/enemies/enemy_elite_huangfeng_death.png   (6帧 576×96)
; 其余3个精英同理
```

### 5.6 BOSS 动作动画（7种 × 6动作 = 42组）

每帧 128×128。

| 动作 | 帧数 | 整图尺寸 |
|------|------|----------|
| idle | 4 | 512×128 |
| move | 6 | 768×128 |
| attack | 8 | 1024×128 |
| hit | 4 | 512×128 |
| death | 8 | 1024×128 |
| spawn | 8 | 1024×128 |

**输出文件（以 boss_heixiongjing 为例）：**
```text
public/assets/enemies/enemy_boss_heixiongjing_idle.png
public/assets/enemies/enemy_boss_heixiongjing_move.png
public/assets/enemies/enemy_boss_heixiongjing_attack.png
public/assets/enemies/enemy_boss_heixiongjing_hit.png
public/assets/enemies/enemy_boss_heixiongjing_death.png
public/assets/enemies/enemy_boss_heixiongjing_spawn.png
; 其余6个 BOSS 同理
```

---

## 七、唐僧资源

> **MVP 必做：全部**

### 6.1 唐僧静态图（1 张）

**输出文件：**
```text
public/assets/heroes/tangmonk_idle.png
```

**提示词：**
```text
生成唐僧 Q版西游角色静态图，透明背景 PNG。尺寸 96×96。身披红色金纹袈裟，手持锡杖或合十，庄严慈悲的僧人形象，Q版头大身小，表情平和安详。适合 80×80 棋盘格显示。无文字/水印。
```

### 6.2 唐僧动作动画（3 组）

**输出文件：**
```text
public/assets/heroes/tangmonk_idle_sheet.png   (4帧 384×96)  轻微呼吸/诵经
public/assets/heroes/tangmonk_hit.png          (4帧 384×96)  受击后仰
public/assets/heroes/tangmonk_death.png        (6帧 576×96)  倒下化为金光
```

### 6.3 唐僧光环特效（1 组）

用于诵经光环可视化（全图攻击 buff + 回血光环）。

**输出文件：**
```text
public/assets/effects/effect_monk_aura.png  (6帧 256×256 金色波纹光环扩散)
```

**提示词：**
```text
生成唐僧诵经光环特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 256×256，整张 1536×256。画面：一道金色/暖黄色光环波纹从中心向外圆形扩散，带梵文或莲花纹样隐约浮现，6 帧从微弱→明亮→渐隐，光环柔和庄严不刺眼。用于全图 buff 可视化。无文字/水印。
```

### 6.4 唐僧心形血量图标（1 张）

**输出文件：**
```text
public/assets/ui/ui_heart_monk.png  (64×64)
```

**提示词：**
```text
生成唐僧血量爱心图标，透明背景 PNG，64×64。红色爱心带金色描边和轻微光晕，内部有小的金色"禅"字或莲花纹样点缀。适合 32×32 和 64×64 显示。无文字/水印。
```

---

## 八、法宝资源（12 件）

> **MVP 必做：** 全部 12 件图标
> **MVP 可后补：** 法宝使用特效（先保留程序化）

### 7.1 法宝图标（12 张）

| artifactId | 名称 | 解锁章节 | 图标描述 |
|------------|------|---------|---------|
| kaishanfu | 开山斧 | 初始 | 金色斧头 + 山石裂纹 |
| huishanfu | 回山符 | 初始 | 黄色符纸 + 回旋箭头光效 |
| yangzhiganlu | 杨枝甘露 | 初始 | 杨柳枝 + 翠绿露珠 |
| jinguzhou | 紧箍咒 | Ch1 | 金箍圆环 + 压制光效 |
| kulounianzhu | 骷髅念珠 | Ch2 | 紫色骷髅 + 念珠串 |
| zhaoyaojing | 照妖镜 | Ch3 | 古铜镜 + 照射光束 |
| bihuozhao | 避火罩 | Ch4 | 透明护罩 + 火焰反弹 |
| bajiaoshan | 芭蕉扇 | Ch5 | 芭蕉叶扇 + 旋风纹 |
| laoyuanjia | 老鼋甲 | Ch6 | 龟甲盾牌 + 水纹 |
| ganlujinglu | 甘露净露 | Ch7 | 玉净瓶 + 蓝绿净化水光 |
| jingangzhuo | 金刚琢 | Ch8 | 金刚圈 + 锁定光环 |
| jinlanjiasha | 锦斓袈裟 | Ch9 | 红金袈裟 + 佛光 |

**输出文件：**
```text
public/assets/artifacts/artifact_kaishanfu.png
public/assets/artifacts/artifact_huishanfu.png
public/assets/artifacts/artifact_yangzhiganlu.png
public/assets/artifacts/artifact_jinguzhou.png
public/assets/artifacts/artifact_kulounianzhu.png
public/assets/artifacts/artifact_zhaoyaojing.png
public/assets/artifacts/artifact_bihuozhao.png
public/assets/artifacts/artifact_bajiaoshan.png
public/assets/artifacts/artifact_laoyuanjia.png
public/assets/artifacts/artifact_ganlujinglu.png
public/assets/artifacts/artifact_jingangzhuo.png
public/assets/artifacts/artifact_jinlanjiasha.png
```

**提示词：**
```text
生成一张透明背景 2D game icon sheet，12 个《守护唐僧》Q版西游法宝图标横向排列。每格 128×128，整张 1536×128。粗轮廓高对比，适合 48×48 和 96×96 显示。依次：开山斧（金斧山石裂纹）、回山符（黄符回旋箭头）、杨枝甘露（柳枝翠绿露珠）、紧箍咒（金箍圆环压制光效）、骷髅念珠（紫骷髅念珠串）、照妖镜（古铜镜照射光束）、避火罩（透明护罩火焰反弹）、芭蕉扇（芭蕉叶旋风纹）、老鼋甲（龟甲盾水纹）、甘露净露（玉净瓶蓝绿净化水光）、金刚琢（金刚圈锁定光环）、锦斓袈裟（红金袈裟佛光）。无文字/水印，透明背景。
```

### 7.2 法宝使用特效（12 组，MVP 可后补）

每件法宝使用时的视觉效果。

**输出文件：**
```text
public/assets/effects/effect_artifact_axe.png          开山斧 格子解锁碎石爆裂 (6帧 128×128)
public/assets/effects/effect_artifact_return.png       回山符 敌人回退传送闪光 (6帧 128×128)
public/assets/effects/effect_artifact_willow_dew.png   杨枝甘露 全屏绿色治疗波 (6帧 256×256)
public/assets/effects/effect_artifact_headband.png     紧箍咒 金箍收紧光圈 (6帧 256×256)
public/assets/effects/effect_artifact_skull_beads.png  骷髅念珠 紫色骷髅诅咒标记 (6帧 128×128)
public/assets/effects/effect_artifact_demon_mirror.png 照妖镜 镜面闪光暴露 (6帧 128×128)
public/assets/effects/effect_artifact_fire_cover.png   避火罩 火焰护盾气泡 (6帧 128×128)
public/assets/effects/effect_artifact_plantain_fan.png 芭蕉扇 狂风推卷冲击波 (6帧 256×256)
public/assets/effects/effect_artifact_turtle_armor.png 老鼋甲 龟甲护盾覆盖 (6帧 128×128)
public/assets/effects/effect_artifact_cleansing.png    甘露净露 蓝绿净化雾气 (6帧 256×256)
public/assets/effects/effect_artifact_diamond_snare.png 金刚琢 金刚能量环锁定 (6帧 128×128)
public/assets/effects/effect_artifact_kasaya.png       锦斓袈裟 金色袈裟佛光笼罩唐僧 (6帧 128×128)
```

---

## 九、道具资源（5 个）

> **MVP 必做：全部**

### 8.1 道具图标（5 张）

| itemId | 名称 | 图标描述 |
|--------|------|---------|
| kaishanfu | 开山斧 | 金色斧头 + 山石裂纹 |
| jiuzhuanxiandan | 九转仙丹 | 红金丹药 + 发光圆环 |
| tongyongsuipian | 通用碎片 | 彩色玉片/拼图碎片 |
| jinguzhou | 紧箍咒 | 金箍圆环 + 压制光效 |
| yujingping | 玉净瓶 | 白玉瓶 + 蓝绿水光 |

**输出文件：**
```text
public/assets/items/item_kaishanfu.png
public/assets/items/item_jiuzhuanxiandan.png
public/assets/items/item_tongyongsuipian.png
public/assets/items/item_jinguzhou.png
public/assets/items/item_yujingping.png
```

**提示词：**
```text
生成一张透明背景 2D game icon sheet，5 个《守护唐僧》西游塔防道具图标横向排列。每格 128×128，整张 640×128。粗轮廓高对比，适合 48×48 和 96×96 显示。依次：开山斧（金斧山石裂纹）、九转仙丹（红金丹药发光圆环）、通用碎片（彩色玉片拼图）、紧箍咒（金箍圆环压制光效）、玉净瓶（白玉瓶蓝绿水光）。无文字/水印，透明背景。
```

---

## 十、货币与徽章

> **MVP 必做：** 灵蕴图标、仙桃图标
> **MVP 可后补：** 段位徽章、周目标识

### 9.1 灵蕴货币图标（1 张）

法宝升级消耗的货币。

**输出文件：**
```text
public/assets/ui/ui_icon_spirit.png  (64×64)
```

**提示词：**
```text
生成灵蕴货币图标，透明背景 PNG，64×64。一颗发光的水晶/灵气珠，蓝紫色调，带星点光芒和轻微光晕，国风仙气感。适合 32×32 和 64×64 显示。无文字/水印。
```

### 9.2 仙桃货币图标（1 张）

战斗内召唤消耗的货币。

**输出文件：**
```text
public/assets/ui/ui_icon_peach.png  (64×64)
```

> 注：原清单已有此图标，此处确认保留。

**提示词：**
```text
生成仙桃货币图标，透明背景 PNG，64×64。一颗粉红/金色的仙桃，带翠绿桃叶和金色光晕，国风Q版。适合 32×32 和 64×64 显示。无文字/水印。
```

### 9.3 段位徽章（10 个，MVP 可后补）

Defense 模式 10 个段位（从 `DefenseRankConfig.ts`）。

**输出文件：**
```text
public/assets/ui/ui_rank_01.png ~ ui_rank_10.png  (各 96×96)
```

**提示词：**
```text
生成一张透明背景 2D icon sheet，10 个《守护唐僧》段位徽章横向排列。每格 96×96，整张 960×96。从低到高：凡修（灰铁框）、散仙（铜框）、真仙（银框）、金仙（金框）、太乙（金框+星）、大罗（金框+双星）、准圣（紫金框）、圣人（紫金框+光环）、道祖（五彩框）、天帝（五彩框+龙凤纹）。每个徽章方框内有不同数量的星或纹样区分等级。无文字/水印，透明背景。
```

### 9.4 阵营图标（3 个）

HUD 显示阵营羁绊激活状态。

**输出文件：**
```text
public/assets/ui/ui_icon_faction_shitu.png   (师徒 金红色)
public/assets/ui/ui_icon_faction_xianfo.png  (仙佛 青蓝色)
public/assets/ui/ui_icon_faction_yaowang.png (妖王 紫色)
```

**提示词：**
```text
生成 3 个《守护唐僧》阵营图标，透明背景 PNG，各 64×64。师徒（金红"师"字或禅杖纹样）、仙佛（青蓝莲花或祥云纹样）、妖王（紫色兽角或妖纹）。简洁可读，适合 32×32 显示。无文字/水印。
```

### 9.5 周目标识（1 个）

取经模式多周目难度标识。

**输出文件：**
```text
public/assets/ui/ui_icon_loop.png  (64×64)
```

**提示词：**
```text
生成周目标识图标，透明背景 PNG，64×64。一个圆形旋转箭头或轮回圆环，金色国风纹样，表示"轮回/周目"概念。无文字/水印。
```

---

## 十一、UI 资源

> **MVP 必做：** 核心图标 8 个 + 卡牌仓库 10 个 + HUD结算 12 个
> **MVP 可后补：** 章节卡片背景

### 10.1 核心 UI 图标（8 张）

**输出文件：**
```text
public/assets/ui/ui_icon_peach.png       仙桃（若 9.2 已生成则复用）
public/assets/ui/ui_icon_hp.png          血量爱心
public/assets/ui/ui_icon_wave.png        波次旗帜
public/assets/ui/ui_icon_kill.png        击杀标记
public/assets/ui/ui_icon_pause.png       暂停按钮
public/assets/ui/ui_icon_star.png        星级五角星
public/assets/ui/ui_icon_sweep.png       扫荡卷轴
public/assets/ui/ui_icon_ad_reward.png   广告奖励礼盒
```

**提示词：**
```text
生成一张透明背景 2D mobile game UI icon sheet，8 个《守护唐僧》Q版西游 UI 图标横向排列。每格 64×64，整张 512×64。依次：仙桃（粉红金桃叶）、血量爱心（红金爱心）、波次旗帜（朱红金旗）、击杀标记（墨蓝金剑）、暂停按钮（墨蓝金双竖线）、星级（金色五角星）、扫荡（卷轴金闪光）、广告奖励（金礼盒播放三角）。无文字/水印，透明背景。
```

### 10.2 卡牌与仓库 UI（10 张）

**输出文件：**
```text
public/assets/ui/ui_card_soldier.png           小兵卡牌框
public/assets/ui/ui_card_hero_shard.png        英雄碎片卡牌框
public/assets/ui/ui_card_item.png              道具卡牌框
public/assets/ui/ui_frame_hero_normal.png      普通英雄青绿边框
public/assets/ui/ui_frame_hero_core.png        核心英雄金红边框
public/assets/ui/ui_inventory_slot_empty.png   仓库空槽
public/assets/ui/ui_inventory_slot_highlight.png 仓库高亮槽
public/assets/ui/ui_button_summon.png          召唤按钮
public/assets/ui/ui_button_ad_reward.png       广告奖励按钮
public/assets/ui/ui_button_disabled.png        禁用按钮
```

### 10.3 HUD 与结算 UI（12 张）

**输出文件：**
```text
public/assets/ui/ui_hud_bar.png            HUD 顶部底条
public/assets/ui/ui_panel_resource.png     资源面板
public/assets/ui/ui_panel_hp.png           血量面板
public/assets/ui/ui_panel_wave.png         波次面板
public/assets/ui/ui_boss_bar_bg.png        BOSS 血条背景
public/assets/ui/ui_boss_bar_fill.png      BOSS 血条填充
public/assets/ui/ui_result_panel_win.png   胜利结算面板
public/assets/ui/ui_result_panel_lose.png  失败结算面板
public/assets/ui/ui_button_normal.png      普通按钮
public/assets/ui/ui_button_confirm.png     确认按钮
public/assets/ui/ui_button_back.png        返回按钮
public/assets/ui/ui_star_panel.png         星级展示底板
```

### 10.4 章节卡片背景（9 张，MVP 可后补）

每章一个主题装饰卡片。

**输出文件：**
```text
public/assets/ui/ui_chapter_01_card.png ~ ui_chapter_09_card.png
```

**提示词（以第1章为例）：**
```text
生成第1章「五行山」章节卡片装饰图，透明背景 PNG，400×280。Q版国风手绘，表现五行山下山石和悟空破山而出的场景感，主色调 0x5b8c5a（森林绿），有山路和岩石纹理，画面留出中央空白区域用于放文字。无文字/水印。
```

---

## 十二、背景资源

> **MVP 必做：** 1 张通用战斗背景 + 1 张关卡地图背景
> **MVP 可后补：** 9 章各自的主题战斗背景

### 11.1 关卡地图背景（1 张）

**输出文件：**
```text
public/assets/ui/ui_bg_journey_map.png  (750×1334)
```

**提示词：**
```text
生成一张竖屏手机游戏背景图，尺寸 750×1334，主题《守护唐僧》西游取经路线图。Q版国风手绘地图风格，从五行山到灵山的取经路线，山路云纹庙宇村庄卷轴地图感。中间预留路线节点区域，底部按钮区域，顶部标题区域。不要文字/水印/logo。
```

### 11.2 战斗背景（10 张）

通用森林 + 9 章主题。

**输出文件：**
```text
public/assets/ui/ui_bg_battle_forest.png       通用森林 (750×1334)
public/assets/ui/ui_bg_battle_water_sand.png   流沙河 水沙场景
public/assets/ui/ui_bg_battle_bone_cave.png    白虎岭 白骨洞场景
public/assets/ui/ui_bg_battle_fire_cave.png    号山 火云洞场景
public/assets/ui/ui_bg_battle_volcano.png      火焰山 火山场景
public/assets/ui/ui_bg_battle_river_cross.png  通天河 渡河场景
public/assets/ui/ui_bg_battle_spider_cave.png  盘丝洞 蛛网场景
public/assets/ui/ui_bg_battle_lion_ridge.png   狮驼岭 山岭场景
public/assets/ui/ui_bg_battle_spirit_mountain.png 灵山 佛光场景
public/assets/ui/ui_bg_battle_default.png      默认通用（同 forest）
```

**提示词（森林通用）：**
```text
生成一张竖屏手机战斗背景图，尺寸 750×1334，《守护唐僧》Q版西游塔防战斗场景，国风2D。中间区域预留 8×6 棋盘空间，背景为山野林地和取经道路，红金路线和青绿可布阵区域能清楚显示，底部预留召唤卡牌栏和仓库栏，顶部预留 HUD。不要文字/水印/logo。
```

---

## 十三、特效资源

> **MVP 必做：** 通用环境特效 7 组 + 投射物 5 组 + 命中 5 组 + 起手 4 组 + AOE 3 组
> **MVP 可后补：** BOSS 技能特效 13 组 + buff/debuff 状态图标

### 12.1 通用环境特效（7 组）

**输出文件：**
```text
public/assets/effects/effect_summon_ring.png       金色召唤光圈 (6帧 128×128)
public/assets/effects/effect_merge_level_up.png    绿色合成升级光圈 (6帧 128×128)
public/assets/effects/effect_hero_activate.png     英雄激活金红双环 (8帧 128×128)
public/assets/effects/effect_hero_level_up.png     英雄升级金色上升光柱 (6帧 128×128)
public/assets/effects/effect_heal_lotus.png        莲花治疗光效 (6帧 128×128)
public/assets/effects/effect_boss_spawn.png        BOSS 入场红金冲击波 (8帧 256×256)
public/assets/effects/effect_item_flash.png        道具使用闪光 (6帧 128×128)
```

### 12.2 投射物（5 组）

**输出文件：**
```text
public/assets/effects/effect_projectile_arrow.png   金色光箭 (4帧 64×64)
public/assets/effects/effect_projectile_fireball.png 红橙火球 (4帧 64×64)
public/assets/effects/effect_projectile_magic.png   青绿法术弹 (4帧 64×64)
public/assets/effects/effect_projectile_staff.png   金色棍影冲击波 (4帧 64×64)
public/assets/effects/effect_projectile_water.png   蓝白水弹 (4帧 64×64)
```

### 12.3 命中特效（5 组）

**输出文件：**
```text
public/assets/effects/effect_hit_melee.png    近战命中金色火花 (6帧 96×96)
public/assets/effects/effect_hit_arrow.png    箭矢命中光点爆开 (6帧 96×96)
public/assets/effects/effect_hit_fire.png     火焰命中爆裂 (6帧 96×96)
public/assets/effects/effect_hit_magic.png    法术命中能量扩散 (6帧 96×96)
public/assets/effects/effect_hit_crit.png     暴击命中大爆裂 (6帧 96×96)
```

### 12.4 起手/发射特效（4 组）

**输出文件：**
```text
public/assets/effects/effect_launch_arrow.png   弓箭发射光圈 (4帧 96×96)
public/assets/effects/effect_launch_fire.png    火焰凝聚喷发 (4帧 96×96)
public/assets/effects/effect_launch_melee.png   近战挥砍弧光 (4帧 96×96)
public/assets/effects/effect_launch_magic.png   法术法阵凝聚射出 (4帧 96×96)
```

### 12.5 范围持续特效（3 组）

**输出文件：**
```text
public/assets/effects/effect_aoe_fire_burst.png   火焰范围爆裂 (6帧 128×128)
public/assets/effects/effect_aoe_slow_mist.png    减速冰雾范围 (6帧 128×128，可循环)
public/assets/effects/effect_aoe_ring_splash.png  环形冲击波 (6帧 128×128)
```

### 12.6 BOSS 技能特效（13 组，MVP 可后补）

| BOSS | 技能 | 特效描述 |
|------|------|---------|
| 黑熊精 | damage_reflect | 护盾反伤闪光 |
| 黑熊精 | hp_regen | 绿色治疗脉冲 |
| 金角大王 | absorb_unit | 吸收光束/触须 |
| 金角大王 | damage_aura | 持续伤害力场 |
| 红孩儿 | burn_aura | 火焰灼烧光环地面 |
| 红孩儿 | fireball | 大型火球弹道+命中 |
| 白骨夫人 | summon_minions | 召唤小兵黑烟 |
| 白骨夫人 | transform | 鬼影半透明闪烁 |
| 青狮 | fear_roar | 恐惧咆哮声波扩散 |
| 青狮 | charge | 高速冲锋拖尾 |
| 白象 | trample_aoe | 践踏地面裂纹冲击 |
| 大鹏金翅雕 | flight_speed | 飞行加速气流线 |
| 大鹏金翅雕 | wind_slash | 风刃弹道+命中 |

**输出文件：**
```text
public/assets/effects/effect_boss_damage_reflect.png
public/assets/effects/effect_boss_hp_regen.png
public/assets/effects/effect_boss_absorb.png
public/assets/effects/effect_boss_damage_aura.png
public/assets/effects/effect_boss_burn_aura.png
public/assets/effects/effect_boss_fireball.png
public/assets/effects/effect_boss_summon_minions.png
public/assets/effects/effect_boss_transform.png
public/assets/effects/effect_boss_fear_roar.png
public/assets/effects/effect_boss_charge.png
public/assets/effects/effect_boss_trample_aoe.png
public/assets/effects/effect_boss_flight_speed.png
public/assets/effects/effect_boss_wind_slash.png
```

### 12.7 Buff/Debuff 状态图标（8 个）

单位身上的 buff/debuff 小图标。

**输出文件：**
```text
public/assets/effects/effect_status_shield.png       护盾图标
public/assets/effects/effect_status_invincible.png   无敌图标
public/assets/effects/effect_status_atk_up.png       攻击力提升
public/assets/effects/effect_status_def_up.png       防御提升
public/assets/effects/effect_status_heal_over_time.png 持续回血
public/assets/effects/effect_status_slow.png         减速
public/assets/effects/effect_status_vulnerable.png   易伤
public/assets/effects/effect_status_stun.png         眩晕
```

**提示词：**
```text
生成一张透明背景 2D status icon sheet，8 个《守护唐僧》状态图标横向排列。每格 32×32，整张 256×32。适合在棋盘单位头顶显示。依次：护盾（蓝色半圆盾）、无敌（金色星芒）、攻击提升（红色剑向上）、防御提升（蓝色盾向上）、持续回血（绿色十字心）、减速（蓝色雪花/冰晶）、易伤（紫色裂痕）、眩晕（黄色星旋）。简洁可读。无文字/水印。
```

### 12.8 英雄技能专属特效（5 组，MVP 可后补）

**输出文件：**
```text
public/assets/effects/effect_hero_guanyin_shield.png    观音莲花护盾
public/assets/effects/effect_hero_sunwukong_break.png   悟空破甲棍击
public/assets/effects/effect_hero_nezha_multihit.png    哪吒多重枪影
public/assets/effects/effect_hero_honghaier_splash.png  红孩儿火焰溅射
public/assets/effects/effect_hero_baigufuren_clone.png  白骨夫人分身召唤
```

---

## 十四、音效资源

> **MVP 必做：** 全部基础音效（UI 6 + 战斗 7 + 成长 7 + BGM 3）
> **MVP 可后补：** 法宝音效 12 + BOSS 技能音效

### 13.1 UI 音效（6 个）

```text
public/assets/audio/sfx_ui_click.ogg           0.15s 按钮点击 清脆木鱼/玉石敲击
public/assets/audio/sfx_ui_summon.ogg          0.8s  召唤卡牌 铃铛+战鼓+闪光
public/assets/audio/sfx_ui_drag_start.ogg      0.2s  拖拽开始 纸牌拿起+玉石轻响
public/assets/audio/sfx_ui_place_success.ogg   0.25s 放置成功 棋子落盘+金色确认铃
public/assets/audio/sfx_ui_place_fail.ogg      0.25s 放置失败 低沉木鱼+否定短促
public/assets/audio/sfx_ui_inventory_in.ogg    0.3s  仓库入库 卡牌滑入+玉石叮声
```

### 13.2 战斗音效（7 个）

```text
public/assets/audio/sfx_attack_melee.ogg       0.35s 近战攻击 短棍挥砍+风声+打击感
public/assets/audio/sfx_attack_ranged.ogg      0.35s 远程射击 弓弦释放+符咒飞出
public/assets/audio/sfx_attack_magic.ogg       0.45s 法术攻击 铃铛+气流+火焰/水光
public/assets/audio/sfx_hit_normal.ogg         0.2s  普通命中 碰撞+法术闪光
public/assets/audio/sfx_enemy_death.ogg        0.5s  敌人死亡 化为烟尘+金币轻响
public/assets/audio/sfx_boss_spawn.ogg         1.2s  BOSS登场 战鼓+锣声+冲击波
public/assets/audio/sfx_monk_damage.ogg        0.45s 唐僧受伤 心跳+护盾破裂感
```

### 13.3 成长与结算音效（7 个）

```text
public/assets/audio/sfx_merge.ogg              0.8s  小兵合成 上升音+玉石碰撞+铃声
public/assets/audio/sfx_hero_activate.ogg      1.0s  英雄激活 金红双环+鼓点+铃声
public/assets/audio/sfx_hero_level_up.ogg      0.9s  英雄升级 金色上升光柱+成长感
public/assets/audio/sfx_item_use.ogg           0.6s  道具使用 法宝发动+玉石叮声
public/assets/audio/sfx_victory.ogg            2.0s  胜利结算 欢快鼓点+铃声+琵琶
public/assets/audio/sfx_defeat.ogg             2.0s  失败结算 短锣声+失落旋律
public/assets/audio/sfx_star_result.ogg        0.8s  星级结算 星星逐个亮起三连铃
```

### 13.4 法宝使用音效（12 个，MVP 可后补）

```text
public/assets/audio/sfx_artifact_axe.ogg           开山斧 碎石爆裂
public/assets/audio/sfx_artifact_return.ogg        回山符 传送闪现
public/assets/audio/sfx_artifact_willow_dew.ogg    杨枝甘露 水润治疗
public/assets/audio/sfx_artifact_headband.ogg      紧箍咒 金属收紧
public/assets/audio/sfx_artifact_skull_beads.ogg   骷髅念珠 阴冷诅咒
public/assets/audio/sfx_artifact_demon_mirror.ogg  照妖镜 镜面闪光
public/assets/audio/sfx_artifact_fire_cover.ogg    避火罩 护盾生成
public/assets/audio/sfx_artifact_plantain_fan.ogg  芭蕉扇 狂风呼啸
public/assets/audio/sfx_artifact_turtle_armor.ogg  老鼋甲 厚重护甲
public/assets/audio/sfx_artifact_cleansing.ogg     甘露净露 净化水声
public/assets/audio/sfx_artifact_diamond_snare.ogg 金刚琢 能量锁定
public/assets/audio/sfx_artifact_kasaya.ogg        锦斓袈裟 佛光降临
```

### 13.5 BOSS 技能音效（7 个，MVP 可后补）

```text
public/assets/audio/sfx_boss_skill_damage_reflect.ogg  反伤护盾
public/assets/audio/sfx_boss_skill_absorb.ogg          吸收单位
public/assets/audio/sfx_boss_skill_fear_roar.ogg       恐惧咆哮
public/assets/audio/sfx_boss_skill_charge.ogg          冲锋
public/assets/audio/sfx_boss_skill_trample_aoe.ogg     践踏
public/assets/audio/sfx_boss_skill_wind_slash.ogg      风刃
public/assets/audio/sfx_boss_skill_fireball.ogg        大型火球
```

### 13.6 BGM（3 首）

```text
public/assets/audio/bgm_map.ogg      60s 可循环 取经地图 轻快国风 笛子琵琶古筝轻鼓
public/assets/audio/bgm_battle.ogg   60s 可循环 普通战斗 节奏明确 战鼓琵琶笛子锣
public/assets/audio/bgm_boss.ogg     45s 可循环 BOSS 战  紧张压迫 战鼓锣低音弦乐
```

---

## 十五、最终接入检查清单

- [ ] 每个 PNG 都是透明背景（背景图除外）
- [ ] 文件名和本文档一致
- [ ] 静态 sheet 已裁成单张 PNG
- [ ] 动作/特效 sprite sheet 保持为一张横向多帧 PNG，记录好每帧宽高
- [ ] 动作/特效帧序列帧号从 `01` 连续递增，每张尺寸一致
- [ ] 所有音效已转为 OGG，音量统一
- [ ] 每个素材记录来源、生成日期、AI 工具、授权说明
- [ ] 正式接入前 `pnpm build` 确认资源路径不影响构建

---

## 附：MVP 最小集建议

按优先级分三批。

### 🥇 第一批：静态核心（约 120 个文件）

必须先生成，确定整体美术风格基准。

| 类别 | 内容 | 数量 |
|------|------|------|
| 小兵静态 | 4类 × 5阶 | 20 张 |
| 英雄静态 stage_1 | 14名 | 14 张 |
| 英雄碎片 | 14名 | 14 张 |
| 敌人静态 | 10普通 + 4精英 + 7BOSS | 21 张 |
| 唐僧静态 | 1张 | 1 张 |
| 道具图标 | 5个 | 5 张 |
| 法宝图标 | 12个 | 12 张 |
| 灵蕴+仙桃图标 | 2个 | 2 张 |
| 阵营图标 | 3个 | 3 张 |
| 核心UI图标 | 8个 | 8 张 |
| 通用战斗背景 | 1张 | 1 张 |
| 关卡地图背景 | 1张 | 1 张 |

### 🥈 第二批：动画与特效（约 100 组）

静态风格确认后再生成。

| 类别 | 内容 | 数量 |
|------|------|------|
| 小兵动画 | 4类 × (idle+attack) | 8 组 |
| MVP 7名英雄动画 | 7名 × (idle+attack+hit+death) | 28 组 |
| 唐僧动画 | (idle+hit+death) | 3 组 |
| 唐僧光环特效 | 1组 | 1 组 |
| 每种敌人各选1代表做全套动画 | 1普通(move+hit+death) + 1精英(5动作) + 1BOSS(6动作) | 14 组 |
| 通用环境特效 | 7组 | 7 组 |
| 投射物 | 5组 | 5 组 |
| 命中特效 | 5组 | 5 组 |
| 起手特效 | 4组 | 4 组 |
| AOE特效 | 3组 | 3 组 |
| 卡牌/仓库/HUD/结算 UI | 22个 | 22 张 |

### 🥉 第三批：扩充与音效（约 230 个文件）

| 类别 | 内容 | 数量 |
|------|------|------|
| 扩展7名英雄动画 | 7名 × (idle+attack+hit+death) | 28 组 |
| 英雄升级形态 | 核心7名×3 + 普通7名×2 | 35 张 |
| 英雄技能动画 | 5名英雄 skill | 5 组 |
| 全部普通敌人动画 | 10种 × (move+hit+death) | 30 组 |
| 全部精英敌人动画 | 4种 × 5动作 | 20 组 |
| 全部 BOSS 动画 | 7种 × 6动作 | 42 组 |
| BOSS 技能特效 | 13组 | 13 组 |
| 英雄技能特效 | 5组 | 5 组 |
| 法宝使用特效 | 12组 | 12 组 |
| Buff/Debuff 图标 | 8个 | 8 张 |
| 段位徽章 | 10个 | 10 张 |
| 章节卡片背景 | 9张 | 9 张 |
| 章节战斗背景 | 9张 | 9 张 |
| 周目标识 | 1个 | 1 张 |
| 全部音效 | 基础 20 + 法宝 12 + BOSS 技能 7 | 39 个 |
| BGM | 3首 | 3 首 |
