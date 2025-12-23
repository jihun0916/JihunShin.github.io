// src/PlatformManager.js
import * as THREE from 'three';

/**
 * Scans the DOM for elements with class "platform" and creates invisible
 * Three.js BoxGeometry meshes that act as colliders for the cat.
 * The meshes are added to the provided Three.js scene.
 */
export function initPlatforms(scene) {
    const platforms = [];
    const elements = document.querySelectorAll('.platform');
    elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        // Convert pixel dimensions to world units (simple scaling factor)
        const scale = 0.01; // 1 unit = 100px roughly
        const width = rect.width * scale;
        const depth = rect.height * scale;
        const height = 0.2; // thin floor/ wall
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
        const mesh = new THREE.Mesh(geometry, material);
        // Position mesh at element's center (adjust Y to be slightly above ground)
        const x = (rect.left + rect.width / 2) * scale;
        const z = (rect.top + rect.height / 2) * scale;
        mesh.position.set(x, height / 2, z);
        scene.add(mesh);
        platforms.push({ el, mesh });
    });
    return platforms;
}
