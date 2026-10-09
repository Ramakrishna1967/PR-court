import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface Hero3DCanvasProps {
  className?: string;
  onCaseIncrement?: (caseNum: number) => void;
}

export const Hero3DCanvas: React.FC<Hero3DCanvasProps> = ({ className, onCaseIncrement }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [caseNumber, setCaseNumber] = useState<number>(7618);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [particleDensity, setParticleDensity] = useState<'normal' | 'dense'>('normal');
  const [zoomLevel, setZoomLevel] = useState<number>(18);
  const [flashCase, setFlashCase] = useState<boolean>(false);

  // References to communicate with Three.js animation loop
  const speedRef = useRef(1);
  const zoomRef = useRef(18);
  const regenParticlesRef = useRef<((seed: number) => void) | null>(null);

  useEffect(() => {
    speedRef.current = speedMultiplier;
  }, [speedMultiplier]);

  useEffect(() => {
    zoomRef.current = zoomLevel;
  }, [zoomLevel]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animationFrameId: number;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, zoomRef.current);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Central Evidence Sphere (Dark reflective sphere)
    const sphereGeo = new THREE.SphereGeometry(2.4, 64, 64);
    const sphereMat = new THREE.MeshPhongMaterial({
      color: 0x111111,
      emissive: 0x050505,
      specular: 0xffffff,
      shininess: 120,
      wireframe: false
    });
    const evidenceSphere = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(evidenceSphere);

    // Outer thin blueprint wireframe ring around sphere
    const innerRingGeo = new THREE.TorusGeometry(3.2, 0.02, 16, 100);
    const innerRingMat = new THREE.MeshBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.4 });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    scene.add(innerRing);

    // Generative Orbital Particle Bands
    let prosecutionParticles: THREE.Points | null = null;
    let defenseParticles: THREE.Points | null = null;
    let orbitalTies: THREE.LineSegments | null = null;

    interface ParticleAngleData {
      angle: number;
      r: number;
      spreadY: number;
      speed: number;
    }

    let pAngleData: ParticleAngleData[] = [];
    let dAngleData: ParticleAngleData[] = [];

    function createParticles(seedOffset = 0) {
      if (prosecutionParticles) scene.remove(prosecutionParticles);
      if (defenseParticles) scene.remove(defenseParticles);
      if (orbitalTies) scene.remove(orbitalTies);

      const count = particleDensity === 'dense' ? 3600 : 2200;
      const pCount = count;
      const dCount = count;

      // Band 1: Prosecution (inclined orbital band)
      const pGeo = new THREE.BufferGeometry();
      const pPos = new Float32Array(pCount * 3);
      pAngleData = [];

      for (let i = 0; i < pCount; i++) {
        const angle = (i / pCount) * Math.PI * 2 + seedOffset;
        const r = 5.2 + (Math.random() - 0.5) * 1.8;
        const spreadY = (Math.random() - 0.5) * 0.9;

        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const y = x * 0.45 + spreadY;

        pPos[i * 3] = x;
        pPos[i * 3 + 1] = y;
        pPos[i * 3 + 2] = z;
        pAngleData.push({ angle, r, spreadY, speed: 0.005 + Math.random() * 0.003 });
      }
      pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
      const pMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.075,
        transparent: true,
        opacity: 0.85
      });
      prosecutionParticles = new THREE.Points(pGeo, pMat);
      scene.add(prosecutionParticles);

      // Band 2: Defense (opposing incline and tilt)
      const dGeo = new THREE.BufferGeometry();
      const dPos = new Float32Array(dCount * 3);
      dAngleData = [];

      for (let i = 0; i < dCount; i++) {
        const angle = (i / dCount) * Math.PI * 2 - seedOffset;
        const r = 5.6 + (Math.random() - 0.5) * 2.0;
        const spreadY = (Math.random() - 0.5) * 0.9;

        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const y = -x * 0.5 + spreadY;

        dPos[i * 3] = x;
        dPos[i * 3 + 1] = y;
        dPos[i * 3 + 2] = z;
        dAngleData.push({ angle, r, spreadY, speed: 0.004 + Math.random() * 0.003 });
      }
      dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
      const dMat = new THREE.PointsMaterial({
        color: 0xcccccc,
        size: 0.065,
        transparent: true,
        opacity: 0.7
      });
      defenseParticles = new THREE.Points(dGeo, dMat);
      scene.add(defenseParticles);

      // Coordinate grid line / scale axis
      const axisPoints = [
        new THREE.Vector3(-7, -3.5, 0),
        new THREE.Vector3(7, 3.5, 0),
        new THREE.Vector3(0, -6, 0),
        new THREE.Vector3(0, 6, 0)
      ];
      const axisGeo = new THREE.BufferGeometry().setFromPoints(axisPoints);
      const axisMat = new THREE.LineBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.35 });
      orbitalTies = new THREE.LineSegments(axisGeo, axisMat);
      scene.add(orbitalTies);
    }

    regenParticlesRef.current = createParticles;
    createParticles(0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x222222);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(10, 15, 10);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
    rimLight.position.set(-10, -10, -10);
    scene.add(rimLight);

    // Interactive dragging & click-to-regenerate
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let hasMovedMuch = false;
    let startPos = { x: 0, y: 0 };
    let targetRotationX = 0.2;
    let targetRotationY = 0.4;

    const dom = renderer.domElement;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      hasMovedMuch = false;
      startPos = { x: e.clientX, y: e.clientY };
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      if (Math.hypot(e.clientX - startPos.x, e.clientY - startPos.y) > 4) {
        hasMovedMuch = true;
      }

      targetRotationY += deltaX * 0.007;
      targetRotationX += deltaY * 0.007;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      if (isDragging && !hasMovedMuch) {
        setCaseNumber((prev) => {
          const next = prev + 1;
          onCaseIncrement?.(next);
          return next;
        });
        setFlashCase(true);
        setTimeout(() => setFlashCase(false), 600);
        createParticles(Math.random() * Math.PI * 2);
      }
      isDragging = false;
    };

    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Touch support
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        hasMovedMuch = false;
        startPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - previousMousePosition.x;
      const deltaY = e.touches[0].clientY - previousMousePosition.y;
      if (Math.hypot(e.touches[0].clientX - startPos.x, e.touches[0].clientY - startPos.y) > 5) {
        hasMovedMuch = true;
      }
      targetRotationY += deltaX * 0.007;
      targetRotationX += deltaY * 0.007;
      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const onTouchEnd = () => {
      if (isDragging && !hasMovedMuch) {
        setCaseNumber((prev) => {
          const next = prev + 1;
          onCaseIncrement?.(next);
          return next;
        });
        setFlashCase(true);
        setTimeout(() => setFlashCase(false), 600);
        createParticles(Math.random() * Math.PI * 2);
      }
      isDragging = false;
    };

    dom.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // Resize handler
    const onWindowResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onWindowResize);

    // Animation Loop
    let clock = 0;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const spd = speedRef.current;
      clock += 0.01 * spd;

      // Smooth camera zoom interpolation
      camera.position.z += (zoomRef.current - camera.position.z) * 0.1;

      scene.rotation.y += (targetRotationY - scene.rotation.y) * 0.08;
      scene.rotation.x += (targetRotationX - scene.rotation.x) * 0.08;

      if (!isDragging) {
        targetRotationY += 0.0015 * spd;
      }

      // Swirl opposing bands
      if (prosecutionParticles && pAngleData.length > 0) {
        const pos = prosecutionParticles.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < pAngleData.length; i++) {
          pAngleData[i].angle += pAngleData[i].speed * spd;
          const x = Math.cos(pAngleData[i].angle) * pAngleData[i].r;
          const z = Math.sin(pAngleData[i].angle) * pAngleData[i].r;
          const y = x * 0.45 + pAngleData[i].spreadY + Math.sin(clock + i) * 0.05;
          pos[i * 3] = x;
          pos[i * 3 + 1] = y;
          pos[i * 3 + 2] = z;
        }
        prosecutionParticles.geometry.attributes.position.needsUpdate = true;
      }

      if (defenseParticles && dAngleData.length > 0) {
        const pos = defenseParticles.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < dAngleData.length; i++) {
          dAngleData[i].angle -= dAngleData[i].speed * spd;
          const x = Math.cos(dAngleData[i].angle) * dAngleData[i].r;
          const z = Math.sin(dAngleData[i].angle) * dAngleData[i].r;
          const y = -x * 0.5 + dAngleData[i].spreadY + Math.cos(clock + i) * 0.05;
          pos[i * 3] = x;
          pos[i * 3 + 1] = y;
          pos[i * 3 + 2] = z;
        }
        defenseParticles.geometry.attributes.position.needsUpdate = true;
      }

      innerRing.rotation.x = clock * 0.2;
      innerRing.rotation.y = clock * 0.3;
      evidenceSphere.rotation.y = clock * 0.1;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', onWindowResize);
      renderer.dispose();
      if (container.contains(dom)) {
        container.removeChild(dom);
      }
    };
  }, [particleDensity]);

  const handleManualRegen = () => {
    setCaseNumber((prev) => {
      const next = prev + 1;
      onCaseIncrement?.(next);
      return next;
    });
    setFlashCase(true);
    setTimeout(() => setFlashCase(false), 600);
    if (regenParticlesRef.current) {
      regenParticlesRef.current(Math.random() * Math.PI * 2);
    }
  };

  return (
    <div className={`relative w-full h-[500px] lg:h-[530px] border border-white/[0.08] bg-[#0e0e11] overflow-hidden ${className || ''}`}>
      {/* HUD Overlays */}
      <div className="absolute top-3 left-3 z-20 font-telemetry-code text-[10px] uppercase tracking-widest text-zinc-400 border border-white/10 px-2.5 py-1 bg-[#0a0a0a]/80 backdrop-blur-sm pointer-events-none select-none">
        CASE · PR #1042
      </div>

      {/* Interactive HUD Control Strip on top right */}
      <div className="absolute top-3 right-3 z-20 font-telemetry-code text-[10px] flex items-center gap-1 bg-[#0a0a0a]/90 border border-white/10 p-1 backdrop-blur-sm">
        <span className="text-zinc-500 uppercase px-1 hidden sm:inline">ORBIT:</span>
        <button
          onClick={() => setSpeedMultiplier(s => s === 1 ? 2 : s === 2 ? 0.3 : 1)}
          className="px-1.5 py-0.5 border border-white/10 hover:border-white/30 text-zinc-300 text-[9px] uppercase"
          title="Toggle orbit rotation velocity"
        >
          {speedMultiplier === 1 ? '1x' : speedMultiplier === 2 ? '2x' : '0.3x'}
        </button>

        <button
          onClick={() => setZoomLevel(z => z === 18 ? 14 : z === 14 ? 22 : 18)}
          className="px-1.5 py-0.5 border border-white/10 hover:border-white/30 text-zinc-300 text-[9px] uppercase"
          title="Camera depth"
        >
          {zoomLevel === 18 ? 'ZOOM: 1x' : zoomLevel === 14 ? 'ZOOM: +IN' : 'ZOOM: -OUT'}
        </button>

        <button
          onClick={handleManualRegen}
          className="px-1.5 py-0.5 border border-white/20 bg-white/10 hover:bg-white/20 text-white text-[9px] uppercase font-semibold"
          title="Regenerate particle cloud and increment case"
        >
          RETRY
        </button>
      </div>

      <div className="absolute bottom-3 left-3 z-20 font-telemetry-code text-[11px] text-zinc-400 flex items-center gap-1.5 pointer-events-none select-none">
        <span className="material-symbols-outlined text-[14px]">touch_app</span>
        <span>Drag to rotate · Click to retry</span>
      </div>

      <div
        className={`absolute bottom-3 right-3 z-20 font-telemetry-code text-[10px] border px-2 py-0.5 select-none transition-all duration-300 ${
          flashCase
            ? 'bg-emerald-500 text-black border-emerald-400 scale-105 font-bold'
            : 'bg-[#1f1f22]/90 text-zinc-300 border-white/10'
        }`}
      >
        case {String(caseNumber).padStart(5, '0')}
      </div>

      {/* Blueprint Coordinate Crosshairs */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]"></div>

      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing block relative z-10" />
    </div>
  );
};
