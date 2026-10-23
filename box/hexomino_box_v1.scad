/* HEXOMINO BOX V1-F, 2026-10-23. Based on the original two shallow trays.
   Two print-in-place assemblies; each contains a tray and a captive folding wall.
   Default STL pose: wall folded OUT, angle=180; no metal pins or extra assembly.
   Board: side lap joints and releasable clips. Box: upright end-wall lips retain
   the opposite floor; end-wall spring catches lock the walls upright.
   Prototype: test the hinge coupon before printing the full assemblies.
*/
cell=16;
width=192;
length=144;
base=4;
side=4;
end=8;
wall_top=20;
box_height=40;
fit=0.20;
pip_gap=0.40;
hinge_y=152.4;
hinge_z=20;
hinge_centers=[40,96,152];
lip_centers=[52,140];
eps=0.02;
part="A";              // "A", "B", "coupon"
component="all";       // "all", "fixed", "flap" (the latter two are for inspection)
view="part";           // "part", "board", "box", "exploded", "folding"
fold_angle=180;         // 0=upright, 180=folded outside the board
$fn=64;
assert(cell==16 && width==192 && length==144 && base==4);

module board_transform(){translate([width,0,0]) rotate([0,0,180]) children();}
module box_transform(lift=0){translate([0,length,box_height+lift]) rotate([180,0,0]) children();}
module fold(angle){
    translate([0,hinge_y,hinge_z]) rotate([-angle,0,0])
        translate([0,-hinge_y,-hinge_z]) children();
}
module x_prism(x,size,points){
    multmatrix([[0,0,1,x],[1,0,0,0],[0,1,0,0],[0,0,0,1]])
        linear_extrude(height=size) polygon(points);
}
module x_cylinder(x,size,r){
    translate([x,hinge_y,hinge_z]) rotate([0,90,0]) cylinder(r=r,h=size);
}
module both_sides(){children();translate([width,0,0]) mirror([1,0,0]) children();}
module both_ends(){children();translate([width,0,0]) mirror([1,0,0]) children();}
module rim_tongues(){
    for(x=[-2.7,width+1.3]) for(span=[[24,60],[100,136]])
        translate([x,span[0],wall_top-eps]) cube([1.4,span[1]-span[0],1.5+eps]);
}
module rim_grooves(){
    for(x=[-2.7-fit,width+1.3-fit]) for(span=[[8,44],[84,120]])
        translate([x,span[0]-fit,wall_top-1.5-fit])
            cube([1.4+2*fit,span[1]-span[0]+2*fit,1.5+fit+eps]);
}
module body(){
    translate([-side,0.1,0]) cube([width+2*side,151.9,base]);
    for(x=[-side,width]) translate([x,0.1,base-eps]) cube([side,151.9,16+eps]);
    translate([-side,length,0]) cube([width+2*side,end,wall_top]);
}
module lip_pockets(){
    // Blind pockets open on the underside; the board deck remains continuous.
    for(c=lip_centers) translate([c-20-fit,-eps,-eps]) cube([40+2*fit,4.2+eps,2.2+eps]);
}
module wall_latch_pockets(){
    both_ends(){
        translate([-fit,148.2,17.8]) cube([4+2*fit,4,2]);
        translate([-fit,149.2,19.8-eps]) cube([4+2*fit,3,0.4+eps]);
    }
}
module fixed_hinges(){
    for(c=hinge_centers){
        for(x=[c-12,c+5]){
            intersection(){
                x_cylinder(x,7,3.4);
                x_prism(x,7,[[144,0],[152,0],[152,16],
                    [160,24],[160,28],[144,28]]);
            }
        }
        // Flat underside provides a 10 mm bridge between the solid cheeks.
        intersection(){
            x_cylinder(c-5.2,10.4,1.2);
            translate([c-5.3,hinge_y-1.3,hinge_z-0.8]) cube([10.6,2.6,2.1]);
        }
    }
}
module hinge_clearance_in_body(){
    for(c=hinge_centers) x_cylinder(c-5,10,3.8);
}
module board_arm_reliefs(){
    both_sides() translate([-4-eps,0.08,-eps]) cube([2.8+eps,10.32,20.1+eps]);
}
module board_arms(){
    both_sides(){
        translate([-4,-14,0]) cube([1.8,25,20]);
        // A sloping nose cams the two exterior clips during planar joining.
        translate([0,0,10]) linear_extrude(height=4)
            polygon([[-2.2,-14],[-0.8,-11],[-0.8,-9],[-2.2,-9]]);
        translate([-4,-10.5,10]) scale([1.0,2.2,3]) sphere(r=1,$fn=32);
    }
}
module board_receivers(){
    both_sides(){
        translate([-4-eps,-eps,-eps]) cube([2.2+eps,14.2+eps,20.1+eps]);
        // Hook windows carry vertical shear as well as preventing separation.
        translate([-4-eps,8.8,9.8]) cube([4+2*eps,5.4,4.4]);
    }
}
module fixed_tray(which){
    union(){
        difference(){
            body();lip_pockets();wall_latch_pockets();hinge_clearance_in_body();
            if(which=="A") board_arm_reliefs();
            if(which=="B"){board_receivers();rim_grooves();}
        }
        fixed_hinges();
        both_ends() translate([-fit,148.2,20-eps]) cube([4+2*fit,1,1.2+eps]);
        if(which=="A"){rim_tongues();board_arms();}
    }
}
module flap_hinge_clearance(){
    for(c=hinge_centers) for(x=[c-12.4,c+4.6]) x_cylinder(x,7.8,3.8);
}
module rotating_bores(){
    // A 45-degree roof is uppermost in the folded printing pose.
    for(c=hinge_centers) x_prism(c-4.8,9.6,
        [[hinge_y-1.1314,hinge_z-1.1314],
         [hinge_y,hinge_z-2.2628],[hinge_y+1.1314,hinge_z-1.1314]]);
    for(c=hinge_centers) x_cylinder(c-4.8,9.6,1.6);
}
module wall_latches(){
    both_ends(){
        // X-directed beams flex along Y, in the printing bed plane.
        translate([0,149.4,22]) cube([26,1.8,4]);
        x_prism(0,4,[[149.4,18.2],[151.2,18.2],[151.2,24],
            [149.4,24],[149.4,19.6],[148.6,19.6],[148.6,18.6]]);
    }
}
module upright_flap(){
    difference(){
        union(){
            difference(){
                translate([-side,length,20.4]) cube([200,end,19.6]);
                flap_hinge_clearance();
                both_ends() translate([-eps,149.2,20.4-eps]) cube([24,3+eps,6]);
                both_ends() translate([-0.4,148,20.4-eps]) cube([4.8,1.4,1+eps]);
                both_sides() translate([-4-eps,144-eps,20.4-eps]) cube([3.6+eps,8+2*eps,19.6+2*eps]);
            }
            for(c=hinge_centers){
                x_cylinder(c-4.6,9.2,3.4);
                // This bed-contacting rib supports the moving knuckle during printing.
                translate([c-4.6,151.8,22]) cube([9.2,0.6,18]);
            }
            wall_latches();
            for(c=lip_centers) translate([c-20,140,38]) cube([40,4.1,2]);
        }
        rotating_bores();
    }
}
module tray(which,angle=180){
    if(component!="flap") fixed_tray(which);
    if(component!="fixed") fold(angle) upright_flap();
}
module show_a(angle=180){color("#3d9aab") tray("A",angle);}
module show_b(angle=180){color("#e8ac60") tray("B",angle);}
if(view=="board"){
    show_a();board_transform() show_b();
}else if(view=="box"){
    show_a(0);box_transform() show_b(0);
}else if(view=="exploded"){
    show_a();box_transform(50) show_b();
}else if(view=="folding"){
    show_a(fold_angle);
}else{
    assert(view=="part" && (part=="A" || part=="B" || part=="coupon"));
    if(part=="coupon") intersection(){
        tray("A",fold_angle);
        translate([-4,128,-eps]) cube([64,42,24]);
    }else tray(part,fold_angle);
}
