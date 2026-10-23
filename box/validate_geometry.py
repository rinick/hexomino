"""Validate the single-folding-wall box. Requires numpy, trimesh, shapely, scipy."""
import json,hashlib
from pathlib import Path
import numpy as np
import trimesh
from shapely.geometry import Polygon,GeometryCollection,box
from shapely.affinity import affine_transform
root=Path(__file__).resolve().parent
stls=root/'STL'
def tf(m,rot,offset):
 n=m.copy();t=np.eye(4);t[:3,:3]=rot;t[:3,3]=offset;n.apply_transform(t);return n

def flap_pose(m,angle):
 t=trimesh.transformations.rotation_matrix(np.deg2rad(180-angle),[1,0,0],[0,152.4,20])
 n=m.copy();n.apply_transform(t);return n

def box_pose(m):return tf(m,np.diag([1,-1,-1]),[0,144,40])
def board_pose(m):return tf(m,np.diag([-1,-1,1]),[192,0,0])
def section(mesh,value,axis=1):
 origin=np.zeros(3);normal=np.zeros(3);origin[axis]=value;normal[axis]=1
 path=mesh.section(plane_origin=origin,plane_normal=normal);res=GeometryCollection()
 if path:
  axes=[i for i in range(3) if i!=axis]
  for ring in path.discrete:
   poly=Polygon(ring[:,axes]);assert poly.is_valid
   res=res.symmetric_difference(poly)
 return res

def slices(*meshes,axis=1):
 vals=np.unique(np.round(np.concatenate([m.vertices[:,axis] for m in meshes]),5))
 return (vals[1:]+vals[:-1])/2
report={'assemblies':{},'static':{},'folding':{},'source_sha256':hashlib.sha256((root/'hexomino_box_v1.scad').read_bytes()).hexdigest()}
parts={}
for name,expected in [('A',1),('B',2)]:
 m=trimesh.load(stls/f'Tray_{name}.stl',force='mesh');ps=sorted(m.split(),key=lambda p:-p.volume)
 assert len(ps)==expected and m.is_watertight and m.is_winding_consistent
 parts[name]=(ps,m)
 report['assemblies'][name]={'watertight':True,'components':len(ps),'volume_cm3':m.volume/1000,'bounds_mm':m.bounds.tolist(),'sha256':hashlib.sha256((stls/f'Tray_{name}.stl').read_bytes()).hexdigest()}
 print(name,'bodies',len(ps),'height',m.extents[2],flush=True)
a=parts['A'][1];b=parts['B'][1];fixed,folded=parts['B'][0];u=flap_pose(folded,0)
bc=box_pose(trimesh.util.concatenate([fixed,u]));bb=board_pose(b)
for mode,second in [('box',bc),('board',bb)]:
 ys=slices(a,second);hits=[]
 for y in ys:
  inter=section(a,y).intersection(section(second,y))
  if inter.area>1e-3:hits.append([float(y),float(inter.area),inter.bounds])
 print(mode,'sections',len(ys),'hits',hits[:8],flush=True)
 assert not hits,'Static interference: inspect before continuing'
 report['static'][mode]={'sections':len(ys),'hits':hits}
field=box(.001,-143.999,191.999,143.999)
for name,m in [('A',a),('B',bb)]:
 upper=trimesh.intersections.slice_mesh_plane(m,[0,0,1],[0,0,4.001],cap=False)
 assert all(Polygon(tri[:,:2]).intersection(field).area<1e-6 for tri in upper.triangles)
print('Vertical insertion corridor clear.',flush=True)
# Measure the printed half-laps and verify that both directions have a hard stop.
sa=section(a,-2).intersection(box(.001,-.001,191.999,4.001))
sb=section(bb,-2).intersection(box(.001,-.001,191.999,4.001))
keys=sorted(sa.geoms,key=lambda p:p.centroid.x)
assert len(keys)==4,'Expected four A alignment tongues'
measured=[]
for key in keys:
 x0,z0,x1,z1=key.bounds
 upper=np.isclose(z1,4)
 ledge=sb.intersection(box(x0,-.001,x1,4.001))
 gap=z0-ledge.bounds[3] if upper else ledge.bounds[1]-z1
 assert np.allclose([x1-x0,z1-z0,ledge.bounds[3]-ledge.bounds[1],gap],[12,2.1,1.7,.2],atol=1e-4)
 measured.append({'center_x_mm':key.centroid.x,'upper':bool(upper),'tongue_mm':z1-z0,'ledge_mm':ledge.bounds[3]-ledge.bounds[1],'gap_mm':gap})
assert sum(row['upper'] for row in measured)==2
stops={}
for direction,travel in [('up',.25),('down',-.25)]:
 contact=sa.intersection(affine_transform(sb,[1,0,0,1,0,travel]))
 assert contact.area>.1,'Missing board vertical stop'
 stops[direction+'_contact_area_mm2']=contact.area
report['board_half_laps']={'section_y_mm':-2,'tongues':measured,'attempted_displacement_mm':.25,**stops}
print('Four half-laps: 2.1 mm tongues, 1.7 mm ledges, bidirectional stops.',flush=True)
def released_flap(m):
 n=m.copy();v=n.vertices;factor=np.maximum(np.clip((26-v[:,0])/22,0,1),np.clip((v[:,0]-166)/22,0,1))
 mask=((v[:,1]>=149.3)&(v[:,2]>=21.99)&(v[:,2]<=26.01)) | ((v[:,1]>=148.5)&(v[:,2]>=18.19)&(v[:,2]<=24.01)&((v[:,0]<4.01)|(v[:,0]>187.99)))
 v[mask,1]+=factor[mask];return n

def rotate2d(shape,angle):
 c=np.cos(np.deg2rad(angle));s=np.sin(np.deg2rad(angle));py=152.4;pz=20
 return affine_transform(shape,[c,s,-s,c,py-c*py-s*pz,pz+s*py-c*pz])
r=released_flap(u);xs=slices(fixed,u,r,axis=0)
secs=[(x,section(fixed,x,0),section(u,x,0),section(r,x,0)) for x in xs]
angles=[0,.25,.5,*range(1,181)]
for angle in angles:
 hits=[]
 for x,env,plain,rel in secs:
  inter=env.intersection(rotate2d(rel if 0<angle<55 else plain,angle))
  if inter.area>1e-3:hits.append([float(x),float(inter.area),inter.bounds])
 if hits:print('fold',angle,'hits',hits[:8],flush=True)
 assert not hits,'Folding interference'
report['folding']['B']={'angles':len(angles),'sections_per_angle':len(xs),'hits':[],'pose':'lid removed'}
print('B folding path clear.',flush=True)

def release_regions(shape,left,right,travel):
 l=shape.intersection(left);r=shape.intersection(right)
 return shape.difference(left.union(right)).union(affine_transform(l,[1,0,0,1,-travel,0])).union(affine_transform(r,[1,0,0,1,travel,0]))
# Lower the lid while offset, then slide it into the rigid end-wall sockets.
offset=bc.copy();offset.apply_translation([0,-6.4,0]);ys=slices(a,offset)
sects=[(y,section(a,y),section(offset,y)) for y in ys]
left=box(-6,25.4,0,31.4);right=box(192,25.4,198,31.4)
for lift in np.arange(0,30.001,.5):
 hits=[]
 for y,sa,sb in sects:
  sa=release_regions(sa,left,right,.8) if 129.9<y<154.4 else sa
  inter=sa.intersection(affine_transform(sb,[1,0,0,1,0,lift]))
  if inter.area>1e-3:hits.append([float(y),float(inter.area),inter.bounds])
 if hits:print('lower lift',lift,'hits',hits[:8],flush=True)
 assert not hits,'Lid lowering interference'
report['case_lowering']={'positions':61,'sections_per_position':len(ys),'clip_release_mm':.8,'collisions':0}
zs=slices(a,bc,axis=2);secs=[(z,section(a,z,2),section(bc,z,2)) for z in zs]
left=box(-6,129.9,0,154.4);right=box(192,129.9,198,154.4)
shifts=np.linspace(-6.4,0,33)
for shift in shifts:
 hits=[]
 for z,sa,sb in secs:
  sa=release_regions(sa,left,right,.8) if 25.4<z<31.4 else sa
  inter=sa.intersection(affine_transform(sb,[1,0,0,1,0,shift]))
  if inter.area>1e-3:hits.append([float(z),float(inter.area),inter.bounds])
 if hits:print('case slide',shift,'hits',hits[:8],flush=True)
 assert not hits,'Lid sliding interference'
for travel in np.linspace(0,.8,9):
 for z,sa,sb in secs:
  sa=release_regions(sa,left,right,travel) if 25.4<z<31.4 else sa
  assert sa.intersection(sb).area<1e-3,'Case clip release interference'
report['case_sliding']={'positions':len(shifts),'release_positions':9,'sections_per_position':len(zs),'collisions':0}
print('Case lowering, sliding and clip release clear.',flush=True)
# Side clips retain the puzzle board; alternating half-laps align the floors.
zs=slices(a,bb,axis=2);secs=[(section(a,z,2),section(bb,z,2)) for z in zs]
left=box(-6,-15,0,10.4);right=box(192,-15,198,10.4)
for shift in np.arange(-24,.001,.5):
 for sa,sb in secs:
  assert release_regions(sa,left,right,1.2).intersection(affine_transform(sb,[1,0,0,1,0,shift])).area<1e-3,'Board sliding interference'
for travel in np.linspace(0,1.2,13):
 for sa,sb in secs:assert release_regions(sa,left,right,travel).intersection(sb).area<1e-3
report['board_joining']={'sliding_positions':49,'release_positions':13,'sections_per_position':len(zs),'collisions':0}
print('Board sliding and clip release clear.',flush=True)
for y in slices(a,bc):
 if .001<y<143.999:
  assert section(a,y).union(section(bc,y)).intersection(box(.001,4.001,191.999,35.999)).area<1e-3
report['storage_envelope_mm']=[192,144,32]
report['vertical_insertion']={'clear_rectangle_mm':[192,288],'obstructions':0,'above_deck_mm':.001}
# Positive stop: a 0.25 mm attempted lift meets the fixed end-wall slot roof.
contact=section(a,146).intersection(affine_transform(section(bc,146),[1,0,0,1,0,.25]))
assert contact.area>.1
report['vertical_stop']={'attempted_lift_mm':.25,'section_y_mm':146,'contact_area_mm2':contact.area}
for name in ['Hinge_Test','Fit_Test']:
 m=trimesh.load(stls/f'{name}.stl',force='mesh')
 assert m.is_watertight and m.is_winding_consistent and len(m.split())==2
 report[name]={'watertight':True,'components':2,'bounds_mm':m.bounds.tolist(),'sha256':hashlib.sha256((stls/f'{name}.stl').read_bytes()).hexdigest()}
report['limits']='Nominal rigid-body samples. Flap catches use a 1 mm tip deflection below 55 degrees; case clips and board clips use approximate translations of 0.8 and 1.2 mm. No elastic stress, slicing, fatigue or loaded strength verification.'
report['numerical_tolerance_mm2']=.001
(root/'validation_results.json').write_text(json.dumps(report,indent=2)+'\n')
print('PASS: all nominal geometry checks.',flush=True)
