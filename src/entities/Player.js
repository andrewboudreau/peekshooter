// ============================================
// PLAYER ENTITY
// Represents the local player with components
// ============================================

class Player extends Entity {
    constructor() {
        super('player');

        // Add core components
        this.addComponent(new HealthComponent(
            typeof DamageConfig !== 'undefined' ? DamageConfig.health.player : 100
        ));
        this.addComponent(new TransformComponent());

        // Player-specific state
        this.weaponHand = 'right';
        this.currentWeapon = 'assault_rifle';
        this.slot = 0;

        // Input state
        this.input = {
            keys: {},
            mouseX: 0,
            mouseY: 0,
        };

        // Tags
        this.addTag('player');
        this.addTag('local');
    }

    // ============================================
    // Component Accessors
    // ============================================

    get health() {
        return this.getComponent('HealthComponent');
    }

    get transform() {
        return this.getComponent('TransformComponent');
    }

    get hitbox() {
        return this.getComponent('HitboxComponent');
    }

    // ============================================
    // Health Shortcuts
    // ============================================

    get currentHealth() {
        return this.health?.currentHealth || 0;
    }

    set currentHealth(value) {
        if (this.health) this.health.setHealth(value);
    }

    get isAlive() {
        return this.health?.isAlive || false;
    }

    takeDamage(amount, options = {}) {
        return this.health?.takeDamage(amount, options);
    }

    heal(amount) {
        return this.health?.heal(amount);
    }

    // ============================================
    // Stance Shortcuts
    // ============================================

    get crouch() {
        return this.transform?.stance.crouch || 0;
    }

    set crouch(value) {
        if (this.transform) this.transform.targetStance.crouch = value;
    }

    get lean() {
        return this.transform?.stance.lean || 0;
    }

    set lean(value) {
        if (this.transform) this.transform.targetStance.lean = value;
    }

    get strafe() {
        return this.transform?.stance.strafe || 0;
    }

    set strafe(value) {
        if (this.transform) this.transform.targetStance.strafe = value;
    }

    get lookYaw() {
        return this.transform?.look.yaw || 0;
    }

    set lookYaw(value) {
        if (this.transform) this.transform.look.yaw = value;
    }

    get lookPitch() {
        return this.transform?.look.pitch || 0;
    }

    set lookPitch(value) {
        if (this.transform) this.transform.look.pitch = value;
    }

    isPeeking() {
        return this.transform?.isPeeking() || false;
    }

    isCrouched() {
        return this.transform?.isCrouched() || false;
    }

    // ============================================
    // Weapon
    // ============================================

    switchHand() {
        this.weaponHand = this.weaponHand === 'right' ? 'left' : 'right';

        if (typeof EventBus !== 'undefined') {
            EventBus.emit('player:handSwitch', {
                entity: this,
                hand: this.weaponHand,
            });
        }

        return this.weaponHand;
    }

    // ============================================
    // Network State
    // ============================================

    /**
     * Get state for network transmission
     * @returns {object} Network state
     */
    getNetworkState() {
        return {
            crouch: this.transform?.stance.crouch || 0,
            lean: this.transform?.stance.lean || 0,
            strafe: this.transform?.stance.strafe || 0,
            lookYaw: this.transform?.look.yaw || 0,
            lookPitch: this.transform?.look.pitch || 0,
            weaponHand: this.weaponHand,
            health: this.currentHealth,
        };
    }

    /**
     * Apply state from network
     * @param {object} state - Network state
     */
    applyNetworkState(state) {
        if (this.transform) {
            if (state.crouch !== undefined) this.transform.targetStance.crouch = state.crouch;
            if (state.lean !== undefined) this.transform.targetStance.lean = state.lean;
            if (state.strafe !== undefined) this.transform.targetStance.strafe = state.strafe;
            if (state.lookYaw !== undefined) this.transform.look.yaw = state.lookYaw;
            if (state.lookPitch !== undefined) this.transform.look.pitch = state.lookPitch;
        }
        if (state.weaponHand !== undefined) this.weaponHand = state.weaponHand;
    }

    // ============================================
    // Respawn
    // ============================================

    respawn() {
        // Reset health
        this.health?.respawn();

        // Reset stance
        if (this.transform) {
            this.transform.setStance({ crouch: 0, lean: 0, strafe: 0 });
            this.transform.setLook(0, 0);
        }

        if (typeof EventBus !== 'undefined') {
            EventBus.emit(GameEvents.PLAYER_SPAWN, { entity: this });
        }
    }

    // ============================================
    // Sync with Legacy gameState
    // ============================================

    /**
     * Sync from legacy gameState object
     * @param {object} gameState - Legacy game state
     */
    syncFromLegacy(gameState) {
        if (this.transform) {
            this.transform.stance.crouch = gameState.crouch || 0;
            this.transform.stance.lean = gameState.lean || 0;
            this.transform.stance.strafe = gameState.strafe || 0;
            this.transform.targetStance.crouch = gameState.targetCrouch || 0;
            this.transform.targetStance.lean = gameState.targetLean || 0;
            this.transform.targetStance.strafe = gameState.targetStrafe || 0;
            this.transform.look.yaw = gameState.lookYaw || 0;
            this.transform.look.pitch = gameState.lookPitch || 0;
        }

        this.weaponHand = gameState.weaponHand || 'right';
        this.currentWeapon = gameState.currentWeapon || 'assault_rifle';
        this.input.keys = gameState.keys || {};
    }

    /**
     * Sync to legacy gameState object
     * @param {object} gameState - Legacy game state to update
     */
    syncToLegacy(gameState) {
        if (this.transform) {
            gameState.crouch = this.transform.stance.crouch;
            gameState.lean = this.transform.stance.lean;
            gameState.strafe = this.transform.stance.strafe;
            gameState.targetCrouch = this.transform.targetStance.crouch;
            gameState.targetLean = this.transform.targetStance.lean;
            gameState.targetStrafe = this.transform.targetStance.strafe;
            gameState.lookYaw = this.transform.look.yaw;
            gameState.lookPitch = this.transform.look.pitch;
        }

        gameState.weaponHand = this.weaponHand;
        gameState.currentWeapon = this.currentWeapon;
    }

    serialize() {
        const base = super.serialize();
        return {
            ...base,
            weaponHand: this.weaponHand,
            currentWeapon: this.currentWeapon,
            slot: this.slot,
        };
    }

    deserialize(data) {
        super.deserialize(data);
        if (data.weaponHand) this.weaponHand = data.weaponHand;
        if (data.currentWeapon) this.currentWeapon = data.currentWeapon;
        if (data.slot !== undefined) this.slot = data.slot;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Player;
}
