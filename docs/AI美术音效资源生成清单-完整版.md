# AI 美术音效资源生成清单（完整版）

> 生成日期：2026-07-07
> 基于原清单 + 代码实体配置 + 设计文档全面对照后重新整理
> 原清单已废弃，以此文档为准

---

## 使用说明

1. **不要一次把所有提示词发给 AI。** 按本文档顺序，一条提示词生成一批资源。
2. 第一批先生成小兵静态资源，用来确定整体风格；确认满意后，把小兵静态图作为「风格参考图」保存好。
3. 后续每次生成新资源时，都要上传或引用 1-3 张已满意的风格参考图，并追加风格锁定提示词。只写文字很容易跑风格。
4. **背景图、道具、UI、其他装饰图 → 直接用 AI 生成单张透明背景 PNG；** 多个同类资源 → 先生成 sheet 再裁成单张。
5. **小兵、角色、英雄、小怪、BOSS 的动作动画 → 走"静态图 → 视频 → 截帧"路径：**
   - 先用 AI 生图工具生成角色的高质量静态参考图（单张透明 PNG，定外观风格）。
   - 把参考图上传到 AI 视频工具（Runway / Pika / Kling / Sora / 即梦 等），使用 §2.9 的动作视频模板生成 5 秒无缝循环视频。
   - 视频首尾帧必须能无缝衔接（perfect loop），角色原地做动作，固定机位无运镜。
   - 用 FFmpeg 等截帧工具（§2.6）均匀提取关键帧，抠背景后拼成 sprite sheet 或帧序列。
   - 非循环动作（death / spawn）除外，视频末尾角色需完全消失或完全出现。
6. 战斗特效 → 横向透明 PNG sprite sheet（优先），或同一动作的编号透明 PNG 帧序列。特效可以直接走 AI 生图，不走视频路径。
7. PNG 帧序列可以直接接入 Phaser，也可以后续用 Aseprite、TexturePacker 等工具拼成 sprite sheet。
8. 帧序列不是随意散图：每帧必须透明背景、等宽等高、角色脚底锚点稳定、大小稳定，帧号用两位数字。
9. 透明背景必须是真正的 alpha 透明通道；不要把灰白棋盘格、帧号、参考线或底座画进最终 PNG。
10. 背景图不需要透明背景。
11. 音效和 BGM 优先 WAV，44.1kHz，16-bit，后续统一转为 OGG；BGM 首尾需适合无缝循环。
12. 所有资源必须可商用；不要让 AI 模仿任何已有游戏、动画、电影或具体版权角色风格。

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
头身比：Q版 2.5~3 头身（头:身 ≈ 1:1.5~2），不要 2 头身幼儿比例
眼睛：大而有神，黑色圆点或简单椭圆，不要复杂瞳孔高光
头部：占身体 35-38%，不要过大
身体：身材紧凑匀称，四肢短但不过粗，不要婴儿肥/圆胖体态
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
# 静态角色/道具生成核心关键词（保持这组不变）
flat vector illustration, semi-chibi character (2.5-3 heads tall, not babyish), clean bold outlines 3px,
2-tone cel shading, vibrant high-contrast colors,
Chinese mythology, Journey to the West theme,
45-degree isometric game view, mobile game sprite,
transparent background, isolated on white,
no gradient, no texture, no complex background, no text, no watermark

# 可替换部分（按角色调整）
[角色描述: monkey warrior with golden staff, red and gold armor],
[动作: idle standing pose / attack swinging motion / etc]
```

```text
# 角色动作视频生成核心关键词（图生视频工具使用，如 Runway / Pika / Kling / Sora）
# 先上传参考图（项目已确认风格的静态角色图），再附加以下 prompt：

seamless looping animation, perfect loop, start frame matches end frame exactly,
5 second duration, 24fps, smooth motion, consistent character throughout,
flat vector animation, 2-tone cel shading, clean bold outlines,
semi-chibi character 2.5-3 heads tall (slim, not chubby), Chinese mythology style,
isolated character on transparent/clean background,
fixed camera, single character performing [idle/attack/move/hit/death/skill/spawn] action cycle,
foot position anchored, no camera movement, no scene change,
no morphing, no style drift, character design stays identical to reference image,
no background change, no lighting change, no text, no watermark

# 循环动作描述
idle: subtle breathing bounce, slight clothing flutter, ready stance, no foot movement, 5s loop
attack: wind-up → strike → impact → recovery → return to idle-ready pose, 5s loop
move: walk/run cycle forward, left-right repeat motion, foot slide consistent, 5s loop
hit: flinch recoil → flash white → recover to idle, 5s loop
death: collapse → fade to particles/pixels → dissolve completely, end frame transparent/empty, 5s
skill: charge-up → energy buildup → release burst → cooldown return, 5s loop
spawn: appear from energy/portal → materialize → land in idle pose → ready, 5s loop
```

---

## 二、统一生成规则

### 2.1 可复制提示词流程

不要把整份文档一次发给 AI。实际生成时，先发「第一句」建立全局风格，再每次只复制一个具体资源提示词。AI 出错时，不要重发长提示词，只发纠错提示词让它重做。

**第一句，用来建立风格：**

```text
我在为一款《守护唐僧》Q版西游合成塔防微信小游戏生成可商用2D游戏素材。

美术风格：扁平国潮风（Guochao Flat）—— 扁平矢量 + 中式纹样点缀 + 2层cel明暗 + 3-4px粗轮廓线 + 高饱和配色。
角色比例：Q版2.5~3头身，身材紧凑匀称，四肢短而有力，不要过胖不要婴儿肥。头不要太大，控制在身体35-38%。
光影：单层cel shading，亮面100%+暗面75%，不要渐变过渡，不要厚涂。
线条：粗轮廓描边，比填充色深2档，小尺寸下轮廓必须清晰可读。
视角：轻微45度俯视棋盘视角，适合80×80或96×96棋盘格。
配色：基于项目调色板（金#f0c15a / 朱红#b83f35 / 青绿#35b58f / 墨蓝#101826），配色鲜明高对比。
纹样：可加简化的中式云纹、水纹、火焰纹、回纹、莲花纹点缀，但不过度装饰。

输出：透明背景PNG（真alpha通道），无文字，无水印，无灰白棋盘格。
绝对禁止：写实/3D/厚涂/渐变/像素风/剪纸/皮影/欧美魔幻/日本动画风，不模仿任何已有游戏、动画、电影或版权角色。
```

**后续每次生成新资源时，先追加这一句：**

> 以下适用于静态图（PNG/sprite sheet）生成。角色动作视频的提示词见 §2.9。

```text
请严格保持我上传的参考图风格：
- 相同的扁平国潮风（flat vector + cel shading + 粗轮廓）
- 相同的Q版2.5~3头身比和身体比例（紧凑匀称，不过胖）
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
2. Q版2.5~3头身比，身材紧凑匀称，四肢短而有力，不要婴儿肥。
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

> **适用范围：** 静态角色、道具图标、UI 组件、背景图等静态 PNG 资源的生成。角色动作动画请走「静态图 → 视频 → 截帧」路径（提示词见 §2.5.2 和 §2.9）。

**正向提示词（中文 AI 工具使用）：**

```text
为一款《守护唐僧》西游题材Q版合成塔防微信小游戏生成正式美术资源。

美术风格：扁平国潮风。具体特征：
- 扁平矢量感，2层cel shading明暗（亮面+暗面，无渐变过渡）
- 3-4px 粗轮廓描边，线条干净有力
- Q版2.5~3头身，身材紧凑匀称，四肢短而有力，不要过胖
- 配色高饱和高对比，基于项目调色板（金#f0c15a、朱红#b83f35、青绿#35b58f、墨蓝#101826）
- 适度点缀中式纹样（简化的云纹、水纹、火焰纹、回纹、莲花纹），不过度装饰
- 轻微45度俯视棋盘视角，适合80×80或96×96棋盘格显示
- 画面为2D sprite，美术风格统一

输出格式：单体静态资源输出单张透明背景PNG；多个静态资源输出等格sheet后裁切；
小兵/特效的动作优先输出横向PNG sprite sheet；如果工具无法输出一张sheet，则输出同一动作或特效的编号透明PNG帧序列。
角色/英雄/小怪的连贯动作（attack/move/death/skill/spawn）建议走视频截帧路径，静态图仅供角色外观定稿和 idle 基础帧。

绝对禁止：不要写实，不要3D，不要厚涂，不要渐变过渡，不要复杂背景，不要文字，不要水印，
不要logo，不要模仿任何已有游戏、动画、电影或版权角色风格。
```

**正向提示词（英文 AI 工具使用，Midjourney/ComfyUI/SDXL）：**

```text
A game sprite for a Chinese mythology Journey to the West mobile tower defense game.

Art style: flat vector guochao illustration, semi-chibi character 2.5-3 heads tall,
compact slim body, short but proportional limbs, not chubby or babyish.
Clean bold outlines 3-4px, 2-tone cel shading only (bright side + shadow side, no gradient),
vibrant high-contrast colors based on palette: gold #f0c15a, cinnabar red #b83f35,
jade green #35b58f, ink blue #101826.
Minimal Chinese ornament motifs (simple cloud patterns, wave lines, flame shapes, fret borders).
45-degree isometric board game view, designed for 80x80 or 96x96 grid readability.
Transparent PNG background, true alpha channel.
No text, no watermark, no complex background, no gradient shading, no 3D rendering,
no Pixar style, no anime style, no pixel art, no paper-cut style.
```

**反向提示词（中英文通用，新增体型约束）：**

```text
写实照片, 3D渲染, 厚涂, 渐变过渡, 复杂背景, 灰白棋盘格背景,
文字, 水印, logo, 模糊, 低清晰度, 恐怖血腥, 过多细节, 暗色过重,
版权角色, 已有游戏角色风格, 动画截图, 电影截图,
像素风, 赛博朋克, 欧美魔幻, 现代服装,
剪纸风格, 皮影戏风格, 扁平剪影, 纸片人, 轮廓过于生硬,
水墨画风, 水墨晕染, 素描, 油画, 水彩,
Pixar style, Disney style, anime style, manga style,
soft shading, smooth gradient, realistic lighting, detailed texture,
thin outline, no outline, photorealistic, hyperdetailed, cinematic lighting,
chubby, baby fat, toddler proportions, 2-heads-tall, overly round, marshmallow body,
kawaii overload, infantilized, Super Deformed (SD), blob-like limbs
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
| 角色动作视频（中间产物） | 5 秒无缝循环 MP4/MOV，角色原地做完整动作，首尾帧可衔接 | 运镜、场景切换、角色变形、风格漂移、背景变化 | MP4 / MOV（24fps） | 先截帧再转为 sprite sheet / PNG 帧序列（视频不入库） |
| 道具图标  | 透明背景图标 sheet 或单图                       | 带文字图标、带背景海报                   | PNG                        | PNG                                 |
| UI 组件 | 透明背景 UI 组件 sheet 或单图                   | 带中文文字的完整截图                    | PNG                        | PNG                                 |
| 背景图   | 竖屏完整背景图                                | 透明小图、视频背景                     | PNG/JPG                    | PNG/JPG                             |
| 战斗特效  | 横向透明 PNG sprite sheet，或同一特效的透明 PNG 帧序列 | 视频特效、黑底素材、不同尺寸散图、带背景散图        | PNG sprite sheet / PNG 帧序列 | 一张 PNG sprite sheet，或一组按编号命名的 PNG 帧 |
| 音效    | 短音频，例如点击、攻击、升级                         | 视频、带人声台词、长音乐                  | WAV                        | OGG/MP3                             |
| BGM   | 可循环背景音乐，首尾适合无缝循环                        | 视频、带人声歌曲、版权旋律                 | WAV                        | OGG/MP3                             |

### 2.5 动作动画与帧序列格式要求

> **角色动作有两种生成路径，按资源类型选择：**

#### 路径决策速查表

| 资源类型 | 涉及动作 | 推荐路径 | 原因 |
|---------|---------|---------|------|
| **小兵** idle/attack | idle (4帧), attack (6帧) | **路径 B（视频）** | 虽然是简单角色，但 AI 生图工具对"同一角色多帧一致"表现差；视频工具天生保证帧间角色一致性 |
| **英雄** attack/death/skill | attack (6帧), death (6帧), skill (6帧) | **路径 B（视频）** | 复杂连贯动作，必须走视频保证流畅度和帧间一致 |
| **英雄** idle/hit | idle (4帧), hit (4帧) | 路径 A 或 B | 简单动作可走 A；追求品质走 B |
| **唐僧** idle/hit/death | idle (4帧), hit (4帧), death (6帧) | **death 走 B**，idle/hit 走 A | death 涉及化光消散，视频表现更好 |
| **普通敌人** move/hit/death | move (6帧), hit (4帧), death (6帧) | **全部走 B（视频）** | 10 种敌人外观各异，AI 生图很难保持 walk cycle 一致 |
| **精英敌人** 全部 5 动作 | idle/move/attack/hit/death | **全部走 B（视频）** | 每帧 96×96 体型更大，动作更复杂 |
| **BOSS** 全部 6 动作 | idle/move/attack/hit/death/spawn | **全部走 B（视频）** | 体型最大(128×128)、帧数最多(8帧)、动作最复杂，视频路径收益最高 |
| **战斗特效**（投射物/命中/AOE/环境） | 4~8 帧 | **路径 A（sprite sheet）** | 抽象光效/粒子，不是角色生物，AI 生图直接出 sprite sheet 效果最好 |
| **法宝特效** | 6 帧 | **路径 A（sprite sheet）** | 同上，抽象视觉特效 |
| **唐僧光环** | 6 帧 | **路径 A（sprite sheet）** | 金色波纹扩散，纯特效 |
| **BOSS 技能特效** | 6~8 帧 | **路径 A（sprite sheet）** | 冲击波/力场/护盾等抽象特效 |

> **一句话决策：画面里有"角色/生物"做动作 → 路径 B；画面里只有"光效/粒子/波纹" → 路径 A。**

#### 2.5.1 路径 A：直接 sprite sheet 生成（纯特效/简单 idle）

所有战斗特效、法宝特效、光环及简单 idle 都按下面格式生成：

```text
优先输出横向 sprite sheet，透明背景，最终是一张 PNG 图片，所有帧等宽等高，从左到右依次排列。若工具无法输出一张 sheet，可以输出同一动作的多张透明 PNG 单帧图，帧号从 01 开始连续编号。角色脚底位置稳定，角色大小稳定，不要镜头运动，不要背景，不要视频，不要 GIF，不要 MP4，不要把灰白棋盘格、帧号或文字画进图片。
```

#### 2.5.2 路径 B：视频中间产物 → 截帧拼 sheet（角色动作首选）

**完整工作流：**

```text
第 1 步 — 生成视频
  上传已确认风格的静态角色参考图到 AI 视频工具（Runway Gen-3/Gen-4、Pika、Kling、Sora 等），
  使用动作视频提示词（模板见 §2.9），生成 5 秒 24fps 无缝循环 MP4。
  关键要求：首尾帧必须可以衔接（perfect loop），原地动作，角色不变形，风格不漂移，
  背景干净（纯色或透明最佳），固定机位，无运镜。

第 2 步 — 截帧
  用截帧工具（见 §2.6）按目标帧数均匀提取 PNG 帧。例如 6 帧 attack：
  从 5 秒 120 帧视频中，选取动作最清晰的 6 帧，跨度覆盖完整动作周期。
  注意避让视频首尾的衔接过渡帧（截帧区间取 0.5s~4.5s，留出首尾循环衔接余量）。

第 3 步 — 抠背景
  如果视频背景不是纯透明，用 PS/AI 抠图工具批量去背景，输出透明 PNG 单帧。

第 4 步 — 校验与拼合
  校验：所有帧尺寸一致、脚底位置稳定、角色大小一致。
  拼合：用 TexturePacker / Aseprite / 自定义脚本 拼成横向 sprite sheet，
  或直接以帧序列（{角色名}_{动作}_01.png ~ 0N.png）接入 Phaser（见 §2.10）。
```

**循环视频关键要求（写进 prompt）：**

```text
1. 首尾帧无缝衔接（seamless loop / perfect loop）：视频最后一帧与第一帧完全一致，
   循环播放时看不出接缝。
2. 角色原地做动作，脚底锚点不动，不要水平/垂直位移。
3. 动作必须是完整的周期：idle 呼吸→回原位，attack 蓄力→打出→收回，
   move 迈步→换脚→回到起始姿态。
4. 如果是 death/spawn 等非循环动作，视频末尾角色完全消失（death）
   或完全出现（spawn），抽帧后不要求首尾衔接。
5. 5 秒时间要覆盖完整动作周期，不要前面拖沓后面挤。
6. 固定镜头，无缩放，无运镜，无转场。
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

### 2.6 视频截帧工具链与操作参数

> 适用场景：角色动作走「静态图 → AI 视频 → 截帧 → sprite sheet」路径时使用。

#### 2.6.1 推荐截帧工具

| 工具 | 方式 | 适用场景 | 说明 |
|------|------|---------|------|
| **FFmpeg**（命令行） | 精确到帧的批量导出 | 所有场景，推荐首选 | 免费，一条命令批量截帧，可指定帧率/时间区间/尺寸 |
| **Aseprite** | GUI 导入视频逐帧编辑 | 需要手工精修帧时 | 付费但不贵，像素动画神器，可直接导出 sprite sheet |
| **Photoshop** | 导入视频→导出帧图层 | 需要批量抠图/修图时 | 适合视频背景非纯色需要逐帧抠图的场景 |
| **ScreenToGif** | 录屏截帧 | 临时替代方案 | 简单但精度低，不推荐用于正式素材 |
| **在线工具**（ezgif 等） | 网页上传截帧 | 临时快速预览 | 有文件大小限制，不推荐量产用 |

#### 2.6.2 FFmpeg 截帧命令速查

```bash
# 从视频均匀截取 N 帧（推荐方式）
# 例如：一个 5 秒 24fps（共 120 帧）的 attack 视频，需要 6 帧
# 先算出总帧数，再用 select 均匀抽取

# 方法 1：按帧间隔均匀截取（最常用）
ffmpeg -i input.mp4 -vf "fps=1/0.8" -q:v 2 output_%02d.png
# fps=1/0.8 表示每 0.8 秒取 1 帧，5 秒约得 6 帧

# 方法 2：指定帧数均匀截取
ffmpeg -i input.mp4 -vf "select='not(mod(n,20))'" -vsync vfr -q:v 2 output_%02d.png
# 跳过首尾衔接过渡帧，从第 12 帧开始每 20 帧抽 1 帧（总 120 帧得 6 帧）

# 方法 3：手动指定精确帧号（精确控制）
ffmpeg -i input.mp4 -vf "select='eq(n,12)+eq(n,30)+eq(n,48)+eq(n,66)+eq(n,84)+eq(n,102)'" -vsync vfr -q:v 2 output_%02d.png

# 方法 4：截取指定时间区间（跳过视频首尾循环衔接过渡）
ffmpeg -i input.mp4 -ss 0.5 -t 4.0 -vf "fps=1/0.8" -q:v 2 output_%02d.png
# -ss 0.5 从 0.5 秒开始，-t 4.0 截取 4 秒，避开首尾 0.5s 的循环衔接过渡

# 通用参数说明：
# -q:v 2        PNG 质量（1-31，越小质量越高，2 即可）
# -vf "scale=W:H"  如需统一缩放加此参数
# output_%02d.png  两位数字编号输出
```

#### 2.6.3 帧选取原则

```text
1. 均匀覆盖：6 帧 attack 覆盖 5 秒，约每 0.8 秒取 1 帧，不要前 3 帧挤在一起。
2. 关键帧锁定：动作的蓄力顶点、打击瞬间、最大伸展、收招归位 四个关键帧必须选中。
3. 避让衔接区：视频开头 0.5s 和结尾 0.5s 是循环衔接过渡，帧内容可能模糊或变形，截帧区间建议取 0.5s~4.5s。
4. 首尾可衔接：idle/move/attack 的循环动作，截出的最后 1 帧和截出的第 1 帧在视觉上应能自然衔接，
   形成播放时可无缝循环的帧序列。
5. 非循环动作例外：death（以角色完全消失结尾）、spawn（以角色完全出现结尾）不要求首尾衔接。
6. 帧数微调：如果 5 秒视频中动作偏快/偏慢，可调整截帧张数，宁可少帧流畅不要多帧卡顿。
```

#### 2.6.4 截帧后处理检查清单

```text
- [ ] 每帧尺寸一致（如 96×96），无缩放差异
- [ ] 角色脚底锚点在校准线（可叠加半透明参考线，所有帧脚底对齐）
- [ ] 背景已抠除（真 alpha 透明），无残留色块
- [ ] 帧号从 01 开始连续编号，无跳号
- [ ] 帧序列放入正确目录（例如 public/assets/heroes/）
- [ ] 用 Aseprite 或 Phaser 预览播放一遍，确认无抖动、无闪烁
```

### 2.7 静态 sheet 与切图要求

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
7 个 BOSS 横排：每格 128×128，整张 1152×128，最终裁成 7 张单图
5 个道具图标横排：每格 128×128，整张 640×128，最终裁成 5 张单图
12 个法宝图标横排：每格 128×128，整张 1536×128，最终裁成 12 张单图
8 个 UI 图标横排：每格 64×64，整张 512×64，最终裁成 8 张单图
10 个段位徽章横排：每格 96×96，整张 960×96，最终裁成 10 张单图
```

### 2.8 纠错提示词

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
2. 头身比和Q版比例要和参考图一致（2.5~3头身），不要变高、变写实、也不要变回2头身幼儿体型，不要婴儿肥。
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

**视频循环纠错（首尾不衔接时使用）：**

```text
这条视频的循环不流畅，首尾帧有明显跳变。请重新生成同一个动作的 5 秒视频，关键修正：
1. 最后一帧的画面必须与第一帧完全一致——角色姿态、位置、衣褶、光影全部对齐。
2. 5 秒内的动作必须是完整周期，结束时回到起始姿态。
3. 不要做渐暗/渐亮转场来"作弊"衔接——必须是自然动作衔接。
4. 保持角色在原地，脚底位置全程不变。
```

**视频风格漂移纠错（画面风格与静态参考图不一致时使用）：**

```text
这条视频中的角色画风和参考图不一致。请重新生成，必须把上传的参考图当作角色的唯一外观标准：
1. 角色比例、头身比（2.5~3头身，不过胖）、五官风格必须和参考图一模一样。
2. 配色、线条粗细、明暗对比必须和参考图一致。
3. 不要自动"美化"或"3D化"角色——保持和参考图一样的扁平国潮风。
4. 动作过程中角色不能变形、不能拉伸、不能变成其他风格。
```

**视频动作纠错（动作不到位/太快/太慢时使用）：**

```text
这条视频的动作有问题。请重新生成同一个动作的 5 秒视频，修正：
1. 动作节奏：5 秒内完整做完【蓄力→打击→收招】，不要前 4 秒不动最后一秒仓促。
2. 动作幅度：【描述期望幅度，如"金箍棒挥舞弧线更大""身体前冲更有力度感"】。
3. 帧率保持 24fps，动作流畅不卡顿不跳帧。
4. 仍然保持首尾帧可无缝衔接。
```

### 2.9 通用模板

> 以下模板分为三类：**静态 sheet 模板**（背景/道具/UI/角色外观）、**动作动画模板**（小兵/特效 sprite sheet，直接生成）、**动作视频模板**（角色/英雄/小怪/BOSS 连贯动作，视频截帧路径）。根据资源类型选用对应模板。

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
Q版2.5~3头身，身材紧凑匀称，四肢短而有力，不过胖。
基于项目调色板（金/朱红/青绿/墨蓝）。
可加简化中式纹样点缀，不过度装饰。

关键要求：
风格统一，小尺寸可读。
不要背景，不要灰白棋盘格，不要文字，不要编号，不要水印。
```

**动作动画模板（直接 sprite sheet，适用小兵/特效/简单 idle）：**

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

**动作视频模板（图生视频 → 截帧拼 sheet，适用角色/英雄/小怪/BOSS 的连贯动作）：**

```text
请基于我上传的角色参考图，生成该角色的【动作名】动作 5 秒循环视频。

视频规格：
- 时长：5 秒，24fps，共 120 帧
- 分辨率：【帧宽】x【帧高】（例如 96×96 或 128×128）
- 格式：MP4，高质量

核心要求 — 无缝循环：
首尾帧必须完美衔接（perfect seamless loop）。
视频最后一帧的画面必须与第一帧完全一致——角色姿态、位置、光影、衣褶全部对齐。
5 秒内完成一个完整动作周期，结束时自然回到起始姿态。

动作描述：
【详细写角色身份、武器、动作全过程。例如：
孙悟空 idle：猴王持金箍棒站立，轻微呼吸起伏，猴王冠羽微颤，
金色光环稳定环绕，金箍棒偶尔微转，身体重心在双脚间小幅度交替。
5 秒为一个完整呼吸周期，结束时回到和起始完全相同的姿态。】

角色锁定：
- 角色外观必须与我上传的参考图完全一致
- 头身比、五官、配色、线条粗细全部保持不变
- 动作过程中角色不能变形、拉伸、变成其他风格

画面约束：
- 固定机位，无缩放，无运镜，无转场
- 角色脚底锚点稳定，不上下跳动或左右位移
- 背景干净纯色（推荐浅灰或浅绿，方便后续抠图）
- 如果是透明背景输出更佳（部分工具支持）
- 不要文字、水印、logo

风格要求：
保持扁平国潮风 — flat vector + 2-tone cel shading + 粗轮廓描边，
动作节奏明快有力度，适合游戏帧动画播放。
配色基于项目调色板（金#f0c15a / 朱红#b83f35 / 青绿#35b58f / 墨蓝#101826）。

后期说明：
这段视频会被截帧工具提取关键帧，拼成 sprite sheet 用于游戏引擎播放。
请确保每一帧角色都清晰完整，便于抽帧。
```

**视频 prompt 中文版（即梦 / Kling / 可灵等中文 AI 工具使用）：**

```text
请基于我上传的角色参考图，生成该角色的【动作名】5 秒无缝循环视频。

这是一张《守护唐僧》Q版西游塔防手游的角色静态图，请把它动起来，
做一个完整的【动作名】动作循环。

硬性要求：
1. 5 秒 24fps，首尾帧必须能完美衔接循环播放，不要渐暗渐亮转场。
2. 角色原地做动作，脚底不动，镜头不动，画面不缩放不转动。
3. 角色外观严格保持参考图的样子——不要美化、3D化、或变成其他画风。
4. 动作全过程：【写具体动作描述】。
5. 背景保持干净（纯色或透明），方便后期抠图截帧。
6. 不要文字、不要水印、不要 logo。

风格：扁平国潮风 Q版，2.5~3 头身，身材紧凑不过胖，粗轮廓线，cel shading 2 层明暗，
配色高饱和高对比（金/朱红/青绿/墨蓝）。
这个视频会被逐帧截取拼成游戏 sprite sheet，请确保每帧角色都清晰完整。
```

### 2.10 Phaser 帧序列接入示例

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

### 2.11 动作名对照表

| 英文 key | 中文名 | 什么时候播放 | 循环 / 单次 | 说明 |
|---------|--------|-------------|------------|------|
| `idle` | 待机 | 角色站在棋盘上无操作时 | **循环** | 轻微呼吸起伏、武器微晃、衣袂微飘，让角色看起来"活着"而不是僵住 |
| `move` | 移动 | 敌人沿路径行走时 | **循环** | 行走/跑步/飞行循环，角色整体位移但脚底相对帧格稳定（精灵本身原地踏步，由引擎移动） |
| `attack` | 攻击 | 敌人进入攻击范围时 | **循环** | 蓄力→打出/刺出/挥砍→收招，可带攻击拖尾或光效 |
| `hit` | 受击 | 被攻击命中时 | **单次**（播完回 idle） | 短暂后仰、闪白、抖动感。给玩家"被打到了"的反馈，不能血腥 |
| `death` | 死亡 | 血量归零时 | **单次**（停末帧/消失） | 被击败→倒地/崩散→化为对应颜色光粒/烟尘消散，不能血腥。视频末尾角色完全消失 |
| `skill` | 技能 | 英雄释放主动技能时 | **单次**（播完回 idle） | 蓄力→能量爆发→冷却收回，可带光环/法阵/分身等技能特效。仅部分英雄有 |
| `spawn` | 出场 | BOSS/精英登场时 | **单次**（播完回 idle） | 从天而降/从地面钻出/从妖气中凝聚→亮相→进入待机。视频末尾角色完全出现 |

> **命名时只用英文 key**，文件命名为 `{角色名}_{key}.png` 或 `{角色名}_{key}_01.png`。写 prompt 时用中文描述对应动作过程。

| 类型 | 需要的动作 |
|------|-----------|
| 小兵 | `idle` `attack` |
| 普通敌人 | `move` `hit` `death` |
| 精英敌人 | `idle` `move` `attack` `hit` `death` |
| BOSS | `idle` `move` `attack` `hit` `death` `spawn` |
| 英雄 | `idle` `attack` `hit` `death` (+ `skill` 有技能的) |
| 唐僧 | `idle` `hit` `death` |
| 战斗特效 | `attack`/`hit`/`spawn`（按实际效果命名） |
| 投射物 | 按类型命名（`arrow`/`fireball`/`spell` 等） |

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

### 文件命名规则（全部使用中文名）

```text
小兵静态：{中文名}_{阶级}阶.png           例：灵猴兵_3阶.png
小兵动画：{中文名}_{动作}.png            例：灵猴兵_attack.png
小兵动画帧序列：{中文名}_{动作}_{帧号}.png   例：灵猴兵_attack_01.png

英雄静态：{中文名}_{阶级}阶.png           例：孙悟空_1阶.png
英雄动画：{中文名}_{动作}.png            例：孙悟空_attack.png
英雄动画帧序列：{中文名}_{动作}_{帧号}.png   例：孙悟空_attack_01.png
英雄碎片：碎片_{中文名}.png             例：碎片_孙悟空.png

敌人静态：{中文名}.png                例：小妖喽啰.png、黄风怪.png、黑熊精.png
敌人动画：{中文名}_{动作}.png            例：小妖喽啰_move.png
敌人动画帧序列：{中文名}_{动作}_{帧号}.png   例：小妖喽啰_move_01.png

法宝图标：{中文名}.png                例：开山斧.png
道具图标：{中文名}.png                例：九转仙丹.png

UI 资源：{中文名}.png                例：仙桃.png、血量.png、暂停.png
特效资源：{中文名}.png                例：召唤光圈.png
特效帧序列：{中文名}_{帧号}.png          例：召唤光圈_01.png
音频资源：{中文名}.ogg                例：按钮点击.ogg
```

`{帧号}` 统一两位数字（01, 02, 03...），不要中文编号。

### 中文名对照表

#### 小兵
| 英文 type | 中文名 |
|-----------|--------|
| monkey | 灵猴兵 |
| soldier | 天兵甲士 |
| rider | 妖王骑 |
| archer | 道法弓手 |

#### 英雄
| 英文 heroId | 中文名 |
|-------------|--------|
| sunwukong | 孙悟空 |
| zhubajie | 猪八戒 |
| shawujing | 沙悟净 |
| bailongma | 白龙马 |
| guanyin | 观音菩萨 |
| honghaier | 红孩儿 |
| nezha | 哪吒 |
| niumowang | 牛魔王 |
| erlangshen | 二郎神 |
| taishanglaojun | 太上老君 |
| heixiongjing | 黑熊精 |
| baigufuren | 白骨夫人 |
| zhizhujing | 蜘蛛精 |
| tuotatianwang | 托塔天王 |

#### 敌人
| 英文 enemyId | 中文名 |
|-------------|--------|
| xiaoyao_1 | 小妖喽啰 |
| xiaoyao_2 | 巡山妖 |
| xiaoyao_3 | 骷髅妖 |
| xiaoyao_4 | 蝙蝠妖 |
| xiaoyao_5 | 水妖 |
| xiaoyao_6 | 虾兵 |
| xiaoyao_7 | 蟹将 |
| xiaoyao_8 | 火妖 |
| xiaoyao_9 | 熔岩怪 |
| xiaoyao_10 | 狮驼小妖 |
| elite_huwei | 虎先锋 |
| elite_huangfeng | 黄风怪 |
| elite_huli | 狐狸精 |
| elite_huoyun | 火云童 |
| elite_yumian | 玉面狐 |
| elite_laoyuan | 老鼋 |
| elite_zhuyu | 蛛妖 |
| elite_kuangtou | 象兵 |
| elite_dapeng | 大鹏鹰 |
| boss_heixiongjing | 黑熊精 |
| boss_linggan | 灵感大王 |
| boss_baigufuren | 白骨夫人 |
| boss_honghaier | 红孩儿 |
| boss_tieshan | 铁扇公主 |
| boss_jinjiao | 金角大王 |
| boss_baiyan | 百眼魔君 |
| boss_dapengjinchi | 大鹏金翅雕 |
| boss_huangmei | 黄眉怪 |

#### 道具 & 法宝
| 英文 id | 中文名 |
|---------|--------|
| kaishanfu | 开山斧 |
| jiuzhuanxiandan | 九转仙丹 |
| tongyongsuipian | 通用碎片 |
| jinguzhou | 紧箍咒 |
| yujingping | 玉净瓶 |
| huishanfu | 回山符 |
| yangzhiganlu | 杨枝甘露 |
| kulounianzhu | 骷髅念珠 |
| zhaoyaojing | 照妖镜 |
| bihuozhao | 避火罩 |
| bajiaoshan | 芭蕉扇 |
| laoyuanjia | 老鼋甲 |
| ganlujinglu | 甘露净露 |
| jingangzhuo | 金刚琢 |
| jinlanjiasha | 锦斓袈裟 |

#### UI 图标
| 英文名 | 中文名 |
|--------|--------|
| ui_icon_peach | 仙桃 |
| ui_icon_hp | 血量 |
| ui_icon_wave | 波次 |
| ui_icon_kill | 击杀 |
| ui_icon_pause | 暂停 |
| ui_icon_star | 星级 |
| ui_icon_sweep | 扫荡 |
| ui_icon_ad_reward | 广告奖励 |
| ui_icon_spirit | 灵蕴 |
| ui_icon_faction_shitu | 阵营_师徒 |
| ui_icon_faction_xianfo | 阵营_仙佛 |
| ui_icon_faction_yaowang | 阵营_妖王 |
| ui_bg_battle_forest | 战斗背景_森林 |
| ui_bg_journey_map | 关卡地图背景 |

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
生成一张透明背景 2D 静态 sprite sheet，内容是《守护唐僧》Q版西游塔防小兵资源，4 行 5 列，共 20 个独立小兵。每个格子固定 80×80，整张 400×320，每个小兵完整居中，格子之间不要重叠。所有小兵风格统一，Q版2.5~3头身，身材紧凑，轮廓清晰。第一行灵猴兵 1-5 阶：金黄/棕色，小猴战士，短棍，敏捷近战。第二行天兵甲士 1-5 阶：蓝/银色，天庭甲士，长枪圆盾。第三行妖王骑 1-5 阶：紫/朱红，骑兽妖兵，重斧，厚重群攻。第四行道法弓手 1-5 阶：青绿，道袍弓手，弓箭符咒，远程法术。阶级颜色 1-5 依次白/绿/蓝/紫/橙，阶级越高装饰越华丽。透明背景，无文字/编号/水印。
```

### 3.2 小兵动作动画（8 组 sprite sheet）

> **推荐路径：路径 B（视频→截帧）。** 小兵虽然是简单角色，但 AI 生图工具对"同一角色连续多帧保持外观一致"可靠性差。视频工具天然保证帧间一致性。idle 如果只要 4 帧静态呼吸可以直接走 A。
>
> 以下为各小兵 sprite sheet 的规格（截帧拼合后的最终产物），视频 prompt 模板见 §2.9。

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

**提示词：**

**灵猴兵 idle：**
```text
生成灵猴兵 Q版西游塔防小兵 idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 320×80。金黄/棕色猴族战士，手持短棍，轻微呼吸和待机晃动，角色位置稳定。无文字/水印。
```

**灵猴兵 attack：**
```text
生成灵猴兵 Q版西游塔防小兵 attack 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 480×80。金黄/棕色猴族战士，挥舞短棍，蓄力→打出→收招，金色棍影拖尾，角色位置稳定。无文字/水印。
```

**天兵甲士 idle：**
```text
生成天兵甲士 Q版西游塔防小兵 idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 320×80。蓝/银色天庭甲士，手持长枪和圆盾，轻微呼吸起伏，盔甲微光，角色位置稳定。无文字/水印。
```

**天兵甲士 attack：**
```text
生成天兵甲士 Q版西游塔防小兵 attack 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 480×80。蓝/银色天庭甲士，持长枪向前猛刺，蓄力→突刺→收枪，银色枪尖拖尾闪光，圆盾格挡姿态，角色位置稳定。无文字/水印。
```

**妖王骑 idle：**
```text
生成妖王骑 Q版西游塔防小兵 idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 320×80。紫/朱红色骑兽妖兵，跨坐妖兽坐骑，手持重斧，妖兽呼吸起伏，妖气微散，角色位置稳定。无文字/水印。
```

**妖王骑 attack：**
```text
生成妖王骑 Q版西游塔防小兵 attack 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 480×80。紫/朱红色骑兽妖兵，挥舞重斧向下劈砍，蓄力→高举→劈下→收斧，紫色斧光拖尾，坐骑配合前冲，角色位置稳定。无文字/水印。
```

**道法弓手 idle：**
```text
生成道法弓手 Q版西游塔防小兵 idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 320×80。青绿色道袍弓手，手持长弓，背后符咒微光浮动，轻微呼吸，衣袂微飘，角色位置稳定。无文字/水印。
```

**道法弓手 attack：**
```text
生成道法弓手 Q版西游塔防小兵 attack 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 480×80。青绿色道袍弓手，搭箭拉弓射出道法符箭，拉弓→符咒凝聚箭头→释放→收弓，青色符咒箭光飞出，角色位置稳定。无文字/水印。
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

**提示词：**

**孙悟空：**
```text
基于孙悟空 stage_1 基础形态，生成升级形态静态 sheet，3 个形态横向排列，透明背景。每格 96×96，整张 288×96。stage_2（5-9级）：金箍棒更亮，金色边框更明显。stage_3（10-14级）：增加猴王冠装饰和金色爆发光。stage_4（15级满级）：金红光环最强，武器拖尾更明显。保持原角色比例、线条和色彩一致。无文字/水印。
```

**观音菩萨：**
```text
基于观音菩萨 stage_1 基础形态，生成升级形态静态 sheet，3 个形态横向排列，透明背景。每格 96×96，整张 288×96。stage_2（5-9级）：莲花座更亮，玉净瓶青绿光芒增强。stage_3（10-14级）：背后增加青色莲花光环，鎏金边框更华丽。stage_4（15级满级）：多重莲花光环盛开，治疗辉光环绕全身，青绿色鎏金边框。保持原角色比例、线条和色彩一致。无文字/水印。
```

**牛魔王：**
```text
基于牛魔王 stage_1 基础形态，生成升级形态静态 sheet，3 个形态横向排列，透明背景。每格 96×96，整张 288×96。stage_2（5-9级）：牛角更大更尖锐，暗红重甲增厚。stage_3（10-14级）：增加暗金色护肩和披风，体型更庞大。stage_4（15级满级）：暗红金光环环绕，牛角燃烧暗焰，铠甲布满妖纹，压迫感极强。保持原角色比例、线条和色彩一致。无文字/水印。
```

**红孩儿：**
```text
基于红孩儿 stage_1 基础形态，生成升级形态静态 sheet，3 个形态横向排列，透明背景。每格 96×96，整张 288×96。stage_2（5-9级）：火尖枪火焰更旺，身体周围小火苗增加。stage_3（10-14级）：火焰头发更旺盛，脚下出现小火圈。stage_4（15级满级）：全身被红橙火焰环绕，火焰光环旋转，火尖枪火焰喷射，鎏金边框耀眼。保持原角色比例、线条和色彩一致。无文字/水印。
```

**二郎神：**
```text
基于二郎神 stage_1 基础形态，生成升级形态静态 sheet，3 个形态横向排列，透明背景。每格 96×96，整张 288×96。stage_2（5-9级）：天眼微睁光芒增强，天蓝色铠甲更亮。stage_3（10-14级）：天眼全开射出光束，哮天犬虚影出现在身后。stage_4（15级满级）：天眼神光四射，全身蓝金神光环绕，长枪凝光，鎏金边框璀璨。保持原角色比例、线条和色彩一致。无文字/水印。
```

**哪吒：**
```text
基于哪吒 stage_1 基础形态，生成升级形态静态 sheet，3 个形态横向排列，透明背景。每格 96×96，整张 288×96。stage_2（5-9级）：风火轮火焰更旺，红绫飘带加长。stage_3（10-14级）：火尖枪枪尖凝光，乾坤圈出现在手腕。stage_4（15级满级）：三头六臂虚影显现，风火轮烈焰环绕，红绫飘扬如火，鎏金边框光芒四射。保持原角色比例、线条和色彩一致。无文字/水印。
```

**太上老君：**
```text
基于太上老君 stage_1 基础形态，生成升级形态静态 sheet，3 个形态横向排列，透明背景。每格 96×96，整张 288×96。stage_2（5-9级）：丹炉金光更亮，道袍紫色更浓郁。stage_3（10-14级）：丹炉悬浮身前，金色丹药环绕。stage_4（15级满级）：丹炉开启金光冲天，八卦阵图在地面旋转，道袍飘动仙风道骨，鎏金边框璀璨。保持原角色比例、线条和色彩一致。无文字/水印。
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

**提示词：**

**猪八戒：**
```text
基于猪八戒 stage_1 基础形态，生成升级形态静态 sheet，2 个形态横向排列，透明背景。每格 96×96，整张 192×96。stage_2（5-9级）：九齿钉耙更亮，护甲更厚。stage_3（10级满级）：银青边框更明显，坦克感更强。保持原角色一致。无文字/水印。
```

**沙悟净：**
```text
基于沙悟净 stage_1 基础形态，生成升级形态静态 sheet，2 个形态横向排列，透明背景。每格 96×96，整张 192×96。stage_2（5-9级）：月牙铲水纹光芒增强，蓝灰护甲更厚重。stage_3（10级满级）：蓝色水纹环绕全身，暖灰边框更明亮，防御感更强。保持原角色一致。无文字/水印。
```

**白龙马：**
```text
基于白龙马 stage_1 基础形态，生成升级形态静态 sheet，2 个形态横向排列，透明背景。每格 96×96，整张 192×96。stage_2（5-9级）：白色光芒更亮，龙形箭光更明显。stage_3（10级满级）：白色龙气环绕，钢蓝色边框泛光，穿透箭更华丽。保持原角色一致。无文字/水印。
```

**黑熊精：**
```text
基于黑熊精 stage_1 基础形态，生成升级形态静态 sheet，2 个形态横向排列，透明背景。每格 96×96，整张 192×96。stage_2（5-9级）：黑棕厚甲更重，熊掌更大。stage_3（10级满级）：黑色妖气环绕，暖灰边框变亮，体型更庞大敦实。保持原角色一致。无文字/水印。
```

**白骨夫人：**
```text
基于白骨夫人 stage_1 基础形态，生成升级形态静态 sheet，2 个形态横向排列，透明背景。每格 96×96，整张 192×96。stage_2（5-9级）：白骨轮廓更明显，灰紫色法术光增强。stage_3（10级满级）：骨白色法术环绕，暖灰边框变亮，阴冷法术感更强。保持原角色一致。无文字/水印。
```

**蜘蛛精：**
```text
基于蜘蛛精 stage_1 基础形态，生成升级形态静态 sheet，2 个形态横向排列，透明背景。每格 96×96，整张 192×96。stage_2（5-9级）：蛛网紫纹更密集，浅紫色光芒增强。stage_3（10级满级）：紫色蛛网光环扩散，暖灰边框变亮，范围减速感更强。保持原角色一致。无文字/水印。
```

**托塔天王：**
```text
基于托塔天王 stage_1 基础形态，生成升级形态静态 sheet，2 个形态横向排列，透明背景。每格 96×96，整张 192×96。stage_2（5-9级）：宝塔金光更亮，盔蓝色铠甲更厚重。stage_3（10级满级）：宝塔悬浮身前发光，鎏金边框更亮，控制感更强。保持原角色一致。无文字/水印。
```

### 4.3 英雄动作动画

> **推荐路径：attack / death / skill → 路径 B（视频→截帧）；idle / hit → 路径 A 或 B 均可。**
> 英雄的 attack（6帧）、death（6帧）、skill（6帧）涉及完整打击/死亡/技能动作周期，视频路径能保证动作流畅度和帧间角色一致。idle 的 4 帧简单呼吸可直接走 A。
>
> 以下为各英雄 sprite sheet 的最终规格，视频 prompt 模板见 §2.9。

#### 4.3.1 全部英雄 idle + attack（14名 × 2 = 28组）

所有 14 名英雄都需要 idle（4帧）和 attack（6帧），每帧 96×96。

**输出文件：**
```text
public/assets/heroes/hero_{heroId}_idle.png    (14个)
public/assets/heroes/hero_{heroId}_attack.png  (14个)
```

**提示词：**

**孙悟空 idle：**
```text
生成孙悟空 Q版西游塔防英雄 idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。猴王冠，金箍棒，金色微光环，英武待机姿态。角色位置稳定。无文字/水印。
```

**孙悟空 attack：**
```text
生成孙悟空 Q版西游塔防英雄 attack 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。从蓄力→挥舞金箍棒→收招，金色拖尾，近战爆发感。角色位置稳定。无文字/水印。
```

**猪八戒 idle：**
```text
生成猪八戒 Q版西游塔防英雄 idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。藏青 #2f7866 配色，大肚憨厚体态，肤色 #d6c2a2，手持九齿钉耙，暖灰边框，轻微呼吸腹部起伏，憨态可掬的待机姿态。角色位置稳定。无文字/水印。
```

**猪八戒 attack：**
```text
生成猪八戒 Q版西游塔防英雄 attack 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。藏青色皮肤，九齿钉耙高举→猛力向下耙击→收招，银色钯光拖尾，身体前冲，大肚惯性晃动。角色位置稳定。无文字/水印。
```

**沙悟净 idle：**
```text
生成沙悟净 Q版西游塔防英雄 idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。蓝灰 #336879 配色，水蓝色 #c2d9e8 水纹点缀，手持月牙铲，暖灰边框，稳重防御待机姿态，水纹微光浮动。角色位置稳定。无文字/水印。
```

**沙悟净 attack：**
```text
生成沙悟净 Q版西游塔防英雄 attack 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。蓝灰配色，月牙铲旋转一挥→月牙光刃飞出→收铲，水蓝色光刃拖尾，水纹波动效果。角色位置稳定。无文字/水印。
```

**白龙马 idle：**
```text
生成白龙马 Q版西游塔防英雄 idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。钢蓝 #4f7f96 配色，纯白 #ffffff 龙角头饰，手持龙形弓，暖灰边框，优雅挺立待机姿态，白色龙气微散。角色位置稳定。无文字/水印。
```

**白龙马 attack：**
```text
生成白龙马 Q版西游塔防英雄 attack 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。钢蓝白色调，拉开白龙弓→龙形穿透箭凝聚→射出，白色龙形箭光穿透飞出，龙鳞纹微光。角色位置稳定。无文字/水印。
```

**观音菩萨 idle：**
```text
生成观音菩萨 Q版西游塔防英雄 idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。青绿 #3b8f8a 配色，白色 #f5f4ff 莲花座，手持玉净瓶，鎏金边框，慈悲庄严待机姿态，青绿色治疗微光环。角色位置稳定。无文字/水印。
```

**观音菩萨 attack：**
```text
生成观音菩萨 Q版西游塔防英雄 attack 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。青绿色调，玉净瓶举起→青绿色治疗/攻击光波释放→收瓶，莲花光纹扩散。角色位置稳定。无文字/水印。
```

**红孩儿 idle：**
```text
生成红孩儿 Q版西游塔防英雄 idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。火红 #b8402f 配色，亮橙 #ff7a32 火焰头发，手持火尖枪，鎏金边框，火焰环绕的小霸王待机姿态，身上小火苗跳跃。角色位置稳定。无文字/水印。
```

**红孩儿 attack：**
```text
生成红孩儿 Q版西游塔防英雄 attack 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。火红色调，火尖枪旋转→火焰喷射刺出→收枪，橙红火焰拖尾爆裂。角色位置稳定。无文字/水印。
```

**哪吒 idle：**
```text
生成哪吒 Q版西游塔防英雄 idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。玫红 #b73f5a 配色，橙焰 #ff7f3a 风火轮，脚踏风火轮，手持火尖枪，红绫飘带，鎏金边框，灵动待机姿态，脚下火焰微旋。角色位置稳定。无文字/水印。
```

**哪吒 attack：**
```text
生成哪吒 Q版西游塔防英雄 attack 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。玫红色调，火尖枪快速刺出多重枪影→收枪，橙焰拖尾，风火轮火焰喷射加速。角色位置稳定。无文字/水印。
```

**牛魔王 idle：**
```text
生成牛魔王 Q版西游塔防英雄 idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。暗红 #6e2d2d 配色，暖金 #ffc25f 牛角，牛角重甲，手持巨斧或狼牙棒，鎏金边框，庞大威猛待机姿态，妖气暗涌。角色位置稳定。无文字/水印。
```

**牛魔王 attack：**
```text
生成牛魔王 Q版西游塔防英雄 attack 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。暗红色调，牛角重甲，巨斧高举→狂暴劈砍→地面震动裂纹→收斧，暗红妖气冲击波。角色位置稳定。无文字/水印。
```

**二郎神 idle：**
```text
生成二郎神 Q版西游塔防英雄 idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。天蓝 #34589c 配色，浅蓝 #cfe8ff 神光，额间天眼微闭，手持长枪，鎏金边框，英武神将待机姿态，天眼神光微闪。角色位置稳定。无文字/水印。
```

**二郎神 attack：**
```text
生成二郎神 Q版西游塔防英雄 attack 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。天蓝色调，天眼睁开射出一道蓝色神光→长枪跟随神光刺出→收枪，浅蓝色枪光拖尾。角色位置稳定。无文字/水印。
```

**太上老君 idle：**
```text
生成太上老君 Q版西游塔防英雄 idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。道紫 #5b4c9a 配色，丹金 #f2e18a 丹炉，身穿紫色道袍，身前丹炉悬浮，鎏金边框，仙风道骨待机姿态，丹炉金烟飘袅。角色位置稳定。无文字/水印。
```

**太上老君 attack：**
```text
生成太上老君 Q版西游塔防英雄 attack 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。道紫色调，双手掐诀→丹炉喷出金色丹药火焰→收诀，金红色道法火焰向前喷射灼烧。角色位置稳定。无文字/水印。
```

**黑熊精 idle：**
```text
生成黑熊精 Q版西游塔防英雄 idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。熊黑 #3f3a35 配色，深黑 #171514 厚甲，黑棕色熊形妖王，暖灰边框，粗壮敦实待机姿态，熊掌微握黑气缭绕。角色位置稳定。无文字/水印。
```

**黑熊精 attack：**
```text
生成黑熊精 Q版西游塔防英雄 attack 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。黑棕色调，巨大熊掌挥击→黑色妖气爪痕飞出→收招，重击感，熊躯前压。角色位置稳定。无文字/水印。
```

**白骨夫人 idle：**
```text
生成白骨夫人 Q版西游塔防英雄 idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。骨灰紫 #6c6178 配色，骨白 #ffffff 骨骼轮廓，白骨妖后造型，暖灰边框，阴冷优雅待机姿态，灰紫色法术光微闪。角色位置稳定。无文字/水印。
```

**白骨夫人 attack：**
```text
生成白骨夫人 Q版西游塔防英雄 attack 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。骨灰紫色调，双手向前推出→骨白色法术骷髅头飞出→收手，灰紫色法术拖尾。角色位置稳定。无文字/水印。
```

**蜘蛛精 idle：**
```text
生成蜘蛛精 Q版西游塔防英雄 idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。蛛紫 #60367b 配色，浅紫 #f4d6ff 蛛网纹，蜘蛛精造型，暖灰边框，妖媚待机姿态，紫色蛛网微光环绕。角色位置稳定。无文字/水印。
```

**蜘蛛精 attack：**
```text
生成蜘蛛精 Q版西游塔防英雄 attack 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。蛛紫色调，双手甩出→紫色蛛网向前展开覆盖→收回，蛛丝闪光减速效果。角色位置稳定。无文字/水印。
```

**托塔天王 idle：**
```text
生成托塔天王 Q版西游塔防英雄 idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。盔蓝 #426a8f 配色，鎏金 #f0c15a 宝塔，蓝金色铠甲，手持玲珑宝塔，暖灰边框，威严天将待机姿态，宝塔金光微闪。角色位置稳定。无文字/水印。
```

**托塔天王 attack：**
```text
生成托塔天王 Q版西游塔防英雄 attack 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。蓝金色调，宝塔高举→金色镇压光圈向前罩下→收塔，鎏金色光柱打击。角色位置稳定。无文字/水印。
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

**提示词：**

**孙悟空「破甲棍击」：**
```text
生成孙悟空技能「破甲棍击」动作特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。孙悟空高举金箍棒→金色棍棒重击地面→金色冲击波从打击点向外圆形扩散→棍棒回弹，金色裂纹碎片飞溅，整张画面以孙悟空和冲击波为中心。角色位置稳定。无文字/水印。
```

**观音菩萨「莲花护盾」：**
```text
生成观音菩萨技能「莲花护盾」动作特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。观音双手合十→青绿色莲花在身前绽放→莲花花瓣向外展开形成护盾光圈→光圈稳定环绕，青绿色辉光柔和治愈，莲花纹样隐约浮动。角色位置稳定。无文字/水印。
```

**哪吒「三头六臂」：**
```text
生成哪吒技能「三头六臂」动作特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。哪吒身体迸发金光→两侧和上方浮现额外的头和手臂虚影→六臂同时持火尖枪刺出多重枪影→橙红色枪光交织→虚影收回，快速连刺感。角色位置稳定。无文字/水印。
```

**红孩儿「三昧真火」：**
```text
生成红孩儿技能「三昧真火」动作特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。红孩儿身体收缩蓄力→红橙色火焰从身体内部向外猛烈爆发→火焰光环扩散→火苗飞溅→残留火焰烟气→逐渐收敛，高温火焰喷射感。角色位置稳定。无文字/水印。
```

**白骨夫人「召唤分身」：**
```text
生成白骨夫人技能「召唤分身」动作特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。白骨夫人身体泛起灰紫色暗光→身体向侧面分裂→一个半透明白骨分身从主体剥离→分身逐渐凝实→本体与分身并肩而立，灰紫法术烟雾缭绕。角色位置稳定。无文字/水印。
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

## 六、敌人资源（10普通+9精英+9BOSS=28种）

> **MVP 必做：** 全部静态图 + 每个类型选1个做全套动画（共约30组）
> **MVP 可后补：** 其余敌人的动画

### 5.1 普通敌人静态图（10 张）

| enemyId | 名称 | 视觉特征 |
|---------|------|---------|
| xiaoyao_1 | 小妖喽啰 | 棕绿，山林小妖怪，持短刀 |
| xiaoyao_2 | 巡山妖 | 橙棕虎纹，猛兽幼体 |
| xiaoyao_3 | 骷髅妖 | 白骨轮廓，灰白，亡骨主题 |
| xiaoyao_4 | 蝙蝠妖 | 白骨持刀，白虎岭士兵感 |
| xiaoyao_5 | 水妖 | 蓝绿，水纹感 |
| xiaoyao_6 | 虾兵 | 蓝灰，甲壳和长枪 |
| xiaoyao_7 | 蟹将 | 灰蓝，大钳和甲壳 |
| xiaoyao_8 | 火妖 | 红橙，火焰轮廓 |
| xiaoyao_9 | 熔岩怪 | 暗红岩石，橙色裂纹 |
| xiaoyao_10 | 狮驼小妖 | 暗绿兽面，狮驼岭杂兵感 |

**输出文件：**
```text
public/assets/enemies/enemy_xiaoyao_1.png ~ enemy_xiaoyao_10.png
```

**提示词：**
```text
生成一张透明背景 2D 静态 sprite sheet，10 个《守护唐僧》Q版西游普通敌人横向排列。每格 80×80，整张 800×80。统一45度俯视移动方向。依次：小妖喽啰（棕绿山林杂兵）、巡山妖（橙棕虎纹）、骷髅妖（灰白骨骼）、蝙蝠妖（白骨持刀）、水妖（蓝绿水纹）、虾兵（蓝灰甲壳长枪）、蟹将（灰蓝大钳甲壳）、火妖（红橙火焰）、熔岩怪（暗红岩石橙裂纹）、狮驼小妖（暗绿兽面杂兵）。Q版但有威胁感，轮廓清晰。透明背景，无文字/水印。
```

### 5.2 精英敌人静态图（9 张，每章 1 个）

| enemyId | 名称 | 章节 | 视觉特征 | 尺寸 |
|---------|------|------|---------|------|
| elite_huwei | 虎先锋 | Ch1 | 橙棕虎纹，敏捷巡山妖 | 96×96 |
| elite_huangfeng | 黄风怪 | Ch2 | 黄褐风纹沙尘，精英体型 | 96×96 |
| elite_huli | 狐狸精 | Ch3 | 粉紫狐耳狐尾，灵巧感 | 96×96 |
| elite_huoyun | 火云童 | Ch4 | 红橙火焰童妖，持火尖枪 | 96×96 |
| elite_yumian | 玉面狐 | Ch5 | 紫粉妖媚狐女，持芭蕉扇 | 96×96 |
| elite_laoyuan | 老鼋 | Ch6 | 灰绿巨龟，甲壳防御感 | 96×96 |
| elite_zhuyu | 蛛妖 | Ch7 | 暗紫蛛身，八足蛛网 | 96×96 |
| elite_kuangtou | 象兵 | Ch8 | 灰色重甲大象轮廓，重型感 | 96×96 |
| elite_dapeng | 大鹏鹰 | Ch9 | 蓝紫宽大翅膀，高速飞行感 | 96×96 |

**输出文件：**
```text
public/assets/enemies/enemy_elite_huwei.png
public/assets/enemies/enemy_elite_huangfeng.png
public/assets/enemies/enemy_elite_huli.png
public/assets/enemies/enemy_elite_huoyun.png
public/assets/enemies/enemy_elite_yumian.png
public/assets/enemies/enemy_elite_laoyuan.png
public/assets/enemies/enemy_elite_zhuyu.png
public/assets/enemies/enemy_elite_kuangtou.png
public/assets/enemies/enemy_elite_dapeng.png
```

**提示词：**
```text
生成一张透明背景 2D 静态 sprite sheet，9 个《守护唐僧》Q版西游精英敌人横向排列。每格 96×96，整张 864×96。比普通敌人体型更大，轮廓更强。依次：虎先锋（橙棕虎纹敏捷）、黄风怪（黄褐风纹沙尘）、狐狸精（粉紫狐耳狐尾灵巧）、火云童（红橙火焰童妖）、玉面狐（紫粉妖媚狐女）、老鼋（灰绿巨龟甲壳）、蛛妖（暗紫蛛身八足）、象兵（灰重甲大象轮廓）、大鹏鹰（蓝紫宽翅高速飞行）。透明背景，无文字/水印。
```

### 5.3 BOSS 静态图（9 张）

| enemyId | 名称 | 视觉特征 | 尺寸 |
|---------|------|---------|------|
| boss_heixiongjing | 黑熊精 | 黑棕重甲大体型 | 128×128 |
| boss_linggan | 灵感大王 | 金红鱼鳞水系妖怪 | 128×128 |
| boss_baigufuren | 白骨夫人 | 白骨紫灰阴冷法术感 | 128×128 |
| boss_honghaier | 红孩儿 | 红橙火焰火尖枪火焰光环 | 128×128 |
| boss_tieshan | 铁扇公主 | 翠绿罗刹芭蕉扇法器 | 128×128 |
| boss_jinjiao | 金角大王 | 金色角冠金棕配色法宝感 | 128×128 |
| boss_baiyan | 百眼魔君 | 暗紫多目蜈蚣精毒雾感 | 128×128 |
| boss_dapengjinchi | 大鹏金翅雕 | 蓝金巨鸟大翅膀高速压迫感 | 128×128 |
| boss_huangmei | 黄眉怪 | 金袍黄眉假佛法相人种袋 | 128×128 |

**输出文件：**
```text
public/assets/enemies/enemy_boss_heixiongjing.png
public/assets/enemies/enemy_boss_linggan.png
public/assets/enemies/enemy_boss_baigufuren.png
public/assets/enemies/enemy_boss_honghaier.png
public/assets/enemies/enemy_boss_tieshan.png
public/assets/enemies/enemy_boss_jinjiao.png
public/assets/enemies/enemy_boss_baiyan.png
public/assets/enemies/enemy_boss_dapengjinchi.png
public/assets/enemies/enemy_boss_huangmei.png
```

**提示词：**
```text
生成一张透明背景 2D 静态 sprite sheet，9 个《守护唐僧》Q版西游 BOSS 横向排列。每格 128×128，整张 896×128。体型明显大于普通敌人，压迫感强。依次：黑熊精（黑棕重甲）、灵感大王（金红鱼鳞水系）、白骨夫人（白骨紫灰法术感）、红孩儿（红橙火焰火尖枪）、铁扇公主（翠绿罗刹芭蕉扇）、金角大王（金角冠法宝感）、百眼魔君（暗紫多目毒雾）、大鹏金翅雕（蓝金巨鸟大翅）、黄眉怪（金袍黄眉假佛法相）。Q版但有威胁感。透明背景，无文字/水印。
```

### 5.4 普通敌人动作动画（10种 × 3动作 = 30组）

> **推荐路径：全部走 路径 B（视频→截帧）。** 10 种敌人外观各异，AI 生图工具很难保证每种 walk cycle 6 帧角色外观一致。每种敌人先做静态图定外观 → 视频生成 move/hit/death 三个动作 → 截帧拼合。

每帧 80×80。

**输出文件（以 xiaoyao_1 为例）：**
```text
public/assets/enemies/enemy_xiaoyao_1_move.png    (6帧 480×80)
public/assets/enemies/enemy_xiaoyao_1_hit.png     (4帧 320×80)
public/assets/enemies/enemy_xiaoyao_1_death.png   (6帧 480×80)
; xiaoyao_2 ~ xiaoyao_10 同理
```

**提示词：**

**小妖喽啰 move：**
```text
生成小妖喽啰 Q版西游塔防敌人 move 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 480×80。棕绿色山林小妖怪，Q版小体型，手持短刀，灵活碎步小跑前进，草木色妖气微散。角色位置稳定。无文字/水印。
```

**小妖喽啰 hit：**
```text
生成小妖喽啰 Q版西游塔防敌人 hit 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 320×80。受击闪白、后仰抖动，不能血腥。角色位置稳定。无文字/水印。
```

**小妖喽啰 death：**
```text
生成小妖喽啰 Q版西游塔防敌人 death 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 480×80。从受击→倒下→化为烟尘消散，不能血腥。角色位置稳定。无文字/水印。
```

**骷髅妖 move：**
```text
生成骷髅妖 Q版西游塔防敌人 move 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 480×80。灰白色骨骼轮廓的小型骷髅妖，骨架结构Q版简化，骨骼关节僵硬但诡异的蹒跚前进移动，骨节碰撞微颤。角色位置稳定。无文字/水印。
```

**骷髅妖 hit：**
```text
生成骷髅妖 Q版西游塔防敌人 hit 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 320×80。灰白骷髅妖受击骨骼散架微微分离→重新聚合，骨头震动感，不能血腥。角色位置稳定。无文字/水印。
```

**骷髅妖 death：**
```text
生成骷髅妖 Q版西游塔防敌人 death 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 480×80。骷髅骨架散开→骨头碎片坠落→化为灰白骨粉消散，不能血腥。角色位置稳定。无文字/水印。
```

**巡山妖 move：**
```text
生成巡山妖 Q版西游塔防敌人 move 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 480×80。橙棕色虎纹小型巡山妖，Q版幼虎猛兽造型，四足小跑前进，虎尾摆动，橙棕妖气微散。角色位置稳定。无文字/水印。
```

**巡山妖 hit：**
```text
生成巡山妖 Q版西游塔防敌人 hit 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 320×80。橙棕巡山妖受击身体后缩→虎尾炸毛竖立→虎纹短暂暗下→恢复低吼警戒姿态，不能血腥。角色位置稳定。无文字/水印。
```

**巡山妖 death：**
```text
生成巡山妖 Q版西游塔防敌人 death 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 480×80。巡山妖踉跄→侧倒→虎纹逐渐黯淡→身体化为橙棕色烟尘飘散，不能血腥。角色位置稳定。无文字/水印。
```

**蝙蝠妖 move：**
```text
生成蝙蝠妖 Q版西游塔防敌人 move 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 480×80。白骨持刀的白虎岭士兵，Q版白骨身躯披残破盔甲，手持骨刀，骨架步伐整齐前进，白骨寒气微散。角色位置稳定。无文字/水印。
```

**蝙蝠妖 hit：**
```text
生成蝙蝠妖 Q版西游塔防敌人 hit 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 320×80。蝙蝠妖受击骨架震动→骨刀微落→身体后缩→骨架重新站稳，不能血腥。角色位置稳定。无文字/水印。
```

**蝙蝠妖 death：**
```text
生成蝙蝠妖 Q版西游塔防敌人 death 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 480×80。蝙蝠妖骨架崩散→骨刀断裂坠地→白骨逐块碎裂→化为灰白骨粉飘散，不能血腥。角色位置稳定。无文字/水印。
```

**水妖 move：**
```text
生成水妖 Q版西游塔防敌人 move 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 480×80。蓝绿色水纹感的水妖，半透明水态身体，如水波滑动前进，水纹涟漪在脚下扩散，蓝绿色水光流动。角色位置稳定。无文字/水印。
```

**水妖 hit：**
```text
生成水妖 Q版西游塔防敌人 hit 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 320×80。蓝绿水妖受击身体水花飞溅→水面波动→重新凝聚，不能血腥。角色位置稳定。无文字/水印。
```

**水妖 death：**
```text
生成水妖 Q版西游塔防敌人 death 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 480×80。水妖身体崩散→化为蓝绿水花四溅→水渍蒸发消散，不能血腥。角色位置稳定。无文字/水印。
```

**虾兵 move：**
```text
生成虾兵 Q版西游塔防敌人 move 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 480×80。蓝灰色甲壳虾兵，龙虾状Q版造型，手持长枪，甲壳腿多足爬行前进，长枪横持。角色位置稳定。无文字/水印。
```

**虾兵 hit：**
```text
生成虾兵 Q版西游塔防敌人 hit 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 320×80。蓝灰虾兵受击甲壳震动→长枪微落→身体后缩发抖，不能血腥。角色位置稳定。无文字/水印。
```

**虾兵 death：**
```text
生成虾兵 Q版西游塔防敌人 death 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 480×80。虾兵甲壳碎裂→身体翻倒→触须垂落→化为蓝灰泡沫消散，不能血腥。角色位置稳定。无文字/水印。
```

**蟹将 move：**
```text
生成蟹将 Q版西游塔防敌人 move 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 480×80。灰蓝色大钳蟹将，横着行走的螃蟹造型，双臂巨大蟹钳张开威慑，厚重甲壳，横行霸道前进。角色位置稳定。无文字/水印。
```

**蟹将 hit：**
```text
生成蟹将 Q版西游塔防敌人 hit 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 320×80。灰蓝蟹将受击大钳交叉护体→甲壳震动→钳子微张，不能血腥。角色位置稳定。无文字/水印。
```

**蟹将 death：**
```text
生成蟹将 Q版西游塔防敌人 death 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 480×80。蟹将甲壳龟裂→大钳脱落→身体缩进壳中→化为灰蓝泡沫消散，不能血腥。角色位置稳定。无文字/水印。
```

**火妖 move：**
```text
生成火妖 Q版西游塔防敌人 move 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 480×80。红橙色火焰轮廓的火妖，身体仿佛燃烧的火焰构成，火苗随移动飘舞前进，脚下留下小火苗。角色位置稳定。无文字/水印。
```

**火妖 hit：**
```text
生成火妖 Q版西游塔防敌人 hit 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 320×80。红橙火妖受击火焰收缩→火光变暗闪白→火焰重新燃起。角色位置稳定。无文字/水印。
```

**火妖 death：**
```text
生成火妖 Q版西游塔防敌人 death 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 480×80。火妖火焰逐渐减弱→火苗熄灭→只剩一缕青烟→烟散无形。角色位置稳定。无文字/水印。
```

**熔岩怪 move：**
```text
生成熔岩怪 Q版西游塔防敌人 move 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 480×80。暗红色岩石身躯的熔岩怪，身体裂缝透出橙色岩浆光芒，沉重缓慢前进，每一步地面微震，橙色裂纹随移动明暗变化。角色位置稳定。无文字/水印。
```

**熔岩怪 hit：**
```text
生成熔岩怪 Q版西游塔防敌人 hit 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 320×80。暗红熔岩怪受击岩石碎屑飞溅→橙色裂纹短暂变暗→重新亮起，震动感。角色位置稳定。无文字/水印。
```

**熔岩怪 death：**
```text
生成熔岩怪 Q版西游塔防敌人 death 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 480×80。熔岩怪岩石身体崩裂→内部岩浆冷却变暗→碎成一堆暗色石块→石块化为灰烬，不能血腥。角色位置稳定。无文字/水印。
```

**狮驼小妖 move：**
```text
生成狮驼小妖 Q版西游塔防敌人 move 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 480×80。暗红棕色狮驼岭杂兵小妖，兽头小妖造型，手持弯刀，成群冲锋感的小跑前进，妖气尾随。角色位置稳定。无文字/水印。
```

**狮驼小妖 hit：**
```text
生成狮驼小妖 Q版西游塔防敌人 hit 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 320×80。暗红棕狮驼小妖受击后仰→弯刀脱手→身体后缩，不能血腥。角色位置稳定。无文字/水印。
```

**狮驼小妖 death：**
```text
生成狮驼小妖 Q版西游塔防敌人 death 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 80×80，整张 480×80。狮驼小妖踉跄跪倒→身体消散→化为暗红棕烟尘和妖气飘散，不能血腥。角色位置稳定。无文字/水印。
```

### 5.5 精英敌人动作动画（9种 × 5动作 = 45组——MVP只做虎先锋/黄风怪/狐狸精/象兵/大鹏鹰5种）

> **推荐路径：全部走 路径 B（视频→截帧）。** 精英体型更大(96×96)、动作更多(5种)，idle/move/attack/hit/death 全套走视频保证品质。先做静态图定外观 → 逐动作生成视频 → 截帧。

每帧 96×96。

**输出文件（以 elite_huangfeng 为例）：**
```text
public/assets/enemies/enemy_elite_huangfeng_idle.png    (4帧 384×96)
public/assets/enemies/enemy_elite_huangfeng_move.png    (6帧 576×96)
public/assets/enemies/enemy_elite_huangfeng_attack.png  (6帧 576×96)
public/assets/enemies/enemy_elite_huangfeng_hit.png     (4帧 384×96)
public/assets/enemies/enemy_elite_huangfeng_death.png   (6帧 576×96)
; 其余8个精英同理
```

**提示词：**

> 以下为 MVP 5 种精英的动作提示词（虎先锋/黄风怪/狐狸精/象兵/大鹏鹰）。其余 4 种（火云童/玉面狐/老鼋/蛛妖）用 §2.9 视频模板 + 对应静态参考图生成。

**虎先锋 idle：**
```text
生成虎先锋 Q版西游塔防精英敌人 idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。橙棕色虎纹精英巡山妖，体型比普通巡山妖更大更威猛，虎纹鲜艳，虎爪锐利，虎尾慢摇，低伏蓄势的敏捷型待机姿态。角色位置稳定。无文字/水印。
```

**虎先锋 move：**
```text
生成虎先锋 Q版西游塔防精英敌人 move 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。橙棕虎纹精英巡山妖，四足矫健奔跑前进，虎尾在身后甩动保持平衡，每一步轻捷有力，虎纹妖气微散。角色位置稳定。无文字/水印。
```

**虎先锋 attack：**
```text
生成虎先锋 Q版西游塔防精英敌人 attack 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。橙棕虎纹精英巡山妖，虎爪蓄力→迅猛向前挥出利爪→橙色爪痕光弧飞出一收回，虎躯前扑爆发感。角色位置稳定。无文字/水印。
```

**虎先锋 hit：**
```text
生成虎先锋 Q版西游塔防精英敌人 hit 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。橙棕虎纹巡山妖受击虎躯一震→身体后缩怒嚎→虎纹短暂暗下→重新伏低恢复戒备，不能血腥。角色位置稳定。无文字/水印。
```

**虎先锋 death：**
```text
生成虎先锋 Q版西游塔防精英敌人 death 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。虎先锋虎纹逐条黯淡→虎躯侧倒→身体缩小→化为橙棕色虎形妖气消散，不能血腥。角色位置稳定。无文字/水印。
```

**黄风怪 idle：**
```text
生成黄风怪 Q版西游塔防精英敌人 idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。黄褐色风纹沙尘环绕的精英妖王，体型比普通敌人更大，黄褐长袍，沙尘微旋，妖气逼人的待机姿态。角色位置稳定。无文字/水印。
```

**黄风怪 move：**
```text
生成黄风怪 Q版西游塔防精英敌人 move 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。黄褐色风纹沙尘妖王，御风而行，沙尘在脚下旋转推进，衣袍飘动，黄沙尾随。角色位置稳定。无文字/水印。
```

**黄风怪 attack：**
```text
生成黄风怪 Q版西游塔防精英敌人 attack 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。黄褐色风纹妖王，双手推出→黄沙风暴向前方席卷→收招，沙尘暴旋转冲击，黄褐色旋风。角色位置稳定。无文字/水印。
```

**黄风怪 hit：**
```text
生成黄风怪 Q版西游塔防精英敌人 hit 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。黄褐色风妖受击，沙尘短暂散开→身体后仰→风沙重新聚拢，不能血腥。角色位置稳定。无文字/水印。
```

**黄风怪 death：**
```text
生成黄风怪 Q版西游塔防精英敌人 death 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。黄风怪沙尘崩散→身体化为黄沙流散→风停沙落→消散于风中，不能血腥。角色位置稳定。无文字/水印。
```

**狐狸精 idle：**
```text
生成狐狸精 Q版西游塔防精英敌人 idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。粉紫色狐耳狐尾的精英妖狐，灵巧妖媚造型，粉色狐尾轻摆，狐耳微动，灵巧机敏的待机姿态。角色位置稳定。无文字/水印。
```

**狐狸精 move：**
```text
生成狐狸精 Q版西游塔防精英敌人 move 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。粉紫狐妖，轻盈跳跃前进，狐尾在身后飘舞，步伐灵巧无声。角色位置稳定。无文字/水印。
```

**狐狸精 attack：**
```text
生成狐狸精 Q版西游塔防精英敌人 attack 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。粉紫狐妖，利爪挥出→粉紫色爪痕光弧飞出→收爪，狐尾配合甩动。角色位置稳定。无文字/水印。
```

**狐狸精 hit：**
```text
生成狐狸精 Q版西游塔防精英敌人 hit 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。粉紫狐妖受击身体后翻→狐尾炸毛→恢复警戒姿态，不能血腥。角色位置稳定。无文字/水印。
```

**狐狸精 death：**
```text
生成狐狸精 Q版西游塔防精英敌人 death 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。狐狸精倒下→身体缩小→化为粉色狐火→狐火熄灭消散，不能血腥。角色位置稳定。无文字/水印。
```

**象兵 idle：**
```text
生成象兵 Q版西游塔防精英敌人 idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。灰色重甲大象轮廓的精英象兵，庞大厚重的象形重甲战士，长鼻微摆，重型压迫感待机姿态。角色位置稳定。无文字/水印。
```

**象兵 move：**
```text
生成象兵 Q版西游塔防精英敌人 move 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。灰色重甲象兵，四足沉重踏步前进，每一步地面微震，重甲碰撞闷响感，缓慢但不可阻挡。角色位置稳定。无文字/水印。
```

**象兵 attack：**
```text
生成象兵 Q版西游塔防精英敌人 attack 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。灰色重甲象兵，长鼻高高扬起→猛力向下抽打地面→灰色冲击波→收鼻，重型碾压打击感。角色位置稳定。无文字/水印。
```

**象兵 hit：**
```text
生成象兵 Q版西游塔防精英敌人 hit 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。灰色象兵受击重甲震动→身体微退→重甲闷响恢复，不能血腥。角色位置稳定。无文字/水印。
```

**象兵 death：**
```text
生成象兵 Q版西游塔防精英敌人 death 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。象兵重甲崩裂→庞大身躯轰然倒地→地面震动裂纹→化为灰色尘烟消散，不能血腥。角色位置稳定。无文字/水印。
```

**大鹏鹰 idle：**
```text
生成大鹏鹰 Q版西游塔防精英敌人 idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。蓝紫色宽大翅膀的精英大鹏鹰，巨鸟造型，双翼半张，高速飞行感，蓝紫羽毛微光，翅膀轻微扇动待机。角色位置稳定。无文字/水印。
```

**大鹏鹰 move：**
```text
生成大鹏鹰 Q版西游塔防精英敌人 move 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。蓝紫巨翅大鹏鹰，展翅高速飞行俯冲前进，翅膀强力下拍，气流在翼尖划过。角色位置稳定。无文字/水印。
```

**大鹏鹰 attack：**
```text
生成大鹏鹰 Q版西游塔防精英敌人 attack 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。蓝紫大鹏鹰，双翼后收→猛然向前扇出蓝色风刃→风刃飞出→收翅，高速风刃切割。角色位置稳定。无文字/水印。
```

**大鹏鹰 hit：**
```text
生成大鹏鹰 Q版西游塔防精英敌人 hit 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。蓝紫大鹏鹰受击翅膀收缩→身体下坠→羽毛散落几片→重新稳住，不能血腥。角色位置稳定。无文字/水印。
```

**大鹏鹰 death：**
```text
生成大鹏鹰 Q版西游塔防精英敌人 death 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。大鹏鹰翅膀折断→旋转坠落→身体化为蓝紫色羽毛飘散→羽毛消失，不能血腥。角色位置稳定。无文字/水印。
```

### 5.6 BOSS 动作动画（9种 × 6动作 = 54组）

> **推荐路径：全部走 路径 B（视频→截帧），收益最高。** BOSS 体型最大(128×128)、帧数最多(attack/death/spawn 8帧)、动作最复杂（含 spawn 出场动画），是所有资源中视频路径收益最高的类别。spawn 是非循环动作（末尾角色完全出现），其他 idle/move/attack/hit/death 都要求无缝循环。

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

**提示词：**

**黑熊精 idle：**
```text
生成黑熊精 Q版西游塔防 BOSS idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 512×128。黑棕色重甲巨型熊妖，Q版但体型巨大压迫感十足，黑棕厚甲覆盖全身，熊掌粗壮，低沉呼吸沉重起伏待机姿态。角色位置稳定。无文字/水印。
```

**黑熊精 move：**
```text
生成黑熊精 Q版西游塔防 BOSS move 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。黑棕重甲熊妖，四足沉重踱步前进，每一步地面震荡，厚重铠甲碰撞，黑色妖气尾随。角色位置稳定。无文字/水印。
```

**黑熊精 attack：**
```text
生成黑熊精 Q版西游塔防 BOSS attack 动作，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 1024×128。黑棕重甲熊妖，巨型熊掌蓄力高举→猛力向下拍击→黑色冲击波爆发→地面龟裂→收掌，毁灭性重击感。角色位置稳定。无文字/水印。
```

**黑熊精 hit：**
```text
生成黑熊精 Q版西游塔防 BOSS hit 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 512×128。黑棕熊妖受击，重甲震动碎屑飞溅→身体微退怒嚎→稳回姿态，不能血腥。角色位置稳定。无文字/水印。
```

**黑熊精 death：**
```text
生成黑熊精 Q版西游塔防 BOSS death 动作，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 1024×128。黑熊精重甲逐块崩裂→庞大身躯沉重倒地→地面剧烈震动→黑色妖气冲天→身体化为黑烟消散，不能血腥。角色位置稳定。无文字/水印。
```

**黑熊精 spawn：**
```text
生成黑熊精 Q版西游塔防 BOSS spawn 出场动画，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 1024×128。一道黑色妖气柱从地面冲天而起→黑烟旋转凝聚→黑熊精从妖气中现身→重甲着身→仰天咆哮，BOSS登场压迫感。角色位置稳定。无文字/水印。
```

**金角大王 idle：**
```text
生成金角大王 Q版西游塔防 BOSS idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 512×128。金色角冠金棕色妖王造型，头顶巨大金色角冠，金棕色法宝在身旁悬浮，威严傲慢的待机姿态。角色位置稳定。无文字/水印。
```

**金角大王 move：**
```text
生成金角大王 Q版西游塔防 BOSS move 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。金角冠金棕妖王，御风浮空缓行前进，金角闪烁光芒，法宝环绕跟随，妖气金棕。角色位置稳定。无文字/水印。
```

**金角大王 attack：**
```text
生成金角大王 Q版西游塔防 BOSS attack 动作，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 1024×128。金角冠妖王，手中法宝高举→金色吸收光束从法宝射出→光束笼罩目标→吸回法宝，法宝吸收感。角色位置稳定。无文字/水印。
```

**金角大王 hit：**
```text
生成金角大王 Q版西游塔防 BOSS hit 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 512×128。金角大王受击金冠震动→身体后仰→金棕光芒短暂暗下恢复，不能血腥。角色位置稳定。无文字/水印。
```

**金角大王 death：**
```text
生成金角大王 Q版西游塔防 BOSS death 动作，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 1024×128。金角大王金冠碎裂→法宝逐一坠地→身体被金色光芒吞噬→金光消散化为粉末，不能血腥。角色位置稳定。无文字/水印。
```

**金角大王 spawn：**
```text
生成金角大王 Q版西游塔防 BOSS spawn 出场动画，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 1024×128。天空降下金色光柱→金色法宝从光柱中飞出旋转→金角大王在法宝环绕中出现→金冠闪烁，BOSS登场威压感。角色位置稳定。无文字/水印。
```

**红孩儿 idle：**
```text
生成红孩儿（BOSS版）Q版西游塔防 BOSS idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 512×128。红橙色火焰妖童造型，比英雄版更大更狂暴，手持巨型火尖枪，红橙火焰光环环绕全身，火焰头发猛烈燃烧，小霸王待机姿态。角色位置稳定。无文字/水印。
```

**红孩儿 move：**
```text
生成红孩儿（BOSS版）Q版西游塔防 BOSS move 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。红橙火焰妖童，脚踏火焰向前冲锋前进，每一步留下火焰脚印，火尖枪拖地火星四溅，火焰光环随行。角色位置稳定。无文字/水印。
```

**红孩儿 attack：**
```text
生成红孩儿（BOSS版）Q版西游塔防 BOSS attack 动作，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 1024×128。红橙火焰妖童，火尖枪旋转蓄力→向前猛刺→红橙色巨大火球从枪尖喷射而出→火焰爆裂扩散→收枪，烈焰焚天感。角色位置稳定。无文字/水印。
```

**红孩儿 hit：**
```text
生成红孩儿（BOSS版）Q版西游塔防 BOSS hit 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 512×128。红孩儿受击火焰短暂暗灭→身体后仰怒视→火焰重新猛烈燃起。角色位置稳定。无文字/水印。
```

**红孩儿 death：**
```text
生成红孩儿（BOSS版）Q版西游塔防 BOSS death 动作，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 1024×128。红孩儿火焰光环逐一崩碎→火尖枪坠地→身体火焰从猛烈到微弱→最终化为一缕青烟消散，不能血腥。角色位置稳定。无文字/水印。
```

**红孩儿 spawn：**
```text
生成红孩儿（BOSS版）Q版西游塔防 BOSS spawn 出场动画，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 1024×128。地面炸裂喷出冲天火柱→火焰中红孩儿从天而降→火尖枪横指→火焰光环展开→仰天大笑，BOSS登场爆裂感。角色位置稳定。无文字/水印。
```

**白骨夫人 idle：**
```text
生成白骨夫人（BOSS版）Q版西游塔防 BOSS idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 512×128。白骨紫灰色阴冷妖后造型，比英雄版更大更阴森，白骨轮廓清晰，灰紫色法术能量环绕，紫灰雾气弥漫，阴冷待机姿态。角色位置稳定。无文字/水印。
```

**白骨夫人 move：**
```text
生成白骨夫人（BOSS版）Q版西游塔防 BOSS move 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。白骨紫灰妖后，悬浮漂移前进，脚下灰紫妖雾铺路，白骨轮廓在雾中若隐若现，诡异飘行。角色位置稳定。无文字/水印。
```

**白骨夫人 attack：**
```text
生成白骨夫人（BOSS版）Q版西游塔防 BOSS attack 动作，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 1024×128。白骨妖后，双手结印→身前地面裂开→多个白骨小妖从黑烟中爬出→收印，召唤亡灵大军感。角色位置稳定。无文字/水印。
```

**白骨夫人 hit：**
```text
生成白骨夫人（BOSS版）Q版西游塔防 BOSS hit 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 512×128。白骨夫人受击白骨轮廓短暂散开→紫灰法术光暗下→重新凝聚。角色位置稳定。无文字/水印。
```

**白骨夫人 death：**
```text
生成白骨夫人（BOSS版）Q版西游塔防 BOSS death 动作，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 1024×128。白骨夫人白骨结构逐节崩解→紫灰妖雾急速扩散→身体化为白骨粉末→被风吹散，不能血腥。角色位置稳定。无文字/水印。
```

**白骨夫人 spawn：**
```text
生成白骨夫人（BOSS版）Q版西游塔防 BOSS spawn 出场动画，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 1024×128。地面浮现巨大紫灰色法阵→白骨从法阵中央拼合升起→白骨夫人由骨架逐渐覆盖血肉皮肤→灰紫法术爆发，BOSS登场诡异感。角色位置稳定。无文字/水印。
```

**大鹏金翅雕 idle：**
```text
生成大鹏金翅雕 Q版西游塔防 BOSS idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 512×128。蓝金色巨型神鸟，金色翅膀边缘蓝羽点缀，展翼遮天，金色神光环绕，高傲俯瞰待机姿态，高速飞行蓄势感。角色位置稳定。无文字/水印。
```

**大鹏金翅雕 move：**
```text
生成大鹏金翅雕 Q版西游塔防 BOSS move 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。蓝金巨鸟，巨翼扇动高速飞行前进，金蓝色气流在翼尖划过，速度感极强，空中霸主移动。角色位置稳定。无文字/水印。
```

**大鹏金翅雕 attack：**
```text
生成大鹏金翅雕 Q版西游塔防 BOSS attack 动作，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 1024×128。蓝金巨鸟，双翼后收蓄力→猛然向前扇出巨大金蓝色风刃→风刃高速旋转飞出→收翅，风刃切割感。角色位置稳定。无文字/水印。
```

**大鹏金翅雕 hit：**
```text
生成大鹏金翅雕 Q版西游塔防 BOSS hit 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 512×128。蓝金巨鸟受击翅膀收缩→金羽散落几片→身体短暂下坠→重新展翅稳住。角色位置稳定。无文字/水印。
```

**大鹏金翅雕 death：**
```text
生成大鹏金翅雕 Q版西游塔防 BOSS death 动作，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 1024×128。大鹏金翅雕翅膀金光逐渐黯淡→旋转下坠→金蓝色羽毛漫天飘散→身体化为金色光点消散于空中，不能血腥。角色位置稳定。无文字/水印。
```

**大鹏金翅雕 spawn：**
```text
生成大鹏金翅雕 Q版西游塔防 BOSS spawn 出场动画，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 1024×128。天际出现金色光点→光点急速变大→大鹏金翅雕从天际俯冲而下→落地振翅掀起旋风→金蓝色神光四射，BOSS登场高速压迫感。角色位置稳定。无文字/水印。
```

— — — 以下为新 BOSS（灵感大王/铁扇公主/百眼魔君/黄眉怪），全部走视频截帧路径 — — —

**灵感大王 idle：**
```text
生成灵感大王 Q版西游塔防 BOSS idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 512×128。金红色鱼鳞巨型鱼妖（金鱼精），通体金红鳞片闪耀，鱼鳍如翅，鱼尾慢摆，口中微露尖牙，水系妖王威严悬浮待机姿态，水泡偶尔从身周冒出。角色位置稳定。无文字/水印。
```

**灵感大王 move：**
```text
生成灵感大王 Q版西游塔防 BOSS move 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。金红鱼鳞鱼妖，水中游动般悬浮前进，鱼鳍和鱼尾如波浪摆动推进，身周水蓝色波纹跟随，金色鳞片随移动明暗闪烁。角色位置稳定。无文字/水印。
```

**灵感大王 attack：**
```text
生成灵感大王 Q版西游塔防 BOSS attack 动作，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 1024×128。金红鱼妖，巨口张开蓄力→猛然喷出冰蓝色寒流冲击波→冰晶向前方扇形扩散冻结→收口回复，寒冰冻结感。角色位置稳定。无文字/水印。
```

**灵感大王 hit：**
```text
生成灵感大王 Q版西游塔防 BOSS hit 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 512×128。金红鱼妖受击鳞片震动→鱼鳍收缩→身体短暂后仰→水泡炸裂→重新稳住悬浮姿态。角色位置稳定。无文字/水印。
```

**灵感大王 death：**
```text
生成灵感大王 Q版西游塔防 BOSS death 动作，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 1024×128。灵感大王鱼鳞逐片剥落→金红光芒从体内迸发→庞大鱼身崩解→化为漫天冰蓝色水沫和金色鳞片→水沫蒸发消散，不能血腥。角色位置稳定。无文字/水印。
```

**灵感大王 spawn：**
```text
生成灵感大王 Q版西游塔防 BOSS spawn 出场动画，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 1024×128。地面涌出冰蓝色水柱→水柱冲天旋转→水中金红鱼鳞闪光→灵感大王从水柱中破水而出→鱼尾甩水→金红鳞光四射，BOSS登场水系震撼感。角色位置稳定。无文字/水印。
```

**铁扇公主 idle：**
```text
生成铁扇公主 Q版西游塔防 BOSS idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 512×128。翠绿色罗刹女造型，头戴翡翠发冠，身披翠绿罗裙，手持巨大芭蕉扇，扇面翠绿金边，风纹在扇面微转，美艳威严的芭蕉洞主待机姿态。角色位置稳定。无文字/水印。
```

**铁扇公主 move：**
```text
生成铁扇公主 Q版西游塔防 BOSS move 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。翠绿罗刹女，脚踏清风悬浮缓行前进，裙摆飘动如风，芭蕉扇半张在身前，翠绿色风纹环绕随行。角色位置稳定。无文字/水印。
```

**铁扇公主 attack：**
```text
生成铁扇公主 Q版西游塔防 BOSS attack 动作，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 1024×128。翠绿罗刹女，芭蕉扇高举蓄力→猛然向前大力扇出→翠绿色狂风冲击波向前方席卷→火焰旋风夹杂其中→收扇回防，狂风烈火双重打击感。角色位置稳定。无文字/水印。
```

**铁扇公主 hit：**
```text
生成铁扇公主 Q版西游塔防 BOSS hit 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 512×128。翠绿罗刹女受击芭蕉扇微落→罗裙飘带炸开→身体后仰怒视→风纹短暂散开重聚。角色位置稳定。无文字/水印。
```

**铁扇公主 death：**
```text
生成铁扇公主 Q版西游塔防 BOSS death 动作，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 1024×128。铁扇公主芭蕉扇坠地→身上翠绿光芒逐层褪去→罗裙飘带萎落→身体化为翠绿色清风→风散人空，不能血腥。角色位置稳定。无文字/水印。
```

**铁扇公主 spawn：**
```text
生成铁扇公主 Q版西游塔防 BOSS spawn 出场动画，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 1024×128。一道翠绿色旋风从地面旋起→风中芭蕉叶飞舞→铁扇公主从风中走出→芭蕉扇展开→翠绿风纹光环扩散，BOSS登场罗刹威压感。角色位置稳定。无文字/水印。
```

**百眼魔君 idle：**
```text
生成百眼魔君 Q版西游塔防 BOSS idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 512×128。暗紫色巨型蜈蚣精（黄花观妖道），千足环身，身体两侧布满金色妖目，暗紫色甲壳覆盖全身，多目微张微闭交替闪烁，阴森诡异的待机姿态。角色位置稳定。无文字/水印。
```

**百眼魔君 move：**
```text
生成百眼魔君 Q版西游塔防 BOSS move 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。暗紫蜈蚣精，千足波浪般蠕动前进，身体蜿蜒扭动，金色妖目随移动一明一暗，暗紫色毒雾在身周弥漫尾随。角色位置稳定。无文字/水印。
```

**百眼魔君 attack：**
```text
生成百眼魔君 Q版西游塔防 BOSS attack 动作，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 1024×128。暗紫蜈蚣精，全身金色妖目齐齐睁开发光→千道金色目眩光芒向前方照射→毒雾从口中喷吐而出→金目渐闭收光，千目致盲+毒雾双重打击。角色位置稳定。无文字/水印。
```

**百眼魔君 hit：**
```text
生成百眼魔君 Q版西游塔防 BOSS hit 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 512×128。暗紫蜈蚣精受击金色妖目齐齐闭合→甲壳震动→千足短暂蜷缩→妖目重新开合恢复。角色位置稳定。无文字/水印。
```

**百眼魔君 death：**
```text
生成百眼魔君 Q版西游塔防 BOSS death 动作，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 1024×128。百眼魔君金色妖目逐一熄灭→甲壳龟裂→暗紫身体节节崩碎→千足瘫软→化为暗紫色毒烟消散于空中，不能血腥。角色位置稳定。无文字/水印。
```

**百眼魔君 spawn：**
```text
生成百眼魔君 Q版西游塔防 BOSS spawn 出场动画，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 1024×128。地面裂开冒出暗紫色毒烟→毒烟中无数金色妖目光点亮起→百眼魔君千足从烟中爬出→身体凝聚成形→全身妖目齐睁金光刺眼，BOSS登场诡异压迫感。角色位置稳定。无文字/水印。
```

**黄眉怪 idle：**
```text
生成黄眉怪 Q版西游塔防 BOSS idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 512×128。金袍黄眉妖僧造型（小雷音寺假佛），身披金色袈裟但面目妖邪，黄色长眉垂至胸前，一手持人种袋一手拈诀，金色妖僧光环与佛光混杂，伪佛威严待机姿态。角色位置稳定。无文字/水印。
```

**黄眉怪 move：**
```text
生成黄眉怪 Q版西游塔防 BOSS move 动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。金袍黄眉妖僧，脚踏金色莲花虚影悬浮前进，袈裟飘动，人种袋在身边环绕，黄眉飘扬，伪佛庄严中透着妖邪的移动姿态。角色位置稳定。无文字/水印。
```

**黄眉怪 attack：**
```text
生成黄眉怪 Q版西游塔防 BOSS attack 动作，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 1024×128。金袍黄眉怪，人种袋高举袋口张开→金色吸力漩涡从袋口涌出→向前方友方单位猛烈吸取→袋口收紧收回，金色漩涡拖尾，捕获吞噬感。角色位置稳定。无文字/水印。
```

**黄眉怪 hit：**
```text
生成黄眉怪 Q版西游塔防 BOSS hit 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 512×128。金袍黄眉怪受击袈裟飘起→人种袋微落→黄眉炸开→身体后仰怒目→金色妖光短暂暗灭再亮起。角色位置稳定。无文字/水印。
```

**黄眉怪 death：**
```text
生成黄眉怪 Q版西游塔防 BOSS death 动作，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 1024×128。黄眉怪金色袈裟褪色→人种袋坠地崩碎→黄眉逐一飘落→伪佛法相崩解露出妖邪真身→身体化为金光与黑烟交织消散，不能血腥。角色位置稳定。无文字/水印。
```

**黄眉怪 spawn：**
```text
生成黄眉怪 Q版西游塔防 BOSS spawn 出场动画，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 1024×128。天空降下金色佛光→佛光落地化为金色莲台→莲台上端坐的竟是黄眉妖僧→妖邪伪佛起身→人种袋从袖中飞出→金色妖光与佛光混杂，BOSS登场伪佛庄严感。角色位置稳定。无文字/水印。
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
生成唐僧 Q版西游角色静态图，透明背景 PNG。尺寸 96×96。身披红色金纹袈裟，手持锡杖或合十，庄严慈悲的僧人形象，Q版2.5~3头身比例，身材匀称不胖，表情平和安详。适合 80×80 棋盘格显示。无文字/水印。
```

### 6.2 唐僧动作动画（3 组）

> **推荐路径：death → 路径 B（视频→截帧）；idle / hit → 路径 A。** 唐僧 death 涉及身体化金光消散，视频表现更好。idle 诵经呼吸(4帧)和 hit 受击后仰(4帧)简单，直接走 sprite sheet。

**输出文件：**
```text
public/assets/heroes/tangmonk_idle_sheet.png   (4帧 384×96)  轻微呼吸/诵经
public/assets/heroes/tangmonk_hit.png          (4帧 384×96)  受击后仰
public/assets/heroes/tangmonk_death.png        (6帧 576×96)  倒下化为金光
```

**提示词：**

**唐僧 idle：**
```text
生成唐僧 Q版西游塔防角色 idle 动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。身披红色金纹袈裟，手持锡杖，双手合十，闭目诵经，金色佛光微微环绕，嘴唇微动念经，袈裟衣角微飘，庄严慈悲待机姿态。角色位置稳定。无文字/水印。
```

**唐僧 hit：**
```text
生成唐僧 Q版西游塔防角色 hit 受击动作，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。身披红色金纹袈裟，受击身体微微后仰→衣袖飘起→锡杖微晃→恢复合十姿态，金色护体佛光短暂闪现缓冲，不能血腥。角色位置稳定。无文字/水印。
```

**唐僧 death：**
```text
生成唐僧 Q版西游塔防角色 death 死亡动作，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。身披红色金纹袈裟，被击败→双手松开锡杖→身体缓缓倒下→金色佛光从体内迸发→身体化为漫天金色光粒→金光散尽，庄严肃穆，不能血腥。角色位置稳定。无文字/水印。
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

**提示词：**

**开山斧：**
```text
生成开山斧法宝使用特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。一把金色巨斧虚影从空中劈下→击中目标格子→碎石向四周爆裂飞溅→金色裂纹从打击点扩散→碎石灰尘渐散，解锁开辟感。无文字/水印。
```

**回山符：**
```text
生成回山符法宝使用特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。一张黄色符纸在目标位置展开→符咒发光旋转→敌人被金色回旋光圈包裹→传送闪光炸亮→敌人消失留下金色光点消散。无文字/水印。
```

**杨枝甘露：**
```text
生成杨枝甘露法宝使用特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 256×256，整张 1536×256。杨柳枝从上方垂下→翠绿色露珠滴落→露珠落地化为全屏绿色治疗涟漪→波纹从中心向外圆形扩散→柔和治愈绿光覆盖全场→渐隐。无文字/水印。
```

**紧箍咒：**
```text
生成紧箍咒法宝使用特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 256×256，整张 1536×256。一个金色金箍圆环在目标头顶浮现→金箍旋转→猛然收紧→金色压制光圈收缩→光纹闪烁→紧箍定型。无文字/水印。
```

**骷髅念珠：**
```text
生成骷髅念珠法宝使用特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。一串紫色骷髅念珠在目标上方旋转→紫色诅咒符文从念珠飞出→符文落在目标身上→紫色骷髅标记浮现→标记闪烁诅咒生效→渐暗。无文字/水印。
```

**照妖镜：**
```text
生成照妖镜法宝使用特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。一面古铜镜在目标前方出现→镜面聚光→猛然射出白色照射光束→光束笼罩目标→镜面强烈闪光→敌人短暂显形后光束收回。无文字/水印。
```

**避火罩：**
```text
生成避火罩法宝使用特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。一个透明护罩气泡在目标周围生成→护罩膨胀展开→表面浮现火焰反弹纹路→火焰碰到护罩被弹开→护罩稳定守护→微光持续。无文字/水印。
```

**芭蕉扇：**
```text
生成芭蕉扇法宝使用特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 256×256，整张 1536×256。一把巨大的芭蕉叶扇从画面一侧挥出→绿色旋风纹在扇面浮现→猛烈的狂风冲击波向前推卷→风卷残云感→风力渐弱→扇子收回。无文字/水印。
```

**老鼋甲：**
```text
生成老鼋甲法宝使用特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。一片龟甲盾牌虚影在目标前方浮现→龟甲纹路亮起水蓝色光芒→甲片拼接成完整护盾→水纹在盾面流动→护盾覆盖目标→稳定守护。无文字/水印。
```

**甘露净露：**
```text
生成甘露净露法宝使用特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 256×256，整张 1536×256。玉净瓶倾斜→蓝绿色净化甘露从瓶口流出→甘露化为蓝绿色净化雾气扩散→雾气覆盖全场→污浊被净化升腾→雾气渐散清新洁净。无文字/水印。
```

**金刚琢：**
```text
生成金刚琢法宝使用特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。一个金色金刚圈在空中旋转→金刚能量环从圈中扩散→光环锁定目标→金色能量环收紧→锁定完成闪光→光环稳定悬浮。无文字/水印。
```

**锦斓袈裟：**
```text
生成锦斓袈裟法宝使用特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。一件红金色锦斓袈裟虚影从空中飘落→袈裟笼罩在唐僧身上→金色佛光从袈裟绽放→佛光形成保护罩→金光稳定环绕→庄严佛光持续。无文字/水印。
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

**提示词：**

**小兵卡牌框：**
```text
生成小兵卡牌框 UI组件，透明背景 PNG，240×320。扁平国潮风卡牌外框，回纹装饰边框，墨蓝 #101826 底色，暖灰 #c4bbb0 边框线条，四角有简短云纹点缀，中间为方形留空区域用于放置小兵图标。无文字/水印。
```

**英雄碎片卡牌框：**
```text
生成英雄碎片卡牌框 UI组件，透明背景 PNG，240×320。扁平国潮风卡牌外框，回纹装饰边框，比小兵卡牌更精致，银灰色边框带细微金色光泽，四角有莲花纹点缀，中间方形留空区域。无文字/水印。
```

**道具卡牌框：**
```text
生成道具卡牌框 UI组件，透明背景 PNG，240×320。扁平国潮风卡牌外框，圆角方形，暖灰边框，墨蓝底色，四角有小回纹装饰，中间留空区域用于放置道具图标，简洁实用风格。无文字/水印。
```

**普通英雄边框：**
```text
生成普通英雄边框 UI组件，透明背景 PNG，112×112。青绿色银灰色边框，圆角方形，暖灰 #c4bbb0 边框线条 3-4px，四角有简化的水纹装饰，中间镂空用于放置英雄头像。适合 NORMAL 品质英雄。无文字/水印。
```

**核心英雄边框：**
```text
生成核心英雄边框 UI组件，透明背景 PNG，112×112。金红边框，圆角方形，鎏金 #f0c15a 边框线条 4px，朱砂 #c43d30 内框，四角有火焰纹或云纹装饰，中间镂空用于放置英雄头像。比普通边框更华丽。适合 CORE 品质英雄。无文字/水印。
```

**仓库空槽：**
```text
生成仓库空槽 UI组件，透明背景 PNG，96×96。墨蓝色方形槽位，暖灰细边框，中间浅灰色半透明圆形虚线或浅淡"+"号暗示可放置，稍微凹陷质感，空置状态。无文字/水印。
```

**仓库高亮槽：**
```text
生成仓库高亮槽 UI组件，透明背景 PNG，96×96。墨蓝色方形槽位，金色边框加粗发光，中间有金色微光环脉冲，表示当前选中/可放置状态，比空槽更亮更突出。无文字/水印。
```

**召唤按钮：**
```text
生成召唤按钮 UI组件，透明背景 PNG，200×80。圆角矩形按钮，鎏金 #f0c15a 底色，朱砂 #c43d30 边框 3px，微凸起质感，金色微光，醒目吸引点击。无文字/水印。
```

**广告奖励按钮：**
```text
生成广告奖励按钮 UI组件，透明背景 PNG，200×80。圆角矩形按钮，翠绿色底色，金色边框，右上角有小型播放三角图标或礼盒图标装饰，表示看广告领奖励。无文字/水印。
```

**禁用按钮：**
```text
生成禁用按钮 UI组件，透明背景 PNG，200×80。圆角矩形按钮，暖灰色底色，深灰边框，整体灰暗半透明质感，不可点击状态，降低饱和度以示禁用。无文字/水印。
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

**提示词：**

**HUD顶部底条：**
```text
生成HUD顶部底条 UI组件，透明背景 PNG，750×80。横贯屏幕顶部的半透明墨蓝色长条面板，暖灰边框上下边线，轻微云纹装饰点缀两端，面板有微凹陷质感，用于承载资源图标和波次信息。无文字/水印。
```

**资源面板：**
```text
生成资源面板 UI组件，透明背景 PNG，200×56。圆角矩形小面板，墨蓝底色半透明，暖灰边框，左侧留空用于放资源图标，右侧留空用于放数字，简洁明了。无文字/水印。
```

**血量面板：**
```text
生成血量面板 UI组件，透明背景 PNG，80×56。竖条或横条小面板，墨蓝底色，红色爱心图标区 + 血量数字区域，暖灰边框。无文字/水印。
```

**波次面板：**
```text
生成波次面板 UI组件，透明背景 PNG，120×56。圆角矩形小面板，墨蓝底色半透明，暖灰边框，中央区域用于显示波次数，旗帜或波浪图标装饰。无文字/水印。
```

**BOSS血条背景：**
```text
生成BOSS血条背景 UI组件，透明背景 PNG，400×24。横条矩形，深墨蓝底色，暖灰细边框，中间留空区域，作为BOSS血条的空槽背景。无文字/水印。
```

**BOSS血条填充：**
```text
生成BOSS血条填充 UI组件，透明背景 PNG，400×24。横条矩形，从绛红 #8b1a1a 渐变到朱砂 #c43d30 的血条填充色块，带2px金色边缘线，作为BOSS血条的填充层。无文字/水印。
```

**胜利结算面板：**
```text
生成胜利结算面板 UI组件，透明背景 PNG，600×400。国风卷轴展开造型的结算面板，墨蓝底色半透明，鎏金边框华丽装饰，四角有祥云纹，整体喜庆金色氛围，中间大面积留空区域用于放置结算信息。无文字/水印。
```

**失败结算面板：**
```text
生成失败结算面板 UI组件，透明背景 PNG，600×400。国风卷轴造型的结算面板，深灰蓝底色半透明，暖灰边框，四角有暗色云纹，整体低沉色调，中间留空区域用于放置失败信息和重试按钮区域。无文字/水印。
```

**普通按钮：**
```text
生成普通按钮 UI组件，透明背景 PNG，160×64。圆角矩形按钮，墨蓝底色，暖灰边框 2px，微凸起质感，标准可用状态。无文字/水印。
```

**确认按钮：**
```text
生成确认按钮 UI组件，透明背景 PNG，160×64。圆角矩形按钮，翠绿 #5bc48a 底色，金色边框，微发光，强调确认/确定操作的醒目按钮。无文字/水印。
```

**返回按钮：**
```text
生成返回按钮 UI组件，透明背景 PNG，80×64。圆角小矩形或圆形按钮，墨蓝底色，暖灰边框，左侧有向左的箭头图标装饰，返回/退出操作。无文字/水印。
```

**星级底板：**
```text
生成星级展示底板 UI组件，透明背景 PNG，240×48。横向长条底板，墨蓝半透明底色，暖灰细边框，中间均匀排布3个或5个星形留空位置，用于展示星级评价的空星底板。无文字/水印。
```

### 10.4 章节卡片背景（9 张，MVP 可后补）

每章一个主题装饰卡片。

**输出文件：**
```text
public/assets/ui/ui_chapter_01_card.png ~ ui_chapter_09_card.png
```

**提示词：**

**第1章「五行山」：**
```text
生成第1章「五行山」章节卡片装饰图，透明背景 PNG，400×280。Q版国风手绘，表现五行山下山石和悟空破山而出的场景感，主色调 0x5b8c5a（森林绿），有山路和岩石纹理，画面留出中央空白区域用于放文字。无文字/水印。
```

**第2章「流沙河」：**
```text
生成第2章「流沙河」章节卡片装饰图，透明背景 PNG，400×280。Q版国风手绘，八百流沙河畔浊浪翻滚，黄褐色河水拍打岸边礁石，河雾弥漫，远山隐约，主色调 #4a90b8 蓝灰，画面留出中央空白区域用于放文字。无文字/水印。
```

**第3章「白虎岭」：**
```text
生成第3章「白虎岭」章节卡片装饰图，透明背景 PNG，400×280。Q版国风手绘，阴森白骨洞窟入口，灰紫色嶙峋岩石，钟乳石垂下，紫色磷火微弱漂浮，主色调 #8b7a9e 灰紫，画面留出中央空白区域用于放文字。无文字/水印。
```

**第4章「号山」：**
```text
生成第4章「号山」章节卡片装饰图，透明背景 PNG，400×280。Q版国风手绘，枯松涧火云洞外，暗红岩石裂缝冒火苗浓烟，枯死松树熏黑歪斜，远处洞口橙红光芒，主色调 #c45a3a 暗红，画面留出中央空白区域用于放文字。无文字/水印。
```

**第5章「火焰山」：**
```text
生成第5章「火焰山」章节卡片装饰图，透明背景 PNG，400×280。Q版国风手绘，八百里火焰山脉连绵，焦黑山体透橙红岩浆光芒，龟裂焦土地缝冒火，浓烟滚滚，主色调 #d4702a 橙红，画面留出中央空白区域用于放文字。无文字/水印。
```

**第6章「通天河」：**
```text
生成第6章「通天河」章节卡片装饰图，透明背景 PNG，400×280。Q版国风手绘，宽阔墨蓝色通天河波涛涌动，青石滩和长满青苔的暗礁露出水面，薄冰漂浮，远处对岸隐约村庄灯火，主色调 #3d7fba 蓝，画面留出中央空白区域用于放文字。无文字/水印。
```

**第7章「盘丝洞」：**
```text
生成第7章「盘丝洞」章节卡片装饰图，透明背景 PNG，400×280。Q版国风手绘，幽深洞窟内紫色蛛网层层叠叠挂满洞壁，蛛丝茧悬挂角落，微弱紫光从深处透出，蛛丝银紫色光泽，主色调 #7b4f8a 紫，画面留出中央空白区域用于放文字。无文字/水印。
```

**第8章「狮驼岭」：**
```text
生成第8章「狮驼岭」章节卡片装饰图，透明背景 PNG，400×280。Q版国风手绘，狮驼岭山巅贫瘠黄土岭，怪石嶙峋，残破妖旗在风中飘摇，远处暗金色山峦和巨大石狮雕像残骸，暗金薄雾和盘旋秃鹫，主色调 #8b6f3a 黄褐，画面留出中央空白区域用于放文字。无文字/水印。
```

**第9章「灵山」：**
```text
生成第9章「灵山」章节卡片装饰图，透明背景 PNG，400×280。Q版国风手绘，大雷音寺前金色佛光洒落，云海翻涌莲花座点缀，白玉石广场金莲绽放，远处佛殿飞檐翘角祥云飘带，主色调 #c9a44a 鎏金，画面留出中央空白区域用于放文字。无文字/水印。
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
生成一张竖屏手机游戏背景图，尺寸 750×1334，主题《守护唐僧》西游取经路线图。纯国风手绘地图风格，从五行山到灵山的完整取经路线，蜿蜒山路贯穿画面，沿途点缀庙宇、村庄、云纹、山林，整体呈古画卷轴展开感，唐三彩暖调配色。不要任何UI元素，不要预留区域，不要文字/水印/logo。纯环境背景图。
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

**提示词：**

**Ch1 五行山（通用森林）：**
```text
生成一张竖屏手机战斗背景图，尺寸 750×1334，主题「五行山」。扁平国潮风（Guochao Flat）纯场景环境图。深山野林间，远处矗立五指形巨山，山顶有金色封条微光。近处林间空地古松苍劲、藤蔓垂挂，阳光从树叶缝隙洒落。配色以森林绿 #5b8c5a 和墨绿 #1e2a1c 为主，地面路径为沙色 #d4b896。不要棋盘格子，不要UI按钮卡槽，不要HUD，不要路径线，不要文字水印logo。纯环境背景图，棋盘和UI由代码叠加。
```

**Ch2 流沙河：**
```text
生成一张竖屏手机战斗背景图，尺寸 750×1334，主题「流沙河」。扁平国潮风（Guochao Flat）纯场景环境图。八百里流沙河畔，浊浪翻滚黄褐色河水，岸边芦苇丛生、礁石散布，河面上弥漫薄雾，远处隐约有人影项挂骷髅念珠立于水中。配色以蓝灰 #4a90b8 和深蓝 #1a2832 为主。不要棋盘格子，不要UI按钮卡槽，不要HUD，不要路径线，不要文字水印logo。纯环境背景图，棋盘和UI由代码叠加。
```

**Ch3 白虎岭：**
```text
生成一张竖屏手机战斗背景图，尺寸 750×1334，主题「白虎岭」。扁平国潮风（Guochao Flat）纯场景环境图。阴森白骨洞窟内部，灰紫色嶙峋岩石层层叠叠，地面散落白骨骷髅，钟乳石从洞顶垂下，紫色磷火在空中幽幽漂浮，洞深处透出诡异微光。配色以灰紫 #8b7a9e 和暗紫 #1e1a24 为主。不要棋盘格子，不要UI按钮卡槽，不要HUD，不要路径线，不要文字水印logo。纯环境背景图，棋盘和UI由代码叠加。
```

**Ch4 号山：**
```text
生成一张竖屏手机战斗背景图，尺寸 750×1334，主题「号山」。扁平国潮风（Guochao Flat）纯场景环境图。枯松涧火云洞外场景，暗红色岩石地面裂缝中冒出火苗和浓烟，枯死的松树被熏得焦黑歪斜，远处洞口透出橙红色光芒，空气因热浪而扭曲。配色以暗红 #c45a3a 和焦黑 #2a1a14 为主，火焰高光 #c43d30。不要棋盘格子，不要UI按钮卡槽，不要HUD，不要路径线，不要文字水印logo。纯环境背景图，棋盘和UI由代码叠加。
```

**Ch5 火焰山：**
```text
生成一张竖屏手机战斗背景图，尺寸 750×1334，主题「火焰山」。扁平国潮风（Guochao Flat）纯场景环境图。八百里火焰山脉连绵起伏，焦黑的火山山体裂缝中透出橙红色岩浆光芒，龟裂的焦土地面上地缝中火焰跳动，浓烟滚滚遮蔽天空，远处火山口喷涌岩浆。配色以橙红 #d4702a 和焦黑 #2e1a0c 为主。不要棋盘格子，不要UI按钮卡槽，不要HUD，不要路径线，不要文字水印logo。纯环境背景图，棋盘和UI由代码叠加。
```

**Ch6 通天河：**
```text
生成一张竖屏手机战斗背景图，尺寸 750×1334，主题「通天河」。扁平国潮风（Guochao Flat）纯场景环境图。宽阔墨蓝色通天河波涛涌动，青石滩散布河岸，长满青苔的暗礁半露水面，河面漂浮薄冰，远处对岸隐约可见村庄灯火闪烁，夜空下河水深沉。配色以蓝 #3d7fba 和深蓝 #162838 为主。不要棋盘格子，不要UI按钮卡槽，不要HUD，不要路径线，不要文字水印logo。纯环境背景图，棋盘和UI由代码叠加。
```

**Ch7 盘丝洞：**
```text
生成一张竖屏手机战斗背景图，尺寸 750×1334，主题「盘丝洞」。扁平国潮风（Guochao Flat）纯场景环境图。幽深洞窟内部，紫色蛛网层层叠叠挂满洞壁和洞顶，蛛丝茧悬挂在角落，微弱紫色光芒从洞窟深处透出，蛛丝反射银紫色光泽，气氛诡异阴森。配色以紫 #7b4f8a 和暗紫 #1c1624 为主。不要棋盘格子，不要UI按钮卡槽，不要HUD，不要路径线，不要文字水印logo。纯环境背景图，棋盘和UI由代码叠加。
```

**Ch8 狮驼岭：**
```text
生成一张竖屏手机战斗背景图，尺寸 750×1334，主题「狮驼岭」。扁平国潮风（Guochao Flat）纯场景环境图。狮驼岭山巅场景，贫瘠黄土岭上怪石嶙峋，残破的妖旗在风中飘摇，远处暗金色山峦层叠，巨大石狮雕像残骸散落山间，妖气形成的暗金薄雾弥漫，几只秃鹫在天空中盘旋。配色以黄褐 #8b6f3a 和暗褐 #221c10 为主。不要棋盘格子，不要UI按钮卡槽，不要HUD，不要路径线，不要文字水印logo。纯环境背景图，棋盘和UI由代码叠加。
```

**Ch9 灵山：**
```text
生成一张竖屏手机战斗背景图，尺寸 750×1334，主题「灵山」。扁平国潮风（Guochao Flat）纯场景环境图。大雷音寺前的神圣场景，金色佛光从天空洒落，云海翻涌中点缀着莲花座，白玉石广场上金莲绽放，远处佛殿飞檐翘角、祥云环绕、飞天飘带舞动，鎏金色光芒笼罩一切。配色以鎏金 #c9a44a 和暗金 #1e1a10 为主，鎏金光 #f0c15a。不要棋盘格子，不要UI按钮卡槽，不要HUD，不要路径线，不要文字水印logo。纯环境背景图，棋盘和UI由代码叠加。
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

**提示词：**

**召唤光圈：**
```text
生成召唤光圈通用特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。金色光圈从地面浮现→光圈从中心向外圆形扩散→边缘带中式云纹→光芒最亮→渐隐消散，用于小兵/英雄召唤入场。无文字/水印。
```

**合成升级光圈：**
```text
生成合成升级光圈特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。翠绿色光圈从单位脚底升起→绿色光环向上旋转包裹→光柱收缩爆发→升级完成闪光→光环消散。无文字/水印。
```

**英雄激活双环：**
```text
生成英雄激活金红双环特效，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 1024×128。内环金色外环朱红色双重光环从中心旋转扩散→双环交错旋转→光纹流动→光环稳定后猛然闪亮→缓慢消散。无文字/水印。
```

**英雄升级光柱：**
```text
生成英雄升级金色上升光柱特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。金色光柱从脚底向上冲天而起→光柱由细变粗→金色粒子从光柱底部向上飞升→光柱达到最亮→逐渐收束→消散。无文字/水印。
```

**莲花治疗光效：**
```text
生成莲花治疗光效特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。青绿色莲花在目标脚下绽放→5-7瓣莲花从闭合到完全展开→每片花瓣散发柔和绿光→莲花短暂停留→花瓣合拢渐隐，治愈柔和感。无文字/水印。
```

**BOSS入场冲击波：**
```text
生成BOSS入场红金冲击波特效，横向连续 8 帧 PNG sprite sheet，透明背景。每帧 256×256，整张 2048×256。画面中心出现红金色能量球→能量球急速膨胀→猛然炸开环形冲击波向外扩散→冲击波带暗红和金色两层→波峰最亮→逐渐消散，强烈压迫感。无文字/水印。
```

**道具使用闪光：**
```text
生成道具使用闪光特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。中心出现白色光点→光点急速扩大为星形闪光→金色星芒四射→闪光达到峰值→快速收拢→消失，干净利落。无文字/水印。
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

**提示词：**

**金色光箭：**
```text
生成金色光箭投射物特效，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 64×64，整张 256×64。一支金色光箭水平飞行，箭身细长带金色光尾拖尾，箭头尖锐有星芒闪光，4帧表现箭头微光闪烁和尾迹流动。无文字/水印。
```

**红橙火球：**
```text
生成红橙火球投射物特效，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 64×64，整张 256×64。一颗红橙色火球水平飞行，火球核心橙红、外焰朱红，带火焰拖尾和火星飞溅，4帧表现火焰翻滚和拖尾波动。无文字/水印。
```

**青绿法术弹：**
```text
生成青绿法术弹投射物特效，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 64×64，整张 256×64。一颗青绿色法术能量弹水平飞行，圆形能量球体带翠绿光晕，尾部有青绿色星点拖尾，4帧表现能量旋转和光晕脉动。无文字/水印。
```

**金色棍影冲击波：**
```text
生成金色棍影冲击波投射物特效，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 64×64，整张 256×64。一道金色棍形冲击波水平飞出，类似金箍棒虚影横推，带金色能量波纹尾迹，4帧表现冲击波推进和波纹扩散。无文字/水印。
```

**蓝白水弹：**
```text
生成蓝白水弹投射物特效，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 64×64，整张 256×64。一颗蓝白色水弹水平飞行，水球形态半透明，内部水光流动，带蓝色水滴拖尾，4帧表现水球旋转和水滴飞溅。无文字/水印。
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

**提示词：**

**近战命中火花：**
```text
生成近战命中金色火花特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。武器命中点爆出金色火花→火花从中心向四周飞溅→金色星形光点扩散→火花达到最多最亮→火星渐少→消散。无文字/水印。
```

**箭矢命中光点：**
```text
生成箭矢命中光点爆开特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。箭头命中点出现白色光点→光点急速扩大→白色光芒爆开→金光从中心向外扩散→光线收束→消散。无文字/水印。
```

**火焰命中爆裂：**
```text
生成火焰命中爆裂特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。命中点炸开红橙色火焰球→火焰从中心向外猛烈扩散→火苗向四周飞溅→火焰最旺→火焰减弱→残焰消散。无文字/水印。
```

**法术命中能量扩散：**
```text
生成法术命中能量扩散特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。法术命中点出现青绿色能量环→能量环从中心向外圆形扩散→环带法术符文微光→能量环扩大到最大→透明度降低→消失。无文字/水印。
```

**暴击命中大爆裂：**
```text
生成暴击命中大爆裂特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 576×96。命中点出现金色核爆闪光→比普通命中更大更亮→金黄色冲击波猛烈扩散→金色碎片和星芒飞溅→冲击波减弱→残光消散，强烈的重击暴击感。无文字/水印。
```

### 12.4 起手/发射特效（4 组）

**输出文件：**
```text
public/assets/effects/effect_launch_arrow.png   弓箭发射光圈 (4帧 96×96)
public/assets/effects/effect_launch_fire.png    火焰凝聚喷发 (4帧 96×96)
public/assets/effects/effect_launch_melee.png   近战挥砍弧光 (4帧 96×96)
public/assets/effects/effect_launch_magic.png   法术法阵凝聚射出 (4帧 96×96)
```

**提示词：**

**弓箭发射光圈：**
```text
生成弓箭发射光圈起手特效，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。弓弦拉开位置出现金色光圈→光圈从弓弦处向前凝聚→光圈变为箭头形状→箭头射出光圈消散，配合远程发射起手。无文字/水印。
```

**火焰凝聚喷发：**
```text
生成火焰凝聚喷发起手特效，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。施法者身前出现红橙色火焰凝聚→火焰旋转收拢成火球→火球达到最亮→猛然向前喷发。无文字/水印。
```

**近战挥砍弧光：**
```text
生成近战挥砍弧光起手特效，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。武器举起位置出现弧形光轨→弧光从起手位置延伸→形成完整挥砍弧线→弧光闪亮后消散，配合武器挥砍起手。无文字/水印。
```

**法术法阵凝聚射出：**
```text
生成法术法阵凝聚射出起手特效，横向连续 4 帧 PNG sprite sheet，透明背景。每帧 96×96，整张 384×96。施法者身前地面浮现小型法术法阵→法阵旋转凝聚能量→法阵中心出现能量球→能量球沿法阵指引方向射出，法阵消散。无文字/水印。
```

### 12.5 范围持续特效（3 组）

**输出文件：**
```text
public/assets/effects/effect_aoe_fire_burst.png   火焰范围爆裂 (6帧 128×128)
public/assets/effects/effect_aoe_slow_mist.png    减速冰雾范围 (6帧 128×128，可循环)
public/assets/effects/effect_aoe_ring_splash.png  环形冲击波 (6帧 128×128)
```

**提示词：**

**火焰范围爆裂：**
```text
生成火焰范围爆裂AOE特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。以地面为中心红橙色火焰环形爆发→火焰从中心向外360度扩散→火环边缘火焰最高→火焰遍布圆形区域→火焰减弱→地面残留焦痕后消散。无文字/水印。
```

**减速冰雾范围：**
```text
生成减速冰雾范围AOE特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。蓝白色冰雾从地面升起→冰雾从中心向外弥漫扩散→雾气覆盖圆形区域→冰晶在雾中闪烁→雾气缓缓流动（可循环衔接最后一帧与第一帧）→寒冷减速感。无文字/水印。
```

**环形冲击波：**
```text
生成环形冲击波AOE特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。中心点出现金色能量→金色冲击波环从中心向外急速扩散→环带从细变粗→冲击波环到达最外围→环带透明度降低→完全消散。无文字/水印。
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

**提示词：**

**护盾反伤闪光：**
```text
生成黑熊精BOSS技能「护盾反伤闪光」特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。黑熊精身体被深色护盾包裹→遭受攻击时护盾表面闪现银色反伤闪光→闪光从命中点扩散→护盾微震→闪光消退恢复正常。无文字/水印。
```

**绿色治疗脉冲：**
```text
生成黑熊精BOSS技能「绿色治疗脉冲」特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。黑熊精脚下出现绿色治疗光环→绿色脉冲从脚底向上沿身体传递→光环亮度脉冲式增强→治疗绿光包裹全身→脉冲减弱进入冷却。无文字/水印。
```

**吸收光束：**
```text
生成金角大王BOSS技能「吸收光束」特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。金角大王手中法宝射出一道金色吸收光束→光束如触须般延伸向目标→光束笼罩目标吸力拉扯感→目标能量沿光束被吸入法宝→光束收回法宝光芒大盛。无文字/水印。
```

**持续伤害力场：**
```text
生成金角大王BOSS技能「持续伤害力场」特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 256×256，整张 1536×256。金角大王周围出现金棕色圆形伤害力场→力场边缘带旋转符文→力场内地面暗色→力场持续旋转→力场强度脉冲波动→力场稳定维持。无文字/水印。
```

**火焰灼烧光环：**
```text
生成红孩儿BOSS技能「火焰灼烧光环」特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 256×256，整张 1536×256。红孩儿脚下地面出现红橙色火焰光环→光环从脚下向外蔓延→地面被火焰覆盖形成灼烧区域→火焰在地面持续燃烧跳动→火苗此起彼伏→灼烧区域稳定。无文字/水印。
```

**大型火球：**
```text
生成红孩儿BOSS技能「大型火球」特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。红孩儿身前凝聚一颗巨大红橙火球→火球从拳头大小膨胀到巨大→火球旋转飞出拖长火焰尾迹→命中目标爆裂→火焰碎片四散→残焰消散。无文字/水印。
```

**召唤小兵黑烟：**
```text
生成白骨夫人BOSS技能「召唤小兵黑烟」特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。地面出现紫黑色法阵→法阵中升起黑色浓烟→黑烟翻滚凝聚→黑烟中浮现小妖轮廓→小妖从烟中走出→黑烟缩回法阵消散。无文字/水印。
```

**鬼影半透明闪烁：**
```text
生成白骨夫人BOSS技能「鬼影半透明闪烁」特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。白骨夫人身体逐渐变半透明→灰紫色鬼影轮廓闪烁→透明度在30%-80%之间波动→身体位置微微偏移→闪烁频率加快→恢复正常实体。无文字/水印。
```

**恐惧咆哮声波：**
```text
**高速冲锋拖尾：**
```text
**践踏地面裂纹冲击：**
```text
**飞行加速气流线：**
```text
生成大鹏金翅雕BOSS技能「飞行加速气流线」特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。大鹏金翅雕翅膀后收→身体猛然加速→身后出现金蓝色高速气流线→气流线从短变长拉丝→气流线在翼尖形成涡流→减速气流消散。无文字/水印。
```

**风刃弹道+命中：**
```text
生成大鹏金翅雕BOSS技能「风刃弹道+命中」特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。大鹏金翅雕翅膀扇出一道金蓝色风刃→风刃呈弯月形高速旋转飞行→命中目标→风刃爆开蓝色光碎→碎片飞散→消失。无文字/水印。
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

**提示词：**

**观音莲花护盾：**
```text
生成观音英雄技能「莲花护盾」专属特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。青绿色莲花从观音脚下绽放→莲花花瓣向上展开形成碗状护盾→护盾表面泛青绿光→半透明护盾包裹全身→莲花纹在盾面流转→护盾稳定持续。无文字/水印。
```

**悟空破甲棍击：**
```text
生成孙悟空英雄技能「破甲棍击」专属特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。金色棍棒从高处猛击地面→打击点爆发金色冲击波和裂纹→金色碎片从裂纹处飞溅→冲击波环形扩散→裂纹愈合→残光消散。无文字/水印。
```

**哪吒多重枪影：**
```text
生成哪吒英雄技能「多重枪影」专属特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。哪吒身前出现多个火尖枪虚影→6-8道橙红色枪影同时向前刺出→枪影交织成扇形→所有枪影同时命中→枪影收回到本体→残影消散。无文字/水印。
```

**红孩儿火焰溅射：**
```text
生成红孩儿英雄技能「火焰溅射」专属特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。红孩儿火尖枪枪尖凝聚火焰→火焰向四周猛烈溅射→红橙色火苗如雨点般洒向周围→火焰覆盖扇形区域→火苗变小→残留火星消散。无文字/水印。
```

**白骨夫人分身召唤：**
```text
生成白骨夫人英雄技能「分身召唤」专属特效，横向连续 6 帧 PNG sprite sheet，透明背景。每帧 128×128，整张 768×128。白骨夫人身体散发灰紫色暗光→身体侧面分裂出一个半透明轮廓→半透明分身逐渐凝实成形→分身与本体并肩→分身完全显形→灰紫雾气散去。无文字/水印。
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

**提示词：**
```text
生成一组UI交互音效，用于Q版西游合成塔防微信小游戏。国风轻快可爱风格，中国传统乐器为主（木鱼、玉石敲击、铃铛、铜铃），手机外放清晰不刺耳。WAV格式 44.1kHz 16-bit。共6个短音效：

1. 按钮点击（0.15s）：清脆玉石敲击一声，干净利落
2. 召唤卡牌（0.8s）：铃铛连续轻响+短促战鼓+闪光感上升音
3. 拖拽开始（0.2s）：纸牌轻拿音+玉石轻响
4. 放置成功（0.25s）：棋子落盘厚重声+金色铃铛确认音
5. 放置失败（0.25s）：低沉木鱼一声+否定短促闷音
6. 仓库入库（0.3s）：卡牌滑动音+玉石叮的一声

不包含人声台词，不模仿版权旋律，每个音效独立可单独剪裁使用。
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

**提示词：**
```text
生成一组战斗音效，用于Q版西游合成塔防微信小游戏。国风战斗风格，有打击感和节奏感，中国传统乐器（鼓、锣、钹、铃铛、琵琶、笛子），手机外放清晰有力。WAV格式 44.1kHz 16-bit。共7个音效：

1. 近战攻击（0.35s）：短棍挥砍风声+金属打击碰撞+低沉鼓点
2. 远程射击（0.35s）：弓弦释放绷响+符咒飞出气流声+箭矢破空
3. 法术攻击（0.45s）：铃铛晃荡+气流涌动+火焰或水光特效声
4. 普通命中（0.2s）：碰撞冲击闷响+短暂法术闪光
5. 敌人死亡（0.5s）：化为烟尘的消散声+金币轻响收尾
6. BOSS登场（1.2s）：战鼓重击渐强+铜锣巨响+冲击波低音
7. 唐僧受伤（0.45s）：心跳重音+护盾破裂玻璃感+紧张低音

不包含人声台词，不模仿版权旋律，每个音效独立可单独剪裁使用。
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

**提示词：**
```text
生成一组成长与结算音效，用于Q版西游合成塔防微信小游戏。国风欢快成长感，中国传统乐器（琵琶、古筝、铃铛、鼓、锣、玉石），手机外放清晰悦耳。WAV格式 44.1kHz 16-bit。共7个音效：

1. 小兵合成（0.8s）：上升音阶+玉石碰撞清脆声+铃铛闪烁
2. 英雄激活（1.0s）：金红双环展开感+鼓点渐强+铃铛高潮
3. 英雄升级（0.9s）：金色上升光柱感+成长攀升旋律+铃声收尾
4. 道具使用（0.6s）：法宝发动特殊音+玉石叮声确认
5. 胜利结算（2.0s）：欢快鼓点+铃声+琵琶轻快旋律
6. 失败结算（2.0s）：短促锣声+失落低音旋律+渐弱
7. 星级结算（0.8s）：星星逐个亮起三连铃铛清脆声

不包含人声台词，不模仿版权旋律，每个音效独立可单独剪裁使用。
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

**提示词：**
```text
生成一组法宝使用音效，用于Q版西游合成塔防微信小游戏。国风法宝发动感，中国传统乐器（铃铛、鼓、锣、笛子、琵琶、磬），手机外放清晰。WAV格式 44.1kHz 16-bit。共12个音效，每个0.5-1.0s，对应各法宝使用瞬间：

开山斧（碎石爆裂感）、回山符（传送闪现感）、杨枝甘露（水润治愈感）、紧箍咒（金属收紧感）、骷髅念珠（阴冷诅咒感）、照妖镜（镜面闪光感）、避火罩（护盾生成感）、芭蕉扇（狂风呼啸感）、老鼋甲（厚重护甲感）、甘露净露（净化水声感）、金刚琢（能量锁定感）、锦斓袈裟（佛光降临感）。

各音效短促有力，匹配对应法宝名称的听感意象，风格统一。不包含人声台词，不模仿版权旋律，每个音效独立可剪裁。
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

**提示词：**
```text
生成一组BOSS技能音效，用于Q版西游合成塔防微信小游戏。国风压迫感战斗风格，中国传统乐器（战鼓、大锣、低音弦乐、钹、号角），手机外放清晰震撼。WAV格式 44.1kHz 16-bit。共7个音效，每个0.8-1.5s：

反伤护盾（金属反弹共振感）、吸收单位（能量吸入漩涡感）、恐惧咆哮（狮子怒吼+锣声）、冲锋（高速破风声+战鼓）、践踏（地面重击低音+裂纹扩散感）、风刃（锋利破空切割声）、大型火球（火焰喷射爆裂+低音共鸣）。

各音效厚重有力，体现BOSS技能的威胁感和冲击力。不包含人声台词，不模仿版权旋律，每个音效独立可剪裁。
```

### 13.6 BGM（3 首）

```text
public/assets/audio/bgm_map.ogg      60s 可循环 取经地图 轻快国风 笛子琵琶古筝轻鼓
public/assets/audio/bgm_battle.ogg   60s 可循环 普通战斗 节奏明确 战鼓琵琶笛子锣
public/assets/audio/bgm_boss.ogg     45s 可循环  BOSS 战  紧张压迫 战鼓锣低音弦乐
```

**提示词：**
```text
生成3首游戏BGM背景音乐，用于Q版西游合成塔防微信小游戏。国风轻快可爱有战斗节奏，中国传统乐器为主（笛子、琵琶、古筝、鼓、锣、木鱼、铃铛），手机外放清晰。WAV格式 44.1kHz 16-bit，首尾适合无缝循环。

1. 取经地图BGM（60s可循环）：轻快国风旋律，笛子主旋律+琵琶点缀+古筝和声+轻鼓节奏，悠闲取经路途感，营造探索氛围。

2. 普通战斗BGM（60s可循环）：节奏明确，战鼓底节奏+琵琶拨弦+笛子间奏+铜锣节奏点缀，有战斗紧张感但不过于激烈，适合塔防对弈。

3. BOSS战BGM（45s可循环）：紧张压迫感，战鼓重击+大锣+低音弦乐持续+笛子高音紧张短句，营造BOSS战的紧迫和威胁感，节奏比普通战斗更强。

不包含人声歌词，不模仿任何已有游戏、动画、电影配乐的版权旋律。
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

### 🥉 第三批：扩充与音效（约 250 个文件）

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
