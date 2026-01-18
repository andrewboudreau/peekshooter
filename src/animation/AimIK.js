// ============================================
// AIM IK
// Procedural spine rotation to look at aim target
// Applied AFTER animation update, BEFORE pose overlay
// ============================================

/**
 * AimIK provides procedural spine rotation based on aim direction.
 * Distributes rotation across spine bones for natural looking aiming.
 *
 * Usage:
 *   const aimIK = AimIK.createInstance();
 *   aimIK.setAimDirect(yaw, pitch);
 *   aimIK.apply(bones, deltaTime);
 */
const AimIK = {
    /**
     * Default configuration
     */
    config: {
        // Spine bones to rotate, with weight distribution
        // Weights should sum to ~1.0 for full rotation
        spineBones: [
            { name: 'mixamorig:Spine', weight: 0.3 },
            { name: 'mixamorig:Spine1', weight: 0.4 },
            { name: 'mixamorig:Spine2', weight: 0.3 },
        ],

        // Maximum rotation angles
        maxYaw: Math.PI / 4,      // 45 degrees horizontal
        maxPitch: Math.PI / 6,    // 30 degrees vertical

        // Smoothing
        lerpSpeed: 10,            // How fast aim converges

        // Enable/disable axes
        enableYaw: true,
        enablePitch: true,
    },

    /**
     * Create a new AimIK instance for an entity
     * Each entity needs its own instance to track state
     * @param {object} customConfig - Optional configuration overrides
     * @returns {object} New AimIK instance
     */
    createInstance(customConfig = {}) {
        const instance = {
            // Configuration (merged with defaults)
            config: { ...AimIK.config, ...customConfig },

            // Current state (interpolated)
            currentYaw: 0,
            currentPitch: 0,

            // Target state (from network/input)
            targetYaw: 0,
            targetPitch: 0,

            // Enable toggle
            enabled: true,

            /**
             * Set aim target directly via yaw/pitch angles
             * @param {number} yaw - Horizontal aim angle in radians
             * @param {number} pitch - Vertical aim angle in radians
             */
            setAimDirect(yaw, pitch) {
                // Clamp to configured limits
                this.targetYaw = Math.max(-this.config.maxYaw, Math.min(this.config.maxYaw, yaw));
                this.targetPitch = Math.max(-this.config.maxPitch, Math.min(this.config.maxPitch, pitch));
            },

            /**
             * Apply aim IK to bones
             * Call this AFTER animation mixer update, BEFORE pose overlay
             * @param {Map} bones - Map of bone name -> bone object
             * @param {number} deltaTime - Time since last frame in seconds
             */
            apply(bones, deltaTime) {
                if (!this.enabled || !bones) return;

                // Smoothly interpolate current aim toward target
                const lerpFactor = 1 - Math.exp(-this.config.lerpSpeed * deltaTime);
                this.currentYaw += (this.targetYaw - this.currentYaw) * lerpFactor;
                this.currentPitch += (this.targetPitch - this.currentPitch) * lerpFactor;

                // Apply rotation to each spine bone
                for (const boneConfig of this.config.spineBones) {
                    const bone = bones.get(boneConfig.name);
                    if (!bone) continue;

                    // Calculate weighted rotation for this bone
                    const yawAmount = this.config.enableYaw ? this.currentYaw * boneConfig.weight : 0;
                    const pitchAmount = this.config.enablePitch ? this.currentPitch * boneConfig.weight : 0;

                    // Apply rotation additively to existing bone rotation
                    // Y axis = yaw (horizontal rotation)
                    // X axis = pitch (vertical rotation)
                    bone.rotation.y += yawAmount;
                    bone.rotation.x += pitchAmount;
                }
            },

            /**
             * Reset aim to center
             */
            reset() {
                this.currentYaw = 0;
                this.currentPitch = 0;
                this.targetYaw = 0;
                this.targetPitch = 0;
            },

            /**
             * Set enabled state
             * @param {boolean} enabled
             */
            setEnabled(enabled) {
                this.enabled = enabled;
                if (!enabled) {
                    this.reset();
                }
            },

            /**
             * Get current aim angles
             * @returns {object} { yaw, pitch }
             */
            getAim() {
                return {
                    yaw: this.currentYaw,
                    pitch: this.currentPitch
                };
            },

            /**
             * Get debug info
             * @returns {object}
             */
            getDebugInfo() {
                return {
                    enabled: this.enabled,
                    currentYaw: (this.currentYaw * 180 / Math.PI).toFixed(1) + '\u00B0',
                    currentPitch: (this.currentPitch * 180 / Math.PI).toFixed(1) + '\u00B0',
                    targetYaw: (this.targetYaw * 180 / Math.PI).toFixed(1) + '\u00B0',
                    targetPitch: (this.targetPitch * 180 / Math.PI).toFixed(1) + '\u00B0',
                };
            }
        };

        // Use MixamoBoneMap constants if available
        if (typeof MixamoBoneMap !== 'undefined') {
            instance.config.spineBones = [
                { name: MixamoBoneMap.SPINE, weight: 0.3 },
                { name: MixamoBoneMap.SPINE1, weight: 0.4 },
                { name: MixamoBoneMap.SPINE2, weight: 0.3 },
            ];
        }

        return instance;
    },

    /**
     * Create instance using MixamoBoneMap constants
     * @param {object} customConfig - Optional configuration overrides
     * @returns {object} New AimIK instance
     */
    createWithMixamoBones(customConfig = {}) {
        if (typeof MixamoBoneMap === 'undefined') {
            console.warn('[AimIK] MixamoBoneMap not available, using string bone names');
            return this.createInstance(customConfig);
        }

        const config = {
            spineBones: [
                { name: MixamoBoneMap.SPINE, weight: 0.3 },
                { name: MixamoBoneMap.SPINE1, weight: 0.4 },
                { name: MixamoBoneMap.SPINE2, weight: 0.3 },
            ],
            ...customConfig
        };

        return this.createInstance(config);
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AimIK;
}
