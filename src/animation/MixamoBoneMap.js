// ============================================
// MIXAMO BONE MAP
// Standard Mixamo bone naming constants
//
// All code should use these constants for bone references.
// This ensures compatibility with Mixamo animations and models.
// ============================================

const MixamoBoneMap = {
    // ========================================
    // BONE NAME CONSTANTS
    // Use these everywhere for bone references
    // ========================================

    // Spine chain
    HIPS: 'mixamorig:Hips',
    SPINE: 'mixamorig:Spine',
    SPINE1: 'mixamorig:Spine1',
    SPINE2: 'mixamorig:Spine2',
    NECK: 'mixamorig:Neck',
    HEAD: 'mixamorig:Head',

    // Left arm
    LEFT_SHOULDER: 'mixamorig:LeftShoulder',
    LEFT_ARM: 'mixamorig:LeftArm',
    LEFT_FOREARM: 'mixamorig:LeftForeArm',
    LEFT_HAND: 'mixamorig:LeftHand',

    // Right arm
    RIGHT_SHOULDER: 'mixamorig:RightShoulder',
    RIGHT_ARM: 'mixamorig:RightArm',
    RIGHT_FOREARM: 'mixamorig:RightForeArm',
    RIGHT_HAND: 'mixamorig:RightHand',

    // Left leg
    LEFT_UP_LEG: 'mixamorig:LeftUpLeg',
    LEFT_LEG: 'mixamorig:LeftLeg',
    LEFT_FOOT: 'mixamorig:LeftFoot',
    LEFT_TOE: 'mixamorig:LeftToeBase',

    // Right leg
    RIGHT_UP_LEG: 'mixamorig:RightUpLeg',
    RIGHT_LEG: 'mixamorig:RightLeg',
    RIGHT_FOOT: 'mixamorig:RightFoot',
    RIGHT_TOE: 'mixamorig:RightToeBase',

    // Left hand fingers
    LEFT_THUMB1: 'mixamorig:LeftHandThumb1',
    LEFT_THUMB2: 'mixamorig:LeftHandThumb2',
    LEFT_THUMB3: 'mixamorig:LeftHandThumb3',
    LEFT_INDEX1: 'mixamorig:LeftHandIndex1',
    LEFT_INDEX2: 'mixamorig:LeftHandIndex2',
    LEFT_INDEX3: 'mixamorig:LeftHandIndex3',
    LEFT_MIDDLE1: 'mixamorig:LeftHandMiddle1',
    LEFT_MIDDLE2: 'mixamorig:LeftHandMiddle2',
    LEFT_MIDDLE3: 'mixamorig:LeftHandMiddle3',
    LEFT_RING1: 'mixamorig:LeftHandRing1',
    LEFT_RING2: 'mixamorig:LeftHandRing2',
    LEFT_RING3: 'mixamorig:LeftHandRing3',
    LEFT_PINKY1: 'mixamorig:LeftHandPinky1',
    LEFT_PINKY2: 'mixamorig:LeftHandPinky2',
    LEFT_PINKY3: 'mixamorig:LeftHandPinky3',

    // Right hand fingers
    RIGHT_THUMB1: 'mixamorig:RightHandThumb1',
    RIGHT_THUMB2: 'mixamorig:RightHandThumb2',
    RIGHT_THUMB3: 'mixamorig:RightHandThumb3',
    RIGHT_INDEX1: 'mixamorig:RightHandIndex1',
    RIGHT_INDEX2: 'mixamorig:RightHandIndex2',
    RIGHT_INDEX3: 'mixamorig:RightHandIndex3',
    RIGHT_MIDDLE1: 'mixamorig:RightHandMiddle1',
    RIGHT_MIDDLE2: 'mixamorig:RightHandMiddle2',
    RIGHT_MIDDLE3: 'mixamorig:RightHandMiddle3',
    RIGHT_RING1: 'mixamorig:RightHandRing1',
    RIGHT_RING2: 'mixamorig:RightHandRing2',
    RIGHT_RING3: 'mixamorig:RightHandRing3',
    RIGHT_PINKY1: 'mixamorig:RightHandPinky1',
    RIGHT_PINKY2: 'mixamorig:RightHandPinky2',
    RIGHT_PINKY3: 'mixamorig:RightHandPinky3',

    // Eyes (custom - not in standard Mixamo but useful for procedural)
    LEFT_EYE: 'mixamorig:LeftEye',
    RIGHT_EYE: 'mixamorig:RightEye',

    // ========================================
    // UTILITY METHODS
    // ========================================

    /**
     * Check if a bone name is a Mixamo bone
     * @param {string} boneName - Bone name to check
     * @returns {boolean}
     */
    isMixamoBone(boneName) {
        return boneName && boneName.startsWith('mixamorig:');
    },

    /**
     * Get all unmapped bones from a skeleton
     * @param {THREE.Skeleton} skeleton - Three.js skeleton
     * @returns {string[]} Array of bone names that don't match known Mixamo bones
     */
    getUnmappedBones(skeleton) {
        const knownBones = new Set(Object.values(this).filter(v => typeof v === 'string'));
        const unmapped = [];
        skeleton.bones.forEach(bone => {
            if (this.isMixamoBone(bone.name) && !knownBones.has(bone.name)) {
                unmapped.push(bone.name);
            }
        });
        return unmapped;
    },

    /**
     * Get bone hierarchy depth for sorting
     * @param {string} boneName - Mixamo bone name
     * @returns {number} Hierarchy depth (0 = root)
     */
    getBoneDepth(boneName) {
        const depths = {
            [this.HIPS]: 0,
            [this.SPINE]: 1,
            [this.SPINE1]: 2,
            [this.SPINE2]: 3,
            [this.NECK]: 4,
            [this.HEAD]: 5,
            [this.LEFT_SHOULDER]: 4, [this.RIGHT_SHOULDER]: 4,
            [this.LEFT_ARM]: 5, [this.RIGHT_ARM]: 5,
            [this.LEFT_FOREARM]: 6, [this.RIGHT_FOREARM]: 6,
            [this.LEFT_HAND]: 7, [this.RIGHT_HAND]: 7,
            [this.LEFT_UP_LEG]: 1, [this.RIGHT_UP_LEG]: 1,
            [this.LEFT_LEG]: 2, [this.RIGHT_LEG]: 2,
            [this.LEFT_FOOT]: 3, [this.RIGHT_FOOT]: 3,
            [this.LEFT_TOE]: 4, [this.RIGHT_TOE]: 4,
        };
        return depths[boneName] !== undefined ? depths[boneName] : 8;
    },

    /**
     * Get the mirrored bone name (left <-> right)
     * @param {string} boneName - Bone name to mirror
     * @returns {string} Mirrored bone name
     */
    getMirroredBone(boneName) {
        if (boneName.includes('Left')) {
            return boneName.replace('Left', 'Right');
        }
        if (boneName.includes('Right')) {
            return boneName.replace('Right', 'Left');
        }
        return boneName;
    },

    /**
     * Get all core bones (excludes fingers)
     * @returns {string[]} Array of core bone names
     */
    getCoreBones() {
        return [
            this.HIPS, this.SPINE, this.SPINE1, this.SPINE2, this.NECK, this.HEAD,
            this.LEFT_SHOULDER, this.LEFT_ARM, this.LEFT_FOREARM, this.LEFT_HAND,
            this.RIGHT_SHOULDER, this.RIGHT_ARM, this.RIGHT_FOREARM, this.RIGHT_HAND,
            this.LEFT_UP_LEG, this.LEFT_LEG, this.LEFT_FOOT, this.LEFT_TOE,
            this.RIGHT_UP_LEG, this.RIGHT_LEG, this.RIGHT_FOOT, this.RIGHT_TOE,
        ];
    },

    /**
     * Hitbox part mapping - maps bone names to damage categories
     * Used by damage system to determine hit damage
     */
    hitboxParts: {
        'mixamorig:Head': { part: 'head', critical: true },
        'mixamorig:Neck': { part: 'head', critical: false },
        'mixamorig:Spine2': { part: 'chest', critical: false },
        'mixamorig:Spine1': { part: 'chest', critical: false },
        'mixamorig:Spine': { part: 'belly', critical: false },
        'mixamorig:Hips': { part: 'pelvis', critical: false },
        'mixamorig:LeftShoulder': { part: 'arm', critical: false },
        'mixamorig:RightShoulder': { part: 'arm', critical: false },
        'mixamorig:LeftArm': { part: 'arm', critical: false },
        'mixamorig:RightArm': { part: 'arm', critical: false },
        'mixamorig:LeftForeArm': { part: 'arm', critical: false },
        'mixamorig:RightForeArm': { part: 'arm', critical: false },
        'mixamorig:LeftHand': { part: 'arm', critical: false },
        'mixamorig:RightHand': { part: 'arm', critical: false },
        'mixamorig:LeftUpLeg': { part: 'leg', critical: false },
        'mixamorig:RightUpLeg': { part: 'leg', critical: false },
        'mixamorig:LeftLeg': { part: 'leg', critical: false },
        'mixamorig:RightLeg': { part: 'leg', critical: false },
        'mixamorig:LeftFoot': { part: 'leg', critical: false },
        'mixamorig:RightFoot': { part: 'leg', critical: false },
    },

    /**
     * Get hitbox info for a bone
     * @param {string} boneName - Bone name
     * @returns {object|null} Hitbox part info or null
     */
    getHitboxPart(boneName) {
        return this.hitboxParts[boneName] || null;
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MixamoBoneMap;
}
