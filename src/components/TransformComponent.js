// ============================================
// TRANSFORM COMPONENT
// Manages entity position, rotation, and stance
// ============================================

class TransformComponent extends Component {
    constructor() {
        super();

        // Position in world space
        this.position = { x: 0, y: 0, z: 0 };

        // Rotation (euler angles in radians)
        this.rotation = { x: 0, y: 0, z: 0 };

        // Stance values (for characters)
        this.stance = {
            crouch: 0,          // 0 = standing, 1 = fully crouched
            lean: 0,            // -1 = left, 0 = center, 1 = right
            strafe: 0,          // -1 = left, 0 = center, 1 = right
        };

        // Target stance (for interpolation)
        this.targetStance = {
            crouch: 0,
            lean: 0,
            strafe: 0,
        };

        // Look direction
        this.look = {
            yaw: 0,             // Horizontal look angle
            pitch: 0,           // Vertical look angle
        };

        // Reference to Three.js object (if any)
        this.mesh = null;

        // Interpolation speed
        this.lerpSpeed = 15;
    }

    /**
     * Set position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     */
    setPosition(x, y, z) {
        this.position.x = x;
        this.position.y = y;
        this.position.z = z;
        this.syncToMesh();
    }

    /**
     * Set rotation
     * @param {number} x - X rotation (pitch)
     * @param {number} y - Y rotation (yaw)
     * @param {number} z - Z rotation (roll)
     */
    setRotation(x, y, z) {
        this.rotation.x = x;
        this.rotation.y = y;
        this.rotation.z = z;
        this.syncToMesh();
    }

    /**
     * Set stance target (will interpolate toward it)
     * @param {object} stance - Stance values to set
     */
    setTargetStance(stance) {
        if (stance.crouch !== undefined) this.targetStance.crouch = stance.crouch;
        if (stance.lean !== undefined) this.targetStance.lean = stance.lean;
        if (stance.strafe !== undefined) this.targetStance.strafe = stance.strafe;
    }

    /**
     * Set stance immediately (no interpolation)
     * @param {object} stance - Stance values to set
     */
    setStance(stance) {
        if (stance.crouch !== undefined) {
            this.stance.crouch = stance.crouch;
            this.targetStance.crouch = stance.crouch;
        }
        if (stance.lean !== undefined) {
            this.stance.lean = stance.lean;
            this.targetStance.lean = stance.lean;
        }
        if (stance.strafe !== undefined) {
            this.stance.strafe = stance.strafe;
            this.targetStance.strafe = stance.strafe;
        }
    }

    /**
     * Set look direction
     * @param {number} yaw - Horizontal angle
     * @param {number} pitch - Vertical angle
     */
    setLook(yaw, pitch) {
        this.look.yaw = yaw;
        this.look.pitch = pitch;
    }

    /**
     * Attach a Three.js mesh to this transform
     * @param {THREE.Object3D} mesh - Mesh to attach
     */
    attachMesh(mesh) {
        this.mesh = mesh;
        this.syncToMesh();
    }

    /**
     * Sync transform to attached mesh
     */
    syncToMesh() {
        if (!this.mesh) return;

        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        this.mesh.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
    }

    /**
     * Sync transform from attached mesh
     */
    syncFromMesh() {
        if (!this.mesh) return;

        this.position.x = this.mesh.position.x;
        this.position.y = this.mesh.position.y;
        this.position.z = this.mesh.position.z;
        this.rotation.x = this.mesh.rotation.x;
        this.rotation.y = this.mesh.rotation.y;
        this.rotation.z = this.mesh.rotation.z;
    }

    /**
     * Get world position as THREE.Vector3
     * @returns {THREE.Vector3} World position
     */
    getWorldPosition() {
        if (typeof THREE !== 'undefined') {
            return new THREE.Vector3(this.position.x, this.position.y, this.position.z);
        }
        return this.position;
    }

    /**
     * Update interpolation
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Interpolate stance toward target
        const t = Math.min(1, this.lerpSpeed * deltaTime);

        this.stance.crouch += (this.targetStance.crouch - this.stance.crouch) * t;
        this.stance.lean += (this.targetStance.lean - this.stance.lean) * t;
        this.stance.strafe += (this.targetStance.strafe - this.stance.strafe) * t;
    }

    /**
     * Check if entity is peeking (leaning or strafing out of cover)
     * @returns {boolean} Whether entity is peeking
     */
    isPeeking() {
        return Math.abs(this.stance.lean) > 0.3 || Math.abs(this.stance.strafe) > 0.3;
    }

    /**
     * Check if entity is crouched
     * @returns {boolean} Whether entity is crouched
     */
    isCrouched() {
        return this.stance.crouch > 0.5;
    }

    serialize() {
        return {
            position: { ...this.position },
            rotation: { ...this.rotation },
            stance: { ...this.stance },
            look: { ...this.look },
        };
    }

    deserialize(data) {
        if (data.position) Object.assign(this.position, data.position);
        if (data.rotation) Object.assign(this.rotation, data.rotation);
        if (data.stance) {
            Object.assign(this.stance, data.stance);
            Object.assign(this.targetStance, data.stance);
        }
        if (data.look) Object.assign(this.look, data.look);
        this.syncToMesh();
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TransformComponent;
}
