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
