# AI 美术音效资源生成清单

> 用途：按本清单逐条生成《守护唐僧》正式美术、动画、特效和音效资源。生成完成后按「文件名」放入对应 `public/assets/` 目录。

## 一、统一生成规则

### 1. 使用方式

- 不要一次把所有提示词发给 AI。建议按本文件顺序，一条提示词生成一批资源。
- 第一批先生成小兵静态资源，用来确定整体风格；确认满意后，把满意的小兵静态图、20 个小兵静态 sheet、MVP 英雄静态图作为「风格参考图」保存好。
- 后续每次生成新资源时，都要上传或引用 1-3 张已满意的风格参考图，并追加「请严格保持参考图的线条粗细、色彩体系、Q版比例、光影方式、角色朝向和透明背景」。只写文字很容易跑风格。
- 静态角色、道具、UI 默认生成单张透明背景 PNG；如果一次生成多个角色或图标，先生成 sheet，后续再裁成多张单独 PNG。
- 动作动画不要生成视频、GIF 或 MP4。优先生成横向排列的透明背景 PNG sprite sheet；如果 AI 工具只能生成多张图，也可以生成同一动作的 PNG 帧序列。
- 战斗特效不要生成视频、GIF 或 MP4。优先生成横向排列的透明背景 PNG sprite sheet；如果 AI 工具只能生成多张图，也可以生成同一特效的 PNG 帧序列。
- PNG 帧序列可以直接接入 Phaser，也可以后续用 Aseprite、TexturePacker、Photopea、Photoshop、Krita 或 GIMP 拼成一张横向 sprite sheet。
- 帧序列不是随意散图：每帧必须透明背景、等宽等高、角色脚底锚点稳定、大小稳定，并按本清单的两位编号命名。
- 透明背景必须是真正的 alpha 透明通道；不要把灰白棋盘格、帧号、参考线或底座画进最终 PNG。
- 背景图不需要透明背景。
- 音效和 BGM 生成音频文件，建议先生成 WAV，再统一转为 `ogg` 或 `mp3`。
- 所有资源必须可商用；不要让 AI 模仿任何已有游戏、动画、电影或具体版权角色风格。

#### 可复制提示词流程

不要把整份文档一次发给 AI。实际生成时，先发「第一句」建立全局风格，再每次只复制一个具体资源提示词。AI 出错时，不要重发长提示词，只发纠错提示词让它重做。

第一句，用来建立风格：

```text
我在为一款《守护唐僧》Q版西游合成塔防微信小游戏生成可商用2D游戏素材。整体风格请统一为Q版西游、国风剪纸、轻皮影感、移动端小游戏资产；角色头大身小，轮廓清晰，颜色鲜明，小尺寸也能识别；透明背景，无文字，无水印，不模仿任何已有游戏、动画、电影或版权角色风格。
```

后续每次生成新资源时，先追加这一句：

```text
请严格保持我上传的参考图风格：线条粗细、色彩体系、Q版比例、头身比、光影方式、角色朝向、轮廓复杂度、透明背景都要一致。新角色只能改变身份、武器、颜色和动作，不要改变整体画风。
```

风格锁定提示词，用在已经有满意参考图之后：

```text
以下图片是已经确认通过的项目风格参考。请把它们当作唯一风格标准，不要重新发明画风。

必须保持：
1. 相同的Q版头身比和身体比例。
2. 相同的线条粗细、描边方式和阴影方式。
3. 相同的颜色饱和度、明暗对比和国风剪纸轻皮影质感。
4. 相同的45度轻俯视棋盘视角和角色朝向。
5. 相同的小尺寸可读性，适合80x80或96x96棋盘格。

允许改变：
角色身份、武器、服装元素、主色、动作阶段、攻击特效。

禁止改变：
不要变成像素风、厚涂、写实、3D、欧美魔幻、现代卡通、过度复杂细节、过暗配色、不同镜头角度。
```

动作动画通用模板：

```text
请生成【资源名称】【动作名】动作。

输出格式：
一张横向连续【帧数】帧 PNG sprite sheet。
每帧【帧宽】x【帧高】，整张最终尺寸【帧宽 x 帧数】x【帧高】。
透明背景，【帧数】帧从左到右依次排列。

画面内容：
【写角色、武器、动作过程、攻击拖尾或法术效果】。

关键要求：
每帧角色大小一致，脚底位置稳定，播放时不能抖动。
不要背景，不要灰白棋盘格，不要编号文字，不要水印。
```

小兵动作示例：

```text
请生成灵猴兵 attack 动作。

输出格式：
一张横向连续 6 帧 PNG sprite sheet。
每帧 80x80，整张最终尺寸 480x80。
透明背景，6 帧从左到右依次排列。

画面内容：
金黄/棕色Q版猴族战士，手持短棍，从蓄力、挥棍打出到收招，有金色棍影拖尾。

关键要求：
每帧角色大小一致，脚底位置稳定，播放时不能抖动。
不要背景，不要灰白棋盘格，不要编号文字，不要水印。
```

静态资源通用模板：

```text
请生成【资源名称】静态资源。

输出格式：
透明背景 PNG。若一次生成多个角色或图标，请做成等格静态 sheet。
每格【格子宽】x【格子高】，角色或图标完整居中，格子之间不要重叠。

画面内容：
【写每个角色或图标的造型、颜色、武器、识别特征】。

关键要求：
风格统一，小尺寸可读。
不要背景，不要灰白棋盘格，不要文字，不要编号，不要水印。
```

如果 AI 生成错误，用下面的纠错提示词：

```text
这张不合格。请重新生成同一个资源，只修正这些问题：
1. 必须是一张横向连续【帧数】帧 PNG sprite sheet。
2. 每帧必须是【帧宽】x【帧高】，整张必须是【整图宽】x【整图高】。
3. 必须是真透明背景，不要灰白棋盘格。
4. 不要把编号、文字、水印、参考线或底座画进图片。
5. 每帧角色大小一致，脚底位置保持一致，播放时不能抖动。
```

如果 AI 生成的图和前面风格不一致，用下面的纠错提示词：

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

如果连续两次仍然跑风格，降低生成难度：

```text
先不要生成完整动作。请只生成这个角色的单帧静态站立图，用来对齐参考图风格。
透明背景，尺寸【80x80/96x96/128x128】。
只要风格和参考图一致，暂时不要攻击动作、特效和复杂姿势。
```

如果 AI 只能输出一张大图但尺寸不标准，继续这样说：

```text
这张图的帧排列方向对了，但尺寸不合格。请重新输出为标准横条 sprite sheet：每帧【帧宽】x【帧高】，共【帧数】帧，整张【整图宽】x【整图高】，不要额外留白，不要边框，不要编号。
```

### 2. 资源类型说明

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

### 3. 动作动画与帧序列格式要求

所有 `idle`、`move`、`attack`、`death`、`skill`、`spawn` 都按下面格式生成：

```text
优先输出横向 sprite sheet，透明背景，最终是一张 PNG 图片，所有帧等宽等高，从左到右依次排列。若工具无法输出一张 sheet，可以输出同一动作的多张透明 PNG 单帧图，帧号从 01 开始连续编号。角色脚底位置稳定，角色大小稳定，不要镜头运动，不要背景，不要视频，不要 GIF，不要 MP4，不要把灰白棋盘格、帧号或文字画进图片。
```

帧序列命名规则：

```text
4 帧 idle：xxx_idle_01.png、xxx_idle_02.png、xxx_idle_03.png、xxx_idle_04.png
6 帧 attack：xxx_attack_01.png 到 xxx_attack_06.png
8 帧 BOSS attack：xxx_attack_01.png 到 xxx_attack_08.png
```

帧序列接入要求：

```text
同一个动作的所有帧必须在同一目录下，文件名只允许帧号不同。每张图片的像素尺寸必须完全一致，例如 80x80、96x96 或 128x128。透明区域也算尺寸，不能裁成每帧不同外框。角色或特效的中心点、脚底点要稳定，否则播放时会抖动。
```

推荐帧数：

```text
idle：4 帧
move：6 帧
attack：6 帧
death：6 帧
skill：6-8 帧
spawn：6-8 帧
```

推荐尺寸：

```text
小兵动作：每帧 80x80
英雄动作：每帧 96x96
普通敌人动作：每帧 80x80
精英敌人动作：每帧 96x96
BOSS 动作：每帧 128x128 或 160x160
```

sprite sheet 整图尺寸计算：

```text
4 帧小兵 idle：每帧 80x80，整张 320x80
6 帧小兵 attack：每帧 80x80，整张 480x80
4 帧英雄 idle：每帧 96x96，整张 384x96
6 帧英雄 attack：每帧 96x96，整张 576x96
6 帧普通敌人 move/death：每帧 80x80，整张 480x80
8 帧 BOSS attack/death：每帧 128x128，整张 1024x128
```

如果使用 PNG 帧序列，则不需要整图尺寸，只需要保证每张单帧图片就是对应的每帧尺寸，例如小兵 attack 共 6 张，每张都是 80x80。

### 4. 静态 sheet 与切图要求

静态角色、道具、UI 如果一次生成多个，按下面格式生成：

```C
静态资源 sheet，透明背景，每个格子等宽等高，每个角色或图标完整居中，格子之间不要重叠，不要加文字、编号、背景、水印。生成后需要裁剪成单张 PNG 放入项目。
```

常用静态 sheet 尺寸：

```text
4 行 5 列小兵静态：每格 80x80，整张 400x320，最终裁成 20 张单图
7 个英雄静态横排：每格 96x96，整张 672x96，最终裁成 7 张单图
10 个普通敌人横排：每格 80x80，整张 800x80，最终裁成 10 张单图
7 个 BOSS 横排：每格 128x128，整张 896x128，最终裁成 7 张单图
5 个道具图标横排：每格 128x128，整张 640x128，最终裁成 5 张单图
```

### 5. 音频格式要求

所有音效和 BGM 都按下面格式生成：

```text
只生成音频，不要视频。优先 WAV，44.1kHz，16-bit，干净开头和结尾，无人声台词，无版权旋律。短音效不要带长混响，BGM 需要能循环。
```

### 6. 图片统一风格提示词

```text
为一款《守护唐僧》西游题材 Q 版合成塔防微信小游戏生成正式美术资源。整体风格为 Q 版西游、国风剪纸、轻皮影感、移动端小游戏资产。所有角色头大身小，轮廓清晰，线条干净，颜色鲜明，高对比，小尺寸也能识别。视角为轻微 45 度俯视棋盘视角，适合放入 80x80 或 96x96 棋盘格。画面为 2D sprite，美术统一，不要写实，不要 3D，不要复杂背景，不要文字，不要水印，不要 logo，不要模仿任何已有游戏、动画、电影或版权角色风格。单体静态资源输出单张透明背景 PNG；多个静态资源输出等格 sheet 后裁切；动作和特效优先输出横向 PNG sprite sheet；如果工具无法输出一张 sheet，则输出同一动作或特效的编号透明 PNG 帧序列。
```

### 7. 图片反向提示词

```text
写实照片，3D渲染，厚涂，复杂背景，灰白棋盘格背景，文字，水印，logo，模糊，低清晰度，恐怖血腥，过多细节，暗色过重，版权角色，已有游戏角色风格，动画截图，电影截图，像素风，赛博朋克，欧美魔幻，现代服装
```

### 8. 音频统一风格提示词

```text
为一款 Q 版西游合成塔防微信小游戏生成音频资源。整体听感轻快、国风、可爱但有战斗节奏，适合手机外放，小音量也清楚。使用中国传统乐器元素，如笛子、琵琶、古筝、鼓、锣、木鱼、铃铛，但不要刺耳。音效短促干净，不要人声台词，不要版权旋律，不要模仿任何已有游戏、动画、电影音乐。输出无缝或干净结尾的 WAV 音频。
```

## 二、目录与命名规范

### 1. 目录

```text
public/assets/soldiers/   小兵静态图和动画
public/assets/heroes/     英雄静态图、动画、碎片头像、升级形态
public/assets/enemies/    敌人静态图和动画
public/assets/items/      道具图标
public/assets/ui/         HUD、按钮、卡牌、仓库、地图 UI
public/assets/effects/    战斗特效、升级特效、道具特效
public/assets/audio/      BGM 和音效
```

### 2. 图片文件命名

```text
小兵静态：public/assets/soldiers/soldier_{type}_rank_{rank}.png
小兵动画：public/assets/soldiers/soldier_{type}_{action}.png
小兵动画帧序列：public/assets/soldiers/soldier_{type}_{action}_{frame}.png

英雄静态：public/assets/heroes/hero_{heroId}_stage_{stage}.png
英雄动画：public/assets/heroes/hero_{heroId}_{action}.png
英雄动画帧序列：public/assets/heroes/hero_{heroId}_{action}_{frame}.png
英雄碎片：public/assets/heroes/shard_{heroId}.png

敌人静态：public/assets/enemies/enemy_{enemyId}.png
敌人动画：public/assets/enemies/enemy_{enemyId}_{action}.png
敌人动画帧序列：public/assets/enemies/enemy_{enemyId}_{action}_{frame}.png

道具图标：public/assets/items/item_{itemId}.png
UI 资源：public/assets/ui/ui_{name}.png
特效资源：public/assets/effects/effect_{name}.png
特效帧序列：public/assets/effects/effect_{name}_{frame}.png
音频资源：public/assets/audio/{type}_{name}.ogg
```

`{frame}` 统一使用两位数字，例如 `01`、`02`、`03`。不要使用 `1`、`2` 或中文编号，避免排序错误。

### 3. Phaser 帧序列接入示例

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

### 4. 动作名

```text
idle    待机
move    移动
attack  攻击
hit     受击
death   死亡
skill   技能
spawn   出场
```

### 5. 英雄升级阶段

```text
普通英雄 stage_1：1-4 级
普通英雄 stage_2：5-9 级
普通英雄 stage_3：10 级满级

核心英雄 stage_1：1-4 级
核心英雄 stage_2：5-9 级
核心英雄 stage_3：10-14 级
核心英雄 stage_4：15 级满级
```

## 三、小兵资源

### 1. 小兵静态图

资源类型：图片，透明背景 PNG。不要生成视频。最终需要裁成单张 PNG 放入项目。

生成方式：建议一次生成一张 4 行 5 列静态 sprite sheet，每格 80x80，整张建议 400x320，导出后切成 20 张单图。

输出文件：

```text
public/assets/soldiers/soldier_monkey_rank_1.png
public/assets/soldiers/soldier_monkey_rank_2.png
public/assets/soldiers/soldier_monkey_rank_3.png
public/assets/soldiers/soldier_monkey_rank_4.png
public/assets/soldiers/soldier_monkey_rank_5.png
public/assets/soldiers/soldier_soldier_rank_1.png
public/assets/soldiers/soldier_soldier_rank_2.png
public/assets/soldiers/soldier_soldier_rank_3.png
public/assets/soldiers/soldier_soldier_rank_4.png
public/assets/soldiers/soldier_soldier_rank_5.png
public/assets/soldiers/soldier_rider_rank_1.png
public/assets/soldiers/soldier_rider_rank_2.png
public/assets/soldiers/soldier_rider_rank_3.png
public/assets/soldiers/soldier_rider_rank_4.png
public/assets/soldiers/soldier_rider_rank_5.png
public/assets/soldiers/soldier_archer_rank_1.png
public/assets/soldiers/soldier_archer_rank_2.png
public/assets/soldiers/soldier_archer_rank_3.png
public/assets/soldiers/soldier_archer_rank_4.png
public/assets/soldiers/soldier_archer_rank_5.png
```

提示词：

```text
生成一张透明背景 2D 静态 sprite sheet，内容是《守护唐僧》Q版西游塔防小兵资源，4 行 5 列，共 20 个独立小兵。每个格子固定 80x80，整张建议 400x320，每个小兵完整居中，格子之间不要重叠，后续会裁成 20 张单独 PNG。所有小兵风格统一，头大身小，轮廓清晰，适合 80x80 棋盘格。第一行是灵猴兵 1 到 5 阶：金黄/棕色，小猴战士，短棍，敏捷近战轮廓，阶级颜色依次为白、绿、蓝、紫、橙，阶级越高边框和装饰越华丽。第二行是天兵甲士 1 到 5 阶：蓝/银色，天庭甲士，长枪和圆盾，盔甲整洁，阶级颜色依次为白、绿、蓝、紫、橙。第三行是妖王骑 1 到 5 阶：紫/朱红色，骑兽妖兵，重斧，厚重范围群攻感，阶级颜色依次为白、绿、蓝、紫、橙。第四行是道法弓手 1 到 5 阶：青绿色，道袍弓手，弓箭和符咒，远程法术感，阶级颜色依次为白、绿、蓝、紫、橙。透明背景，无文字，无编号，无水印。
```

### 2. 小兵动作

资源类型：图片，透明背景 PNG sprite sheet。不要生成视频、GIF 或 MP4。优先使用一张横向多帧 PNG；如果 AI 工具只能输出多张单帧 PNG，也可以按本清单的帧序列命名直接放入项目。

小兵 MVP 阶段可以只生成 `idle` 和 `attack`，受击用程序闪白，死亡可先用缩放淡出。

输出文件：

```text
public/assets/soldiers/soldier_monkey_idle.png
public/assets/soldiers/soldier_monkey_attack.png
public/assets/soldiers/soldier_soldier_idle.png
public/assets/soldiers/soldier_soldier_attack.png
public/assets/soldiers/soldier_rider_idle.png
public/assets/soldiers/soldier_rider_attack.png
public/assets/soldiers/soldier_archer_idle.png
public/assets/soldiers/soldier_archer_attack.png
```

提示词：

```text
生成灵猴兵Q版西游塔防小兵 idle 动作，一张横向连续 4 帧 PNG sprite sheet，透明背景，每帧 80x80，整张最终尺寸 320x80，如果无法输出一张 sheet，请输出 4 张按编号命名的透明单帧 PNG。金黄/棕色猴族战士，手持短棍，轻微呼吸和待机晃动，角色位置稳定，适合 80x80 棋盘格，线条粗细和上一批资源完全一致，无文字，无水印，小尺寸可读。
```

```text
生成灵猴兵Q版西游塔防小兵 attack 动作，一张横向连续 6 帧 PNG sprite sheet，透明背景，每帧 80x80，整张最终尺寸 480x80，如果无法输出一张 sheet，请输出 6 张按编号命名的透明单帧 PNG。金黄/棕色猴族战士，挥舞短棍，从蓄力到打出再收招，有金色棍影拖尾和战斗力量感，角色位置稳定，适合 80x80 棋盘格，线条粗细和上一批资源完全一致，无文字，无水印，小尺寸可读。
```

```text
生成天兵甲士Q版西游塔防小兵 idle 动作，一张横向连续 4 帧 PNG sprite sheet，透明背景，每帧 80x80，整张最终尺寸 320x80，如果无法输出一张 sheet，请输出 4 张按编号命名的透明单帧 PNG。蓝/银色天庭甲士，手持长枪和圆盾，军阵感，轻微呼吸和盾牌晃动，角色位置稳定，适合 80x80 棋盘格，线条粗细和上一批资源完全一致，无文字，无水印，小尺寸可读。
```

```text
生成天兵甲士Q版西游塔防小兵 attack 动作，一张横向连续 6 帧 PNG sprite sheet，透明背景，每帧 80x80，整张最终尺寸 480x80，如果无法输出一张 sheet，请输出 6 张按编号命名的透明单帧 PNG。蓝/银色天庭甲士，用长枪向前刺击，盾牌护身，有银蓝色刺击拖尾和军阵冲击感，角色位置稳定，适合 80x80 棋盘格，线条粗细和上一批资源完全一致，无文字，无水印，小尺寸可读。
```

```text
生成妖王骑Q版西游塔防小兵 idle 动作，一张横向连续 4 帧 PNG sprite sheet，透明背景，每帧 80x80，整张最终尺寸 320x80，如果无法输出一张 sheet，请输出 4 张按编号命名的透明单帧 PNG。紫/朱红色骑兽妖兵，手持重斧，骑兽轻微踏步，厚重有冲击感，角色位置稳定，适合 80x80 棋盘格，线条粗细和上一批资源完全一致，无文字，无水印，小尺寸可读。
```

```text
生成妖王骑Q版西游塔防小兵 attack 动作，一张横向连续 6 帧 PNG sprite sheet，透明背景，每帧 80x80，整张最终尺寸 480x80，如果无法输出一张 sheet，请输出 6 张按编号命名的透明单帧 PNG。紫/朱红色骑兽妖兵，挥动重斧进行范围劈砍，有红紫色弧形斩击拖尾和重击压迫感，角色位置稳定，适合 80x80 棋盘格，线条粗细和上一批资源完全一致，无文字，无水印，小尺寸可读。
```

```text
生成道法弓手Q版西游塔防小兵 idle 动作，一张横向连续 4 帧 PNG sprite sheet，透明背景，每帧 80x80，整张最终尺寸 320x80，如果无法输出一张 sheet，请输出 4 张按编号命名的透明单帧 PNG。青绿色道袍弓手，手持弓箭和符咒，轻微呼吸，符咒微微发光，角色位置稳定，适合 80x80 棋盘格，线条粗细和上一批资源完全一致，无文字，无水印，小尺寸可读。
```

```text
生成道法弓手Q版西游塔防小兵 attack 动作，一张横向连续 6 帧 PNG sprite sheet，透明背景，每帧 80x80，整张最终尺寸 480x80，如果无法输出一张 sheet，请输出 6 张按编号命名的透明单帧 PNG。青绿色道袍弓手，拉弓射出符咒箭，有青绿色法术拖尾，动作利落有战斗感，角色位置稳定，适合 80x80 棋盘格，线条粗细和上一批资源完全一致，无文字，无水印，小尺寸可读。
```

## 四、英雄资源

### 1. MVP 英雄静态图

资源类型：图片，透明背景 PNG。不要生成视频。最终需要裁成单张 PNG 放入项目。

输出文件：

```text
public/assets/heroes/hero_sunwukong_stage_1.png
public/assets/heroes/hero_zhubajie_stage_1.png
public/assets/heroes/hero_shawujing_stage_1.png
public/assets/heroes/hero_bailongma_stage_1.png
public/assets/heroes/hero_guanyin_stage_1.png
public/assets/heroes/hero_honghaier_stage_1.png
public/assets/heroes/hero_nezha_stage_1.png
```

提示词：

```text
生成一张透明背景 2D 静态 sprite sheet，内容是《守护唐僧》Q版西游塔防 MVP 英雄棋盘单位，7 个独立角色横向排列。每个格子固定 96x96，整张建议 672x96，每个英雄完整居中，格子之间不要重叠，后续会裁成 7 张单独 PNG。角色依次为：孙悟空，核心英雄，猴王冠，金箍棒，金色爆发光环，近战爆发感；猪八戒，普通英雄，大肚厚重，九齿钉耙，坦克感，银青边框感；沙悟净，普通英雄，蓝灰水纹，月牙铲，沉稳防御感；白龙马，普通英雄，白龙和马头元素，白色箭光，穿透远程感；观音，核心英雄，莲花，玉净瓶，柔和治疗光环，金色红金边框感；红孩儿，核心英雄，火焰头发，火尖枪，红橙火圈，法术群攻感；哪吒，核心英雄，风火轮，火尖枪，红绫，多目标攻击感。所有角色风格统一，适合 80x80 棋盘格显示，头大身小，轮廓清晰，小尺寸可读，透明背景，无文字，无水印。
```

### 2. 扩展英雄静态图

资源类型：图片，透明背景 PNG。不要生成视频。最终需要裁成单张 PNG 放入项目。

输出文件：

```text
public/assets/heroes/hero_niumowang_stage_1.png
public/assets/heroes/hero_erlangshen_stage_1.png
public/assets/heroes/hero_taishanglaojun_stage_1.png
public/assets/heroes/hero_heixiongjing_stage_1.png
public/assets/heroes/hero_baigufuren_stage_1.png
public/assets/heroes/hero_zhizhujing_stage_1.png
public/assets/heroes/hero_tuotatianwang_stage_1.png
```

提示词：

```text
生成一张透明背景 2D 静态 sprite sheet，内容是《守护唐僧》Q版西游塔防扩展英雄棋盘单位，7 个独立角色横向排列。每个格子固定 96x96，整张建议 672x96，每个英雄完整居中，格子之间不要重叠，后续会裁成 7 张单独 PNG。风格与上一批 MVP 英雄完全一致，适合 80x80 棋盘格显示。角色依次为：牛魔王，核心英雄，牛角，重甲，暗红和金色，狂暴坦克感；二郎神，核心英雄，天眼，长枪，蓝金配色，远程狙击感；太上老君，核心英雄，丹炉火焰，道袍，紫金配色，持续灼烧感；黑熊精，普通英雄，黑棕熊妖，厚甲，物理肉盾感；白骨夫人，普通英雄，白骨轮廓，灰白紫配色，召唤输出感；蜘蛛精，普通英雄，蛛网纹样，紫色，范围减速感；托塔天王，普通英雄，宝塔，蓝金盔甲，群体控制感。透明背景，无文字，无水印。
```

### 3. 英雄升级形态

资源类型：图片，透明背景 PNG 或横向静态 sprite sheet。不要生成视频。多个升级形态可以先生成一张横向 sheet，之后裁成单张 PNG 放入项目。

每名英雄后续至少补强化形态。普通英雄补 `stage_2`、`stage_3`；核心英雄补 `stage_2`、`stage_3`、`stage_4`。

输出文件示例：

```text
public/assets/heroes/hero_sunwukong_stage_2.png
public/assets/heroes/hero_sunwukong_stage_3.png
public/assets/heroes/hero_sunwukong_stage_4.png
public/assets/heroes/hero_zhubajie_stage_2.png
public/assets/heroes/hero_zhubajie_stage_3.png
```

提示词：

```text
基于上一张孙悟空基础形态，生成孙悟空核心英雄升级形态静态 sprite sheet，3 个独立形态横向排列，透明背景。每个格子固定 96x96，整张建议 288x96，每个形态完整居中，后续会裁成 3 张单独 PNG，适合 80x80 棋盘格显示。第 1 个为 5-9 级强化形态，金箍棒更亮，金色边框更明显；第 2 个为 10-14 级强化形态，增加猴王冠装饰和金色爆发光；第 3 个为 15 级满级形态，金红光环最强，武器拖尾更明显。保持原角色身份、比例、线条和色彩完全一致，无文字，无水印。
```

```text
基于上一张猪八戒基础形态，生成猪八戒普通英雄升级形态静态 sprite sheet，2 个独立形态横向排列，透明背景。每个格子固定 96x96，整张建议 192x96，每个形态完整居中，后续会裁成 2 张单独 PNG，适合 80x80 棋盘格显示。第 1 个为 5-9 级强化形态，九齿钉耙更亮，护甲更厚；第 2 个为 10 级满级形态，银青边框更明显，坦克感更强。保持原角色身份、比例、线条和色彩完全一致，无文字，无水印。
```

```text
基于上一张沙悟净基础形态，生成沙悟净普通英雄升级形态静态 sprite sheet，2 个独立形态横向排列，透明背景。每个格子固定 96x96，整张建议 192x96，每个形态完整居中，后续会裁成 2 张单独 PNG，适合 80x80 棋盘格显示。第 1 个为 5-9 级强化形态，月牙铲更亮，蓝灰水纹更明显；第 2 个为 10 级满级形态，防御装饰更强，水纹护盾更明显。保持原角色身份、比例、线条和色彩完全一致，无文字，无水印。
```

```text
基于上一张白龙马基础形态，生成白龙马普通英雄升级形态静态 sprite sheet，2 个独立形态横向排列，透明背景。每个格子固定 96x96，整张建议 192x96，每个形态完整居中，后续会裁成 2 张单独 PNG，适合 80x80 棋盘格显示。第 1 个为 5-9 级强化形态，白龙纹样更清楚，箭光更亮；第 2 个为 10 级满级形态，白色穿透箭光和龙形光效更明显。保持原角色身份、比例、线条和色彩完全一致，无文字，无水印。
```

```text
基于上一张观音基础形态，生成观音核心英雄升级形态静态 sprite sheet，3 个独立形态横向排列，透明背景。每个格子固定 96x96，整张建议 288x96，每个形态完整居中，后续会裁成 3 张单独 PNG，适合 80x80 棋盘格显示。第 1 个为 5-9 级强化形态，莲花更亮，治疗光环更明显；第 2 个为 10-14 级强化形态，玉净瓶水光更强；第 3 个为 15 级满级形态，金色和青绿色治疗光环最强。保持原角色身份、比例、线条和色彩完全一致，无文字，无水印。
```

```text
基于上一张红孩儿基础形态，生成红孩儿核心英雄升级形态静态 sprite sheet，3 个独立形态横向排列，透明背景。每个格子固定 96x96，整张建议 288x96，每个形态完整居中，后续会裁成 3 张单独 PNG，适合 80x80 棋盘格显示。第 1 个为 5-9 级强化形态，火尖枪更亮；第 2 个为 10-14 级强化形态，火焰头发和红橙火圈更明显；第 3 个为 15 级满级形态，三昧真火光环最强。保持原角色身份、比例、线条和色彩完全一致，无文字，无水印。
```

```text
基于上一张哪吒基础形态，生成哪吒核心英雄升级形态静态 sprite sheet，3 个独立形态横向排列，透明背景。每个格子固定 96x96，整张建议 288x96，每个形态完整居中，后续会裁成 3 张单独 PNG，适合 80x80 棋盘格显示。第 1 个为 5-9 级强化形态，风火轮更亮；第 2 个为 10-14 级强化形态，火尖枪和红绫更明显；第 3 个为 15 级满级形态，多目标攻击光效和金红光环最强。保持原角色身份、比例、线条和色彩完全一致，无文字，无水印。
```

### 4. MVP 英雄动作

资源类型：图片，透明背景 PNG sprite sheet。不要生成视频、GIF 或 MP4。优先使用一张横向多帧 PNG；如果 AI 工具只能输出多张单帧 PNG，也可以按本清单的帧序列命名直接放入项目。

输出文件：

```text
public/assets/heroes/hero_sunwukong_idle.png
public/assets/heroes/hero_sunwukong_attack.png
public/assets/heroes/hero_zhubajie_idle.png
public/assets/heroes/hero_zhubajie_attack.png
public/assets/heroes/hero_shawujing_idle.png
public/assets/heroes/hero_shawujing_attack.png
public/assets/heroes/hero_bailongma_idle.png
public/assets/heroes/hero_bailongma_attack.png
public/assets/heroes/hero_guanyin_idle.png
public/assets/heroes/hero_guanyin_attack.png
public/assets/heroes/hero_honghaier_idle.png
public/assets/heroes/hero_honghaier_attack.png
public/assets/heroes/hero_nezha_idle.png
public/assets/heroes/hero_nezha_attack.png
```

提示词：

```text
生成孙悟空Q版西游塔防英雄 idle 动作，一张横向连续 4 帧 PNG sprite sheet，透明背景，每帧 96x96，整张最终尺寸 384x96，如果无法输出一张 sheet，请输出 4 张按编号命名的透明单帧 PNG。猴王冠，金箍棒，金色轻微光环，英武待机姿态，角色位置稳定，适合 80x80 棋盘格显示，风格与上一批英雄完全一致，无文字，无水印，小尺寸可读。
```

```text
生成孙悟空Q版西游塔防英雄 attack 动作，一张横向连续 6 帧 PNG sprite sheet，透明背景，每帧 96x96，整张最终尺寸 576x96，如果无法输出一张 sheet，请输出 6 张按编号命名的透明单帧 PNG。从蓄力、挥舞金箍棒到收招，金箍棒有金色拖尾，近战爆发感强，动作凌厉，角色位置稳定，适合 80x80 棋盘格显示，风格与上一批英雄完全一致，无文字，无水印，小尺寸可读。
```

```text
生成猪八戒Q版西游塔防英雄 idle 动作，一张横向连续 4 帧 PNG sprite sheet，透明背景，每帧 96x96，整张最终尺寸 384x96，如果无法输出一张 sheet，请输出 4 张按编号命名的透明单帧 PNG。大肚厚重，九齿钉耙，沉稳待机，坦克感，厚重但可爱，角色位置稳定，适合 80x80 棋盘格显示，风格与上一批英雄完全一致，无文字，无水印。
```

```text
生成猪八戒Q版西游塔防英雄 attack 动作，一张横向连续 6 帧 PNG sprite sheet，透明背景，每帧 96x96，整张最终尺寸 576x96，如果无法输出一张 sheet，请输出 6 张按编号命名的透明单帧 PNG。挥舞九齿钉耙重击，从蓄力到砸下，有土黄色冲击感，动作沉重有力量，角色位置稳定，适合 80x80 棋盘格显示，风格与上一批英雄完全一致，无文字，无水印。
```

```text
生成沙悟净Q版西游塔防英雄 idle 动作，一张横向连续 4 帧 PNG sprite sheet，透明背景，每帧 96x96，整张最终尺寸 384x96，如果无法输出一张 sheet，请输出 4 张按编号命名的透明单帧 PNG。蓝灰水纹，月牙铲，沉稳防御姿态，角色位置稳定，适合 80x80 棋盘格显示，风格与上一批英雄完全一致，无文字，无水印。
```

```text
生成沙悟净Q版西游塔防英雄 attack 动作，一张横向连续 6 帧 PNG sprite sheet，透明背景，每帧 96x96，整张最终尺寸 576x96，如果无法输出一张 sheet，请输出 6 张按编号命名的透明单帧 PNG。用月牙铲横扫并释放蓝色减速水纹，动作稳重有控制感，角色位置稳定，适合 80x80 棋盘格显示，风格与上一批英雄完全一致，无文字，无水印。
```

```text
生成白龙马Q版西游塔防英雄 idle 动作，一张横向连续 4 帧 PNG sprite sheet，透明背景，每帧 96x96，整张最终尺寸 384x96，如果无法输出一张 sheet，请输出 4 张按编号命名的透明单帧 PNG。白龙和马头元素，白色箭光，轻微待机，角色位置稳定，适合 80x80 棋盘格显示，风格与上一批英雄完全一致，无文字，无水印。
```

```text
生成白龙马Q版西游塔防英雄 attack 动作，一张横向连续 6 帧 PNG sprite sheet，透明背景，每帧 96x96，整张最终尺寸 576x96，如果无法输出一张 sheet，请输出 6 张按编号命名的透明单帧 PNG。释放白色穿透箭光和龙形光效，从蓄力到发射，动作利落，角色位置稳定，适合 80x80 棋盘格显示，风格与上一批英雄完全一致，无文字，无水印。
```

```text
生成观音Q版西游塔防英雄 idle 动作，一张横向连续 4 帧 PNG sprite sheet，透明背景，每帧 96x96，整张最终尺寸 384x96，如果无法输出一张 sheet，请输出 4 张按编号命名的透明单帧 PNG。莲花，玉净瓶，柔和青绿色治疗光环，庄严漂浮待机，角色位置稳定，适合 80x80 棋盘格显示，风格与上一批英雄完全一致，无文字，无水印。
```

```text
生成观音Q版西游塔防英雄 attack 动作，一张横向连续 6 帧 PNG sprite sheet，透明背景，每帧 96x96，整张最终尺寸 576x96，如果无法输出一张 sheet，请输出 6 张按编号命名的透明单帧 PNG。玉净瓶洒出青绿色水光，莲花治疗光圈扩散，庄严法术感，角色位置稳定，适合 80x80 棋盘格显示，风格与上一批英雄完全一致，无文字，无水印。
```

```text
生成红孩儿Q版西游塔防英雄 idle 动作，一张横向连续 4 帧 PNG sprite sheet，透明背景，每帧 96x96，整张最终尺寸 384x96，如果无法输出一张 sheet，请输出 4 张按编号命名的透明单帧 PNG。火焰头发，火尖枪，红橙火圈，轻微火焰跳动，角色位置稳定，适合 80x80 棋盘格显示，风格与上一批英雄完全一致，无文字，无水印。
```

```text
生成红孩儿Q版西游塔防英雄 attack 动作，一张横向连续 6 帧 PNG sprite sheet，透明背景，每帧 96x96，整张最终尺寸 576x96，如果无法输出一张 sheet，请输出 6 张按编号命名的透明单帧 PNG。挥动火尖枪释放红橙火焰爆发，从蓄力到火焰喷出，攻击气势强，角色位置稳定，适合 80x80 棋盘格显示，风格与上一批英雄完全一致，无文字，无水印。
```

```text
生成哪吒Q版西游塔防英雄 idle 动作，一张横向连续 4 帧 PNG sprite sheet，透明背景，每帧 96x96，整张最终尺寸 384x96，如果无法输出一张 sheet，请输出 4 张按编号命名的透明单帧 PNG。风火轮，火尖枪，红绫，神将漂浮待机，角色位置稳定，适合 80x80 棋盘格显示，风格与上一批英雄完全一致，无文字，无水印。
```

```text
生成哪吒Q版西游塔防英雄 attack 动作，一张横向连续 6 帧 PNG sprite sheet，透明背景，每帧 96x96，整张最终尺寸 576x96，如果无法输出一张 sheet，请输出 6 张按编号命名的透明单帧 PNG。风火轮旋转，火尖枪连续攻击，产生多个红橙枪影，神将战斗气势强，角色位置稳定，适合 80x80 棋盘格显示，风格与上一批英雄完全一致，无文字，无水印。
```

### 5. 英雄碎片图标

资源类型：图片，透明背景 PNG。不要生成视频。最终需要裁成单张 PNG 放入项目。

输出文件：

```text
public/assets/heroes/shard_sunwukong.png
public/assets/heroes/shard_zhubajie.png
public/assets/heroes/shard_shawujing.png
public/assets/heroes/shard_bailongma.png
public/assets/heroes/shard_guanyin.png
public/assets/heroes/shard_honghaier.png
public/assets/heroes/shard_nezha.png
public/assets/heroes/shard_niumowang.png
public/assets/heroes/shard_erlangshen.png
public/assets/heroes/shard_taishanglaojun.png
public/assets/heroes/shard_heixiongjing.png
public/assets/heroes/shard_baigufuren.png
public/assets/heroes/shard_zhizhujing.png
public/assets/heroes/shard_tuotatianwang.png
```

提示词：

```text
生成一张透明背景 2D icon sheet，内容是《守护唐僧》英雄碎片图标，14 个图标横向排列。每个格子固定 96x96，整张建议 1344x96，每个图标完整居中，格子之间不要重叠，后续会裁成 14 张单独 PNG。每个图标为彩色玉片碎片形状，内部带对应英雄的简化头像或标志物，小尺寸可读，普通英雄使用青绿色/银色边框，核心英雄使用金红边框。顺序为孙悟空、猪八戒、沙悟净、白龙马、观音、红孩儿、哪吒、牛魔王、二郎神、太上老君、黑熊精、白骨夫人、蜘蛛精、托塔天王。无文字，无水印。
```

## 五、敌人资源

### 1. 普通敌人静态图

资源类型：图片，透明背景 PNG。不要生成视频。最终需要裁成单张 PNG 放入项目。

输出文件：

```text
public/assets/enemies/enemy_xiaoyao_1.png
public/assets/enemies/enemy_xiaoyao_2.png
public/assets/enemies/enemy_xiaoyao_3.png
public/assets/enemies/enemy_xiaoyao_4.png
public/assets/enemies/enemy_xiaoyao_5.png
public/assets/enemies/enemy_xiaoyao_6.png
public/assets/enemies/enemy_xiaoyao_7.png
public/assets/enemies/enemy_xiaoyao_8.png
public/assets/enemies/enemy_xiaoyao_9.png
public/assets/enemies/enemy_xiaoyao_10.png
```

提示词：

```text
生成一张透明背景 2D 静态 sprite sheet，内容是《守护唐僧》Q版西游塔防普通敌人，10 个独立敌人横向排列。每个格子固定 80x80，整张建议 800x80，每个敌人完整居中，格子之间不要重叠，后续会裁成 10 张单独 PNG。统一轻微 45 度俯视移动方向，适合 80x80 棋盘格。敌人依次为：小妖喽啰，小体型，暗红，杂兵感；骷髅妖，白骨轮廓，灰白色；蝙蝠妖，深紫色，翅膀轮廓；巡山妖，棕红色，山野小妖感；水妖，蓝绿色，水纹感；虾兵，蓝灰色，甲壳和长枪；蟹将，灰蓝色，大钳和甲壳；火妖，红橙色，火焰轮廓；熔岩怪，暗红岩石和橙色裂纹；狮驼小妖，暗红棕色，狮驼岭杂兵感。所有敌人 Q 版但有威胁感，轮廓清晰，透明背景，无文字，无水印。
```

### 2. 精英敌人静态图

资源类型：图片，透明背景 PNG。不要生成视频。最终需要裁成单张 PNG 放入项目。

输出文件：

```text
public/assets/enemies/enemy_elite_huangfeng.png
public/assets/enemies/enemy_elite_huli.png
public/assets/enemies/enemy_elite_kuangtou.png
public/assets/enemies/enemy_elite_dapeng.png
```

提示词：

```text
生成一张透明背景 2D 静态 sprite sheet，内容是《守护唐僧》Q版西游塔防精英敌人，4 个独立精英怪横向排列。每个格子固定 96x96，整张建议 384x96，每个精英怪完整居中，格子之间不要重叠，后续会裁成 4 张单独 PNG。体型比普通敌人更大，轮廓更强，适合 96x96 棋盘表现。敌人依次为：黄风怪，黄褐色，风纹和沙尘特效，精英体型；狐狸精，粉紫色，狐耳和尾巴，灵巧精英感；象兵，灰色重甲，大象轮廓，重型精英感；大鹏鹰，蓝紫色，宽大翅膀，高速飞行感。透明背景，无文字，无水印。
```

### 3. BOSS 静态图

资源类型：图片，透明背景 PNG。不要生成视频。最终需要裁成单张 PNG 放入项目。

输出文件：

```text
public/assets/enemies/enemy_boss_heixiongjing.png
public/assets/enemies/enemy_boss_jinjiao.png
public/assets/enemies/enemy_boss_honghaier.png
public/assets/enemies/enemy_boss_baigufuren.png
public/assets/enemies/enemy_boss_qingshi.png
public/assets/enemies/enemy_boss_baixiang.png
public/assets/enemies/enemy_boss_dapengjinchi.png
```

提示词：

```text
生成一张透明背景 2D 静态 sprite sheet，内容是《守护唐僧》Q版西游塔防 BOSS 敌人，7 个独立 BOSS 横向排列。每个格子固定 128x128，整张建议 896x128，每个 BOSS 完整居中，格子之间不要重叠，后续会裁成 7 张单独 PNG。体型明显大于普通敌人，适合 128x128 显示，轮廓强，压迫感强。BOSS 依次为：黑熊精，黑棕色，重甲，大体型；金角大王，金色角冠，金棕配色，法宝感；红孩儿，红橙火焰，火尖枪，火焰光环；白骨夫人，白骨和紫灰色，阴冷法术感；青狮，青绿色狮妖，厚重鬃毛；白象，灰白巨象妖，重甲防御感；大鹏金翅雕，蓝金巨鸟妖，大翅膀，高速压迫感。所有 BOSS Q 版但有威胁感，透明背景，无文字，无水印。
```

### 4. 敌人动作

资源类型：图片，透明背景 PNG sprite sheet。不要生成视频、GIF 或 MP4。优先使用一张横向多帧 PNG；如果 AI 工具只能输出多张单帧 PNG，也可以按本清单的帧序列命名直接放入项目。

普通敌人优先生成 `move`、`death`；BOSS 额外生成 `idle`、`attack`、`spawn`。

输出文件示例：

```text
public/assets/enemies/enemy_xiaoyao_1_move.png
public/assets/enemies/enemy_xiaoyao_1_death.png
public/assets/enemies/enemy_boss_heixiongjing_idle.png
public/assets/enemies/enemy_boss_heixiongjing_move.png
public/assets/enemies/enemy_boss_heixiongjing_attack.png
public/assets/enemies/enemy_boss_heixiongjing_death.png
public/assets/enemies/enemy_boss_heixiongjing_spawn.png
```

提示词：

```text
生成小妖喽啰Q版西游塔防敌人 move 动作，一张横向连续 6 帧 PNG sprite sheet，透明背景，每帧 80x80，整张最终尺寸 480x80，如果无法输出一张 sheet，请输出 6 张按编号命名的透明单帧 PNG。小体型暗红杂兵，沿道路向右下方小跑移动，角色位置稳定，适合 80x80 棋盘格，风格与上一批普通敌人完全一致，无文字，无水印。
```

```text
生成小妖喽啰Q版西游塔防敌人 death 动作，一张横向连续 6 帧 PNG sprite sheet，透明背景，每帧 80x80，整张最终尺寸 480x80，如果无法输出一张 sheet，请输出 6 张按编号命名的透明单帧 PNG。小体型暗红杂兵，从受击、倒下到消散成烟尘，不能血腥，角色位置稳定，适合 80x80 棋盘格，风格与上一批普通敌人完全一致，无文字，无水印。
```

```text
生成黑熊精 BOSS Q版西游塔防 idle 动作，一张横向连续 4 帧 PNG sprite sheet，透明背景，每帧 128x128，整张最终尺寸 512x128，如果无法输出一张 sheet，请输出 4 张按编号命名的透明单帧 PNG。黑棕色重甲大体型，轻微呼吸和威压感，角色位置稳定，适合 128x128 显示，风格与上一批 BOSS 完全一致，无文字，无水印。
```

```text
生成黑熊精 BOSS Q版西游塔防 attack 动作，一张横向连续 8 帧 PNG sprite sheet，透明背景，每帧 128x128，整张最终尺寸 1024x128，如果无法输出一张 sheet，请输出 8 张按编号命名的透明单帧 PNG。黑棕色重甲大体型，抬爪重击地面，产生金棕色冲击波，角色位置稳定，适合 128x128 显示，风格与上一批 BOSS 完全一致，无文字，无水印。
```

```text
生成黑熊精 BOSS Q版西游塔防 death 动作，一张横向连续 8 帧 PNG sprite sheet，透明背景，每帧 128x128，整张最终尺寸 1024x128，如果无法输出一张 sheet，请输出 8 张按编号命名的透明单帧 PNG。黑棕色重甲大体型，从受击崩溃、跪倒到化为烟尘，不能血腥，角色位置稳定，适合 128x128 显示，风格与上一批 BOSS 完全一致，无文字，无水印。
```

## 六、道具图标

资源类型：图片，透明背景 PNG。不要生成视频。最终需要裁成单张 PNG 放入项目。

输出文件：

```text
public/assets/items/item_kaishanfu.png
public/assets/items/item_jiuzhuanxiandan.png
public/assets/items/item_tongyongsuipian.png
public/assets/items/item_jinguzhou.png
public/assets/items/item_yujingping.png
```

提示词：

```text
生成一张透明背景 2D game icon sheet，内容是《守护唐僧》西游塔防道具图标，5 个方形图标横向排列。每个格子固定 128x128，整张建议 640x128，每个图标完整居中，格子之间不要重叠，后续会裁成 5 张单独 PNG。适合 48x48 和 96x96 显示，粗轮廓，高对比。图标依次为：开山斧，金色斧头和山石裂纹，金色/岩灰；九转仙丹，红金丹药和发光圆环，红色/金色；通用碎片，彩色玉片或拼图碎片，紫色/青蓝；紧箍咒，金箍圆环和压制光效，金色；玉净瓶，白玉瓶和蓝绿色水光，白色/青绿。无文字，无水印，无背景。
```

## 七、UI 资源

### 1. UI 图标

资源类型：图片，透明背景 PNG。不要生成视频。最终需要裁成单张 PNG 放入项目。

输出文件：

```text
public/assets/ui/ui_icon_peach.png
public/assets/ui/ui_icon_hp.png
public/assets/ui/ui_icon_wave.png
public/assets/ui/ui_icon_kill.png
public/assets/ui/ui_icon_pause.png
public/assets/ui/ui_icon_star.png
public/assets/ui/ui_icon_sweep.png
public/assets/ui/ui_icon_ad_reward.png
```

提示词：

```text
生成一张透明背景 2D mobile game UI icon sheet，内容是《守护唐僧》Q版西游塔防 UI 图标，8 个图标横向排列。每个格子固定 64x64，整张建议 512x64，每个图标完整居中，格子之间不要重叠，后续会裁成 8 张单独 PNG。风格统一，适合 32x32 和 64x64 显示。图标依次为：仙桃货币图标，粉红和金色；唐僧血量爱心，红色和金色；波次旗帜，朱红和金色；击杀标记，墨蓝和金色；暂停按钮，墨蓝和金色；星级评分，金色五角星；扫荡图标，卷轴和金色闪光；广告奖励图标，金色礼盒和播放三角。无文字，无水印，透明背景。
```

### 2. 卡牌和仓库 UI

资源类型：图片，透明背景 PNG。不要生成视频。最终需要裁成单张 PNG 放入项目。

输出文件：

```text
public/assets/ui/ui_card_soldier.png
public/assets/ui/ui_card_hero_shard.png
public/assets/ui/ui_card_item.png
public/assets/ui/ui_frame_hero_normal.png
public/assets/ui/ui_frame_hero_core.png
public/assets/ui/ui_inventory_slot_empty.png
public/assets/ui/ui_inventory_slot_highlight.png
public/assets/ui/ui_button_summon.png
public/assets/ui/ui_button_ad_reward.png
public/assets/ui/ui_button_disabled.png
```

提示词：

```text
生成一张透明背景 2D mobile game UI asset sheet，内容是《守护唐僧》Q版西游塔防卡牌和仓库 UI 组件。所有组件独立摆放、不要重叠，组件周围留透明边距，后续会裁成单张 PNG。国风剪纸和棋盘塔防风格，颜色为金色、朱红、青绿、墨蓝。包含：小兵卡牌框，英雄碎片卡牌框，道具卡牌框，普通英雄青绿色边框，核心英雄金红边框，仓库空槽，仓库高亮槽，召唤按钮，广告奖励按钮，禁用按钮。所有组件无文字，无水印，边缘清晰，适合微信小游戏 UI。
```

### 3. HUD 和结算 UI

资源类型：图片，透明背景 PNG。不要生成视频。最终需要裁成单张 PNG 放入项目。

输出文件：

```text
public/assets/ui/ui_hud_bar.png
public/assets/ui/ui_panel_resource.png
public/assets/ui/ui_panel_hp.png
public/assets/ui/ui_panel_wave.png
public/assets/ui/ui_boss_bar_bg.png
public/assets/ui/ui_boss_bar_fill.png
public/assets/ui/ui_result_panel_win.png
public/assets/ui/ui_result_panel_lose.png
public/assets/ui/ui_button_normal.png
public/assets/ui/ui_button_confirm.png
public/assets/ui/ui_button_back.png
public/assets/ui/ui_star_panel.png
```

提示词：

```text
生成一张透明背景 2D mobile game UI panel sheet，内容是《守护唐僧》Q版西游塔防 HUD 和结算界面组件。所有组件独立摆放、不要重叠，组件周围留透明边距，后续会裁成单张 PNG。国风剪纸和轻皮影感。包含：顶部 HUD 长条背景，资源小面板，血量小面板，波次小面板，BOSS 血条背景，BOSS 血条填充，胜利结算面板，失败结算面板，普通按钮，确认按钮，返回按钮，星级展示底板。颜色使用墨蓝底、金色描边、朱红强调、青绿辅助。无文字，无水印，透明背景。
```

## 八、背景资源

### 1. 关卡地图背景

资源类型：图片，竖屏 PNG 或 JPG。不要生成视频。

输出文件：

```text
public/assets/ui/ui_bg_journey_map.png
```

提示词：

```text
生成一张竖屏手机游戏背景图，尺寸 750x1334，主题是《守护唐僧》西游取经路线图，Q版国风剪纸和轻皮影感。画面表现从五行山下到高老庄的取经路线，山路、云纹、庙宇、村庄、卷轴地图感，适合作为前十八难关卡地图背景。中间预留清晰路线节点位置，底部预留按钮区域，顶部预留标题区域。不要文字，不要水印，不要 logo，不要角色版权风格。
```

### 2. 战斗背景

资源类型：图片，竖屏 PNG 或 JPG。不要生成视频。

输出文件：

```text
public/assets/ui/ui_bg_battle_forest.png
```

提示词：

```text
生成一张竖屏手机游戏战斗背景图，尺寸 750x1334，主题是《守护唐僧》Q版西游塔防战斗场景，国风剪纸和轻皮影感。中间区域预留 8x6 棋盘，背景为山野林地和取经道路，氛围有妖怪来袭的紧张感但不恐怖，红金路线和青绿可布阵区域能清楚显示，底部预留召唤卡牌栏和仓库栏，顶部预留 HUD。不要文字，不要水印，不要 logo，不要复杂细节，保持 Q 版西游统一风格。
```

## 九、特效资源

资源类型：图片，透明背景 PNG sprite sheet。不要生成视频、GIF 或 MP4。优先使用一张横向多帧 PNG；如果 AI 工具只能输出多张单帧 PNG，也可以按本清单的帧序列命名直接放入项目。

输出文件：

```text
public/assets/effects/effect_summon_ring.png
public/assets/effects/effect_merge_level_up.png
public/assets/effects/effect_hero_activate.png
public/assets/effects/effect_hero_level_up.png
public/assets/effects/effect_melee_slash.png
public/assets/effects/effect_arrow_trail.png
public/assets/effects/effect_fire_burst.png
public/assets/effects/effect_slow_mist.png
public/assets/effects/effect_heal_lotus.png
public/assets/effects/effect_boss_spawn.png
public/assets/effects/effect_item_flash.png
```

提示词：

```text
生成一张透明背景 2D VFX sprite sheet，内容是《守护唐僧》Q版西游塔防战斗特效，所有特效按一张横向连续多帧 PNG sprite sheet 表现。每个特效 6 帧横向排列，每帧 128x128，单个特效整张最终尺寸 768x128；如果一张图里放多个特效，请每个特效单独一行，单行尺寸为 768x128，不要输出视频或 GIF；如果无法输出一张 sheet，请输出按编号命名的透明单帧 PNG。风格为国风剪纸、明亮高对比、移动端可读。包含：金色召唤光圈，绿色合成升级光圈，英雄激活金红双环，英雄升级金色上升光柱，近战斩击，箭矢拖尾，火焰爆裂，蓝色减速冰雾，莲花治疗光效，BOSS 入场红金冲击波，道具使用闪光。特效要有战斗力量感，BOSS 入场冲击波要压迫感强。每个特效独立居中，无文字，无水印，透明背景。
```

## 十、音效资源

### 1. UI 音效

资源类型：音频，优先 WAV，后续转 OGG/MP3。不要生成视频。

输出文件：

```text
public/assets/audio/sfx_ui_click.ogg
public/assets/audio/sfx_ui_summon.ogg
public/assets/audio/sfx_ui_drag_start.ogg
public/assets/audio/sfx_ui_place_success.ogg
public/assets/audio/sfx_ui_place_fail.ogg
public/assets/audio/sfx_ui_inventory_in.ogg
```

提示词：

```text
生成一个 0.15 秒的国风西游手机游戏按钮点击音效，清脆、轻快、带一点木鱼或玉石敲击感，适合 UI 点击，不能刺耳，无人声，无版权旋律，干净结尾，WAV。
```

```text
生成一个 0.8 秒的Q版西游塔防召唤音效，金色法术光圈出现的感觉，包含铃铛、短促战鼓和闪光声，适合召唤 5 张卡牌，有法术感但不刺耳，无人声，无版权旋律，干净结尾，WAV。
```

```text
生成一个 0.2 秒的手机游戏拖拽开始音效，轻微纸牌拿起声和玉石轻响，清楚但不刺耳，无人声，无版权旋律，干净结尾，WAV。
```

```text
生成一个 0.25 秒的塔防单位放置成功音效，木质棋子落到棋盘上的声音，带一点金色确认铃声，轻快明确，无人声，无版权旋律，干净结尾，WAV。
```

```text
生成一个 0.25 秒的放置失败音效，轻微低沉木鱼声和短促否定提示，不刺耳，不吓人，适合移动端小游戏，无人声，无版权旋律，干净结尾，WAV。
```

```text
生成一个 0.3 秒的仓库入库音效，卡牌滑入槽位，带轻微玉石叮声，清爽明确，适合道具或碎片进入仓库，无人声，无版权旋律，干净结尾，WAV。
```

### 2. 战斗音效

资源类型：音频，优先 WAV，后续转 OGG/MP3。不要生成视频。

输出文件：

```text
public/assets/audio/sfx_attack_melee.ogg
public/assets/audio/sfx_attack_ranged.ogg
public/assets/audio/sfx_attack_magic.ogg
public/assets/audio/sfx_hit_normal.ogg
public/assets/audio/sfx_enemy_death.ogg
public/assets/audio/sfx_boss_spawn.ogg
public/assets/audio/sfx_monk_damage.ogg
```

提示词：

```text
生成一个 0.35 秒的Q版西游塔防近战攻击音效，短棍或兵器快速挥砍，带风声和沉实打击感，适合小兵和孙悟空近战攻击，清晰有力，无人声，无版权旋律，干净结尾，WAV。
```

```text
生成一个 0.35 秒的Q版西游塔防远程射击音效，弓弦释放和符咒箭飞出，青绿色法术拖尾感，清晰有力，无人声，无版权旋律，干净结尾，WAV。
```

```text
生成一个 0.45 秒的Q版西游塔防法术攻击音效，短促法术释放，带铃铛、气流和火焰或水光，适合英雄技能，有法术战斗感，无人声，无版权旋律，干净结尾，WAV。
```

```text
生成一个 0.2 秒的塔防命中音效，轻微碰撞和法术闪光混合，反馈明确但不刺耳，适合敌人受击，无人声，无版权旋律，干净结尾，WAV。
```

```text
生成一个 0.5 秒的 Q版西游敌人死亡音效，妖怪被击败后化为烟尘，轻微爆散和金币感，不恐怖不血腥，无人声，无版权旋律，干净结尾，WAV。
```

```text
生成一个 1.2 秒的 BOSS 出场音效，低沉战鼓、锣声、红金冲击波，具有压迫感但适合 Q版手机游戏，无人声，无版权旋律，干净结尾，WAV。
```

```text
生成一个 0.45 秒的唐僧受伤音效，保护目标受到冲击，轻微心跳和护盾破裂感，紧张但不恐怖，无人声，无版权旋律，干净结尾，WAV。
```

### 3. 成长与结算音效

资源类型：音频，优先 WAV，后续转 OGG/MP3。不要生成视频。

输出文件：

```text
public/assets/audio/sfx_merge.ogg
public/assets/audio/sfx_hero_activate.ogg
public/assets/audio/sfx_hero_level_up.ogg
public/assets/audio/sfx_item_use.ogg
public/assets/audio/sfx_victory.ogg
public/assets/audio/sfx_defeat.ogg
public/assets/audio/sfx_star_result.ogg
```

提示词：

```text
生成一个 0.8 秒的国风西游小兵合成升阶音效，两个棋子合成，绿色到金色升级光圈，包含短促上升音、玉石碰撞和清脆铃声，无人声，无版权旋律，干净结尾，WAV。
```

```text
生成一个 1 秒的英雄激活音效，金红双环展开，英雄登场，带鼓点、铃声和短促法术光效，兴奋但不刺耳，无人声，无版权旋律，干净结尾，WAV。
```

```text
生成一个 0.9 秒的英雄升级音效，金色上升光柱和能力增强，明亮、清爽、有成长感，无人声，无版权旋律，干净结尾，WAV。
```

```text
生成一个 0.6 秒的道具使用音效，西游法宝发动，带玉石叮声、短促法术闪光和轻微气流，无人声，无版权旋律，干净结尾，WAV。
```

```text
生成一个 2 秒的胜利结算音效，西游国风，欢快鼓点、铃声和短琵琶旋律，适合通关胜利，有取经胜利感，无人声，无版权旋律，干净结尾，WAV。
```

```text
生成一个 2 秒的失败结算音效，西游国风，低沉但不恐怖，短锣声和失落旋律，适合失败界面，有失败后的失落感，无人声，无版权旋律，干净结尾，WAV。
```

```text
生成一个 0.8 秒的星级结算音效，星星逐个亮起，清脆铃声三连，金色闪光感，适合关卡结算，无人声，无版权旋律，干净结尾，WAV。
```

### 4. BGM

资源类型：音频，优先 WAV，后续转 OGG/MP3。不要生成视频。

输出文件：

```text
public/assets/audio/bgm_map.ogg
public/assets/audio/bgm_battle.ogg
public/assets/audio/bgm_boss.ogg
```

提示词：

```text
生成一段 60 秒可循环的 Q版西游取经地图 BGM，轻快国风，笛子、琵琶、古筝、轻鼓点，适合手机小游戏主界面和关卡地图，旋律原创，不要人声，不要版权旋律，首尾适合无缝循环，WAV。
```

```text
生成一段 60 秒可循环的Q版西游塔防普通战斗 BGM，节奏明确，有策略战斗感，使用战鼓、琵琶、笛子和少量锣声，适合 3-8 分钟单局循环播放，旋律原创，不要人声，不要版权旋律，首尾适合无缝循环，WAV。
```

```text
生成一段 45 秒可循环的 Q版西游塔防 BOSS 战 BGM，更紧张、更有压迫感，战鼓、锣声、低音弦乐和国风旋律，但保持移动端清晰不刺耳，旋律原创，不要人声，不要版权旋律，首尾适合无缝循环，WAV。
```

## 十一、最终接入检查清单

- [ ] 每个 PNG 都是透明背景，背景图除外。
- [ ] 文件名和本清单一致。
- [ ] 静态资源 sheet 已裁成单张 PNG，例如小兵、英雄、敌人、道具、UI 图标。
- [ ] 动作和特效如果是 sprite sheet，保持为一张横向多帧 PNG，并记录好每帧宽高，例如 80x80、96x96、128x128。
- [ ] 动作和特效如果是 PNG 帧序列，确认帧号从 `01` 连续递增，每张尺寸一致，透明区域没有被裁成不同外框。
- [ ] 所有音效已转为 `ogg` 或 `mp3`，音量统一。
- [ ] 每个素材记录来源、生成日期、AI 工具、授权说明。
- [ ] 正式接入前先用 `pnpm build` 确认资源路径不会影响构建。
- [ ] 接入后可按需要再做 atlas 或 sprite sheet 合图，减少 Draw Call。
