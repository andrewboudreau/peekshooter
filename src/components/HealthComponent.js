// ============================================
// HEALTH COMPONENT
// Manages entity health, damage, and death
// ============================================

class HealthComponent extends Component {
    constructor(maxHealth = 100) {
        super();
        this.maxHealth = maxHealth;
        this.currentHealth = maxHealth;
        this.isDead = false;
        this.invulnerable = false;
        this.lastDamageTime = 0;
        this.lastDamageSource = null;
        this.damageHistory = [];
        this.maxHistorySize = 10;
    }

    /**
     * Get current health
     * @returns {number} Current health
     */
    get health() {
        return this.currentHealth;
    }

    /**
     * Get health as percentage (0-1)
     * @returns {number} Health percentage
     */
    get healthPercent() {
        return this.currentHealth / this.maxHealth;
    }

    /**
     * Check if entity is alive
     * @returns {boolean} Whether entity is alive
     */
    get isAlive() {
        return !this.isDead && this.currentHealth > 0;
    }

    /**
     * Take damage from a source
     * @param {number} amount - Damage amount
     * @param {object} options - Damage options
     * @param {Entity} options.source - Entity that caused damage
     * @param {string} options.bodyPart - Body part hit
     * @param {THREE.Vector3} options.hitPoint - World position of hit
     * @param {string} options.damageType - Type of damage (bullet, explosion, etc.)
     * @returns {object} Damage result
     */
    takeDamage(amount, options = {}) {
        if (this.isDead || this.invulnerable || amount <= 0) {
            return {
                dealt: 0,
                killed: false,
                blocked: this.invulnerable
            };
        }

        const previousHealth = this.currentHealth;
        this.currentHealth = Math.max(0, this.currentHealth - amount);
        const actualDamage = previousHealth - this.currentHealth;

        this.lastDamageTime = Date.now();
        this.lastDamageSource = options.source || null;

        // Record damage history
        this.damageHistory.push({
            amount: actualDamage,
            source: options.source?.id || null,
            bodyPart: options.bodyPart || 'unknown',
            timestamp: this.lastDamageTime,
        });
        if (this.damageHistory.length > this.maxHistorySize) {
            this.damageHistory.shift();
        }

        // Emit damage event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit(GameEvents.DAMAGE_RECEIVED, {
                entity: this.entity,
                amount: actualDamage,
                remainingHealth: this.currentHealth,
                bodyPart: options.bodyPart,
                hitPoint: options.hitPoint,
                source: options.source,
                damageType: options.damageType || 'bullet',
            });

            EventBus.emit(GameEvents.HEALTH_CHANGED, {
                entity: this.entity,
                previousHealth,
                currentHealth: this.currentHealth,
                maxHealth: this.maxHealth,
                delta: -actualDamage,
            });
        }

        // Check for death
        const killed = this.currentHealth <= 0;
        if (killed && !this.isDead) {
            this.die(options.source);
        }

        return {
            dealt: actualDamage,
            killed,
            blocked: false,
            remainingHealth: this.currentHealth,
        };
    }

    /**
     * Heal the entity
     * @param {number} amount - Heal amount
     * @param {object} options - Heal options
     * @returns {number} Actual amount healed
     */
    heal(amount, options = {}) {
        if (this.isDead || amount <= 0) return 0;

        const previousHealth = this.currentHealth;
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
        const actualHeal = this.currentHealth - previousHealth;

        if (actualHeal > 0 && typeof EventBus !== 'undefined') {
            EventBus.emit(GameEvents.HEALTH_CHANGED, {
                entity: this.entity,
                previousHealth,
                currentHealth: this.currentHealth,
                maxHealth: this.maxHealth,
                delta: actualHeal,
            });
        }

        return actualHeal;
    }

    /**
     * Set health to a specific value
     * @param {number} value - New health value
     */
    setHealth(value) {
        const previousHealth = this.currentHealth;
        this.currentHealth = Math.max(0, Math.min(this.maxHealth, value));

        if (this.currentHealth !== previousHealth && typeof EventBus !== 'undefined') {
            EventBus.emit(GameEvents.HEALTH_CHANGED, {
                entity: this.entity,
                previousHealth,
                currentHealth: this.currentHealth,
                maxHealth: this.maxHealth,
                delta: this.currentHealth - previousHealth,
            });
        }

        if (this.currentHealth <= 0 && !this.isDead) {
            this.die(null);
        } else if (this.currentHealth > 0 && this.isDead) {
            this.isDead = false;
        }
    }

    /**
     * Reset health to max
     */
    reset() {
        this.currentHealth = this.maxHealth;
        this.isDead = false;
        this.invulnerable = false;
        this.damageHistory = [];
    }

    /**
     * Kill the entity
     * @param {Entity} killer - Entity that killed this one
     */
    die(killer = null) {
        if (this.isDead) return;

        this.isDead = true;
        this.currentHealth = 0;

        if (typeof EventBus !== 'undefined') {
            EventBus.emit(GameEvents.HEALTH_DEPLETED, {
                entity: this.entity,
                killer,
                damageHistory: [...this.damageHistory],
            });

            // Emit specific kill event based on entity type
            const eventType = this.entity?.type === 'player'
                ? GameEvents.PLAYER_KILLED
                : GameEvents.OPPONENT_KILLED;

            EventBus.emit(eventType, {
                entity: this.entity,
                killer,
            });
        }
    }

    /**
     * Respawn the entity
     */
    respawn() {
        this.reset();

        if (typeof EventBus !== 'undefined') {
            EventBus.emit(GameEvents.PLAYER_SPAWN, {
                entity: this.entity,
            });
        }
    }

    serialize() {
        return {
            currentHealth: this.currentHealth,
            maxHealth: this.maxHealth,
            isDead: this.isDead,
        };
    }

    deserialize(data) {
        if (data.currentHealth !== undefined) this.currentHealth = data.currentHealth;
        if (data.maxHealth !== undefined) this.maxHealth = data.maxHealth;
        if (data.isDead !== undefined) this.isDead = data.isDead;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HealthComponent;
}
