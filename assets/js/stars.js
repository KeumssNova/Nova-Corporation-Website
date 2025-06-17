// import * as THREE from "three";

// window.addEventListener("DOMContentLoaded", () => {
//   const canvas = document.getElementById("stars-canvas");
//   if (!canvas) {
//     console.error(
//       "Canvas #stars-canvas introuvable même après DOMContentLoaded."
//     );
//     return;
//   }

//   const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
//   renderer.setClearColor(0x000000, 1);
//   renderer.setSize(window.innerWidth, window.innerHeight);
//   renderer.setPixelRatio(window.devicePixelRatio);

//   const scene = new THREE.Scene();
//   const camera = new THREE.PerspectiveCamera(
//     75,
//     window.innerWidth / window.innerHeight,
//     0.1,
//     1000
//   );
//   camera.position.z = 100;

//   const starTexture = loader.load('/textures/8k_stars.jpg'); // texture étoilée

//   const starsGeometry = new THREE.SphereGeometry(50, 64, 64);
//   const starsMaterial = new THREE.MeshBasicMaterial({
//     map: starTexture,
//     side: THREE.BackSide,
//     transparent: true,
//   });
//   const starsMesh = new THREE.Mesh(starsGeometry, starsMaterial);
//   scene.add(starsMesh);

//   function animate() {
//     requestAnimationFrame(animate);
//     renderer.render(scene, camera);
//   }

//   animate();
// });
