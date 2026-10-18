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
