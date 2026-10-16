import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { TrackPoint } from '../../types/f1';
import { SECTOR_COLORS } from './trackConstants';

export interface Car3D {
  abbr: string;
  color: string;
}

interface Props {
  points: TrackPoint[];
  cars: Car3D[];
}

const TARGET_SIZE = 20;   // world units the longest track axis maps to
const TUBE_RADIUS = 0.16;

export function Track3D({ points, cars }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || points.length < 4) return;

    let width = mount.clientWidth;
    let height = mount.clientHeight;
    if (width === 0 || height === 0) return;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x06060b, 1);
    mount.appendChild(renderer.domElement);

    // ── Scene & camera ──
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x06060b, 0.018);

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 1000);
    camera.position.set(0, 19, 13);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 10;
    controls.maxDistance = 40;
    controls.maxPolarAngle = Math.PI / 2.05; // keep above the ground
    controls.target.set(0, 0, 0);

    // ── Lights ──
    scene.add(new THREE.AmbientLight(0x556070, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(8, 20, 10);
    scene.add(dir);

    // ── Normalize track to centered XZ plane ──
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const scale = TARGET_SIZE / Math.max(maxX - minX, maxY - minY);

    const toVec = (p: TrackPoint) =>
      new THREE.Vector3((p.x - midX) * scale, 0, -(p.y - midY) * scale);

    const vecs = points.map(toVec);
    const fullCurve = new THREE.CatmullRomCurve3(vecs, true, 'catmullrom', 0.5);

    const trackGroup = new THREE.Group();
    scene.add(trackGroup);

    // ── Dark "asphalt" ribbon laid flat under the neon line for grounding/depth ──
    const baseGeo = new THREE.TubeGeometry(fullCurve, vecs.length * 2, TUBE_RADIUS * 1.7, 4, true);
    baseGeo.scale(1, 0.18, 1); // flatten into a road-like strip on the ground
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x0f0f18, metalness: 0.1, roughness: 0.95 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -TUBE_RADIUS * 0.9;
    trackGroup.add(baseMesh);

    // ── Three glowing sector tubes (the visible track) ──
    const n = vecs.length;
    const bounds = [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1];
    for (let s = 0; s < 3; s++) {
      const seg = vecs.slice(bounds[s], bounds[s + 1] + 1);
      if (seg.length < 2) continue;
      const curve = new THREE.CatmullRomCurve3(seg, false, 'catmullrom', 0.5);
      const geo = new THREE.TubeGeometry(curve, seg.length * 3, TUBE_RADIUS, 12, false);
      const col = new THREE.Color(SECTOR_COLORS[s]);
      const mat = new THREE.MeshStandardMaterial({
        color: col,
        emissive: col,
        emissiveIntensity: 2.2,
        metalness: 0.4,
        roughness: 0.3,
        toneMapped: false,
      });
      trackGroup.add(new THREE.Mesh(geo, mat));
    }

    // ── Start / finish marker ──
    const sfPos = fullCurve.getPointAt(0);
    const sfTan = fullCurve.getTangentAt(0);
    const sf = new THREE.Mesh(
      new THREE.BoxGeometry(TUBE_RADIUS * 5, 0.04, 0.25),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.2, toneMapped: false })
    );
    sf.position.copy(sfPos).setY(TUBE_RADIUS + 0.02);
    sf.lookAt(sfPos.clone().add(sfTan));
    trackGroup.add(sf);

    // ── Cars: small markers spaced by running order around the lap ──
    const carGeo = new THREE.SphereGeometry(0.14, 12, 12);
    cars.forEach((car, i) => {
      const t = cars.length > 0 ? (i / cars.length) % 1 : 0;
      const pos = fullCurve.getPointAt(t);
      const col = new THREE.Color(car.color);
      const marker = new THREE.Mesh(
        carGeo,
        new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.9, toneMapped: false })
      );
      marker.position.copy(pos).setY(TUBE_RADIUS + 0.1);
      trackGroup.add(marker);
    });

    // ── Faint ground grid for depth reference ──
    const grid = new THREE.GridHelper(TARGET_SIZE * 2.2, 26, 0x2a2a40, 0x18182a);
    (grid.material as THREE.Material).opacity = 0.25;
    (grid.material as THREE.Material).transparent = true;
    grid.position.y = -0.6;
    scene.add(grid);

    // ── Bloom for the neon glow ──
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.55, 0.4, 0.25);
    composer.addPass(bloom);

    // ── Animate ──
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      composer.render();
    };
    animate();

    // ── Resize ──
    const onResize = () => {
      if (!mount) return;
      width = mount.clientWidth;
      height = mount.clientHeight;
      if (width === 0 || height === 0) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer.setSize(width, height);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    // ── Cleanup ──
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      composer.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const m = obj.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m.dispose();
        }
      });
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [points, cars]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
}
