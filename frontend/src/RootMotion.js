// src/RootMotion.js
import * as THREE from 'three';

/**
 * Extracts root motion from animation tracks (CG.position).
 * Unity FBX exports have root motion data in a "CG" node that's not part of the skeleton.
 * We track the CG position from animation clips and apply the delta to the character.
 */
export class RootMotion {
    constructor(model, mixer) {
        this.model = model;
        this.mixer = mixer;
        this.enabled = false;

        // Track CG position values
        this.lastCGPosition = new THREE.Vector3();
        this.currentCGPosition = new THREE.Vector3();
        this.cgPositionTrack = null;
        this.currentClip = null;

        console.log('RootMotion initialized with animation track mode');
    }

    /**
     * Set the current animation clip to extract root motion from
     */
    setCurrentClip(clip) {
        if (!clip) return;

        this.currentClip = clip;
        this.cgPositionTrack = null;

        // Find CG.position track in the clip
        for (const track of clip.tracks) {
            if (track.name === 'CG.position') {
                this.cgPositionTrack = track;
                console.log('Found CG.position track in clip:', clip.name);
                this.enabled = true;

                // Initialize last position from first keyframe
                if (track.values.length >= 3) {
                    this.lastCGPosition.set(track.values[0], track.values[1], track.values[2]);
                }
                break;
            }
        }

        if (!this.cgPositionTrack) {
            console.warn('No CG.position track found in clip:', clip.name);
            this.enabled = false;
        }
    }

    /**
     * Get the current CG position based on animation time
     */
    _getCGPositionAtTime(time) {
        if (!this.cgPositionTrack || !this.currentClip) {
            return new THREE.Vector3();
        }

        const track = this.cgPositionTrack;
        const times = track.times;
        const values = track.values;
        const duration = this.currentClip.duration;

        // Loop the time
        let t = time % duration;

        // Find the keyframe indices
        let i = 0;
        while (i < times.length - 1 && times[i + 1] < t) {
            i++;
        }

        // If at last keyframe, return last value
        if (i >= times.length - 1) {
            const lastIdx = (times.length - 1) * 3;
            return new THREE.Vector3(values[lastIdx], values[lastIdx + 1], values[lastIdx + 2]);
        }

        // Interpolate between keyframes
        const t0 = times[i];
        const t1 = times[i + 1];
        const alpha = (t - t0) / (t1 - t0);

        const idx0 = i * 3;
        const idx1 = (i + 1) * 3;

        return new THREE.Vector3(
            THREE.MathUtils.lerp(values[idx0], values[idx1], alpha),
            THREE.MathUtils.lerp(values[idx0 + 1], values[idx1 + 1], alpha),
            THREE.MathUtils.lerp(values[idx0 + 2], values[idx1 + 2], alpha)
        );
    }

    /**
     * Update and return the delta movement this frame
     */
    update(delta) {
        if (!this.enabled || !this.mixer || !this.cgPositionTrack) {
            return new THREE.Vector3(0, 0, 0);
        }

        // Get current animation time
        const action = this.mixer._actions.find(a => a.isRunning());
        if (!action) {
            return new THREE.Vector3(0, 0, 0);
        }

        const time = action.time;

        // Detect animation loop (time went backwards)
        if (this.lastTime !== undefined && time < this.lastTime) {
            // Animation looped - skip this frame's delta
            this.lastTime = time;
            this.currentCGPosition = this._getCGPositionAtTime(time);
            this.lastCGPosition.copy(this.currentCGPosition);
            return new THREE.Vector3(0, 0, 0);
        }
        this.lastTime = time;

        this.currentCGPosition = this._getCGPositionAtTime(time);

        // Calculate delta
        const positionDelta = new THREE.Vector3();
        positionDelta.subVectors(this.currentCGPosition, this.lastCGPosition);

        // Ignore backward movement (negative Z) - this happens during loop reset
        // Walk/Run animations only move forward, so negative Z is always a loop artifact
        if (positionDelta.z < -0.1) {
            positionDelta.set(0, 0, 0);
        }

        // Also check for large deltas as backup
        if (positionDelta.length() > 0.5) {
            positionDelta.set(0, 0, 0);
        }

        // Debug log
        if (positionDelta.length() > 0.001) {
            console.log('CG Root Motion delta:',
                positionDelta.x.toFixed(4),
                positionDelta.y.toFixed(4),
                positionDelta.z.toFixed(4)
            );
        }

        // Update last position
        this.lastCGPosition.copy(this.currentCGPosition);

        return positionDelta;
    }

    /**
     * Reset tracking (call when animation changes)
     */
    reset() {
        if (this.cgPositionTrack && this.cgPositionTrack.values.length >= 3) {
            const values = this.cgPositionTrack.values;
            this.lastCGPosition.set(values[0], values[1], values[2]);
        }
    }
}
