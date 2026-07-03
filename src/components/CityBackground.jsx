import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";

// ============================================================================
//  FIXED 3D BACKGROUND — Kuala Lumpur skyline in WebGL (react-three-fiber).
//  Real extruded buildings with lit-window textures, the three KL landmarks
//  (Petronas Twin Towers, Merdeka 118, Menara KL / KL Tower), moonlight + haze,
//  and a camera that performs a slow drone-descent as the page scrolls.
// ============================================================================

const WINDOW_COLORS = ["#f9d67a", "#ffcf6b", "#ffe08a", "#8be9fd", "#bfe9ff", "#f0f6ff"];
const N_TEX = 6;

function makeRng(seed) {
  let s = seed % 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// One reusable building face: dark wall with a grid of windows, some lit.
// Tiled per-building via texture.repeat so window size stays roughly constant.
function makeWindowTexture(seed) {
  const rng = makeRng(seed);
  const W = 64, H = 128, cols = 4, rows = 8;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#0a0e20";
  ctx.fillRect(0, 0, W, H);
  const cw = W / cols, rh = H / rows;
  for (let col = 0; col < cols; col++) {
    for (let r = 0; r < rows; r++) {
      const lit = rng() > 0.46;
      ctx.fillStyle = lit
        ? WINDOW_COLORS[Math.floor(rng() * WINDOW_COLORS.length)]
        : "#151b34";
      ctx.fillRect(col * cw + 2.5, r * rh + 3, cw - 5, rh - 6);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function useCity() {
  return useMemo(() => {
    const textures = Array.from({ length: N_TEX }, (_, i) => makeWindowTexture(37 + i * 911));
    // landmark footprints to keep clear
    const keepClear = [
      { x: 10, z: -62, r: 22 },
      { x: -46, z: -82, r: 20 },
      { x: 56, z: -70, r: 16 },
    ];
    const rng = makeRng(1234);
    const buildings = [];
    for (let gz = 0; gz < 11; gz++) {
      const z = -18 - gz * 20;
      for (let gx = -7; gx <= 7; gx++) {
        if (rng() < 0.13) continue; // gaps in the block
        const x = gx * 15 + (rng() - 0.5) * 7;
        if (keepClear.some((k) => Math.hypot(x - k.x, z - k.z) < k.r)) continue;
        const w = 6 + rng() * 7;
        const d = 6 + rng() * 7;
        const tall = z < -120 ? 52 : 34;
        const h = 8 + rng() * rng() * tall;
        buildings.push({
          key: `${gx}_${gz}`,
          pos: [x, h / 2, z],
          scale: [w, h, d],
          texIndex: Math.floor(rng() * N_TEX),
          repeat: [Math.max(1, Math.round(w / 6)), Math.max(2, Math.round(h / 6))],
        });
      }
    }
    return { textures, buildings };
  }, []);
}

function Building({ pos, scale, texture, repeat }) {
  const tex = useMemo(() => {
    const t = texture.clone();
    t.needsUpdate = true;
    t.repeat.set(repeat[0], repeat[1]);
    return t;
  }, [texture, repeat]);
  return (
    <mesh position={pos} scale={scale} castShadow={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#0b0f24"
        map={tex}
        emissive="#ffffff"
        emissiveMap={tex}
        emissiveIntensity={0.9}
        roughness={0.85}
        metalness={0.1}
      />
    </mesh>
  );
}

// Shared look for the landmark shells (metallic bluish, faint self-glow).
const markMat = { color: "#232a52", metalness: 0.55, roughness: 0.4, emissive: "#0d1330", emissiveIntensity: 0.4 };
const ringMat = { color: "#8be9fd", emissive: "#8be9fd", emissiveIntensity: 1.6, toneMapped: false };

function PetronasTower({ x, z }) {
  return (
    <group position={[x, 0, z]}>
      {/* tapering stacked tiers */}
      <mesh position={[0, 24, 0]}>
        <cylinderGeometry args={[5.5, 6, 48, 16]} />
        <meshStandardMaterial {...markMat} />
      </mesh>
      <mesh position={[0, 58, 0]}>
        <cylinderGeometry args={[4, 4.6, 22, 16]} />
        <meshStandardMaterial {...markMat} />
      </mesh>
      <mesh position={[0, 76, 0]}>
        <cylinderGeometry args={[2.6, 3.4, 14, 16]} />
        <meshStandardMaterial {...markMat} />
      </mesh>
      {/* pinnacle cone + spire */}
      <mesh position={[0, 87, 0]}>
        <coneGeometry args={[2.4, 9, 16]} />
        <meshStandardMaterial {...markMat} />
      </mesh>
      <mesh position={[0, 96, 0]}>
        <cylinderGeometry args={[0.25, 0.5, 12, 8]} />
        <meshStandardMaterial color="#3a4270" />
      </mesh>
      <mesh position={[0, 102.5, 0]}>
        <sphereGeometry args={[0.9, 12, 12]} />
        <meshStandardMaterial color="#ffd27a" emissive="#ffb347" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      {/* lit setback rings */}
      <mesh position={[0, 48, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[5.6, 0.35, 8, 24]} />
        <meshStandardMaterial {...ringMat} />
      </mesh>
      <mesh position={[0, 69, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[4.1, 0.3, 8, 24]} />
        <meshStandardMaterial {...ringMat} />
      </mesh>
    </group>
  );
}

function Petronas({ x, z }) {
  const gap = 9;
  return (
    <group>
      <PetronasTower x={x - gap} z={z} />
      <PetronasTower x={x + gap} z={z} />
      {/* skybridge: two decks between the towers */}
      <mesh position={[x, 40, z]}>
        <boxGeometry args={[gap * 2, 1.2, 2]} />
        <meshStandardMaterial {...markMat} />
      </mesh>
      <mesh position={[x, 43, z]}>
        <boxGeometry args={[gap * 2, 1.2, 2]} />
        <meshStandardMaterial {...markMat} />
      </mesh>
    </group>
  );
}

function Merdeka({ x, z }) {
  return (
    <group position={[x, 0, z]}>
      {/* faceted tapering shaft */}
      <mesh position={[0, 55, 0]}>
        <cylinderGeometry args={[3.5, 8, 110, 6]} />
        <meshStandardMaterial {...markMat} />
      </mesh>
      {/* crown spire */}
      <mesh position={[0, 128, 0]}>
        <coneGeometry args={[3.2, 36, 6]} />
        <meshStandardMaterial {...markMat} />
      </mesh>
      <mesh position={[0, 150, 0]}>
        <cylinderGeometry args={[0.2, 0.4, 16, 6]} />
        <meshStandardMaterial color="#3a4270" />
      </mesh>
      <mesh position={[0, 158, 0]}>
        <sphereGeometry args={[0.9, 12, 12]} />
        <meshStandardMaterial color="#ff6b6b" emissive="#ff4d4d" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      {/* lit band near crown base */}
      <mesh position={[0, 110, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.6, 0.3, 8, 6]} />
        <meshStandardMaterial {...ringMat} />
      </mesh>
    </group>
  );
}

function KLTower({ x, z }) {
  return (
    <group position={[x, 0, z]}>
      {/* slender shaft */}
      <mesh position={[0, 40, 0]}>
        <cylinderGeometry args={[2, 3.2, 80, 20]} />
        <meshStandardMaterial {...markMat} />
      </mesh>
      {/* bulb pod (the "tuar" head) */}
      <mesh position={[0, 84, 0]}>
        <sphereGeometry args={[6, 20, 16]} />
        <meshStandardMaterial {...markMat} />
      </mesh>
      <mesh position={[0, 82, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[6.1, 0.4, 8, 28]} />
        <meshStandardMaterial {...ringMat} />
      </mesh>
      {/* antenna */}
      <mesh position={[0, 100, 0]}>
        <coneGeometry args={[0.6, 26, 12]} />
        <meshStandardMaterial color="#3a4270" />
      </mesh>
      <mesh position={[0, 114, 0]}>
        <sphereGeometry args={[0.8, 12, 12]} />
        <meshStandardMaterial color="#ff6b6b" emissive="#ff4d4d" emissiveIntensity={3} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Moon() {
  return (
    <group position={[85, 95, -230]}>
      <mesh>
        <sphereGeometry args={[16, 32, 32]} />
        <meshStandardMaterial color="#fdfbe8" emissive="#e7e2c4" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      <pointLight color="#cfd4ff" intensity={2.2} distance={600} decay={0} />
    </group>
  );
}

function CameraRig({ scroll }) {
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }) => {
    const p = scroll.current;
    // drone descent: start high looking over the skyline, sink toward street level
    const ty = 66 - p * 40;
    const tz = 152 - p * 46;
    camera.position.y += (ty - camera.position.y) * 0.06;
    camera.position.z += (tz - camera.position.z) * 0.06;
    camera.position.x += (0 - camera.position.x) * 0.06;
    target.set(0, 40 - p * 12, -70);
    camera.lookAt(target);
  });
  return null;
}

function Scene({ scroll }) {
  const { textures, buildings } = useCity();
  return (
    <>
      <color attach="background" args={["#0c0922"]} />
      <fog attach="fog" args={["#140f2e", 70, 340]} />

      {/* moonlight + ambient fill */}
      <ambientLight intensity={0.35} color="#4a4d80" />
      <directionalLight position={[80, 120, -40]} intensity={0.9} color="#aab0ff" />
      <hemisphereLight args={["#2a2660", "#05060f", 0.4]} />
      <Moon />

      <Stars radius={280} depth={80} count={1400} factor={4} saturation={0} fade speed={0.6} />

      {/* street/ground haze plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, -80]}>
        <planeGeometry args={[600, 500]} />
        <meshStandardMaterial color="#080a18" roughness={1} metalness={0} />
      </mesh>

      {/* generic city blocks */}
      {buildings.map((b) => (
        <Building key={b.key} pos={b.pos} scale={b.scale} texture={textures[b.texIndex]} repeat={b.repeat} />
      ))}

      {/* KL landmarks */}
      <Merdeka x={-46} z={-82} />
      <Petronas x={10} z={-62} />
      <KLTower x={56} z={-70} />

      <CameraRig scroll={scroll} />
    </>
  );
}

export default function CityBackground() {
  const scroll = useRef(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        scroll.current = p;
        doc.style.setProperty("--p", p.toFixed(4)); // still drives CSS (scroll-hint fade)
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="bg-scene" aria-hidden="true">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 66, 152], fov: 55, near: 0.1, far: 900 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Scene scroll={scroll} />
      </Canvas>
      <div className="vignette" />
    </div>
  );
}
