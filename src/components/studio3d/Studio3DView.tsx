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
import {
  Wrench,
  Download,
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
  Check
} from 'lucide-react';

export type InteractionMode = 'orbit' | 'translate' | 'rotate' | 'scale' | 'sculpt';

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

export const Studio3DView: React.FC = () => {
  const { language, activeTextureUrl, addLog } = useStudio();
  const t = translations[language];

  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const currentMeshRef = useRef<THREE.Mesh | THREE.Group | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Primitive selection
  const [primitive, setPrimitive] = useState<MeshPrimitiveType>('cube');

  // Interaction Mode: Orbit (Camera), Translate (Move Model), Rotate (Rotate Model), Scale (Resize Model), Sculpt (Sculpt Brushes)
  const [mode, setMode] = useState<InteractionMode>('orbit');

  // Sculpting tools
  const [sculptBrush, setSculptBrush] = useState<SculptBrush>('inflate');
  const [brushRadius, setBrushRadius] = useState<number>(0.65);
  const [brushStrength, setBrushStrength] = useState<number>(0.3);
  const [symmetryX, setSymmetryX] = useState<boolean>(true);

  // Model transform state (interactive with finger/mouse and sliders)
  const [modelPos, setModelPos] = useState<[number, number, number]>([0, 1, 0]);
  const [modelRot, setModelRot] = useState<[number, number, number]>([0, 0, 0]);
  const [modelScale, setModelScale] = useState<number>(1.0);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);

  // Material & Inspector state
  const [color, setColor] = useState<string>('#38bdf8');
  const [roughness, setRoughness] = useState<number>(0.3);
  const [metalness, setMetalness] = useState<number>(0.6);
  const [wireframe, setWireframe] = useState<boolean>(false);

  // Animation timeline state
  const [timelinePlaying, setTimelinePlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [keyframes, setKeyframes] = useState<{ time: number; rotY: number; posY: number; scale: number }[]>([
    { time: 0, rotY: 0, posY: 1, scale: 1 },
    { time: 2, rotY: Math.PI, posY: 1.5, scale: 1.2 },
    { time: 4, rotY: Math.PI * 2, posY: 1, scale: 1 }
  ]);

  // Collapsible control drawer
  const [showTransformDrawer, setShowTransformDrawer] = useState<boolean>(true);

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

  // Create Procedural Mech
  const createProceduralMech = (): THREE.Group => {
    const group = new THREE.Group();

    const matBody = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.25,
      metalness: 0.7
    });

    const matDark = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.8
    });

    const matVisor = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      roughness: 0.1,
      metalness: 0.9
    });

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

  // Create Procedural Terrain
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

  // Create Procedural Parliament / Capitol Building
  const createProceduralParliament = (): THREE.Group => {
    const group = new THREE.Group();
    const matStone = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.7, metalness: 0.1 });
    const matColumns = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5, metalness: 0.15 });
    const matDome = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.8 });
    const matGold = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.9 });

    // Steps Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.4, 2.8), matStone);
    base.position.y = 0.2;
    group.add(base);

    // Front Classical Columns (6 Ionic Pillars)
    for (let i = -2.5; i <= 2.5; i += 1.0) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.8, 16), matColumns);
      col.position.set(i * 0.65, 1.3, 1.0);
      group.add(col);
    }

    // Main Hall Building
    const hall = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.8, 2.2), matStone);
    hall.position.set(0, 1.3, 0);
    group.add(hall);

    // Triangular Pediment Roof
    const pedimentGeo = new THREE.CylinderGeometry(1.9, 1.9, 0.4, 3);
    pedimentGeo.rotateZ(Math.PI / 2);
    pedimentGeo.rotateY(Math.PI / 2);
    const pediment = new THREE.Mesh(pedimentGeo, matStone);
    pediment.position.set(0, 2.4, 0.95);
    pediment.scale.set(0.9, 0.6, 0.3);
    group.add(pediment);

    // Central Rotunda & Dome
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

  // Create Supersonic Fighter Jet
  const createProceduralJetFighter = (): THREE.Group => {
    const group = new THREE.Group();
    const matHull = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.75 });
    const matCanopy = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.95 });
    const matEngine = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.9 });
    const matGlow = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x0891b2 });

    // Fuselage
    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, 3.8, 16), matHull);
    fuselage.rotateX(Math.PI / 2);
    fuselage.position.y = 1.0;
    group.add(fuselage);

    // Nosecone
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.2, 16), matHull);
    nose.rotateX(-Math.PI / 2);
    nose.position.set(0, 1.0, 2.4);
    group.add(nose);

    // Glass Canopy
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), matCanopy);
    canopy.scale.set(1.1, 1.2, 2.4);
    canopy.position.set(0, 1.25, 0.8);
    group.add(canopy);

    // Swept Delta Wings
    const wingGeo = new THREE.BoxGeometry(3.6, 0.06, 1.8);
    const wings = new THREE.Mesh(wingGeo, matHull);
    wings.position.set(0, 0.95, -0.4);
    group.add(wings);

    // Twin Canted Vertical Fins
    const finL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.9), matHull);
    finL.position.set(0.65, 1.5, -1.3);
    finL.rotateZ(-0.25);
    const finR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.9), matHull);
    finR.position.set(-0.65, 1.5, -1.3);
    finR.rotateZ(0.25);
    group.add(finL);
    group.add(finR);

    // Twin Afterburners
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

  // Create Armored Battle Tank
  const createProceduralBattleTank = (): THREE.Group => {
    const group = new THREE.Group();
    const matArmor = new THREE.MeshStandardMaterial({ color: 0x3f4a3c, roughness: 0.6, metalness: 0.5 });
    const matTreads = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8, metalness: 0.4 });
    const matGun = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.3, metalness: 0.8 });

    // Track Treads
    const treadL = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.6, 3.4), matTreads);
    treadL.position.set(1.1, 0.35, 0);
    const treadR = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.6, 3.4), matTreads);
    treadR.position.set(-1.1, 0.35, 0);
    group.add(treadL);
    group.add(treadR);

    // Main Armored Hull
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 3.2), matArmor);
    hull.position.set(0, 0.7, 0);
    group.add(hull);

    // Revolving Turret
    const turret = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 1.8), matArmor);
    turret.position.set(0, 1.25, -0.1);
    group.add(turret);

    // Heavy Cannon Barrel
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

  // Create Metropolis Skyscraper
  const createProceduralSkyscraper = (): THREE.Group => {
    const group = new THREE.Group();
    const matGlass = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.15, metalness: 0.85 });
    const matConcrete = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.3 });
    const matBeacon = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xb91c1c });

    // Base Tier
    const tier1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.6, 1.8), matConcrete);
    tier1.position.y = 0.8;
    group.add(tier1);

    // Mid Glass Tower
    const tier2 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.4, 1.3), matGlass);
    tier2.position.y = 2.8;
    group.add(tier2);

    // Pinnacle Spire & Helipad
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

  // Create Orbital Satellite
  const createProceduralSatellite = (): THREE.Group => {
    const group = new THREE.Group();
    const matBody = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.9 });
    const matPanels = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.2, metalness: 0.8 });
    const matDish = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.7 });

    // Central Hexagonal Bus Body
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 1.2, 6), matBody);
    core.position.y = 1.4;
    group.add(core);

    // Solar Panel Arrays (Left & Right)
    const panelL = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.04, 0.9), matPanels);
    panelL.position.set(2.0, 1.4, 0);
    const panelR = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.04, 0.9), matPanels);
    panelR.position.set(-2.0, 1.4, 0);
    group.add(panelL);
    group.add(panelR);

    // Parabolic Communication Dish
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2.8), matDish);
    dish.rotateX(Math.PI / 4);
    dish.position.set(0, 2.3, 0.3);
    group.add(dish);

    return group;
  };

  // Create Sports Supercar
  const createProceduralSupercar = (): THREE.Group => {
    const group = new THREE.Group();
    const matPaint = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.15, metalness: 0.85 });
    const matGlass = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.95 });
    const matTire = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8, metalness: 0.2 });
    const matRim = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.9 });

    // Chassis Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 3.4), matPaint);
    body.position.y = 0.45;
    group.add(body);

    // Cockpit Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.38, 1.5), matGlass);
    roof.position.set(0, 0.82, -0.2);
    group.add(roof);

    // Rear Spoiler Wing
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.35), matPaint);
    spoiler.position.set(0, 0.92, -1.55);
    group.add(spoiler);

    // 4 Wheels
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

  // Create Presidential Throne
  const createProceduralThrone = (): THREE.Group => {
    const group = new THREE.Group();
    const matGold = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.85 });
    const matVelvet = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.8, metalness: 0.1 });

    // Dais Podium
    const dais = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.3, 32), matGold);
    dais.position.y = 0.15;
    group.add(dais);

    // Throne Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 1.0), matVelvet);
    seat.position.set(0, 0.6, 0);
    group.add(seat);

    // High Backrest
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.6, 0.2), matVelvet);
    back.position.set(0, 1.5, -0.45);
    group.add(back);

    // Golden Crest
    const crest = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 16, 24), matGold);
    crest.position.set(0, 2.4, -0.45);
    group.add(crest);

    // Armrests
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // Contact Grid Floor
    const grid = new THREE.GridHelper(12, 24, 0x06b6d4, 0x272a33);
    grid.position.y = 0;
    scene.add(grid);

    // Animation / Render loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

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
  }, []);

  // Re-build mesh on primitive change
  useEffect(() => {
    buildMesh();
  }, [primitive, color, roughness, metalness, wireframe]);

  // Reset Model Sculpt Geometry
  const resetSculptGeometry = () => {
    buildMesh();
    soundSynth.playCoin();
    addLog('Reset 3D sculpt geometry to initial primitive state.', 'info');
  };

  // Ground model to floor (Y = boundingBox bottom)
  const groundModelToFloor = () => {
    if (!currentMeshRef.current) return;
    const box = new THREE.Box3().setFromObject(currentMeshRef.current);
    const deltaY = -box.min.y;
    setModelPos(prev => [prev[0], prev[1] + deltaY, prev[2]]);
    soundSynth.playLaser();
    addLog('Aligned 3D model to sit flush on the studio grid floor.', 'info');
  };

  // Center / Reset All Transforms
  const resetAllTransforms = () => {
    setModelPos([0, 1, 0]);
    setModelRot([0, 0, 0]);
    setModelScale(1.0);
    soundSynth.playLaser();
    addLog('Reset position, rotation, and scale.', 'info');
  };

  // Sculpting Logic with 10 Professional Brushes and X-Symmetry
  const applySculptAtPoint = (localHit: THREE.Vector3, normal: THREE.Vector3, isSymmetric: boolean = false) => {
    const mesh = currentMeshRef.current;
    if (!mesh || !(mesh instanceof THREE.Mesh)) return;

    const geo = mesh.geometry as THREE.BufferGeometry;
    if (!geo.attributes.position) return;

    const pos = geo.attributes.position;
    const count = pos.count;
    let modified = false;

    // Displacement vector from last stroke point (for grab & snake brushes)
    let strokeDelta = new THREE.Vector3(0, 0, 0);
    if (lastSculptHitPoint.current) {
      strokeDelta.subVectors(localHit, lastSculptHitPoint.current);
    }

    for (let i = 0; i < count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);

      const dist = Math.hypot(vx - localHit.x, vy - localHit.y, vz - localHit.z);
      if (dist < brushRadius) {
        // Smooth cosine falloff curve
        const falloff = Math.cos((dist / brushRadius) * (Math.PI / 2));
        const factor = brushStrength * falloff * 0.12;

        switch (sculptBrush) {
          case 'inflate':
            pos.setXYZ(i, vx + normal.x * factor, vy + normal.y * factor, vz + normal.z * factor);
            break;

          case 'deflate':
            pos.setXYZ(i, vx - normal.x * factor, vy - normal.y * factor, vz - normal.z * factor);
            break;

          case 'clay': {
            // Clay strips: builds up flat surface layers
            const clayCap = 0.25;
            const step = Math.min(clayCap, factor * 1.4);
            pos.setXYZ(i, vx + normal.x * step, vy + normal.y * step, vz + normal.z * step);
            break;
          }

          case 'smooth': {
            // Smooth: blend toward local center
            pos.setXYZ(
              i,
              vx * (1 - factor * 0.5) + localHit.x * (factor * 0.5),
              vy * (1 - factor * 0.5) + localHit.y * (factor * 0.5),
              vz * (1 - factor * 0.5) + localHit.z * (factor * 0.5)
            );
            break;
          }

          case 'flatten': {
            // Flatten: project vertices onto tangent plane at hit point
            const toVert = new THREE.Vector3(vx - localHit.x, vy - localHit.y, vz - localHit.z);
            const distToPlane = toVert.dot(normal);
            pos.setXYZ(
              i,
              vx - normal.x * distToPlane * factor * 2,
              vy - normal.y * distToPlane * factor * 2,
              vz - normal.z * distToPlane * factor * 2
            );
            break;
          }

          case 'pinch': {
            // Pinch: pull vertices toward hit center creating sharp ridge/crease
            const dx = localHit.x - vx;
            const dy = localHit.y - vy;
            const dz = localHit.z - vz;
            pos.setXYZ(i, vx + dx * factor * 1.5, vy + dy * factor * 1.5, vz + dz * factor * 1.5);
            break;
          }

          case 'crease': {
            // Crease: combine sharp inward indent with lateral pinch
            const dx = localHit.x - vx;
            const dy = localHit.y - vy;
            const dz = localHit.z - vz;
            pos.setXYZ(
              i,
              vx + dx * factor - normal.x * factor * 1.2,
              vy + dy * factor - normal.y * factor * 1.2,
              vz + dz * factor - normal.z * factor * 1.2
            );
            break;
          }

          case 'grab': {
            // Grab/Move: pull geometry along finger stroke
            pos.setXYZ(
              i,
              vx + strokeDelta.x * falloff * 1.5,
              vy + strokeDelta.y * falloff * 1.5,
              vz + strokeDelta.z * falloff * 1.5
            );
            break;
          }

          case 'snake': {
            // Snake hook: pulls vertices outward in direction of normal
            pos.setXYZ(
              i,
              vx + normal.x * factor * 2.5,
              vy + normal.y * factor * 2.5,
              vz + normal.z * factor * 2.5
            );
            break;
          }

          case 'twist': {
            // Twist: rotate around hit normal
            const angle = factor * 2.5;
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            const rx = vx - localHit.x;
            const rz = vz - localHit.z;
            pos.setX(i, localHit.x + rx * cosA - rz * sinA);
            pos.setZ(i, localHit.z + rx * sinA + rz * cosA);
            break;
          }
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

    // Apply X-Symmetry if enabled
    if (symmetryX) {
      const symHit = new THREE.Vector3(-localHit.x, localHit.y, localHit.z);
      const symNormal = new THREE.Vector3(-normal.x, normal.y, normal.z);
      applySculptAtPoint(symHit, symNormal, true);
    }

    lastSculptHitPoint.current = localHit.clone();
  };

  // TOUCH & POINTER GESTURE HANDLERS (Full 1-finger & 2-finger multi-touch)
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
      // 1-Finger Orbit camera around model
      cameraSpherical.current.theta -= dx * 0.009;
      cameraSpherical.current.phi = Math.max(0.1, Math.min(Math.PI / 2 + 0.15, cameraSpherical.current.phi - dy * 0.009));
      updateCameraPosition();
    } else if (mode === 'translate') {
      // 1-Finger Drag: Translate 3D Model in X and Y
      const sensitivity = 0.012 * (cameraSpherical.current.radius / 6);
      setModelPos(prev => [
        prev[0] + dx * sensitivity,
        Math.max(0, prev[1] - dy * sensitivity),
        prev[2]
      ]);
    } else if (mode === 'rotate') {
      // 1-Finger Drag: Rotate 3D Model around Y and X axes
      setModelRot(prev => [
        prev[0] + dy * 0.015,
        prev[1] + dx * 0.015,
        prev[2]
      ]);
    } else if (mode === 'scale') {
      // 1-Finger Drag: Resize / Scale 3D model up/down
      const scaleDelta = -dy * 0.01;
      setModelScale(prev => Math.max(0.2, Math.min(4.0, prev + scaleDelta)));
    } else if (mode === 'sculpt') {
      // Sculpt stroke with finger / pen
      if (cameraRef.current && currentMeshRef.current) {
        raycaster.current.setFromCamera(mouse.current, cameraRef.current);
        const hits = raycaster.current.intersectObject(currentMeshRef.current, true);
        if (hits.length > 0) {
          handleSculptStroke(hits[0]);
        }
      }
    }
  };

  const handlePointerUp = () => {
    isPointerDown.current = false;
    lastSculptHitPoint.current = null;
  };

  // Mouse event wrappers
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    handlePointerDown(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    handlePointerMove(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
  };

  // Touch event wrappers (for mobile, tablet, and touch screens)
  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.touches.length === 1) {
      handlePointerDown(e.touches[0].clientX, e.touches[0].clientY, rect);
    } else if (e.touches.length === 2) {
      // 2-finger touch: prepare for pinch-to-zoom or pan
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDist.current = Math.hypot(dx, dy);
    }
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.touches.length === 1) {
      handlePointerMove(e.touches[0].clientX, e.touches[0].clientY, rect);
    } else if (e.touches.length === 2) {
      // Pinch gesture to scale model or zoom camera!
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const delta = (currentDist - touchStartDist.current) * 0.005;
      touchStartDist.current = currentDist;

      if (mode === 'scale' || mode === 'translate') {
        // Pinch-to-scale 3D Model with two fingers
        setModelScale(prev => Math.max(0.2, Math.min(4.0, prev + delta)));
      } else {
        // Pinch-to-zoom camera with two fingers
        cameraSpherical.current.radius = Math.max(2.5, Math.min(15, cameraSpherical.current.radius - delta * 3));
        updateCameraPosition();
      }
    }
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (mode === 'scale') {
      setModelScale(prev => Math.max(0.2, Math.min(4.0, prev - e.deltaY * 0.002)));
    } else {
      cameraSpherical.current.radius = Math.max(2.5, Math.min(15, cameraSpherical.current.radius + e.deltaY * 0.004));
      updateCameraPosition();
    }
  };

  // Add Keyframe
  const handleAddKeyframe = () => {
    const rotY = modelRot[1];
    const posY = modelPos[1];
    const scale = modelScale;
    setKeyframes(prev => [
      ...prev.filter(k => Math.abs(k.time - currentTime) > 0.1),
      { time: currentTime, rotY, posY, scale }
    ]);
    soundSynth.playCoin();
    addLog(`Stored Keyframe at t=${currentTime.toFixed(1)}s`, 'info');
  };

  // Export 3D Mesh as OBJ
  const exportOBJ = () => {
    const mesh = currentMeshRef.current;
    if (!mesh || !(mesh instanceof THREE.Mesh)) {
      addLog('Cannot export complex group directly as OBJ.', 'warn');
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
    } else {
      for (let i = 0; i < pos.count; i += 3) {
        obj += `f ${i + 1} ${i + 2} ${i + 3}\n`;
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
    addLog(`Exported 3D Model: ${primitive}_model.obj`, 'info');
  };

  const sculptBrushesList: { id: SculptBrush; label: string; icon: string }[] = [
    { id: 'inflate', label: t.labels.brushes?.inflate || 'Inflate', icon: '🎈' },
    { id: 'deflate', label: t.labels.brushes?.deflate || 'Deflate', icon: '🕳️' },
    { id: 'clay', label: t.labels.brushes?.clay || 'Clay', icon: '🧱' },
    { id: 'smooth', label: t.labels.brushes?.smooth || 'Smooth', icon: '✨' },
    { id: 'flatten', label: t.labels.brushes?.flatten || 'Flatten', icon: '📐' },
    { id: 'pinch', label: t.labels.brushes?.pinch || 'Pinch', icon: '🤏' },
    { id: 'grab', label: t.labels.brushes?.grab || 'Grab/Move', icon: '🖐️' },
    { id: 'crease', label: t.labels.brushes?.crease || 'Crease', icon: '⚡' },
    { id: 'snake', label: t.labels.brushes?.snake || 'Snake Hook', icon: '🐍' },
    { id: 'twist', label: t.labels.brushes?.twist || 'Twist', icon: '🌀' }
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#111318] relative overflow-hidden h-full">
      {/* 3D Viewport Top Navigation & Mode Switcher */}
      <div className="h-11 bg-[#171922] border-b border-[#252834] flex items-center justify-between px-3 text-xs shrink-0 select-none z-10">
        {/* Primitives Bar */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
          {([
            { id: 'cube', label: 'Cube' },
            { id: 'sphere', label: 'Sphere' },
            { id: 'cylinder', label: 'Cylinder' },
            { id: 'plane', label: 'Plane' },
            { id: 'mech', label: '🤖 Mech' },
            { id: 'parliament', label: '🏛️ Parliament' },
            { id: 'jet', label: '✈️ Jet Fighter' },
            { id: 'tank', label: '🛡️ Tank' },
            { id: 'skyscraper', label: '🏙️ Tower' },
            { id: 'satellite', label: '🛰️ Satellite' },
            { id: 'supercar', label: '🏎️ Supercar' },
            { id: 'throne', label: '👑 Throne' },
            { id: 'terrain', label: '⛰️ Terrain' }
          ] as { id: MeshPrimitiveType; label: string }[]).map(prim => (
            <button
              key={prim.id}
              onClick={() => {
                setPrimitive(prim.id);
                soundSynth.playLaser();
              }}
              className={`px-2.5 py-1 rounded text-xs capitalize cursor-pointer transition-colors whitespace-nowrap ${
                primitive === prim.id
                  ? 'bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/40'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#232632]'
              }`}
            >
              {prim.label}
            </button>
          ))}
        </div>

        {/* OBJ Export & Auto Rotate */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs cursor-pointer border ${
              autoRotate
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-[#232632] text-gray-400 border-transparent hover:text-gray-200'
            }`}
            title="Auto-rotate 3D Turntable"
          >
            <RefreshCw className={`w-3 h-3 ${autoRotate ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t.labels.autoRotate}</span>
          </button>

          <button
            onClick={exportOBJ}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#232632] hover:bg-[#2b2f3e] text-gray-300 border border-[#343846] cursor-pointer"
            title="Export as OBJ model"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Export .OBJ</span>
          </button>
        </div>
      </div>

      {/* Main Studio Interactive Canvas Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Three.js Canvas Container with full touch event listening */}
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
          {/* Top Interactive Mode Dock: Orbit, Move, Rotate, Scale, Sculpt */}
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
              <span>{t.labels.orbit}</span>
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
              <span>{t.labels.move}</span>
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
              <span>{t.labels.rotate}</span>
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
              <span>{t.labels.scale}</span>
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
              <span>{t.actions.sculpt}</span>
            </button>
          </div>

          {/* Touch Gesture Prompt / Active Tool Badge */}
          <div className="absolute top-16 left-3 pointer-events-none bg-black/70 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-gray-800 text-[11px] text-gray-300 flex items-center gap-2 z-10">
            {mode === 'orbit' && <span>📱 انگشت را روی صفحه بکشید تا دوربین بچرخد | ۲ انگشت برای زوم</span>}
            {mode === 'translate' && <span>🖐️ با لمس و کشیدن انگشت، مدل سه‌بعدی را در فضا جابجا کنید</span>}
            {mode === 'rotate' && <span>🔄 با لمس و کشیدن انگشت، مدل سه‌بعدی را بچرخانید</span>}
            {mode === 'scale' && <span>🔍 با کشیدن انگشت یا Pinch، مدل را بزرگ و کوچک کنید</span>}
            {mode === 'sculpt' && <span>🖌️ قلم مجسمه‌سازی: برای تغییر شکل و حجم مدل، انگشت را روی مدل بکشید</span>}
          </div>

          {/* SCULPTING BRUSHES PANEL (When Sculpt Mode is Active) */}
          {mode === 'sculpt' && (
            <div className="absolute bottom-4 left-4 bg-[#181a24]/95 backdrop-blur-md border border-[#323648] p-3 rounded-xl shadow-2xl flex flex-col gap-2.5 z-20 w-72 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#2d3142] pb-2">
                <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" />
                  <span>قلم‌های مجسمه‌سازی (SCULPT BRUSHES)</span>
                </span>
                <button
                  onClick={resetSculptGeometry}
                  className="text-[10px] text-gray-400 hover:text-amber-300 cursor-pointer flex items-center gap-1"
                  title="بازنشانی هندسه مدل به حالت اولیه"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>

              {/* 10 Sculpt Brushes Grid */}
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

              {/* Brush Settings: Radius & Strength */}
              <div className="pt-1 border-t border-[#2b2f3e] flex flex-col gap-2">
                <div>
                  <div className="flex justify-between text-[11px] text-gray-300 mb-1">
                    <span>{t.labels.brushSize}</span>
                    <span className="font-mono text-amber-400">{brushRadius.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.15"
                    max="1.8"
                    step="0.05"
                    value={brushRadius}
                    onChange={e => setBrushRadius(parseFloat(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-gray-300 mb-1">
                    <span>{t.labels.brushStrength}</span>
                    <span className="font-mono text-amber-400">{brushStrength.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.8"
                    step="0.05"
                    value={brushStrength}
                    onChange={e => setBrushStrength(parseFloat(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                </div>

                {/* X-Axis Symmetry Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-gray-300 flex items-center gap-1">
                    <Split className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t.labels.symmetry}</span>
                  </span>
                  <button
                    onClick={() => {
                      setSymmetryX(!symmetryX);
                      soundSynth.playCoin();
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] cursor-pointer font-medium ${
                      symmetryX ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50' : 'bg-[#252834] text-gray-400'
                    }`}
                  >
                    {symmetryX ? 'فعال (ON)' : 'غیرفعال'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TOUCH TRANSFORM ON-SCREEN D-PAD & QUICK SLIDERS (When in Translate, Rotate, or Scale mode) */}
          {(mode === 'translate' || mode === 'rotate' || mode === 'scale') && (
            <div className="absolute bottom-4 left-4 bg-[#181a24]/95 backdrop-blur-md border border-[#323648] p-3 rounded-xl shadow-2xl flex flex-col gap-2.5 z-20 w-72">
              <div className="flex items-center justify-between border-b border-[#2d3142] pb-1.5">
                <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5 uppercase">
                  {mode === 'translate' && <Move className="w-3.5 h-3.5 text-emerald-400" />}
                  {mode === 'rotate' && <RotateCw className="w-3.5 h-3.5 text-indigo-400" />}
                  {mode === 'scale' && <Maximize2 className="w-3.5 h-3.5 text-purple-400" />}
                  <span>کنترل دقیق لمسی ({mode})</span>
                </span>
                <button
                  onClick={resetAllTransforms}
                  className="text-[10px] text-gray-400 hover:text-cyan-300 cursor-pointer"
                  title="بازنشانی موقعیت"
                >
                  {t.labels.resetTransform}
                </button>
              </div>

              {/* Mode-specific on-screen touch controllers */}
              {mode === 'translate' && (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div className="bg-[#121319] p-1.5 rounded border border-[#2b2f3d]">
                      <span className="text-[10px] text-gray-400 block">X</span>
                      <span className="font-mono text-cyan-400 text-xs">{modelPos[0].toFixed(2)}</span>
                    </div>
                    <div className="bg-[#121319] p-1.5 rounded border border-[#2b2f3d]">
                      <span className="text-[10px] text-gray-400 block">Y</span>
                      <span className="font-mono text-emerald-400 text-xs">{modelPos[1].toFixed(2)}</span>
                    </div>
                    <div className="bg-[#121319] p-1.5 rounded border border-[#2b2f3d]">
                      <span className="text-[10px] text-gray-400 block">Z</span>
                      <span className="font-mono text-indigo-400 text-xs">{modelPos[2].toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Quick Directional Touch Buttons */}
                  <div className="grid grid-cols-3 gap-1 text-center pt-1">
                    <button
                      onClick={() => setModelPos(p => [p[0] - 0.25, p[1], p[2]])}
                      className="py-1 rounded bg-[#232734] hover:bg-cyan-600/30 text-gray-300 text-xs font-mono cursor-pointer"
                    >
                      -X چپ
                    </button>
                    <button
                      onClick={() => setModelPos(p => [p[0], p[1] + 0.25, p[2]])}
                      className="py-1 rounded bg-[#232734] hover:bg-emerald-600/30 text-gray-300 text-xs font-mono cursor-pointer"
                    >
                      +Y بالا
                    </button>
                    <button
                      onClick={() => setModelPos(p => [p[0] + 0.25, p[1], p[2]])}
                      className="py-1 rounded bg-[#232734] hover:bg-cyan-600/30 text-gray-300 text-xs font-mono cursor-pointer"
                    >
                      +X راست
                    </button>
                    <button
                      onClick={() => setModelPos(p => [p[0], p[1], p[2] - 0.25])}
                      className="py-1 rounded bg-[#232734] hover:bg-indigo-600/30 text-gray-300 text-xs font-mono cursor-pointer"
                    >
                      -Z جلو
                    </button>
                    <button
                      onClick={() => setModelPos(p => [p[0], Math.max(0, p[1] - 0.25), p[2]])}
                      className="py-1 rounded bg-[#232734] hover:bg-emerald-600/30 text-gray-300 text-xs font-mono cursor-pointer"
                    >
                      -Y پایین
                    </button>
                    <button
                      onClick={() => setModelPos(p => [p[0], p[1], p[2] + 0.25])}
                      className="py-1 rounded bg-[#232734] hover:bg-indigo-600/30 text-gray-300 text-xs font-mono cursor-pointer"
                    >
                      +Z عقب
                    </button>
                  </div>

                  <button
                    onClick={groundModelToFloor}
                    className="w-full py-1.5 mt-1 rounded bg-[#242836] hover:bg-emerald-600/30 text-emerald-400 text-xs cursor-pointer border border-[#34394c]"
                  >
                    {t.labels.groundModel}
                  </button>
                </div>
              )}

              {mode === 'rotate' && (
                <div className="flex flex-col gap-2">
                  <div>
                    <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                      <span>چرخش محور Y (افقی)</span>
                      <span className="font-mono text-indigo-400">{((modelRot[1] * 180) / Math.PI).toFixed(0)}°</span>
                    </div>
                    <input
                      type="range"
                      min={-Math.PI}
                      max={Math.PI}
                      step="0.05"
                      value={modelRot[1]}
                      onChange={e => setModelRot(r => [r[0], parseFloat(e.target.value), r[2]])}
                      className="w-full accent-indigo-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                      <span>چرخش محور X (عمودی)</span>
                      <span className="font-mono text-indigo-400">{((modelRot[0] * 180) / Math.PI).toFixed(0)}°</span>
                    </div>
                    <input
                      type="range"
                      min={-Math.PI}
                      max={Math.PI}
                      step="0.05"
                      value={modelRot[0]}
                      onChange={e => setModelRot(r => [parseFloat(e.target.value), r[1], r[2]])}
                      className="w-full accent-indigo-400"
                    />
                  </div>
                </div>
              )}

              {mode === 'scale' && (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-[11px] text-gray-300">
                    <span>مقیاس مدل (Scale Ratio)</span>
                    <span className="font-mono text-purple-400 font-bold">{modelScale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.5"
                    step="0.05"
                    value={modelScale}
                    onChange={e => setModelScale(parseFloat(e.target.value))}
                    className="w-full accent-purple-400"
                  />
                  <div className="flex gap-1.5 pt-1">
                    <button
                      onClick={() => setModelScale(0.5)}
                      className="flex-1 py-1 rounded bg-[#232734] hover:bg-purple-600/30 text-gray-300 text-xs font-mono cursor-pointer"
                    >
                      0.5x
                    </button>
                    <button
                      onClick={() => setModelScale(1.0)}
                      className="flex-1 py-1 rounded bg-[#232734] hover:bg-purple-600/30 text-gray-300 text-xs font-mono cursor-pointer"
                    >
                      1.0x
                    </button>
                    <button
                      onClick={() => setModelScale(1.5)}
                      className="flex-1 py-1 rounded bg-[#232734] hover:bg-purple-600/30 text-gray-300 text-xs font-mono cursor-pointer"
                    >
                      1.5x
                    </button>
                    <button
                      onClick={() => setModelScale(2.0)}
                      className="flex-1 py-1 rounded bg-[#232734] hover:bg-purple-600/30 text-gray-300 text-xs font-mono cursor-pointer"
                    >
                      2.0x
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Inspector & Material & Animation Panel */}
        <div className="w-full md:w-64 bg-[#15171f] border-t md:border-t-0 md:border-l border-[#242733] p-3 text-xs flex flex-col gap-4 overflow-y-auto shrink-0 select-none">
          <div className="font-semibold text-gray-200 border-b border-[#2b2f3d] pb-2 flex items-center justify-between">
            <span>{t.labels.properties}</span>
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
              {t.labels.resetTransform}
            </button>
          </div>

          {/* Material PBR */}
          <div className="flex flex-col gap-3">
            <span className="text-gray-400 font-medium text-[11px]">PBR MATERIAL</span>

            {/* Color */}
            <div className="flex items-center justify-between">
              <span className="text-gray-300">{t.labels.color}</span>
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
                <span>{t.labels.roughness}</span>
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
                <span>{t.labels.metalness}</span>
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
              <span className="text-gray-300">{t.actions.wireframe}</span>
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

          {/* Animation Timeline Section */}
          <div className="flex flex-col gap-2.5 border-t border-[#2b2f3d] pt-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 font-medium text-[11px]">{t.labels.keyframe}</span>
              <button
                onClick={handleAddKeyframe}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Key</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setTimelinePlaying(!timelinePlaying)}
                className="p-1.5 rounded bg-[#252834] text-cyan-400 hover:bg-[#303444] cursor-pointer"
              >
                {timelinePlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={currentTime}
                onChange={e => setCurrentTime(parseFloat(e.target.value))}
                className="flex-1 accent-indigo-400"
              />
              <span className="font-mono text-gray-400 text-[11px]">{currentTime.toFixed(1)}s</span>
            </div>

            {/* Keyframe markers */}
            <div className="flex flex-wrap gap-1">
              {keyframes.map((k, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setCurrentTime(k.time);
                    setModelRot(r => [r[0], k.rotY, r[2]]);
                    setModelPos(p => [p[0], k.posY, p[2]]);
                    setModelScale(k.scale || 1);
                  }}
                  className="px-1.5 py-0.5 rounded bg-[#262b38] text-[10px] text-cyan-300 cursor-pointer hover:bg-cyan-900/50"
                >
                  Key {idx + 1}: {k.time}s
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
