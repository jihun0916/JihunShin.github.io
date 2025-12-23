// src/ClickFlash.js
import * as THREE from 'three';

/**
 * Creates a visible flash effect at the click position
 */
export class ClickFlash {
    constructor(scene, themeMgr) {
        this.scene = scene;
        this.themeMgr = themeMgr; // Reference to theme manager
        this.flashMesh = null;
        this.intensity = 0;
        this.fadeSpeed = 8;

        // Create flash geometry (smaller)
        this.flashGeometry = new THREE.CircleGeometry(0.1, 16);
    }

    flash(x, z) {
        // Remove previous flash if exists
        if (this.flashMesh) {
            this.scene.remove(this.flashMesh);
            this.flashMesh.material.dispose();
        }

        // Choose color based on theme
        const isDark = this.themeMgr && this.themeMgr.current === 'dark';
        const color = isDark ? 0xffffff : 0x333333; // White on dark, dark gray on light

        // Create new flash at click position
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide
        });

        this.flashMesh = new THREE.Mesh(this.flashGeometry, material);
        this.flashMesh.position.set(x, 0.01, z);
        this.flashMesh.rotation.x = -Math.PI / 2;
        this.scene.add(this.flashMesh);

        this.intensity = 1;
    }

    update(delta) {
        if (this.flashMesh && this.intensity > 0) {
            this.intensity -= this.fadeSpeed * delta;
            this.flashMesh.material.opacity = Math.max(0, this.intensity);

            // Scale up as it fades (ripple effect)
            const scale = 1 + (1 - this.intensity) * 1.5;
            this.flashMesh.scale.set(scale, scale, scale);

            if (this.intensity <= 0) {
                this.scene.remove(this.flashMesh);
                this.flashMesh.material.dispose();
                this.flashMesh = null;
            }
        }
    }
}
