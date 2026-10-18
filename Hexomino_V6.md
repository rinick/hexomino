# Hexomino 6×6×6 镂空立方体拼图 — V6 最终设计规范

> **版本：V6（局部半格切孔 / Local Half-Cell Cuts；2026-10-18 更新：3/5 格开孔与圆角，1/5 格边厚，暂时取消公差）**  
> **目的：** 本文件是独立、可移植的建模规格。新会话中的 AI 或工程师只需阅读本文（尤其是下方的完整 OpenSCAD 源码），就能重新生成同一套 37 个 3D 模型；不要求访问旧对话或之前的图片。  
> **版本选择：** 用户最终选择 **V6**。**不要**自行改成 V5 的远距离贯穿侧孔、V7 的渐变加厚结构，或早期“薄板拼接”的方案。

## 一、成品定义和不可更改的设计意图

制作由 **35 种不同的自由 Hexomino（每块六个方格）** 加 **两种 Triomino（直线三格和 L 形三格）** 组成的共 **37 个拼块**。总格数为 `35 × 6 + 2 × 3 = 216`，目标是能组合成 `6 × 6 × 6` 个单位立方体的大立方体。

- 每个拼块本质上是二维多格轮廓沿厚度方向拉伸 **一个单位格** 的物体；它不是立体自由六连方块（polycube），不可把形状随意变成立体多层结构。
- 从外面看得出拼块整体轮廓，同时尽可能看穿拼块、看到后面的拼块；不保留内部单位格分隔线。
- **外轮廓为直角，内孔的转弯有圆角。** 不要把外部角切成圆角，也不要在内凹角添加贯穿厚度的实心圆柱。
- 拼块**一体成型**：建模应先制作完整实心形状，再在 X/Y/Z 三个方向做布尔差集切孔。不是先制作六个空心方块再黏合，也不是以数块平板组装。
- **V6 的决定性特征是局部侧孔：** 侧圆孔从一个**外露的单位格侧面**向内只钻半格，而不是一次钻穿整个长拼块。相对面的小孔可在同一单位格中相遇，但不能误切穿遥远的其他格子。
- 每块使用单色打印即可。颜色不改变几何结构；不包括自动标号凸字、拼装盒或装饰纹理。

## 二、单位、坐标与全部参数（毫米）

| 参数 / 源码变量 | 精确要求 | 解释 |
|---|---:|---|
| `cell` | **12.7 mm** | 1/2 英寸；单位格三个方向的名义尺寸均为 12.7 mm |
| `side_diameter_ratio` | **3/5** | 每个外露侧面圆孔直径比例 |
| `side_r` | **3.81 mm** | `cell × (3/5) / 2`；侧圆孔半径 |
| 侧圆孔直径 | **7.62 mm** | `cell × 3/5` |
| `front_fillet_diameter_ratio` | **3/5** | 正反面整体大开孔圆角的直径比例；单格宽通道的开孔宽度也为 3/5 格 |
| `front_r` | **3.81 mm** | `cell × (3/5) / 2`；整体开孔圆角半径 |
| 正面圆角直径 | **7.62 mm** | 与侧孔直径相同 |
| `front_frame` | **2.54 mm** | `cell / 5`；正面开孔直线段至外轮廓的边框宽度 |
| `clearance` | **0 mm / 外表面** | 按本次要求暂时取消外形内缩及装配间隙 |
| `cut_depth` | **6.35 mm** | 各外露面向内切削的名义深度，恰好半个单位格 |
| `join_eps` | **0.02 mm** | 布尔运算用的微小延伸量，使相对孔在中平面稍微相交 |
| `facets` | **64** | `$fn = 64`，OpenSCAD 圆的离散精度 |
| `piece_id` | **0 至 36** | 确定生成哪一个拼块（0 对应 H01，36 对应 T37） |

**坐标系：** 拼块形状定义在 XY 平面；`z ∈ [0, cell]` 表示厚度。平面中每个单位格左下角为 `(x*cell, y*cell)`，坐标为非负整数。正反面是 `±Z`，其余四个方向的侧面是 `±X` 与 `±Y`。`(x,y)` 数组的方向是**模型坐标**，不是图像上的行列索引。

**外形公差：** 本次按用户确认，暂时设为 `clearance = 0 mm`，不内缩实心外轮廓。单格外部跨度为 **12.7 mm**，相邻独立拼块的理论装配间隙为 **0 mm**。侧孔上下及左右的最薄直线边厚为 `(12.7−7.62)/2 = 2.54 mm = cell/5`；正面开孔的直线边框同样为 **2.54 mm**。圆弧附近或多格交汇处的实体厚度随几何位置变化，不要求处处等厚。

名义立方体边长为 `6×12.7 = 76.2 mm = 3 英寸`；本次零公差模型的实际总外轮廓与名义尺寸一致。

## 三、严格的几何生成顺序

### 3.1 实心外轮廓

给定拼块的六个（或三个）XY 网格坐标 `cells`：

1. 在每个 `(x, y)` 放置一个尺寸为 `cell × cell` 的方形，取二维**并集**形成完整拼块平面轮廓 `F`。
2. 对 `F` 做二维 `offset(delta=-clearance)`；再沿 Z 轴拉伸高度 `cell-2*clearance`，并置于 `z=clearance`。
3. 结果是一个**整体实心棱柱**，外边缘仍保持方形 / 直角。后续所有孔都由它减去，不进行板件拼接。

### 3.2 正面与背面的单一连续大开孔（±Z）

**重要：正反面的开孔按整个拼块的连续形状处理，不是给每个格子分别开圆孔。**

本次参数满足 `front_frame + front_r = cell/2 = 6.35 mm`。旧版的两次偏置公式如下，仅用于说明为何需要调整生成方法，**不得直接用于本次导出**：

```openscad
module large_front_opening(cs) {
    offset(r=front_r)
        offset(delta=-(front_frame+front_r))
            footprint(cs);
}
```

该公式先将轮廓内缩半格，会把单格宽的部分压成零面积线段，OpenSCAD 会丢弃这些部分，导致长条或分支开孔消失。因此本次直接构造其连续极限的二维开孔：

1. 在每格中心放一个半径 `front_r = 3.81 mm` 的圆盘。
2. 对每对共享边的相邻格，以两个圆盘的 `hull()` 连接成等宽通道；只连接实际相邻格，不能对整个拼块取凸包。
3. 每个完整的 `2×2` 格块，填充四个格中心围成的正方形，避免开孔内出现实心孤岛。
4. 对上述二维区域取并集，形成一个连续开孔。单格宽通道宽度为 **7.62 mm**，端部和凸转角的圆弧直径为 **7.62 mm**，沿用整体轮廓开孔的内凹直角。附录中的 `large_front_opening()` 是本次权威实现。

这些圆盘和连接仅用于构造**减去的空腔轮廓**；最终仍从一个完整实心棱柱中做整体差集，不是把各格空心实体拼接，也不会增加实心角柱。

将这个大开孔从 `-Z` 面和 `+Z` 面分别朝中间切 `cell/2`，用 `join_eps` 保证相遇：

- 下方切孔区间：`z ∈ [-join_eps, cell/2 + join_eps]`。
- 上方切孔区间：`z ∈ [cell/2 - join_eps, cell + join_eps]`。
- 两个空腔在中间有 `2×join_eps = 0.04 mm` 的交叠，形成真正贯通的大开孔。

### 3.3 四个方向的侧面圆孔（±X / ±Y）

对于每个 XY 网格单元 `(x,y)`，只在**该面的相邻位置没有同一 Piece 的单位格**时，才向内切圆柱孔。侧孔必须满足：

- 圆孔圆心位于外露格面中心；其 Z 高度为 `cell/2`，平面上的另一坐标为该格中点。
- 圆孔半径为 `side_r = 3.81 mm`，直径为 `7.62 mm = cell × 3/5`。
- 圆柱轴垂直于该外露面，朝格子内部切入 `cut_depth = 6.35 mm`（另有 OpenSCAD 数值误差重叠量 `join_eps`）。
- 同一格相对两个侧面的圆孔在中间相遇；不同方向的圆柱和正面大开孔可以自然互相交叉。
- **绝不能从非外露的内部单位格接触面另开侧孔，也不能把一个侧孔延伸穿过两格、三格直至 Piece 的另一端。**

具体位置及轴向：

| 外露面 | 面坐标 | 圆心其余坐标 | 轴向 / 切入方向 |
|---|---|---|---|
| `-X` | `x*cell` | `((y+0.5)*cell, cell/2)` | 朝 `+X` |
| `+X` | `(x+1)*cell` | `((y+0.5)*cell, cell/2)` | 朝 `-X` |
| `-Y` | `y*cell` | `((x+0.5)*cell, cell/2)` | 朝 `+Y` |
| `+Y` | `(y+1)*cell` | `((x+0.5)*cell, cell/2)` | 朝 `-Y` |

**对精确复现至关重要：** 沿孔轴额外从外表面外侧起始 `join_eps`，使气孔确实完全穿过外表面；总圆柱切削高度为 `cut_depth + 2*join_eps`。这只是用于布尔稳定，不代表设计意图变成超过半格的远距离钻孔。

### 3.4 全部切孔用单次整体布尔差集处理

最终实体公式为：

`Solid = inset_extruded_footprint − (front_bottom_cut ∪ front_top_cut ∪ all_exposed_side_cylinders)`

不要把侧壁 / 正面边框分别打印或布尔相加成平板盒。孔洞在实体内部交会后的轮廓应该是**实际 CSG 差集产生的三维曲面**，而不是人为补上的矩形墙、实心角柱、三角加强筋、线性楔块。**不要添加 V7 的加固操作。**

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

## 五、建议的重建流程（任何 AI 可按此执行）

1. 确定能够运行 **OpenSCAD**；使用本文附录的**本次更新后的全部源码**，保存成 `hexomino_local_half_cell_v6.scad`。完整坐标已嵌在源码的 `all_cells` 数组中。
2. 在同一目录中执行命令（Linux/macOS Shell 示例）：

   ```bash
   mkdir -p STL_37
   names=(H01_L H02_T H03_STEP H{04..35} T36_BAR3 T37_L3)
   for i in "${!names[@]}"; do
     openscad --backend=CGAL --hardwarnings --export-format=binstl -o "STL_37/${names[$i]}.stl" -D "piece_id=$i" hexomino_local_half_cell_v6.scad
   done
   ```

   使用 Bash 和支持 `--backend` 的 OpenSCAD 执行上述命令，产生按第 4 节命名的 37 个 STL。本次使用 **OpenSCAD 2026.10.18 / CGAL** 最终渲染并导出二进制 STL；同版 Manifold 在本组相切曲面处导出后出现零面积三角面，故本次不采用。不要使用单纯 OpenCSG 预览截图或未经合并的网格叠加。
3. 对 STL 做水密性（watertight）、体积正数、单一连通实体检查，并检查孔洞是否真的按各外露格面半格深切入。
4. 如需修补浮点几何的误差，可微调 `join_eps`；不可因此更改孔径、转角位置或加固方式。
5. 生成正视、侧视、透视效果图，重点检查 H01_L、H02_T、H03_STEP、H35 和 T37_L3。
6. 预估用料、使用切片软件验证可打印性；实际材料适配与装配间隙要在正式批量生产前做样件测试。

## 六、本次更新后的 V6 CAD 验证基准

以下数据由本次 3/5 格孔径、1/5 格边厚、零公差的 37 个 STL 重新测量，不能沿用旧孔径模型的体积和质量。逐件结果见 `validation_results.json`，理论材料质量见 `piece_volume_and_weight.csv`。

| 指标 | 更新后 V6 参考结果 |
|---|---:|
| STL 数量 | 37 |
| 水密封闭 STL | 37 / 37 |
| 每件连通实体数 | 1 |
| 总实体体积 | **136.551 cm³**（约值） |
| PLA 理论用料（密度 1.24 g/cm³） | **169.3 g** |
| PETG 理论用料（密度 1.27 g/cm³） | **173.4 g** |
| H01_L 实体体积 | 3900.556 mm³ |
| H02_T 实体体积 | 3922.933 mm³ |
| H03_STEP 实体体积 | 3967.689 mm³ |
| H35 六格直条体积 | 3878.178 mm³ |
| T36_BAR3 体积 | 2114.003 mm³ |
| T37_L3 体积 | 2136.381 mm³ |

**本次检查结果：** 37/37 件水密封闭、法向一致、体积为正、各为一个连通实体，且没有零面积三角面；正反面各有一个连续开孔，覆盖所有单位格。全部 **488 个外露侧孔**的直径和圆孔面积、正面凸圆角的半径、直线边框及外接尺寸均通过检查。尺寸检查容差为 `0.0001 mm`（仅用于 STL 数值验证，不是装配公差）。代表件正视、侧视、透视图见 `V6_3_5_PREVIEW.png`。

三角网格数量或零件体积最后几个小数位可能随 OpenSCAD、几何后端版本和 tessellation 设置变化；若偏差显著，应首先检查半格局部切孔、`front_frame`、连续开孔构造、布尔重叠余量以及坐标是否复现正确。

### 不能只凭“水密封闭”确认符合设计

- **形状正确：** 精确对应 35 种 Hexomino + 2 种 Triomino；没有遗漏、重复、镜像误分类或增删单位格。
- **孔口正确：** 正反面是**一个连续的整体开孔**，单格宽通道开孔宽度为 3/5 格；侧面每个**外露**单位格有相应圆孔，直径为 3/5 格。
- **内部正确：** 没有内部网格分隔线和人为实心角柱；对向孔在单格中贯通相遇；长形拼块不允许被单个侧孔切穿多格。
- **外形正确：** 原轮廓直角；前孔圆角直径为 3/5 格，直线边框为 1/5 格，位置须与附录的连续开孔构造一致。
- **装配正确：** 所有外表面使用一致的 `clearance = 0`；不得通过改变格距增加间隙。
- **制造正确：** STL 仅是几何体；打印实际强度、侧孔桥接、薄边断裂、尺寸精度及整套 6×6×6 拼装顺序**尚未实物验证**。

### 强度与打印注意（事实与待测项区分）

本次侧孔顶部、底部的最薄边为 `(12.7−7.62)/2 = 2.54 mm`。不要声称 V6 已经通过机械测试。推荐先打印 L 形和长直条测试：观察孔顶桥接、角部抗扭、边框抗弯与第一层象脚问题。当前暂时取消装配公差，实际插入是否顺畅仍需样件验证；后续若恢复公差，应同时更新本文参数、源码和 STL。

**装配的数学可解性与打印可行性是两回事。** 这里的 37 个形状与材料几何已定义，但本规格并未包含经独立验证的 6×6×6 排列解或保证每个零件存在可行的实体插入顺序。

## 七、参考 OpenSCAD 完整源码（V6 的权威实现）

本附录是本次更新后的 V6 源码。**把下面代码保存为 `hexomino_local_half_cell_v6.scad` 就可以按第 5 节重新导出。** 如果自然语言说明与该源码的细小数值细节存在歧义，以源码几何行为为重建本次 V6 的基准。

```openscad
/* HEXOMINO V6 - LOCAL HALF-CELL CUTS FROM ALL EXPOSED FACES
   Construct a FULL SOLID footprint prism, then boolean subtract:
   1) continuous front silhouette aperture cut 0.5 cell deep from +Z and -Z
   2) circular local bores 0.5 cell inward ONLY from exposed +/-X faces
   3) circular local bores 0.5 cell inward ONLY from exposed +/-Y faces
   Facing half-depth cuts share a very small overlap at the middle, so they connect.
   No long drill reaches across multiple cells. Boolean difference of monolithic solid.
   Exact scale: cell 12.7 mm = half inch.
   Updated 2026-10-18: openings and fillets 3/5 cell; rims 1/5 cell; no clearance.
*/
cell = 12.7;
side_diameter_ratio=3/5;        // side diameter = 7.62 mm
front_fillet_diameter_ratio=3/5;// front opening corner diameter = 7.62 mm
front_frame = cell/5;          // front rim width = 2.54 mm
clearance = 0;                 // temporarily no inset or assembly gap
facets = 64;                   // circle smoothness
piece_id = 0;                   // 0..36
cut_depth = cell/2;             // physical inward depth = 6.35mm, half cell
join_eps=0.02;                  // 0.02 mm overlap to avoid coincident cut surfaces
$fn=facets;
side_r=cell*side_diameter_ratio/2;
front_r=cell*front_fillet_diameter_ratio/2;
assert(side_r < cell/2-clearance, "Side hole radius too large");
assert(abs(front_r+front_frame-cell/2) < 0.000001, "Front rim and radius must sum to half a cell");
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
// Each individual EXPOSED side face is drilled only 0.5 cell inward.
// A neighbor in the bore direction means the face is not exposed: skip it.
module x_axis_local_drills(cs){
    for(c=cs) let(x=c[0],y=c[1]){
      if(!included(x-1,y,cs))
        // -X face x*cell, cylinder runs from outside toward +X.
        translate([x*cell-join_eps, (y+0.5)*cell, cell/2])
          rotate([0,90,0]) cylinder(r=side_r,h=cut_depth+2*join_eps);
      if(!included(x+1,y,cs))
        // +X face (x+1)*cell, runs from outside toward -X.
        translate([(x+1)*cell+join_eps, (y+0.5)*cell, cell/2])
          rotate([0,-90,0]) cylinder(r=side_r,h=cut_depth+2*join_eps);
    }
}
module y_axis_local_drills(cs){
    for(c=cs) let(x=c[0],y=c[1]){
      if(!included(x,y-1,cs))
        // -Y face y*cell, toward +Y.
        translate([(x+0.5)*cell, y*cell-join_eps, cell/2])
          rotate([-90,0,0]) cylinder(r=side_r,h=cut_depth+2*join_eps);
      if(!included(x,y+1,cs))
        // +Y face (y+1)*cell, toward -Y.
        translate([(x+0.5)*cell,(y+1)*cell+join_eps,cell/2])
          rotate([90,0,0]) cylinder(r=side_r,h=cut_depth+2*join_eps);
    }
}
module z_axis_half_depth_openings(cs){
    // Continuous aperture; explicit +/-Z face-local half-cell depth.
    translate([0,0,-join_eps])
       linear_extrude(height=cut_depth+2*join_eps) large_front_opening(cs);
    translate([0,0,cell-cut_depth-join_eps])
       linear_extrude(height=cut_depth+2*join_eps) large_front_opening(cs);
}
module piece(cs){
  difference(){
    translate([0,0,clearance])
      linear_extrude(height=cell-2*clearance)
        offset(delta=-clearance) footprint(cs);
    z_axis_half_depth_openings(cs);
    x_axis_local_drills(cs);
    y_axis_local_drills(cs);
  }
}
assert(piece_id>=0 && piece_id<len(all_cells));
piece(all_cells[piece_id]);
```

## 八、交付内容清单

使用本规范重新生成模型时，理想输出应包含：

- `STL_37/`：37 个逐件可打印 STL（建议按第 4 节指定名称命名）。
- `hexomino_local_half_cell_v6.scad`：参数化源代码。
- `shapes.json` 或等价精确坐标数据：37 个 Piece 及编号。
- `validation_results.json`：各件水密性、连通实体数、体积、外接尺寸。
- `piece_volume_and_weight.csv`：材料体积、PLA/PETG 理论质量。
- 可视化图（所有形状总览及代表性 3D 视图），用于人工确认没有改变 V6 的几何语义。

**本次更新结论：V6 = `1/2 英寸单格 + 3/5 格直径侧面外露圆孔 + 3/5 格直径正面圆角与单格通道宽度 + 1/5 格直线边厚 + 暂时零公差 + 前后连续大开孔 + 侧孔局部半格切入 + 一体实体 CSG`。不采用 V7。**
