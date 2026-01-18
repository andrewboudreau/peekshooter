// ============================================
// HUMANOID FACTORY
// Creates articulated humanoid models with bone rigs
// ============================================

console.log('[HumanoidFactory] Loading...');

const HumanoidFactory = {
    // Body proportions (in meters, based on average adult)
    proportions: {
        // Total height ~1.75m
        head: { radius: 0.11, height: 0.24 },
        neck: { radius: 0.07, height: 0.10 },

        // Torso
        chest: { width: 0.38, height: 0.30, depth: 0.24 },
        stomach: { width: 0.32, height: 0.18, depth: 0.20 },
        pelvis: { width: 0.34, height: 0.16, depth: 0.22 },

        // Arms (increased for visibility)
        shoulder: { radius: 0.08 },
        upperArm: { radius: 0.055, length: 0.30 },
        forearm: { radius: 0.048, length: 0.28 },
        wrist: { radius: 0.035 },
        hand: { width: 0.09, height: 0.11, depth: 0.03 },
        finger: { radius: 0.014, length: 0.07 },
        thumb: { radius: 0.016, length: 0.05 },

        // Legs
        thigh: { radius: 0.08, length: 0.44 },
        knee: { radius: 0.06 },
        shin: { radius: 0.055, length: 0.40 },
        ankle: { radius: 0.04 },
        foot: { width: 0.11, height: 0.09, length: 0.26 },

        // Eyes
        eye: { radius: 0.018 },
        eyeOffset: { x: 0.04, y: 0.04, z: 0.09 },
    },

    // Joint positions relative to parent bone (Y-up)
    joints: {
        // Spine chain (bottom-up)
        pelvis: { y: 0.85 },  // Hip height from ground
        stomach: { y: 0.14 }, // Relative to pelvis
        chest: { y: 0.16 },   // Relative to stomach
        neck: { y: 0.28 },    // Relative to chest
        head: { y: 0.08 },    // Relative to neck

        // Arms (relative to chest)
        shoulderL: { x: -0.20, y: 0.22 },
        shoulderR: { x: 0.20, y: 0.22 },
        upperArmL: { x: -0.06, y: 0 },
        upperArmR: { x: 0.06, y: 0 },
        elbowL: { y: -0.28 },
        elbowR: { y: -0.28 },
        wristL: { y: -0.26 },
        wristR: { y: -0.26 },
        handL: { y: -0.03 },
        handR: { y: -0.03 },

        // Legs (relative to pelvis)
        hipL: { x: -0.10, y: -0.05 },
        hipR: { x: 0.10, y: -0.05 },
        kneeL: { y: -0.42 },
        kneeR: { y: -0.42 },
        ankleL: { y: -0.38 },
        ankleR: { y: -0.38 },
        footL: { y: -0.04, z: 0.06 },
        footR: { y: -0.04, z: 0.06 },
    },

    /**
     * Create a capsule mesh (pill shape) as a group
     * Returns a group containing cylinder body + sphere caps
     */
    createCapsule(radius, length, material, radialSegments = 8) {
        const group = new THREE.Group();

        const cylinderHeight = Math.max(0.001, length - radius * 2);

        // Cylinder body
        const cylinderGeo = new THREE.CylinderGeometry(
            radius, radius, cylinderHeight, radialSegments
        );
        const cylinder = new THREE.Mesh(cylinderGeo, material);
        group.add(cylinder);

        // Top cap
        const topCapGeo = new THREE.SphereGeometry(radius, radialSegments, radialSegments / 2);
        const topCap = new THREE.Mesh(topCapGeo, material);
        topCap.position.y = cylinderHeight / 2;
        group.add(topCap);

        // Bottom cap
        const bottomCapGeo = new THREE.SphereGeometry(radius, radialSegments, radialSegments / 2);
        const bottomCap = new THREE.Mesh(bottomCapGeo, material);
        bottomCap.position.y = -cylinderHeight / 2;
        group.add(bottomCap);

        return group;
    },

    /**
     * Create a capsule geometry (simplified - just uses stretched sphere)
     * This is a fallback for when we need actual geometry
     */
    createCapsuleGeometry(radius, length, capSegments = 8, radialSegments = 12) {
        // Simple approach: use a scaled sphere
        const geometry = new THREE.SphereGeometry(radius, radialSegments, capSegments);
        // Scale Y to create elongated capsule effect
        const scaleY = length / (radius * 2);
        geometry.scale(1, scaleY, 1);
        return geometry;
    },

    /**
     * Create a bone with optional mesh attached
     * @param {string} name - Bone identifier
     * @param {THREE.Geometry} geometry - Optional geometry to attach
     * @param {THREE.Material} material - Optional material
     * @returns {THREE.Group} Bone group with mesh
     */
    createBone(name, geometry = null, material = null) {
        const bone = new THREE.Group();
        bone.name = name;
        bone.userData.isBone = true;
        bone.userData.boneName = name;

        if (geometry && material) {
            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = `${name}_mesh`;
            mesh.userData.boneName = name;
            bone.add(mesh);
            bone.userData.mesh = mesh;
        }

        return bone;
    },

    /**
     * Create a full humanoid model
     * @param {object} options - Configuration options
     * @returns {object} { root, bones, hitboxes }
     */
    create(options = {}) {
        const {
            teamColor = 0x4444aa,
            skinColor = 0xddccbb,
            eyeColor = 0x446688,
            hasMask = false,
            maskColor = 0x222222,
            slot = 0
        } = options;

        const p = this.proportions;
        const j = this.joints;

        // Materials
        const skinMat = new THREE.MeshStandardMaterial({
            color: skinColor,
            roughness: 0.8,
            flatShading: false
        });
        const clothMat = new THREE.MeshStandardMaterial({
            color: teamColor,
            roughness: 0.7
        });
        const darkClothMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.6
        });
        const eyeMat = new THREE.MeshStandardMaterial({
            color: eyeColor,
            roughness: 0.3
        });
        const eyeWhiteMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.3
        });

        // Root group
        const root = new THREE.Group();
        root.name = 'humanoid_root';

        // Bone storage
        const bones = {};
        const hitboxes = [];

        // ========== SPINE CHAIN ==========

        // Pelvis (root of skeleton)
        const pelvisGeo = new THREE.BoxGeometry(p.pelvis.width, p.pelvis.height, p.pelvis.depth);
        bones.pelvis = this.createBone('pelvis', pelvisGeo, clothMat.clone());
        bones.pelvis.position.y = j.pelvis.y;
        root.add(bones.pelvis);
        hitboxes.push({ bone: 'pelvis', part: 'pelvis', mesh: bones.pelvis.userData.mesh });

        // Stomach
        const stomachGeo = new THREE.BoxGeometry(p.stomach.width, p.stomach.height, p.stomach.depth);
        bones.stomach = this.createBone('stomach', stomachGeo, clothMat.clone());
        bones.stomach.position.y = j.stomach.y;
        bones.pelvis.add(bones.stomach);
        hitboxes.push({ bone: 'stomach', part: 'belly', mesh: bones.stomach.userData.mesh });

        // Chest
        const chestGeo = new THREE.BoxGeometry(p.chest.width, p.chest.height, p.chest.depth);
        bones.chest = this.createBone('chest', chestGeo, clothMat.clone());
        bones.chest.position.y = j.chest.y;
        bones.stomach.add(bones.chest);
        hitboxes.push({ bone: 'chest', part: 'chest', mesh: bones.chest.userData.mesh });

        // Neck
        const neckGeo = this.createCapsuleGeometry(p.neck.radius, p.neck.height);
        bones.neck = this.createBone('neck', neckGeo, skinMat.clone());
        bones.neck.position.y = j.neck.y;
        bones.chest.add(bones.neck);

        // Head
        const headGeo = new THREE.SphereGeometry(p.head.radius, 16, 12);
        bones.head = this.createBone('head', headGeo, skinMat.clone());
        bones.head.position.y = j.head.y + p.head.radius;
        bones.neck.add(bones.head);
        hitboxes.push({ bone: 'head', part: 'head', mesh: bones.head.userData.mesh, critical: true });

        // Eyes
        const eyeWhiteGeo = new THREE.SphereGeometry(p.eye.radius * 1.5, 8, 6);
        const eyeGeo = new THREE.SphereGeometry(p.eye.radius, 8, 6);

        bones.eyeL = this.createBone('eyeL', eyeWhiteGeo, eyeWhiteMat.clone());
        bones.eyeL.position.set(-p.eyeOffset.x, p.eyeOffset.y, p.eyeOffset.z);
        bones.head.add(bones.eyeL);

        const pupilL = new THREE.Mesh(eyeGeo, eyeMat.clone());
        pupilL.position.z = p.eye.radius * 0.8;
        bones.eyeL.add(pupilL);

        bones.eyeR = this.createBone('eyeR', eyeWhiteGeo.clone(), eyeWhiteMat.clone());
        bones.eyeR.position.set(p.eyeOffset.x, p.eyeOffset.y, p.eyeOffset.z);
        bones.head.add(bones.eyeR);

        const pupilR = new THREE.Mesh(eyeGeo.clone(), eyeMat.clone());
        pupilR.position.z = p.eye.radius * 0.8;
        bones.eyeR.add(pupilR);

        // Face mask (optional)
        if (hasMask) {
            const maskMat = new THREE.MeshStandardMaterial({ color: maskColor, roughness: 0.5 });
            const maskGeo = new THREE.BoxGeometry(p.head.radius * 1.6, p.head.radius * 0.8, p.head.radius * 0.5);
            const mask = new THREE.Mesh(maskGeo, maskMat);
            mask.position.set(0, -p.head.radius * 0.2, p.head.radius * 0.7);
            bones.head.add(mask);
        }

        // ========== ARMS ==========

        ['L', 'R'].forEach(side => {
            const sign = side === 'L' ? -1 : 1;
            const prefix = side.toLowerCase();

            // Shoulder joint
            bones[`shoulder${side}`] = this.createBone(`shoulder${side}`,
                new THREE.SphereGeometry(p.shoulder.radius, 8, 6), skinMat.clone());
            bones[`shoulder${side}`].position.set(
                j[`shoulder${side}`].x,
                j[`shoulder${side}`].y,
                0
            );
            bones.chest.add(bones[`shoulder${side}`]);

            // Upper arm
            const upperArmGeo = this.createCapsuleGeometry(p.upperArm.radius, p.upperArm.length);
            bones[`upperArm${side}`] = this.createBone(`upperArm${side}`, upperArmGeo, skinMat.clone());
            bones[`upperArm${side}`].position.set(sign * p.shoulder.radius, 0, 0);
            bones[`upperArm${side}`].userData.mesh.position.y = -p.upperArm.length / 2;
            bones[`shoulder${side}`].add(bones[`upperArm${side}`]);
            hitboxes.push({ bone: `upperArm${side}`, part: 'arm', mesh: bones[`upperArm${side}`].userData.mesh });

            // Elbow
            bones[`elbow${side}`] = this.createBone(`elbow${side}`,
                new THREE.SphereGeometry(p.upperArm.radius * 1.1, 8, 6), skinMat.clone());
            bones[`elbow${side}`].position.y = j[`elbow${side}`].y;
            bones[`upperArm${side}`].add(bones[`elbow${side}`]);

            // Forearm
            const forearmGeo = this.createCapsuleGeometry(p.forearm.radius, p.forearm.length);
            bones[`forearm${side}`] = this.createBone(`forearm${side}`, forearmGeo, skinMat.clone());
            bones[`forearm${side}`].userData.mesh.position.y = -p.forearm.length / 2;
            bones[`elbow${side}`].add(bones[`forearm${side}`]);
            hitboxes.push({ bone: `forearm${side}`, part: 'arm', mesh: bones[`forearm${side}`].userData.mesh });

            // Wrist
            bones[`wrist${side}`] = this.createBone(`wrist${side}`,
                new THREE.SphereGeometry(p.wrist.radius, 8, 6), skinMat.clone());
            bones[`wrist${side}`].position.y = j[`wrist${side}`].y;
            bones[`forearm${side}`].add(bones[`wrist${side}`]);

            // Hand
            const handGeo = new THREE.BoxGeometry(p.hand.width, p.hand.height, p.hand.depth);
            bones[`hand${side}`] = this.createBone(`hand${side}`, handGeo, skinMat.clone());
            bones[`hand${side}`].position.y = j[`hand${side}`].y;
            bones[`hand${side}`].userData.mesh.position.y = -p.hand.height / 2;
            bones[`wrist${side}`].add(bones[`hand${side}`]);

            // Fingers (simplified: 4 fingers + thumb)
            const fingerOffsets = [
                { x: -0.024, name: 'index' },
                { x: -0.008, name: 'middle' },
                { x: 0.008, name: 'ring' },
                { x: 0.024, name: 'pinky' }
            ];

            fingerOffsets.forEach(finger => {
                const fingerGeo = this.createCapsuleGeometry(p.finger.radius, p.finger.length);
                bones[`${finger.name}${side}`] = this.createBone(`${finger.name}${side}`, fingerGeo, skinMat.clone());
                bones[`${finger.name}${side}`].position.set(finger.x, -p.hand.height, 0);
                bones[`${finger.name}${side}`].userData.mesh.position.y = -p.finger.length / 2;
                bones[`hand${side}`].add(bones[`${finger.name}${side}`]);
            });

            // Thumb
            const thumbGeo = this.createCapsuleGeometry(p.thumb.radius, p.thumb.length);
            bones[`thumb${side}`] = this.createBone(`thumb${side}`, thumbGeo, skinMat.clone());
            bones[`thumb${side}`].position.set(sign * (p.hand.width / 2 + 0.01), -p.hand.height * 0.3, 0);
            bones[`thumb${side}`].rotation.z = sign * 0.8;
            bones[`thumb${side}`].userData.mesh.position.y = -p.thumb.length / 2;
            bones[`hand${side}`].add(bones[`thumb${side}`]);
        });

        // ========== LEGS ==========

        ['L', 'R'].forEach(side => {
            const sign = side === 'L' ? -1 : 1;

            // Hip joint
            bones[`hip${side}`] = this.createBone(`hip${side}`,
                new THREE.SphereGeometry(p.thigh.radius * 0.9, 8, 6), clothMat.clone());
            bones[`hip${side}`].position.set(j[`hip${side}`].x, j[`hip${side}`].y, 0);
            bones.pelvis.add(bones[`hip${side}`]);

            // Thigh
            const thighGeo = this.createCapsuleGeometry(p.thigh.radius, p.thigh.length);
            bones[`thigh${side}`] = this.createBone(`thigh${side}`, thighGeo, clothMat.clone());
            bones[`thigh${side}`].userData.mesh.position.y = -p.thigh.length / 2;
            bones[`hip${side}`].add(bones[`thigh${side}`]);
            hitboxes.push({ bone: `thigh${side}`, part: 'leg', mesh: bones[`thigh${side}`].userData.mesh });

            // Knee
            bones[`knee${side}`] = this.createBone(`knee${side}`,
                new THREE.SphereGeometry(p.knee.radius, 8, 6), clothMat.clone());
            bones[`knee${side}`].position.y = j[`knee${side}`].y;
            bones[`thigh${side}`].add(bones[`knee${side}`]);

            // Shin
            const shinGeo = this.createCapsuleGeometry(p.shin.radius, p.shin.length);
            bones[`shin${side}`] = this.createBone(`shin${side}`, shinGeo, clothMat.clone());
            bones[`shin${side}`].userData.mesh.position.y = -p.shin.length / 2;
            bones[`knee${side}`].add(bones[`shin${side}`]);
            hitboxes.push({ bone: `shin${side}`, part: 'leg', mesh: bones[`shin${side}`].userData.mesh });

            // Ankle
            bones[`ankle${side}`] = this.createBone(`ankle${side}`,
                new THREE.SphereGeometry(p.ankle.radius, 8, 6), darkClothMat.clone());
            bones[`ankle${side}`].position.y = j[`ankle${side}`].y;
            bones[`shin${side}`].add(bones[`ankle${side}`]);

            // Foot
            const footGeo = new THREE.BoxGeometry(p.foot.width, p.foot.height, p.foot.length);
            bones[`foot${side}`] = this.createBone(`foot${side}`, footGeo, darkClothMat.clone());
            bones[`foot${side}`].position.set(0, j[`foot${side}`].y, j[`foot${side}`].z);
            bones[`foot${side}`].userData.mesh.position.z = p.foot.length * 0.2;
            bones[`ankle${side}`].add(bones[`foot${side}`]);
            hitboxes.push({ bone: `foot${side}`, part: 'leg', mesh: bones[`foot${side}`].userData.mesh });
        });

        // Tag all meshes for raycasting
        root.traverse(child => {
            if (child.isMesh) {
                child.userData.isOpponent = true;
                child.userData.slot = slot;
            }
        });

        return {
            root,
            bones,
            hitboxes,

            // Convenience methods
            getBone: (name) => bones[name],

            // Set pose by bone rotations
            setPose: (pose) => {
                Object.entries(pose).forEach(([boneName, rotation]) => {
                    if (bones[boneName]) {
                        if (rotation.x !== undefined) bones[boneName].rotation.x = rotation.x;
                        if (rotation.y !== undefined) bones[boneName].rotation.y = rotation.y;
                        if (rotation.z !== undefined) bones[boneName].rotation.z = rotation.z;
                    }
                });
            },

            // Get world position of a bone
            getBoneWorldPosition: (name) => {
                if (!bones[name]) return null;
                const pos = new THREE.Vector3();
                bones[name].getWorldPosition(pos);
                return pos;
            },

            // Attach object to bone (e.g., weapon to hand)
            attachToBone: (boneName, object) => {
                if (bones[boneName]) {
                    bones[boneName].add(object);
                    return true;
                }
                return false;
            }
        };
    },

    /**
     * Default poses for common stances
     */
    poses: {
        idle: {
            // Slight arm bend at sides
            upperArmL: { z: 0.15 },
            upperArmR: { z: -0.15 },
            elbowL: { x: -0.2 },
            elbowR: { x: -0.2 },
        },

        rifleHold: {
            // Two-handed rifle grip
            shoulderR: { x: -0.3, z: -0.4 },
            upperArmR: { x: -1.2, z: -0.3 },
            elbowR: { x: 0.8 },
            forearmR: { y: 0.3 },
            wristR: { x: -0.2 },

            shoulderL: { x: -0.2, z: 0.5 },
            upperArmL: { x: -0.8, z: 0.4 },
            elbowL: { x: 1.2 },
            forearmL: { y: -0.2 },
            wristL: { x: 0.3 },

            // Curl fingers around grips
            indexL: { x: 0.8 }, middleL: { x: 0.9 }, ringL: { x: 0.9 }, pinkyL: { x: 0.8 },
            indexR: { x: 0.8 }, middleR: { x: 0.9 }, ringR: { x: 0.9 }, pinkyR: { x: 0.8 },
            thumbL: { x: 0.3 }, thumbR: { x: 0.3 },
        },

        pistolHold: {
            // One-handed pistol
            shoulderR: { x: -0.4, z: -0.3 },
            upperArmR: { x: -1.4, z: -0.2 },
            elbowR: { x: 0.3 },
            wristR: { x: -0.1 },

            // Left arm at side
            upperArmL: { z: 0.1 },
            elbowL: { x: -0.3 },

            indexR: { x: 0.2 }, middleR: { x: 0.9 }, ringR: { x: 0.9 }, pinkyR: { x: 0.9 },
            thumbR: { x: 0.4 },
        },

        crouch: {
            // Bent knees, lowered hips
            hipL: { x: 0.8 },
            hipR: { x: 0.8 },
            kneeL: { x: -1.4 },
            kneeR: { x: -1.4 },
            ankleL: { x: 0.6 },
            ankleR: { x: 0.6 },

            // Lean forward slightly
            pelvis: { x: 0.15 },
        },

        leanLeft: {
            pelvis: { z: 0.15 },
            stomach: { z: 0.1 },
            chest: { z: 0.05 },
        },

        leanRight: {
            pelvis: { z: -0.15 },
            stomach: { z: -0.1 },
            chest: { z: -0.05 },
        }
    },

    /**
     * Blend between two poses
     * @param {object} poseA - First pose
     * @param {object} poseB - Second pose
     * @param {number} t - Blend factor (0-1)
     * @returns {object} Blended pose
     */
    blendPoses(poseA, poseB, t) {
        const result = {};
        const allBones = new Set([...Object.keys(poseA || {}), ...Object.keys(poseB || {})]);

        allBones.forEach(bone => {
            const a = poseA?.[bone] || { x: 0, y: 0, z: 0 };
            const b = poseB?.[bone] || { x: 0, y: 0, z: 0 };

            result[bone] = {
                x: (a.x || 0) * (1 - t) + (b.x || 0) * t,
                y: (a.y || 0) * (1 - t) + (b.y || 0) * t,
                z: (a.z || 0) * (1 - t) + (b.z || 0) * t,
            };
        });

        return result;
    },

    /**
     * Combine multiple poses additively
     * @param  {...object} poses - Poses to combine
     * @returns {object} Combined pose
     */
    combinePoses(...poses) {
        const result = {};

        poses.forEach(pose => {
            if (!pose) return;
            Object.entries(pose).forEach(([bone, rotation]) => {
                if (!result[bone]) result[bone] = { x: 0, y: 0, z: 0 };
                result[bone].x = (result[bone].x || 0) + (rotation.x || 0);
                result[bone].y = (result[bone].y || 0) + (rotation.y || 0);
                result[bone].z = (result[bone].z || 0) + (rotation.z || 0);
            });
        });

        return result;
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HumanoidFactory;
}
