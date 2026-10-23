"""Validate exported V2 STL geometry. Requires numpy, trimesh, shapely, scipy."""
import json,hashlib
from pathlib import Path
import numpy as np
import trimesh
from shapely.geometry import Polygon,GeometryCollection,box,Point
from shapely.affinity import affine_transform,translate
root=Path(__file__).resolve().parent
stls=root/'STL'
a=trimesh.load(stls/'Tray_A.stl',force='mesh');b=trimesh.load(stls/'Tray_B.stl',force='mesh')
def tf(m,rot,offset):
 n=m.copy();t=np.eye(4);t[:3,:3]=rot;t[:3,3]=offset;n.apply_transform(t);return n
closed=tf(b,np.diag([1,-1,-1]),[0,152,41.2])
board=tf(b,np.diag([-1,-1,1]),[192,-3.4,0])
def section(mesh,y):
 path=mesh.section(plane_origin=[0,y,0],plane_normal=[0,1,0]);res=GeometryCollection()
 if path:
  for ring in path.discrete:
   p=Polygon(ring[:,[0,2]])
   assert p.is_valid
   res=res.symmetric_difference(p)
 return res

def ys_between(*meshes):
 vals=np.unique(np.round(np.concatenate([m.vertices[:,1] for m in meshes]),6))
 return (vals[1:]+vals[:-1])/2
report={'parts':{},'static':{},'opening':{},'vertical_insertion':{}}
for name,m in [('A',a),('B',b)]:
 print(name,'watertight',m.is_watertight,'components',len(m.split()),'volume',m.volume/1000,'bounds',m.bounds.tolist(),flush=True)
 assert m.is_watertight and m.is_winding_consistent and len(m.split())==1
 report['parts'][name]={'watertight':True,'components':1,'volume_cm3':m.volume/1000,'bounds_mm':m.bounds.tolist(),'triangles':len(m.faces),'sha256':hashlib.sha256((stls/f'Tray_{name}.stl').read_bytes()).hexdigest()}
for mode,other in [('closed',closed),('board',board)]:
 ys=ys_between(a,other);hits=[]
 for y in ys:
  area=section(a,y).intersection(section(other,y)).area
  if area>1e-3:hits.append([float(y),area])
 print(mode,'sections',len(ys),'hits',hits[:20],flush=True)
 report['static'][mode]={'sections':len(ys),'collisions':hits}
 if hits:raise SystemExit('Static collision: pause and inspect')
# Any material above deck inside the full board rectangle obstructs a drop.
field=box(.001,-143.999,191.999,143.999)
for name,m in [('A',a),('B_in_board',board)]:
 clipped=trimesh.intersections.slice_mesh_plane(m,[0,0,1],[0,0,4.001],cap=False)
 hits=[]
 for i,tri in enumerate(clipped.triangles):
  poly=Polygon(tri[:,:2])
  if poly.area>1e-10:
   area=poly.intersection(field).area
   if area>1e-6:hits.append([i,area])
 print('drop',name,'hits',hits[:10],flush=True)
 report['vertical_insertion'][name]={'obstructing_triangles':len(hits),'clear_rectangle_mm':[192,288],'above_deck_mm':.001}
 assert not hits
ys=ys_between(a,closed);sects=[(y,section(a,y),section(closed,y)) for y in ys]
# The release motion is an approximation of the latch tip deflection, not a stress test.
release=box(193,33.9,198,36.1)
def released(sa,y):
 if any(q+19.8<y<q+24.2 for q in [36,96]):
  tip=sa.intersection(release);return sa.difference(release).union(translate(tip,xoff=.8))
 return sa
poses=[]
for dz in [*np.arange(0,16.4,.25),16.4]:poses.append(('lift',0,dz,0,dz<2.1))
for dx in np.arange(-.1,-1.201,-.1):poses.append(('shift',dx,16.4,0,False))
for dz in np.arange(16.3,15.799,-.1):poses.append(('seat',-1.2,dz,0,False))
for angle in [.1,.25,*np.arange(.5,90.001,.5)]:poses.append(('pivot',-1.2,15.8,angle,False))
for stage,dx,dz,angle,rel in poses:
 r=np.radians(angle);c=np.cos(r);s=np.sin(r)
 # Translate to the raised hinge seat, then rotate around it.
 ox=-13.6+13.6*c+37*s;oz=37+13.6*s-37*c
 hits=[]
 for y,sa,sb in sects:
  moving=affine_transform(translate(sb,xoff=dx,yoff=dz),[c,-s,s,c,ox,oz])
  area=(released(sa,y) if rel else sa).intersection(moving).area
  if area>1e-3:hits.append([float(y),float(area)])
 label=f'{stage} x={dx:g} z={dz:g} angle={angle:g}'
 if hits:print(label,'hits',hits[:6],flush=True)
 report['opening'][label]={'sections':len(ys),'collisions':hits}
 if hits:
  (root/'validation_results.json').write_text(json.dumps(report,indent=2)+'\n')
  raise SystemExit('Opening collision: pause and inspect')
# Check the whole rectangular storage envelope, including the closed lid.
payload=box(.001,4.001,191.999,35.999)
hits=[]
for y,sa,sb in sects:
 if .001<y<143.999:
  area=sa.union(sb).intersection(payload).area
  if area>1e-3:hits.append([float(y),float(area)])
assert not hits
report['storage_envelope']={'clear_mm':[192,144,32],'collisions':hits}
# Metal pin and the slot's full center path, with the nominal 0.3 mm radial gap.
sa=section(a,33)
path=[(-12.4,z) for z in np.arange(21.2,37.601,.1)]
path += [(x,37.6) for x in np.arange(-12.4,-13.601,-.1)]
path += [(-13.6,z) for z in np.arange(37.6,36.999,-.1)]
assert all(sa.intersection(Point(x,z).buffer(1.5)).area<1e-5 for x,z in path)
assert section(closed,40).intersection(Point(-12.4,21.2).buffer(1.5)).area<1e-5
report['hinge_pin']={'diameter_mm':3,'path_samples':len(path),'collisions':0}
report['opening_pose_count']=len(poses)
report['numerical_tolerance']={'section_overlap_mm2':.001,'projection_overlap_mm2':.000001}
report['limits']='Nominal rigid-body samples; latch release is an approximate tip translation. No elastic stress, print tolerance, fatigue or load analysis.'
print('All checks passed:',len(poses),'opening poses;',len(sects),'sections per pose.',flush=True)
report['total_solid_volume_cm3']=sum(v['volume_cm3'] for v in report['parts'].values())
report['source_sha256']=hashlib.sha256((root/'hexomino_box_v2.scad').read_bytes()).hexdigest()
(root/'validation_results.json').write_text(json.dumps(report,indent=2)+'\n')
