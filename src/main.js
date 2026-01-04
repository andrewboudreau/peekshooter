// ============================================
// PEEK SHOOTER - MAIN ENTRY POINT
// Initializes the new architecture and bridges to legacy code
// ============================================

// Make all modules available globally for now
// (Until we migrate to proper ES modules)

console.log('[PeekShooter] Loading new architecture...');

// Track loaded modules
const LoadedModules = {
    configs: false,
    core: false,
    components: false,
    entities: false,
    systems: false,
};

// Verify all required modules are loaded
function verifyModules() {
    const required = [
        { name: 'DamageConfig', type: 'config' },
        { name: 'PhysicsConfig', type: 'config' },
        { name: 'EventBus', type: 'core' },
        { name: 'GameEvents', type: 'core' },
        { name: 'Entity', type: 'entity' },
        { name: 'Component', type: 'component' },
        { name: 'HealthComponent', type: 'component' },
        { name: 'TransformComponent', type: 'component' },
        { name: 'HitboxComponent', type: 'component' },
        { name: 'Player', type: 'entity' },
        { name: 'Opponent', type: 'entity' },
        { name: 'ShootingSystem', type: 'system' },
        { name: 'EffectsSystem', type: 'system' },
        { name: 'BotController', type: 'debug' },
    ];

    // Use eval to check global scope (const/let don't add to window)
    const missing = required.filter(r => {
        try {
            return eval('typeof ' + r.name) === 'undefined';
        } catch (e) {
            return true;
        }
    });

    if (missing.length > 0) {
        console.warn('[PeekShooter] Missing modules:', missing.map(m => m.name));
        return false;
    }

    console.log('[PeekShooter] All modules loaded successfully');
    return true;
}

// Initialize the new architecture
function initArchitecture() {
    if (!verifyModules()) {
        console.error('[PeekShooter] Failed to initialize - missing modules');
        return false;
    }

    // Enable event logging in debug mode
    EventBus.setLogging(true);

    // Set up global event listeners for debugging
    EventBus.on('*', ({ event, data }) => {
        if (typeof DebugConsole !== 'undefined' && DebugConsole.debug?.enabled) {
            // Don't log high-frequency events
            if (!event.includes('update') && !event.includes('tick')) {
                DebugConsole.log(`[Event] ${event}`, 'log');
            }
        }
    });

    console.log('[PeekShooter] Architecture initialized');
    return true;
}

// Create global player instance (will be used after full migration)
let localPlayer = null;

function createLocalPlayer() {
    localPlayer = new Player();
    console.log('[PeekShooter] Local player created:', localPlayer.id);
    return localPlayer;
}

// Bridge: Sync from legacy gameState to new Player entity
function syncPlayerFromLegacy() {
    if (!localPlayer || typeof gameState === 'undefined') return;
    localPlayer.syncFromLegacy(gameState);

    // Also sync health from netState
    if (typeof netState !== 'undefined' && localPlayer.health) {
        localPlayer.health.setHealth(netState.health);
    }
}

// Bridge: Sync from new Player entity to legacy gameState
function syncPlayerToLegacy() {
    if (!localPlayer || typeof gameState === 'undefined') return;
    localPlayer.syncToLegacy(gameState);

    // Also sync health to netState
    if (typeof netState !== 'undefined' && localPlayer.health) {
        netState.health = localPlayer.currentHealth;
    }
}

// Set up EventBus listeners that bridge to existing functions
function setupEventBridge() {
    // Audio events
    EventBus.on(GameEvents.WEAPON_FIRED, () => {
        if (typeof AudioSystem !== 'undefined') {
            AudioSystem.playGunshot();
        }
    });

    EventBus.on(GameEvents.HIT_OPPONENT, (data) => {
        if (typeof AudioSystem !== 'undefined') {
            AudioSystem.playImpactPlayer();
        }
    });

    EventBus.on(GameEvents.DAMAGE_RECEIVED, () => {
        if (typeof AudioSystem !== 'undefined') {
            AudioSystem.playDamage();
        }
    });

    // UI events
    EventBus.on(GameEvents.HEALTH_CHANGED, (data) => {
        if (data.entity?.type === 'player' && typeof updateHealthUI === 'function') {
            // Sync to netState for legacy UI
            if (typeof netState !== 'undefined') {
                netState.health = data.currentHealth;
            }
            updateHealthUI();
        }
    });

    EventBus.on(GameEvents.PLAYER_KILLED, (data) => {
        if (typeof showDeathScreen === 'function') {
            showDeathScreen();
        }
        if (typeof AudioSystem !== 'undefined') {
            AudioSystem.playDeath();
        }
    });

    EventBus.on(GameEvents.OPPONENT_KILLED, () => {
        if (typeof showKillNotification === 'function') {
            showKillNotification();
        }
    });

    // Effect events
    EventBus.on(GameEvents.EFFECT_BLOOD_SPLATTER, (data) => {
        if (typeof createBloodSplatter === 'function') {
            createBloodSplatter(data.position, data.direction);
        }
    });

    EventBus.on(GameEvents.EFFECT_BLOOD_DECAL, (data) => {
        if (typeof createBloodDecal === 'function') {
            createBloodDecal(data.position, data.normal);
        }
    });

    EventBus.on(GameEvents.EFFECT_HIT_MARK, (data) => {
        if (typeof createHitMark === 'function') {
            createHitMark(data.position, data.normal);
        }
    });

    console.log('[PeekShooter] Event bridge configured');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initArchitecture();
        setupEventBridge();
    });
} else {
    // DOM already loaded
    setTimeout(() => {
        initArchitecture();
        setupEventBridge();
    }, 0);
}

// Export for debugging
window.PeekShooter = {
    version: '2.0.0',
    modules: LoadedModules,
    verifyModules,
    initArchitecture,
    createLocalPlayer,
    syncPlayerFromLegacy,
    syncPlayerToLegacy,
    getPlayer: () => localPlayer,
    EventBus: typeof EventBus !== 'undefined' ? EventBus : null,
    GameEvents: typeof GameEvents !== 'undefined' ? GameEvents : null,
    ShootingSystem: typeof ShootingSystem !== 'undefined' ? ShootingSystem : null,
    AudioSystem: typeof AudioSystem !== 'undefined' ? AudioSystem : null,
    EffectsSystem: typeof EffectsSystem !== 'undefined' ? EffectsSystem : null,
    BotController: typeof BotController !== 'undefined' ? BotController : null,
};

console.log('[PeekShooter] Main module loaded. Access via window.PeekShooter');
