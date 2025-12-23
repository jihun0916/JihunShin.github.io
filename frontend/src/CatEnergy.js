// src/CatEnergy.js
/**
 * Simple energy system for the cat.
 * Energy ranges from 0 to 100. Consumes energy when moving, recovers when resting.
 */
export class CatEnergy {
    constructor() {
        this.energy = 100; // start fully energized
        this.recoveryRate = 20; // per second when resting (very fast)
        this.consumptionRate = 1; // per second when active (very slow drain)
        this.status = 'FULL'; // FULL, NORMAL, LOW, EXHAUSTED
    }

    update(delta, state) {
        // state is current FSM state string
        if (state === 'RUN' || state === 'WALK' || state === 'JUMP') {
            this.energy -= this.consumptionRate * delta;
        } else {
            this.energy += this.recoveryRate * delta;
        }
        this.energy = Math.max(0, Math.min(100, this.energy));
        if (this.energy > 70) this.status = 'FULL';
        else if (this.energy > 40) this.status = 'NORMAL';
        else if (this.energy > 10) this.status = 'LOW';
        else this.status = 'EXHAUSTED';
    }
}
