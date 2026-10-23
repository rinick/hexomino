# Hexomino 6×6×6 镂空拼图 — V6 Technic 16 mm 设计规范

> **版本：V6；2026-10-22 更新：打印版外表面内缩、内腔扩大各 0.10 mm，中层实际壁厚 3.8 mm，内腔宽 8.2 mm。**
> **目的：** 本文件包含完整形状、参数与 OpenSCAD 源码，可独立重建打印版和网页版各 37 个模型。
> **当前方案：** 保留 16 mm 格距、8 mm 孔距、正反面大开孔的名义 `sqrt(2)/2` 格直径、中层直角、格中心十字轴孔及共面格间 Pin 圆孔。打印版统一设置每侧 0.10 mm 的配合余量，放弃维持 4 mm 实际壁厚；网页版保留名义外形和内腔。已有孔余量不重复叠加。

## 一、成品定义和设计意图

- 35 种不同的自由 Hexomino（每块六格）加直线三格、L 形三格，共 37 件、216 格；形状与编号保持不变。
- 名义单位格为 **16 × 16 × 16 mm**，对应两个 8 mm LEGO Technic 节距。求解器仍使用 6×6×6 或 12×18 单位格；所有孔中心和格中心保留原坐标，不整体缩放拼块。
- 每件仍是 XY 平面多格轮廓沿 Z 拉伸一格厚度的平面拼块。对整个轮廓生成一个圆角实体，再整体切孔，不增加逐格内墙或角柱。
- **打印版：** 各外包配合面（±X、±Y、±Z）向实体内退让 0.10 mm；大开孔内壁和中层直角内腔向实体内退让 0.10 mm，即扩大空腔。中层水平台阶也各退让 0.10 mm。两件名义相接的平面之间形成约 **0.20 mm** 间隙。
- 打印版一格厚度为 **15.8 mm**，中层直通道宽 **8.2 mm**，直壁厚 **3.8 mm**，中层 Z 区间为 **4.1–11.9 mm**。网页版保留对应的 16 / 8 / 4 mm 和 Z=4–12 mm。多格拼块只收缩整个外轮廓，不对每格分别缩放或改变孔距。
- 每个外露单位格侧面中心保留十字轴孔；同向共面的相邻外露侧面在公共格边中点设置 Pin 圆孔，连续侧面的孔距仍为 **8 mm**。所有侧孔只局部切至名义半格中面，不跨越多个远处格子。
- 十字轴孔和 Pin 孔沿用已有的 **每侧 0.10 mm 径向余量**，不再额外放大。Pin 沉孔两端各深 0.8 mm，位置随打印版 3.8 mm 壁厚移动；中间直孔段由 2.4 mm 变为 2.2 mm。
- 外侧圆角保持 **打印版 R0.8 mm（1/20 格）**、**网页版 R1.6 mm（1/10 格）**；圆角位于各自实际外包轮廓内。中层内腔仍为直角。

## 二、尺寸、参数与坐标（毫米）

`cell=16` 是固定的名义格距。外形和内腔配合余量由 `clearance` 控制；孔的径向余量由 `axle_clearance` 和 `pin_clearance` 独立控制。以下“打印 / 网页”均指两个输出版本。

| 参数 / 源码变量 | 尺寸 | 定义 |
|---|---:|---|
| `cell` | 16 | 名义格距，不随公差改变 |
| `model_variant` | `"print"` / `"web"` | 默认 `"print"` |
| `clearance`（打印 / 网页） | 0.10 / 0 | 外表面内缩、内腔扩大与台阶退让的单侧距离 |
| 实际一格外包跨度（打印 / 网页） | 15.8 / 16 | `cell−2*clearance` |
| `front_fillet_diameter_ratio` | `sqrt(2)/2` | 大开孔名义圆角直径与通道宽度比例 |
| `front_r` | ≈ 5.65685425 | 名义圆角半径 `cell*sqrt(2)/4` |
| 大开孔实际直径 / 通道宽（打印 / 网页） | ≈ 11.5137085 / 11.3137085 | `2*(front_r+clearance)` |
| `front_frame` | ≈ 2.34314575 | 名义直壁厚度 `cell/2−front_r` |
| 上下区域实际直壁厚（打印 / 网页） | ≈ 2.14314575 / 2.34314575 | `front_frame−2*clearance` |
| `middle_wall` | 4 | 名义内腔基准，不再强制打印版保持此壁厚 |
| `middle_wall_actual`（打印 / 网页） | 3.8 / 4 | `middle_wall−2*clearance` |
| 中层内腔内缩坐标（打印 / 网页） | 3.9 / 4 | 相对名义轮廓 `middle_wall−clearance` |
| 中层内腔直通道宽（打印 / 网页） | 8.2 / 8 | `cell−2*(middle_wall−clearance)` |
| `middle_z_min` / `middle_z_max`（打印 / 网页） | 4.1–11.9 / 4–12 | 上下水平台阶分别退让 `clearance` |
| `outer_r`（打印 / 网页） | 0.8 / 1.6 | `cell/20` / `cell/10` |
| 正面直边平坦部分（打印 / 网页） | ≈ 1.34314575 / 0.74314575 | `front_frame−2*clearance−outer_r` |
| `axle_span` / `axle_arm` | 4.8 / 1.8 | 名义十字轴包络，与格长无关 |
| `axle_clearance` | 0.10 / 每侧 | 两个版本均保留，已计入孔型 |
| `axle_hole_span` / `axle_hole_arm` | 5.0 / 2.0 | 名义包络的每侧各扩大 0.10 mm |
| `pin_diameter` / `pin_recess_diameter` | 4.8 / 6.4 | Half Beam 孔型的名义直径 |
| `pin_clearance` | 0.10 / 每侧 | 两个版本均保留，已计入孔型 |
| `pin_hole_diameter` / `pin_hole_recess_diameter` | 5.0 / 6.6 | 实际 Pin 通孔 / 沉孔直径 |
| `pin_recess_depth` | 0.8 / 每端 | 从实际外壁和内壁测量；不重复增加径向余量 |
| Pin 中间直孔段长（打印 / 网页） | 2.2 / 2.4 | `middle_wall_actual−2*pin_recess_depth` |
| `cut_depth`（打印 / 网页） | 7.9 / 8 | 从实际侧面切至名义半格中面 |
| `join_eps` | 16/635 ≈ 0.02519685 | 仅作布尔重叠，不作为装配余量 |
| `facets` | 64 | 圆与圆角的离散精度 |
| `piece_id` | 0..36 | 第四节对应的模型索引 |

**坐标：** 单格左下角为 `(16*x,16*y)`；侧孔中心高度均为 Z=8 mm，切向坐标仍为 8 mm 的整数倍。打印版实际 Z 外包为 `[0.1,15.9]`，网页版为 `[0,16]`。长 n 格的打印版外包跨度为 `16*n−0.2 mm`，格距仍是 16 mm。

**尺寸依据：** [LDraw 单位规范](https://www.ldraw.org/article/218.html)给出 20 LDU 节距与 0.4 mm/LDU 换算，本设计采用 8 mm 节距。[原始十字轴卡尺测量](https://bricks.stackexchange.com/questions/9406/what-are-the-dimensions-of-a-technic-axle)给出的臂宽约 1.8 mm，外跨度约 4.7–4.8 mm；本设计取 4.8 / 1.8 mm 后加每侧 0.10 mm 余量。

**Pin 孔依据：** [LDraw Half Beam 32017](https://library.ldraw.org/parts/5505)、[beamhol2](https://library.ldraw.org/parts/22075) 和 [peghole](https://library.ldraw.org/parts/22293) 定义名义 4 mm 薄梁、直径 4.8 mm 通孔、直径 6.4 mm 且每端深 0.8 mm 的沉孔。本设计独立构造孔型，再增加用户确认的径向余量；打印版按用户要求将实际壁厚改为 3.8 mm，沉孔位置跟随实际壁面。实际轴和 Pin 的插入力、保持力尚未实物验证。

## 三、严格的几何生成顺序

### 3.1 整体圆角外壳及外包间隙

将全部单位格二维方形取并集得到轮廓 `F`。先整体内缩 `clearance+outer_r`，在 Z=`clearance+outer_r` 拉伸 `cell−2*(clearance+outer_r)`，再与 `sphere(r=outer_r,style="octa")` 做三维 Minkowski 和。得到相对名义轮廓内退 `clearance` 的完整外壳，圆角半径保持既定值。所有凹凸外露边界均处理，不逐格缩放。

### 3.2 正反面连续大开孔与直角中层

1. 每个格中心放置半径 `front_r+clearance` 的圆盘。打印版为约 5.75685425 mm，网页版为约 5.65685425 mm。
2. 每对共享边的相邻格，以两个圆盘的 `hull()` 连接。对每个完整 2×2 格块，填充四格中心的正方形，避免空腔中的实心孤岛。将并集记为 `A`。
3. 下方切去完整 `A`，终止于 `middle_z_min`；上方从 `middle_z_max` 开始切去完整 `A`。打印版两个台阶分别位于 Z=4.1、11.9 mm，网页版位于 4、12 mm。
4. 中层直接切去 `offset(F,−(middle_wall−clearance))`。打印版内腔轮廓相对名义位置向外扩 0.10 mm，实际直壁厚为 `(4−0.1)−0.1=3.8 mm`，单格宽通道为 `16−2*3.9=8.2 mm`。

**保留中层直角：** 名义圆盘半径 `4*sqrt(2)` 刚好覆盖 4 mm 内缩角点。打印公差加入后，中层直角角点独立向外移动 0.10 mm；不再将它与加大后的圆弧空腔取交集，以免重新截角。由直角轮廓直接开腔，两个版本都保留 90° 角点。大开孔的名义直径比例仍为 `sqrt(2)/2`；打印版实际孔径额外增加 0.20 mm。

### 3.3 十字轴孔

将两个居中的 `5×2 mm`、`2×5 mm` 矩形取并集，再与直径 5 mm 的 64 边圆相交。孔型已包含每侧 0.10 mm 余量，不叠加外包／内腔 `clearance`，孔中心和方向保持原名义格坐标。

### 3.4 Pin 圆孔及双端沉孔

以实际外侧壁面为 d=0，沿法线向内测量，令 `W=middle_wall_actual`：

- `0≤d<0.8 mm` 为直径 6.6 mm 的外沉孔。
- `0.8≤d≤W−0.8 mm` 为直径 5.0 mm 的中间直孔段。
- `W−0.8<d≤W` 为直径 6.6 mm 的内沉孔。

打印版 W=3.8 mm，内沉孔从 d=3.0 mm 开始，中间直孔段长 2.2 mm；网页版 W=4 mm，内沉孔从 d=3.2 mm 开始，中间段长 2.4 mm。两端沉孔深度始终从真实壁面测量。因壁面各退让 0.10 mm，沉孔台阶面也随之退让；不以原先 4 mm 深度放置内沉孔。

### 3.5 外露孔位与局部切削

对法线轴 X/Y 和方向 s=±1，仅处理该方向没有同一拼块相邻格的外露面。名义面位置记为 `coordinate`，实际面位置为 `coordinate−s*clearance`。

- 单格中心十字孔：切向坐标 `(t+0.5)*cell`，Z=8 mm。
- 同向共面相邻两格之间的 Pin 孔：切向坐标 `(t+1)*cell`，Z=8 mm；只检查正切向以免重复。
- 从实际面外 `join_eps` 开始切入 `cut_depth+2*join_eps`，主通孔终止于原来的名义半格中面附近。沉孔仅按实际壁厚的两端定位。

六格直条 H35 的每个长侧面有 6 个十字孔和 5 个 Pin 孔，短端面各一十字孔，总计 14 个十字孔和 10 个 Pin 孔。两套模型各有 488 个十字孔、172 个 Pin 孔。

最终实体为整体圆角外壳减去三段正反面空腔及局部侧向连接孔，仍是单一连通实体。

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

两套模型各 37 件，形状、名义坐标和孔中心共用；打印版包含外包／内腔公差、3.8 mm 中层及相应沉孔位置，网页版保留名义尺寸，两者外侧圆角也不同。默认未指定 `model_variant` 时生成打印版。按第六节检查 STL，并更新材料表和预览图。

## 六、验证与打印数据

两套模型各 37 件均通过几何检查，逐件结果见根目录及 `web/models/` 下的 `validation_results.json`。

| 指标 | 打印版 | 网页版 |
|---|---:|---:|
| 水密、法向一致、单一实体 | 37 / 37 | 37 / 37 |
| 零面积三角面 | 0 | 0 |
| 格中心十字孔 | 488 | 488 |
| 共面格间 Pin 圆孔 | 172 | 172 |
| 连接孔总数 | 660 | 660 |
| 中层实际壁厚 / 高度区间 | 3.8 mm / Z=4.1–11.9 mm | 4 mm / Z=4–12 mm |
| 外包 / 内腔单侧余量 | 0.10 / 0.10 mm | 0 / 0 mm |
| 一格外包跨度 / 中层通道宽 | 15.8 / 8.2 mm | 16 / 8 mm |
| 名义 8 mm 方形配合空间检查 | 216 | 216 |
| 已验证的中层 90° 角点 | 316 | 316 |
| 外侧圆角半径 | 0.8 mm | 1.6 mm |
| 总实体体积 | 307.016 cm³ | 325.541 cm³ |

打印版 PLA 理论质量（1.24 g/cm³）为 **380.7 g**，PETG（1.27 g/cm³）为 **389.9 g**。逐件体积与质量见 `piece_volume_and_weight.csv`；代表件正视、侧视、透视图见 `V6_3_5_PREVIEW.png`。

格中心孔的实测截面均与 5×2 mm 十字轮廓一致，孔型对称差面积小于 0.001 mm²；名义 4.8 / 1.8 mm 十字轴包络可完整置于孔内，实测最小间隙大于 0.09 mm。外包尺寸误差小于 0.0001 mm。Pin 孔以实际壁面为基准，在 d=0.1、0.79、0.81、W/2、W−0.81、W−0.79、W−0.1 mm 处分别核对截面，覆盖两端沉孔与中间直孔段。上下端区域的内腔截面符合各自实际半径，中层截面符合 `offset(F,−(4−clearance))`，逐一确认其 90° 角点。打印版还逐格验证名义 8×8 mm 方形可置于中层内腔，距内壁至少 0.10 mm；网页按零内腔公差检查。另在上下端与中层四个 Z 区域逐格核对 8 mm 方形的容纳与间隙，每个版本共 864 次；圆弧按 64 边离散，检查允许 0.001 mm 的离散误差。

检查应覆盖：两套模型各件的水密性、法向一致性、单一连通实体、正体积与无零面积三角面；16 mm 格距及实际外包跨度；正反面连续开孔与内孔圆角；所有单格中心十字孔、共面边界 Pin 圆孔的数量、位置与截面；十字轴包络的包含关系；Pin 孔的双端沉孔直径与深度、实际格间壁厚、内腔配合余量、中层直角与退让后的水平台阶、上下大开孔轮廓；打印版 R0.8 mm、网页版 R1.6 mm 的外侧圆角。

几何检查通过表示 CAD 符合上述参数。实际打印的孔收缩、轴插入力、保持力、桥接强度与拼装路径仍需样件确认。打印用料按打印版实体体积计算，与切片后的填充率、支撑和耗材实际用量有差别。

## 七、参考 OpenSCAD 完整源码

以下源码是本次 V6 Technic 16 mm 的权威实现，包含全部 37 件坐标，可独立重建。

```openscad
/* HEXOMINO V6 - TECHNIC HALF-BEAM WALLS AND LOCAL CONNECTOR HOLES
   Updated 2026-10-22: print mating surfaces have 0.10 mm clearance per side.
   Round the monolithic footprint prism, then subtract the continuous front aperture
   and face-local connector holes. Cell centers retain axle holes; coplanar cell
   boundaries receive pin holes with counterbores on both sides of the wall.
   Print outside faces shrink and cavities expand by 0.10 mm; middle walls become
   3.8 mm with 8.2 mm channels. The web variant keeps nominal 4 mm / 8 mm geometry.
   Nominal front aperture diameter is sqrt(2)/2 cell. Middle corners stay square.
   Upper/lower quarters use the full aperture. Connector sizes stay in mm.
   Axle and pin holes have 0.10 mm per-wall allowance; pin recess depth is 0.8 mm.
   External radius: cell/20 print, cell/10 web. Grid and connector centers stay fixed.
*/
cell = 16;
front_fillet_diameter_ratio=sqrt(2)/2;
front_frame = cell*(1-front_fillet_diameter_ratio)/2; // 2.34314575 mm front rim
model_variant = "print";       // "print" or "web"
clearance = model_variant == "print" ? 0.10 : 0; // outer inset AND cavity allowance
outer_r = cell/(model_variant == "web" ? 10 : 20); // 1.6 mm web / 0.8 mm print
axle_span = 4.8;               // nominal axle envelope, independent of cell scaling
axle_arm = 1.8;
axle_clearance = 0.10;         // user-selected allowance on EACH hole wall
axle_hole_span = axle_span+2*axle_clearance; // 5.0 mm
axle_hole_arm = axle_arm+2*axle_clearance;   // 2.0 mm
middle_wall = 4;              // nominal reference; printing gives up the 4 mm wall
middle_wall_actual = middle_wall-2*clearance;
middle_z_min = cell/4+clearance;
middle_z_max = cell*3/4-clearance;
pin_diameter = 4.8;
pin_recess_diameter = 6.4;
pin_recess_depth = 0.8;
pin_clearance = 0.10;         // allowance on EACH cylindrical hole wall
pin_hole_diameter = pin_diameter+2*pin_clearance; // 5.0 mm
pin_hole_recess_diameter = pin_recess_diameter+2*pin_clearance; // 6.6 mm
facets = 64;
piece_id = 0;                 // 0..36
cut_depth = cell/2-clearance; // end at the nominal half-cell plane
join_eps = cell/635;          // same relative boolean overlap as the 12.7 mm design
$fn=facets;
front_r=cell*front_fillet_diameter_ratio/2; // 5.65685425 mm
assert(axle_arm>0 && axle_arm<axle_span && axle_clearance>=0, "Invalid axle profile");
assert(axle_hole_span<cell/2, "Axle holes would overlap at the half-cell pitch");
assert(abs(front_r+front_frame-cell/2)<0.000001, "Front rim and radius must sum to half a cell");
assert(model_variant=="print" || model_variant=="web", "Unknown model variant");
assert(clearance>=0 && outer_r>0 && outer_r<front_frame-2*clearance && outer_r+clearance<cell/2, "External radius too large");
assert(middle_wall>=front_frame && middle_wall<cell/2, "Invalid middle wall thickness");
assert(front_r+0.000001>=sqrt(2)*(cell/2-middle_wall), "Front aperture clips middle right-angle corners");
assert(pin_hole_diameter<pin_hole_recess_diameter && 2*pin_recess_depth<middle_wall_actual, "Invalid pin counterbore");
assert(pin_hole_recess_diameter<middle_z_max-middle_z_min, "Pin recess exceeds middle band");
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
    translate([(x+0.5)*cell,(y+0.5)*cell]) circle(r=front_r+clearance);
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
module side_connector_drill(axis,direction,coordinate,tangent,is_pin=false){
    let(face=coordinate-direction*clearance)
    translate(axis==0 ? [face+direction*join_eps,tangent,cell/2]
                      : [tangent,face+direction*join_eps,cell/2])
        rotate(axis==0 ? [0,-90*direction,0] : [90*direction,0,0])
            if(is_pin){
                cylinder(d=pin_hole_diameter,h=cut_depth+2*join_eps);
                cylinder(d=pin_hole_recess_diameter,h=pin_recess_depth+join_eps);
                translate([0,0,middle_wall_actual-pin_recess_depth+join_eps])
                    cylinder(d=pin_hole_recess_diameter,h=pin_recess_depth+join_eps);
            }else
                linear_extrude(height=cut_depth+2*join_eps) axle_profile();
}
module side_connector_drills(cs){
    for(axis=[0,1],direction=[-1,1],c=cs)
        let(x=c[0],y=c[1],tangent=c[1-axis],
            coordinate=(c[axis]+(direction>0 ? 1 : 0))*cell)
        if(exposed(x,y,axis,direction,cs)){
            side_connector_drill(axis,direction,coordinate,(tangent+0.5)*cell);
            // The positive tangent direction counts each adjacent pair only once.
            let(nx=x+(axis==1 ? 1 : 0),ny=y+(axis==0 ? 1 : 0))
                if(included(nx,ny,cs) && exposed(nx,ny,axis,direction,cs))
                    side_connector_drill(axis,direction,coordinate,(tangent+1)*cell,true);
        }
}
module front_openings(cs){
    // Use the full aperture outside the middle band.
    translate([0,0,-join_eps])
       linear_extrude(height=middle_z_min+join_eps) large_front_opening(cs);
    translate([0,0,middle_z_max])
       linear_extrude(height=cell-middle_z_max+join_eps) large_front_opening(cs);
    // Enlarge the nominal square cavity directly, so its corners stay square.
    translate([0,0,middle_z_min])
       linear_extrude(height=middle_z_max-middle_z_min)
           offset(delta=-(middle_wall-clearance)) footprint(cs);
}
module rounded_outer_solid(cs){
    // The sphere restores the rounded envelope, retaining the assembly inset.
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
    front_openings(cs);
    side_connector_drills(cs);
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
