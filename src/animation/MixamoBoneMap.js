// ============================================
// MIXAMO BONE MAP
// Standard bone naming reference for animation systems
//
// CONVENTION: Mixamo names are the STANDARD (industry-wide recognition)
// Internal aliases exist for backwards compatibility with procedural model
// ============================================

const MixamoBoneMap = {
    /**
     * Standard Mixamo bone names (PREFERRED)
     * Use these when writing new code
     */
    standard: {
        // Spine
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
    },

    /**
     * Mapping from Mixamo bone names to internal aliases
     * Used for backwards compatibility with procedural HumanoidFactory
     */
    map: {
        // Spine
        'mixamorig:Hips': 'pelvis',
        'mixamorig:Spine': 'stomach',
        'mixamorig:Spine1': 'chest',
        'mixamorig:Spine2': 'chest',  // Upper chest also maps to chest
        'mixamorig:Neck': 'neck',
        'mixamorig:Head': 'head',

        // Left arm
        'mixamorig:LeftShoulder': 'shoulderL',
        'mixamorig:LeftArm': 'upperArmL',
        'mixamorig:LeftForeArm': 'elbowL',
        'mixamorig:LeftHand': 'handL',

        // Right arm
        'mixamorig:RightShoulder': 'shoulderR',
        'mixamorig:RightArm': 'upperArmR',
        'mixamorig:RightForeArm': 'elbowR',
        'mixamorig:RightHand': 'handR',

        // Left leg
        'mixamorig:LeftUpLeg': 'hipL',
        'mixamorig:LeftLeg': 'kneeL',
        'mixamorig:LeftFoot': 'ankleL',
        'mixamorig:LeftToeBase': 'toeL',

        // Right leg
        'mixamorig:RightUpLeg': 'hipR',
        'mixamorig:RightLeg': 'kneeR',
        'mixamorig:RightFoot': 'ankleR',
        'mixamorig:RightToeBase': 'toeR',

        // Fingers (left hand)
        'mixamorig:LeftHandThumb1': 'thumbL1',
        'mixamorig:LeftHandThumb2': 'thumbL2',
        'mixamorig:LeftHandThumb3': 'thumbL3',
        'mixamorig:LeftHandIndex1': 'indexL1',
        'mixamorig:LeftHandIndex2': 'indexL2',
        'mixamorig:LeftHandIndex3': 'indexL3',
        'mixamorig:LeftHandMiddle1': 'middleL1',
        'mixamorig:LeftHandMiddle2': 'middleL2',
        'mixamorig:LeftHandMiddle3': 'middleL3',
        'mixamorig:LeftHandRing1': 'ringL1',
        'mixamorig:LeftHandRing2': 'ringL2',
        'mixamorig:LeftHandRing3': 'ringL3',
        'mixamorig:LeftHandPinky1': 'pinkyL1',
        'mixamorig:LeftHandPinky2': 'pinkyL2',
        'mixamorig:LeftHandPinky3': 'pinkyL3',

        // Fingers (right hand)
        'mixamorig:RightHandThumb1': 'thumbR1',
        'mixamorig:RightHandThumb2': 'thumbR2',
        'mixamorig:RightHandThumb3': 'thumbR3',
        'mixamorig:RightHandIndex1': 'indexR1',
        'mixamorig:RightHandIndex2': 'indexR2',
        'mixamorig:RightHandIndex3': 'indexR3',
        'mixamorig:RightHandMiddle1': 'middleR1',
        'mixamorig:RightHandMiddle2': 'middleR2',
        'mixamorig:RightHandMiddle3': 'middleR3',
        'mixamorig:RightHandRing1': 'ringR1',
        'mixamorig:RightHandRing2': 'ringR2',
        'mixamorig:RightHandRing3': 'ringR3',
        'mixamorig:RightHandPinky1': 'pinkyR1',
        'mixamorig:RightHandPinky2': 'pinkyR2',
        'mixamorig:RightHandPinky3': 'pinkyR3',
    },

    /**
     * Reverse mapping from our bone names to Mixamo names
     */
    _reverseMap: null,

    /**
     * Get our internal bone name from a Mixamo bone name
     * @param {string} mixamoBone - Mixamo bone name (e.g. "mixamorig:Hips")
     * @returns {string|null} Our internal bone name or null if not mapped
     */
    getMapped(mixamoBone) {
        return this.map[mixamoBone] || null;
    },

    /**
     * Get the Mixamo bone name from our internal bone name
     * @param {string} ourBone - Our internal bone name (e.g. "pelvis")
     * @returns {string|null} Mixamo bone name or null if not mapped
     */
    getOriginal(ourBone) {
        // Build reverse map lazily
        if (!this._reverseMap) {
            this._reverseMap = {};
            for (const [mixamo, ours] of Object.entries(this.map)) {
                // Only keep first mapping (e.g., Spine1 not Spine2 for chest)
                if (!this._reverseMap[ours]) {
                    this._reverseMap[ours] = mixamo;
                }
            }
        }
        return this._reverseMap[ourBone] || null;
    },

    /**
     * Check if a bone name is a Mixamo bone
     * @param {string} boneName - Bone name to check
     * @returns {boolean}
     */
    isMixamoBone(boneName) {
        return boneName.startsWith('mixamorig:');
    },

    /**
     * Get all unmapped bones from a skeleton
     * @param {THREE.Skeleton} skeleton - Three.js skeleton
     * @returns {string[]} Array of bone names that are not mapped
     */
    getUnmappedBones(skeleton) {
        const unmapped = [];
        skeleton.bones.forEach(bone => {
            if (this.isMixamoBone(bone.name) && !this.getMapped(bone.name)) {
                unmapped.push(bone.name);
            }
        });
        return unmapped;
    },

    /**
     * Rename animation clip tracks from Mixamo to our bone names
     * @param {THREE.AnimationClip} clip - Animation clip to remap
     * @returns {THREE.AnimationClip} New clip with remapped track names
     */
    remapClip(clip) {
        const tracks = clip.tracks.map(track => {
            // Track names are like "mixamorig:Hips.position" or "mixamorig:Hips.quaternion"
            const parts = track.name.split('.');
            const boneName = parts[0];
            const property = parts.slice(1).join('.');

            const mappedBone = this.getMapped(boneName);
            if (mappedBone) {
                // Clone track with new name
                const newTrack = track.clone();
                newTrack.name = `${mappedBone}.${property}`;
                return newTrack;
            }

            // Keep original if not mapped
            return track.clone();
        });

        return new THREE.AnimationClip(clip.name, clip.duration, tracks);
    },

    /**
     * Get bone hierarchy depth for sorting
     * @param {string} boneName - Bone name (our internal name)
     * @returns {number} Hierarchy depth (0 = root)
     */
    getBoneDepth(boneName) {
        const depths = {
            pelvis: 0,
            stomach: 1,
            chest: 2,
            neck: 3,
            head: 4,
            shoulderL: 3, shoulderR: 3,
            upperArmL: 4, upperArmR: 4,
            elbowL: 5, elbowR: 5,
            handL: 6, handR: 6,
            hipL: 1, hipR: 1,
            kneeL: 2, kneeR: 2,
            ankleL: 3, ankleR: 3,
            toeL: 4, toeR: 4,
        };
        return depths[boneName] !== undefined ? depths[boneName] : 7;
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MixamoBoneMap;
}
