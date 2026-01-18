// ============================================
// ANIMATION STATE MACHINE
// Handles non-stance animations (firing, hit, death)
// Works alongside pose overlay system for stance
// ============================================

/**
 * Animation states for the state machine
 */
const AnimationState = {
    IDLE: 'idle',
    FIRING: 'firing',
    HIT: 'hit',
    DEAD: 'dead'
};

/**
 * AnimationStateMachine manages transitions between animation states
 * for non-stance animations (firing recoil, hit reactions, death).
 *
 * Stance poses (crouch/lean/strafe) continue using the pose overlay system.
 */
class AnimationStateMachine {
    /**
     * Create an animation state machine
     * @param {AnimationController} animController - The animation controller to drive
     */
    constructor(animController) {
        this.controller = animController;
        this.currentState = AnimationState.IDLE;
        this.stateStartTime = 0;
        this.isLocked = false;
        this.onStateChange = null; // Optional callback

        // State configuration
        this.stateConfig = {
            [AnimationState.IDLE]: {
                duration: 0,           // Infinite (no auto-transition)
                interruptible: true,
                nextState: null,
                clipName: 'idle',
                loop: true
            },
            [AnimationState.FIRING]: {
                duration: 0.15,        // 150ms firing animation
                interruptible: true,   // Can be interrupted by another fire or hit
                nextState: AnimationState.IDLE,
                clipName: 'fire',
                loop: false
            },
            [AnimationState.HIT]: {
                duration: 0.3,         // 300ms hit reaction
                interruptible: true,   // Can be interrupted by death
                nextState: AnimationState.IDLE,
                clipName: 'hit',
                loop: false
            },
            [AnimationState.DEAD]: {
                duration: 0,           // Infinite (stay dead)
                interruptible: false,  // Cannot be interrupted
                nextState: null,
                clipName: 'death',
                loop: false
            }
        };
    }

    /**
     * Attempt to transition to a new state
     * @param {string} newState - Target state from AnimationState
     * @returns {boolean} True if transition succeeded
     */
    transition(newState) {
        // Validate state
        if (!this.stateConfig[newState]) {
            console.warn(`[AnimationStateMachine] Unknown state: ${newState}`);
            return false;
        }

        const currentConfig = this.stateConfig[this.currentState];

        // Check if current state allows interruption
        if (!currentConfig.interruptible && this.currentState !== newState) {
            console.log(`[AnimationStateMachine] Cannot interrupt ${this.currentState}`);
            return false;
        }

        // Already in this state? For firing, allow re-trigger
        if (this.currentState === newState && newState !== AnimationState.FIRING) {
            return false;
        }

        const previousState = this.currentState;
        this.currentState = newState;
        this.stateStartTime = performance.now() / 1000; // Convert to seconds

        // Play animation if controller has the clip
        const config = this.stateConfig[newState];
        if (this.controller && this.controller.hasClip(config.clipName)) {
            this.controller.play(config.clipName, {
                loop: config.loop,
                reset: true,
                fadeIn: 0.1 // Quick crossfade
            });
        }

        // Notify listeners
        if (this.onStateChange) {
            this.onStateChange(newState, previousState);
        }

        console.log(`[AnimationStateMachine] ${previousState} -> ${newState}`);
        return true;
    }

    /**
     * Update the state machine (call each frame)
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        const config = this.stateConfig[this.currentState];

        // Check for timed transition
        if (config.duration > 0 && config.nextState) {
            const elapsed = (performance.now() / 1000) - this.stateStartTime;
            if (elapsed >= config.duration) {
                this.transition(config.nextState);
            }
        }
    }

    /**
     * Get the current state
     * @returns {string} Current state name
     */
    getState() {
        return this.currentState;
    }

    /**
     * Check if in a specific state
     * @param {string} state - State to check
     * @returns {boolean}
     */
    isInState(state) {
        return this.currentState === state;
    }

    /**
     * Check if the current state is interruptible
     * @returns {boolean}
     */
    canInterrupt() {
        return this.stateConfig[this.currentState].interruptible;
    }

    /**
     * Get time elapsed in current state
     * @returns {number} Time in seconds
     */
    getStateTime() {
        return (performance.now() / 1000) - this.stateStartTime;
    }

    /**
     * Get remaining time in current state (for timed states)
     * @returns {number} Remaining time in seconds, or Infinity for non-timed states
     */
    getRemainingTime() {
        const config = this.stateConfig[this.currentState];
        if (config.duration <= 0) return Infinity;
        return Math.max(0, config.duration - this.getStateTime());
    }

    /**
     * Reset to idle state
     */
    reset() {
        this.currentState = AnimationState.IDLE;
        this.stateStartTime = performance.now() / 1000;
        this.isLocked = false;

        if (this.controller && this.controller.hasClip('idle')) {
            this.controller.play('idle', { loop: true });
        }
    }

    /**
     * Convenience method: trigger firing state
     */
    fire() {
        return this.transition(AnimationState.FIRING);
    }

    /**
     * Convenience method: trigger hit state
     */
    hit() {
        return this.transition(AnimationState.HIT);
    }

    /**
     * Convenience method: trigger death state
     */
    die() {
        return this.transition(AnimationState.DEAD);
    }

    /**
     * Check if dead
     * @returns {boolean}
     */
    isDead() {
        return this.currentState === AnimationState.DEAD;
    }

    /**
     * Set state configuration (for customization)
     * @param {string} state - State name
     * @param {object} config - Configuration overrides
     */
    setStateConfig(state, config) {
        if (this.stateConfig[state]) {
            Object.assign(this.stateConfig[state], config);
        }
    }

    /**
     * Get debug info
     * @returns {object}
     */
    getDebugInfo() {
        return {
            state: this.currentState,
            stateTime: this.getStateTime().toFixed(3),
            remainingTime: this.getRemainingTime().toFixed(3),
            canInterrupt: this.canInterrupt()
        };
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AnimationState, AnimationStateMachine };
}
