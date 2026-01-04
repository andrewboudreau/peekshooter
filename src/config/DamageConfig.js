// ============================================
// DAMAGE CONFIGURATION
// Centralized damage values for all weapons and body parts
// ============================================

console.log('[DamageConfig] Loading...');

const DamageConfig = {
    // Body part damage values
    bodyParts: {
        head: {
            damage: 25,
            multiplier: 1.0,
            label: 'HEADSHOT!',
            color: '#ff4444',
            colorHex: 0xff4444,
        },
        chest: {
            damage: 15,
            multiplier: 1.0,
            label: 'CHEST',
            color: '#ff8800',
            colorHex: 0xff8800,
        },
        belly: {
            damage: 10,
            multiplier: 1.0,
            label: 'BODY',
            color: '#ffff00',
            colorHex: 0xffff00,
        },
        arm: {
            damage: 5,
            multiplier: 1.0,
            label: 'ARM',
            color: '#00ff00',
            colorHex: 0x00ff00,
        },
    },

    // Default/fallback damage
    defaultDamage: 10,

    // Distance-based damage falloff (future feature)
    falloff: {
        enabled: false,
        startDistance: 10,      // Full damage up to this distance
        endDistance: 30,        // Minimum damage at this distance
        minMultiplier: 0.5,     // Minimum damage multiplier
    },

    // Health values
    health: {
        player: 100,
        opponent: 100,
    },

    // Get damage for a body part
    getDamage(bodyPart, distance = 0) {
        const part = this.bodyParts[bodyPart];
        if (!part) return this.defaultDamage;

        let damage = part.damage * part.multiplier;

        // Apply distance falloff if enabled
        if (this.falloff.enabled && distance > this.falloff.startDistance) {
            const falloffRange = this.falloff.endDistance - this.falloff.startDistance;
            const falloffProgress = Math.min(1, (distance - this.falloff.startDistance) / falloffRange);
            const falloffMultiplier = 1 - (falloffProgress * (1 - this.falloff.minMultiplier));
            damage *= falloffMultiplier;
        }

        return Math.round(damage);
    },

    // Get display info for a body part
    getPartInfo(bodyPart) {
        return this.bodyParts[bodyPart] || {
            damage: this.defaultDamage,
            multiplier: 1.0,
            label: bodyPart.toUpperCase(),
            color: '#ffffff',
            colorHex: 0xffffff,
        };
    },
};

// Export for module usage (when we migrate to modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DamageConfig;
}
