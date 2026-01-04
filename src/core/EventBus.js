// ============================================
// EVENT BUS
// Central event system for decoupling game systems
// ============================================

const EventBus = {
    listeners: new Map(),
    eventLog: [],
    logEnabled: false,
    maxLogSize: 1000,

    /**
     * Subscribe to an event
     * @param {string} event - Event name (e.g., 'player:hit', 'weapon:fired')
     * @param {function} callback - Function to call when event fires
     * @param {object} context - Optional 'this' context for callback
     * @returns {function} Unsubscribe function
     */
    on(event, callback, context = null) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }

        const listener = { callback, context };
        this.listeners.get(event).push(listener);

        // Return unsubscribe function
        return () => this.off(event, callback);
    },

    /**
     * Subscribe to an event for one-time execution
     * @param {string} event - Event name
     * @param {function} callback - Function to call once
     * @param {object} context - Optional 'this' context
     */
    once(event, callback, context = null) {
        const unsubscribe = this.on(event, (data) => {
            unsubscribe();
            callback.call(context, data);
        });
        return unsubscribe;
    },

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {function} callback - The callback to remove
     */
    off(event, callback) {
        if (!this.listeners.has(event)) return;

        const listeners = this.listeners.get(event);
        const index = listeners.findIndex(l => l.callback === callback);
        if (index !== -1) {
            listeners.splice(index, 1);
        }
    },

    /**
     * Emit an event to all listeners
     * @param {string} event - Event name
     * @param {object} data - Data to pass to listeners
     */
    emit(event, data = {}) {
        // Add timestamp to event data
        data._timestamp = Date.now();
        data._event = event;

        // Log if enabled
        if (this.logEnabled) {
            this.eventLog.push({ event, data: { ...data }, timestamp: data._timestamp });
            if (this.eventLog.length > this.maxLogSize) {
                this.eventLog.shift();
            }
        }

        // Call all listeners
        const listeners = this.listeners.get(event);
        if (listeners) {
            listeners.forEach(({ callback, context }) => {
                try {
                    callback.call(context, data);
                } catch (error) {
                    console.error(`EventBus: Error in listener for '${event}':`, error);
                }
            });
        }

        // Also emit to wildcard listeners
        const wildcardListeners = this.listeners.get('*');
        if (wildcardListeners) {
            wildcardListeners.forEach(({ callback, context }) => {
                try {
                    callback.call(context, { event, data });
                } catch (error) {
                    console.error(`EventBus: Error in wildcard listener:`, error);
                }
            });
        }
    },

    /**
     * Remove all listeners for an event (or all events)
     * @param {string} event - Event name, or null to clear all
     */
    clear(event = null) {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    },

    /**
     * Get count of listeners for an event
     * @param {string} event - Event name
     * @returns {number} Number of listeners
     */
    listenerCount(event) {
        return this.listeners.has(event) ? this.listeners.get(event).length : 0;
    },

    /**
     * Enable/disable event logging (for debugging/replay)
     * @param {boolean} enabled - Whether to log events
     */
    setLogging(enabled) {
        this.logEnabled = enabled;
        if (!enabled) {
            this.eventLog = [];
        }
    },

    /**
     * Get the event log
     * @returns {array} Array of logged events
     */
    getLog() {
        return [...this.eventLog];
    },

    /**
     * Clear the event log
     */
    clearLog() {
        this.eventLog = [];
    },
};

// ============================================
// EVENT NAME CONSTANTS
// Use these to avoid typos and enable autocomplete
// ============================================

const GameEvents = {
    // Weapon events
    WEAPON_FIRED: 'weapon:fired',
    WEAPON_RELOAD: 'weapon:reload',
    WEAPON_SWITCH: 'weapon:switch',

    // Hit events
    HIT_OPPONENT: 'hit:opponent',
    HIT_ENVIRONMENT: 'hit:environment',
    HIT_COVER: 'hit:cover',
    HIT_TARGET: 'hit:target',

    // Damage events
    DAMAGE_DEALT: 'damage:dealt',
    DAMAGE_RECEIVED: 'damage:received',

    // Health events
    HEALTH_CHANGED: 'health:changed',
    HEALTH_DEPLETED: 'health:depleted',

    // Kill events
    PLAYER_KILLED: 'player:killed',
    OPPONENT_KILLED: 'opponent:killed',

    // Game state events
    GAME_STATE_CHANGE: 'game:stateChange',
    GAME_START: 'game:start',
    GAME_END: 'game:end',
    ROUND_START: 'round:start',
    ROUND_END: 'round:end',

    // Player events
    PLAYER_SPAWN: 'player:spawn',
    PLAYER_STANCE_CHANGE: 'player:stanceChange',
    PLAYER_PEEK: 'player:peek',

    // Network events
    NET_CONNECTED: 'net:connected',
    NET_DISCONNECTED: 'net:disconnected',
    NET_MESSAGE: 'net:message',
    NET_STATE_UPDATE: 'net:stateUpdate',

    // UI events
    UI_SHOW_HITMARKER: 'ui:showHitmarker',
    UI_SHOW_DAMAGE: 'ui:showDamage',
    UI_UPDATE_HEALTH: 'ui:updateHealth',
    UI_UPDATE_SCORE: 'ui:updateScore',

    // Audio events
    AUDIO_PLAY: 'audio:play',

    // Effect events
    EFFECT_BLOOD_SPLATTER: 'effect:bloodSplatter',
    EFFECT_BLOOD_DECAL: 'effect:bloodDecal',
    EFFECT_HIT_MARK: 'effect:hitMark',
    EFFECT_MUZZLE_FLASH: 'effect:muzzleFlash',

    // Debug events
    DEBUG_LOG: 'debug:log',
    DEBUG_COMMAND: 'debug:command',
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EventBus, GameEvents };
}
