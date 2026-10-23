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
