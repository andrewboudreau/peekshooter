// ============================================
// OPPONENT ENTITY
// Represents a remote player or bot opponent
// ============================================

class Opponent extends Entity {
    constructor(slot = 1) {
        super('opponent');

        // Add core components
        this.addComponent(new HealthComponent(
            typeof DamageConfig !== 'undefined' ? DamageConfig.health.opponent : 100
        ));
        this.addComponent(new TransformComponent());
        this.addComponent(new HitboxComponent());

        // Opponent-specific state
        this.slot = slot;
        this.weaponHand = 'right';
        this.currentWeapon = 'assault_rifle';
        this.isBot = false;

        // Three.js references
        this.mesh = null;
        this.weaponMesh = null;

        // Humanoid model reference
        this.humanoid = null;

        // Network interpolation
        this.lastUpdate = Date.now();

        // Tags
        this.addTag('opponent');
        this.addTag('remote');
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
    // State (for compatibility with legacy code)
    // ============================================

    get state() {
        return {
            crouch: this.transform?.stance.crouch || 0,
            lean: this.transform?.stance.lean || 0,
            strafe: this.transform?.stance.strafe || 0,
            lookYaw: this.transform?.look.yaw || 0,
            lookPitch: this.transform?.look.pitch || 0,
            weaponHand: this.weaponHand,
            health: this.health?.currentHealth || 0,
        };
    }

    get targetState() {
        return {
            crouch: this.transform?.targetStance.crouch || 0,
            lean: this.transform?.targetStance.lean || 0,
            strafe: this.transform?.targetStance.strafe || 0,
            lookYaw: this.transform?.look.yaw || 0,
            lookPitch: this.transform?.look.pitch || 0,
            weaponHand: this.weaponHand,
            health: this.health?.currentHealth || 0,
        };
    }

    set targetState(state) {
        this.updateFromNetwork(state);
    }

    // ============================================
    // Mesh Creation
    // ============================================

    /**
     * Create the opponent's 3D mesh using HumanoidFactory
     * @param {THREE.Scene} scene - Scene to add mesh to
     */
    createMesh(scene) {
        if (this.mesh) {
            scene.remove(this.mesh);
        }

        const config = typeof PhysicsConfig !== 'undefined' ? PhysicsConfig.opponent : null;
        const teamColor = this.slot === 0 ? 0x4444aa : 0xaa4444;

        // Use HumanoidFactory if available, otherwise fall back to simple mesh
        if (typeof HumanoidFactory !== 'undefined') {
            this.humanoid = HumanoidFactory.create({
                teamColor: teamColor,
                skinColor: 0xddccbb,
                eyeColor: 0x446688,
                hasMask: false,
                slot: this.slot
            });

            const group = this.humanoid.root;

            // Register hitboxes from humanoid
            const damage = typeof DamageConfig !== 'undefined' ? DamageConfig.bodyParts : null;
            this.humanoid.hitboxes.forEach(hb => {
                const partDamage = damage?.[hb.part]?.damage || 10;
                this.hitbox.addPart(hb.bone, hb.mesh, partDamage, { isCritical: hb.critical || false });
            });

            // Create and attach weapon to hand
            if (typeof WeaponFactory !== 'undefined') {
                this.weaponMesh = WeaponFactory.createOpponentWeapon(this.currentWeapon);
                const handBone = this.weaponHand === 'right' ? 'handR' : 'handL';
                this.humanoid.attachToBone(handBone, this.weaponMesh);
                // Position weapon in hand
                this.weaponMesh.position.set(0, -0.12, 0.08);
                this.weaponMesh.rotation.set(-Math.PI / 2, 0, 0);
            }

            // Apply initial rifle hold pose
            this.applyWeaponPose();

            // Position in arena
            group.position.z = config?.spawnZ || -15;

            this.mesh = group;
            this.transform.attachMesh(group);
            this.hitbox.setMeshGroup(group);

            scene.add(group);
            return group;
        }

        // Fallback: simple mesh (legacy)
        return this.createSimpleMesh(scene, config, teamColor);
    }

    /**
     * Fallback simple mesh creation (legacy compatibility)
     */
    createSimpleMesh(scene, config, teamColor) {
        const group = new THREE.Group();
        const skinColor = 0xddccbb;
        const damage = typeof DamageConfig !== 'undefined' ? DamageConfig.bodyParts : null;

        // Head
        const headRadius = config?.headRadius || 0.18;
        const headGeometry = new THREE.SphereGeometry(headRadius, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = config?.headY || 1.45;
        head.userData.isOpponent = true;
        group.add(head);
        this.hitbox.addPart('head', head, damage?.head?.damage || 25, { isCritical: true });

        // Chest
        const chestGeometry = new THREE.CylinderGeometry(
            config?.chestRadius?.[0] || 0.28,
            config?.chestRadius?.[1] || 0.25,
            config?.chestHeight || 0.5, 8
        );
        const chestMaterial = new THREE.MeshStandardMaterial({ color: teamColor, roughness: 0.7 });
        const chest = new THREE.Mesh(chestGeometry, chestMaterial);
        chest.position.y = config?.chestY || 1.0;
        chest.userData.isOpponent = true;
        group.add(chest);
        this.hitbox.addPart('chest', chest, damage?.chest?.damage || 15);

        // Belly
        const bellyGeometry = new THREE.CylinderGeometry(
            config?.bellyRadius?.[0] || 0.25,
            config?.bellyRadius?.[1] || 0.28,
            config?.bellyHeight || 0.45, 8
        );
        const bellyMaterial = new THREE.MeshStandardMaterial({ color: teamColor, roughness: 0.7 });
        const belly = new THREE.Mesh(bellyGeometry, bellyMaterial);
        belly.position.y = config?.bellyY || 0.5;
        belly.userData.isOpponent = true;
        group.add(belly);
        this.hitbox.addPart('belly', belly, damage?.belly?.damage || 10);

        // Arms
        const armGeometry = new THREE.CylinderGeometry(
            config?.armRadius || 0.08,
            config?.armRadius || 0.08,
            config?.armLength || 0.6, 8
        );
        const armMaterial = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8 });

        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-(config?.armOffsetX || 0.38), config?.armY || 0.95, 0);
        leftArm.rotation.z = config?.armAngle || 0.2;
        leftArm.userData.isOpponent = true;
        group.add(leftArm);
        this.hitbox.addPart('leftArm', leftArm, damage?.arm?.damage || 5);

        const rightArm = new THREE.Mesh(armGeometry, armMaterial.clone());
        rightArm.position.set(config?.armOffsetX || 0.38, config?.armY || 0.95, 0);
        rightArm.rotation.z = -(config?.armAngle || 0.2);
        rightArm.userData.isOpponent = true;
        group.add(rightArm);
        this.hitbox.addPart('rightArm', rightArm, damage?.arm?.damage || 5);

        // Weapon
        const weaponGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.4);
        const weaponMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 });
        const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
        weapon.position.set(0.3, 0.9, -0.2);
        group.add(weapon);
        this.weaponMesh = weapon;

        // Position in arena
        group.position.z = config?.spawnZ || -15;

        this.mesh = group;
        this.transform.attachMesh(group);
        this.hitbox.setMeshGroup(group);

        scene.add(group);
        return group;
    }

    /**
     * Apply weapon-appropriate pose to humanoid
     */
    applyWeaponPose() {
        if (!this.humanoid || typeof HumanoidFactory === 'undefined') return;

        // Get weapon type
        const weaponConfig = typeof WeaponConfig !== 'undefined' ?
            WeaponConfig.weapons[this.currentWeapon] : null;

        let basePose;
        if (weaponConfig?.type === 'pistol') {
            basePose = HumanoidFactory.poses.pistolHold;
        } else {
            basePose = HumanoidFactory.poses.rifleHold;
        }

        // Mirror pose if left-handed
        if (this.weaponHand === 'left') {
            basePose = this.mirrorPose(basePose);
        }

        this.humanoid.setPose(basePose);
    }

    /**
     * Mirror a pose from right to left hand
     */
    mirrorPose(pose) {
        const mirrored = {};
        Object.entries(pose).forEach(([bone, rotation]) => {
            // Swap L and R in bone names
            let newBone = bone;
            if (bone.endsWith('L')) {
                newBone = bone.slice(0, -1) + 'R';
            } else if (bone.endsWith('R')) {
                newBone = bone.slice(0, -1) + 'L';
            }

            // Mirror X and Z rotations for lateral bones
            mirrored[newBone] = {
                x: rotation.x,
                y: rotation.y !== undefined ? -rotation.y : undefined,
                z: rotation.z !== undefined ? -rotation.z : undefined
            };
        });
        return mirrored;
    }

    /**
     * Update mesh position/rotation based on state
     * @param {number} deltaTime - Time since last update
     */
    updateMesh(deltaTime) {
        if (!this.mesh) return;

        // Update transform interpolation
        this.transform.update(deltaTime);

        const state = this.transform.stance;
        const config = typeof PhysicsConfig !== 'undefined' ? PhysicsConfig.player : null;

        // Base height with crouch
        const baseY = (config?.baseHeight || 1.6) - (state.crouch * (config?.crouchAmount || 0.8));

        // Position with strafe and lean (mirrored since opponent faces us)
        const strafeX = -state.strafe * (config?.strafeAmount || 2.0);
        const leanX = -state.lean * (config?.leanAmount || 0.6);

        this.mesh.position.x = strafeX + leanX;
        this.mesh.position.y = baseY - (config?.baseHeight || 1.6);

        // Rotation based on look direction (mirrored)
        this.mesh.rotation.y = Math.PI - this.transform.look.yaw;

        // Lean tilt (mirrored)
        this.mesh.rotation.z = -state.lean * (config?.leanTilt || 0.15);

        // Apply stance poses to humanoid if available
        if (this.humanoid && typeof HumanoidFactory !== 'undefined') {
            this.applyStancePose(state);
        }
    }

    /**
     * Apply stance-based pose (crouch, lean) to humanoid
     */
    applyStancePose(state) {
        if (!this.humanoid || typeof HumanoidFactory === 'undefined') return;

        // Get weapon hold pose
        const weaponConfig = typeof WeaponConfig !== 'undefined' ?
            WeaponConfig.weapons[this.currentWeapon] : null;

        let weaponPose;
        if (weaponConfig?.type === 'pistol') {
            weaponPose = HumanoidFactory.poses.pistolHold;
        } else {
            weaponPose = HumanoidFactory.poses.rifleHold;
        }

        // Mirror if left-handed
        if (this.weaponHand === 'left') {
            weaponPose = this.mirrorPose(weaponPose);
        }

        // Blend crouch pose
        let stancePose = {};
        if (state.crouch > 0.1) {
            stancePose = HumanoidFactory.blendPoses({}, HumanoidFactory.poses.crouch, state.crouch);
        }

        // Add lean pose
        if (Math.abs(state.lean) > 0.1) {
            const leanPose = state.lean > 0 ?
                HumanoidFactory.poses.leanRight :
                HumanoidFactory.poses.leanLeft;
            const leanAmount = Math.abs(state.lean);
            const blendedLean = HumanoidFactory.blendPoses({}, leanPose, leanAmount);
            stancePose = HumanoidFactory.combinePoses(stancePose, blendedLean);
        }

        // Combine weapon pose with stance pose
        const finalPose = HumanoidFactory.combinePoses(weaponPose, stancePose);
        this.humanoid.setPose(finalPose);
    }

    // ============================================
    // Network
    // ============================================

    /**
     * Update from network state
     * @param {object} newState - State from network
     */
    updateFromNetwork(newState) {
        if (this.transform) {
            if (newState.crouch !== undefined) this.transform.targetStance.crouch = newState.crouch;
            if (newState.lean !== undefined) this.transform.targetStance.lean = newState.lean;
            if (newState.strafe !== undefined) this.transform.targetStance.strafe = newState.strafe;
            if (newState.lookYaw !== undefined) this.transform.look.yaw = newState.lookYaw;
            if (newState.lookPitch !== undefined) this.transform.look.pitch = newState.lookPitch;
        }
        if (newState.weaponHand !== undefined) this.weaponHand = newState.weaponHand;

        // Handle weapon changes
        if (newState.weapon !== undefined && newState.weapon !== this.currentWeapon) {
            this.updateWeapon(newState.weapon);
        }

        this.lastUpdate = Date.now();
    }

    /**
     * Update the opponent's weapon model
     * @param {string} weaponId - New weapon ID
     */
    updateWeapon(weaponId) {
        if (this.currentWeapon === weaponId) return;

        this.currentWeapon = weaponId;

        // Update weapon mesh if we have one
        if (this.weaponMesh) {
            // Remove old weapon from parent (hand bone or mesh group)
            if (this.weaponMesh.parent) {
                this.weaponMesh.parent.remove(this.weaponMesh);
            }
            if (this.weaponMesh.geometry) this.weaponMesh.geometry.dispose();

            // Create new weapon using WeaponFactory if available
            if (typeof WeaponFactory !== 'undefined') {
                this.weaponMesh = WeaponFactory.createOpponentWeapon(weaponId);

                // Attach to humanoid hand bone if available
                if (this.humanoid) {
                    const handBone = this.weaponHand === 'right' ? 'handR' : 'handL';
                    this.humanoid.attachToBone(handBone, this.weaponMesh);
                    this.weaponMesh.position.set(0, -0.12, 0.08);
                    this.weaponMesh.rotation.set(-Math.PI / 2, 0, 0);
                } else if (this.mesh) {
                    // Fallback to mesh group
                    const handOffset = this.weaponHand === 'right' ? -0.3 : 0.3;
                    this.weaponMesh.position.set(handOffset, 0.9, -0.2);
                    this.mesh.add(this.weaponMesh);
                }

                // Re-apply weapon pose
                this.applyWeaponPose();
            }
        }
    }

    // ============================================
    // Cleanup
    // ============================================

    destroy() {
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
        this.mesh = null;
        this.weaponMesh = null;
        this.humanoid = null;
        super.destroy();
    }

    serialize() {
        const base = super.serialize();
        return {
            ...base,
            slot: this.slot,
            weaponHand: this.weaponHand,
            isBot: this.isBot,
        };
    }

    deserialize(data) {
        super.deserialize(data);
        if (data.slot !== undefined) this.slot = data.slot;
        if (data.weaponHand) this.weaponHand = data.weaponHand;
        if (data.isBot !== undefined) this.isBot = data.isBot;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Opponent;
}
