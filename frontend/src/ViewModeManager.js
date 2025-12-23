// src/ViewModeManager.js
import * as THREE from 'three';
import { gsap } from 'gsap';

/**
 * Manages camera view mode transitions based on the current section.
 * Sections should have data-view-mode="TOP" or "SIDE".
 */
export class ViewModeManager {
    constructor(camera, renderer) {
        this.camera = camera;
        this.renderer = renderer;
        this.modes = {
            TOP: { position: new THREE.Vector3(0, 12, 0), lookAt: new THREE.Vector3(0, 0, 0) },
            //SIDE: { position: new THREE.Vector3(0, 5, 0), lookAt: new THREE.Vector3(0, 0, 0) }
        };
        this.currentMode = null;
        this._initObserver();
    }

    _initObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const mode = entry.target.dataset.viewMode;
                    if (mode && mode !== this.currentMode) {
                        this.transition(mode);
                    }
                }
            });
        }, { threshold: 0.5 });
        document.querySelectorAll('[data-view-mode]').forEach(el => observer.observe(el));
    }

    transition(toMode, duration = 1.0) {
        const cfg = this.modes[toMode];
        if (!cfg) return;
        const { position, lookAt } = cfg;
        gsap.to(this.camera.position, {
            x: position.x,
            y: position.y,
            z: position.z,
            duration,
            onUpdate: () => this.camera.lookAt(lookAt)
        });
        this.currentMode = toMode;
    }
}
