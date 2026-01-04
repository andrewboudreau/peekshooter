// ============================================
// EFFECTS SYSTEM
// Handles visual effects like hit marks, blood, particles
// ============================================

const EffectsSystem = {
    // Three.js references (set during init)
    scene: null,

    // Active effect tracking
    activeEffects: {
        hitMarks: [],
        bloodParticles: [],
    },

    // Configuration
    config: {
        hitMark: {
            baseSize: 0.08,
            sizeVariation: 0.04,
            lifetime: 10000, // 10 seconds
            fadeStart: 0.8,  // Start fading at 80% of lifetime
        },
        blood: {
            particleCount: { min: 8, max: 16 },
            particleSize: { min: 0.03, max: 0.08 },
            particleLifetime: { min: 800, max: 1200 },
            decalSize: { min: 0.1, max: 0.25 },
            decalLifetime: { min: 1500, max: 2000 },
            sprayLength: { min: 0.2, max: 0.5 },
            sprayLifetime: { min: 150, max: 250 },
        },
    },

    // ============================================
    // Initialization
    // ============================================

    /**
     * Initialize the effects system
     * @param {THREE.Scene} scene - The Three.js scene
     */
    init(scene) {
        this.scene = scene;
        console.log('[EffectsSystem] Initialized');
    },

    // ============================================
    // Hit Marks (Bullet Holes)
    // ============================================

    /**
     * Create a bullet hole decal at impact point
     * @param {THREE.Vector3} position - Hit position
     * @param {THREE.Vector3} normal - Surface normal
     * @returns {THREE.Mesh} The created decal mesh
     */
    createHitMark(position, normal) {
        if (!this.scene) {
            console.warn('[EffectsSystem] Scene not initialized');
            return null;
        }

        const { baseSize, sizeVariation, lifetime } = this.config.hitMark;
        const size = baseSize + Math.random() * sizeVariation;

        // Create decal geometry (simple circle facing the hit normal)
        const geometry = new THREE.CircleGeometry(size, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0x1a1a1a,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            depthWrite: false,
        });

        const decal = new THREE.Mesh(geometry, material);
        decal.position.copy(position);
        decal.userData.isDecal = true; // Mark as decal so raycasts ignore it

        // Offset slightly from surface to prevent z-fighting
        decal.position.add(normal.clone().multiplyScalar(0.01));

        // Orient to face along the normal
        decal.lookAt(position.clone().add(normal));

        // Add slight random rotation for variety
        decal.rotation.z = Math.random() * Math.PI * 2;

        this.scene.add(decal);

        // Track for cleanup
        const hitMark = {
            mesh: decal,
            createdAt: Date.now(),
            lifetime: lifetime,
        };
        this.activeEffects.hitMarks.push(hitMark);

        // Add scorch/crack ring around it
        const ringGeometry = new THREE.RingGeometry(size * 0.8, size * 1.2, 8);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x333333,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(decal.position);
        ring.position.add(normal.clone().multiplyScalar(0.005));
        ring.lookAt(position.clone().add(normal));
        ring.rotation.z = decal.rotation.z;
        ring.userData.isDecal = true;
        this.scene.add(ring);

        this.activeEffects.hitMarks.push({
            mesh: ring,
            createdAt: Date.now(),
            lifetime: lifetime,
        });

        // Emit event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit(GameEvents.EFFECT_HIT_MARK, {
                position: position.clone(),
                normal: normal.clone(),
            });
        }

        return decal;
    },

    // ============================================
    // Blood Effects
    // ============================================

    /**
     * Create blood splatter particles at hit location
     * @param {THREE.Vector3} position - Hit position
     * @param {THREE.Vector3} direction - Shot direction
     */
    createBloodSplatter(position, direction) {
        if (!this.scene) return;

        const { particleCount, particleSize, particleLifetime, sprayLength, sprayLifetime } = this.config.blood;
        const count = particleCount.min + Math.floor(Math.random() * (particleCount.max - particleCount.min));

        // Create blood particles
        for (let i = 0; i < count; i++) {
            const size = particleSize.min + Math.random() * (particleSize.max - particleSize.min);

            const geometry = new THREE.SphereGeometry(size, 6, 6);
            const material = new THREE.MeshBasicMaterial({
                color: new THREE.Color(
                    0.5 + Math.random() * 0.3,  // Red variation
                    0,
                    0
                ),
                transparent: true,
                opacity: 0.9,
            });

            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);
            particle.userData.isDecal = true;

            // Calculate velocity - spray outward from hit direction
            const spread = 0.5;
            const velocity = new THREE.Vector3(
                direction.x + (Math.random() - 0.5) * spread,
                direction.y + (Math.random() - 0.5) * spread + 0.3, // Slight upward bias
                direction.z + (Math.random() - 0.5) * spread
            ).normalize().multiplyScalar(2 + Math.random() * 3);

            this.scene.add(particle);

            // Track particle with physics
            const bloodParticle = {
                mesh: particle,
                velocity: velocity,
                gravity: -9.8,
                createdAt: Date.now(),
                lifetime: particleLifetime.min + Math.random() * (particleLifetime.max - particleLifetime.min),
                groundY: 0.02,
            };
            this.activeEffects.bloodParticles.push(bloodParticle);
        }

        // Create blood spray effect (instantaneous splatter lines)
        for (let i = 0; i < 5; i++) {
            const length = sprayLength.min + Math.random() * (sprayLength.max - sprayLength.min);
            const sprayDir = new THREE.Vector3(
                direction.x + (Math.random() - 0.5) * 0.8,
                direction.y + (Math.random() - 0.5) * 0.8,
                direction.z + (Math.random() - 0.5) * 0.8
            ).normalize();

            const points = [
                position.clone(),
                position.clone().add(sprayDir.multiplyScalar(length))
            ];

            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({
                color: 0x8b0000,
                transparent: true,
                opacity: 0.8,
            });

            const line = new THREE.Line(geometry, material);
            line.userData.isDecal = true;
            this.scene.add(line);

            this.activeEffects.bloodParticles.push({
                mesh: line,
                velocity: new THREE.Vector3(0, 0, 0),
                gravity: 0,
                createdAt: Date.now(),
                lifetime: sprayLifetime.min + Math.random() * (sprayLifetime.max - sprayLifetime.min),
                isSpray: true,
            });
        }

        // Emit event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit(GameEvents.EFFECT_BLOOD_SPLATTER, {
                position: position.clone(),
                direction: direction.clone(),
            });
        }
    },

    /**
     * Create blood decal on a surface
     * @param {THREE.Vector3} position - Decal position
     * @param {THREE.Vector3} normal - Surface normal
     */
    createBloodDecal(position, normal) {
        if (!this.scene) return;

        const { decalSize, decalLifetime } = this.config.blood;
        const size = decalSize.min + Math.random() * (decalSize.max - decalSize.min);

        // Irregular blood splat shape using multiple circles
        const group = new THREE.Group();

        for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
            const blobSize = size * (0.4 + Math.random() * 0.6);
            const geometry = new THREE.CircleGeometry(blobSize, 8);
            const material = new THREE.MeshBasicMaterial({
                color: new THREE.Color(0.4 + Math.random() * 0.2, 0, 0),
                transparent: true,
                opacity: 0.7 + Math.random() * 0.2,
                side: THREE.DoubleSide,
                depthWrite: false,
            });

            const blob = new THREE.Mesh(geometry, material);
            blob.position.x = (Math.random() - 0.5) * size;
            blob.position.y = (Math.random() - 0.5) * size;
            blob.userData.isDecal = true;
            group.add(blob);
        }

        group.userData.isDecal = true;
        group.position.copy(position);
        group.position.add(normal.clone().multiplyScalar(0.02));
        group.lookAt(position.clone().add(normal));
        group.rotation.z = Math.random() * Math.PI * 2;

        this.scene.add(group);

        this.activeEffects.hitMarks.push({
            mesh: group,
            createdAt: Date.now(),
            lifetime: decalLifetime.min + Math.random() * (decalLifetime.max - decalLifetime.min),
        });

        // Emit event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit(GameEvents.EFFECT_BLOOD_DECAL, {
                position: position.clone(),
                normal: normal.clone(),
            });
        }
    },

    // ============================================
    // Update Loop
    // ============================================

    /**
     * Update all active effects
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        this.updateBloodParticles(deltaTime);
        this.updateHitMarks();
    },

    /**
     * Update blood particles physics
     * @param {number} deltaTime - Time since last frame
     */
    updateBloodParticles(deltaTime) {
        const now = Date.now();

        for (let i = this.activeEffects.bloodParticles.length - 1; i >= 0; i--) {
            const particle = this.activeEffects.bloodParticles[i];
            const age = now - particle.createdAt;

            // Remove expired particles
            if (age > particle.lifetime) {
                this.removeParticle(particle, i);
                continue;
            }

            // Skip physics for spray lines
            if (particle.isSpray) {
                // Fade out
                particle.mesh.material.opacity = 0.8 * (1 - age / particle.lifetime);
                continue;
            }

            // Apply gravity
            particle.velocity.y += particle.gravity * deltaTime;

            // Update position
            particle.mesh.position.x += particle.velocity.x * deltaTime;
            particle.mesh.position.y += particle.velocity.y * deltaTime;
            particle.mesh.position.z += particle.velocity.z * deltaTime;

            // Ground collision - create blood decal
            if (particle.mesh.position.y <= particle.groundY) {
                particle.mesh.position.y = particle.groundY;
                particle.velocity.set(0, 0, 0);

                // Create ground blood splat
                if (!particle.grounded) {
                    particle.grounded = true;
                    this.createBloodDecal(
                        particle.mesh.position.clone(),
                        new THREE.Vector3(0, 1, 0)
                    );
                }
            }

            // Fade out near end of life
            const fadeStart = particle.lifetime * 0.7;
            if (age > fadeStart) {
                const fadeProgress = (age - fadeStart) / (particle.lifetime - fadeStart);
                particle.mesh.material.opacity = 0.9 * (1 - fadeProgress);
            }
        }
    },

    /**
     * Update hit marks (fade and cleanup)
     */
    updateHitMarks() {
        const now = Date.now();

        for (let i = this.activeEffects.hitMarks.length - 1; i >= 0; i--) {
            const mark = this.activeEffects.hitMarks[i];
            const age = now - mark.createdAt;

            if (age > mark.lifetime) {
                this.removeHitMark(mark, i);
                continue;
            }

            // Fade out in last 20% of lifetime
            const fadeStart = mark.lifetime * this.config.hitMark.fadeStart;
            if (age > fadeStart) {
                const fadeProgress = (age - fadeStart) / (mark.lifetime - fadeStart);
                if (mark.mesh.material) {
                    mark.mesh.material.opacity = 0.8 * (1 - fadeProgress);
                } else if (mark.mesh.children) {
                    mark.mesh.children.forEach(child => {
                        if (child.material) child.material.opacity = 0.7 * (1 - fadeProgress);
                    });
                }
            }
        }
    },

    // ============================================
    // Cleanup Helpers
    // ============================================

    /**
     * Remove a blood particle
     * @param {object} particle - Particle to remove
     * @param {number} index - Index in array
     */
    removeParticle(particle, index) {
        if (this.scene) {
            this.scene.remove(particle.mesh);
        }
        if (particle.mesh.geometry) particle.mesh.geometry.dispose();
        if (particle.mesh.material) particle.mesh.material.dispose();
        this.activeEffects.bloodParticles.splice(index, 1);
    },

    /**
     * Remove a hit mark
     * @param {object} mark - Mark to remove
     * @param {number} index - Index in array
     */
    removeHitMark(mark, index) {
        if (this.scene) {
            this.scene.remove(mark.mesh);
        }
        if (mark.mesh.geometry) mark.mesh.geometry.dispose();
        if (mark.mesh.material) mark.mesh.material.dispose();
        this.activeEffects.hitMarks.splice(index, 1);
    },

    /**
     * Clear all active effects
     */
    clearAll() {
        // Clear particles
        for (let i = this.activeEffects.bloodParticles.length - 1; i >= 0; i--) {
            this.removeParticle(this.activeEffects.bloodParticles[i], i);
        }

        // Clear hit marks
        for (let i = this.activeEffects.hitMarks.length - 1; i >= 0; i--) {
            this.removeHitMark(this.activeEffects.hitMarks[i], i);
        }
    },

    /**
     * Get statistics about active effects
     * @returns {object} Effect counts
     */
    getStats() {
        return {
            hitMarks: this.activeEffects.hitMarks.length,
            bloodParticles: this.activeEffects.bloodParticles.length,
        };
    },
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EffectsSystem;
}
