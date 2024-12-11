import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { calculateCenter } from "./calculator.js";

export class STLViewer {
  constructor() {
    this.scene = new THREE.Scene();
    this.overlayScene = new THREE.Scene();
    this.mesh = null;
    this.cogSphere = null;
    this.currentCogPosition = new THREE.Vector3();
    this.currentModelSize = 1;

    this.init();
    this.setupEventListeners();
    this.animate();
  }

  init() {
    this.setupCamera();
    this.setupRenderer();
    this.setupControls();
  }

  setupCamera() {
    const container = document.getElementById("viewer");
    const rect = container.getBoundingClientRect();
    const aspect = rect.width / rect.height;

    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.overlayCamera = this.camera.clone();
    this.camera.position.z = 5;
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.updateRendererSize();
    this.renderer.setClearColor(0x000000);
    this.renderer.autoClear = false;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById("viewer").appendChild(this.renderer.domElement);
  }

  setupControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    this.controls.addEventListener("change", () => {
      this.overlayCamera.copy(this.camera);
    });
  }

  setupEventListeners() {
    const sphereSizeSlider = document.getElementById("sphereSize");
    const sphereSizeValue = document.getElementById("sphereSizeValue");

    sphereSizeSlider.addEventListener("input", (e) => {
      sphereSizeValue.textContent = `${e.target.value}%`;
      if (this.cogSphere) {
        this.updateCOGSphere();
      }
    });

    window.addEventListener("resize", () => this.handleResize());
  }

  createCOGSphere(position, modelSize) {
    this.currentCogPosition.copy(position);
    this.currentModelSize = modelSize;
    this.updateCOGSphere();
  }

  updateCOGSphere() {
    if (this.cogSphere) {
      this.overlayScene.remove(this.cogSphere);
    }

    const sphereSize = this.currentModelSize * (parseFloat(document.getElementById("sphereSize").value) / 100);
    const sphereMaterial = this.createSphereMaterial();
    const sphereGeometry = new THREE.SphereGeometry(sphereSize, 32, 32);

    this.cogSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this.cogSphere.position.copy(this.currentCogPosition);
    this.overlayScene.add(this.cogSphere);

    const axesHelper = new THREE.AxesHelper(sphereSize * 4);
    axesHelper.material.depthWrite = false;
    axesHelper.material.depthTest = false;
    this.cogSphere.add(axesHelper);
  }

  createSphereMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0xff1493) },
      },
      vertexShader: `
                void main() {
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
      fragmentShader: `
                uniform vec3 color;
                void main() {
                    gl_FragColor = vec4(color, 1.0);
                }
            `,
      depthWrite: false,
      depthTest: false,
    });
  }

  loadSTL(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const loader = new STLLoader();
      const geometry = loader.parse(event.target.result);

      if (this.mesh) {
        this.scene.remove(this.mesh);
      }

      const { center: cog, totalVolume } = calculateCenter(geometry);
      const material = new THREE.LineBasicMaterial({
        color: 0x00ff00,
        linewidth: 1,
      });

      const wireframeGeometry = new THREE.WireframeGeometry(geometry);
      this.mesh = new THREE.LineSegments(wireframeGeometry, material);
      this.scene.add(this.mesh);

      const boundingBox = new THREE.Box3().setFromObject(this.mesh);
      const size = new THREE.Vector3();
      boundingBox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);

      this.createCOGSphere(cog, maxDim);
      this.adjustCamera(cog, maxDim);
    };
    reader.readAsArrayBuffer(file);
  }

  adjustCamera(cog, maxDim) {
    this.camera.position.z = maxDim * 2;
    this.controls.target.copy(cog);
    this.controls.update();
    this.overlayCamera.copy(this.camera);
  }

  handleResize() {
    this.updateRendererSize();
    this.camera.aspect = this.getAspectRatio();
    this.camera.updateProjectionMatrix();
    this.overlayCamera.aspect = this.camera.aspect;
    this.overlayCamera.updateProjectionMatrix();
  }

  updateRendererSize() {
    const container = document.getElementById("viewer");
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    this.renderer.setSize(width, height, false);

    const canvas = this.renderer.domElement;
    Object.assign(canvas.style, {
      width: "100%",
      height: "100%",
      display: "block",
      position: "absolute",
      top: "0",
      left: "0",
    });
  }

  getAspectRatio() {
    const container = document.getElementById("viewer");
    const rect = container.getBoundingClientRect();
    return rect.width / rect.height;
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();

    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.clearDepth();
    this.renderer.render(this.overlayScene, this.overlayCamera);
  }
}
