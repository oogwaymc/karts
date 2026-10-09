import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeVertices, mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Mail, Check, Copy, X } from 'lucide-react';

interface HeroSceneProps {
  onOpenPortfolio: () => void;
  onTriggerSpeedSlider?: () => void;
}

export const HeroScene: React.FC<HeroSceneProps> = ({ onOpenPortfolio, onTriggerSpeedSlider }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [clickSeq, setClickSeq] = useState<string>('');

  const registerDigit = (d: string) => {
    const next = (clickSeq + d).slice(-4);
    setClickSeq(next);
    if (next === '2411' && onTriggerSpeedSlider) {
      onTriggerSpeedSlider();
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
        registerDigit(e.key);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [clickSeq]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let destroyed = false;
    const MODEL_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260929_212926_92423081-b0e4-4f5a-b650-14af6c05c058.glb';

    /* ---------- renderer / camera ---------- */
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setClearColor(0x000000, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const FOV = 30;
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);

    /* ---------- background headline (NO "Live Laugh Larp") ---------- */
    const hCanvas = document.createElement('canvas');
    const hCtx = hCanvas.getContext('2d')!;
    let hTex: THREE.CanvasTexture | null = null;

    const bgScene = new THREE.Scene();
    const bgCam = new THREE.Camera();
    const bgMat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: null } },
      vertexShader: `
        varying vec2 vUv;
        void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
      `,
      fragmentShader: `
        uniform sampler2D uTex;
        varying vec2 vUv;
        void main(){
          gl_FragColor = texture2D(uTex, vUv);
          #include <colorspace_fragment>
        }
      `,
      depthTest: false,
      depthWrite: false
    });
    const bgQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
    bgQuad.frustumCulled = false;
    bgScene.add(bgQuad);

    function isMobile(W: number, H: number) { return W < 768 || (W / H) < 1; }

    function drawHeadline(W: number, H: number, dpr: number) {
      const mobile = isMobile(W, H);
      const w = Math.max(1, Math.round(W * dpr));
      const h = Math.max(1, Math.round(H * dpr));
      if (hCanvas.width !== w || hCanvas.height !== h) {
        hCanvas.width = w; hCanvas.height = h;
      }
      const ctx = hCtx;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);

      // Restored Live Laugh Larp on home page
      const lines = ['Live', 'Laugh', 'Larp'];
      let fs = Math.min(H * 0.21, W * (mobile ? 0.21 : 0.118));
      ctx.font = `800 ${fs}px Poppins, sans-serif`;
      let widest = Math.max(...lines.map(l => ctx.measureText(l).width));
      const maxW = W * (mobile ? 0.9 : 0.5);
      if (widest > maxW) {
        fs *= maxW / widest;
        ctx.font = `800 ${fs}px Poppins, sans-serif`;
      }
      ctx.fillStyle = '#e9e9e9';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      const cx = W * (mobile ? 0.5 : 0.505);
      const cy = H * (mobile ? 0.45 : 0.468);
      const gap = fs * 1.07;
      const cap = fs * 0.7;
      lines.forEach((l, i) => {
        ctx.fillText(l, cx, cy + cap / 2 + (i - (lines.length - 1) / 2) * gap);
      });

      if (hTex) hTex.dispose();
      hTex = new THREE.CanvasTexture(hCanvas);
      hTex.colorSpace = THREE.SRGBColorSpace;
      hTex.minFilter = THREE.LinearFilter;
      hTex.magFilter = THREE.LinearFilter;
      hTex.generateMipmaps = false;
      hTex.needsUpdate = true;
      bgMat.uniforms.uTex.value = hTex;
    }

    /* ---------- render targets ---------- */
    function makeRT() {
      return new THREE.WebGLRenderTarget(2, 2, {
        type: THREE.HalfFloatType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        depthBuffer: false,
        generateMipmaps: false
      });
    }
    const rtBack = makeRT();
    const rtFront = makeRT();

    /* ---------- glass material ---------- */
    const glassVert = `
      varying vec3 vNormal;
      varying vec3 vEye;
      void main(){
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vec4 mvPos = viewMatrix * worldPos;
        gl_Position = projectionMatrix * mvPos;
        vNormal = normalize(normalMatrix * normal);
        vEye = normalize(mvPos.xyz);
      }
    `;
    const glassFrag = `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uIorR, uIorY, uIorG, uIorC, uIorB, uIorP;
      uniform float uRefractPower, uChromatic, uSaturation;
      uniform float uShininess, uDiffuseness, uFresnelPower;
      uniform vec3 uLight;
      uniform float uBackside;
      varying vec3 vNormal;
      varying vec3 vEye;

      const int LOOP = 16;

      float specular(vec3 light, float shininess, float diffuseness, vec3 n, vec3 eye){
        vec3 lightVec = normalize(-light);
        vec3 viewVec = -eye;
        vec3 halfVec = normalize(lightVec + viewVec);
        float s = pow(max(dot(n, halfVec), 0.0), shininess);
        s += max(0.0, dot(n, lightVec)) * diffuseness;
        return s;
      }

      void main(){
        vec2 uv = gl_FragCoord.xy / uResolution;
        vec3 n = normalize(vNormal);
        if (uBackside > 0.5) n = -n;
        vec3 eye = normalize(vEye);

        vec3 color = vec3(0.0);
        for (int i = 0; i < LOOP; i++){
          float slide = float(i) / float(LOOP) * 0.045;

          vec3 rR = refract(eye, n, 1.0 / uIorR);
          vec3 rY = refract(eye, n, 1.0 / uIorY);
          vec3 rG = refract(eye, n, 1.0 / uIorG);
          vec3 rC = refract(eye, n, 1.0 / uIorC);
          vec3 rB = refract(eye, n, 1.0 / uIorB);
          vec3 rP = refract(eye, n, 1.0 / uIorP);

          vec3 tR = texture2D(uTexture, uv + rR.xy * (uRefractPower + slide * 1.0) * uChromatic).rgb;
          vec3 tY = texture2D(uTexture, uv + rY.xy * (uRefractPower + slide * 1.0) * uChromatic).rgb;
          vec3 tG = texture2D(uTexture, uv + rG.xy * (uRefractPower + slide * 2.0) * uChromatic).rgb;
          vec3 tC = texture2D(uTexture, uv + rC.xy * (uRefractPower + slide * 2.5) * uChromatic).rgb;
          vec3 tB = texture2D(uTexture, uv + rB.xy * (uRefractPower + slide * 3.0) * uChromatic).rgb;
          vec3 tP = texture2D(uTexture, uv + rP.xy * (uRefractPower + slide * 1.0) * uChromatic).rgb;

          float r = tR.x * 0.5;
          float y = (tY.x * 2.0 + tY.y * 2.0 - tY.z) / 6.0;
          float g = tG.y * 0.5;
          float c = (tC.y * 2.0 + tC.z * 2.0 - tC.x) / 6.0;
          float b = tB.z * 0.5;
          float p = (tP.z * 2.0 + tP.x * 2.0 - tP.y) / 6.0;

          float R = r + (2.0 * p + 2.0 * y - c) / 3.0;
          float G = g + (2.0 * y + 2.0 * c - p) / 3.0;
          float B = b + (2.0 * c + 2.0 * p - y) / 3.0;

          color += vec3(R, G, B);
        }
        color /= float(LOOP);

        float luma = dot(color, vec3(0.2125, 0.7154, 0.0721));
        color = mix(vec3(luma), color, uSaturation);

        float spec = specular(uLight, uShininess, uDiffuseness, n, eye)
                   + 0.6 * specular(vec3(1.0, 1.0, -1.0), uShininess * 0.6, uDiffuseness * 0.5, n, eye);
        color += spec * (uBackside > 0.5 ? 0.35 : 1.0);

        float f = pow(1.0 + dot(eye, n), uFresnelPower);
        color = mix(color, vec3(1.0), f * (uBackside > 0.5 ? 0.25 : 0.55));

        color += vec3(0.004, 0.005, 0.007);
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `;

    function makeGlass(back: boolean) {
      return new THREE.ShaderMaterial({
        vertexShader: glassVert,
        fragmentShader: glassFrag,
        side: back ? THREE.BackSide : THREE.FrontSide,
        uniforms: {
          uTexture: { value: null },
          uResolution: { value: new THREE.Vector2(1, 1) },
          uIorR: { value: 1.15 }, uIorY: { value: 1.16 }, uIorG: { value: 1.18 },
          uIorC: { value: 1.22 }, uIorB: { value: 1.22 }, uIorP: { value: 1.22 },
          uRefractPower: { value: back ? 0.22 : 0.30 },
          uChromatic: { value: 0.5 },
          uSaturation: { value: 1.08 },
          uShininess: { value: 90 },
          uDiffuseness: { value: 0.02 },
          uFresnelPower: { value: 5.0 },
          uLight: { value: new THREE.Vector3(-1, 1, 1) },
          uBackside: { value: back ? 1 : 0 }
        }
      });
    }
    const backMat = makeGlass(true);
    const frontMat = makeGlass(false);
    backMat.uniforms.uTexture.value = rtBack.texture;
    frontMat.uniforms.uTexture.value = rtFront.texture;

    /* ---------- scene graph ---------- */
    const scene = new THREE.Scene();
    const pivot = new THREE.Group();
    const spinner = new THREE.Group();
    scene.add(pivot);
    pivot.add(spinner);
    spinner.rotation.set(-0.42, 0.62, 0.18);
    let cube: THREE.Mesh | null = null;

    function setCube(geometry: THREE.BufferGeometry) {
      geometry.computeBoundingBox();
      const box = geometry.boundingBox!;
      const center = new THREE.Vector3();
      box.getCenter(center);
      geometry.translate(-center.x, -center.y, -center.z);
      const size = new THREE.Vector3();
      box.getSize(size);
      const m = Math.max(size.x, size.y, size.z) || 1;
      geometry.scale(1 / m, 1 / m, 1 / m);
      cube = new THREE.Mesh(geometry, frontMat);
      cube.frustumCulled = false;
      spinner.add(cube);
      setModelLoaded(true);
    }

    function useFallback() {
      const g = new RoundedBoxGeometry(1, 1, 1, 8, 0.12);
      g.deleteAttribute('uv');
      setCube(g);
    }

    new GLTFLoader().load(
      MODEL_URL,
      (gltf) => {
        if (destroyed) return;
        try {
          gltf.scene.updateMatrixWorld(true);
          const parts: THREE.BufferGeometry[] = [];
          gltf.scene.traverse((o: any) => {
            if (o.isMesh) {
              let g = o.geometry.clone();
              ['uv', 'color', 'tangent'].forEach(a => { if (g.attributes[a]) g.deleteAttribute(a); });
              Object.keys(g.attributes).forEach(k => {
                if (!['position', 'normal'].includes(k)) g.deleteAttribute(k);
              });
              g = mergeVertices(g, 1e-4);
              g.computeVertexNormals();
              g.applyMatrix4(o.matrixWorld);
              parts.push(g);
            }
          });
          if (!parts.length) throw new Error('no meshes');
          const merged = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
          if (!merged) throw new Error('merge failed');
          setCube(merged);
        } catch (e) {
          useFallback();
        }
      },
      undefined,
      () => {
        if (!destroyed) useFallback();
      }
    );

    /* ---------- layout ---------- */
    const dbSize = new THREE.Vector2();
    function layout() {
      if (destroyed) return;
      const W = Math.max(1, window.innerWidth);
      const H = Math.max(1, window.innerHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();

      renderer.getDrawingBufferSize(dbSize);
      rtBack.setSize(dbSize.x, dbSize.y);
      rtFront.setSize(dbSize.x, dbSize.y);
      backMat.uniforms.uResolution.value.copy(dbSize);
      frontMat.uniforms.uResolution.value.copy(dbSize);

      drawHeadline(W, H, dpr);

      const mobile = isMobile(W, H);
      const visH = 2 * Math.tan(THREE.MathUtils.degToRad(FOV) / 2) * 10;
      const visW = visH * camera.aspect;
      const sx = mobile ? 0.5 : 0.517;
      const sy = mobile ? 0.45 : 0.488;
      pivot.position.set((sx - 0.5) * visW, (0.5 - sy) * visH, 0);
      const px = Math.min(H * 0.44, W * (mobile ? 0.45 : 0.29));
      pivot.scale.setScalar((px / H) * visH);
    }

    /* ---------- interaction ---------- */
    const AX = new THREE.Vector3(1, 0, 0);
    const AY = new THREE.Vector3(0, 1, 0);
    const qTmp = new THREE.Quaternion();

    function rotateWorld(dx: number, dy: number) {
      if (dx) { qTmp.setFromAxisAngle(AY, dx); spinner.quaternion.premultiply(qTmp); }
      if (dy) { qTmp.setFromAxisAngle(AX, dy); spinner.quaternion.premultiply(qTmp); }
    }

    let dragging = false, lastX = 0, lastY = 0, lastT = 0;
    let velX = 0, velY = 0;
    let releaseTime = performance.now() - 1600;
    let spinRemaining = 0;

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      spinRemaining = 0;
      velX = velY = 0;
      lastX = e.clientX; lastY = e.clientY; lastT = performance.now();
      canvas.classList.add('cursor-grabbing');
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const now = performance.now();
      const dx = (e.clientX - lastX) * 0.008;
      const dy = (e.clientY - lastY) * 0.008;
      rotateWorld(dx, dy);
      const dtFrames = Math.max((now - lastT) / 16.67, 0.25);
      const vx = dx / dtFrames, vy = dy / dtFrames;
      velX = velX * 0.5 + vx * 0.5;
      velY = velY * 0.5 + vy * 0.5;
      lastX = e.clientX; lastY = e.clientY; lastT = now;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      canvas.classList.remove('cursor-grabbing');
      releaseTime = performance.now();
      if (performance.now() - lastT > 80) { velX = velY = 0; }
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    layout();
    window.addEventListener('resize', layout);

    /* ---------- animation frame ---------- */
    let last = performance.now();
    let animId: number;

    function frame(now: number) {
      if (destroyed) return;
      animId = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const f = dt * 60;

      if (!dragging) {
        if (spinRemaining !== 0) {
          const step = spinRemaining * Math.min(1, 0.09 * f);
          rotateWorld(step, 0);
          spinRemaining -= step;
          if (Math.abs(spinRemaining) < 0.0005) spinRemaining = 0;
        } else {
          // inertia
          if (Math.abs(velX) > 1e-5 || Math.abs(velY) > 1e-5) {
            rotateWorld(velX * f, velY * f);
            const damp = Math.pow(0.94, f);
            velX *= damp; velY *= damp;
          }
          // idle drift
          const since = (now - releaseTime) / 1000;
          const blend = Math.min(Math.max((since - 0.6) / 1.0, 0), 1);
          if (blend > 0) rotateWorld(0.0035 * blend * f, 0.0012 * blend * f);
        }
      }

      // pass 1: background -> rtBack
      renderer.autoClear = true;
      renderer.setRenderTarget(rtBack);
      renderer.render(bgScene, bgCam);

      if (cube) {
        // pass 2: background + back faces -> rtFront
        renderer.setRenderTarget(rtFront);
        renderer.autoClear = true;
        renderer.render(bgScene, bgCam);
        renderer.autoClear = false;
        cube.material = backMat;
        renderer.render(scene, camera);
      } else {
        renderer.setRenderTarget(rtFront);
        renderer.autoClear = true;
        renderer.render(bgScene, bgCam);
      }

      // pass 3: background + front faces -> screen
      renderer.setRenderTarget(null);
      renderer.autoClear = true;
      renderer.render(bgScene, bgCam);
      if (cube) {
        renderer.autoClear = false;
        renderer.clearDepth();
        cube.material = frontMat;
        renderer.render(scene, camera);
      }
      renderer.autoClear = true;
    }

    animId = requestAnimationFrame(frame);

    return () => {
      destroyed = true;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', layout);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      renderer.dispose();
      rtBack.dispose();
      rtFront.dispose();
      if (hTex) hTex.dispose();
    };
  }, []);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText('1@jacjones.net');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white select-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-grab" />

      {/* Top Navbar */}
      <header className="absolute top-6 sm:top-10 left-6 sm:left-14 right-6 sm:right-14 flex items-center justify-between z-20 pointer-events-auto">
        <a href="#" className="flex items-center gap-2 text-white font-semibold tracking-tight text-base sm:text-lg">
          <i className="w-5 h-9 bg-white rounded-r-full block" />
          <b className="font-bold">Jac</b>
          <span className="font-light">Jones</span>
        </a>

        <ul className="flex items-center gap-6 sm:gap-12 text-sm sm:text-base font-medium">
          <li>
            <a href="#" className="hover:text-zinc-300 transition-colors">
              Home
            </a>
          </li>
          <li>
            <button
              onClick={onOpenPortfolio}
              className="hover:text-zinc-300 transition-colors cursor-pointer"
            >
              Portfolio
            </button>
          </li>
          <li>
            <button
              onClick={() => setContactOpen(true)}
              className="hover:text-zinc-300 transition-colors cursor-pointer"
            >
              Contact Us
            </button>
          </li>
        </ul>
      </header>

      {/* Slide indicators */}
      <div className="absolute right-6 sm:right-14 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-20">
        <div className="w-3 h-3 rounded-full border-2 border-white bg-white" />
        <div className="w-3 h-3 rounded-full border-2 border-white bg-transparent" />
        <div className="w-3 h-3 rounded-full border-2 border-white bg-white" />
      </div>

      {/* Bottom Tagline & Explore CTA */}
      <div className="absolute left-6 sm:left-14 bottom-10 sm:bottom-16 z-20 pointer-events-auto flex flex-col sm:flex-row items-start sm:items-end justify-between right-6 sm:right-14">
        <div>
          <span className="text-xs uppercase tracking-[0.25em] text-zinc-400 block mb-2 font-mono">
            Time Trial Grand Prix
          </span>
          <h2 className="text-2xl sm:text-4xl font-light tracking-tight max-w-md leading-tight">
            Precision engineering meets <strong className="font-bold">pure adrenaline.</strong>
          </h2>
        </div>

        <div className="mt-6 sm:mt-0 flex items-center gap-6">
          <button
            onClick={onOpenPortfolio}
            className="px-6 h-12 rounded-lg border border-white/80 bg-black/30 hover:bg-white hover:text-black transition-all flex items-center justify-center font-medium text-sm tracking-wide shadow-xl cursor-pointer"
          >
            Explore Now
          </button>
          <div className="hidden lg:block w-32 h-px bg-white/60" />
          <div className="flex items-baseline gap-2 select-none">
            <div className="text-7xl sm:text-9xl font-black text-transparent [-webkit-text-stroke:1.5px_rgba(255,255,255,0.8)] font-racing leading-none">
              <button
                type="button"
                onClick={() => registerDigit('2')}
                className="hover:scale-105 active:opacity-50 transition-transform cursor-pointer focus:outline-none"
                title="2"
              >
                2
              </button>
              <button
                type="button"
                onClick={() => registerDigit('4')}
                className="hover:scale-105 active:opacity-50 transition-transform cursor-pointer focus:outline-none"
                title="4"
              >
                4
              </button>
            </div>
            <div className="flex gap-1 text-2xl sm:text-3xl font-black text-transparent [-webkit-text-stroke:1.2px_rgba(255,255,255,0.5)] font-racing opacity-75">
              <button
                type="button"
                onClick={() => registerDigit('1')}
                className="hover:scale-110 active:opacity-50 transition-transform cursor-pointer focus:outline-none px-0.5"
                title="1"
              >
                1
              </button>
              <button
                type="button"
                onClick={() => registerDigit('1')}
                className="hover:scale-110 active:opacity-50 transition-transform cursor-pointer focus:outline-none px-0.5"
                title="1"
              >
                1
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      {contactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-zinc-950/95 border border-white/20 rounded-2xl p-8 sm:p-10 text-center shadow-2xl">
            <button
              onClick={() => setContactOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <small className="block text-xs uppercase tracking-[0.25em] text-zinc-400 mb-2">
              Get in touch
            </small>
            <a
              href="mailto:1@jacjones.net"
              className="block text-2xl sm:text-4xl font-bold tracking-tight hover:underline my-4"
            >
              1@jacjones.net
            </a>

            <div className="flex gap-4 justify-center mt-6">
              <a
                href="mailto:1@jacjones.net"
                className="px-6 h-11 rounded-lg border border-white/80 hover:bg-white hover:text-black flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <Mail className="w-4 h-4" /> Send email
              </a>
              <button
                onClick={handleCopyEmail}
                className="px-6 h-11 rounded-lg bg-white text-black hover:bg-zinc-200 flex items-center gap-2 text-sm font-semibold transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
