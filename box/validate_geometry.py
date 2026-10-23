"""Validate the folding box STL files. Requires numpy, trimesh, shapely, scipy."""
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
for n in ['A','B']:
 m=trimesh.load(stls/f'Tray_{n}.stl',force='mesh');ps=sorted(m.split(),key=lambda p:-p.volume)
 assert len(ps)==2 and m.is_watertight and m.is_winding_consistent
 f,p=ps;u=flap_pose(p,0);parts[n]=(f,p,u,m)
 report['assemblies'][n]={'watertight':True,'components':2,'height_mm':m.extents[2],'volume_cm3':m.volume/1000,'bounds_mm':m.bounds.tolist(),'sha256':hashlib.sha256((stls/f'Tray_{n}.stl').read_bytes()).hexdigest()}
 print(n,'separate captive bodies',len(ps),'height',m.extents[2],flush=True)
a=parts['A'][3];b=parts['B'][3]
ac=trimesh.util.concatenate([parts['A'][0],parts['A'][2]])
bc=box_pose(trimesh.util.concatenate([parts['B'][0],parts['B'][2]]))
bb=board_pose(b)
for mode,first,second in [('box',ac,bc),('board',a,bb)]:
 hits=[];ys=slices(first,second)
 for y in ys:
  inter=section(first,y).intersection(section(second,y))
  if inter.area>1e-3:hits.append([float(y),float(inter.area),inter.bounds])
 print(mode,'sections',len(ys),'hits',hits[:8],flush=True)
 report['static'][mode]={'sections':len(ys),'hits':hits}
 if hits:raise SystemExit('Static interference: inspect before continuing')
# Entire insertion corridor is clear, irrespective of the chosen piece or its orientation.
field=box(.001,-143.999,191.999,143.999)
for name,m in [('A',a),('B',bb)]:
 upper=trimesh.intersections.slice_mesh_plane(m,[0,0,1],[0,0,4.001],cap=False)
 assert all(Polygon(tri[:,:2]).intersection(field).area<1e-6 for tri in upper.triangles)
print('Vertical insertion corridor clear.',flush=True)

def released(m):
 n=m.copy();v=n.vertices;factor=np.maximum(np.clip((26-v[:,0])/22,0,1),np.clip((v[:,0]-166)/22,0,1))
 mask=((v[:,1]>=149.3)&(v[:,2]>=21.99)&(v[:,2]<=26.01)) | ((v[:,1]>=148.5)&(v[:,2]>=18.19)&(v[:,2]<=24.01)&((v[:,0]<4.01)|(v[:,0]>187.99)))
 v[mask,1]+=1.0*factor[mask];return n

def rotate2d(shape,angle):
 c=np.cos(np.deg2rad(angle));s=np.sin(np.deg2rad(angle));py=152.4;pz=20
 return affine_transform(shape,[c,s,-s,c,py-c*py-s*pz,pz+s*py-c*pz])
for n in ['A','B']:
 fixed,folded,u,_=parts[n]
 other=box_pose(trimesh.util.concatenate([parts['B' if n=='A' else 'A'][0],parts['B' if n=='A' else 'A'][2]]))
 environment=trimesh.util.concatenate([fixed,other]);r=released(u)
 xs=slices(environment,u,r,axis=0)
 secs=[(x,section(fixed,x,0).union(section(other,x,0)),section(u,x,0),section(r,x,0)) for x in xs]
 angles=[0,.25,.5,*range(1,181)]
 for angle in angles:
  hits=[]
  for x,env,plain,rel in secs:
   inter=env.intersection(rotate2d(rel if angle<55 and angle>0 else plain,angle))
   if inter.area>1e-3:hits.append([float(x),float(inter.area),inter.bounds])
  if hits:print(n,'fold angle',angle,'hits',hits[:5],flush=True)
  if hits:
   report['folding'][n]={'angle':angle,'hits':hits};(root/'validation_results.json').write_text(json.dumps(report,indent=2))
   raise SystemExit('Folding interference: inspect before continuing')
 report['folding'][n]={'angles':len(angles),'sections_per_angle':len(xs),'hits':[]}
# Stack the two trays with both end walls folded out, then lock the end walls.
bfold=box_pose(b)
ys=slices(a,bfold)
sects=[(section(a,y),section(bfold,y)) for y in ys]
for lift in np.arange(0,30.001,.5):
 for sa,sb in sects:
  assert sa.intersection(affine_transform(sb,[1,0,0,1,0,lift])).area<1e-3
report['stacking']={'lift_positions':61,'sections_per_position':len(ys),'collisions':0}
# Board clips are represented by a translated tip region, not a stress model.
zs=slices(a,bb,axis=2)
secs=[(section(a,z,2),section(bb,z,2)) for z in zs]
left=box(-6,-15,0,10.4);right=box(192,-15,198,10.4)
def clip_release(shape,travel):
 l=shape.intersection(left);r=shape.intersection(right)
 return shape.difference(left.union(right)).union(affine_transform(l,[1,0,0,1,-travel,0])).union(affine_transform(r,[1,0,0,1,travel,0]))
for shift in np.arange(-24,0.001,.5):
 for sa,sb in secs:
  assert clip_release(sa,1.2).intersection(affine_transform(sb,[1,0,0,1,0,shift])).area<1e-3
for travel in np.arange(0,1.201,.1):
 for sa,sb in secs:assert clip_release(sa,travel).intersection(sb).area<1e-3
report['board_joining']={'sliding_positions':49,'clip_release_positions':13,'sections_per_position':len(zs),'collisions':0}
# Ensure the full rectangular payload remains clear in closed mode.
for y in slices(ac,bc):
 if .001<y<143.999:
  assert section(ac,y).union(section(bc,y)).intersection(box(.001,4.001,191.999,35.999)).area<1e-3
report['storage_envelope_mm']=[192,144,32]
report['vertical_insertion']={'clear_rectangle_mm':[192,288],'above_deck_mm':.001,'obstructions':0}
coupon=trimesh.load(stls/'Hinge_Test.stl',force='mesh')
assert coupon.is_watertight and coupon.is_winding_consistent and len(coupon.split())==2
report['coupon']={'watertight':True,'components':2,'bounds_mm':coupon.bounds.tolist(),'sha256':hashlib.sha256((stls/'Hinge_Test.stl').read_bytes()).hexdigest()}
report['limits']='Nominal rigid-body samples. End-wall catches use an approximate 1 mm Y deflection below 55 degrees; board clips use an approximate 1.2 mm X translation. No elastic stress, slicing, fatigue or load verification.'
report['numerical_tolerance_mm2']=.001
(root/'validation_results.json').write_text(json.dumps(report,indent=2)+'\n')
print('PASS: 183 fold angles per wall, stacking, board joining, payload and insertion corridor.',flush=True)
