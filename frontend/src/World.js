// src/World.js
import * as THREE from 'three';

export function initWorld(canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    const scene = new THREE.Scene();

    // Orthographic camera for 2D-like view
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 5; // Controls how much of the scene is visible
    const camera = new THREE.OrthographicCamera(
        frustumSize * aspect / -2,   // left
        frustumSize * aspect / 2,    // right
        frustumSize / 2,             // top
        frustumSize / -2,            // bottom
        0.1,                         // near
        1000                         // far
    );

    // Camera looks down from above (Top-down view)
    camera.position.set(0, 10, 0); // Above the scene
    camera.lookAt(0, 0, 0);        // Look at origin
    camera.up.set(0, 0, -1);       // Z is "up" in screen space

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 7);
    scene.add(light);
    const ambient = new THREE.AmbientLight(0x888888);
    scene.add(ambient);

    // Invisible floor (for ground reference / collision)
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0, // Invisible
        side: THREE.DoubleSide
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2; // Horizontal
    floor.position.y = 0; // Ground level
    floor.name = 'floor';
    scene.add(floor);

    return { renderer, scene, camera, floor };
}

export function onResize({ renderer, camera }) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);

    // Update orthographic camera on resize
    const aspect = width / height;
    const frustumSize = 5;
    camera.left = frustumSize * aspect / -2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
}
