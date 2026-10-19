# Hexomino 6×6×6 镂空拼图 — V6 Technic 16 mm 设计规范

> **版本：V6；2026-10-19 更新：16 mm 单格、局部 Technic 十字轴孔、8 mm 共面孔距。**
> **目的：** 本文件包含完整形状、参数与 OpenSCAD 源码，可独立重建打印版和网页版各 37 个模型。
> **当前方案：** 保留 V6 的整体连续正反面开孔、整体一体实体与局部半格侧孔。用户本次明确将侧圆孔替换为兼容标准 Technic 十字轴的孔。

## 一、成品定义和设计意图

- 35 种不同的自由 Hexomino（每块六格）加直线三格、L 形三格，共 37 件、216 格；原有形状与编号保持不变。
- 单格改为 **16 × 16 × 16 mm**，对应两个 8 mm 的 LEGO Technic 节距。6×6×6 名义立方体为 **96 mm**；12×18 平面排布为 **192 × 288 × 16 mm**。
- 每件仍是 XY 平面多格轮廓沿 Z 拉伸一格厚度的平面拼块。先生成一个完整圆角实体，再整体切孔，不逐格拼接空心盒，不增加内部网格墙或加强角柱。
- 正反面（±Z）保留一个连续的大开孔；四个侧向（±X、±Y）改为十字轴孔。侧向切削仍只从外露面向内半格，不允许跨越多个远处格子。
- 每个外露单位格侧面中心有一个十字孔。同一拼块内，两个沿切向相邻且同向共面的外露侧面，在它们的公共格边中点再加一个十字孔。因此连续长侧面形成 **8 mm** 孔距；没有相邻格或相邻格的该侧不外露时，不加边界孔。
- 外侧凸角、竖棱和上下外边缘继续圆角：**打印版 R0.8 mm（1/20 格）**，**网页版 R1.6 mm（1/10 格）**。保持名义外包尺寸，内凹竖角不向空格添加材料；孔口与内部交会棱线沿用布尔差集的几何。
- 外形装配公差仍为零。十字轴孔采用用户另行确认的 **每侧 0.10 mm 配合余量**。

## 二、尺寸、参数与坐标（毫米）

原单格 12.7 mm 改为 16 mm，比例为 `16/12.7 ≈ 1.25984252`。正面开孔、边框、切深、外侧圆角和布尔重叠量按此比例变化。**十字轴截面是新增的标准连接尺寸，以实际毫米定义，不按格长放大。**

| 参数 / 源码变量 | 本次尺寸 | 定义 |
|---|---:|---|
| `cell` | 16 | 两个 8 mm Technic 节距 |
| `front_fillet_diameter_ratio` | 3/5 | 连续正面通道宽度与内孔圆角直径比例 |
| `front_r` | 4.8 | 正面内孔圆角半径；直径和通道宽度为 9.6 mm |
| `front_frame` | 3.2 | 名义外包轮廓至正面开孔直线段的距离，1/5 格 |
| `model_variant` | `"print"` / `"web"` | 默认 `"print"` |
| `outer_r`（打印版） | 0.8 | `cell/20` |
| `outer_r`（网页版） | 1.6 | `cell/10` |
| 正面直边平坦部分（打印 / 网页） | 2.4 / 1.6 | `front_frame−outer_r` |
| `axle_span` | 4.8 | 标准十字轴目标外跨度，独立的名义尺寸 |
| `axle_arm` | 1.8 | 标准十字轴目标臂宽 |
| `axle_clearance` | 0.10 / 每侧 | 用户确认的轴孔配合余量；两个版本相同 |
| `axle_hole_span` | 5.0 | `axle_span+2*axle_clearance`，孔的外包宽、高 |
| `axle_hole_arm` | 2.0 | `axle_arm+2*axle_clearance`，孔的十字臂宽 |
| `cut_depth` | 8.0 | 每个外露面向内半格 |
| `join_eps` | 16/635 ≈ 0.02519685 | 保持原相对比例的布尔重叠量 |
| `clearance` | 0 | 拼块外形不额外内缩 |
| `facets` | 64 | 圆与圆角的离散精度 |
| `piece_id` | 0..36 | 第四节对应的模型索引 |

**坐标：** 单格左下角为 `(16*x,16*y)`，`z∈[0,16]`。正反面为 ±Z，侧面为 ±X、±Y。轴孔中心高度均为 `z=8`；十字臂与所在格面的两条坐标轴平行。

**尺寸依据：** [LDraw 单位规范](https://www.ldraw.org/article/218.html)定义一格节距为 20 LDU，并给出 0.4 mm/LDU 的换算；本设计采用 8 mm 节距、16 mm 单格。[Technic 十字轴尺寸讨论中的原始卡尺测量](https://bricks.stackexchange.com/questions/9406/what-are-the-dimensions-of-a-technic-axle)给出的臂宽约 1.8 mm，外跨度约 4.7–4.8 mm。本设计采用 4.8 / 1.8 mm 目标包络，再按用户要求增加每侧 0.10 mm 余量。此处是面向标准轴的 CAD 配合设计，实际打印后的插入力和保持力尚未实物验证。

## 三、严格的几何生成顺序

### 3.1 整体圆角外壳

将单位格二维方形取并集得到完整轮廓 `F`；整体内缩 `clearance+outer_r`，拉伸 `cell−2*(clearance+outer_r)` 并置于 `z=clearance+outer_r`。然后与 `sphere(r=outer_r,style="octa")` 做三维 Minkowski 和，恢复名义外包尺寸并去除外侧尖锐凸棱。使用整个拼块的轮廓，不对每个单位格分别圆角。

### 3.2 正反面的单一连续大开孔

`front_frame+front_r=8 mm=cell/2`。直接将整个轮廓内缩半格会丢失单格宽分支，因此按以下方式构造连续空腔：

1. 每格中心放置 R4.8 mm 的圆盘。
2. 每对共享边的相邻格，以两个圆盘的 `hull()` 连接成宽 9.6 mm 的通道。
3. 对每个完整 2×2 格块，填充四格中心围成的正方形，避免内部实心孤岛。
4. 取并集，从 ±Z 分别切入半格。下方区间为 `[-join_eps,8+join_eps]`，上方为 `[8−join_eps,16+join_eps]`，形成一个贯通大开孔。

这些圆盘和通道用于减去空腔；最终仍从单一实心外壳中做差集。

### 3.3 十字轴孔截面

以孔中心为二维原点，将 `5×2 mm` 和 `2×5 mm` 两个居中矩形取并集，再与 **直径 5 mm、64 边离散圆** 相交，形成带圆弧端部的十字截面。此定义的外跨度为 5 mm、臂宽为 2 mm；相对于 4.8 / 1.8 mm 名义轴包络，每侧预留 0.10 mm。

十字孔的尺寸不使用原侧圆孔的 3/5 格比例。正反面大开孔仍使用 3/5 格比例。

### 3.4 侧面孔位与局部切入

对侧向法线轴 `axis∈{X,Y}` 和方向 `s∈{−1,+1}`：

- 只处理该方向没有同一拼块相邻格的外露面。
- 单格面中心孔：法线坐标为该面位置，切向坐标为 `(t+0.5)*cell`，Z 为 `cell/2`。
- 额外边界孔：沿正切向存在相邻格，并且相邻格的同向侧面也外露时，在切向坐标 `(t+1)*cell`、Z=`cell/2` 加孔。只检查正切向，避免重复。
- 每个孔沿面法线向内切 8 mm，从面外 `join_eps` 开始，挤出总长 `cut_depth+2*join_eps`。不从内部接触面开孔。

| 面 | 法线坐标 | 单格中心孔的切向坐标 | 朝内方向 |
|---|---|---|---|
| −X | `x*cell` | `(y+0.5)*cell` | +X |
| +X | `(x+1)*cell` | `(y+0.5)*cell` | −X |
| −Y | `y*cell` | `(x+0.5)*cell` | +Y |
| +Y | `(y+1)*cell` | `(x+0.5)*cell` | −Y |

例如六格直条 H35 的每个长侧面有 `2×6−1=11` 个孔；两个短端面各一孔，总共 24 个十字孔。单侧连续 n 格的孔数为 `2n−1`。

最终实体：`rounded_outer_solid − (front_bottom_cut ∪ front_top_cut ∪ side_axle_drills)`。保留局部半格切入与一体布尔差集，不使用跨多格远距离贯穿钻孔。

## 四、37 个 Piece 的权威形状数据

所有六格 Hexomino 属于 *free hexomino*：平移、旋转和镜像均不形成新的一种。共有 35 种，各出现一次；再加两种 triomino。下列坐标以整数格为单位，**每一行的坐标完全决定对应的拼块**。H01 / H02 / H03 的字母名称只是便于识别，不能代替坐标。

| `piece_id` | STL 文件名（不含 `.stl`） | 方格 `(x,y)` 坐标 |
|---:|---|---|
| 0 | `H01_L` | `(0,0) (0,1) (0,2) (1,0) (2,0) (3,0)` |
| 1 | `H02_T` | `(0,2) (1,0) (1,1) (1,2) (2,2) (3,2)` |
| 2 | `H03_STEP` | `(0,0) (1,0) (1,1) (2,1) (2,2) (3,2)` |
| 3 | `H04` | `(0,0) (0,1) (1,0) (1,1) (2,0) (2,1)` |
| 4 | `H05` | `(0,0) (0,1) (0,2) (1,0) (1,1) (2,0)` |
| 5 | `H06` | `(0,0) (0,1) (0,2) (1,0) (1,1) (2,1)` |
| 6 | `H07` | `(0,0) (0,1) (0,2) (1,0) (1,2) (2,0)` |
| 7 | `H08` | `(0,0) (0,1) (0,2) (1,1) (2,0) (2,1)` |
| 8 | `H09` | `(0,0) (0,1) (1,0) (1,1) (1,2) (2,1)` |
| 9 | `H10` | `(0,0) (0,1) (1,0) (1,1) (1,2) (2,2)` |
| 10 | `H11` | `(0,0) (0,1) (1,1) (1,2) (2,0) (2,1)` |
| 11 | `H12` | `(0,0) (0,1) (1,0) (1,1) (2,0) (3,0)` |
| 12 | `H13` | `(0,0) (0,1) (1,0) (2,0) (2,1) (3,0)` |
| 13 | `H14` | `(0,0) (0,1) (1,0) (2,0) (2,1) (3,1)` |
| 14 | `H15` | `(0,0) (0,1) (1,0) (2,0) (3,0) (3,1)` |
| 15 | `H16` | `(0,0) (1,0) (1,1) (2,0) (2,1) (3,0)` |
| 16 | `H17` | `(0,0) (1,0) (1,1) (2,0) (2,1) (3,1)` |
| 17 | `H18` | `(0,0) (0,1) (0,2) (1,1) (2,1) (3,1)` |
| 18 | `H19` | `(0,0) (0,1) (1,1) (1,2) (2,1) (3,1)` |
| 19 | `H20` | `(0,0) (0,1) (1,1) (1,2) (2,2) (3,2)` |
| 20 | `H21` | `(0,0) (0,1) (1,1) (2,1) (2,2) (3,1)` |
| 21 | `H22` | `(0,0) (0,1) (1,1) (2,1) (2,2) (3,2)` |
| 22 | `H23` | `(0,0) (0,1) (1,1) (2,1) (3,1) (3,2)` |
| 23 | `H24` | `(0,0) (1,0) (1,1) (1,2) (2,1) (3,1)` |
| 24 | `H25` | `(0,0) (1,0) (1,1) (1,2) (2,2) (3,2)` |
| 25 | `H26` | `(0,0) (1,0) (1,1) (2,1) (2,2) (3,1)` |
| 26 | `H27` | `(0,0) (1,0) (2,0) (2,1) (2,2) (3,1)` |
| 27 | `H28` | `(0,1) (1,0) (1,1) (1,2) (2,1) (3,1)` |
| 28 | `H29` | `(0,1) (1,0) (1,1) (2,1) (2,2) (3,1)` |
| 29 | `H30` | `(0,0) (0,1) (1,0) (2,0) (3,0) (4,0)` |
| 30 | `H31` | `(0,0) (1,0) (1,1) (2,0) (3,0) (4,0)` |
| 31 | `H32` | `(0,0) (1,0) (1,1) (2,1) (3,1) (4,1)` |
| 32 | `H33` | `(0,0) (1,0) (2,0) (2,1) (3,0) (4,0)` |
| 33 | `H34` | `(0,0) (1,0) (2,0) (2,1) (3,1) (4,1)` |
| 34 | `H35` | `(0,0) (1,0) (2,0) (3,0) (4,0) (5,0)` |
| 35 | `T36_BAR3` | `(0,0) (1,0) (2,0)` |
| 36 | `T37_L3` | `(0,0) (0,1) (1,0)` |

总计：35×6 + 2×3 = **216 个方格**。上述形状的 35 种 Hexomino 应经旋转、镜像、平移规范化后验证不重复。

## 五、重建流程

使用 **Bash** 和支持 `sphere(style="octa")` 的 **OpenSCAD 2026.10.18 / CGAL**。把第七节源码保存为 `hexomino_local_half_cell_v6.scad` 后执行：

```bash
mkdir -p STL_37 web/models
names=(H01_L H02_T H03_STEP H{04..35} T36_BAR3 T37_L3)
for variant in print web; do
  if [ "$variant" = print ]; then model_dir=STL_37; else model_dir=web/models; fi
  for i in "${!names[@]}"; do
    openscad --backend=CGAL --hardwarnings --export-format=binstl -o "$model_dir/${names[$i]}.stl" -D "piece_id=$i" -D "model_variant=\"$variant\"" hexomino_local_half_cell_v6.scad
  done
done
```

两套模型各 37 件，坐标、孔位和十字孔截面相同，只有外侧圆角半径不同。默认未指定 `model_variant` 时生成打印版。按第六节检查 STL，并更新材料表和预览图。

## 六、验证与打印数据

两套模型各 37 件均通过几何检查，逐件结果见根目录及 `web/models/` 下的 `validation_results.json`。

| 指标 | 打印版 | 网页版 |
|---|---:|---:|
| 水密、法向一致、单一实体 | 37 / 37 | 37 / 37 |
| 零面积三角面 | 0 | 0 |
| 格中心十字孔 | 488 | 488 |
| 共面格间额外十字孔 | 172 | 172 |
| 检查的十字孔总数 | 660 | 660 |
| 外侧圆角半径 | 0.8 mm | 1.6 mm |
| 总实体体积 | 358.200 cm³ | 350.411 cm³ |

打印版 PLA 理论质量（1.24 g/cm³）为 **444.2 g**，PETG（1.27 g/cm³）为 **454.9 g**。逐件体积与质量见 `piece_volume_and_weight.csv`；代表件正视、侧视、透视图见 `V6_3_5_PREVIEW.png`。

所有孔的实测截面均与 5×2 mm 十字轮廓一致，孔型对称差面积小于 0.001 mm²；名义 4.8 / 1.8 mm 十字轴包络可完整置于孔内，实测最小间隙大于 0.09 mm。外包尺寸误差小于 0.0001 mm。

检查应覆盖：两套模型各件的水密性、法向一致性、单一连通实体、正体积与无零面积三角面；16 mm 格距及外包尺寸；正反面连续开孔与内孔圆角；所有单格中心孔、共面边界孔的数量、位置、5×2 mm 十字截面和名义轴包络的包含关系；打印版 R0.8 mm、网页版 R1.6 mm 的外侧圆角。

几何检查通过表示 CAD 符合上述参数。实际打印的孔收缩、轴插入力、保持力、桥接强度与拼装路径仍需样件确认。打印用料按打印版实体体积计算，与切片后的填充率、支撑和耗材实际用量有差别。

## 七、参考 OpenSCAD 完整源码

以下源码是本次 V6 Technic 16 mm 的权威实现，包含全部 37 件坐标，可独立重建。

```openscad
/* HEXOMINO V6 - TECHNIC PITCH AND LOCAL AXLE HOLES
   Updated 2026-10-19: one cell = two 8 mm LEGO Technic pitches = 16 mm.
   Round the monolithic footprint prism, then subtract the continuous front aperture
   and face-local axle holes. Every exposed cell face has a centered axle hole;
   adjacent coplanar exposed faces also share a hole at their boundary (8 mm pitch).
   Cuts reach only half a cell inward. Axle dimensions stay in physical millimetres.
   Standard axle target 4.8 mm span / 1.8 mm arm; hole allowance 0.10 mm per wall.
   External radius: cell/20 print, cell/10 web. Nominal outer clearance remains zero.
*/
cell = 16;
front_fillet_diameter_ratio=3/5;
front_frame = cell/5;          // 3.2 mm nominal front rim
clearance = 0;
model_variant = "print";       // "print" or "web"
outer_r = cell/(model_variant == "web" ? 10 : 20); // 1.6 mm web / 0.8 mm print
axle_span = 4.8;               // nominal axle envelope, independent of cell scaling
axle_arm = 1.8;
axle_clearance = 0.10;         // user-selected allowance on EACH hole wall
axle_hole_span = axle_span+2*axle_clearance; // 5.0 mm
axle_hole_arm = axle_arm+2*axle_clearance;   // 2.0 mm
facets = 64;
piece_id = 0;                 // 0..36
cut_depth = cell/2;           // 8 mm local inward depth
join_eps = cell/635;          // same relative boolean overlap as the 12.7 mm design
$fn=facets;
front_r=cell*front_fillet_diameter_ratio/2; // 4.8 mm
assert(axle_arm>0 && axle_arm<axle_span && axle_clearance>=0, "Invalid axle profile");
assert(axle_hole_span<cell/2, "Axle holes would overlap at the half-cell pitch");
assert(abs(front_r+front_frame-cell/2)<0.000001, "Front rim and radius must sum to half a cell");
assert(model_variant=="print" || model_variant=="web", "Unknown model variant");
assert(outer_r>0 && outer_r<front_frame && outer_r+clearance<cell/2, "External radius too large");
all_cells = [
  [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0], [3, 0]],
  [[0, 2], [1, 0], [1, 1], [1, 2], [2, 2], [3, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]],
  [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [2, 0]],
  [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [2, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 0], [1, 2], [2, 0]],
  [[0, 0], [0, 1], [0, 2], [1, 1], [2, 0], [2, 1]],
  [[0, 0], [0, 1], [1, 0], [1, 1], [1, 2], [2, 1]],
  [[0, 0], [0, 1], [1, 0], [1, 1], [1, 2], [2, 2]],
  [[0, 0], [0, 1], [1, 1], [1, 2], [2, 0], [2, 1]],
  [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [3, 0]],
  [[0, 0], [0, 1], [1, 0], [2, 0], [2, 1], [3, 0]],
  [[0, 0], [0, 1], [1, 0], [2, 0], [2, 1], [3, 1]],
  [[0, 0], [0, 1], [1, 0], [2, 0], [3, 0], [3, 1]],
  [[0, 0], [1, 0], [1, 1], [2, 0], [2, 1], [3, 0]],
  [[0, 0], [1, 0], [1, 1], [2, 0], [2, 1], [3, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 1], [2, 1], [3, 1]],
  [[0, 0], [0, 1], [1, 1], [1, 2], [2, 1], [3, 1]],
  [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2], [3, 2]],
  [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2], [3, 1]],
  [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2], [3, 2]],
  [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [3, 2]],
  [[0, 0], [1, 0], [1, 1], [1, 2], [2, 1], [3, 1]],
  [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2], [3, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 1]],
  [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [3, 1]],
  [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1], [3, 1]],
  [[0, 1], [1, 0], [1, 1], [2, 1], [2, 2], [3, 1]],
  [[0, 0], [0, 1], [1, 0], [2, 0], [3, 0], [4, 0]],
  [[0, 0], [1, 0], [1, 1], [2, 0], [3, 0], [4, 0]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [4, 1]],
  [[0, 0], [1, 0], [2, 0], [2, 1], [3, 0], [4, 0]],
  [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]],
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [1, 0]]
];
function included(x,y,cs)=len([for(c=cs) if(c[0]==x && c[1]==y) 1])>0;
function max_x(cs)=max([for(p=cs) p[0]])+1;
function max_y(cs)=max([for(p=cs) p[1]])+1;
module footprint(cs){union() for(c=cs) translate([cell*c[0],cell*c[1]]) square(cell);}
module front_disc(x,y){
    translate([(x+0.5)*cell,(y+0.5)*cell]) circle(r=front_r);
}
module large_front_opening(cs){
    // Explicit half-cell-offset limit: keep zero-width branches as connected apertures.
    union() for(c=cs) let(x=c[0],y=c[1]){
        front_disc(x,y);
        for(d=[[1,0],[0,1]])
            if(included(x+d[0],y+d[1],cs)) hull(){
                front_disc(x,y);
                front_disc(x+d[0],y+d[1]);
            }
        // Fill the central region of every complete 2x2 block; no solid islands.
        if(included(x+1,y,cs) && included(x,y+1,cs) && included(x+1,y+1,cs))
            translate([(x+0.5)*cell,(y+0.5)*cell]) square(cell);
    }
}
// Only exposed coplanar faces receive axle holes; drill locally half a cell.
function exposed(x,y,axis,direction,cs)=
    !included(x+(axis==0 ? direction : 0),y+(axis==1 ? direction : 0),cs);
module axle_profile(){
    // Standard axle envelope plus the independent, user-selected per-wall allowance.
    intersection(){
        circle(d=axle_hole_span);
        union(){
            square([axle_hole_span,axle_hole_arm],center=true);
            square([axle_hole_arm,axle_hole_span],center=true);
        }
    }
}
module side_axle_drill(axis,direction,coordinate,tangent){
    translate(axis==0 ? [coordinate+direction*join_eps,tangent,cell/2]
                      : [tangent,coordinate+direction*join_eps,cell/2])
        rotate(axis==0 ? [0,-90*direction,0] : [90*direction,0,0])
            linear_extrude(height=cut_depth+2*join_eps) axle_profile();
}
module side_axle_drills(cs){
    for(axis=[0,1],direction=[-1,1],c=cs)
        let(x=c[0],y=c[1],tangent=c[1-axis],
            coordinate=(c[axis]+(direction>0 ? 1 : 0))*cell)
        if(exposed(x,y,axis,direction,cs)){
            side_axle_drill(axis,direction,coordinate,(tangent+0.5)*cell);
            // The positive tangent direction counts each adjacent pair only once.
            let(nx=x+(axis==1 ? 1 : 0),ny=y+(axis==0 ? 1 : 0))
                if(included(nx,ny,cs) && exposed(nx,ny,axis,direction,cs))
                    side_axle_drill(axis,direction,coordinate,(tangent+1)*cell);
        }
}
module z_axis_half_depth_openings(cs){
    // Continuous aperture; explicit +/-Z face-local half-cell depth.
    translate([0,0,-join_eps])
       linear_extrude(height=cut_depth+2*join_eps) large_front_opening(cs);
    translate([0,0,cell-cut_depth-join_eps])
       linear_extrude(height=cut_depth+2*join_eps) large_front_opening(cs);
}
module rounded_outer_solid(cs){
    // Inset the monolithic solid first, so the sphere restores the original bounds.
    minkowski(){
        translate([0,0,clearance+outer_r])
            linear_extrude(height=cell-2*(clearance+outer_r))
                offset(delta=-(clearance+outer_r)) footprint(cs);
        // Six exact axis poles preserve all three spans and cubic rotation symmetry.
        sphere(r=outer_r, style="octa");
    }
}
module piece(cs){
  difference(){
    rounded_outer_solid(cs);
    z_axis_half_depth_openings(cs);
    side_axle_drills(cs);
  }
}
assert(piece_id>=0 && piece_id<len(all_cells));
piece(all_cells[piece_id]);
```

## 八、交付文件

- `STL_37/`：37 个打印 STL，16 mm 单格、外侧 R0.8 mm。
- `web/models/`：37 个网页 STL，16 mm 单格、外侧 R1.6 mm；拼块库俯视缩略图、平面和立体模式统一加载。
- `hexomino_local_half_cell_v6.scad`：共用参数化源码；`model_variant` 选择打印或网页。
- `shapes.json`：不变的 37 件格坐标和编号；网页版 `CELL_MM=16`。
- `validation_results.json`、`web/models/validation_results.json`：两套独立几何报告。
- `piece_volume_and_weight.csv`：打印版体积与 PLA/PETG 理论质量。
- `ALL_37_SHAPES.png`：格坐标形状总览；`V6_3_5_PREVIEW.png`：本次打印模型的正视、侧视、透视图。
- `examples/`：单位格排布解继续有效；求解只验证最终占格，不保证实体插入路径。
