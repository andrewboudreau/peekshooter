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
     * Create the opponent's 3D mesh
     * @param {THREE.Scene} scene - Scene to add mesh to
     */
    createMesh(scene) {
        if (this.mesh) {
            scene.remove(this.mesh);
        }

        const config = typeof PhysicsConfig !== 'undefined' ? PhysicsConfig.opponent : null;
        const group = new THREE.Group();

        const teamColor = this.slot === 0 ? 0x4444aa : 0xaa4444;
        const skinColor = 0xddccbb;

        // Head
        const headRadius = config?.headRadius || 0.18;
        const headGeometry = new THREE.SphereGeometry(headRadius, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = config?.headY || 1.45;
        head.userData.isOpponent = true;
        group.add(head);

        // Register head hitbox
        const damage = typeof DamageConfig !== 'undefined' ? DamageConfig.bodyParts : null;
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

        // Update weapon hand position (mirrored)
        if (this.weaponMesh) {
            const handOffset = this.weaponHand === 'right' ? -0.3 : 0.3;
            this.weaponMesh.position.x = handOffset;
        }
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
        if (this.weaponMesh && this.mesh) {
            // Remove old weapon
            this.mesh.remove(this.weaponMesh);
            if (this.weaponMesh.geometry) this.weaponMesh.geometry.dispose();

            // Create new weapon using WeaponFactory if available
            if (typeof WeaponFactory !== 'undefined') {
                this.weaponMesh = WeaponFactory.createOpponentWeapon(weaponId);
                const handOffset = this.weaponHand === 'right' ? -0.3 : 0.3;
                this.weaponMesh.position.set(handOffset, 0.9, -0.2);
                this.mesh.add(this.weaponMesh);
            }
        }
    }

    // ============================================
    // Effects
    // ============================================

    /**
     * Show muzzle flash on opponent's weapon
     */
    showMuzzleFlash() {
        if (!this.weaponMesh || !this.mesh) return;

        const flashGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 1,
        });
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(this.weaponMesh.position);
        flash.position.z -= 0.3;
        this.mesh.add(flash);

        setTimeout(() => {
            this.mesh.remove(flash);
            flashGeometry.dispose();
            flashMaterial.dispose();
        }, 50);

        if (typeof EventBus !== 'undefined') {
            EventBus.emit(GameEvents.EFFECT_MUZZLE_FLASH, {
                entity: this,
                position: flash.getWorldPosition(new THREE.Vector3()),
            });
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
