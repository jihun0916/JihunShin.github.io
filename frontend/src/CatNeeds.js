// src/CatNeeds.js

/**
 * Manages cat's needs/desires that drive behavior choices.
 * Each need decreases over time and affects state transitions.
 */
export class CatNeeds {
    constructor() {
        // All needs range from 0 (desperate) to 100 (satisfied)
        this.hunger = 80;      // Triggers EAT when low
        this.thirst = 80;      // Triggers DRINK when low
        this.energy = 100;     // Triggers SLEEP when low (moved from CatEnergy)
        this.boredom = 50;     // Triggers PLAY behaviors when high (inverted: 100 = very bored)
        this.comfort = 70;     // Affects position choice (SIT vs LIE)
        this.social = 60;      // Triggers MEOW when low

        // Decay rates per second (how fast needs decrease)
        this.decayRates = {
            hunger: 0.5,
            thirst: 0.8,
            energy: 0.3,
            boredom: -1.0,  // Boredom INCREASES over time
            comfort: 0.2,
            social: 0.4
        };

        // Thresholds for triggering behaviors
        this.thresholds = {
            hungry: 30,      // Below this, cat wants to eat
            thirsty: 30,     // Below this, cat wants to drink
            tired: 20,       // Below this, cat wants to sleep
            bored: 70,       // Above this, cat wants to play
            lonely: 25,      // Below this, cat meows for attention
            uncomfortable: 40 // Below this, cat changes position
        };
    }

    /**
     * Update all needs based on time and current state
     */
    update(delta, currentState) {
        // Natural decay of needs
        this.hunger = Math.max(0, this.hunger - this.decayRates.hunger * delta);
        this.thirst = Math.max(0, this.thirst - this.decayRates.thirst * delta);
        this.comfort = Math.max(0, this.comfort - this.decayRates.comfort * delta);
        this.social = Math.max(0, this.social - this.decayRates.social * delta);

        // Boredom increases over time
        this.boredom = Math.min(100, this.boredom - this.decayRates.boredom * delta);

        // Energy changes based on activity
        if (currentState === 'WALK') {
            this.energy = Math.max(0, this.energy - 0.5 * delta);
            this.boredom = Math.max(0, this.boredom - 2 * delta); // Walking reduces boredom
        } else if (currentState === 'RUN') {
            this.energy = Math.max(0, this.energy - 1.5 * delta);
            this.boredom = Math.max(0, this.boredom - 5 * delta);
        } else if (currentState === 'SLEEP') {
            this.energy = Math.min(100, this.energy + 3 * delta); // Recover energy
            this.comfort = Math.min(100, this.comfort + 1 * delta);
        } else if (currentState === 'LIE') {
            this.energy = Math.min(100, this.energy + 1 * delta);
            this.comfort = Math.min(100, this.comfort + 2 * delta);
        } else if (currentState === 'SIT') {
            this.energy = Math.min(100, this.energy + 0.5 * delta);
            this.comfort = Math.min(100, this.comfort + 1 * delta);
        } else if (currentState === 'EAT') {
            this.hunger = Math.min(100, this.hunger + 10 * delta);
        } else if (currentState === 'DRINK') {
            this.thirst = Math.min(100, this.thirst + 15 * delta);
        } else if (currentState === 'MEOW') {
            this.social = Math.min(100, this.social + 5 * delta);
        } else if (currentState === 'ROLLING' || currentState === 'WIGGLE') {
            this.boredom = Math.max(0, this.boredom - 10 * delta);
            this.energy = Math.max(0, this.energy - 1 * delta);
        }
    }

    /**
     * Called when user interacts (clicks)
     */
    onInteraction() {
        this.social = Math.min(100, this.social + 30);
        this.boredom = Math.max(0, this.boredom - 20);
    }

    /**
     * Get the most urgent need that should drive behavior
     * Returns: { need: string, urgency: number } or null if all satisfied
     */
    getMostUrgentNeed() {
        const needs = [];

        if (this.energy < this.thresholds.tired) {
            needs.push({ need: 'SLEEP', urgency: (this.thresholds.tired - this.energy) / this.thresholds.tired });
        }
        if (this.hunger < this.thresholds.hungry) {
            needs.push({ need: 'EAT', urgency: (this.thresholds.hungry - this.hunger) / this.thresholds.hungry });
        }
        if (this.thirst < this.thresholds.thirsty) {
            needs.push({ need: 'DRINK', urgency: (this.thresholds.thirsty - this.thirst) / this.thresholds.thirsty });
        }
        if (this.boredom > this.thresholds.bored) {
            needs.push({ need: 'PLAY', urgency: (this.boredom - this.thresholds.bored) / (100 - this.thresholds.bored) });
        }
        if (this.social < this.thresholds.lonely) {
            needs.push({ need: 'MEOW', urgency: (this.thresholds.lonely - this.social) / this.thresholds.lonely });
        }
        if (this.comfort < this.thresholds.uncomfortable) {
            needs.push({ need: 'REST', urgency: (this.thresholds.uncomfortable - this.comfort) / this.thresholds.uncomfortable });
        }

        if (needs.length === 0) return null;

        // Sort by urgency and return most urgent
        needs.sort((a, b) => b.urgency - a.urgency);
        return needs[0];
    }

    /**
     * Get current status summary
     */
    getStatus() {
        return {
            hungry: this.hunger < this.thresholds.hungry,
            thirsty: this.thirst < this.thresholds.thirsty,
            tired: this.energy < this.thresholds.tired,
            bored: this.boredom > this.thresholds.bored,
            lonely: this.social < this.thresholds.lonely,
            uncomfortable: this.comfort < this.thresholds.uncomfortable
        };
    }

    /**
     * Debug: Log current needs
     */
    logNeeds() {
        console.log(
            `Needs - Energy:${this.energy.toFixed(0)} Hunger:${this.hunger.toFixed(0)} ` +
            `Thirst:${this.thirst.toFixed(0)} Boredom:${this.boredom.toFixed(0)} ` +
            `Social:${this.social.toFixed(0)} Comfort:${this.comfort.toFixed(0)}`
        );
    }
}
