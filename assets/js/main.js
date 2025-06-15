import * as THREE from "three";
import { EffectComposer } from "/node_modules/three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "/node_modules/three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "/node_modules/three/examples/jsm/postprocessing/UnrealBloomPass.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.z = 4;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lumière
scene.add(new THREE.AmbientLight(0x222222));
const dirLight = new THREE.DirectionalLight(0xaaddff, 4);
dirLight.position.set(5, 3, 5);
scene.add(dirLight);

// const dirLight2 = new THREE.DirectionalLight(0x88ccff, 0.2);
// dirLight2.position.set(-5, -3, -5);
// scene.add(dirLight2);

// Chargement textures
const loader = new THREE.TextureLoader();
const earthMap = loader.load("/textures/8k_earth_daymap.jpg");
const bumpMap = loader.load("/textures/elev_bump_16k.jpg");
const specularMap = loader.load("/textures/8k_earth_specular_map.jpg");
const normalMap = loader.load("/textures/8k_earth_normal_map.jpg");
const cloudMap = loader.load("/textures/8k_earth_clouds.jpg");

// Matériau Terre
const earthGeometry = new THREE.SphereGeometry(1, 128, 128);
const earthMaterial = new THREE.MeshPhongMaterial({
  map: earthMap,
  bumpMap: bumpMap,
  normalMap: normalMap,
  bumpScale: 0.03,
  specularMap: specularMap,
  specular: new THREE.Color(0x444444),
  shininess: 15,
});
const earth = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earth);

// Nuages (un peu plus grands que la Terre)
const cloudGeometry = new THREE.SphereGeometry(1.02, 128, 128);
const cloudMaterial = new THREE.MeshPhongMaterial({
  map: cloudMap,
  transparent: true,
  opacity: 0.9, // <- Augmente ici pour rendre les nuages plus visibles
  depthWrite: false,
});
const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
scene.add(clouds);

// Atmosphère avec shader

const atmosphereGeometry = new THREE.SphereGeometry(1.05, 128, 128);
const atmosphereMaterial = new THREE.ShaderMaterial({
  vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
  fragmentShader: `
      uniform vec3 lightDirection;
      varying vec3 vNormal;

      void main() {
      // 1) Intensité radiale : glow plus fort sur le bord (limb)
      float rim = 0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0));
      rim = clamp(rim, 0.0, 1.0);
      rim = pow(rim, 3.2);          // adoucissement (>=3 = plus doux)

      // 2) Masque lumière/ombre : uniquement côté éclairé
      float litSide = max(dot(vNormal, lightDirection), 0.0);
      litSide = smoothstep(0.0, 0.5, litSide);  // transition douce

      // 3) Glow final = produit des deux facteurs
      float glow = rim * litSide;

      vec3 color = vec3(0.0, 0.35, 1.0) * glow;  // teinte bleue
      gl_FragColor = vec4(color, glow);         // alpha = glow pour bloom
      }
    `,
  uniforms: {
    lightDirection: { value: dirLight.position.clone().normalize() },
  },
  blending: THREE.AdditiveBlending,
  side: THREE.BackSide,
  transparent: true,
  depthWrite: false,
});
const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
scene.add(atmosphere);

// Bloom
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  2.0,
  0.8,
  0.9
);
composer.addPass(bloomPass);

// Animation
function animate() {
  requestAnimationFrame(animate);
  earth.rotation.y += 0.0012;
  clouds.rotation.y += 0.0012;
  atmosphere.rotation.y += 0.0035;
  composer.render();
}
animate();
