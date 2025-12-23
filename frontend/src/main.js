// src/main.js
import { initWorld, onResize } from './World.js';
import { initPlatforms } from './PlatformManager.js';
import { ViewModeManager } from './ViewModeManager.js';
import { ThemeManager } from './ThemeManager.js';
import { loadCatModel } from './CatController.js';
import { CatBrain } from './CatBrain.js';
import { FootstepTracker } from './FootstepTracker.js';
import { ClickFlash } from './ClickFlash.js';
import { initGuestbook } from './guestbook.js';
import * as THREE from 'three';

let renderer, scene, camera, catObj, mixer, actions, brain, viewModeMgr, themeMgr, footstepTracker, clickFlash;
let targetPos = { x: 0, y: 0, z: 0 };
let cameraScrollZ = 0; // Camera Z offset from scroll

function init() {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    const { renderer: r, scene: s, camera: c } = initWorld(canvas);
    renderer = r; scene = s; camera = c;

    // Platform colliders
    initPlatforms(scene);

    // Managers
    themeMgr = new ThemeManager(scene);

    // Load cat model and animations
    loadCatModel(scene).then(({ model, mixer: m, actions: a, rawModel }) => {
        catObj = model;
        mixer = m;
        actions = a;
        brain = new CatBrain(catObj, actions, null, mixer);

        // Connect cat model to theme manager for color changes
        if (themeMgr && rawModel) {
            themeMgr.setCatModel(rawModel);
        }

        // Footstep visualization
        footstepTracker = new FootstepTracker(rawModel, catObj, scene);

        // Initialize guestbook with Firebase
        initGuestbook();

        animate();
    });

    window.addEventListener('resize', () => onResize({ renderer, camera }));

    // Scroll sync with camera
    window.addEventListener('scroll', () => {
        // Calculate scroll progress (0 to 1)
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollProgress = window.scrollY / scrollHeight;

        // Map scroll to camera Z position (move camera "down" in world space)
        // Negative Z goes "up" on screen, positive Z goes "down"
        const worldLength = 20; // Total vertical length of the world
        cameraScrollZ = scrollProgress * worldLength;

        // Update camera position
        camera.position.z = cameraScrollZ;
        camera.lookAt(0, 0, cameraScrollZ);
    });

    window.addEventListener('mousemove', (e) => {
        const frustumSize = 5;
        const aspect = window.innerWidth / window.innerHeight;
        const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
        const ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
        const worldX = ndcX * (frustumSize * aspect / 2);
        const worldZ = -ndcY * (frustumSize / 2) + cameraScrollZ; // Add camera offset

        targetPos = { x: worldX, y: 0, z: worldZ };

        if (brain) {
            brain.update(0.016, targetPos);
        }
    });

    // Click to call the cat
    window.addEventListener('click', (e) => {
        const frustumSize = 5;
        const aspect = window.innerWidth / window.innerHeight;
        const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
        const ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
        const worldX = ndcX * (frustumSize * aspect / 2);
        const worldZ = -ndcY * (frustumSize / 2) + cameraScrollZ; // Add camera offset

        targetPos = { x: worldX, y: 0, z: worldZ };

        if (brain) {
            const clickPos = { x: worldX, y: 0, z: worldZ };
            brain.callCat(clickPos);
        }

        // Flash light at click position
        if (!clickFlash) clickFlash = new ClickFlash(scene, themeMgr);
        clickFlash.flash(worldX, worldZ);
    });
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    if (brain) brain.update(delta, targetPos);
    if (footstepTracker) footstepTracker.update();
    if (clickFlash) clickFlash.update(delta);
    renderer.render(scene, camera);
}

const clock = new THREE.Clock();
init();
