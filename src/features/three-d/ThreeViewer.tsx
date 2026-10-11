import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface ViewerVoxel {
  x: number;
  y: number;
  z: number;
  color: string;
}

export interface ViewerPayload {
  mode: 'scene' | 'mesh' | 'voxel' | 'empty';
  code?: string;
  obj?: string;
  glb?: string;
  modelUrl?: string;
  voxels?: ViewerVoxel[];
  size?: number;
}

const THREE_VERSION = '0.160.2';

function escapeForInlineScript(json: string): string {
  return json.replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

function buildViewerHtml(payload: ViewerPayload): string {
  const data = escapeForInlineScript(JSON.stringify(payload));
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  html, body { margin: 0; height: 100%; background: #0b1020; overflow: hidden; }
  #app { position: fixed; inset: 0; }
  #hint { position: fixed; left: 10px; bottom: 8px; color: #8ea0c9; font: 11px/1.4 ui-monospace, monospace; opacity: 0.7; pointer-events: none; }
  #err { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; color: #ffb4b4; font: 12px/1.5 ui-monospace, monospace; padding: 24px; text-align: center; }
</style>
</head>
<body>
<div id="app"></div>
<div id="hint">drag to orbit &middot; scroll to zoom</div>
<div id="err"></div>
<script>window.__DEVFORGE_3D__ = ${data};</script>
<script type="module">
const payload = window.__DEVFORGE_3D__ || { mode: 'empty' };
const errEl = document.getElementById('err');

function fail(message) {
  errEl.style.display = 'flex';
  errEl.textContent = String(message);
  parent.postMessage({ type: '3d-error', message: String(message) }, '*');
}
window.addEventListener('error', (e) => fail(e.message));

let THREE, OrbitControls, GLTFLoader, OBJLoader;
try {
  THREE = await import('https://esm.sh/three@${THREE_VERSION}');
  ({ OrbitControls } = await import('https://esm.sh/three@${THREE_VERSION}/examples/jsm/controls/OrbitControls.js'));
  ({ GLTFLoader } = await import('https://esm.sh/three@${THREE_VERSION}/examples/jsm/loaders/GLTFLoader.js'));
  ({ OBJLoader } = await import('https://esm.sh/three@${THREE_VERSION}/examples/jsm/loaders/OBJLoader.js'));
} catch (e) {
  fail('Unable to load the 3D engine (three.js CDN unreachable). ' + e.message);
  throw e;
}

const container = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(6, 5, 8);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.7);
keyLight.position.set(8, 12, 8);
scene.add(keyLight);
const fillLight = new THREE.PointLight(0x4f8cff, 1.6, 120);
fillLight.position.set(-8, 6, -6);
scene.add(fillLight);
scene.add(new THREE.HemisphereLight(0x8fb0ff, 0x201a30, 0.5));

const grid = new THREE.GridHelper(40, 40, 0x2a3350, 0x1a2136);
grid.position.y = -0.001;
scene.add(grid);

let built = null;

function frameCamera() {
  const box = new THREE.Box3();
  let has = false;
  scene.traverse((obj) => {
    if (obj.isMesh || obj.isPoints || obj.isLine) {
      box.expandByObject(obj);
      has = true;
    }
  });
  if (!has) return;
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const radius = Math.max(sphere.radius, 0.5);
  const dist = radius / Math.sin((camera.fov * Math.PI) / 180 / 2) * 1.25;
  const dir = new THREE.Vector3(0.8, 0.6, 1).normalize();
  camera.position.copy(sphere.center).add(dir.multiplyScalar(dist));
  camera.near = Math.max(dist / 100, 0.01);
  camera.far = dist * 100;
  camera.updateProjectionMatrix();
  controls.target.copy(sphere.center);
  controls.update();
}

async function buildSceneCode(code) {
  const cleaned = code.replace(/export\\s*\\{\\s*buildScene\\s*\\}\\s*;?\\s*$/m, '');
  const wrapper = "import * as THREE from 'https://esm.sh/three@${THREE_VERSION}';\\n" + cleaned + "\\nexport { buildScene };\\n";
  const url = URL.createObjectURL(new Blob([wrapper], { type: 'text/javascript' }));
  const mod = await import(url);
  URL.revokeObjectURL(url);
  if (typeof mod.buildScene !== 'function') throw new Error('Scene code did not export buildScene().');
  built = mod.buildScene(scene, camera, renderer);
}

function buildVoxels(voxels) {
  const byColor = new Map();
  const size = payload.size || 16;
  const c = (size - 1) / 2;
  for (const v of voxels) {
    if (!byColor.has(v.color)) byColor.set(v.color, []);
    byColor.get(v.color).push(v);
  }
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const dummy = new THREE.Object3D();
  for (const [color, list] of byColor) {
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), metalness: 0.1, roughness: 0.75 });
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((v, i) => {
      dummy.position.set(v.x - c, v.y - c, v.z - c);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
  }
}

function addLoadedObject(obj) {
  obj.traverse((child) => {
    if (child.isMesh && !child.material) {
      child.material = new THREE.MeshStandardMaterial({ color: 0x9aa6b2, metalness: 0.2, roughness: 0.6 });
    }
  });
  scene.add(obj);
}

function parseOBJ(text) {
  const loader = new OBJLoader();
  const obj = loader.parse(text);
  obj.traverse((child) => {
    if (child.isMesh) {
      child.material = new THREE.MeshStandardMaterial({ color: 0x9db4ff, metalness: 0.25, roughness: 0.55 });
    }
  });
  return obj;
}

try {
  if (payload.mode === 'scene' && payload.code) {
    await buildSceneCode(payload.code);
  } else if (payload.mode === 'voxel' && payload.voxels) {
    buildVoxels(payload.voxels);
  } else if (payload.mode === 'mesh' && payload.obj) {
    addLoadedObject(parseOBJ(payload.obj));
  } else if (payload.mode === 'mesh' && (payload.glb || payload.modelUrl)) {
    const loader = new GLTFLoader();
    await new Promise((resolve, reject) => {
      const onLoad = (gltf) => { addLoadedObject(gltf.scene); resolve(); };
      if (payload.glb) {
        const binary = atob(payload.glb);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        loader.parse(bytes.buffer, '', onLoad, reject);
      } else {
        loader.load(payload.modelUrl, onLoad, undefined, reject);
      }
    });
  }
  frameCamera();
  parent.postMessage({ type: '3d-ready', mode: payload.mode }, '*');
} catch (e) {
  fail(e && e.message ? e.message : e);
}

let start = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const t = (performance.now() - start) / 1000;
  if (built && typeof built.update === 'function') built.update(t);
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
</script>
</body>
</html>`;
}

interface ThreeViewerProps {
  payload: ViewerPayload;
  className?: string;
}

export function ThreeViewer({ payload, className }: ThreeViewerProps) {
  const srcDoc = useMemo(() => buildViewerHtml(payload), [payload]);
  const [error, setError] = useState<string | null>(null);
  const frameKey = useRef(0);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.data?.type === '3d-error') setError(String(event.data.message));
      if (event.data?.type === '3d-ready') setError(null);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    setError(null);
    frameKey.current += 1;
  }, [srcDoc]);

  return (
    <div className={`relative w-full h-full bg-[#0b1020] ${className || ''}`}>
      <iframe
        key={frameKey.current}
        title="DevForge 3D Viewer"
        srcDoc={srcDoc}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin"
      />
      {error && (
        <div className="absolute bottom-2 left-2 right-2 text-[10px] font-mono text-rose-300 bg-rose-950/70 border border-rose-800/50 rounded px-2 py-1">
          {error}
        </div>
      )}
    </div>
  );
}
