import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { BOARDS, CELL_MM, colorFor, orientationsFor, placementCells, cellIndex } from './puzzle.js';

const geometries = new Map();
function loadGeometry(shape) {
  if (!geometries.has(shape.id)) geometries.set(shape.id, new STLLoader().loadAsync(`./STL_37/${shape.name}.stl`).then(g => {
    g.scale(1 / CELL_MM, 1 / CELL_MM, 1 / CELL_MM);
    g.computeBoundingSphere();
    return g;
  }).catch(error => { geometries.delete(shape.id); throw error; }));
  return geometries.get(shape.id);
}

const thumbnails = new Map();
let thumbnailRenderer, thumbnailScene, thumbnailCamera;
export async function pieceThumbnail(shape) {
  if (!thumbnails.has(shape.id)) thumbnails.set(shape.id, loadGeometry(shape).then(geometry => {
    if (!thumbnailRenderer) {
      thumbnailRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      thumbnailRenderer.setSize(180, 120);
      thumbnailScene = new THREE.Scene();
      thumbnailScene.add(new THREE.HemisphereLight('#ffffff', '#b9c1ab', 2.3));
      const light = new THREE.DirectionalLight('#ffffff', 3.2);
      light.position.set(-4, -6, 12); thumbnailScene.add(light);
      thumbnailCamera = new THREE.OrthographicCamera(-3, 3, 2, -2, .1, 100);
      thumbnailCamera.up.set(0, 1, 0);
    }
    geometry.computeBoundingBox();
    const center = geometry.boundingBox.getCenter(new THREE.Vector3());
    const size = geometry.boundingBox.getSize(new THREE.Vector3());
    const radius = Math.max(size.x / 1.5, size.y) * .58 + .3;
    thumbnailCamera.left = -radius * 1.5; thumbnailCamera.right = radius * 1.5;
    thumbnailCamera.top = radius; thumbnailCamera.bottom = -radius;
    thumbnailCamera.position.copy(center).add(new THREE.Vector3(0, 0, 10));
    thumbnailCamera.lookAt(center); thumbnailCamera.updateProjectionMatrix();
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: colorFor(shape.id), roughness: .6, metalness: .06 }));
    thumbnailScene.add(mesh); thumbnailRenderer.render(thumbnailScene, thumbnailCamera);
    const url = thumbnailRenderer.domElement.toDataURL('image/png');
    thumbnailScene.remove(mesh); mesh.material.dispose();
    return url;
  }).catch(error => { thumbnails.delete(shape.id); throw error; }));
  return thumbnails.get(shape.id);
}

export class PuzzleViewer {
  constructor(container, shapes, callbacks, { mode = 'cube', planar = false, layerView = false } = {}) {
    this.container = container;
    this.shapes = shapes;
    this.callbacks = callbacks;
    this.mode = mode;
    this.dims = BOARDS[mode];
    this.planar = planar;
    this.layerView = layerView;
    this.owners = new Map();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#fafbf8');
    this.camera = planar ? new THREE.OrthographicCamera(0, this.dims[0], this.dims[1], 0, .1, 100) : new THREE.PerspectiveCamera(34, 1, 0.1, 300);
    this.camera.up.set(0, planar ? 1 : 0, planar ? 0 : 1);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.localClippingEnabled = true;
    container.append(this.renderer.domElement);
    this.controls = planar ? null : new OrbitControls(this.camera, this.renderer.domElement);
    if (this.controls) {
      this.controls.enableDamping = true;
      this.controls.minDistance = 5;
      this.controls.maxDistance = 35;
    }
    this.resetCamera();
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#b9c1ab', 2.3));
    const sun = new THREE.DirectionalLight('#ffffff', 3.2);
    sun.position.set(-4, -6, 12);
    this.scene.add(sun);
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.cutPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 6);
    this.bottomPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this.ray = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.layer = 0;
    this.cut = 6;
    this.explode = 0;
    this.version = 0;
    this.selected = null;
    const border = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(...this.dims)), new THREE.LineBasicMaterial({ color: '#c0c8b6', transparent: true, opacity: 0.8 }));
    border.position.set(...this.dims.map(v => v / 2));
    this.scene.add(border);
    const gridSize = Math.max(...this.dims);
    this.grid = new THREE.GridHelper(gridSize, gridSize, '#aebba1', '#d6decd');
    this.grid.rotation.x = Math.PI / 2;
    this.grid.position.set(this.dims[0] / 2, this.dims[1] / 2, -0.02);
    this.scene.add(this.grid);
    this.editGrid = new THREE.GridHelper(6, 6, '#df623e', '#df623e');
    this.editGrid.rotation.x = Math.PI / 2;
    this.editGrid.position.set(3, 3, 0.005);
    this.editGrid.material.transparent = true;
    this.editGrid.material.opacity = 0.15;
    this.scene.add(this.editGrid);
    const canvas = this.renderer.domElement;
    canvas.setAttribute('aria-label', planar ? `${this.dims[0]} 列 ${this.dims[1]} 行 STL 拼图俯视图；可拖动真实拼块` : '可旋转的 STL 立体拼图；拖动拼块移动，拖动空白处旋转视角');
    canvas.addEventListener('pointerdown', e => this.pointerDown(e), true);
    canvas.addEventListener('pointermove', e => this.pointerMove(e));
    canvas.addEventListener('pointerup', e => this.pointerUp(e));
    canvas.addEventListener('pointercancel', () => this.cancelDrag());
    canvas.addEventListener('pointerleave', () => { if (!this.drag) callbacks.preview(null); });
    canvas.addEventListener('dragover', e => { e.preventDefault(); const origin = this.dropOrigin(e); if (origin) callbacks.preview(origin); });
    canvas.addEventListener('dragleave', () => callbacks.preview(null));
    canvas.addEventListener('drop', e => { e.preventDefault(); const origin = this.dropOrigin(e); if (origin) callbacks.place(origin); });
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    this.renderer.setAnimationLoop(() => {
      if (container.hidden) return;
      this.controls?.update();
      this.renderer.render(this.scene, this.camera);
    });
  }

  resetCamera() {
    if (this.planar) {
      this.camera.position.set(0, 0, 40);
      this.camera.lookAt(0, 0, 0);
      return;
    }
    this.controls.target.set(3, 3, 2.5);
    const scale = 1 + (this.explode ?? 0) * .016;
    this.controls.maxDistance = 35 * scale;
    this.camera.position.set(11, -12, 11).sub(this.controls.target).multiplyScalar(scale).add(this.controls.target);
    this.controls.update();
  }

  resize() {
    const { width, height } = this.container.getBoundingClientRect();
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    if (!this.planar) this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  setRay(event) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set((event.clientX - r.left) / r.width * 2 - 1, -(event.clientY - r.top) / r.height * 2 + 1);
    this.ray.setFromCamera(this.pointer, this.camera);
  }

  dropOrigin(event, z = this.layer, offset = null) {
    this.setRay(event);
    const hit = this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -z), new THREE.Vector3());
    if (!hit) return null;
    const snap = offset ? Math.round : Math.floor;
    return [snap(hit.x - (offset?.[0] ?? 0) + 0.001), snap(hit.y - (offset?.[1] ?? 0) + 0.001), z];
  }

  pointerDown(event) {
    if (event.button !== 0 || this.explode || this.callbacks.busy()) return;
    this.setRay(event);
    const hit = this.ray.intersectObjects(this.group.children).find(h => !h.object.userData.ghost && h.point.z <= this.cut + 0.001 && (!this.layerView || h.point.z >= this.layer - .001));
    const origin = this.planar ? this.dropOrigin(event) : null;
    const owner = origin && origin.every((v, a) => v >= 0 && v < this.dims[a]) ? this.owners.get(cellIndex(origin, this.dims)) : null;
    const placement = this.planar ? owner : hit?.object.userData.placement;
    if (!placement) {
      if (this.planar && origin) this.callbacks.place(origin);
      return;
    }
    this.callbacks.pick(placement.piece);
    if (this.controls) this.controls.enabled = false;
    event.stopImmediatePropagation();
    this.renderer.domElement.setPointerCapture(event.pointerId);
    const dragZ = this.layerView ? this.layer : placement.origin[2];
    const projected = this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -dragZ), new THREE.Vector3());
    this.drag = { id: event.pointerId, start: [event.clientX, event.clientY], z: dragZ, pieceZ: placement.origin[2], offset: projected ? [projected.x - placement.origin[0], projected.y - placement.origin[1]] : [0, 0], moved: false };
  }

  pointerMove(event) {
    if (!this.drag) {
      if (this.planar && !this.callbacks.busy() && this.callbacks.canPreview()) this.callbacks.preview(this.dropOrigin(event));
      return;
    }
    if (Math.hypot(event.clientX - this.drag.start[0], event.clientY - this.drag.start[1]) < 4 && !this.drag.moved) return;
    this.drag.moved = true;
    const origin = this.dropOrigin(event, this.drag.z, this.drag.offset);
    if (origin) { origin[2] = this.drag.pieceZ; this.callbacks.preview(origin); }
  }

  pointerUp(event) {
    if (!this.drag) return;
    if (this.drag.moved) {
      const origin = this.dropOrigin(event, this.drag.z, this.drag.offset);
      if (origin) { origin[2] = this.drag.pieceZ; this.callbacks.place(origin); }
    }
    this.cancelDrag();
  }

  cancelDrag() {
    this.drag = null;
    if (this.controls) this.controls.enabled = true;
    this.callbacks.preview(null);
  }

  async geometry(shape) {
    return loadGeometry(shape);
  }

  async update(placements, selected, ghost, options = {}) {
    const version = ++this.version;
    this.selected = selected;
    this.layer = this.mode === 'flat' ? 0 : (options.layer ?? this.layer);
    this.cut = this.mode === 'flat' ? 1 : this.layerView ? this.layer + 1 : (options.cut ?? this.cut);
    const previousExplode = this.explode;
    this.explode = this.planar ? 0 : (options.explode ?? this.explode);
    if (this.controls && this.explode !== previousExplode) {
      const scale = 1 + this.explode * .016;
      this.controls.maxDistance = 35 * scale;
      this.camera.position.sub(this.controls.target).multiplyScalar(scale / (1 + previousExplode * .016)).add(this.controls.target);
      this.controls.update();
    }
    this.cutPlane.constant = this.cut + .00001;
    this.bottomPlane.constant = -this.layer + .00001;
    this.grid.position.z = this.layerView ? this.layer - .02 : -.02;
    this.owners = new Map();
    for (const p of placements) for (const c of placementCells(p, this.shapes, this.mode)) this.owners.set(cellIndex(c, this.dims), p);
    this.editGrid.position.z = this.layer + 0.005;
    this.editGrid.visible = !this.explode && !this.planar;
    const entries = placements.filter(p => !ghost || p.piece !== ghost.piece).map(p => ({ ...p, ghost: false }));
    if (ghost) entries.push({ ...ghost, ghost: true });
    const loaded = await Promise.all(entries.map(async p => {
      const shape = this.shapes.find(s => s.id === p.piece);
      return { p, shape, geometry: await this.geometry(shape) };
    }));
    if (version !== this.version) return;
    for (const child of [...this.group.children]) { this.group.remove(child); child.material.dispose(); }
    for (const { p, shape, geometry } of loaded) {
      const o = orientationsFor(shape, 'cube').find(o => o.key === p.orientation);
      const displacement = p.origin.map((v, a) => p.ghost ? 0 : (v + o.size[a] / 2 - 3) * this.explode * .016);
      const cutPlane = this.cutPlane.clone();
      cutPlane.constant += displacement[2];
      const material = new THREE.MeshStandardMaterial({
        color: p.ghost ? (p.valid ? '#81ae86' : '#dd6a57') : colorFor(p.piece),
        roughness: 0.6, metalness: 0.06,
        transparent: p.ghost, opacity: p.ghost ? 0.65 : 1, depthWrite: !p.ghost,
        clippingPlanes: this.layerView ? [cutPlane, this.bottomPlane] : [cutPlane], side: THREE.FrontSide,
        emissive: p.piece === selected ? '#463520' : '#000000', emissiveIntensity: p.piece === selected ? 0.18 : 0,
      });
      const mesh = new THREE.Mesh(geometry, material);
      const m = o.matrix;
      const t = p.origin.map((v, a) => v + o.offset[a] + displacement[a]);
      mesh.matrixAutoUpdate = false;
      mesh.matrix.set(m[0][0], m[0][1], m[0][2], t[0], m[1][0], m[1][1], m[1][2], t[1], m[2][0], m[2][1], m[2][2], t[2], 0, 0, 0, 1);
      mesh.userData = { placement: p, ghost: p.ghost };
      this.group.add(mesh);
    }
  }
}
