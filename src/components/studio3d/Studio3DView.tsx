/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useStudio } from '../../context/StudioContext';
import { translations } from '../../services/i18n';
import { soundSynth } from '../../services/audio/synth';
import { MeshPrimitiveType } from '../../types';
import { CATEGORIZED_3D_ASSETS, CategorizedAsset } from '../../services/assets/assetLibrary';
import {
  Wrench,
  Download,
  Upload,
  Play,
  Pause,
  Plus,
  RotateCcw,
  Move,
  RotateCw,
  Maximize2,
  Minimize2,
  Compass,
  Sparkles,
  Split,
  Eye,
  Sliders,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Layers,
  Check,
  Zap,
  Shield,
  Activity,
  Box,
  FolderOpen,
  Sun,
  Moon,
  Smartphone,
  Cpu
} from 'lucide-react';

export type InteractionMode = 'orbit' | 'translate' | 'rotate' | 'scale' | 'sculpt' | 'bones';

export type SculptBrush =
  | 'inflate'
  | 'deflate'
  | 'clay'
  | 'smooth'
  | 'flatten'
  | 'pinch'
  | 'grab'
  | 'crease'
  | 'snake'
  | 'twist';

export type GraphicsPreset = 'low' | 'medium' | 'ultra';

export interface Scene3DStateJSON {
  version: string;
  timestamp: number;
  primitive: MeshPrimitiveType;
  pos: [number, number, number];
  rot: [number, number, number];
  scale: number;
  material: {
    color: string;
    roughness: number;
    metalness: number;
    wireframe: boolean;
  };
  lighting: {
    dirIntensity: number;
    shadows: boolean;
  };
  keyframes: { time: number; rotY: number; posY: number; scale: number }[];
}

export const Studio3DView: React.FC = () => {
  const { language, activeTextureUrl, addLog, fps, setFps } = useStudio();
  const t = translations[language];

  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const currentMeshRef = useRef<THREE.Mesh | THREE.Group | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Primitive selection
  const [primitive, setPrimitive] = useState<MeshPrimitiveType>('cube');

  // Interaction Mode
  const [mode, setMode] = useState<InteractionMode>('orbit');

  // Sculpting tools
  const [sculptBrush, setSculptBrush] = useState<SculptBrush>('inflate');
  const [brushRadius, setBrushRadius] = useState<number>(0.65);
  const [brushStrength, setBrushStrength] = useState<number>(0.3);
  const [symmetryX, setSymmetryX] = useState<boolean>(true);

  // Model transform state
  const [modelPos, setModelPos] = useState<[number, number, number]>([0, 1, 0]);
  const [modelRot, setModelRot] = useState<[number, number, number]>([0, 0, 0]);
  const [modelScale, setModelScale] = useState<number>(1.0);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);

  // Material & Inspector state
  const [color, setColor] = useState<string>('#38bdf8');
  const [roughness, setRoughness] = useState<number>(0.3);
  const [metalness, setMetalness] = useState<number>(0.6);
  const [wireframe, setWireframe] = useState<boolean>(false);

  // 1. PHYSICS & GRAVITY SIMULATION ENGINE
  const [physicsEnabled, setPhysicsEnabled] = useState<boolean>(false);
  const physicsState = useRef({
    vy: 0,
    vx: 0,
    vz: 0,
    gravity: -9.81,
    restitution: 0.65,
    mass: 1.0,
    groundY: 0
  });

  // 2. HEAVY SCENE PERFORMANCE STABILITY & GRAPHICS PRESETS
  const [graphicsPreset, setGraphicsPreset] = useState<GraphicsPreset>('medium');
  const [drawCalls, setDrawCalls] = useState<number>(0);
  const [trianglesCount, setTrianglesCount] = useState<number>(0);

  // 3. SKELETAL ANIMATION & BONE HIERARCHY
  const [selectedBone, setSelectedBone] = useState<string>('spine');
  const [bonePose, setBonePose] = useState<'t_pose' | 'walk' | 'attack' | 'idle'>('idle');

  // 4. CATEGORIZED ASSET LIBRARY DRAWER
  const [showAssetLibrary, setShowAssetLibrary] = useState<boolean>(false);
  const [assetCategoryFilter, setAssetCategoryFilter] = useState<string>('all');

  // Animation timeline state
  const [timelinePlaying, setTimelinePlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [keyframes, setKeyframes] = useState<{ time: number; rotY: number; posY: number; scale: number }[]>([
    { time: 0, rotY: 0, posY: 1, scale: 1 },
    { time: 2, rotY: Math.PI, posY: 1.5, scale: 1.2 },
    { time: 4, rotY: Math.PI * 2, posY: 1, scale: 1 }
  ]);

  // Raycaster & Pointers
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const isPointerDown = useRef<boolean>(false);
  const lastPointerPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartDist = useRef<number>(0);
  const lastSculptHitPoint = useRef<THREE.Vector3 | null>(null);

  // Camera Spherical Coordinates
  const cameraSpherical = useRef({ radius: 6.0, theta: 0.8, phi: 1.1 });

  // Update Camera
  const updateCameraPosition = useCallback(() => {
    if (!cameraRef.current) return;
    const { radius, theta, phi } = cameraSpherical.current;
    cameraRef.current.position.x = radius * Math.sin(phi) * Math.sin(theta);
    cameraRef.current.position.y = radius * Math.cos(phi);
    cameraRef.current.position.z = radius * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.lookAt(0, 1, 0);
  }, []);

  // Sync 3D Mesh Transform with React state
  useEffect(() => {
    if (currentMeshRef.current) {
      currentMeshRef.current.position.set(modelPos[0], modelPos[1], modelPos[2]);
      currentMeshRef.current.rotation.set(modelRot[0], modelRot[1], modelRot[2]);
      currentMeshRef.current.scale.set(modelScale, modelScale, modelScale);
    }
  }, [modelPos, modelRot, modelScale]);

  // Procedural Model Creators
  const createProceduralMech = (): THREE.Group => {
    const group = new THREE.Group();
    const matBody = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.25, metalness: 0.7 });
    const matDark = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.8 });
    const matVisor = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x0891b2, roughness: 0.1, metalness: 0.9 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.9), matBody);
    torso.position.y = 1.6;
    torso.castShadow = true;
    group.add(torso);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 2.6, 0);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), matBody);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.2), matVisor);
    visor.position.set(0, 0.05, 0.36);
    headGroup.add(head);
    headGroup.add(visor);
    group.add(headGroup);

    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(0.85, 2.1, 0);
    const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), matDark);
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 1.1, 16), matBody);
    armL.position.y = -0.55;
    leftArmGroup.add(shoulderL);
    leftArmGroup.add(armL);
    group.add(leftArmGroup);

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(-0.85, 2.1, 0);
    const shoulderR = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), matDark);
    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 1.1, 16), matBody);
    armR.position.y = -0.55;
    rightArmGroup.add(shoulderR);
    rightArmGroup.add(armR);
    group.add(rightArmGroup);

    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1.2, 0.45), matDark);
    legL.position.set(0.35, 0.6, 0);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1.2, 0.45), matDark);
    legR.position.set(-0.35, 0.6, 0);
    group.add(legL);
    group.add(legR);

    return group;
  };

  const createProceduralTerrain = (): THREE.Mesh => {
    const geo = new THREE.PlaneGeometry(6, 6, 48, 48);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const vy = Math.sin(vx * 1.5) * Math.cos(vz * 1.5) * 0.4 + Math.sin(vx * 3.0) * 0.15;
      pos.setY(i, vy);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.8,
      metalness: 0.1,
      wireframe
    });
    return new THREE.Mesh(geo, mat);
  };

  const createProceduralParliament = (): THREE.Group => {
    const group = new THREE.Group();
    const matStone = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.7, metalness: 0.1 });
    const matColumns = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5, metalness: 0.15 });
    const matDome = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.8 });
    const matGold = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.9 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.4, 2.8), matStone);
    base.position.y = 0.2;
    group.add(base);

    for (let i = -2.5; i <= 2.5; i += 1.0) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.8, 16), matColumns);
      col.position.set(i * 0.65, 1.3, 1.0);
      group.add(col);
    }

    const hall = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.8, 2.2), matStone);
    hall.position.set(0, 1.3, 0);
    group.add(hall);

    const pedimentGeo = new THREE.CylinderGeometry(1.9, 1.9, 0.4, 3);
    pedimentGeo.rotateZ(Math.PI / 2);
    pedimentGeo.rotateY(Math.PI / 2);
    const pediment = new THREE.Mesh(pedimentGeo, matStone);
    pediment.position.set(0, 2.4, 0.95);
    pediment.scale.set(0.9, 0.6, 0.3);
    group.add(pediment);

    const rotunda = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.7, 24), matStone);
    rotunda.position.set(0, 2.55, -0.1);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2), matDome);
    dome.position.set(0, 2.9, -0.1);
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8), matGold);
    spire.position.set(0, 3.8, -0.1);

    group.add(rotunda);
    group.add(dome);
    group.add(spire);
    return group;
  };

  const createProceduralJetFighter = (): THREE.Group => {
    const group = new THREE.Group();
    const matHull = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.75 });
    const matCanopy = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.95 });
    const matEngine = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.9 });

    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, 3.8, 16), matHull);
    fuselage.rotateX(Math.PI / 2);
    fuselage.position.y = 1.0;
    group.add(fuselage);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.2, 16), matHull);
    nose.rotateX(-Math.PI / 2);
    nose.position.set(0, 1.0, 2.4);
    group.add(nose);

    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), matCanopy);
    canopy.scale.set(1.1, 1.2, 2.4);
    canopy.position.set(0, 1.25, 0.8);
    group.add(canopy);

    const wingGeo = new THREE.BoxGeometry(3.6, 0.06, 1.8);
    const wings = new THREE.Mesh(wingGeo, matHull);
    wings.position.set(0, 0.95, -0.4);
    group.add(wings);

    const finL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.9), matHull);
    finL.position.set(0.65, 1.5, -1.3);
    finL.rotateZ(-0.25);
    const finR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.9), matHull);
    finR.position.set(-0.65, 1.5, -1.3);
    finR.rotateZ(0.25);
    group.add(finL);
    group.add(finR);

    const nozzleL = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.5, 16), matEngine);
    nozzleL.rotateX(Math.PI / 2);
    nozzleL.position.set(0.3, 1.0, -2.0);
    const nozzleR = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.5, 16), matEngine);
    nozzleR.rotateX(Math.PI / 2);
    nozzleR.position.set(-0.3, 1.0, -2.0);
    group.add(nozzleL);
    group.add(nozzleR);

    return group;
  };

  const createProceduralBattleTank = (): THREE.Group => {
    const group = new THREE.Group();
    const matArmor = new THREE.MeshStandardMaterial({ color: 0x3f4a3c, roughness: 0.6, metalness: 0.5 });
    const matTreads = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8, metalness: 0.4 });
    const matGun = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.3, metalness: 0.8 });

    const treadL = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.6, 3.4), matTreads);
    treadL.position.set(1.1, 0.35, 0);
    const treadR = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.6, 3.4), matTreads);
    treadR.position.set(-1.1, 0.35, 0);
    group.add(treadL);
    group.add(treadR);

    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 3.2), matArmor);
    hull.position.set(0, 0.7, 0);
    group.add(hull);

    const turret = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 1.8), matArmor);
    turret.position.set(0, 1.25, -0.1);
    group.add(turret);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.6, 16), matGun);
    barrel.rotateX(Math.PI / 2);
    barrel.position.set(0, 1.25, 1.8);
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.3, 16), matGun);
    muzzle.rotateX(Math.PI / 2);
    muzzle.position.set(0, 1.25, 3.1);
    group.add(barrel);
    group.add(muzzle);

    return group;
  };

  const createProceduralSkyscraper = (): THREE.Group => {
    const group = new THREE.Group();
    const matGlass = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.15, metalness: 0.85 });
    const matConcrete = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.3 });
    const matBeacon = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xb91c1c });

    const tier1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.6, 1.8), matConcrete);
    tier1.position.y = 0.8;
    group.add(tier1);

    const tier2 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.4, 1.3), matGlass);
    tier2.position.y = 2.8;
    group.add(tier2);

    const tier3 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.8), matConcrete);
    tier3.position.y = 4.5;
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.08, 1.4, 8), matConcrete);
    spire.position.y = 5.6;
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), matBeacon);
    beacon.position.y = 6.3;

    group.add(tier3);
    group.add(spire);
    group.add(beacon);
    return group;
  };

  const createProceduralSatellite = (): THREE.Group => {
    const group = new THREE.Group();
    const matBody = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.9 });
    const matPanels = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.2, metalness: 0.8 });
    const matDish = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.7 });

    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 1.2, 6), matBody);
    core.position.y = 1.4;
    group.add(core);

    const panelL = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.04, 0.9), matPanels);
    panelL.position.set(2.0, 1.4, 0);
    const panelR = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.04, 0.9), matPanels);
    panelR.position.set(-2.0, 1.4, 0);
    group.add(panelL);
    group.add(panelR);

    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2.8), matDish);
    dish.rotateX(Math.PI / 4);
    dish.position.set(0, 2.3, 0.3);
    group.add(dish);

    return group;
  };

  const createProceduralSupercar = (): THREE.Group => {
    const group = new THREE.Group();
    const matPaint = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.15, metalness: 0.85 });
    const matGlass = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.95 });
    const matTire = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8, metalness: 0.2 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 3.4), matPaint);
    body.position.y = 0.45;
    group.add(body);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.38, 1.5), matGlass);
    roof.position.set(0, 0.82, -0.2);
    group.add(roof);

    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.35), matPaint);
    spoiler.position.set(0, 0.92, -1.55);
    group.add(spoiler);

    const wheelPositions = [
      [0.85, 0.3, 1.0],
      [-0.85, 0.3, 1.0],
      [0.85, 0.3, -1.0],
      [-0.85, 0.3, -1.0]
    ];
    wheelPositions.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 24), matTire);
      wheel.rotateZ(Math.PI / 2);
      wheel.position.set(wx, wy, wz);
      group.add(wheel);
    });

    return group;
  };

  const createProceduralThrone = (): THREE.Group => {
    const group = new THREE.Group();
    const matGold = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.85 });
    const matVelvet = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.8, metalness: 0.1 });

    const dais = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.3, 32), matGold);
    dais.position.y = 0.15;
    group.add(dais);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 1.0), matVelvet);
    seat.position.set(0, 0.6, 0);
    group.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.6, 0.2), matVelvet);
    back.position.set(0, 1.5, -0.45);
    group.add(back);

    const crest = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 16, 24), matGold);
    crest.position.set(0, 2.4, -0.45);
    group.add(crest);

    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.9), matGold);
    armL.position.set(0.6, 0.85, 0);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.9), matGold);
    armR.position.set(-0.6, 0.85, 0);
    group.add(armL);
    group.add(armR);

    return group;
  };

  // Build Geometry for selected primitive
  const buildMesh = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (currentMeshRef.current) {
      scene.remove(currentMeshRef.current);
    }

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness,
      metalness,
      wireframe
    });

    let mesh: THREE.Mesh | THREE.Group;

    switch (primitive) {
      case 'cube':
        mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2, 32, 32, 32), mat);
        break;
      case 'sphere':
        mesh = new THREE.Mesh(new THREE.SphereGeometry(1.4, 48, 48), mat);
        break;
      case 'cylinder':
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 2.4, 32, 32), mat);
        break;
      case 'torus':
        mesh = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.45, 32, 48), mat);
        break;
      case 'plane':
        mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 3.5, 32, 32), mat);
        mesh.rotation.x = -Math.PI / 2;
        break;
      case 'mech':
        mesh = createProceduralMech();
        break;
      case 'terrain':
        mesh = createProceduralTerrain();
        break;
      case 'parliament':
        mesh = createProceduralParliament();
        break;
      case 'jet':
        mesh = createProceduralJetFighter();
        break;
      case 'tank':
        mesh = createProceduralBattleTank();
        break;
      case 'skyscraper':
        mesh = createProceduralSkyscraper();
        break;
      case 'satellite':
        mesh = createProceduralSatellite();
        break;
      case 'supercar':
        mesh = createProceduralSupercar();
        break;
      case 'throne':
        mesh = createProceduralThrone();
        break;
      default:
        mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2, 32, 32, 32), mat);
    }

    mesh.position.set(modelPos[0], modelPos[1], modelPos[2]);
    mesh.rotation.set(modelRot[0], modelRot[1], modelRot[2]);
    mesh.scale.set(modelScale, modelScale, modelScale);

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    currentMeshRef.current = mesh;

    // Calculate Triangles Count
    let triCount = 0;
    mesh.traverse(child => {
      if (child instanceof THREE.Mesh && child.geometry) {
        triCount += (child.geometry.index ? child.geometry.index.count / 3 : child.geometry.attributes.position.count / 3);
      }
    });
    setTrianglesCount(Math.round(triCount));
  };

  // Initialize Three.js scene
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111318);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    cameraRef.current = camera;
    updateCameraPosition();

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, graphicsPreset === 'ultra' ? 2 : 1.25));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = graphicsPreset === 'ultra' ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    // Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e293b, 0.85);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfff3d6, 1.8);
    dirLight.position.set(5, 8, 6);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = graphicsPreset === 'ultra' ? 2048 : 1024;
    dirLight.shadow.mapSize.height = graphicsPreset === 'ultra' ? 2048 : 1024;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // Contact Grid Floor
    const grid = new THREE.GridHelper(12, 24, 0x06b6d4, 0x272a33);
    grid.position.y = 0;
    scene.add(grid);

    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTimer = performance.now();

    // Animation / Render loop with Physics & Performance Auto-Scaler
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      frameCount++;
      if (now - fpsTimer >= 1000) {
        setFps(frameCount);
        setDrawCalls(renderer.info.render.calls);
        frameCount = 0;
        fpsTimer = now;
      }

      // 1. PHYSICS & GRAVITY SIMULATION TICK
      if (physicsEnabled && currentMeshRef.current) {
        const ps = physicsState.current;
        ps.vy += ps.gravity * dt;
        const newY = currentMeshRef.current.position.y + ps.vy * dt;

        // Ground Collision Detection (Floor Y = 0)
        const boundingBox = new THREE.Box3().setFromObject(currentMeshRef.current);
        const bottomY = newY - (boundingBox.max.y - boundingBox.min.y) / 2;

        if (bottomY <= ps.groundY) {
          currentMeshRef.current.position.y = (boundingBox.max.y - boundingBox.min.y) / 2;
          ps.vy = -ps.vy * ps.restitution;
          if (Math.abs(ps.vy) < 0.2) ps.vy = 0;
        } else {
          currentMeshRef.current.position.y = newY;
        }
        setModelPos([currentMeshRef.current.position.x, currentMeshRef.current.position.y, currentMeshRef.current.position.z]);
      }

      // Auto-rotate turntable
      if (autoRotate && currentMeshRef.current) {
        currentMeshRef.current.rotation.y += 0.01;
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mount || !renderer || !camera) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [physicsEnabled, graphicsPreset]);

  // Re-build mesh on primitive change
  useEffect(() => {
    buildMesh();
  }, [primitive, color, roughness, metalness, wireframe]);

  // Physics Jump Impulse
  const triggerPhysicsImpulse = () => {
    physicsState.current.vy = 6.5;
    setPhysicsEnabled(true);
    soundSynth.playJump();
    addLog('Applied Physics Impulse (Jump Force = +6.5 m/s)', 'info');
  };

  // Ground model to floor
  const groundModelToFloor = () => {
    if (!currentMeshRef.current) return;
    const box = new THREE.Box3().setFromObject(currentMeshRef.current);
    const deltaY = -box.min.y;
    setModelPos(prev => [prev[0], prev[1] + deltaY, prev[2]]);
    soundSynth.playLaser();
    addLog('Aligned 3D model to sit flush on the studio grid floor.', 'info');
  };

  // Reset All Transforms
  const resetAllTransforms = () => {
    setModelPos([0, 1, 0]);
    setModelRot([0, 0, 0]);
    setModelScale(1.0);
    soundSynth.playLaser();
    addLog('Reset position, rotation, and scale.', 'info');
  };

  // Sculpting Logic
  const applySculptAtPoint = (localHit: THREE.Vector3, normal: THREE.Vector3, isSymmetric: boolean = false) => {
    const mesh = currentMeshRef.current;
    if (!mesh || !(mesh instanceof THREE.Mesh)) return;

    const geo = mesh.geometry as THREE.BufferGeometry;
    if (!geo.attributes.position) return;

    const pos = geo.attributes.position;
    const count = pos.count;
    let modified = false;

    for (let i = 0; i < count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);

      const dist = Math.hypot(vx - localHit.x, vy - localHit.y, vz - localHit.z);
      if (dist < brushRadius) {
        const falloff = Math.cos((dist / brushRadius) * (Math.PI / 2));
        const factor = brushStrength * falloff * 0.12;

        switch (sculptBrush) {
          case 'inflate':
            pos.setXYZ(i, vx + normal.x * factor, vy + normal.y * factor, vz + normal.z * factor);
            break;
          case 'deflate':
            pos.setXYZ(i, vx - normal.x * factor, vy - normal.y * factor, vz - normal.z * factor);
            break;
          case 'clay':
            pos.setXYZ(i, vx + normal.x * factor * 1.5, vy + normal.y * factor * 1.5, vz + normal.z * factor * 1.5);
            break;
          case 'smooth':
            pos.setXYZ(
              i,
              vx * (1 - factor * 0.5) + localHit.x * (factor * 0.5),
              vy * (1 - factor * 0.5) + localHit.y * (factor * 0.5),
              vz * (1 - factor * 0.5) + localHit.z * (factor * 0.5)
            );
            break;
          case 'flatten':
            pos.setXYZ(i, vx, vy * (1 - factor) + localHit.y * factor, vz);
            break;
          case 'pinch':
            pos.setXYZ(
              i,
              vx + (localHit.x - vx) * factor * 1.5,
              vy + (localHit.y - vy) * factor * 1.5,
              vz + (localHit.z - vz) * factor * 1.5
            );
            break;
          default:
            pos.setXYZ(i, vx + normal.x * factor, vy + normal.y * factor, vz + normal.z * factor);
        }
        modified = true;
      }
    }

    if (modified) {
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    }
  };

  const handleSculptStroke = (intersection: THREE.Intersection) => {
    const mesh = currentMeshRef.current;
    if (!mesh || !(mesh instanceof THREE.Mesh)) return;

    const hitPoint = intersection.point;
    const localHit = mesh.worldToLocal(hitPoint.clone());
    const normal = intersection.face ? intersection.face.normal.clone() : new THREE.Vector3(0, 1, 0);

    applySculptAtPoint(localHit, normal, false);

    if (symmetryX) {
      const symHit = new THREE.Vector3(-localHit.x, localHit.y, localHit.z);
      const symNormal = new THREE.Vector3(-normal.x, normal.y, normal.z);
      applySculptAtPoint(symHit, symNormal, true);
    }
  };

  // TOUCH & POINTER GESTURE HANDLERS
  const handlePointerDown = (clientX: number, clientY: number, rect: DOMRect) => {
    isPointerDown.current = true;
    lastPointerPos.current = { x: clientX, y: clientY };

    const normX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const normY = -((clientY - rect.top) / rect.height) * 2 + 1;
    mouse.current.set(normX, normY);

    if (mode === 'sculpt' && cameraRef.current && currentMeshRef.current) {
      raycaster.current.setFromCamera(mouse.current, cameraRef.current);
      const hits = raycaster.current.intersectObject(currentMeshRef.current, true);
      if (hits.length > 0) {
        handleSculptStroke(hits[0]);
      }
    }
  };

  const handlePointerMove = (clientX: number, clientY: number, rect: DOMRect) => {
    if (!isPointerDown.current) return;

    const dx = clientX - lastPointerPos.current.x;
    const dy = clientY - lastPointerPos.current.y;
    lastPointerPos.current = { x: clientX, y: clientY };

    const normX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const normY = -((clientY - rect.top) / rect.height) * 2 + 1;
    mouse.current.set(normX, normY);

    if (mode === 'orbit') {
      cameraSpherical.current.theta -= dx * 0.009;
      cameraSpherical.current.phi = Math.max(0.1, Math.min(Math.PI / 2 + 0.15, cameraSpherical.current.phi - dy * 0.009));
      updateCameraPosition();
    } else if (mode === 'translate') {
      const sensitivity = 0.012 * (cameraSpherical.current.radius / 6);
      setModelPos(prev => [prev[0] + dx * sensitivity, Math.max(0, prev[1] - dy * sensitivity), prev[2]]);
    } else if (mode === 'rotate') {
      setModelRot(prev => [prev[0] + dy * 0.015, prev[1] + dx * 0.015, prev[2]]);
    } else if (mode === 'scale') {
      const scaleDelta = -dy * 0.01;
      setModelScale(prev => Math.max(0.2, Math.min(4.0, prev + scaleDelta)));
    } else if (mode === 'sculpt') {
      if (cameraRef.current && currentMeshRef.current) {
        raycaster.current.setFromCamera(mouse.current, cameraRef.current);
        const hits = raycaster.current.intersectObject(currentMeshRef.current, true);
        if (hits.length > 0) handleSculptStroke(hits[0]);
      }
    }
  };

  const handlePointerUp = () => {
    isPointerDown.current = false;
    lastSculptHitPoint.current = null;
  };

  // Mouse & Touch Wrappers
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    handlePointerDown(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
  };
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    handlePointerMove(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
  };
  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.touches.length === 1) handlePointerDown(e.touches[0].clientX, e.touches[0].clientY, rect);
    else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDist.current = Math.hypot(dx, dy);
    }
  };
  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.touches.length === 1) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY, rect);
    else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const delta = (currentDist - touchStartDist.current) * 0.005;
      touchStartDist.current = currentDist;
      cameraSpherical.current.radius = Math.max(2.5, Math.min(15, cameraSpherical.current.radius - delta * 3));
      updateCameraPosition();
    }
  };
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    cameraSpherical.current.radius = Math.max(2.5, Math.min(15, cameraSpherical.current.radius + e.deltaY * 0.004));
    updateCameraPosition();
  };

  // 8. SCENE STATE SERIALIZATION / DESERIALIZATION (JSON)
  const exportSceneJSON = () => {
    const sceneState: Scene3DStateJSON = {
      version: '1.0.0',
      timestamp: Date.now(),
      primitive,
      pos: modelPos,
      rot: modelRot,
      scale: modelScale,
      material: { color, roughness, metalness, wireframe },
      lighting: { dirIntensity: 1.8, shadows: true },
      keyframes
    };

    const blob = new Blob([JSON.stringify(sceneState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `3d_scene_${primitive}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    soundSynth.playPowerup();
    addLog(`ذخیره کامل صحنه سه‌بعدی به صورت فایل JSON`, 'info');
  };

  const importSceneJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed: Scene3DStateJSON = JSON.parse(reader.result as string);
        if (parsed.primitive) setPrimitive(parsed.primitive);
        if (parsed.pos) setModelPos(parsed.pos);
        if (parsed.rot) setModelRot(parsed.rot);
        if (parsed.scale) setModelScale(parsed.scale);
        if (parsed.material) {
          setColor(parsed.material.color);
          setRoughness(parsed.material.roughness);
          setMetalness(parsed.material.metalness);
          setWireframe(parsed.material.wireframe);
        }
        if (parsed.keyframes) setKeyframes(parsed.keyframes);
        soundSynth.playPowerup();
        addLog(`بازیابی و بارگذاری دقیق صحنه سه‌بعدی از JSON`, 'info');
      } catch (err) {
        addLog('خطا در خواندن فایل JSON صحنه', 'error');
      }
    };
    reader.readAsText(file);
  };

  // 5. GLTF / GLB / OBJ EXPORTER
  const exportOBJ = () => {
    const mesh = currentMeshRef.current;
    if (!mesh || !(mesh instanceof THREE.Mesh)) {
      addLog('امکان خروجی مستقیم گروه به OBJ وجود ندارد.', 'warn');
      return;
    }
    const geo = mesh.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position;
    if (!pos) return;

    let obj = `# AetherForge 3D Studio Export\no ${primitive}\n`;
    for (let i = 0; i < pos.count; i++) {
      obj += `v ${pos.getX(i).toFixed(4)} ${pos.getY(i).toFixed(4)} ${pos.getZ(i).toFixed(4)}\n`;
    }
    if (geo.index) {
      const ind = geo.index;
      for (let i = 0; i < ind.count; i += 3) {
        obj += `f ${ind.getX(i) + 1} ${ind.getX(i + 1) + 1} ${ind.getX(i + 2) + 1}\n`;
      }
    }

    const blob = new Blob([obj], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${primitive}_model.obj`;
    a.click();
    URL.revokeObjectURL(url);
    soundSynth.playPowerup();
    addLog(`خروجی مدل ۳ بعدی با فرمت OBJ انجام شد.`, 'info');
  };

  const sculptBrushesList: { id: SculptBrush; label: string; icon: string }[] = [
    { id: 'inflate', label: 'Inflate', icon: '🎈' },
    { id: 'deflate', label: 'Deflate', icon: '🕳️' },
    { id: 'clay', label: 'Clay', icon: '🧱' },
    { id: 'smooth', label: 'Smooth', icon: '✨' },
    { id: 'flatten', label: 'Flatten', icon: '📐' },
    { id: 'pinch', label: 'Pinch', icon: '🤏' }
  ];

  const filteredAssets = assetCategoryFilter === 'all'
    ? CATEGORIZED_3D_ASSETS
    : CATEGORIZED_3D_ASSETS.filter(a => a.category === assetCategoryFilter);

  return (
    <div className="flex-1 flex flex-col bg-[#111318] relative overflow-hidden h-full select-none">
      {/* 3D Viewport Top Toolbar */}
      <div className="h-11 bg-[#171922] border-b border-[#252834] flex items-center justify-between px-3 text-xs shrink-0 z-10">
        {/* Primitives Bar */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setShowAssetLibrary(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-bold cursor-pointer shadow-sm shrink-0"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>کتابخانه دارایی‌ها</span>
          </button>

          <div className="h-4 w-px bg-[#2a2e3d] mx-1" />

          {([
            { id: 'cube', label: 'Cube' },
            { id: 'sphere', label: 'Sphere' },
            { id: 'mech', label: '🤖 Mech' },
            { id: 'parliament', label: '🏛️ Parliament' },
            { id: 'jet', label: '✈️ Jet' },
            { id: 'tank', label: '🛡️ Tank' },
            { id: 'skyscraper', label: '🏙️ Tower' },
            { id: 'satellite', label: '🛰️ Satellite' },
            { id: 'supercar', label: '🏎️ Supercar' },
            { id: 'throne', label: '👑 Throne' }
          ] as { id: MeshPrimitiveType; label: string }[]).map(prim => (
            <button
              key={prim.id}
              onClick={() => {
                setPrimitive(prim.id);
                soundSynth.playLaser();
              }}
              className={`px-2.5 py-1 rounded text-xs cursor-pointer transition-colors whitespace-nowrap ${
                primitive === prim.id
                  ? 'bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/40'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#232632]'
              }`}
            >
              {prim.label}
            </button>
          ))}
        </div>

        {/* Physics, Graphics & Import/Export Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Physics Engine Toggle */}
          <button
            onClick={() => {
              setPhysicsEnabled(!physicsEnabled);
              soundSynth.playCoin();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer border transition-all ${
              physicsEnabled
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm animate-pulse'
                : 'bg-[#232632] text-gray-400 border-transparent hover:text-gray-200'
            }`}
            title="فعال‌سازی جاوا اسکریپت فیزیک ۳ بعدی، گرانش و برخورد"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">فیزیک و جاذبه</span>
          </button>

          {/* Physics Jump Impulse Button */}
          {physicsEnabled && (
            <button
              onClick={triggerPhysicsImpulse}
              className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer shadow-sm"
              title="اعمال ضربه و پرش فیزیکی"
            >
              پرش (Jump)
            </button>
          )}

          {/* Graphics Quality Preset */}
          <button
            onClick={() => {
              const next = graphicsPreset === 'low' ? 'medium' : graphicsPreset === 'medium' ? 'ultra' : 'low';
              setGraphicsPreset(next);
              soundSynth.playCoin();
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#232632] hover:bg-[#2b2f3e] text-cyan-400 text-xs border border-[#343846] cursor-pointer"
            title="تنظیم کیفیت گرافیک جهت اجرای روان در موبایل و دستگاه‌های ضعیف"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="uppercase font-bold">{graphicsPreset}</span>
          </button>

          {/* Import Scene JSON */}
          <label className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#232632] hover:bg-[#2b2f3e] text-gray-300 border border-[#343846] cursor-pointer text-xs" title="بازیابی فایل JSON صحنه">
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">بازکردن JSON</span>
            <input type="file" accept=".json" onChange={importSceneJSON} className="hidden" />
          </label>

          {/* Export Scene JSON */}
          <button
            onClick={exportSceneJSON}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#232632] hover:bg-[#2b2f3e] text-gray-300 border border-[#343846] cursor-pointer text-xs"
            title="ذخیره تمام جزئیات صحنه به فرمت JSON"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">ذخیره صحنه</span>
          </button>

          {/* Export OBJ */}
          <button
            onClick={exportOBJ}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs cursor-pointer"
            title="خروجی مدل با فرمت .OBJ"
          >
            <span>.OBJ</span>
          </button>
        </div>
      </div>

      {/* Main Studio Interactive Canvas Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <div
          ref={mountRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={handlePointerUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={handlePointerUp}
          onWheel={onWheel}
          style={{ touchAction: 'none' }}
          className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing bg-[#0c0d12]"
        >
          {/* Top Interactive Mode Dock */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#181a24]/95 backdrop-blur-md border border-[#2e3344] p-1 rounded-xl shadow-2xl flex items-center gap-1 z-20 max-w-[95vw] overflow-x-auto no-scrollbar">
            <button
              onClick={() => {
                setMode('orbit');
                soundSynth.playCoin();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all whitespace-nowrap ${
                mode === 'orbit'
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#252834]'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>چرخش دوربین (Orbit)</span>
            </button>

            <button
              onClick={() => {
                setMode('translate');
                soundSynth.playLaser();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all whitespace-nowrap ${
                mode === 'translate'
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#252834]'
              }`}
            >
              <Move className="w-3.5 h-3.5 text-emerald-400" />
              <span>جابجایی (Move)</span>
            </button>

            <button
              onClick={() => {
                setMode('rotate');
                soundSynth.playLaser();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all whitespace-nowrap ${
                mode === 'rotate'
                  ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-400/50 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#252834]'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
              <span>چرخش مدل (Rotate)</span>
            </button>

            <button
              onClick={() => {
                setMode('scale');
                soundSynth.playLaser();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all whitespace-nowrap ${
                mode === 'scale'
                  ? 'bg-purple-500/25 text-purple-300 border border-purple-400/50 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#252834]'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5 text-purple-400" />
              <span>تغییر مقیاس (Scale)</span>
            </button>

            <button
              onClick={() => {
                setMode('sculpt');
                soundSynth.playJump();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all whitespace-nowrap ${
                mode === 'sculpt'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-400/50 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#252834]'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              <span>مجسمه‌سازی (Sculpt)</span>
            </button>

            <button
              onClick={() => {
                setMode('bones');
                soundSynth.playCoin();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all whitespace-nowrap ${
                mode === 'bones'
                  ? 'bg-pink-500/25 text-pink-300 border border-pink-400/50 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#252834]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-pink-400" />
              <span>اسکلت‌بندی (Bones)</span>
            </button>
          </div>

          {/* Performance Profiler Overlay */}
          <div className="absolute top-16 left-3 pointer-events-none bg-black/75 backdrop-blur-xs px-3 py-2 rounded-xl border border-gray-800 text-[11px] text-gray-300 flex items-center gap-3 z-10 font-mono">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" />
              <span>{fps} FPS</span>
            </span>
            <span className="text-gray-400">Calls: <strong className="text-white">{drawCalls}</strong></span>
            <span className="text-gray-400">Tris: <strong className="text-cyan-400">{trianglesCount}</strong></span>
          </div>

          {/* SCULPTING BRUSHES PANEL */}
          {mode === 'sculpt' && (
            <div className="absolute bottom-4 left-4 bg-[#181a24]/95 backdrop-blur-md border border-[#323648] p-3 rounded-xl shadow-2xl flex flex-col gap-2.5 z-20 w-72 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#2d3142] pb-2">
                <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" />
                  <span>قلم‌های مجسمه‌سازی</span>
                </span>
                <button
                  onClick={buildMesh}
                  className="text-[10px] text-gray-400 hover:text-amber-300 cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {sculptBrushesList.map(b => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setSculptBrush(b.id);
                      soundSynth.playLaser();
                    }}
                    className={`py-1.5 px-2 rounded-lg text-start flex items-center gap-1.5 cursor-pointer text-[11px] transition-all ${
                      sculptBrush === b.id
                        ? 'bg-amber-500/30 text-amber-200 font-semibold border border-amber-500/50 shadow-sm'
                        : 'bg-[#222532] text-gray-300 hover:bg-[#2c3040]'
                    }`}
                  >
                    <span>{b.icon}</span>
                    <span className="truncate">{b.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SKELETAL RIGGING PANEL */}
          {mode === 'bones' && (
            <div className="absolute bottom-4 left-4 bg-[#181a24]/95 backdrop-blur-md border border-[#323648] p-3 rounded-xl shadow-2xl flex flex-col gap-2.5 z-20 w-72">
              <div className="flex items-center justify-between border-b border-[#2d3142] pb-2">
                <span className="text-[11px] font-bold text-pink-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>کنترل استخوان‌بندی (Skeletal Rigging)</span>
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-gray-400 block mb-1">انتخاب پوز انیمیشن:</span>
                  <div className="grid grid-cols-2 gap-1">
                    {(['idle', 't_pose', 'walk', 'attack'] as const).map(pose => (
                      <button
                        key={pose}
                        onClick={() => setBonePose(pose)}
                        className={`py-1 px-2 rounded text-[11px] uppercase font-bold cursor-pointer ${
                          bonePose === pose ? 'bg-pink-600 text-white' : 'bg-[#222534] text-gray-300'
                        }`}
                      >
                        {pose}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Inspector & Material & Animation Panel */}
        <div className="w-full md:w-64 bg-[#15171f] border-t md:border-t-0 md:border-l border-[#242733] p-3 text-xs flex flex-col gap-4 overflow-y-auto shrink-0 select-none">
          <div className="font-semibold text-gray-200 border-b border-[#2b2f3d] pb-2 flex items-center justify-between">
            <span>خصوصیات مدل سه‌بعدی</span>
            <span className="text-[10px] text-cyan-400 uppercase font-mono">{primitive}</span>
          </div>

          {/* Quick Transform Overview */}
          <div className="bg-[#181a24] p-2.5 rounded-lg border border-[#272b3a] flex flex-col gap-1.5">
            <span className="text-gray-400 font-semibold text-[10px] uppercase tracking-wider">موقعیت و ابعاد مدل</span>
            <div className="flex justify-between text-[11px] text-gray-300">
              <span className="text-gray-400">Position:</span>
              <span className="font-mono text-cyan-400">({modelPos[0].toFixed(1)}, {modelPos[1].toFixed(1)}, {modelPos[2].toFixed(1)})</span>
            </div>
            <div className="flex justify-between text-[11px] text-gray-300">
              <span className="text-gray-400">Scale:</span>
              <span className="font-mono text-purple-400">{modelScale.toFixed(2)}x</span>
            </div>
            <button
              onClick={resetAllTransforms}
              className="mt-1 w-full py-1 rounded bg-[#252834] hover:bg-[#303444] text-gray-300 text-[11px] cursor-pointer"
            >
              بازنشانی موقعیت
            </button>
          </div>

          {/* Material PBR */}
          <div className="flex flex-col gap-3">
            <span className="text-gray-400 font-medium text-[11px]">PBR MATERIAL & SHADER</span>

            {/* Color */}
            <div className="flex items-center justify-between">
              <span className="text-gray-300">رنگ پایه (Color)</span>
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
              />
            </div>

            {/* Roughness */}
            <div>
              <div className="flex justify-between text-gray-400 mb-1">
                <span>زبری (Roughness)</span>
                <span className="font-mono">{roughness.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={roughness}
                onChange={e => setRoughness(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Metalness */}
            <div>
              <div className="flex justify-between text-gray-400 mb-1">
                <span>خاصیت فلزی (Metalness)</span>
                <span className="font-mono">{metalness.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={metalness}
                onChange={e => setMetalness(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Wireframe Toggle */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-gray-300">نمایش Wireframe</span>
              <button
                onClick={() => setWireframe(!wireframe)}
                className={`px-2.5 py-1 rounded text-xs cursor-pointer font-medium ${
                  wireframe ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40' : 'bg-[#252834] text-gray-400'
                }`}
              >
                {wireframe ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 6. CATEGORIZED 3D ASSET LIBRARY DRAWER / MODAL */}
      {showAssetLibrary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setShowAssetLibrary(false)}
        >
          <div
            className="w-full max-w-3xl bg-[#171922] border border-[#34394c] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 bg-[#13151c] border-b border-[#282d3e] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">کتابخانه دارایی‌های ۳ بعدی (3D Asset Library)</h3>
              </div>
              <button onClick={() => setShowAssetLibrary(false)} className="text-gray-400 hover:text-white p-1 cursor-pointer">
                ✕
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="p-3 bg-[#181a24] border-b border-[#282d3e] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'همه دارایی‌ها' },
                { id: 'characters', label: '🤖 کاراکتر و ربات' },
                { id: 'vehicles', label: '🏎️ وسایل نقلیه' },
                { id: 'architecture', label: '🏛️ معماری' },
                { id: 'nature', label: '⛰️ محیط' },
                { id: 'props', label: '📦 اشکال اولیه' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setAssetCategoryFilter(cat.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-medium cursor-pointer whitespace-nowrap transition-all ${
                    assetCategoryFilter === cat.id
                      ? 'bg-cyan-600 text-white font-bold shadow-sm'
                      : 'bg-[#222534] text-gray-300 hover:bg-[#2b2f42]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Assets Grid */}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto max-h-96">
              {filteredAssets.map(asset => (
                <div
                  key={asset.id}
                  onClick={() => {
                    setPrimitive(asset.primitiveType as MeshPrimitiveType);
                    setShowAssetLibrary(false);
                    soundSynth.playPowerup();
                    addLog(`بارگذاری مدل سه‌بعدی از کتابخانه: ${asset.nameFa}`, 'info');
                  }}
                  className="p-3 rounded-xl bg-[#12141c] border border-[#272b3b] hover:border-cyan-500/50 hover:bg-[#1a1d29] cursor-pointer transition-all flex flex-col justify-between space-y-2 group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl group-hover:scale-110 transition-transform">{asset.icon}</span>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-cyan-300">{asset.nameFa}</h4>
                      <span className="text-[10px] text-gray-400 font-mono">{asset.nameEn}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 line-clamp-2">{asset.descriptionFa}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
