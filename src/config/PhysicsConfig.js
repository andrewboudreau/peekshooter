// ============================================
// PHYSICS CONFIGURATION
// Centralized physics and movement constants
// ============================================

const PhysicsConfig = {
    // World physics
    world: {
        gravity: -9.8,
    },

    // Player movement
    player: {
        // Stance speeds (how fast values change)
        crouchSpeed: 3,
        leanSpeed: 4,
        strafeSpeed: 3,
        stanceSmoothing: 8,

        // Mouse look
        mouseSensitivity: 0.002,
        lookLimitYaw: 0.8,      // Max horizontal look angle (radians)
        lookLimitPitch: 0.5,    // Max vertical look angle (radians)

        // Camera/position
        baseHeight: 1.6,        // Standing eye height
        crouchAmount: 0.8,      // How much crouching lowers camera
        leanAmount: 0.6,        // How far to lean sideways
        leanTilt: 0.15,         // How much camera tilts when leaning
        strafeAmount: 2.0,      // How far to strafe sideways
    },

    // Opponent model
    opponent: {
        // Body part sizes
        headRadius: 0.18,
        chestRadius: [0.28, 0.25],  // top, bottom
        chestHeight: 0.5,
        bellyRadius: [0.25, 0.28],  // top, bottom
        bellyHeight: 0.45,
        armRadius: 0.08,
        armLength: 0.6,

        // Positions
        headY: 1.45,
        chestY: 1.0,
        bellyY: 0.5,
        armY: 0.95,
        armOffsetX: 0.38,
        armAngle: 0.2,

        // Spawn position
        spawnZ: -15,
    },

    // Blood particles
    blood: {
        particleCount: [8, 16],         // min, max particles
        particleSize: [0.03, 0.08],     // min, max size
        particleLifetime: [800, 1200],  // ms
        particleGravity: -9.8,
        particleSpread: 0.5,
        particleSpeed: [2, 5],          // min, max initial speed

        sprayCount: 5,
        sprayLength: [0.2, 0.5],
        sprayLifetime: [150, 250],      // ms (quick flash)

        decalSize: [0.1, 0.25],
        decalLifetime: [1500, 2000],    // ms
        decalBlobCount: [3, 6],
    },

    // Hit marks (bullet holes)
    hitMarks: {
        size: [0.08, 0.12],             // min, max size
        lifetime: 10000,                 // ms
        ringScale: [0.8, 1.2],          // inner, outer ring multiplier
    },

    // Cover/environment
    cover: {
        playerCoverZ: -0.5,
        opponentCoverZ: -14.5,
        sideOffset: 1.65,
    },

    // Network
    network: {
        stateUpdateRate: 60,            // updates per second
    },

    // Bot AI timing
    bot: {
        moveTime: 1.5,
        peekTime: 0.8,
        holdTime: 0.3,
        unpeekTime: 0.4,
        accuracy: 0.6,
        strafeAmount: 0.8,
        leanAmount: 0.8,
    },
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PhysicsConfig;
}
