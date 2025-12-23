// src/CatBrain.js
import { LoopRepeat } from 'three';
import { RootMotion } from './RootMotion.js';
import { CatEnergy } from './CatEnergy.js';

export class CatBrain {
    constructor(cat, actions, energy, mixer) {
        this.cat = cat;
        this.actions = actions;
        this.energy = energy || new CatEnergy();
        this.mixer = mixer;
        this.currentState = 'IDLE';
        this.rootMotion = new RootMotion(cat, mixer);

        // Find CG bone
        this.cgBone = null;
        cat.traverse(child => {
            if (child.name === 'CG' && !this.cgBone) {
                this.cgBone = child;
            }
        });

        // Autonomous wandering
        this.behaviorMode = 'WANDER';
        this.wanderTarget = { x: 0, z: 0 };
        this.clickTarget = null;
        this.wanderTimer = 0;
        this.wanderInterval = 5;
        this.interestTimer = 0;
        this.interestDuration = 5;

        this._setupActions();
        this._pickNewWanderTarget();
    }

    _setupActions() {
        Object.values(this.actions).forEach(action => {
            action.enabled = true;
            action.setLoop(LoopRepeat, Infinity);
        });
        this._play('Idle');
    }

    _play(name) {
        if (this.currentAction) this.currentAction.fadeOut(0.3);
        const next = this.actions[name];
        if (next) {
            next.reset().fadeIn(0.3).play();
            this.currentAction = next;
            if (next.getClip) {
                this.rootMotion.setCurrentClip(next.getClip());
            }
            this.rootMotion.reset();
        }
    }

    _pickNewWanderTarget() {
        const range = 2;
        this.wanderTarget = {
            x: (Math.random() - 0.5) * range * 2,
            z: (Math.random() - 0.5) * range * 2
        };
    }

    callCat(clickPos) {
        this.behaviorMode = 'INTERESTED';
        this.interestTimer = this.interestDuration;
        this.clickTarget = clickPos;
    }

    update(delta, mousePos) {
        this.energy.update(delta, this.currentState);

        // Behavior mode
        if (this.behaviorMode === 'WANDER') {
            this.wanderTimer += delta;
            if (this.wanderTimer >= this.wanderInterval) {
                this.wanderTimer = 0;
                this._pickNewWanderTarget();
            }
        } else if (this.behaviorMode === 'INTERESTED') {
            this.interestTimer -= delta;
            if (this.interestTimer <= 0) {
                this.behaviorMode = 'WANDER';
                this._pickNewWanderTarget();
            }
        }

        // Target
        const target = (this.behaviorMode === 'INTERESTED' && this.clickTarget)
            ? this.clickTarget
            : this.wanderTarget;

        const catPos = this.cat.position;
        const dx = target.x - catPos.x;
        const dz = (target.z || 0) - catPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // State logic - modified by energy
        let newState = this.currentState;
        const energyStatus = this.energy.status;

        // If exhausted, force rest (IDLE)
        if (energyStatus === 'EXHAUSTED') {
            newState = 'IDLE';
        }
        // If low energy, can only walk (no running)
        else if (energyStatus === 'LOW') {
            if (dist > 0.5) {
                newState = 'WALK';
            } else {
                newState = 'IDLE';
            }
        }
        // Normal or full energy
        else {
            if (dist > 1.5) {
                newState = 'RUN';
            } else if (dist > 0.5) {
                newState = 'WALK';
            } else {
                newState = 'IDLE';
            }
        }

        if (newState !== this.currentState) {
            this.currentState = newState;
            if (newState === 'IDLE') this._play('Idle');
            else if (newState === 'WALK') this._play('Walk_Forward');
            else if (newState === 'RUN') this._play('Run_Forward');
        }

        // Movement
        if (this.currentState === 'WALK' || this.currentState === 'RUN') {
            if (dist > 0.1) {
                const dirX = dx / dist;
                const dirZ = dz / dist;
                const speed = this.currentState === 'RUN' ? 0.008 : 0.004;

                this.cat.position.x += dirX * speed;
                this.cat.position.z += dirZ * speed;

                // Smooth rotation (Y axis on pivot)
                const targetAngle = Math.atan2(dx, dz);
                let angleDiff = targetAngle - this.cat.rotation.y;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                this.cat.rotation.y += angleDiff * 0.05;
            }
        }

        this.cat.position.y = 0;

        // Reset CG bone
        if (this.cgBone) {
            this.cgBone.position.set(0, 0, 0);
        }
    }
}
