// ============================================
// BOT CONTROLLER
// AI controller for practice opponent
// ============================================

const BotController = {
    // Bot state
    enabled: false,
    phase: 'moving_left',
    phaseTime: 0,
    shotFired: false,

    // Timing configuration
    config: {
        moveTime: 1.5,      // Time to move to each side
        peekTime: 0.8,      // Time to peek before shooting
        holdTime: 0.3,      // Time to hold after shooting
        unpeekTime: 0.4,    // Time to unpeek
        accuracy: 0.6,      // Base accuracy (60%)
        strafeAmount: 0.8,  // How far to strafe
        leanAmount: 0.8,    // How far to lean
    },

    // Damage values for bot shots
    damageTable: {
        head: 25,
        chest: 15,
        belly: 10,
        arm: 5,
    },

    // Body part hit distribution (weighted)
    bodyParts: ['head', 'chest', 'chest', 'belly', 'belly', 'arm', 'arm'],

    // ============================================
    // Control
    // ============================================

    /**
     * Toggle bot on/off
     * @returns {boolean} New enabled state
     */
    toggle() {
        this.enabled = !this.enabled;

        if (this.enabled) {
            this.reset();
            console.log('[BotController] Enabled');

            // Emit event
            if (typeof EventBus !== 'undefined') {
                EventBus.emit('bot:enabled', { controller: this });
            }
        } else {
            console.log('[BotController] Disabled');

            // Emit event
            if (typeof EventBus !== 'undefined') {
                EventBus.emit('bot:disabled', { controller: this });
            }
        }

        return this.enabled;
    },

    /**
     * Reset bot state
     */
    reset() {
        this.phase = 'moving_left';
        this.phaseTime = 0;
        this.shotFired = false;
    },

    // ============================================
    // Update Loop
    // ============================================

    /**
     * Update bot AI - called every frame
     * @param {number} deltaTime - Time since last frame
     * @param {object} opponent - Opponent entity/mesh wrapper
     */
    update(deltaTime = 1/60, opponent = null) {
        if (!this.enabled || !opponent) return;

        this.phaseTime += deltaTime;

        const { moveTime, peekTime, holdTime, unpeekTime, strafeAmount, leanAmount } = this.config;

        switch (this.phase) {
            case 'moving_left':
                this.setTargetState(opponent, -strafeAmount, 0);
                if (this.phaseTime > moveTime) {
                    this.transitionTo('peeking_right');
                }
                break;

            case 'peeking_right':
                this.setTargetState(opponent, -strafeAmount, leanAmount);
                if (this.phaseTime > peekTime && !this.shotFired) {
                    this.shoot(opponent);
                }
                if (this.phaseTime > peekTime + holdTime) {
                    this.transitionTo('unpeeking_right');
                }
                break;

            case 'unpeeking_right':
                this.setTargetState(opponent, -strafeAmount, 0);
                if (this.phaseTime > unpeekTime) {
                    this.transitionTo('moving_right');
                }
                break;

            case 'moving_right':
                this.setTargetState(opponent, strafeAmount, 0);
                if (this.phaseTime > moveTime) {
                    this.transitionTo('peeking_left');
                }
                break;

            case 'peeking_left':
                this.setTargetState(opponent, strafeAmount, -leanAmount);
                if (this.phaseTime > peekTime && !this.shotFired) {
                    this.shoot(opponent);
                }
                if (this.phaseTime > peekTime + holdTime) {
                    this.transitionTo('unpeeking_left');
                }
                break;

            case 'unpeeking_left':
                this.setTargetState(opponent, strafeAmount, 0);
                if (this.phaseTime > unpeekTime) {
                    this.transitionTo('moving_left');
                }
                break;
        }
    },

    /**
     * Transition to a new phase
     * @param {string} newPhase - Phase to transition to
     */
    transitionTo(newPhase) {
        this.phase = newPhase;
        this.phaseTime = 0;

        // Reset shot flag for peeking phases
        if (newPhase.startsWith('peeking')) {
            this.shotFired = false;
        }

        // Emit event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('bot:phaseChange', { phase: newPhase });
        }
    },

    /**
     * Set opponent's target state
     * @param {object} opponent - Opponent object
     * @param {number} strafe - Target strafe value
     * @param {number} lean - Target lean value
     */
    setTargetState(opponent, strafe, lean) {
        if (opponent.targetState) {
            opponent.targetState.strafe = strafe;
            opponent.targetState.lean = lean;
        }

        // Set look direction for aim IK
        // Bot aims toward center (player position) with slight variation
        const lookYaw = lean * 0.3;  // Look in direction of lean
        const lookPitch = -0.1;      // Slightly down toward player

        // Support both new Opponent class (transform) and legacy OpponentPlayer (targetState)
        if (opponent.transform) {
            opponent.transform.look.yaw = lookYaw;
            opponent.transform.look.pitch = lookPitch;
        }
        if (opponent.targetState) {
            opponent.targetState.lookYaw = lookYaw;
            opponent.targetState.lookPitch = lookPitch;
        }
    },

    // ============================================
    // Shooting
    // ============================================

    /**
     * Bot fires a shot
     * @param {object} opponent - Opponent entity
     */
    shoot(opponent) {
        this.shotFired = true;

        // Handle opponent shot effects (sound, tracer)
        if (typeof handleOpponentShot === 'function') {
            handleOpponentShot(opponent);
        }

        // Emit bot shot event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('bot:shoot', { opponent });
        }

        // Calculate hit
        const hitResult = this.calculateHit();

        if (hitResult.hit) {
            this.applyDamage(hitResult);
        }
    },

    /**
     * Calculate if bot hits the player
     * @returns {object} Hit result with bodyPart and damage
     */
    calculateHit() {
        // Check if player is exposed
        const playerPeeking = this.isPlayerExposed();

        if (!playerPeeking) {
            return { hit: false, reason: 'player_in_cover' };
        }

        // Random accuracy check
        if (Math.random() > this.config.accuracy) {
            return { hit: false, reason: 'miss' };
        }

        // Determine body part hit
        const bodyPart = this.bodyParts[Math.floor(Math.random() * this.bodyParts.length)];
        const damage = this.damageTable[bodyPart] || 10;

        return {
            hit: true,
            bodyPart,
            damage,
        };
    },

    /**
     * Check if player is exposed (peeking)
     * @returns {boolean} True if player is exposed
     */
    isPlayerExposed() {
        if (typeof gameState === 'undefined') return false;
        return Math.abs(gameState.lean) > 0.3 || Math.abs(gameState.strafe) > 0.3;
    },

    /**
     * Apply damage to player
     * @param {object} hitResult - Result from calculateHit
     */
    applyDamage(hitResult) {
        const { bodyPart, damage } = hitResult;

        // Check god mode
        if (typeof DebugConsole !== 'undefined' && DebugConsole.debug?.godMode) {
            if (typeof DebugConsole.log === 'function') {
                DebugConsole.log(`Bot hit blocked by god mode (${bodyPart}, ${damage} damage)`, 'log');
            }
            return;
        }

        // Apply damage
        if (typeof netState !== 'undefined' && netState.health > 0) {
            netState.health = Math.max(0, netState.health - damage);

            // Effects
            if (typeof showDamageEffect === 'function') {
                showDamageEffect();
            }
            if (typeof updateHealthUI === 'function') {
                updateHealthUI();
            }

            // Log hit
            if (typeof DebugConsole !== 'undefined' && typeof DebugConsole.log === 'function') {
                DebugConsole.log(`Bot hit you in the ${bodyPart} for ${damage} damage`, 'warn');
            }

            // Emit damage event
            if (typeof EventBus !== 'undefined') {
                EventBus.emit(GameEvents.DAMAGE_RECEIVED, {
                    source: 'bot',
                    bodyPart,
                    damage,
                    remainingHealth: netState.health,
                });
            }

            // Check death
            if (netState.health <= 0) {
                this.handlePlayerDeath();
            }
        }
    },

    /**
     * Handle player death from bot
     */
    handlePlayerDeath() {
        // Bot scores
        if (typeof netState !== 'undefined' && netState.scores) {
            netState.scores[1]++;
        }

        // UI updates
        if (typeof updateScoreUI === 'function') {
            updateScoreUI();
        }
        if (typeof showDeathScreen === 'function') {
            showDeathScreen();
        }

        // Emit death event
        if (typeof EventBus !== 'undefined') {
            EventBus.emit(GameEvents.PLAYER_KILLED, {
                killer: 'bot',
            });
        }

        // Reset after delay
        setTimeout(() => {
            if (typeof resetRound === 'function') {
                resetRound();
            }
        }, 3000);
    },

    // ============================================
    // Debug Info
    // ============================================

    /**
     * Get current bot status
     * @returns {object} Bot status
     */
    getStatus() {
        return {
            enabled: this.enabled,
            phase: this.phase,
            phaseTime: this.phaseTime.toFixed(2),
            shotFired: this.shotFired,
        };
    },
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BotController;
}
