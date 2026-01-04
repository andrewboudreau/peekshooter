// ============================================
// WEAPON CONFIGURATION
// Central weapon definitions for all weapon types
// ============================================

console.log('[WeaponConfig] Loading weapon definitions...');

const WeaponConfig = {
    // ============================================
    // Weapon Definitions
    // ============================================
    weapons: {
        pistol: {
            id: 'pistol',
            name: 'Pistol',
            slot: 1,

            // Damage
            damage: {
                base: 18,
                headshotMult: 2.0,
                range: 25,
                falloffStart: 15,
            },

            // Fire mechanics
            fireRate: 400,              // RPM
            fireRateMs: 150,            // 60000/400
            allowedModes: ['single'],
            defaultMode: 'single',
            burstCount: 1,

            // Recoil
            recoil: {
                verticalBase: 0.035,
                verticalVariance: 0.01,
                horizontalBase: 0,
                horizontalVariance: 0.008,
                recovery: 6.0,
                pattern: [1.0, 1.1, 1.2],
                weaponKickBack: 0.04,
                weaponKickUp: 0.03,
            },

            // ADS (Aim Down Sights)
            ads: {
                position: { x: 0, y: -0.055, z: -0.12 },
                rotation: { x: 0, y: 0, z: 0 },
                fov: 55,
                speed: 10,
            },

            // Hip fire position (handedness applied dynamically)
            hipPosition: { x: 0.22, y: -0.18, z: -0.35 },
            hipRotation: { x: 0, y: 0.02, z: 0 },

            // Model reference
            modelType: 'pistol',
        },

        smg: {
            id: 'smg',
            name: 'SMG',
            slot: 2,

            damage: {
                base: 12,
                headshotMult: 1.5,
                range: 20,
                falloffStart: 12,
            },

            fireRate: 900,
            fireRateMs: 67,
            allowedModes: ['burst', 'auto'],
            defaultMode: 'auto',
            burstCount: 3,

            recoil: {
                verticalBase: 0.015,
                verticalVariance: 0.005,
                horizontalBase: 0,
                horizontalVariance: 0.02,
                recovery: 5.0,
                pattern: [1.0, 1.05, 1.1, 1.05, 1.0],
                weaponKickBack: 0.02,
                weaponKickUp: 0.015,
            },

            ads: {
                position: { x: 0, y: -0.065, z: -0.1 },
                rotation: { x: 0, y: 0, z: 0 },
                fov: 50,
                speed: 9,
            },

            hipPosition: { x: 0.24, y: -0.19, z: -0.38 },
            hipRotation: { x: 0, y: 0.02, z: 0 },

            modelType: 'smg',
        },

        assault_rifle: {
            id: 'assault_rifle',
            name: 'Assault Rifle',
            slot: 3,

            damage: {
                base: 15,
                headshotMult: 1.75,
                range: 40,
                falloffStart: 25,
            },

            fireRate: 600,
            fireRateMs: 100,
            allowedModes: ['single', 'burst', 'auto'],
            defaultMode: 'single',
            burstCount: 3,

            recoil: {
                verticalBase: 0.025,
                verticalVariance: 0.008,
                horizontalBase: 0,
                horizontalVariance: 0.015,
                recovery: 4.0,
                pattern: [1.0, 1.1, 1.2, 1.15, 1.1, 1.0, 0.95, 0.9],
                weaponKickBack: 0.03,
                weaponKickUp: 0.02,
            },

            ads: {
                position: { x: 0, y: -0.075, z: -0.08 },
                rotation: { x: 0, y: 0, z: 0 },
                fov: 45,
                speed: 8,
            },

            hipPosition: { x: 0.25, y: -0.2, z: -0.4 },
            hipRotation: { x: 0, y: 0.02, z: 0 },

            modelType: 'assault_rifle',
        },

        shotgun: {
            id: 'shotgun',
            name: 'Shotgun',
            slot: 4,

            damage: {
                base: 8,
                pellets: 8,             // 8 pellets x 8 damage = 64 max
                headshotMult: 1.5,
                range: 12,
                falloffStart: 6,
                spread: 0.08,           // Pellet spread angle
            },

            fireRate: 80,
            fireRateMs: 750,
            allowedModes: ['single'],
            defaultMode: 'single',
            burstCount: 1,

            recoil: {
                verticalBase: 0.06,
                verticalVariance: 0.015,
                horizontalBase: 0,
                horizontalVariance: 0.01,
                recovery: 3.0,
                pattern: [1.0, 1.1],
                weaponKickBack: 0.06,
                weaponKickUp: 0.04,
            },

            ads: {
                position: { x: 0, y: -0.08, z: -0.06 },
                rotation: { x: 0, y: 0, z: 0 },
                fov: 55,
                speed: 7,
            },

            hipPosition: { x: 0.26, y: -0.22, z: -0.42 },
            hipRotation: { x: 0, y: 0.02, z: 0 },

            modelType: 'shotgun',
        },

        sniper: {
            id: 'sniper',
            name: 'Sniper',
            slot: 5,

            damage: {
                base: 70,
                headshotMult: 2.5,
                range: 100,
                falloffStart: 60,
            },

            fireRate: 40,
            fireRateMs: 1500,
            allowedModes: ['single'],
            defaultMode: 'single',
            burstCount: 1,

            recoil: {
                verticalBase: 0.08,
                verticalVariance: 0.01,
                horizontalBase: 0,
                horizontalVariance: 0.005,
                recovery: 2.0,
                pattern: [1.0],
                weaponKickBack: 0.08,
                weaponKickUp: 0.05,
            },

            ads: {
                position: { x: 0, y: -0.06, z: -0.05 },
                rotation: { x: 0, y: 0, z: 0 },
                fov: 25,                // High zoom
                speed: 6,
            },

            hipPosition: { x: 0.27, y: -0.22, z: -0.45 },
            hipRotation: { x: 0, y: 0.02, z: 0 },

            modelType: 'sniper',
        },
    },

    // ============================================
    // Default Settings
    // ============================================
    defaultWeapon: 'assault_rifle',

    // ============================================
    // Utility Methods
    // ============================================

    /**
     * Get weapon by ID
     * @param {string} id - Weapon identifier
     * @returns {object} Weapon configuration
     */
    getWeapon(id) {
        return this.weapons[id] || this.weapons[this.defaultWeapon];
    },

    /**
     * Get weapon by slot number (1-5)
     * @param {number} slot - Key slot (1-5)
     * @returns {object|null} Weapon configuration or null
     */
    getWeaponBySlot(slot) {
        return Object.values(this.weapons).find(w => w.slot === slot) || null;
    },

    /**
     * Get all weapon IDs
     * @returns {string[]} Array of weapon IDs
     */
    getWeaponIds() {
        return Object.keys(this.weapons);
    },

    /**
     * Get weapons sorted by slot
     * @returns {object[]} Array of weapons sorted by slot
     */
    getWeaponsBySlot() {
        return Object.values(this.weapons).sort((a, b) => a.slot - b.slot);
    },

    /**
     * Check if fire mode is allowed for weapon
     * @param {string} weaponId - Weapon identifier
     * @param {string} mode - Fire mode (single, burst, auto)
     * @returns {boolean}
     */
    isFireModeAllowed(weaponId, mode) {
        const weapon = this.getWeapon(weaponId);
        return weapon.allowedModes.includes(mode);
    },

    /**
     * Get next allowed fire mode for weapon
     * @param {string} weaponId - Weapon identifier
     * @param {string} currentMode - Current fire mode
     * @returns {string} Next fire mode
     */
    getNextAllowedFireMode(weaponId, currentMode) {
        const weapon = this.getWeapon(weaponId);
        const modes = weapon.allowedModes;
        const currentIndex = modes.indexOf(currentMode);
        if (currentIndex === -1) {
            return modes[0];
        }
        return modes[(currentIndex + 1) % modes.length];
    },

    /**
     * Get damage for weapon considering body part
     * @param {string} weaponId - Weapon identifier
     * @param {string} bodyPart - Body part hit
     * @returns {number} Damage value
     */
    getDamage(weaponId, bodyPart = 'chest') {
        const weapon = this.getWeapon(weaponId);
        let damage = weapon.damage.base;

        if (bodyPart === 'head') {
            damage *= weapon.damage.headshotMult;
        }

        return Math.round(damage);
    },
};

console.log('[WeaponConfig] Loaded', Object.keys(WeaponConfig.weapons).length, 'weapons');

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeaponConfig;
}
