import * as THREE from 'three';

/**
 * Simple theme manager that toggles between light and dark themes.
 * It updates CSS variables, synchronizes Three.js scene background & lighting,
 * and changes cat color based on theme.
 */
export class ThemeManager {
    constructor(scene) {
        this.scene = scene;
        this.current = 'light';
        this.catModel = null;
        this._applyTheme(this.current);
        this._setupListener();
    }

    setCatModel(catModel) {
        this.catModel = catModel;
        this._updateCatColor();
    }

    toggle() {
        this.current = this.current === 'light' ? 'dark' : 'light';
        this._applyTheme(this.current);
    }

    _applyTheme(theme) {
        document.documentElement.dataset.theme = theme;
        const isDark = theme === 'dark';
        // Keep scene background transparent so HTML sections show through
        if (this.scene) {
            this.scene.background = null; // Transparent
            // Adjust directional light intensity/color if needed
            const dirLight = this.scene.getObjectByName('mainDirLight');
            if (dirLight) {
                dirLight.color.set(isDark ? 0x888888 : 0xffffff);
            }
        }
        // Update cat color
        this._updateCatColor();
    }

    _updateCatColor() {
        if (!this.catModel) return;

        const isDark = this.current === 'dark';

        // Light theme: original textured cat
        // Dark theme: pure white cat (no texture)
        this.catModel.traverse(child => {
            if (child.isMesh && child.material) {
                // Save original texture on first run
                if (!child.userData.originalMap) {
                    child.userData.originalMap = child.material.map;
                }

                if (isDark) {
                    // Dark theme - pure white cat (remove texture)
                    child.material.map = null;
                    child.material.color = new THREE.Color(0xffffff);
                    child.material.emissive = new THREE.Color(0x333333);
                } else {
                    // Light theme - original textured cat
                    child.material.map = child.userData.originalMap;
                    child.material.color = new THREE.Color(0xffffff);
                    child.material.emissive = new THREE.Color(0x000000);
                }
                child.material.needsUpdate = true;
            }
        });
    }

    _setupListener() {
        const btn = document.getElementById('theme-toggle');
        if (btn) {
            btn.addEventListener('click', () => this.toggle());
        }
    }
}

