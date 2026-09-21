import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const params = new URLSearchParams(location.search);
const modelUrl = params.get("model") ?? "/models/magnus.glb";
const size = Number(params.get("size") ?? 512);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setSize(size, size);
renderer.setClearColor(0x000000, 0);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);

scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const key = new THREE.DirectionalLight(0xffffff, 1.2);
key.position.set(2, 4, 3);
scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 0.4);
fill.position.set(-3, 1, 2);
scene.add(fill);

const loader = new GLTFLoader();

window.renderState = "loading";

loader.load(
  modelUrl,
  (gltf) => {
    const model = gltf.scene;
    scene.add(model);

    // Center the model on X/Z and sit it on the ground plane (y=0), then
    // frame an orthographic-feeling perspective camera to its bounding sphere
    // so every character fills the frame the same way regardless of its
    // native export scale/pivot.
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size3 = box.getSize(new THREE.Vector3());
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= box.min.y;

    const radius = size3.length() / 2;
    const distance = radius / Math.sin((camera.fov * Math.PI) / 360) * 1.15;
    camera.position.set(0, size3.y * 0.55, distance);
    camera.lookAt(0, size3.y * 0.5, 0);
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
    window.renderState = "done";
    document.title = "rendered";
  },
  undefined,
  (err) => {
    window.renderState = "error";
    window.renderError = String(err);
    console.error(err);
  }
);
