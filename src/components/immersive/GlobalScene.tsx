import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Points, PointMaterial, AdaptiveDpr, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { sceneState } from "@/components/immersive/sceneState";
import planetTextureUrl from "@/assets/planet-surface.webp";
import cloudsTextureUrl from "@/assets/planet-clouds.webp";
import starfieldTextureUrl from "@/assets/starfield-sky.webp";

const lerp = THREE.MathUtils.lerp;

/* ------------------------------------------------------------------ *
 * Per-chapter art direction — each route is a distinct locale in the
 * same continuous star system. Planet position + rim glow shift as you
 * navigate, so the whole site reads as one journey through space.
 * ------------------------------------------------------------------ */
type Chapter = {
  planetPos: [number, number, number];
  planetScale: number;
  rim: string;
};

const CHAPTERS: Chapter[] = [
  { planetPos: [-6.5, -3.2, -11], planetScale: 5.4, rim: "#67e8f9" }, // /
  { planetPos: [6.8, -2.4, -13], planetScale: 4.6, rim: "#67e8f9" }, // programs
  { planetPos: [-7.2, 2.6, -14], planetScale: 4.0, rim: "#a9b6ff" }, // for-schools
  { planetPos: [7.6, 2.2, -12], planetScale: 5.0, rim: "#7ff0ff" }, // projects
  { planetPos: [-5.8, -3.6, -15], planetScale: 4.2, rim: "#818cf8" }, // partners
  { planetPos: [6.2, -3.0, -12], planetScale: 5.6, rim: "#67e8f9" }, // about
  { planetPos: [-6.0, 2.8, -13], planetScale: 4.4, rim: "#c0c8ff" }, // admissions
  { planetPos: [8.2, -1.0, -12], planetScale: 4.8, rim: "#67e8f9" }, // careers
];

function chapterAt(f: number): { a: Chapter; b: Chapter; t: number } {
  const max = CHAPTERS.length - 1;
  const c = Math.max(0, Math.min(max, f));
  const i = Math.floor(c);
  const j = Math.min(max, i + 1);
  return { a: CHAPTERS[i], b: CHAPTERS[j], t: c - i };
}

/* ------------------------------------------------------------------ *
 * Smoothing rig — eases pointer + chapter every frame and dollies the
 * camera through space as the reader scrolls the active page.
 * ------------------------------------------------------------------ */
function Rig() {
  const { camera } = useThree();
  useFrame((_, rawDt) => {
    // Clamp so a single stalled frame (e.g. right after mount, while textures
    // are still loading behind Suspense) can't apply a huge one-off jump —
    // without this, the first frame's delta could be much larger than normal
    // and everything below multiplies by it, showing up as a sudden fast
    // spin/jolt before settling into its normal smooth motion.
    const dt = Math.min(rawDt, 1 / 20);
    const k = Math.min(1, dt * 3.2);
    sceneState.px += (sceneState.tpx - sceneState.px) * k;
    sceneState.py += (sceneState.tpy - sceneState.py) * k;
    sceneState.chapter += (sceneState.targetChapter - sceneState.chapter) * Math.min(1, dt * 2.2);

    const p = sceneState.scrollP;
    // Dolly forward through the star layers as you scroll a page.
    camera.position.z = lerp(camera.position.z, 8 - p * 5, k);
    // Gentle cursor-driven look so the world feels handheld and alive.
    camera.position.x = lerp(camera.position.x, sceneState.px * 0.9, k);
    camera.position.y = lerp(camera.position.y, -sceneState.py * 0.6 + p * 0.4, k);
    camera.lookAt(0, 0, -6);
  });
  return null;
}

/* ------------------------------------------------------------------ *
 * Realistic star sky — an enormous inward-facing sphere wrapped in a
 * photographed Milky-Way panorama. It sits behind everything and rotates
 * very slowly, giving true deep-space depth with real stars & nebulae.
 * ------------------------------------------------------------------ */
function StarSky() {
  const tex = useTexture(starfieldTextureUrl);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = t * 0.004 + sceneState.px * 0.05;
    ref.current.rotation.x = -sceneState.py * 0.03;
  });
  return (
    <mesh ref={ref} scale={90} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[1, 48, 48]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} depthWrite={false} fog={false} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ *
 * Near-field parallax dust — a few sparse points close to the camera add
 * motion on top of the distant sky so the scene feels genuinely 3D.
 * ------------------------------------------------------------------ */
function StarLayer({
  count,
  spread,
  size,
  color,
  drift,
}: {
  count: number;
  spread: number;
  size: number;
  color: string;
  drift: number;
}) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * spread;
      arr[i * 3 + 1] = (Math.random() - 0.5) * spread;
      arr[i * 3 + 2] = (Math.random() - 0.5) * spread;
    }
    return arr;
  }, [count, spread]);

  const ref = useRef<THREE.Points>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const p = sceneState.scrollP;
    ref.current.rotation.y = state.clock.elapsedTime * 0.01 * drift;
    ref.current.position.z = p * drift * 12;
    ref.current.position.x = sceneState.px * drift * 0.8;
    ref.current.position.y = -sceneState.py * drift * 0.5;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={color}
        size={size}
        sizeAttenuation
        depthWrite={false}
        opacity={0.9}
      />
    </Points>
  );
}

// Arrival spin-up: every time the planet is sent to a new chapter (i.e. the
// reader navigates to a different page), it gets a dramatic extra spin that
// decays smoothly to zero while it eases into its new position — like a
// globe given a hard spin that winds down to a stop, rather than just
// sliding into place. BOOST_TURNS is the number of *extra* full rotations
// added on top of the normal continuous spin, over BOOST_DURATION seconds.
const BOOST_DURATION = 2.2;
const BOOST_TURNS = 1.5;
const BOOST_RADIANS = BOOST_TURNS * Math.PI * 2;

/* ------------------------------------------------------------------ *
 * Photoreal planet — a real Earth day map on a lit sphere with a slowly
 * drifting cloud layer. Lit only by the sun (directional light), so the
 * night side falls into shadow just like the real planet — no artificial
 * glow. Position + scale cross-fade between chapters as you move around.
 * ------------------------------------------------------------------ */
function Planet() {
  const group = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Mesh>(null);
  const clouds = useRef<THREE.Mesh>(null);
  // Tracks the last chapter we spun up for, and when that spin-up began.
  // Starting at null (rather than the actual initial target) means the very
  // first frame also counts as an "arrival", so the boost plays on first
  // load too, not just on later navigation.
  const lastTargetChapterRef = useRef<number | null>(null);
  const boostStartRef = useRef(0);

  const [tex, cloudTex] = useTexture([planetTextureUrl, cloudsTextureUrl]);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  cloudTex.wrapS = THREE.RepeatWrapping;
  cloudTex.wrapT = THREE.ClampToEdgeWrapping;
  cloudTex.anisotropy = 8;

  useFrame((state, rawDt) => {
    // Same clamp as Rig() above, and for the same reason: this component's
    // useFrame doesn't start ticking until the Suspense-gated textures above
    // have finished loading, so its first active frame can otherwise inherit
    // a much larger delta than normal and jump/spin abruptly.
    const dt = Math.min(rawDt, 1 / 20);
    const { a, b, t } = chapterAt(sceneState.chapter);

    if (lastTargetChapterRef.current !== sceneState.targetChapter) {
      lastTargetChapterRef.current = sceneState.targetChapter;
      boostStartRef.current = state.clock.elapsedTime;
    }
    const boostElapsed = state.clock.elapsedTime - boostStartRef.current;
    let boostVelocity = 0;
    if (boostElapsed < BOOST_DURATION) {
      // Ease-out cubic decay: the derivative of (1 - (1 - x)^3), so the extra
      // spin is fastest right at the start of the arrival and tapers
      // smoothly to exactly 0 by the end of BOOST_DURATION.
      const remaining = 1 - boostElapsed / BOOST_DURATION;
      boostVelocity = (BOOST_RADIANS * 3 * remaining * remaining) / BOOST_DURATION;
    }

    // Continuous drift, subtly accelerated by page scroll and by the
    // decaying arrival boost above, so the planet feels connected to the
    // reader's motion through the page (parallax) and gives each new page a
    // little "spinning in to rest" moment.
    if (spin.current)
      spin.current.rotation.y += dt * (0.02 + sceneState.scrollP * 0.05 + boostVelocity);
    if (clouds.current)
      clouds.current.rotation.y += dt * (0.026 + sceneState.scrollP * 0.06 + boostVelocity);

    if (group.current) {
      const px = lerp(a.planetPos[0], b.planetPos[0], t);
      const py = lerp(a.planetPos[1], b.planetPos[1], t);
      const pz = lerp(a.planetPos[2], b.planetPos[2], t);
      const sc = lerp(a.planetScale, b.planetScale, t);
      const k = Math.min(1, dt * 2.5);
      group.current.position.x = lerp(group.current.position.x, px + sceneState.px * 0.4, k);
      group.current.position.y = lerp(group.current.position.y, py - sceneState.py * 0.3, k);
      group.current.position.z = lerp(group.current.position.z, pz, k);
      const s = lerp(group.current.scale.x || sc, sc, k);
      group.current.scale.setScalar(s);
    }
  });

  return (
    <group
      ref={group}
      position={CHAPTERS[0].planetPos}
      scale={CHAPTERS[0].planetScale}
      renderOrder={-1}
    >
      <mesh ref={spin} rotation={[0.32, 0, 0.08]}>
        <sphereGeometry args={[1, 128, 128]} />
        <meshStandardMaterial map={tex} roughness={0.85} metalness={0.0} fog={false} />
      </mesh>
      {/* drifting cloud shell */}
      <mesh ref={clouds} rotation={[0.32, 0, 0.08]} scale={1.012}>
        <sphereGeometry args={[1, 96, 96]} />
        <meshStandardMaterial
          alphaMap={cloudTex}
          color="#ffffff"
          transparent
          opacity={0.9}
          roughness={1.0}
          metalness={0.0}
          depthWrite={false}
          fog={false}
        />
      </mesh>
    </group>
  );
}

function Scene() {
  const { size } = useThree();
  const scale = size.width < 768 ? 0.72 : 1;
  return (
    <group scale={scale}>
      <Rig />
      <StarSky />
      <Planet />
      <StarLayer count={400} spread={30} size={0.05} color="#ffffff" drift={1.2} />
      <StarLayer count={300} spread={22} size={0.035} color="#a9c4ff" drift={0.6} />
    </group>
  );
}

/**
 * GlobalScene — one persistent WebGL canvas that lives behind the entire
 * site. It never unmounts on navigation, so the camera flies continuously
 * through a single star system as the reader scrolls and moves between
 * routes. Fixed + pointer-events-none so all page content stays interactive.
 */
export default function GlobalScene() {
  return (
    <Canvas
      className="!fixed inset-0 -z-10"
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 8], fov: 48 }}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: -10,
        pointerEvents: "none",
      }}
      onCreated={() => {
        // The canvas mounts lazily AFTER the page content has painted. Some
        // browsers fail to recomposite already-painted content above this new
        // fixed WebGL layer, leaving the hero blank until the next repaint.
        // Nudge a harmless repaint on the next two frames to force it.
        const forceRepaint = () => {
          const el = document.documentElement;
          const prev = el.style.transform;
          el.style.transform = "translateZ(0)";
          // Read back to flush, then restore.
          void el.offsetHeight;
          el.style.transform = prev;
        };
        requestAnimationFrame(() => requestAnimationFrame(forceRepaint));
      }}
    >
      <AdaptiveDpr pixelated />
      {/* Ambient is intentionally low (real day/night contrast, not a flat-lit
          toy globe) but 0.12 left the shadowed hemisphere so dark relative to
          the sunlit side that the terminator line read as a stark two-tone
          band rather than a falloff. Raised just enough to soften that. */}
      <ambientLight intensity={0.32} />
      <directionalLight position={[6, 3, 5]} intensity={3.2} color="#fff6e8" />
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  );
}
