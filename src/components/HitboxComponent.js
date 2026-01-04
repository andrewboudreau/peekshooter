// ============================================
// HITBOX COMPONENT
// Manages entity hitboxes and hit detection
// ============================================

class HitboxComponent extends Component {
    constructor() {
        super();

        // Map of body part name -> hitbox data
        this.parts = new Map();

        // Reference to parent mesh group
        this.meshGroup = null;

        // Debug visualization
        this.debugHelpers = [];
        this.showDebug = false;
    }

    /**
     * Add a body part hitbox
     * @param {string} name - Body part name (head, chest, etc.)
     * @param {THREE.Mesh} mesh - Mesh for hit detection
     * @param {number} damage - Base damage for this part
     * @param {object} options - Additional options
     */
    addPart(name, mesh, damage, options = {}) {
        // Tag the mesh for raycasting
        mesh.userData.isHitbox = true;
        mesh.userData.bodyPart = name;
        mesh.userData.damage = damage;
        mesh.userData.entity = this.entity;

        const part = {
            name,
            mesh,
            damage,
            multiplier: options.multiplier || 1.0,
            isCritical: options.isCritical || name === 'head',
            localPosition: mesh.position.clone(),
        };

        this.parts.set(name, part);

        return this;
    }

    /**
     * Remove a body part hitbox
     * @param {string} name - Body part name
     */
    removePart(name) {
        const part = this.parts.get(name);
        if (part) {
            part.mesh.userData.isHitbox = false;
            part.mesh.userData.bodyPart = null;
            part.mesh.userData.damage = null;
            this.parts.delete(name);
        }
    }

    /**
     * Get a body part by name
     * @param {string} name - Body part name
     * @returns {object|null} Body part data
     */
    getPart(name) {
        return this.parts.get(name) || null;
    }

    /**
     * Get damage for a body part
     * @param {string} name - Body part name
     * @returns {number} Damage value
     */
    getDamage(name) {
        const part = this.parts.get(name);
        if (!part) {
            // Use DamageConfig if available
            if (typeof DamageConfig !== 'undefined') {
                return DamageConfig.getDamage(name);
            }
            return 10; // Default fallback
        }
        return part.damage * part.multiplier;
    }

    /**
     * Get all meshes for raycasting
     * @returns {THREE.Mesh[]} Array of hitbox meshes
     */
    getMeshes() {
        return Array.from(this.parts.values()).map(p => p.mesh);
    }

    /**
     * Check which body part was hit
     * @param {THREE.Intersection} intersection - Raycast intersection
     * @returns {object|null} Hit result
     */
    processHit(intersection) {
        const hitMesh = intersection.object;
        const bodyPart = hitMesh.userData.bodyPart;

        if (!bodyPart) return null;

        const part = this.parts.get(bodyPart);
        if (!part) return null;

        return {
            bodyPart,
            damage: this.getDamage(bodyPart),
            point: intersection.point.clone(),
            normal: intersection.face ? intersection.face.normal.clone() : null,
            distance: intersection.distance,
            isCritical: part.isCritical,
            mesh: hitMesh,
        };
    }

    /**
     * Perform a raycast against all hitboxes
     * @param {THREE.Raycaster} raycaster - Raycaster to use
     * @returns {object|null} Hit result or null
     */
    raycast(raycaster) {
        const meshes = this.getMeshes();
        if (meshes.length === 0) return null;

        const intersections = raycaster.intersectObjects(meshes, true);
        if (intersections.length === 0) return null;

        return this.processHit(intersections[0]);
    }

    /**
     * Set mesh group for position updates
     * @param {THREE.Group} group - Parent mesh group
     */
    setMeshGroup(group) {
        this.meshGroup = group;
    }

    /**
     * Toggle debug visualization
     * @param {boolean} show - Whether to show debug hitboxes
     * @param {THREE.Scene} scene - Scene to add helpers to
     */
    setDebug(show, scene) {
        this.showDebug = show;

        // Clear existing helpers
        this.debugHelpers.forEach(helper => {
            scene.remove(helper);
            if (helper.dispose) helper.dispose();
        });
        this.debugHelpers = [];

        if (!show) return;

        // Create box helpers for each part
        for (const [name, part] of this.parts) {
            const color = this.getDebugColor(name);
            const helper = new THREE.BoxHelper(part.mesh, color);
            scene.add(helper);
            this.debugHelpers.push(helper);
        }
    }

    /**
     * Get debug color for a body part
     * @param {string} name - Body part name
     * @returns {number} Color hex value
     */
    getDebugColor(name) {
        // Use DamageConfig if available
        if (typeof DamageConfig !== 'undefined') {
            const info = DamageConfig.getPartInfo(name);
            return info.colorHex;
        }

        // Fallback colors
        const colors = {
            head: 0xff0000,
            chest: 0xff8800,
            belly: 0xffff00,
            arm: 0x00ff00,
        };
        return colors[name] || 0xffffff;
    }

    /**
     * Update debug helpers
     */
    updateDebug() {
        if (!this.showDebug) return;
        this.debugHelpers.forEach(helper => helper.update());
    }

    update(deltaTime) {
        this.updateDebug();
    }

    onDestroy() {
        // Clear debug helpers
        this.debugHelpers.forEach(helper => {
            if (helper.parent) helper.parent.remove(helper);
            if (helper.dispose) helper.dispose();
        });
        this.debugHelpers = [];

        // Clear mesh userData
        for (const part of this.parts.values()) {
            part.mesh.userData.isHitbox = false;
            part.mesh.userData.bodyPart = null;
            part.mesh.userData.damage = null;
            part.mesh.userData.entity = null;
        }
        this.parts.clear();
    }

    serialize() {
        const partsData = {};
        for (const [name, part] of this.parts) {
            partsData[name] = {
                damage: part.damage,
                multiplier: part.multiplier,
            };
        }
        return { parts: partsData };
    }

    deserialize(data) {
        if (data.parts) {
            for (const [name, partData] of Object.entries(data.parts)) {
                const part = this.parts.get(name);
                if (part) {
                    if (partData.damage !== undefined) part.damage = partData.damage;
                    if (partData.multiplier !== undefined) part.multiplier = partData.multiplier;
                }
            }
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HitboxComponent;
}
