import * as THREE from "https://esm.sh/three@0.158.0";
import { EffectComposer } from "https://esm.sh/three@0.158.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://esm.sh/three@0.158.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://esm.sh/three@0.158.0/examples/jsm/postprocessing/UnrealBloomPass.js";




// === QUALITE (fallback mobile / GPU faible) ===
// Pas de detection par user-agent (peu fiable) : on se base sur des
// signaux materiels/d'entree. Un faux positif (desktop bascule en
// "low") coute juste un peu de finesse visuelle ; un faux negatif
// (mobile bas de gamme en pleine qualite) coute des frames perdues.
const isLowPower =
  window.matchMedia('(pointer: coarse)').matches ||
  window.innerWidth <= 768 ||
  (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

const QUALITY = isLowPower
  ? {
      earthSegments: 64,
      cloudSegments: 32,
      atmosphereSegments: 32,
      haloSegments: 24,
      starCount: 350,
      pixelRatio: 1,
      antialias: false,
      bloom: false,
    }
  : {
      earthSegments: 264,
      cloudSegments: 128,
      atmosphereSegments: 128,
      haloSegments: 64,
      starCount: 1000,
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      antialias: true,
      bloom: true,
    };

// === SCENE & CAMERA ===
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 4;

// === RENDERER ===
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('planet-canvas'),
  antialias: QUALITY.antialias,
  alpha: true // permet de voir les étoiles derrière
});
renderer.setClearColor(0x000000, 0); // transparent
renderer.setPixelRatio(QUALITY.pixelRatio);
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
const nightMap = loader.load("/textures/8k_earth_nightmap.jpg");
// const starfield = loader.load("/textures/8k_stars.jpg");

// === EARTH ===
const earthGeometry = new THREE.SphereGeometry(1, QUALITY.earthSegments, QUALITY.earthSegments);
const earthMaterial = new THREE.MeshPhongMaterial({
  map: earthMap,
  bumpMap: bumpMap,
  normalMap: normalMap,
  bumpScale: 0.03,
  specularMap: specularMap,
  specular: new THREE.Color(0x444444),
  shininess: 15,
});

// Blend jour/nuit : injecte les lumieres de ville sur la face cachee du
// soleil directement dans le shader Phong genere par Three.js, pour ne
// pas perdre le bump/normal/specular deja en place.
earthMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.nightMap = { value: nightMap };
  // direction du soleil en espace monde (fixe, la Terre tourne autour)
  shader.uniforms.nightLightDirection = {
    value: dirLight.position.clone().normalize(),
  };

  shader.vertexShader = shader.vertexShader
    .replace(
      "#include <common>",
      `#include <common>
       varying vec3 vWorldNormal;`
    )
    .replace(
      "#include <defaultnormal_vertex>",
      `#include <defaultnormal_vertex>
       vWorldNormal = normalize(mat3(modelMatrix) * normal);`
    );

  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
       uniform sampler2D nightMap;
       uniform vec3 nightLightDirection;
       varying vec3 vWorldNormal;`
    )
    .replace(
      "#include <dithering_fragment>",
      `
       float sunFacing = dot(vWorldNormal, nightLightDirection);
       float dayMix = smoothstep(-0.15, 0.15, sunFacing);
       vec3 nightColor = texture2D(nightMap, vMapUv).rgb;
       gl_FragColor.rgb = mix(nightColor, gl_FragColor.rgb, dayMix);
       #include <dithering_fragment>`
    );

  earthMaterial.userData.shader = shader;
};

const earth = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earth);

// === CLOUDS ===
const cloudGeometry = new THREE.SphereGeometry(1.02, QUALITY.cloudSegments, QUALITY.cloudSegments);
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
      pointTexture: { value: new THREE.TextureLoader().load('/textures/8k_stars.jpg') },
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
      uniform sampler2D pointTexture;
      varying float vOpacity;
      void main() {
        vec4 texColor = texture2D(pointTexture, gl_PointCoord);
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

const stars = createStarField(QUALITY.starCount, 10);
scene.add(stars);

// === BLACK HALO ===
// Vignette sombre juste derriere l'atmosphere, pour faire ressortir le
// glow bleu par contraste. A l'origine une simple sphere a opacite fixe
// (MeshBasicMaterial) : ca cree un bord geometrique dur (un vrai cercle
// net) contre le fond noir -- rendu "brut". Un shader avec son propre
// degrade fresnel (dense pres de la planete, qui s'estompe vers rien en
// s'eloignant) fond la vignette dans le noir au lieu de laisser un
// contour visible, comme le fait deja l'atmosphere.
const spaceHaloGeometry = new THREE.SphereGeometry(1.09, QUALITY.haloSegments, QUALITY.haloSegments);
const spaceHaloMaterial = new THREE.ShaderMaterial({
  vertexShader: `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    void main() {
      float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
      float fade = pow(clamp(rim, 0.0, 1.0), 2.2);
      gl_FragColor = vec4(0.0, 0.0, 0.0, fade * 0.55);
    }
  `,
  side: THREE.BackSide,
  transparent: true,
  depthWrite: false,
});
const spaceHalo = new THREE.Mesh(spaceHaloGeometry, spaceHaloMaterial);
scene.add(spaceHalo);

// === ATMOSPHERE ===
const atmosphereGeometry = new THREE.SphereGeometry(1.05, QUALITY.atmosphereSegments, QUALITY.atmosphereSegments);
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
      // Exposant plus bas = degrade plus large/doux (effet "flou") sans
      // le cout d'un vrai flou post-traitement. Compense l'absence de
      // bloom sur mobile (QUALITY.bloom: false), ou le halo rendait dur
      // et anguleux au lieu de vaporeux.
      float rimSoft = pow(rim, 1.6);
      float litSide = max(dot(vNormal, lightDirection), 0.0);
      litSide = smoothstep(0.0, 0.5, litSide);
      float glow = rimSoft * litSide;
      vec3 color = vec3(0.05, 0.55, 1.0) * glow;
      gl_FragColor = vec4(color, glow * 0.85);
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
// Passe de post-traitement la plus couteuse de la scene (plusieurs
// render targets en cascade) : desactivee en mode faible puissance,
// on rend alors la scene directement sans composer.
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

let composer = null;
if (QUALITY.bloom) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    2.0,
    0.8,
    0.9
  );
  composer.addPass(bloomPass);
}

window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  // Met à jour la caméra
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  // Met à jour le renderer
  renderer.setSize(width, height);
  // Le composer de bloom a ses propres render targets : sans ce
  // resize, une rotation d'ecran mobile le laissait a l'ancienne
  // taille (bloom deforme/rogne apres un changement d'orientation).
  if (composer) {
    composer.setSize(width, height);
  }
}

// === PARALLAX SOURIS ===
// La caméra suit doucement le curseur (effet de profondeur), la terre
// continue de tourner sur elle-même independamment.
const PARALLAX_STRENGTH = 0.35;
const PARALLAX_EASE = 0.05;
let mouseX = 0;
let mouseY = 0;
let parallaxX = 0;
let parallaxY = 0;

window.addEventListener('pointermove', (event) => {
  mouseX = (event.clientX / window.innerWidth) * 2 - 1;
  mouseY = (event.clientY / window.innerHeight) * 2 - 1;
});

// === ANIMATION ===
function animate() {
  requestAnimationFrame(animate);
  earth.rotation.y += 0.0004;
  clouds.rotation.y += 0.0004;
  atmosphere.rotation.y += 0.0035;
  stars.rotation.y += 0.0001;

  parallaxX += (mouseX * PARALLAX_STRENGTH - parallaxX) * PARALLAX_EASE;
  parallaxY += (-mouseY * PARALLAX_STRENGTH - parallaxY) * PARALLAX_EASE;
  camera.position.x = parallaxX;
  camera.position.y = parallaxY;
  camera.lookAt(0, 0, 0);

  if (composer) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
}
animate();