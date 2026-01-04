// ============================================
// SHOOTING SYSTEM
// Handles all shooting logic in clean phases
// ============================================

const ShootingSystem = {
    // Dependencies (set during initialization)
    camera: null,
    scene: null,
    raycaster: null,

    // ============================================
    // Initialization
    // ============================================

    init(camera, scene) {
        this.camera = camera;
        this.scene = scene;
        this.raycaster = new THREE.Raycaster();
        console.log('[ShootingSystem] Initialized');
    },

    // ============================================
    // Main Shoot Entry Point
    // ============================================

    /**
     * Main shoot function - orchestrates all phases
     * @param {object} context - Shooting context (gameState, netState, etc.)
     * @returns {object} Shot result
     */
    shoot(context) {
        const { gameState, netState, targets } = context;

        // Phase 1: Prepare the shot
        const shotData = this.prepareShot(gameState);

        // Phase 2: Perform raycast
        const raycastResult = this.performRaycast();

        // Phase 3: Process hits in priority order
        let result = null;

        // Check opponent hit (multiplayer)
        if (netState?.gameMode === 'online' && netState?.opponent?.mesh) {
            result = this.handleOpponentHit(raycastResult, netState, gameState);
            if (result?.hit) {
                return result;
            }
        }

        // Check practice targets (offline)
        if (targets && targets.length > 0) {
            result = this.handleTargetHit(raycastResult, targets, gameState);
            if (result?.hit) {
                return result;
            }
        }

        // No opponent or target hit - check environment
        result = this.handleEnvironmentHit(raycastResult);

        return result;
    },

    // ============================================
    // Phase 1: Prepare Shot
    // ============================================

    /**
     * Prepare the shot - handle muzzle flash, audio, recoil, events
     * @param {object} gameState - Current game state
     * @returns {object} Shot data for subsequent phases
     */
    prepareShot(gameState) {
        const shotData = {
            timestamp: Date.now(),
            weapon: gameState?.currentWeapon || 'assault_rifle',
            position: this.camera ? this.camera.position.clone() : null,
            direction: this.camera ? this.camera.getWorldDirection(new THREE.Vector3()) : null,
        };

        // Emit weapon fired event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit(GameEvents.WEAPON_FIRED, shotData);
        }

        // Audio
        if (typeof AudioSystem !== 'undefined') {
            AudioSystem.playGunshot();
        }

        // Recoil
        if (typeof applyRecoil === 'function') {
            applyRecoil();
        }

        // Network
        if (typeof sendShoot === 'function') {
            sendShoot();
        }

        return shotData;
    },

    // ============================================
    // Phase 2: Perform Raycast
    // ============================================

    /**
     * Perform the raycast from camera center
     * @returns {object} Raycast result with raycaster and direction
     */
    performRaycast() {
        if (!this.camera) {
            console.warn('[ShootingSystem] No camera set');
            return { raycaster: null, direction: null };
        }

        this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);

        return {
            raycaster: this.raycaster,
            direction: this.raycaster.ray.direction.clone(),
            origin: this.raycaster.ray.origin.clone(),
        };
    },

    // ============================================
    // Phase 3a: Handle Opponent Hit
    // ============================================

    /**
     * Check for and handle opponent hits
     * @param {object} raycastResult - Result from performRaycast
     * @param {object} netState - Network state
     * @param {object} gameState - Game state
     * @returns {object} Hit result
     */
    handleOpponentHit(raycastResult, netState, gameState) {
        const { raycaster } = raycastResult;
        if (!raycaster || !netState.opponent?.mesh) {
            return { hit: false, type: 'none' };
        }

        // Get blocking objects (cover, walls, etc.)
        const blockingObjects = this.getBlockingObjects();

        // Check opponent intersection
        const opponentIntersects = raycaster.intersectObject(netState.opponent.mesh, true);

        if (opponentIntersects.length === 0) {
            return { hit: false, type: 'miss' };
        }

        const opponentHit = opponentIntersects[0];
        const opponentDistance = opponentHit.distance;

        // Check if cover blocks the shot
        const coverIntersects = raycaster.intersectObjects(blockingObjects, true);

        if (coverIntersects.length > 0) {
            const coverDistance = coverIntersects[0].distance;
            if (coverDistance < opponentDistance) {
                // Shot blocked by cover
                return this.handleCoverBlock(coverIntersects[0]);
            }
        }

        // Hit opponent - process the hit
        return this.processOpponentHit(opponentHit, raycaster, netState);
    },

    /**
     * Get all objects that can block shots
     * @returns {Array} Array of blocking meshes
     */
    getBlockingObjects() {
        const blockingObjects = [];

        if (!this.scene) return blockingObjects;

        this.scene.traverse((obj) => {
            if (obj.isMesh &&
                !obj.userData.isOpponent &&
                !obj.userData.isTarget &&
                !obj.userData.isDecal &&
                obj !== window.ground &&
                obj.visible) {
                blockingObjects.push(obj);
            }
        });

        return blockingObjects;
    },

    /**
     * Handle shot blocked by cover
     * @param {object} coverHit - Intersection with cover
     * @returns {object} Hit result
     */
    handleCoverBlock(coverHit) {
        if (coverHit.face) {
            const worldNormal = coverHit.face.normal.clone();
            if (coverHit.object.matrixWorld) {
                worldNormal.transformDirection(coverHit.object.matrixWorld);
            }

            if (typeof createHitMark === 'function') {
                createHitMark(coverHit.point.clone(), worldNormal);
            }

            // Emit cover hit event
            if (typeof EventBus !== 'undefined') {
                EventBus.emit(GameEvents.HIT_COVER, {
                    point: coverHit.point.clone(),
                    normal: worldNormal,
                    object: coverHit.object,
                });
            }
        }

        return {
            hit: true,
            type: 'cover',
            point: coverHit.point.clone(),
            object: coverHit.object,
        };
    },

    /**
     * Process a confirmed opponent hit
     * @param {object} opponentHit - Intersection with opponent
     * @param {object} raycaster - The raycaster
     * @param {object} netState - Network state
     * @returns {object} Hit result
     */
    processOpponentHit(opponentHit, raycaster, netState) {
        const hitObject = opponentHit.object;
        const bodyPart = hitObject.userData.bodyPart || 'body';

        // Get damage from config
        const damage = typeof DamageConfig !== 'undefined'
            ? DamageConfig.getDamage(bodyPart)
            : (hitObject.userData.damage || 10);

        const hitPoint = opponentHit.point.clone();
        const hitDirection = raycaster.ray.direction.clone();

        // Emit hit event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit(GameEvents.HIT_OPPONENT, {
                bodyPart,
                damage,
                point: hitPoint,
                direction: hitDirection,
                distance: opponentHit.distance,
                hitObject,
                opponent: netState.opponent,
            });
        }

        // Network
        if (typeof sendHit === 'function') {
            sendHit(damage, bodyPart);
        }

        // Visual feedback
        if (typeof showHitMarker === 'function') {
            showHitMarker(bodyPart, hitPoint, hitObject);
        }

        // Audio
        if (typeof AudioSystem !== 'undefined') {
            AudioSystem.playImpactPlayer();
        }

        // Blood effects
        this.createBloodEffects(hitPoint, hitDirection, opponentHit);

        return {
            hit: true,
            type: 'opponent',
            bodyPart,
            damage,
            point: hitPoint,
            distance: opponentHit.distance,
        };
    },

    /**
     * Create blood splatter and decal effects
     * @param {THREE.Vector3} hitPoint - Hit position
     * @param {THREE.Vector3} hitDirection - Shot direction
     * @param {object} intersection - Three.js intersection
     */
    createBloodEffects(hitPoint, hitDirection, intersection) {
        // Blood splatter
        if (typeof createBloodSplatter === 'function') {
            createBloodSplatter(hitPoint, hitDirection);
        }

        if (typeof EventBus !== 'undefined') {
            EventBus.emit(GameEvents.EFFECT_BLOOD_SPLATTER, {
                position: hitPoint,
                direction: hitDirection,
            });
        }

        // Blood decal on opponent
        if (intersection.face) {
            const worldNormal = intersection.face.normal.clone();
            if (intersection.object.matrixWorld) {
                worldNormal.transformDirection(intersection.object.matrixWorld);
            }

            if (typeof createBloodDecal === 'function') {
                createBloodDecal(hitPoint, worldNormal.negate());
            }

            if (typeof EventBus !== 'undefined') {
                EventBus.emit(GameEvents.EFFECT_BLOOD_DECAL, {
                    position: hitPoint,
                    normal: worldNormal.negate(),
                });
            }
        }
    },

    // ============================================
    // Phase 3b: Handle Target Hit
    // ============================================

    /**
     * Check for and handle practice target hits
     * @param {object} raycastResult - Result from performRaycast
     * @param {Array} targets - Array of practice targets
     * @param {object} gameState - Game state
     * @returns {object} Hit result
     */
    handleTargetHit(raycastResult, targets, gameState) {
        const { raycaster } = raycastResult;
        if (!raycaster) {
            return { hit: false, type: 'none' };
        }

        let hitTarget = null;
        let hitIntersect = null;
        let closestDistance = Infinity;

        targets.forEach(target => {
            if (target.hit || !target.mesh.visible) return;

            const intersects = raycaster.intersectObject(target.mesh, true);
            if (intersects.length > 0 && intersects[0].distance < closestDistance) {
                closestDistance = intersects[0].distance;
                hitTarget = target;
                hitIntersect = intersects[0];
            }
        });

        if (!hitTarget) {
            return { hit: false, type: 'miss' };
        }

        // Mark target as hit
        hitTarget.hit = true;

        // Update score
        if (gameState) {
            gameState.score += hitTarget.config.points;
            const scoreElement = document.getElementById('score-value');
            if (scoreElement) {
                scoreElement.textContent = gameState.score;
            }
        }

        // Show hit marker
        this.showTargetHitMarker();

        // Audio
        if (typeof AudioSystem !== 'undefined') {
            AudioSystem.playImpactTarget();
        }

        // Animate target
        if (typeof animateTargetHit === 'function') {
            animateTargetHit(hitTarget);
        }

        // Check if all targets hit
        if (targets.every(t => t.hit)) {
            setTimeout(() => {
                if (typeof createTargets === 'function') {
                    createTargets();
                }
            }, 2000);
        }

        // Emit target hit event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit(GameEvents.HIT_TARGET, {
                target: hitTarget,
                point: hitIntersect.point.clone(),
                points: hitTarget.config.points,
            });
        }

        return {
            hit: true,
            type: 'target',
            target: hitTarget,
            point: hitIntersect.point.clone(),
            points: hitTarget.config.points,
        };
    },

    /**
     * Show hit marker UI for target hits
     */
    showTargetHitMarker() {
        const hitMarker = document.getElementById('hit-marker');
        if (hitMarker) {
            hitMarker.classList.remove('show');
            void hitMarker.offsetWidth;
            hitMarker.classList.add('show');
        }
    },

    // ============================================
    // Phase 3c: Handle Environment Hit (Miss)
    // ============================================

    /**
     * Handle shot that missed all targets - check environment
     * @param {object} raycastResult - Result from performRaycast
     * @returns {object} Hit result
     */
    handleEnvironmentHit(raycastResult) {
        const { raycaster } = raycastResult;
        if (!raycaster) {
            return { hit: false, type: 'none' };
        }

        const envObjects = this.getEnvironmentObjects();
        const envIntersects = raycaster.intersectObjects(envObjects, true);

        if (envIntersects.length === 0) {
            return { hit: false, type: 'miss' };
        }

        const hit = envIntersects[0];

        if (hit.face) {
            const worldNormal = hit.face.normal.clone();
            if (hit.object.matrixWorld) {
                worldNormal.transformDirection(hit.object.matrixWorld);
            }

            // Create hit mark
            if (typeof createHitMark === 'function') {
                createHitMark(hit.point.clone(), worldNormal);
            }

            // Play appropriate impact sound
            this.playEnvironmentImpactSound(hit.object);

            // Emit event
            if (typeof EventBus !== 'undefined') {
                EventBus.emit(GameEvents.EFFECT_HIT_MARK, {
                    position: hit.point.clone(),
                    normal: worldNormal,
                });
            }
        }

        return {
            hit: true,
            type: 'environment',
            point: hit.point.clone(),
            object: hit.object,
        };
    },

    /**
     * Get environment objects for hit detection
     * @returns {Array} Array of environment meshes
     */
    getEnvironmentObjects() {
        const envObjects = [];

        if (typeof ground !== 'undefined') envObjects.push(ground);
        if (typeof cover !== 'undefined') envObjects.push(cover);

        if (this.scene) {
            this.scene.traverse((obj) => {
                if (obj.isMesh &&
                    obj !== ground &&
                    obj !== cover &&
                    !obj.userData.isOpponent &&
                    !obj.userData.isTarget &&
                    !obj.userData.isDecal) {
                    envObjects.push(obj);
                }
            });
        }

        return envObjects;
    },

    /**
     * Play impact sound based on surface type
     * @param {object} hitObject - The hit mesh
     */
    playEnvironmentImpactSound(hitObject) {
        if (typeof AudioSystem === 'undefined') return;

        const isBarrier = hitObject === cover ||
            hitObject.material?.color?.getHex() === 0xff8800;

        if (isBarrier) {
            AudioSystem.playImpactBarrier();
        } else {
            AudioSystem.playImpactWall();
        }
    },
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShootingSystem;
}
