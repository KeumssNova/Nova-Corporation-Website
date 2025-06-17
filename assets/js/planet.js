import * as THREE from "three";
 import { EffectComposer } from "/node_modules/three/examples/jsm/postprocessing/EffectComposer.js";
 import { RenderPass } from "/node_modules/three/examples/jsm/postprocessing/RenderPass.js";
 import { UnrealBloomPass } from "/node_modules/three/examples/jsm/postprocessing/UnrealBloomPass.js";

// === SCENE & CAMERA ===
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 4;

// === RENDERER ===
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('planet-canvas'),
  antialias: true,
  alpha: true // permet de voir les étoiles derrière
});
renderer.setClearColor(0x000000, 0); // transparent
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

// === LIGHTS ===
scene.add(new THREE.AmbientLight(0x222222));
const dirLight = new THREE.DirectionalLight(0xaaddff, 4);
dirLight.position.set(5, 3, 5);
scene.add(dirLight);

// === TEXTURES ===
const loader = new THREE.TextureLoader();
const earthMap = loader.load("/textures/8k_earth_daymap.jpg");
const bumpMap = loader.load("/textures/elev_bump_16k.jpg");
const specularMap = loader.load("/textures/8k_earth_specular_map.jpg");
const normalMap = loader.load("/textures/8k_earth_normal_map.jpg");
const cloudMap = loader.load("/textures/8k_earth_clouds.jpg");
// const starfield = loader.load("/textures/8k_stars.jpg");

// === EARTH ===
const earthGeometry = new THREE.SphereGeometry(1, 264, 264);
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

// === CLOUDS ===
const cloudGeometry = new THREE.SphereGeometry(1.02, 128, 128);
const cloudMaterial = new THREE.MeshPhongMaterial({
  map: cloudMap,
  transparent: true,
  opacity: 0.9,
  depthWrite: false,
});
const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
scene.add(clouds);

// === STARFIELD SPHERE ===
// const starsGeometry = new THREE.SphereGeometry(50, 64, 64);
// const starsMaterial = new THREE.MeshBasicMaterial({
//   map: starfield,
//   side: THREE.BackSide,
//   transparent: true,
// });
// const stars = new THREE.Mesh(starsGeometry, starsMaterial);
// scene.add(stars);

function createStarField(count, radius) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const opacities = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = 2 * Math.PI * Math.random();
    const r = radius + (Math.random() - 0.5) * 0.5;

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    sizes[i] = 0.005 + Math.random() * 0.02; // taille entre 0.005 et 0.025
    opacities[i] = 0.3 + Math.random() * 0.7; // opacité entre 0.3 et 1
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(0xffffff) },
      texture: { value: new THREE.TextureLoader().load('/textures/8k_stars.jpg') },
    },
    vertexShader: `
      attribute float size;
      attribute float opacity;
      varying float vOpacity;
      void main() {
        vOpacity = opacity;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform sampler2D texture;
      varying float vOpacity;
      void main() {
        vec4 texColor = texture2D(texture, gl_PointCoord);
        if(texColor.a < 0.1) discard;
        gl_FragColor = vec4(color, vOpacity) * texColor;
      }
    `,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    transparent: true,
  });

  return new THREE.Points(geometry, material);
}

const stars = createStarField(1000, 10); 
scene.add(stars);

// === BLACK HALO ===

const spaceHaloGeometry = new THREE.SphereGeometry(1.07, 64, 64);
const spaceHaloMaterial = new THREE.MeshBasicMaterial({
  color: 0x000000,
  transparent: true,
  opacity: 0.6,
  side: THREE.BackSide,
  depthWrite: false,
});
const spaceHalo = new THREE.Mesh(spaceHaloGeometry, spaceHaloMaterial);
scene.add(spaceHalo);

// === ATMOSPHERE ===
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
      float rim = 0.7 - dot(vNormal, vec3(0.0, 0.0, 1.2));
      rim = clamp(rim, 0.0, 1.0);
      rim = pow(rim, 3.1);
      float litSide = max(dot(vNormal, lightDirection), 0.0);
      litSide = smoothstep(0.0, 0.5, litSide);
      float glow = rim * litSide;
      vec3 color = vec3(0.0, 0.5, 1.0) * glow;
      gl_FragColor = vec4(color, glow);
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






// === BLOOM ===
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

// === ANIMATION ===
function animate() {
  requestAnimationFrame(animate);
  earth.rotation.y += 0.0004;
  clouds.rotation.y += 0.0004;
  atmosphere.rotation.y += 0.0035;
  stars.rotation.y += 0.0001;
  composer.render();
}
animate();