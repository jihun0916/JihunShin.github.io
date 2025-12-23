// src/FootstepTracker.js
import * as THREE from 'three';

/**
 * Tracks paw positions and creates footprint markers when paws touch ground.
 */
export class FootstepTracker {
    constructor(catModel, catPivot, scene) {
        this.scene = scene;
        this.catPivot = catPivot; // Reference to cat pivot for rotation
        this.paws = {};
        this.footprints = [];
        this.maxFootprints = 999; // Footprints never disappear
        this.lastPawY = {};
        this.pawMinY = {}; // Track minimum Y per paw to detect ground contact
        this.pawGoingDown = {}; // Track direction

        // Find paw bones
        catModel.traverse(child => {
            if (child.name === 'L_Hand') this.paws.frontLeft = child;
            if (child.name === 'R_Hand') this.paws.frontRight = child;
            if (child.name === 'L_Foot') this.paws.backLeft = child;
            if (child.name === 'R_Foot') this.paws.backRight = child;
        });

        console.log('FootstepTracker: Found paws:', Object.keys(this.paws));

        // Initialize tracking
        Object.keys(this.paws).forEach(key => {
            this.lastPawY[key] = 0;
            this.pawMinY[key] = Infinity;
            this.pawGoingDown[key] = true;
        });

        // Load footprint texture
        const textureLoader = new THREE.TextureLoader();
        this.footprintTexture = textureLoader.load('/cat_footprint.png');

        // Create footprint geometry
        this.footprintGeometry = new THREE.PlaneGeometry(0.06, 0.06);
        this.footprintMaterial = new THREE.MeshBasicMaterial({
            map: this.footprintTexture,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            depthWrite: false
        });
    }

    update() {
        const worldPos = new THREE.Vector3();

        Object.entries(this.paws).forEach(([name, paw]) => {
            if (!paw) return;

            paw.getWorldPosition(worldPos);
            const currentY = worldPos.y;
            const lastY = this.lastPawY[name];

            // Detect direction change (going down -> going up = touched ground)
            const wasGoingDown = this.pawGoingDown[name];
            const nowGoingUp = currentY > lastY + 0.001; // Small tolerance

            // When paw stops going down and starts going up = ground contact
            if (wasGoingDown && nowGoingUp) {
                // Get cat's rotation for footprint direction
                const catRotation = this.catPivot ? this.catPivot.rotation.y : 0;
                this._createFootprint(worldPos.x, worldPos.z, catRotation, name);
            }

            // Update direction tracking
            if (currentY < lastY - 0.001) {
                this.pawGoingDown[name] = true;
            } else if (currentY > lastY + 0.001) {
                this.pawGoingDown[name] = false;
            }

            this.lastPawY[name] = currentY;
        });
    }

    _createFootprint(x, z, rotation, pawName) {
        const footprint = new THREE.Mesh(
            this.footprintGeometry,
            this.footprintMaterial.clone()
        );

        // Position at ground level (Y = 0)
        footprint.position.set(x, 0.001, z);

        // Lay flat on ground and rotate to match cat's direction
        footprint.rotation.x = Math.PI / 2;
        footprint.rotation.z = -rotation; // Rotate to match cat's walking direction

        this.scene.add(footprint);
        this.footprints.push(footprint);

        // Remove oldest if too many
        if (this.footprints.length > this.maxFootprints) {
            const oldest = this.footprints.shift();
            this.scene.remove(oldest);
            oldest.material.dispose();
        }
    }

    dispose() {
        this.footprints.forEach(fp => {
            this.scene.remove(fp);
            fp.material.dispose();
        });
        this.footprints = [];
        this.footprintGeometry.dispose();
        this.footprintMaterial.dispose();
    }
}
