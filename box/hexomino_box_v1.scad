/* HEXOMINO BOX V1, 2026-10-23
   Two printed parts, no hardware. Local floor bottom Z=0, deck Z=4.
   Board: B turns 180 degrees about Z and joins A's open edge.
   Box: B turns 180 degrees about X; the tall opposite end walls close both ends.
   A's open-floor keys and inverted tall-end keys share B's two snap receivers.
   Two additional flush side clips retain the long edges in box mode.
   Prototype: snap force, fatigue and loaded carrying strength need physical tests.
*/
cell=16;
width=12*cell;
length=9*cell;
inside_height=2*cell;
base=4;
side=4;
end=8;
half_height=inside_height/2;
total_height=2*base+inside_height;
fit=0.20;                 // clearance per mating edge; stored piece models stay unchanged
seam=0.20;
key_depth=6;
key_centers=[width/4,3*width/4];
arm_length=23;
arm_thickness=1.8;
arm_y=key_depth+0.6;
eps=0.02;
part="A";                 // "A" or "B"
view="part";              // "part", "board", "box", "exploded"
$fn=48;
// The side clips are dimensioned for this prototype; changing these needs a redesign.
assert(cell==16 && base==4 && side==4 && end==8);

module board_transform(){
    translate([width,0,0]) rotate([0,0,180]) children();
}
module box_transform(lift=0){
    translate([0,length,total_height+lift]) rotate([180,0,0]) children();
}
module key_outline(c){
    translate([c,0]) polygon([
        [-7,0.5],[7,0.5],[12,-key_depth+2],
        [12,-key_depth],[-12,-key_depth],[-12,-key_depth+2]
    ]);
}
module keys_outline(){union() for(c=key_centers) key_outline(c);}
module open_keys(){
    difference(){
        union(){
            // A small lower lead-in cams the planar latch during vertical insertion.
            for(c=key_centers) hull(){
                linear_extrude(height=eps) offset(delta=-0.4) key_outline(c);
                translate([0,0,0.6]) linear_extrude(height=eps) key_outline(c);
            }
            translate([0,0,0.6]) linear_extrude(height=base-0.6) keys_outline();
        }
        for(c=key_centers)
            translate([c-11,-key_depth-eps,base-1.7])
                cube([22,0.65,0.8]);
    }
}
module receiver_plan(){
    mirror([0,1,0]) offset(delta=fit) keys_outline();
}
module relief(c){
    translate([c-18,key_depth-eps,-eps])
        cube([25,arm_thickness+1.2+eps,base+2*eps]);
}
module finger_recesses(c){
    for(z=[-eps,base-0.8])
        translate([c+3,arm_y+arm_thickness+1.6,z])
            cylinder(r=2.5,h=0.8+eps);
}
module x_prism(x,size,points){
    multmatrix([[0,0,1,x],[1,0,0,0],[0,1,0,0],[0,0,0,1]])
        linear_extrude(height=size) polygon(points);
}
module latch(c){
    // This beam bends in the bed plane, not across a vertical stack of layers.
    translate([c-19,arm_y,0]) cube([arm_length+1,arm_thickness,base]);
    x_prism(c+1,4,[
        [key_depth-0.35,base-1.6],
        [arm_y+0.2,base-1.6],
        [arm_y+0.2,base-0.3],
        [key_depth+0.3,base-1.0],
        [key_depth-0.35,base-1.0]
    ]);
}
module rim_tongues(){
    for(x=[-side/2-0.7,width+side/2-0.7])
        for(span=[[8,44],[length-44,length-8]])
            translate([x,span[0],base+half_height-eps])
                cube([1.4,span[1]-span[0],1.5+eps]);
}
module rim_grooves(){
    for(x=[-side/2-0.7-fit,width+side/2-0.7-fit])
        for(span=[[8,44],[length-44,length-8]])
            translate([x,span[0]-fit,base+half_height-1.5-fit])
                cube([1.4+2*fit,span[1]-span[0]+2*fit,1.5+fit+eps]);
}
module both_sides(){
    children();
    translate([width,0,0]) mirror([1,0,0]) children();
}
module side_clip_reliefs(){
    both_sides() translate([-side-eps,48,-eps])
        cube([side-1.6+eps,25,23]);
}
module side_clips(){
    both_sides() union(){
        // The relief reaches the bed: this XY-flexing arm is free along its length.
        translate([-side,47,0]) cube([1.8,25,base+half_height-0.2]);
        translate([0,72,0]) rotate([90,0,0]) linear_extrude(height=4)
            polygon([[-4,19.8],[-2.2,19.8],[-2.2,20.8],
                     [-1.4,20.8],[-1.4,21.2],[-2.2,21.8],[-4,21.8]]);
    }
}
module side_catches(){
    // Defined in assembled A coordinates; inverse box_transform locates B's cuts.
    both_sides(){
        translate([-side-eps,67.8,20-eps]) cube([side-2+eps,4.4,2+eps]);
        translate([-2-eps,67.8,20.6]) cube([0.8+eps,4.4,1.4]);
    }
}
module body(){
    union(){
        translate([-side,seam/2,0]) cube([width+2*side,length+end-seam/2,base]);
        for(x=[-side,width])
            translate([x,seam/2,base-eps])
                cube([side,length+end-seam/2,half_height+eps]);
        translate([-side,length,0]) cube([width+2*side,end,total_height]);
    }
}
module tray_a(){
    union(){
        difference(){
            union(){body();rim_tongues();}
            side_clip_reliefs();
        }
        open_keys();
        // These copies enter the same B receivers when the box is closed.
        box_transform() board_transform() open_keys();
        side_clips();
    }
}
module tray_b(){
    union(){
        difference(){
            body();
            translate([0,0,-eps]) linear_extrude(height=base+2*eps) receiver_plan();
            for(c=key_centers){relief(c);finger_recesses(c);}
            // Open-top pockets let the opposite wall lower past A's floor keys.
            box_transform()
                translate([0,0,-eps])
                    linear_extrude(height=base+2*eps) offset(delta=fit) keys_outline();
            rim_grooves();
            box_transform() side_catches();
        }
        for(c=key_centers) latch(c);
    }
}
module show_a(){color("#3d9aab") tray_a();}
module show_b(){color("#e8ac60") tray_b();}
if(view=="board"){
    show_a();board_transform() show_b();
}else if(view=="box"){
    show_a();box_transform() show_b();
}else if(view=="exploded"){
    show_a();box_transform(50) show_b();
}else{
    assert(view=="part" && (part=="A" || part=="B"));
    if(part=="A") tray_a();else tray_b();
}
