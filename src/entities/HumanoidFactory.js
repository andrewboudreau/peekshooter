// ============================================
// HUMANOID FACTORY
// Creates articulated humanoid models with Mixamo-compatible bone rigs
//
// All bone names follow Mixamo convention for compatibility with
// Mixamo animations and imported GLTF models.
// ============================================

console.log('[HumanoidFactory] Loading...');

const HumanoidFactory = {
    // Shorthand reference to bone names (set after MixamoBoneMap loads)
    B: null,

    // =============================================
    // 8-HEAD CANON PROPORTIONS (1.76m total height)
    // 1 head unit = 0.22m
    // =============================================
    // Landmarks from ground:
    //   0.00m = Ground
    //   0.07m = Ankle (1/3 head)
    //   0.44m = Knee (2 heads)
    //   0.88m = Hip/Crotch (4 heads - MIDPOINT)
    //   1.10m = Navel/Elbow (5 heads)
    //   1.32m = Armpit/Shoulder (6 heads)
    //   1.54m = Chin (7 heads)
    //   1.76m = Top of head (8 heads)
    // =============================================

    proportions: {
        // Head: 1 head unit tall
        head: { radius: 0.11, height: 0.22 },
        neck: { radius: 0.04, height: 0.06 },

        // Torso segments
        chest: { width: 0.28, height: 0.22, depth: 0.16 },    // 1 head tall
        stomach: { width: 0.24, height: 0.16, depth: 0.14 },  // ~3/4 head
        pelvis: { width: 0.26, height: 0.12, depth: 0.15 },   // ~1/2 head

        // Arms (total ~3 heads long)
        shoulder: { radius: 0.045 },
        upperArm: { radius: 0.04, length: 0.28 },   // ~1.25 heads
        forearm: { radius: 0.035, length: 0.24 },   // ~1 head
        wrist: { radius: 0.025 },
        hand: { width: 0.08, height: 0.10, depth: 0.025 },  // ~0.75 heads
        finger: { radius: 0.01, length: 0.04 },
        thumb: { radius: 0.012, length: 0.035 },

        // Legs (total ~4 heads from hip to ground)
        thigh: { radius: 0.065, length: 0.44 },    // 2 heads (hip to knee)
        knee: { radius: 0.05 },
        shin: { radius: 0.045, length: 0.37 },     // knee to ankle
        ankle: { radius: 0.035 },
        foot: { width: 0.10, height: 0.07, length: 0.22 },

        // Eyes
        eye: { radius: 0.012 },
        eyeOffset: { x: 0.032, y: 0.03, z: 0.09 },
    },

    // Joint positions relative to parent bone (Y-up)
    // Using Mixamo bone names as keys
    joints: {
        // Spine chain - Hips is root, others relative to parent
        'mixamorig:Hips': { y: 0.88 },         // 4 heads from ground (midpoint)
        'mixamorig:Spine': { y: 0.14 },        // relative: brings world Y to ~1.02
        'mixamorig:Spine1': { y: 0.16 },       // relative: brings world Y to ~1.18
        'mixamorig:Neck': { y: 0.14 },         // relative: brings world Y to ~1.32 (shoulder level)
        'mixamorig:Head': { y: 0.22 },         // relative: brings world Y to ~1.54 (chin level)

        // Arms attach at neck level (shoulder height = 6 heads)
        'mixamorig:LeftShoulder': { x: -0.14, y: 0.0 },
        'mixamorig:RightShoulder': { x: 0.14, y: 0.0 },
        'mixamorig:LeftArm': { x: -0.045, y: 0 },
        'mixamorig:RightArm': { x: 0.045, y: 0 },
        'mixamorig:LeftForeArm': { y: -0.28 },   // upper arm length
        'mixamorig:RightForeArm': { y: -0.28 },
        'mixamorig:LeftHand': { y: -0.24 },      // forearm length
        'mixamorig:RightHand': { y: -0.24 },

        // Legs from pelvis (hip at 4 heads)
        'mixamorig:LeftUpLeg': { x: -0.10, y: 0 },
        'mixamorig:RightUpLeg': { x: 0.10, y: 0 },
        'mixamorig:LeftLeg': { y: -0.44 },      // thigh length: hip(0.88) - 0.44 = knee(0.44)
        'mixamorig:RightLeg': { y: -0.44 },
        'mixamorig:LeftFoot': { y: -0.37 },     // shin length: knee(0.44) - 0.37 = ankle(0.07)
        'mixamorig:RightFoot': { y: -0.37 },
        'mixamorig:LeftToeBase': { y: -0.035, z: 0.05 },
        'mixamorig:RightToeBase': { y: -0.035, z: 0.05 },
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
     * @param {string} name - Bone identifier (Mixamo format)
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
     * Create a full humanoid model with Mixamo-compatible bone names
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
        const B = typeof MixamoBoneMap !== 'undefined' ? MixamoBoneMap : null;

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

        // Hips (root of skeleton) - rounded cylinder
        const hipsGeo = new THREE.CylinderGeometry(
            p.pelvis.width / 2,      // top radius
            p.pelvis.width / 2 * 0.9, // bottom radius (slightly tapered)
            p.pelvis.height, 12
        );
        const HIPS = B ? B.HIPS : 'mixamorig:Hips';
        bones[HIPS] = this.createBone(HIPS, hipsGeo, clothMat.clone());
        bones[HIPS].position.y = j[HIPS].y;
        root.add(bones[HIPS]);
        hitboxes.push({ bone: HIPS, part: 'pelvis', mesh: bones[HIPS].userData.mesh });

        // Spine - rounded cylinder (tapers from pelvis to chest)
        const spineGeo = new THREE.CylinderGeometry(
            p.stomach.width / 2 * 0.95, // top (towards chest)
            p.stomach.width / 2,         // bottom (towards pelvis)
            p.stomach.height, 12
        );
        const SPINE = B ? B.SPINE : 'mixamorig:Spine';
        bones[SPINE] = this.createBone(SPINE, spineGeo, clothMat.clone());
        bones[SPINE].position.y = j[SPINE].y;
        bones[HIPS].add(bones[SPINE]);
        hitboxes.push({ bone: SPINE, part: 'belly', mesh: bones[SPINE].userData.mesh });

        // Spine1 (chest) - rounded cylinder (broader at shoulders)
        const spine1Geo = new THREE.CylinderGeometry(
            p.chest.width / 2,           // top (shoulder width)
            p.chest.width / 2 * 0.85,    // bottom (tapers to stomach)
            p.chest.height, 12
        );
        const SPINE1 = B ? B.SPINE1 : 'mixamorig:Spine1';
        bones[SPINE1] = this.createBone(SPINE1, spine1Geo, clothMat.clone());
        bones[SPINE1].position.y = j[SPINE1].y;
        bones[SPINE].add(bones[SPINE1]);
        hitboxes.push({ bone: SPINE1, part: 'chest', mesh: bones[SPINE1].userData.mesh });

        // Neck
        const neckGeo = this.createCapsuleGeometry(p.neck.radius, p.neck.height);
        const NECK = B ? B.NECK : 'mixamorig:Neck';
        bones[NECK] = this.createBone(NECK, neckGeo, skinMat.clone());
        bones[NECK].position.y = j[NECK].y;
        bones[SPINE1].add(bones[NECK]);

        // Head
        const headGeo = new THREE.SphereGeometry(p.head.radius, 16, 12);
        const HEAD = B ? B.HEAD : 'mixamorig:Head';
        bones[HEAD] = this.createBone(HEAD, headGeo, skinMat.clone());
        bones[HEAD].position.y = j[HEAD].y + p.head.radius;
        bones[NECK].add(bones[HEAD]);
        hitboxes.push({ bone: HEAD, part: 'head', mesh: bones[HEAD].userData.mesh, critical: true });

        // Eyes
        const eyeWhiteGeo = new THREE.SphereGeometry(p.eye.radius * 1.5, 8, 6);
        const eyeGeo = new THREE.SphereGeometry(p.eye.radius, 8, 6);

        const LEFT_EYE = B ? B.LEFT_EYE : 'mixamorig:LeftEye';
        bones[LEFT_EYE] = this.createBone(LEFT_EYE, eyeWhiteGeo, eyeWhiteMat.clone());
        bones[LEFT_EYE].position.set(-p.eyeOffset.x, p.eyeOffset.y, p.eyeOffset.z);
        bones[HEAD].add(bones[LEFT_EYE]);

        const pupilL = new THREE.Mesh(eyeGeo, eyeMat.clone());
        pupilL.position.z = p.eye.radius * 0.8;
        bones[LEFT_EYE].add(pupilL);

        const RIGHT_EYE = B ? B.RIGHT_EYE : 'mixamorig:RightEye';
        bones[RIGHT_EYE] = this.createBone(RIGHT_EYE, eyeWhiteGeo.clone(), eyeWhiteMat.clone());
        bones[RIGHT_EYE].position.set(p.eyeOffset.x, p.eyeOffset.y, p.eyeOffset.z);
        bones[HEAD].add(bones[RIGHT_EYE]);

        const pupilR = new THREE.Mesh(eyeGeo.clone(), eyeMat.clone());
        pupilR.position.z = p.eye.radius * 0.8;
        bones[RIGHT_EYE].add(pupilR);

        // Face mask (optional)
        if (hasMask) {
            const maskMat = new THREE.MeshStandardMaterial({ color: maskColor, roughness: 0.5 });
            const maskGeo = new THREE.BoxGeometry(p.head.radius * 1.6, p.head.radius * 0.8, p.head.radius * 0.5);
            const mask = new THREE.Mesh(maskGeo, maskMat);
            mask.position.set(0, -p.head.radius * 0.2, p.head.radius * 0.7);
            bones[HEAD].add(mask);
        }

        // ========== ARMS ==========

        const armSides = [
            { side: 'Left', sign: -1 },
            { side: 'Right', sign: 1 }
        ];

        armSides.forEach(({ side, sign }) => {
            const SHOULDER = B ? B[`${side.toUpperCase()}_SHOULDER`] : `mixamorig:${side}Shoulder`;
            const ARM = B ? B[`${side.toUpperCase()}_ARM`] : `mixamorig:${side}Arm`;
            const FOREARM = B ? B[`${side.toUpperCase()}_FOREARM`] : `mixamorig:${side}ForeArm`;
            const HAND = B ? B[`${side.toUpperCase()}_HAND`] : `mixamorig:${side}Hand`;

            // Shoulder joint
            bones[SHOULDER] = this.createBone(SHOULDER,
                new THREE.SphereGeometry(p.shoulder.radius, 8, 6), skinMat.clone());
            bones[SHOULDER].position.set(
                j[SHOULDER].x,
                j[SHOULDER].y,
                0
            );
            bones[SPINE1].add(bones[SHOULDER]);

            // Upper arm (Arm in Mixamo terms)
            const upperArmGeo = this.createCapsuleGeometry(p.upperArm.radius, p.upperArm.length);
            bones[ARM] = this.createBone(ARM, upperArmGeo, skinMat.clone());
            bones[ARM].position.set(sign * p.shoulder.radius, 0, 0);
            bones[ARM].userData.mesh.position.y = -p.upperArm.length / 2;
            bones[SHOULDER].add(bones[ARM]);
            hitboxes.push({ bone: ARM, part: 'arm', mesh: bones[ARM].userData.mesh });

            // Forearm (elbow area)
            const forearmJointGeo = new THREE.SphereGeometry(p.upperArm.radius * 1.1, 8, 6);
            const forearmGeo = this.createCapsuleGeometry(p.forearm.radius, p.forearm.length);

            bones[FOREARM] = this.createBone(FOREARM, forearmJointGeo, skinMat.clone());
            bones[FOREARM].position.y = j[FOREARM].y;
            bones[ARM].add(bones[FOREARM]);

            // Forearm mesh (separate from joint)
            const forearmMesh = new THREE.Mesh(forearmGeo, skinMat.clone());
            forearmMesh.position.y = -p.forearm.length / 2;
            forearmMesh.userData.boneName = FOREARM;
            bones[FOREARM].add(forearmMesh);
            hitboxes.push({ bone: FOREARM, part: 'arm', mesh: forearmMesh });

            // Hand - simplified mitten shape (no individual fingers)
            const handGroup = new THREE.Group();
            handGroup.name = HAND;
            handGroup.userData.isBone = true;
            handGroup.userData.boneName = HAND;

            // Palm
            const palmGeo = new THREE.BoxGeometry(p.hand.width, p.hand.height * 0.6, p.hand.depth);
            const palm = new THREE.Mesh(palmGeo, skinMat.clone());
            palm.position.y = -p.hand.height * 0.3;
            handGroup.add(palm);

            // Fingers block (simplified as one rounded shape)
            const fingersGeo = new THREE.BoxGeometry(p.hand.width * 0.9, p.hand.height * 0.5, p.hand.depth);
            const fingers = new THREE.Mesh(fingersGeo, skinMat.clone());
            fingers.position.y = -p.hand.height * 0.85;
            fingers.position.z = p.hand.depth * 0.1;
            handGroup.add(fingers);

            // Thumb
            const thumbGeo = new THREE.CylinderGeometry(p.thumb.radius, p.thumb.radius, p.thumb.length, 6);
            const thumb = new THREE.Mesh(thumbGeo, skinMat.clone());
            thumb.position.set(sign * (p.hand.width * 0.5), -p.hand.height * 0.2, p.hand.depth * 0.3);
            thumb.rotation.z = sign * 0.6;
            thumb.rotation.x = 0.3;
            handGroup.add(thumb);

            handGroup.userData.mesh = palm; // For hitbox reference
            bones[HAND] = handGroup;
            bones[HAND].position.y = j[HAND].y;
            bones[FOREARM].add(bones[HAND]);
        });

        // ========== LEGS ==========

        const legSides = [
            { side: 'Left', sign: -1 },
            { side: 'Right', sign: 1 }
        ];

        legSides.forEach(({ side, sign }) => {
            const UP_LEG = B ? B[`${side.toUpperCase()}_UP_LEG`] : `mixamorig:${side}UpLeg`;
            const LEG = B ? B[`${side.toUpperCase()}_LEG`] : `mixamorig:${side}Leg`;
            const FOOT = B ? B[`${side.toUpperCase()}_FOOT`] : `mixamorig:${side}Foot`;
            const TOE = B ? B[`${side.toUpperCase()}_TOE`] : `mixamorig:${side}ToeBase`;

            // Hip joint (UpLeg in Mixamo terms)
            bones[UP_LEG] = this.createBone(UP_LEG,
                new THREE.SphereGeometry(p.thigh.radius * 0.9, 8, 6), clothMat.clone());
            bones[UP_LEG].position.set(j[UP_LEG].x, j[UP_LEG].y, 0);
            bones[HIPS].add(bones[UP_LEG]);

            // Thigh mesh (attached to UpLeg)
            const thighGeo = this.createCapsuleGeometry(p.thigh.radius, p.thigh.length);
            const thighMesh = new THREE.Mesh(thighGeo, clothMat.clone());
            thighMesh.position.y = -p.thigh.length / 2;
            thighMesh.userData.boneName = UP_LEG;
            bones[UP_LEG].add(thighMesh);
            hitboxes.push({ bone: UP_LEG, part: 'leg', mesh: thighMesh });

            // Knee/Leg joint
            bones[LEG] = this.createBone(LEG,
                new THREE.SphereGeometry(p.knee.radius, 8, 6), clothMat.clone());
            bones[LEG].position.y = j[LEG].y;
            bones[UP_LEG].add(bones[LEG]);

            // Shin mesh (attached to Leg)
            const shinGeo = this.createCapsuleGeometry(p.shin.radius, p.shin.length);
            const shinMesh = new THREE.Mesh(shinGeo, clothMat.clone());
            shinMesh.position.y = -p.shin.length / 2;
            shinMesh.userData.boneName = LEG;
            bones[LEG].add(shinMesh);
            hitboxes.push({ bone: LEG, part: 'leg', mesh: shinMesh });

            // Ankle/Foot
            bones[FOOT] = this.createBone(FOOT,
                new THREE.SphereGeometry(p.ankle.radius, 8, 6), darkClothMat.clone());
            bones[FOOT].position.y = j[FOOT].y;
            bones[LEG].add(bones[FOOT]);

            // Foot/ToeBase
            const footGeo = new THREE.BoxGeometry(p.foot.width, p.foot.height, p.foot.length);
            bones[TOE] = this.createBone(TOE, footGeo, darkClothMat.clone());
            bones[TOE].position.set(0, j[TOE].y, j[TOE].z);
            bones[TOE].userData.mesh.position.z = p.foot.length * 0.2;
            bones[FOOT].add(bones[TOE]);
            hitboxes.push({ bone: TOE, part: 'leg', mesh: bones[TOE].userData.mesh });
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
     * Default poses for common stances (using Mixamo bone names)
     */
    poses: {
        idle: {
            // Slight arm bend at sides
            'mixamorig:LeftArm': { z: 0.15 },
            'mixamorig:RightArm': { z: -0.15 },
            'mixamorig:LeftForeArm': { x: -0.2 },
            'mixamorig:RightForeArm': { x: -0.2 },
        },

        rifleHold: {
            // Two-handed rifle grip
            'mixamorig:RightShoulder': { x: -0.3, z: -0.4 },
            'mixamorig:RightArm': { x: -1.2, z: -0.3 },
            'mixamorig:RightForeArm': { x: 0.8, y: 0.3 },
            'mixamorig:RightHand': { x: -0.2 },

            'mixamorig:LeftShoulder': { x: -0.2, z: 0.5 },
            'mixamorig:LeftArm': { x: -0.8, z: 0.4 },
            'mixamorig:LeftForeArm': { x: 1.2, y: -0.2 },
            'mixamorig:LeftHand': { x: 0.3 },
        },

        pistolHold: {
            // One-handed pistol
            'mixamorig:RightShoulder': { x: -0.4, z: -0.3 },
            'mixamorig:RightArm': { x: -1.4, z: -0.2 },
            'mixamorig:RightForeArm': { x: 0.3 },
            'mixamorig:RightHand': { x: -0.1 },

            // Left arm at side
            'mixamorig:LeftArm': { z: 0.1 },
            'mixamorig:LeftForeArm': { x: -0.3 },
        },

        crouch: {
            // Bent knees, lowered hips
            'mixamorig:LeftUpLeg': { x: 0.8 },
            'mixamorig:RightUpLeg': { x: 0.8 },
            'mixamorig:LeftLeg': { x: -1.4 },
            'mixamorig:RightLeg': { x: -1.4 },
            'mixamorig:LeftFoot': { x: 0.6 },
            'mixamorig:RightFoot': { x: 0.6 },

            // Lean forward slightly
            'mixamorig:Hips': { x: 0.15 },
        },

        leanLeft: {
            'mixamorig:Hips': { z: 0.15 },
            'mixamorig:Spine': { z: 0.1 },
            'mixamorig:Spine1': { z: 0.05 },
        },

        leanRight: {
            'mixamorig:Hips': { z: -0.15 },
            'mixamorig:Spine': { z: -0.1 },
            'mixamorig:Spine1': { z: -0.05 },
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
    },

    /**
     * Mirror a pose from right to left (or vice versa)
     * Uses Mixamo naming convention (Left/Right in bone names)
     * @param {object} pose - Pose to mirror
     * @returns {object} Mirrored pose
     */
    mirrorPose(pose) {
        const mirrored = {};
        Object.entries(pose).forEach(([bone, rotation]) => {
            // Swap Left and Right in bone names
            let newBone = bone;
            if (bone.includes('Left')) {
                newBone = bone.replace('Left', 'Right');
            } else if (bone.includes('Right')) {
                newBone = bone.replace('Right', 'Left');
            }

            // Mirror Y and Z rotations for lateral bones
            mirrored[newBone] = {
                x: rotation.x,
                y: rotation.y !== undefined ? -rotation.y : undefined,
                z: rotation.z !== undefined ? -rotation.z : undefined
            };
        });
        return mirrored;
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HumanoidFactory;
}
