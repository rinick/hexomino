/* HEXOMINO BOX V2, 2026-10-23
   Two printed bodies, two removable hinge pins and two retaining rods.
   Open: lift 16.4 mm, move outward 1.2 mm, lower 0.6 mm, pivot 90 degrees.
   Board: remove metal parts; join the two floors. All joints are outside the
   overhead insertion corridor x=0..192, y=-144..144, z>4.
   Prototype: fit, flexure life and hardware retention need physical testing.
*/
cell=16;
width=192;
length=144;
base=4;
side=4;
end=8;
depth=32;
total_height=41.2;
rim_z=37.2;
fit=0.20;
eps=0.02;
key_centers=[48,144];
join_offset=3.4;
hinge_x=-12.4;
hinge_z=21.2;
seat_x=-13.6;
seat_z=37;
hinge_starts=[30,98];
pin_d=3;
pin_bore=3.6;
rod_y=-1.7;
clip_starts=[36,96];
part="A";
view="part";              // "part", "box", "open", "board"
open_angle=90;
$fn=48;

module board_transform(){translate([width,-join_offset,0]) rotate([0,0,180]) children();}
module box_transform(){translate([0,152,total_height]) rotate([180,0,0]) children();}
module hinge_transform(angle){
    translate([seat_x,0,seat_z]) rotate([0,-angle,0])
        translate([-seat_x-1.2,0,-seat_z+15.8]) children();
}
module y_prism(y,size,points){
    translate([0,y+size,0]) rotate([90,0,0])
        linear_extrude(height=size) polygon(points);
}
module y_cylinder(x,y,z,size,r){
    translate([x,y+size,z]) rotate([90,0,0]) cylinder(r=r,h=size);
}
module x_cylinder(x,y,z,size,r){
    translate([x,y,z]) rotate([0,90,0]) cylinder(r=r,h=size);
}
module key_outline(c,shrink=0,shift=0){
    offset(delta=-shrink) translate([c,shift]) polygon([
        [-7,0.5],[7,0.5],[12,-4],[12,-6],[-12,-6],[-12,-4]
    ]);
}
module key_tabs(end_plug=false){
    shrink=end_plug?0.15:0;
    height=end_plug?4.4:base;
    difference(){
        union(){
            for(c=key_centers) hull(){
                linear_extrude(height=eps) offset(delta=-0.4) key_outline(c,shrink,-join_offset);
                translate([0,0,0.6]) linear_extrude(height=eps) key_outline(c,shrink,-join_offset);
            }
            for(c=key_centers) translate([0,0,0.6])
                linear_extrude(height=height-0.6) key_outline(c,shrink,-join_offset);
        }
        // The upper plugs fill the closed lid's receiver holes without latching.
        for(c=key_centers) translate([c-11,-join_offset-6-eps,end_plug?-eps:2.3])
            cube([22,0.65,end_plug?height+2*eps:0.8]);
    }
}
module receiver_plan(){
    mirror([0,1,0]) union() for(c=key_centers) offset(delta=fit) key_outline(c);
}
module floor_reliefs(){
    for(c=key_centers){
        translate([c-18,6-eps,-eps]) cube([25,3.02,base+2*eps]);
        for(z=[-eps,base-0.8]) translate([c+3,10,z]) cylinder(r=2.5,h=0.8+eps);
    }
}
module floor_latches(){
    for(c=key_centers){
        translate([c-19,6.6,0]) cube([24,1.8,base]);
        multmatrix([[0,0,1,c+1],[1,0,0,0],[0,1,0,0],[0,0,0,1]])
            linear_extrude(height=4) polygon([[5.65,2.4],[6.8,2.4],
                [6.8,3.7],[6.3,3],[5.65,3]]);
    }
}
module right_side(){translate([width,0,0]) mirror([1,0,0]) children();}
module clip_reliefs(){
    right_side() for(y=clip_starts){
        translate([-side-eps,y,-eps]) cube([2.4+eps,25,rim_z+2]);
        translate([-2,y+19.6,33.6]) cube([1.8,4.8,2.42]);
    }
}
module clips(){
    clip_top=rim_z-3;
    right_side() for(y=clip_starts) union(){
        translate([-4,y-1,0]) cube([1.8,25,clip_top-0.2]);
        y_prism(y+20,4,[[-4,clip_top-0.2],[-2.2,clip_top-0.2],
            [-2.2,clip_top+0.8],[-1.4,clip_top+0.8],[-1.4,clip_top+1.2],
            [-2.2,clip_top+1.8],[-4,clip_top+1.8]]);
        // Grip stays below the outer lid skirt during the initial lift.
        translate([-4,y+22,16]) scale([1.2,2.2,3]) sphere(r=1,$fn=32);
    }
}
module catch_ledges(){
    right_side() for(y=clip_starts){
        translate([-1.2,y+19.8,33.8]) cube([0.6,4.4,3.42]);
        translate([-2,y+19.8,33.8]) cube([0.8,4.4,1]);
    }
}
module slot_capsule(y,size,r){
    hull(){
        y_cylinder(hinge_x,y,hinge_z,size,r);
        y_cylinder(hinge_x,y,37.6,size,r);
    }
    hull(){
        y_cylinder(hinge_x,y,37.6,size,r);
        y_cylinder(seat_x,y,37.6,size,r);
    }
    hull(){
        y_cylinder(seat_x,y,37.6,size,r);
        y_cylinder(seat_x,y,seat_z,size,r);
    }
}
module hinge_a(){
    for(y=hinge_starts){
        for(start=[y,y+17]){
            y_prism(start,7,[[-3.8,0],[-3.8,18.7],[-22.5,18.7]]);
            translate([-22.5,start,18.7]) cube([22.5,7,1.3]);
            slot_capsule(start,7,3.4);
        }
        // The 90-degree stop remains below the closed top face.
        translate([-22.5,y,18.7]) cube([3,24,22.3]);
    }
}
module hinge_b_closed(){
    for(y=hinge_starts){
        y_cylinder(hinge_x,y+7.3,hinge_z,9.4,3.4);
        translate([hinge_x,y+7.3,hinge_z]) cube([7.2,9.4,4]);
        translate([-8.4,y+7.3,25.1]) cube([0.9,9.4,3.9]);
    }
}
module hinge_b_bores(){
    for(y=hinge_starts) y_cylinder(hinge_x,y-eps,hinge_z,24+2*eps,pin_bore/2);
}
module crosspin_bosses(){
    for(z=[12,28]){
        x_cylinder(-4,rod_y,z,4,3.4);
        translate([-4,rod_y,z-3.4]) cube([4,2.5-rod_y,6.8]);
        right_side(){
            x_cylinder(-4,rod_y,z,4,3.4);
            translate([-4,rod_y,z-3.4]) cube([4,2.5-rod_y,6.8]);
        }
    }
}
module crosspin_bores(){
    for(z=[12,28]) x_cylinder(-4-eps,rod_y,z,width+8+2*eps,pin_bore/2);
}
module body_a(){
    translate([-side,-3.3,0]) cube([width+2*side,155.3,base]);
    for(x=[-side,width]) translate([x,-3.3,base-eps])
        cube([side,155.3,depth+eps]);
    translate([0,length,0]) cube([width,end,rim_z]);
}
module body_b(){
    translate([-7.6,0.1,0]) cube([207.2,159.9,base]);
    for(x=[-7.6,197.2]) translate([x,0.1,base-eps])
        cube([2.4,159.9,16+eps]);
    for(x=[-5.2,width]) translate([x,0.1,base-eps])
        cube([5.2,157.4,1.2+eps]);
    translate([-5.2,140.6,base-eps]) cube([202.4,16.9,1.2+eps]);
    translate([-7.6,157.5,0]) cube([207.2,2.5,total_height]);
}
module tray_a(){
    difference(){
        union(){
            difference(){union(){body_a();hinge_a();} clip_reliefs();}
            key_tabs();
            box_transform() board_transform() key_tabs(true);
            clips();
            crosspin_bosses();
        }
        crosspin_bores();
        for(y=hinge_starts) for(start=[y,y+17])
            slot_capsule(start-eps,7+2*eps,pin_bore/2);
    }
}
module tray_b(){
    union(){
        difference(){
            union(){body_b();box_transform() hinge_b_closed();}
            translate([0,0,-eps]) linear_extrude(height=base+2*eps) receiver_plan();
            floor_reliefs();
            box_transform(){
                hinge_b_bores();
                // Bottom keys exit downward as the lid lifts.
                for(c=key_centers) translate([c-16,-9.7,-eps]) cube([28.4,6.5,4.3+eps]);
            }
        }
        floor_latches();
        box_transform() catch_ledges();
    }
}
module pins(open=false){
    for(y=hinge_starts) color("#aeb8bc")
        y_cylinder(open?seat_x:hinge_x,y-2,open?seat_z:hinge_z,30,pin_d/2);
    for(z=[12,28]) color("#aeb8bc") x_cylinder(-14,rod_y,z,220,pin_d/2);
}
module show_a(){color("#328f9d") tray_a();}
module show_b(){color("#e6ac5e") tray_b();}
if(view=="board"){
    show_a();board_transform() show_b();
}else if(view=="box"){
    show_a();box_transform() show_b();pins();
}else if(view=="open"){
    show_a();hinge_transform(open_angle) box_transform() show_b();pins(true);
}else{
    assert(view=="part" && (part=="A" || part=="B"));
    if(part=="A") tray_a();else tray_b();
}
