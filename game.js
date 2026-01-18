// Peek Shooter - Main Game Logic

// ============================================
// VERSION - Auto-incremented on deploy
// ============================================
const GAME_VERSION = 72;

// ============================================
// NOISE GENERATOR - Seeded deterministic noise
// ============================================
class NoiseGenerator {
    constructor(seed = 12345) {
        this.seed = seed;
        this.state = seed;
    }

    // Mulberry32 PRNG - fast, good distribution
    random() {
        let t = this.state += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    // Random in range [-1, 1]
    signed() {
        return this.random() * 2 - 1;
    }

    // Random in range [min, max]
    range(min, max) {
        return min + this.random() * (max - min);
    }

    // Reset to initial seed
    reset(newSeed = null) {
        if (newSeed !== null) this.seed = newSeed;
        this.state = this.seed;
    }

    // Get next n values as array (useful for patterns)
    sequence(n) {
        const values = [];
        for (let i = 0; i < n; i++) {
            values.push(this.signed());
        }
        return values;
    }
}

// AudioSystem moved to src/systems/AudioSystem.js
// ============================================
// DEV TEXTURE SYSTEM - Valve Source Engine style
// ============================================

// Cache textures so we don't recreate them
const textureCache = {
    devTexture: null,
    devBumpMap: null,
    devNormalMap: null,
};

// Create simple grey grid texture (cleaner look)
function createDevTexture(size = 512) {
    if (textureCache.devTexture) return textureCache.devTexture;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const cellCount = 4;
    const cellSize = size / cellCount;

    // Solid grey base
    ctx.fillStyle = '#606060';
    ctx.fillRect(0, 0, size, size);

    // Subtle cell variation (alternating slightly lighter/darker)
    for (let x = 0; x < cellCount; x++) {
        for (let y = 0; y < cellCount; y++) {
            ctx.fillStyle = (x + y) % 2 === 0 ? '#585858' : '#686868';
            ctx.fillRect(x * cellSize + 2, y * cellSize + 2, cellSize - 4, cellSize - 4);
        }
    }

    // Major grid lines (cell boundaries)
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 4;
    for (let i = 0; i <= cellCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, size);
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(size, i * cellSize);
        ctx.stroke();
    }

    // Minor grid lines (subtle)
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#505050';
    for (let i = 0; i <= cellCount * 2; i++) {
        const pos = i * cellSize / 2;
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, size);
        ctx.moveTo(0, pos);
        ctx.lineTo(size, pos);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.anisotropy = 4;

    textureCache.devTexture = texture;
    return texture;
}

// Create bump map for depth effect (simplified)
function createDevBumpMap(size = 512) {
    if (textureCache.devBumpMap) return textureCache.devBumpMap;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const cellCount = 4;
    const cellSize = size / cellCount;

    // Base height (light grey = higher)
    ctx.fillStyle = '#b0b0b0';
    ctx.fillRect(0, 0, size, size);

    // Grid grooves (darker = lower)
    ctx.strokeStyle = '#707070';
    ctx.lineWidth = 5;
    for (let i = 0; i <= cellCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, size);
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(size, i * cellSize);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    textureCache.devBumpMap = texture;
    return texture;
}

// Create normal map for groove edges
function createDevNormalMap(size = 512) {
    if (textureCache.devNormalMap) return textureCache.devNormalMap;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const cellCount = 4;
    const cellSize = size / cellCount;

    // Flat normal (pointing up in tangent space: RGB 128,128,255)
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, size, size);

    const grooveDepth = 35;

    // Vertical grid lines
    for (let i = 0; i <= cellCount; i++) {
        const x = i * cellSize;
        ctx.fillStyle = `rgb(${128 + grooveDepth}, 128, 255)`;
        ctx.fillRect(x - 2, 0, 2, size);
        ctx.fillStyle = `rgb(${128 - grooveDepth}, 128, 255)`;
        ctx.fillRect(x, 0, 2, size);
    }

    // Horizontal grid lines
    for (let i = 0; i <= cellCount; i++) {
        const y = i * cellSize;
        ctx.fillStyle = `rgb(128, ${128 - grooveDepth}, 255)`;
        ctx.fillRect(0, y - 2, size, 2);
        ctx.fillStyle = `rgb(128, ${128 + grooveDepth}, 255)`;
        ctx.fillRect(0, y, size, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    textureCache.devNormalMap = texture;
    return texture;
}

// Create material with dev texture
function createDevMaterial(repeatX = 1, repeatY = 1, color = 0xffffff) {
    const diffuse = createDevTexture();
    const bump = createDevBumpMap();
    const normal = createDevNormalMap();

    // Clone textures to set unique repeat values
    const diffuseClone = diffuse.clone();
    const bumpClone = bump.clone();
    const normalClone = normal.clone();

    diffuseClone.repeat.set(repeatX, repeatY);
    bumpClone.repeat.set(repeatX, repeatY);
    normalClone.repeat.set(repeatX, repeatY);

    diffuseClone.needsUpdate = true;
    bumpClone.needsUpdate = true;
    normalClone.needsUpdate = true;

    return new THREE.MeshStandardMaterial({
        map: diffuseClone,
        bumpMap: bumpClone,
        bumpScale: 0.03,
        normalMap: normalClone,
        normalScale: new THREE.Vector2(0.5, 0.5),
        roughness: 0.85,
        metalness: 0.05,
        color: color,
    });
}

// ============================================
// DEBUG CONSOLE - Quake/Source style tilde console
// ============================================

const DebugConsole = {
    isOpen: false,
    history: [],
    historyIndex: -1,
    commandHistory: [],

    // Debug state
    debug: {
        enabled: false,
        showHitboxes: false,
        showHealth: false,
        showHits: false,
        godMode: false,
        aimbot: false,
        noclip: false,
        noclipPos: { x: 0, y: 1.6, z: 0 },
        hitboxHelpers: [],
        healthLabels: [],
        fps: 0,
        frameCount: 0,
        lastFpsUpdate: 0,
        totalDamage: 0,
    },

    // Bot state
    bot: {
        enabled: false,
        phase: 'idle',      // idle, moving_left, peeking_left, moving_right, peeking_right
        phaseTime: 0,
        targetStrafe: 0,
        targetLean: 0,
        shotFired: false,
    },

    init() {
        const consoleEl = document.getElementById('debug-console');
        const inputEl = document.getElementById('console-input');
        const outputEl = document.getElementById('console-output');

        if (!consoleEl || !inputEl) return;

        // Tilde key toggle
        document.addEventListener('keydown', (e) => {
            if (e.key === '`' || e.key === '~') {
                e.preventDefault();
                this.toggle();
            }

            // Escape to close
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Input handling
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const cmd = inputEl.value.trim();
                if (cmd) {
                    this.execute(cmd);
                    this.commandHistory.push(cmd);
                    this.historyIndex = this.commandHistory.length;
                }
                inputEl.value = '';
            }

            // Command history navigation
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (this.historyIndex > 0) {
                    this.historyIndex--;
                    inputEl.value = this.commandHistory[this.historyIndex] || '';
                }
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (this.historyIndex < this.commandHistory.length - 1) {
                    this.historyIndex++;
                    inputEl.value = this.commandHistory[this.historyIndex] || '';
                } else {
                    this.historyIndex = this.commandHistory.length;
                    inputEl.value = '';
                }
            }
        });

        // Prevent game input while console is open
        inputEl.addEventListener('keydown', (e) => {
            e.stopPropagation();
        });

        // Intercept console.log, warn, error
        this.interceptConsole();

        this.log('Debug console initialized. Press ~ to toggle.', 'info');
    },

    interceptConsole() {
        const self = this;
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        console.log = function(...args) {
            originalLog.apply(console, args);
            self.log(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '), 'log');
        };

        console.warn = function(...args) {
            originalWarn.apply(console, args);
            self.log(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '), 'warn');
        };

        console.error = function(...args) {
            originalError.apply(console, args);
            self.log(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '), 'error');
        };
    },

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    },

    open() {
        const consoleEl = document.getElementById('debug-console');
        const inputEl = document.getElementById('console-input');
        if (consoleEl) {
            consoleEl.classList.add('open');
            this.isOpen = true;
            inputEl?.focus();

            // Exit pointer lock when console opens
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
        }
    },

    close() {
        const consoleEl = document.getElementById('debug-console');
        if (consoleEl) {
            consoleEl.classList.remove('open');
            this.isOpen = false;
        }
    },

    log(message, type = 'log') {
        const outputEl = document.getElementById('console-output');
        if (!outputEl) return;

        const line = document.createElement('div');
        line.className = type;
        line.textContent = message;
        outputEl.appendChild(line);

        // Keep history limited
        while (outputEl.children.length > 200) {
            outputEl.removeChild(outputEl.firstChild);
        }

        // Auto-scroll
        outputEl.scrollTop = outputEl.scrollHeight;
    },

    execute(cmd) {
        this.log('> ' + cmd, 'cmd');

        const parts = cmd.toLowerCase().split(/\s+/);
        const command = parts[0];
        const args = parts.slice(1);

        switch (command) {
            case 'help':
                this.log('Available commands:', 'info');
                this.log('  debug [on|off] - Toggle debug mode (hitboxes + health)', 'info');
                this.log('  hitboxes [on|off] - Show/hide hitboxes', 'info');
                this.log('  health [on|off] - Show/hide all player health', 'info');
                this.log('  hits [on|off] - Log bullet hit positions to console', 'info');
                this.log('  god [on|off] - Toggle god mode (invincible)', 'info');
                this.log('  aimbot [on|off] - Toggle aimbot (auto-aim at opponent)', 'info');
                this.log('  rig - Summon/remove static target rig (no AI)', 'info');
                this.log('  bot [on|off] - Toggle bot opponent (walks, peeks, shoots)', 'info');
                this.log('  kill - Kill yourself', 'info');
                this.log('  heal - Restore health to 100', 'info');
                this.log('  firerate <ms> - Set fire rate (1-1000ms)', 'info');
                this.log('  firemode [single|burst|auto] - Set fire mode', 'info');
                this.log('  screenshot - Capture screenshot with timestamp', 'info');
                this.log('  clear - Clear console', 'info');
                this.log('  status - Show game state', 'info');
                this.log('  animstate - Show current animation state', 'info');
                this.log('  animfire - Trigger firing animation state', 'info');
                this.log('  animhit - Trigger hit animation state', 'info');
                this.log('  aimik [on|off] - Toggle aim IK for opponent', 'info');
                break;

            case 'debug':
                const debugState = args[0] === 'off' ? false : args[0] === 'on' ? true : !this.debug.enabled;
                this.debug.enabled = debugState;
                if (debugState) {
                    this.debug.showHitboxes = true;
                    this.debug.showHealth = true;
                    this.updateHitboxes();
                    this.log('Debug mode ON - hitboxes and health enabled', 'success');
                } else {
                    this.debug.showHitboxes = false;
                    this.debug.showHealth = false;
                    this.clearHitboxHelpers();
                    this.clearHealthLabels();
                    this.log('Debug mode OFF', 'warn');
                }
                break;

            case 'hitboxes':
                const hitboxState = args[0] === 'off' ? false : args[0] === 'on' ? true : !this.debug.showHitboxes;
                this.debug.showHitboxes = hitboxState;
                if (hitboxState) {
                    this.updateHitboxes();
                    this.log('Hitboxes ON', 'success');
                } else {
                    this.clearHitboxHelpers();
                    this.log('Hitboxes OFF', 'warn');
                }
                break;

            case 'health':
                const healthState = args[0] === 'off' ? false : args[0] === 'on' ? true : !this.debug.showHealth;
                this.debug.showHealth = healthState;
                this.log(healthState ? 'Health display ON' : 'Health display OFF', healthState ? 'success' : 'warn');
                break;

            case 'hits':
                const hitsState = args[0] === 'off' ? false : args[0] === 'on' ? true : !this.debug.showHits;
                this.debug.showHits = hitsState;
                this.log(hitsState ? 'Hit logging ON - bullet impacts will be logged' : 'Hit logging OFF', hitsState ? 'success' : 'warn');
                break;

            case 'god':
                const godState = args[0] === 'off' ? false : args[0] === 'on' ? true : !this.debug.godMode;
                this.debug.godMode = godState;
                this.log(godState ? 'God mode ON - You are invincible' : 'God mode OFF', godState ? 'success' : 'warn');
                break;

            case 'aimbot':
                const aimbotState = args[0] === 'off' ? false : args[0] === 'on' ? true : !this.debug.aimbot;
                this.debug.aimbot = aimbotState;
                this.log(aimbotState ? 'Aimbot ON - Auto-aims at opponent head' : 'Aimbot OFF', aimbotState ? 'success' : 'warn');
                break;

            case 'noclip':
                const noclipState = args[0] === 'off' ? false : args[0] === 'on' ? true : !this.debug.noclip;
                this.debug.noclip = noclipState;
                if (noclipState) {
                    // Initialize noclip position from current camera
                    this.debug.noclipPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
                }
                this.log(noclipState ? 'Noclip ON - WASD to fly, Space/Shift for up/down' : 'Noclip OFF', noclipState ? 'success' : 'warn');
                break;

            case 'rig':
                // Summon a static target rig with no AI
                if (!netState.opponent) {
                    netState.gameMode = 'online';
                    netState.status = 'playing';
                    netState.playerSlot = 0;
                    netState.opponent = new OpponentPlayer(1);
                    createOpponentMesh(netState.opponent);
                    netState.health = 100;
                    netState.scores = [0, 0];
                    updateHealthUI();
                    updateScoreUI();
                    hideTargets();
                    gameState.isRunning = true;
                    document.getElementById('start-screen').style.display = 'none';
                    document.getElementById('menu-button').style.display = 'block';
                    this.log('Rig summoned - static target with no AI', 'success');
                } else {
                    // Remove existing opponent
                    if (netState.opponent.mesh) {
                        scene.remove(netState.opponent.mesh);
                    }
                    netState.opponent = null;
                    this.bot.enabled = false;
                    this.log('Rig removed', 'warn');
                }
                break;

            case 'bot':
                const botState = args[0] === 'off' ? false : args[0] === 'on' ? true : !this.bot.enabled;
                if (botState) {
                    // Create opponent if needed
                    if (!netState.opponent) {
                        netState.gameMode = 'online'; // Fake online mode
                        netState.status = 'playing';
                        netState.playerSlot = 0;
                        netState.opponent = new OpponentPlayer(1);
                        createOpponentMesh(netState.opponent);
                        netState.health = 100;
                        netState.scores = [0, 0];
                        updateHealthUI();
                        updateScoreUI();
                        hideTargets();
                        gameState.isRunning = true;
                        document.getElementById('start-screen').style.display = 'none';
                        document.getElementById('menu-button').style.display = 'block';
                    }
                    this.bot.enabled = true;
                    this.bot.phase = 'moving_left';
                    this.bot.phaseTime = 0;
                    this.log('Bot opponent enabled - walks, peeks, and shoots', 'success');
                } else {
                    this.bot.enabled = false;
                    this.bot.phase = 'idle';
                    // Reset opponent to center
                    if (netState.opponent) {
                        netState.opponent.targetState.strafe = 0;
                        netState.opponent.targetState.lean = 0;
                    }
                    this.log('Bot opponent disabled', 'warn');
                }
                break;

            case 'kill':
                if (this.debug.godMode) {
                    this.log('Cannot kill yourself with god mode enabled', 'warn');
                    break;
                }
                if (netState.gameMode === 'online') {
                    // Deal 100 damage through normal damage flow
                    handlePeerMessage({ type: 'hit', damage: 100, bodyPart: 'suicide' });
                    this.log('You killed yourself', 'error');
                } else {
                    this.log('Kill only works in multiplayer', 'warn');
                }
                break;

            case 'heal':
                netState.health = 100;
                updateHealthUI();
                this.log('Health restored to 100', 'success');
                break;

            case 'clear':
                const outputEl = document.getElementById('console-output');
                if (outputEl) outputEl.innerHTML = '';
                break;

            case 'status':
                this.log('=== Game Status ===', 'info');
                this.log(`  Mode: ${netState.gameMode}`, 'log');
                this.log(`  Status: ${netState.status}`, 'log');
                this.log(`  Health: ${netState.health}`, 'log');
                this.log(`  Score: ${netState.scores.join(' - ')}`, 'log');
                this.log(`  Player Slot: ${netState.playerSlot}`, 'log');
                if (netState.opponent) {
                    this.log(`  Opponent Health: ${netState.opponent.state.health}`, 'log');
                    this.log(`  Opponent Peeking: ${netState.opponent.state.peeking}`, 'log');
                }
                break;

            case 'firerate':
                const rate = parseInt(args[0]);
                if (isNaN(rate) || rate < 1 || rate > 1000) {
                    this.log('Usage: firerate <1-1000> (milliseconds between shots)', 'warn');
                    this.log(`Current fire rate: ${gameState.fireRateMs}ms`, 'info');
                } else {
                    gameState.fireRateMs = rate;
                    updateFireModeUI();
                    this.log(`Fire rate set to ${rate}ms`, 'success');
                }
                break;

            case 'firemode':
                const mode = args[0]?.toLowerCase();
                if (mode === 'single' || mode === 'burst' || mode === 'auto') {
                    gameState.fireMode = mode;
                    updateFireModeUI();
                    stopFiring();
                    this.log(`Fire mode set to ${mode.toUpperCase()}`, 'success');
                } else {
                    this.log('Usage: firemode [single|burst|auto]', 'warn');
                    this.log(`Current mode: ${gameState.fireMode}`, 'info');
                }
                break;

            case 'screenshot':
                try {
                    // Generate timestamp-based filename
                    const now = new Date();
                    const timestamp = now.getFullYear().toString() +
                        (now.getMonth() + 1).toString().padStart(2, '0') +
                        now.getDate().toString().padStart(2, '0') + '_' +
                        now.getHours().toString().padStart(2, '0') +
                        now.getMinutes().toString().padStart(2, '0') +
                        now.getSeconds().toString().padStart(2, '0') + '_' +
                        now.getMilliseconds().toString().padStart(3, '0');
                    const filename = `peekshooter_${timestamp}.png`;

                    // Capture the canvas
                    const canvas = renderer.domElement;
                    const dataUrl = canvas.toDataURL('image/png');

                    // Create download link
                    const link = document.createElement('a');
                    link.download = filename;
                    link.href = dataUrl;
                    link.click();

                    this.log(`Screenshot saved: ${filename}`, 'success');
                } catch (e) {
                    this.log(`Screenshot failed: ${e.message}`, 'error');
                }
                break;

            case 'animstate':
                if (!netState.opponent) {
                    this.log('No opponent to show animation state', 'warn');
                    break;
                }
                const sm = netState.opponent.stateMachine;
                if (sm) {
                    const info = sm.getDebugInfo();
                    this.log('=== Animation State ===', 'info');
                    this.log(`  State: ${info.state}`, 'log');
                    this.log(`  State Time: ${info.stateTime}s`, 'log');
                    this.log(`  Remaining: ${info.remainingTime}s`, 'log');
                    this.log(`  Can Interrupt: ${info.canInterrupt}`, 'log');
                } else {
                    this.log('Opponent has no state machine', 'warn');
                }
                // Also show aim IK state
                const aimIK = netState.opponent.animController?.aimIK;
                if (aimIK) {
                    const aimInfo = aimIK.getDebugInfo();
                    this.log('=== Aim IK ===', 'info');
                    this.log(`  Enabled: ${aimInfo.enabled}`, 'log');
                    this.log(`  Current Yaw: ${aimInfo.currentYaw}`, 'log');
                    this.log(`  Current Pitch: ${aimInfo.currentPitch}`, 'log');
                }
                break;

            case 'animfire':
                if (!netState.opponent || !netState.opponent.stateMachine) {
                    this.log('No opponent or state machine', 'warn');
                    break;
                }
                if (netState.opponent.stateMachine.fire()) {
                    this.log('Triggered FIRING state', 'success');
                } else {
                    this.log('Could not trigger FIRING state', 'warn');
                }
                break;

            case 'animhit':
                if (!netState.opponent || !netState.opponent.stateMachine) {
                    this.log('No opponent or state machine', 'warn');
                    break;
                }
                if (netState.opponent.stateMachine.hit()) {
                    this.log('Triggered HIT state', 'success');
                } else {
                    this.log('Could not trigger HIT state', 'warn');
                }
                break;

            case 'aimik':
                if (!netState.opponent || !netState.opponent.animController) {
                    this.log('No opponent or animation controller', 'warn');
                    break;
                }
                const aimIKInstance = netState.opponent.animController.aimIK;
                if (!aimIKInstance) {
                    this.log('Aim IK not initialized', 'warn');
                    break;
                }
                const aimState = args[0] === 'off' ? false : args[0] === 'on' ? true : !aimIKInstance.enabled;
                aimIKInstance.setEnabled(aimState);
                this.log(aimState ? 'Aim IK enabled' : 'Aim IK disabled', aimState ? 'success' : 'warn');
                break;

            default:
                this.log(`Unknown command: ${command}. Type 'help' for commands.`, 'error');
        }
    },

    updateHitboxes() {
        this.clearHitboxHelpers();

        if (!this.debug.showHitboxes) return;

        // Show opponent hitboxes
        if (netState.opponent && netState.opponent.mesh) {
            netState.opponent.mesh.traverse((child) => {
                if (child.isMesh && child.userData.bodyPart) {
                    try {
                        // Ensure geometry has computed bounds
                        if (child.geometry) {
                            child.geometry.computeBoundingSphere();
                            child.geometry.computeBoundingBox();
                        }
                        const box = new THREE.BoxHelper(child, this.getHitboxColor(child.userData.bodyPart));
                        scene.add(box);
                        this.debug.hitboxHelpers.push(box);
                    } catch (e) {
                        console.warn('[Debug] Could not create hitbox for', child.userData.bodyPart);
                    }
                }
            });
        }
    },

    getHitboxColor(bodyPart) {
        switch (bodyPart) {
            case 'head': return 0xff0000;  // Red
            case 'chest': return 0xff8800; // Orange
            case 'belly': return 0xffff00; // Yellow
            case 'arm': return 0x00ff00;   // Green
            default: return 0xffffff;
        }
    },

    clearHitboxHelpers() {
        this.debug.hitboxHelpers.forEach(helper => {
            scene.remove(helper);
            helper.dispose();
        });
        this.debug.hitboxHelpers = [];
    },

    clearHealthLabels() {
        this.debug.healthLabels.forEach(label => {
            if (label.element && label.element.parentNode) {
                label.element.parentNode.removeChild(label.element);
            }
        });
        this.debug.healthLabels = [];
    },

    // Called every frame from game loop
    update() {
        // Update FPS counter
        this.debug.frameCount++;
        const now = performance.now();
        if (now - this.debug.lastFpsUpdate >= 1000) {
            this.debug.fps = this.debug.frameCount;
            this.debug.frameCount = 0;
            this.debug.lastFpsUpdate = now;
        }

        // Update hitbox positions
        if (this.debug.showHitboxes) {
            this.debug.hitboxHelpers.forEach(helper => {
                try {
                    helper.update();
                } catch (e) {
                    // Silently ignore geometry errors
                }
            });
        }

        // Update health labels
        if (this.debug.showHealth && netState.opponent && netState.opponent.mesh) {
            this.updateHealthLabel(netState.opponent);
        }

        // Update bot AI
        if (this.bot.enabled) {
            this.updateBot();
        }

        // Update debug stats display
        const debugStats = document.getElementById('debug-stats');
        if (debugStats) {
            if (this.debug.enabled) {
                debugStats.style.display = 'block';
                const fpsEl = document.getElementById('debug-fps');
                const hitmarksEl = document.getElementById('debug-hitmarks');
                const bloodEl = document.getElementById('debug-blood');
                const aimbotEl = document.getElementById('debug-aimbot');
                const godmodeEl = document.getElementById('debug-godmode');
                const damageEl = document.getElementById('debug-damage');
                if (fpsEl) fpsEl.textContent = this.debug.fps;
                if (hitmarksEl) hitmarksEl.textContent = activeEffects.hitMarks.length;
                if (bloodEl) bloodEl.textContent = activeEffects.bloodParticles.length;
                if (aimbotEl) aimbotEl.textContent = this.debug.aimbot ? 'ON' : 'OFF';
                if (godmodeEl) godmodeEl.textContent = this.debug.godMode ? 'ON' : 'OFF';
                if (damageEl) damageEl.textContent = this.debug.totalDamage;
            } else {
                debugStats.style.display = 'none';
            }
        }
    },

    // Bot AI update
    updateBot() {
        if (!netState.opponent) return;

        const deltaTime = 1 / 60; // Approximate frame time
        this.bot.phaseTime += deltaTime;

        const opponent = netState.opponent;

        // Phase timing
        const moveTime = 1.5;    // Time to move to each side
        const peekTime = 0.8;    // Time to peek before shooting
        const holdTime = 0.3;    // Time to hold after shooting
        const unpekTime = 0.4;   // Time to unpeek

        switch (this.bot.phase) {
            case 'moving_left':
                opponent.targetState.strafe = -0.8; // Move left
                opponent.targetState.lean = 0;
                if (this.bot.phaseTime > moveTime) {
                    this.bot.phase = 'peeking_right';
                    this.bot.phaseTime = 0;
                    this.bot.shotFired = false;
                }
                break;

            case 'peeking_right':
                opponent.targetState.strafe = -0.8;
                opponent.targetState.lean = 0.8; // Lean right to peek
                if (this.bot.phaseTime > peekTime && !this.bot.shotFired) {
                    // Fire!
                    this.botShoot();
                    this.bot.shotFired = true;
                }
                if (this.bot.phaseTime > peekTime + holdTime) {
                    this.bot.phase = 'unpeeking_right';
                    this.bot.phaseTime = 0;
                }
                break;

            case 'unpeeking_right':
                opponent.targetState.lean = 0;
                if (this.bot.phaseTime > unpekTime) {
                    this.bot.phase = 'moving_right';
                    this.bot.phaseTime = 0;
                }
                break;

            case 'moving_right':
                opponent.targetState.strafe = 0.8; // Move right
                opponent.targetState.lean = 0;
                if (this.bot.phaseTime > moveTime) {
                    this.bot.phase = 'peeking_left';
                    this.bot.phaseTime = 0;
                    this.bot.shotFired = false;
                }
                break;

            case 'peeking_left':
                opponent.targetState.strafe = 0.8;
                opponent.targetState.lean = -0.8; // Lean left to peek
                if (this.bot.phaseTime > peekTime && !this.bot.shotFired) {
                    // Fire!
                    this.botShoot();
                    this.bot.shotFired = true;
                }
                if (this.bot.phaseTime > peekTime + holdTime) {
                    this.bot.phase = 'unpeeking_left';
                    this.bot.phaseTime = 0;
                }
                break;

            case 'unpeeking_left':
                opponent.targetState.lean = 0;
                if (this.bot.phaseTime > unpekTime) {
                    this.bot.phase = 'moving_left';
                    this.bot.phaseTime = 0;
                }
                break;
        }
    },

    // Bot shoots at player
    botShoot() {
        if (!netState.opponent) return;

        // Handle opponent shooting effects (sound, tracer)
        handleOpponentShot(netState.opponent);

        // Calculate if bot hits player (simple accuracy check)
        // Bot aims at center, so it hits if player is not behind cover
        const accuracy = 0.6; // 60% base accuracy
        const playerPeeking = Math.abs(gameState.lean) > 0.3 || Math.abs(gameState.strafe) > 0.3;

        if (Math.random() < accuracy && playerPeeking) {
            // Hit! Apply damage based on random body part
            const parts = ['head', 'chest', 'chest', 'belly', 'belly', 'arm', 'arm'];
            const hitPart = parts[Math.floor(Math.random() * parts.length)];
            const damage = { head: 25, chest: 15, belly: 10, arm: 5 }[hitPart];

            // Check god mode
            if (!this.debug.godMode && netState.health > 0) {
                netState.health = Math.max(0, netState.health - damage);
                showDamageEffect();
                updateHealthUI();
                this.log(`Bot hit you in the ${hitPart} for ${damage} damage`, 'warn');

                if (netState.health <= 0) {
                    netState.scores[1]++; // Bot scores
                    updateScoreUI();
                    showDeathScreen();

                    // Reset after delay
                    setTimeout(() => {
                        resetRound();
                    }, 3000);
                }
            }
        }
    },

    updateHealthLabel(opponent) {
        // Create or update floating health label
        let label = this.debug.healthLabels.find(l => l.target === opponent);

        if (!label) {
            const element = document.createElement('div');
            element.style.cssText = `
                position: absolute;
                color: #ff4444;
                font-family: monospace;
                font-size: 14px;
                font-weight: bold;
                text-shadow: 1px 1px 2px black;
                pointer-events: none;
                z-index: 500;
            `;
            document.getElementById('game-container').appendChild(element);
            label = { target: opponent, element };
            this.debug.healthLabels.push(label);
        }

        // Project 3D position to screen
        const pos = opponent.mesh.position.clone();
        pos.y += 2; // Above head

        const vector = pos.project(camera);
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

        // Check if in front of camera
        if (vector.z < 1) {
            label.element.style.display = 'block';
            label.element.style.left = x + 'px';
            label.element.style.top = y + 'px';
            label.element.textContent = `HP: ${opponent.state.health}`;

            // Color based on health
            const hp = opponent.state.health;
            if (hp > 50) label.element.style.color = '#44ff44';
            else if (hp > 25) label.element.style.color = '#ffff44';
            else label.element.style.color = '#ff4444';
        } else {
            label.element.style.display = 'none';
        }
    }
};

// ============================================
// WEAPON PROFILE ACCESSOR
// Now uses WeaponConfig for centralized weapon data
// ============================================
function getWeaponProfile(weaponId) {
    if (typeof WeaponConfig !== 'undefined') {
        const config = WeaponConfig.getWeapon(weaponId);
        return {
            name: config.name,
            recoil: config.recoil,
            fireRate: config.fireRate,
        };
    }
    // Fallback for legacy compatibility
    return {
        name: 'Assault Rifle',
        recoil: {
            verticalBase: 0.025,
            verticalVariance: 0.008,
            horizontalBase: 0,
            horizontalVariance: 0.015,
            recovery: 4.0,
            pattern: [1.0, 1.1, 1.2, 1.15, 1.1, 1.0, 0.95, 0.9],
            weaponKickBack: 0.03,
            weaponKickUp: 0.02,
        },
        fireRate: 600,
    };
}

// ============================================
// RECOIL STATE
// ============================================
const recoilState = {
    // Accumulated recoil offset (applied to camera)
    pitchOffset: 0,
    yawOffset: 0,

    // Visual weapon recoil
    weaponKickBack: 0,
    weaponKickUp: 0,
    weaponKickSide: 0,

    // Shot counter for pattern
    shotCount: 0,
    lastShotTime: 0,

    // Drift tracking - builds during rapid fire
    driftDirection: 0,    // -1 to 1, which way horizontal recoil is trending
    driftMomentum: 0,     // How strong the current drift is

    // Noise generator for this session
    noise: new NoiseGenerator(Date.now()),
};

// ============================================
// MULTIPLAYER STATE (WebRTC P2P)
// ============================================
const netState = {
    peer: null,           // PeerJS instance
    connection: null,     // DataConnection to opponent
    roomCode: null,       // Our room code (4 chars)
    isHost: false,        // Did we create the room?
    connected: false,
    playerId: null,
    playerSlot: -1,       // 0 = host, 1 = joiner
    opponent: null,
    gameMode: 'offline',  // 'offline' or 'online'
    status: 'disconnected', // disconnected, connecting, waiting, playing
    scores: [0, 0],
    health: 100,
    tournamentMode: false,  // First to 5 kills wins
    tournamentKillsToWin: 5,
};

// Generate a random 4-character room code
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Opponent player representation
class OpponentPlayer {
    constructor(slot) {
        this.slot = slot;
        this.mesh = null;
        this.weaponMesh = null;
        this.currentWeapon = 'assault_rifle';
        this.state = {
            crouch: 0,
            lean: 0,
            strafe: 0,
            lookYaw: 0,
            lookPitch: 0,
            weaponHand: 'right',
            weapon: 'assault_rifle',
            health: 100,
        };
        // Interpolation targets
        this.targetState = { ...this.state };
        this.lastUpdate = Date.now();
    }

    // Interpolate toward target state for smooth movement
    update(deltaTime) {
        const lerpSpeed = 15; // How fast to interpolate
        const t = Math.min(1, lerpSpeed * deltaTime);

        this.state.crouch += (this.targetState.crouch - this.state.crouch) * t;
        this.state.lean += (this.targetState.lean - this.state.lean) * t;
        this.state.strafe += (this.targetState.strafe - this.state.strafe) * t;
        this.state.lookYaw += (this.targetState.lookYaw - this.state.lookYaw) * t;
        this.state.lookPitch += (this.targetState.lookPitch - this.state.lookPitch) * t;
    }

    updateFromNetwork(newState) {
        // Check for weapon change before updating state
        if (newState.weapon && newState.weapon !== this.currentWeapon) {
            this.updateWeapon(newState.weapon);
        }

        this.targetState = { ...this.targetState, ...newState };
        this.lastUpdate = Date.now();
    }

    updateWeapon(weaponId) {
        if (this.currentWeapon === weaponId) return;

        this.currentWeapon = weaponId;
        this.state.weapon = weaponId;

        // Update weapon mesh if we have one
        if (this.weaponMesh && this.mesh) {
            // Remove old weapon
            this.mesh.remove(this.weaponMesh);
            if (this.weaponMesh.geometry) this.weaponMesh.geometry.dispose();

            // Create new weapon using WeaponFactory if available
            if (typeof WeaponFactory !== 'undefined') {
                this.weaponMesh = WeaponFactory.createOpponentWeapon(weaponId);
                const handOffset = this.state.weaponHand === 'right' ? -0.3 : 0.3;
                this.weaponMesh.position.set(handOffset, 0.9, -0.2);
                this.mesh.add(this.weaponMesh);
            }
        }
    }
}

// ============================================
// P2P NETWORKING FUNCTIONS
// ============================================

// Show/hide menu sections
function showOnlineMenu() {
    document.getElementById('main-buttons').style.display = 'none';
    document.getElementById('room-section').classList.add('show');
    initializePeer();
}

function showMainMenu() {
    document.getElementById('main-buttons').style.display = 'flex';
    document.getElementById('room-section').classList.remove('show');
    document.getElementById('connection-status').textContent = '';

    // Cleanup peer connection
    if (netState.connection) {
        netState.connection.close();
        netState.connection = null;
    }
    if (netState.peer) {
        netState.peer.destroy();
        netState.peer = null;
    }
    netState.status = 'disconnected';
    updateNetworkUI();
}

function togglePauseMenu() {
    const pauseMenu = document.getElementById('pause-menu');
    const isOpen = pauseMenu.classList.contains('show');

    if (isOpen) {
        // Resume game
        pauseMenu.classList.remove('show');
        gameState.isRunning = true;
    } else {
        // Pause game
        pauseMenu.classList.add('show');
        gameState.isRunning = false;
        // Unlock pointer when pausing
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }
}

function backToMainMenu() {
    // Close pause menu
    document.getElementById('pause-menu').classList.remove('show');

    // Stop the game
    gameState.isRunning = false;

    // Show start screen
    document.getElementById('start-screen').style.display = 'flex';

    // Hide menu button (shown again when game starts)
    document.getElementById('menu-button').style.display = 'none';

    // Reset to main menu view
    showMainMenu();

    // Reset game state
    netState.health = 100;
    netState.scores = [0, 0];
    updateHealthUI();
    updateScoreUI();

    // Unlock pointer
    if (document.pointerLockElement) {
        document.exitPointerLock();
    }
}

function updateConnectionStatus(text) {
    const statusEl = document.getElementById('connection-status');
    if (statusEl) statusEl.textContent = text;
}

// Initialize PeerJS and create room
function initializePeer() {
    if (netState.peer) return;

    netState.roomCode = generateRoomCode();
    const peerId = 'peekshooter-' + netState.roomCode;

    updateConnectionStatus('Connecting to network...');

    netState.peer = new Peer(peerId, {
        debug: 1,
    });

    netState.peer.on('open', (id) => {
        console.log('Peer connected with ID:', id);
        netState.playerId = id;
        netState.isHost = true;
        netState.playerSlot = 0;
        netState.status = 'waiting';

        // Display room code
        document.getElementById('room-code').textContent = netState.roomCode;
        updateConnectionStatus('Waiting for opponent to join...');
        updateNetworkUI();
    });

    netState.peer.on('connection', (conn) => {
        console.log('Incoming connection from:', conn.peer);
        handleConnection(conn);
    });

    netState.peer.on('error', (err) => {
        console.error('Peer error:', err);
        if (err.type === 'unavailable-id') {
            // Room code already taken, generate new one
            netState.peer.destroy();
            netState.peer = null;
            netState.roomCode = generateRoomCode();
            setTimeout(initializePeer, 100);
        } else {
            updateConnectionStatus('Connection error: ' + err.type);
        }
    });

    netState.peer.on('disconnected', () => {
        console.log('Peer disconnected from signaling server');
        // Try to reconnect
        if (netState.peer && !netState.peer.destroyed) {
            netState.peer.reconnect();
        }
    });
}

// Join an existing room
function joinRoom() {
    const codeInput = document.getElementById('join-code');
    const code = codeInput.value.toUpperCase().trim();

    if (code.length !== 4) {
        updateConnectionStatus('Please enter a 4-character code');
        return;
    }

    updateConnectionStatus('Connecting to ' + code + '...');

    // Create our own peer if needed
    if (!netState.peer) {
        const myCode = generateRoomCode();
        netState.peer = new Peer('peekshooter-' + myCode, { debug: 1 });

        netState.peer.on('open', () => {
            connectToPeer(code);
        });

        netState.peer.on('error', (err) => {
            console.error('Peer error:', err);
            updateConnectionStatus('Connection failed: ' + err.type);
        });
    } else {
        connectToPeer(code);
    }
}

function connectToPeer(code) {
    const peerId = 'peekshooter-' + code;

    netState.isHost = false;
    netState.playerSlot = 1;

    const conn = netState.peer.connect(peerId, {
        reliable: true,
    });

    conn.on('open', () => {
        console.log('Connected to host:', peerId);
        handleConnection(conn);
    });

    conn.on('error', (err) => {
        console.error('Connection error:', err);
        updateConnectionStatus('Failed to connect. Check the code.');
    });
}

// Handle established connection
function handleConnection(conn) {
    netState.connection = conn;
    netState.connected = true;
    netState.status = 'playing';
    netState.gameMode = 'online';

    updateConnectionStatus('Connected! Starting game...');

    // Start the game
    setTimeout(() => {
        startOnlineGame();

        // Host syncs tournament mode to joiner
        if (netState.isHost) {
            sendPeerMessage({
                type: 'tournament_mode',
                enabled: netState.tournamentMode,
                killsToWin: netState.tournamentKillsToWin
            });
        }
    }, 500);

    // Setup message handling
    conn.on('data', (data) => {
        handlePeerMessage(data);
    });

    conn.on('close', () => {
        console.log('Connection closed');
        handleOpponentDisconnect();
    });

    conn.on('error', (err) => {
        console.error('Connection error:', err);
        handleOpponentDisconnect();
    });
}

// Handle incoming P2P messages
function handlePeerMessage(data) {
    switch (data.type) {
        case 'state':
            if (netState.opponent) {
                netState.opponent.updateFromNetwork(data.state);
            }
            break;

        case 'shoot':
            if (netState.opponent) {
                handleOpponentShot(netState.opponent, {
                    hitPlayer: data.hitPlayer,
                    hitCover: data.hitCover,
                    hitX: data.hitX,
                    hitY: data.hitY,
                    hitZ: data.hitZ,
                });
            }
            break;

        case 'hit':
            // Ignore hits if already dead
            if (netState.health <= 0) break;

            // God mode - ignore damage
            if (DebugConsole.debug.godMode) {
                DebugConsole.log(`Blocked ${data.damage} damage (god mode)`, 'warn');
                break;
            }

            // Opponent says they hit us
            const previousHealth = netState.health;
            netState.health = Math.max(0, netState.health - data.damage);

            // Emit damage received event
            if (typeof EventBus !== 'undefined') {
                EventBus.emit(GameEvents.DAMAGE_RECEIVED, {
                    amount: data.damage,
                    bodyPart: data.bodyPart,
                    previousHealth,
                    currentHealth: netState.health,
                    source: netState.opponent,
                });

                EventBus.emit(GameEvents.HEALTH_CHANGED, {
                    previousHealth,
                    currentHealth: netState.health,
                    maxHealth: 100,
                    delta: -data.damage,
                });
            }

            showDamageEffect();
            updateHealthUI();

            // Check if we died
            if (netState.health <= 0) {
                netState.scores[netState.playerSlot === 0 ? 1 : 0]++;
                updateScoreUI();
                showDeathScreen();

                // Emit death event
                if (typeof EventBus !== 'undefined') {
                    EventBus.emit(GameEvents.PLAYER_KILLED, {
                        killer: netState.opponent,
                        bodyPart: data.bodyPart,
                    });
                }

                // Tell opponent we died
                sendPeerMessage({ type: 'killed' });

                // Check tournament win condition
                if (checkTournamentWin()) {
                    break; // Tournament ended, don't reset
                }

                // Reset after delay
                setTimeout(() => {
                    resetRound();
                }, 3000);
            }
            break;

        case 'killed':
            // We killed the opponent
            netState.scores[netState.playerSlot]++;
            updateScoreUI();
            showKillNotification();

            // Emit kill event
            if (typeof EventBus !== 'undefined') {
                EventBus.emit(GameEvents.OPPONENT_KILLED, {
                    victim: netState.opponent,
                });
            }

            // Check tournament win condition
            checkTournamentWin();
            break;

        case 'tournament_end':
            // Opponent's game ended the tournament
            handleTournamentEnd(data.won);
            break;

        case 'rematch_request':
            // Opponent wants a rematch
            handleRematchRequest();
            break;

        case 'rematch_start':
            // Opponent confirmed rematch, sync our state
            const rematchOverlay = document.getElementById('tournament-end-overlay');
            if (rematchOverlay) rematchOverlay.remove();
            netState.scores = [0, 0];
            netState.health = 100;
            if (netState.opponent) {
                netState.opponent.state.health = 100;
            }
            netState.rematchRequested = false;
            netState.opponentWantsRematch = false;
            netState.tournamentEnded = false;
            updateScoreUI();
            updateHealthUI();
            hideDeathScreen();
            console.log('[Tournament] Rematch started (from opponent)!');
            break;

        case 'tournament_mode':
            // Sync tournament mode from host
            netState.tournamentMode = data.enabled;
            netState.tournamentKillsToWin = data.killsToWin || 5;
            const checkbox = document.getElementById('tournament-mode');
            if (checkbox) checkbox.checked = data.enabled;
            const killsSelect = document.getElementById('tournament-kills');
            if (killsSelect) killsSelect.value = netState.tournamentKillsToWin;
            console.log('[Tournament] Synced from host: mode=' + (data.enabled ? 'ON' : 'OFF') + ', kills=' + netState.tournamentKillsToWin);
            break;

        case 'reset':
            // Opponent reset, sync our state
            netState.health = 100;
            if (netState.opponent) {
                netState.opponent.state.health = 100;
            }
            updateHealthUI();
            hideDeathScreen();
            break;
    }
}

function handleOpponentDisconnect() {
    console.log('Opponent disconnected');
    netState.connected = false;
    netState.status = 'disconnected';
    netState.gameMode = 'offline';

    if (netState.opponent && netState.opponent.mesh) {
        scene.remove(netState.opponent.mesh);
    }
    netState.opponent = null;

    updateNetworkUI();
    showTargets();

    // Show message
    alert('Opponent disconnected!');

    // Return to menu
    document.getElementById('start-screen').style.display = 'flex';
    showMainMenu();
    gameState.isRunning = false;
}

function resetRound() {
    netState.health = 100;
    if (netState.opponent) {
        netState.opponent.state.health = 100;
    }
    updateHealthUI();
    hideDeathScreen();

    // Tell opponent to reset too
    sendPeerMessage({ type: 'reset' });
}

// Send message to peer
function sendPeerMessage(data) {
    if (netState.connection && netState.connection.open) {
        netState.connection.send(data);
    }
}

function sendStateUpdate() {
    if (!netState.connected || netState.status !== 'playing') return;

    sendPeerMessage({
        type: 'state',
        state: {
            crouch: gameState.crouch,
            lean: gameState.lean,
            strafe: gameState.strafe,
            lookYaw: gameState.lookYaw,
            lookPitch: gameState.lookPitch,
            weaponHand: gameState.weaponHand,
            weapon: gameState.currentWeapon,
        }
    });
}

function sendShoot(hitPlayer = false, hitPoint = null, hitCover = false) {
    if (!netState.connected || netState.status !== 'playing') return;
    sendPeerMessage({
        type: 'shoot',
        hitPlayer: hitPlayer,
        hitCover: hitCover,
        // Send hit point if available (will be transformed on receiver)
        hitX: hitPoint?.x || 0,
        hitY: hitPoint?.y || 1.2,
        hitZ: hitPoint?.z || -7.5,  // Default to middle of arena
    });
}

function sendHit(damage, bodyPart) {
    // Track total damage for debug stats (always, even in practice)
    DebugConsole.debug.totalDamage += damage;

    if (!netState.connected || netState.status !== 'playing') return;
    sendPeerMessage({ type: 'hit', damage: damage, bodyPart: bodyPart });
}

// UI update functions for multiplayer
function updateNetworkUI() {
    const statusEl = document.getElementById('network-status');
    if (statusEl) {
        const statusText = {
            'disconnected': 'Offline',
            'connecting': 'Connecting...',
            'waiting': 'Waiting for opponent...',
            'playing': 'In Game',
        };
        statusEl.textContent = statusText[netState.status] || netState.status;
        statusEl.className = `status-${netState.status}`;
    }
}

function updateHealthUI() {
    const healthEl = document.getElementById('health-value');
    if (healthEl) {
        healthEl.textContent = netState.health;
    }
    const healthBar = document.getElementById('health-fill');
    if (healthBar) {
        healthBar.style.width = `${netState.health}%`;
    }
}

function updateScoreUI() {
    const scoreEl = document.getElementById('score-value');
    if (scoreEl && netState.gameMode === 'online') {
        scoreEl.textContent = `${netState.scores[netState.playerSlot]} - ${netState.scores[netState.playerSlot === 0 ? 1 : 0]}`;
    }

    // Update tournament info display
    const tournamentInfo = document.getElementById('tournament-info');
    if (tournamentInfo) {
        if (netState.tournamentMode && netState.gameMode === 'online') {
            const myKills = netState.scores[netState.playerSlot];
            const oppKills = netState.scores[netState.playerSlot === 0 ? 1 : 0];
            const myRemaining = netState.tournamentKillsToWin - myKills;
            const oppRemaining = netState.tournamentKillsToWin - oppKills;
            tournamentInfo.innerHTML = `🏆 First to ${netState.tournamentKillsToWin}<br>You need: ${myRemaining} | They need: ${oppRemaining}`;
            tournamentInfo.style.display = 'block';
        } else {
            tournamentInfo.style.display = 'none';
        }
    }
}

// Tournament Mode Functions
function toggleTournamentMode() {
    const checkbox = document.getElementById('tournament-mode');
    netState.tournamentMode = checkbox ? checkbox.checked : false;
    console.log('[Tournament] Mode:', netState.tournamentMode ? 'ON' : 'OFF');
}

function updateTournamentKills() {
    const select = document.getElementById('tournament-kills');
    netState.tournamentKillsToWin = select ? parseInt(select.value) : 5;
    console.log('[Tournament] Kills to win:', netState.tournamentKillsToWin);
}

function checkTournamentWin() {
    if (!netState.tournamentMode) return false;
    if (netState.tournamentEnded) return true; // Already ended

    const myScore = netState.scores[netState.playerSlot];
    const opponentScore = netState.scores[netState.playerSlot === 0 ? 1 : 0];

    if (myScore >= netState.tournamentKillsToWin) {
        netState.tournamentEnded = true;
        showTournamentEnd(true); // We won
        return true;
    } else if (opponentScore >= netState.tournamentKillsToWin) {
        netState.tournamentEnded = true;
        showTournamentEnd(false); // We lost
        return true;
    }
    return false;
}

function createConfetti(container) {
    const colors = ['#ff0', '#0f0', '#0ff', '#f0f', '#f90', '#09f'];
    const confettiCount = 100;

    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        const color = colors[Math.floor(Math.random() * colors.length)];
        const left = Math.random() * 100;
        const animDuration = 2 + Math.random() * 2;
        const delay = Math.random() * 0.5;

        confetti.style.cssText = `
            position: absolute;
            width: ${5 + Math.random() * 10}px;
            height: ${5 + Math.random() * 10}px;
            background: ${color};
            left: ${left}%;
            top: -20px;
            opacity: ${0.7 + Math.random() * 0.3};
            transform: rotate(${Math.random() * 360}deg);
            animation: confettiFall ${animDuration}s ease-out ${delay}s forwards;
        `;
        container.appendChild(confetti);
    }

    // Add confetti animation style
    const style = document.createElement('style');
    style.textContent = `
        @keyframes confettiFall {
            0% {
                top: -20px;
                transform: rotate(0deg) translateX(0);
            }
            100% {
                top: 110%;
                transform: rotate(${360 + Math.random() * 360}deg) translateX(${(Math.random() - 0.5) * 200}px);
            }
        }
    `;
    document.head.appendChild(style);
}

function showTournamentEnd(won, fromOpponent = false) {
    // Prevent showing twice
    if (fromOpponent && netState.tournamentEnded) return;
    netState.tournamentEnded = true;

    const myScore = netState.scores[netState.playerSlot];
    const opponentScore = netState.scores[netState.playerSlot === 0 ? 1 : 0];

    // Remove existing overlay if any
    const existingOverlay = document.getElementById('tournament-end-overlay');
    if (existingOverlay) existingOverlay.remove();

    // Play sound effect
    if (won) {
        AudioSystem.playSound?.('victory') || console.log('[Tournament] Victory!');
    } else {
        AudioSystem.playSound?.('defeat') || console.log('[Tournament] Defeat!');
    }

    // Create tournament end overlay
    const overlay = document.createElement('div');
    overlay.id = 'tournament-end-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        color: white;
        font-family: Arial, sans-serif;
        overflow: hidden;
    `;

    // Add effects based on outcome
    if (won) {
        // Victory confetti effect
        createConfetti(overlay);
    } else {
        // Defeat red pulse effect
        overlay.style.animation = 'defeatPulse 0.5s ease-out';
        const style = document.createElement('style');
        style.textContent = `
            @keyframes defeatPulse {
                0% { background: rgba(255, 0, 0, 0.5); }
                100% { background: rgba(0, 0, 0, 0.85); }
            }
        `;
        document.head.appendChild(style);
    }

    const title = document.createElement('h1');
    title.textContent = won ? 'VICTORY!' : 'DEFEAT';
    title.style.cssText = `
        font-size: 72px;
        margin-bottom: 20px;
        color: ${won ? '#4CAF50' : '#f44336'};
        text-shadow: 0 0 20px ${won ? '#4CAF50' : '#f44336'};
    `;

    const score = document.createElement('p');
    score.textContent = `Final Score: ${myScore} - ${opponentScore}`;
    score.style.cssText = `
        font-size: 36px;
        margin-bottom: 40px;
    `;

    // Button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        gap: 20px;
        margin-top: 20px;
    `;

    // Rematch button
    const rematchBtn = document.createElement('button');
    rematchBtn.id = 'rematch-btn';
    rematchBtn.textContent = 'Rematch';
    rematchBtn.style.cssText = `
        padding: 15px 40px;
        font-size: 24px;
        background: #ff9800;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.2s;
    `;
    rematchBtn.onmouseover = () => rematchBtn.style.background = '#f57c00';
    rematchBtn.onmouseout = () => rematchBtn.style.background = '#ff9800';
    rematchBtn.onclick = () => requestRematch();

    // Main menu button
    const menuBtn = document.createElement('button');
    menuBtn.textContent = 'Main Menu';
    menuBtn.style.cssText = `
        padding: 15px 40px;
        font-size: 24px;
        background: #666;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.2s;
    `;
    menuBtn.onmouseover = () => menuBtn.style.background = '#555';
    menuBtn.onmouseout = () => menuBtn.style.background = '#666';
    menuBtn.onclick = () => {
        overlay.remove();
        endOnlineGame();
    };

    // Status message for rematch
    const statusMsg = document.createElement('p');
    statusMsg.id = 'rematch-status';
    statusMsg.style.cssText = `
        font-size: 18px;
        margin-top: 20px;
        opacity: 0.8;
        height: 25px;
    `;

    buttonContainer.appendChild(rematchBtn);
    buttonContainer.appendChild(menuBtn);

    overlay.appendChild(title);
    overlay.appendChild(score);
    overlay.appendChild(buttonContainer);
    overlay.appendChild(statusMsg);
    document.body.appendChild(overlay);

    // Send tournament end message to opponent (only if we detected the win)
    // Send "I won" so opponent knows they lost
    if (!fromOpponent) {
        sendPeerMessage({ type: 'tournament_end', won: won });
    }

    // Reset rematch state
    netState.rematchRequested = false;
    netState.opponentWantsRematch = false;
}

function requestRematch() {
    netState.rematchRequested = true;
    sendPeerMessage({ type: 'rematch_request' });

    const statusMsg = document.getElementById('rematch-status');
    const rematchBtn = document.getElementById('rematch-btn');

    if (netState.opponentWantsRematch) {
        // Both want rematch - start it!
        startRematch();
    } else {
        // Waiting for opponent
        if (statusMsg) statusMsg.textContent = 'Waiting for opponent...';
        if (rematchBtn) {
            rematchBtn.textContent = 'Waiting...';
            rematchBtn.disabled = true;
            rematchBtn.style.background = '#888';
        }
    }
}

function handleRematchRequest() {
    netState.opponentWantsRematch = true;

    const statusMsg = document.getElementById('rematch-status');
    const rematchBtn = document.getElementById('rematch-btn');

    if (netState.rematchRequested) {
        // Both want rematch - start it!
        startRematch();
    } else {
        // Show that opponent wants rematch
        if (statusMsg) statusMsg.textContent = 'Opponent wants a rematch!';
        if (rematchBtn) {
            rematchBtn.style.background = '#4CAF50';
            rematchBtn.textContent = 'Accept Rematch';
        }
    }
}

function startRematch() {
    // Remove overlay
    const overlay = document.getElementById('tournament-end-overlay');
    if (overlay) overlay.remove();

    // Reset scores
    netState.scores = [0, 0];
    netState.health = 100;
    if (netState.opponent) {
        netState.opponent.state.health = 100;
    }

    // Reset rematch state
    netState.rematchRequested = false;
    netState.opponentWantsRematch = false;
    netState.tournamentEnded = false;

    // Update UI
    updateScoreUI();
    updateHealthUI();
    hideDeathScreen();

    // Send rematch start to sync
    sendPeerMessage({ type: 'rematch_start' });

    console.log('[Tournament] Rematch started!');
}

function handleTournamentEnd(opponentWon) {
    // Opponent sent us the tournament end message
    showTournamentEnd(!opponentWon, true);
}

function showDamageEffect() {
    const overlay = document.getElementById('damage-overlay');
    if (overlay) {
        overlay.classList.add('show');
        setTimeout(() => overlay.classList.remove('show'), 200);
    }

    // Damage sound
    AudioSystem.playDamage();

    // Create blood splatter on screen edges (player POV hit effect)
    // Spawn some blood particles near the camera
    const cameraPos = camera.position.clone();
    const randomDir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        -1
    ).normalize();
    createBloodSplatter(
        cameraPos.clone().add(randomDir.clone().multiplyScalar(0.5)),
        randomDir.negate()
    );
}

function showHitMarker(bodyPart, hitPoint, hitObject) {
    const hitMarker = document.getElementById('hit-marker');
    if (hitMarker) {
        hitMarker.classList.remove('show', 'headshot');
        void hitMarker.offsetWidth;
        hitMarker.classList.add('show');
        if (bodyPart === 'head') {
            hitMarker.classList.add('headshot');
        }
    }

    // Show body part indicator (with debug line if debug mode is on)
    showBodyPartHit(bodyPart, hitPoint, hitObject);

    // Hit marker sound
    AudioSystem.playHitMarker();
}

// Track active debug hit indicators
const debugHitIndicators = [];

function showBodyPartHit(bodyPart, hitPoint, hitObject) {
    // Body part info with colors matching hitbox colors
    const partInfo = {
        head: { text: 'HEADSHOT!', color: '#ff4444', hex: 0xff4444 },
        chest: { text: 'CHEST', color: '#ff8800', hex: 0xff8800 },
        belly: { text: 'BODY', color: '#ffff00', hex: 0xffff00 },
        arm: { text: 'ARM', color: '#00ff00', hex: 0x00ff00 },
    };
    const info = partInfo[bodyPart] || { text: bodyPart.toUpperCase(), color: '#ffffff', hex: 0xffffff };

    // Always show the simple indicator (non-debug)
    let indicator = document.getElementById('bodypart-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'bodypart-indicator';
        indicator.style.cssText = `
            position: absolute;
            top: 55%;
            left: 50%;
            transform: translateX(-50%);
            color: white;
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            opacity: 0;
            transition: opacity 0.1s;
            z-index: 100;
            pointer-events: none;
        `;
        document.getElementById('game-container').appendChild(indicator);
    }

    indicator.textContent = info.text;
    indicator.style.color = info.color;
    indicator.style.opacity = '1';

    setTimeout(() => {
        indicator.style.opacity = '0';
    }, 500);

    // If debug mode is on and we have hit info, create a tracked indicator with line
    if (DebugConsole.debug.enabled && hitPoint && hitObject) {
        createDebugHitIndicator(bodyPart, hitPoint, hitObject, info);
    }
}

function createDebugHitIndicator(bodyPart, hitPoint, hitObject, info) {
    // Create 3D line from hit point extending outward
    const lineMaterial = new THREE.LineBasicMaterial({
        color: info.hex,
        linewidth: 2,
    });

    // Create a small sphere at the hit point
    const sphereGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: info.hex });
    const hitSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    hitSphere.position.copy(hitPoint);
    scene.add(hitSphere);

    // Create line geometry - will be updated each frame
    const lineGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(6); // 2 points x 3 coordinates
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const line = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(line);

    // Create HTML label
    const label = document.createElement('div');
    label.style.cssText = `
        position: absolute;
        color: ${info.color};
        font-family: monospace;
        font-size: 12px;
        font-weight: bold;
        text-shadow: 1px 1px 2px black, -1px -1px 2px black;
        pointer-events: none;
        z-index: 200;
        white-space: nowrap;
    `;
    label.textContent = `${info.text} [${bodyPart.toUpperCase()}]`;
    document.getElementById('game-container').appendChild(label);

    // Store the indicator for tracking
    const indicatorData = {
        hitObject: hitObject,
        hitLocalPoint: hitObject.worldToLocal(hitPoint.clone()), // Store in local space
        line: line,
        hitSphere: hitSphere,
        label: label,
        color: info.hex,
        createdAt: Date.now(),
        duration: 2000, // Show for 2 seconds
    };
    debugHitIndicators.push(indicatorData);
}

function updateDebugHitIndicators() {
    const now = Date.now();

    for (let i = debugHitIndicators.length - 1; i >= 0; i--) {
        const ind = debugHitIndicators[i];
        const age = now - ind.createdAt;

        // Remove expired indicators
        if (age > ind.duration) {
            scene.remove(ind.line);
            scene.remove(ind.hitSphere);
            ind.line.geometry.dispose();
            ind.line.material.dispose();
            ind.hitSphere.geometry.dispose();
            ind.hitSphere.material.dispose();
            if (ind.label.parentNode) {
                ind.label.parentNode.removeChild(ind.label);
            }
            debugHitIndicators.splice(i, 1);
            continue;
        }

        // Calculate fade
        const fadeStart = ind.duration - 500;
        const opacity = age > fadeStart ? 1 - (age - fadeStart) / 500 : 1;

        // Update hit sphere position (track body part)
        if (ind.hitObject && ind.hitObject.parent) {
            const worldPoint = ind.hitLocalPoint.clone();
            ind.hitObject.localToWorld(worldPoint);
            ind.hitSphere.position.copy(worldPoint);

            // Calculate label position (offset from hit point toward camera)
            const labelOffset = new THREE.Vector3();
            labelOffset.subVectors(camera.position, worldPoint).normalize().multiplyScalar(0.5);
            const labelWorldPos = worldPoint.clone().add(labelOffset);
            labelWorldPos.y += 0.3; // Slightly above

            // Update line to connect hit point to label position
            const positions = ind.line.geometry.attributes.position.array;
            positions[0] = worldPoint.x;
            positions[1] = worldPoint.y;
            positions[2] = worldPoint.z;
            positions[3] = labelWorldPos.x;
            positions[4] = labelWorldPos.y;
            positions[5] = labelWorldPos.z;
            ind.line.geometry.attributes.position.needsUpdate = true;

            // Project label position to screen
            const screenPos = labelWorldPos.clone().project(camera);
            if (screenPos.z < 1) {
                const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
                const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
                ind.label.style.left = x + 'px';
                ind.label.style.top = y + 'px';
                ind.label.style.opacity = opacity;
                ind.label.style.display = 'block';
            } else {
                ind.label.style.display = 'none';
            }

            // Update line and sphere opacity
            ind.line.material.opacity = opacity;
            ind.line.material.transparent = true;
            ind.hitSphere.material.opacity = opacity;
            ind.hitSphere.material.transparent = true;
        }
    }
}

function showDeathScreen() {
    const deathScreen = document.getElementById('death-screen');
    if (deathScreen) {
        deathScreen.style.display = 'flex';
    }
    // Death sound
    AudioSystem.playDeath();
}

function hideDeathScreen() {
    const deathScreen = document.getElementById('death-screen');
    if (deathScreen) {
        deathScreen.style.display = 'none';
    }
}

function showKillNotification() {
    // Kill confirmation sound
    AudioSystem.playKill();
    console.log('You eliminated the opponent!');
}

// ============================================
// HIT MARKS AND BLOOD SPLATTER
// ============================================

// Store active effects for cleanup
const activeEffects = {
    hitMarks: [],
    bloodParticles: [],
    projectiles: [],
};

// Create a bullet hole decal at impact point
function createHitMark(position, normal, source = 'unknown') {
    // Debug logging
    if (DebugConsole.debug.showHits) {
        DebugConsole.log(`[HIT] ${source} @ (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}) normal: (${normal.x.toFixed(2)}, ${normal.y.toFixed(2)}, ${normal.z.toFixed(2)})`, 'info');
    }

    const size = 0.08 + Math.random() * 0.04;

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

    scene.add(decal);

    // Track for cleanup
    const hitMark = {
        mesh: decal,
        createdAt: Date.now(),
        lifetime: 10000, // 10 seconds
    };
    activeEffects.hitMarks.push(hitMark);

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
    ring.userData.isDecal = true; // Mark as decal so raycasts ignore it
    scene.add(ring);

    activeEffects.hitMarks.push({
        mesh: ring,
        createdAt: Date.now(),
        lifetime: 10000,
    });

    return decal;
}

// Create blood splatter particles at hit location
function createBloodSplatter(position, direction) {
    const particleCount = 8 + Math.floor(Math.random() * 8);

    for (let i = 0; i < particleCount; i++) {
        // Random size for variety
        const size = 0.03 + Math.random() * 0.05;

        // Create blood particle
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
        particle.userData.isDecal = true; // Mark so raycasts ignore it

        // Calculate velocity - spray outward from hit direction
        const spread = 0.5;
        const velocity = new THREE.Vector3(
            direction.x + (Math.random() - 0.5) * spread,
            direction.y + (Math.random() - 0.5) * spread + 0.3, // Slight upward bias
            direction.z + (Math.random() - 0.5) * spread
        ).normalize().multiplyScalar(2 + Math.random() * 3);

        scene.add(particle);

        // Track particle with physics
        const bloodParticle = {
            mesh: particle,
            velocity: velocity,
            gravity: -9.8,
            createdAt: Date.now(),
            lifetime: 800 + Math.random() * 400, // Shorter lifetime (0.8-1.2s)
            groundY: 0.02, // Stop at ground level
        };
        activeEffects.bloodParticles.push(bloodParticle);
    }

    // Create blood spray effect (instantaneous splatter lines)
    for (let i = 0; i < 5; i++) {
        const sprayLength = 0.2 + Math.random() * 0.3;
        const sprayDir = new THREE.Vector3(
            direction.x + (Math.random() - 0.5) * 0.8,
            direction.y + (Math.random() - 0.5) * 0.8,
            direction.z + (Math.random() - 0.5) * 0.8
        ).normalize();

        const points = [
            position.clone(),
            position.clone().add(sprayDir.multiplyScalar(sprayLength))
        ];

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0x8b0000,
            transparent: true,
            opacity: 0.8,
        });

        const line = new THREE.Line(geometry, material);
        line.userData.isDecal = true; // Mark so raycasts ignore it
        scene.add(line);

        activeEffects.bloodParticles.push({
            mesh: line,
            velocity: new THREE.Vector3(0, 0, 0),
            gravity: 0,
            createdAt: Date.now(),
            lifetime: 150 + Math.random() * 100, // Quick flash
            isSpray: true,
        });
    }
}

// Create blood decal on a surface
function createBloodDecal(position, normal) {
    const size = 0.1 + Math.random() * 0.15;

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
        blob.userData.isDecal = true; // Mark as decal so raycasts ignore it
        group.add(blob);
    }

    group.userData.isDecal = true; // Mark group as decal too
    group.position.copy(position);
    group.position.add(normal.clone().multiplyScalar(0.02));
    group.lookAt(position.clone().add(normal));
    group.rotation.z = Math.random() * Math.PI * 2;

    scene.add(group);

    activeEffects.hitMarks.push({
        mesh: group,
        createdAt: Date.now(),
        lifetime: 1500 + Math.random() * 500, // Blood fades quickly (1.5-2s)
    });
}

// Update blood particles physics
function updateBloodParticles(deltaTime) {
    const now = Date.now();

    // Update particles
    for (let i = activeEffects.bloodParticles.length - 1; i >= 0; i--) {
        const particle = activeEffects.bloodParticles[i];
        const age = now - particle.createdAt;

        // Remove expired particles
        if (age > particle.lifetime) {
            scene.remove(particle.mesh);
            if (particle.mesh.geometry) particle.mesh.geometry.dispose();
            if (particle.mesh.material) particle.mesh.material.dispose();
            activeEffects.bloodParticles.splice(i, 1);
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
                createBloodDecal(
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

    // Cleanup old hit marks
    for (let i = activeEffects.hitMarks.length - 1; i >= 0; i--) {
        const mark = activeEffects.hitMarks[i];
        const age = now - mark.createdAt;

        if (age > mark.lifetime) {
            scene.remove(mark.mesh);
            if (mark.mesh.geometry) mark.mesh.geometry.dispose();
            if (mark.mesh.material) mark.mesh.material.dispose();
            activeEffects.hitMarks.splice(i, 1);
            continue;
        }

        // Fade out in last 20% of lifetime
        const fadeStart = mark.lifetime * 0.8;
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
}

// ============================================
// PROJECTILE SYSTEM (RPG rockets, etc.)
// ============================================

function fireProjectile(weaponConfig) {
    const projectileConfig = weaponConfig.projectile;

    // Get camera direction
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    // Start position (slightly in front of camera)
    const startPos = camera.position.clone().add(direction.clone().multiplyScalar(1.5));

    // Create rocket mesh
    const rocketGroup = new THREE.Group();

    // Rocket body
    const bodyGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x556b2f, roughness: 0.5 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    rocketGroup.add(body);

    // Warhead
    const tipGeo = new THREE.ConeGeometry(0.05, 0.15, 8);
    const tipMat = new THREE.MeshStandardMaterial({ color: 0x8b0000 });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.rotation.x = -Math.PI / 2;
    tip.position.z = -0.27;
    rocketGroup.add(tip);

    // Fins
    const finGeo = new THREE.BoxGeometry(0.12, 0.005, 0.08);
    const finMat = new THREE.MeshStandardMaterial({ color: 0x556b2f });
    for (let i = 0; i < 4; i++) {
        const fin = new THREE.Mesh(finGeo, finMat);
        fin.position.z = 0.15;
        fin.rotation.z = (Math.PI / 2) * i;
        rocketGroup.add(fin);
    }

    // Trail particle (glowing)
    const trailGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const trailMat = new THREE.MeshBasicMaterial({
        color: projectileConfig.trailColor || 0xff6600,
        transparent: true,
        opacity: 0.8
    });
    const trail = new THREE.Mesh(trailGeo, trailMat);
    trail.position.z = 0.25;
    rocketGroup.add(trail);

    // Point light for glow
    const light = new THREE.PointLight(projectileConfig.trailColor || 0xff6600, 2, 5);
    light.position.z = 0.25;
    rocketGroup.add(light);

    // Position and orient the rocket
    rocketGroup.position.copy(startPos);
    rocketGroup.lookAt(startPos.clone().add(direction));

    scene.add(rocketGroup);

    // Store projectile data
    activeEffects.projectiles.push({
        mesh: rocketGroup,
        velocity: direction.clone().multiplyScalar(projectileConfig.speed),
        gravity: projectileConfig.gravity || 0,
        damage: weaponConfig.damage,
        splashConfig: weaponConfig.damage.splash,
        createdAt: Date.now(),
        lifetime: 10000, // 10 seconds max
    });
}

function firePellets(weaponConfig) {
    const pelletCount = weaponConfig.damage.pellets || 8;
    const spread = weaponConfig.damage.spread || 0.08;
    const baseDamage = weaponConfig.damage.base;

    // Get camera direction and position
    const cameraDir = new THREE.Vector3();
    camera.getWorldDirection(cameraDir);

    // Get blocking objects once (for performance)
    const blockingObjects = [];
    scene.traverse((obj) => {
        if (obj.isMesh && !obj.userData.isOpponent && !obj.userData.isTarget &&
            !obj.userData.isDecal && obj !== ground && obj.visible) {
            blockingObjects.push(obj);
        }
    });

    let totalDamage = 0;
    let hitCount = 0;

    // Fire each pellet
    for (let i = 0; i < pelletCount; i++) {
        // Add random spread to direction
        const pelletDir = cameraDir.clone();

        // Random spread in a cone
        const spreadX = (Math.random() - 0.5) * 2 * spread;
        const spreadY = (Math.random() - 0.5) * 2 * spread;

        // Create rotation quaternion for spread
        const right = new THREE.Vector3();
        const up = new THREE.Vector3();
        right.crossVectors(cameraDir, new THREE.Vector3(0, 1, 0)).normalize();
        up.crossVectors(right, cameraDir).normalize();

        pelletDir.add(right.multiplyScalar(spreadX));
        pelletDir.add(up.multiplyScalar(spreadY));
        pelletDir.normalize();

        // Raycast for this pellet
        const raycaster = new THREE.Raycaster();
        raycaster.set(camera.position.clone(), pelletDir);
        raycaster.near = 1;

        // Check opponent hit
        if (netState.opponent && netState.opponent.mesh) {
            const opponentIntersects = raycaster.intersectObject(netState.opponent.mesh, true);

            if (opponentIntersects.length > 0) {
                const opponentHit = opponentIntersects[0];
                const opponentDistance = opponentHit.distance;

                // Check if cover blocks this pellet
                const coverIntersects = raycaster.intersectObjects(blockingObjects, true);
                let blocked = false;

                if (coverIntersects.length > 0 && coverIntersects[0].distance < opponentDistance) {
                    blocked = true;
                    // Create hit mark on cover
                    const coverHit = coverIntersects[0];
                    if (coverHit.face) {
                        const worldNormal = coverHit.face.normal.clone();
                        if (coverHit.object.matrixWorld) {
                            worldNormal.transformDirection(coverHit.object.matrixWorld);
                        }
                        createHitMark(coverHit.point.clone(), worldNormal, 'pellet-cover');
                    }
                }

                if (!blocked) {
                    // Pellet hit opponent
                    const hitObject = opponentHit.object;
                    const bodyPart = hitObject.userData.bodyPart || 'body';

                    // Calculate damage for this pellet
                    let pelletDamage = baseDamage;
                    const bodyPartMults = {
                        head: weaponConfig.damage.headshotMult || 1.5,
                        chest: 1.0,
                        belly: 0.8,
                        arm: 0.5,
                        leg: 0.6,
                        body: 0.9,
                    };
                    pelletDamage *= bodyPartMults[bodyPart] || 1.0;
                    pelletDamage = Math.round(pelletDamage);

                    totalDamage += pelletDamage;
                    hitCount++;

                    // Create blood at hit point
                    const hitPoint = opponentHit.point.clone();
                    createBloodSplatter(hitPoint, pelletDir);
                }
            } else {
                // Check for environment hits
                const envIntersects = raycaster.intersectObjects(blockingObjects, true);
                if (envIntersects.length > 0) {
                    const envHit = envIntersects[0];
                    if (envHit.face) {
                        const worldNormal = envHit.face.normal.clone();
                        if (envHit.object.matrixWorld) {
                            worldNormal.transformDirection(envHit.object.matrixWorld);
                        }
                        createHitMark(envHit.point.clone(), worldNormal, 'pellet-env');
                    }
                }
            }
        } else {
            // No opponent - just check environment
            const envIntersects = raycaster.intersectObjects(blockingObjects, true);
            if (envIntersects.length > 0) {
                const envHit = envIntersects[0];
                if (envHit.face) {
                    const worldNormal = envHit.face.normal.clone();
                    if (envHit.object.matrixWorld) {
                        worldNormal.transformDirection(envHit.object.matrixWorld);
                    }
                    createHitMark(envHit.point.clone(), worldNormal, 'pellet-env');
                }
            }
        }
    }

    // Apply total damage if any pellets hit
    if (hitCount > 0) {
        sendHit(totalDamage, 'body');
        showHitMarker('body', null, null);
        AudioSystem.playImpactPlayer();
    }
}

function updateProjectiles(deltaTime) {
    const now = Date.now();

    for (let i = activeEffects.projectiles.length - 1; i >= 0; i--) {
        const proj = activeEffects.projectiles[i];
        const age = now - proj.createdAt;

        // Remove expired projectiles
        if (age > proj.lifetime) {
            scene.remove(proj.mesh);
            proj.mesh.traverse(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) obj.material.dispose();
            });
            activeEffects.projectiles.splice(i, 1);
            continue;
        }

        // Apply gravity
        proj.velocity.y -= proj.gravity * deltaTime;

        // Calculate new position
        const oldPos = proj.mesh.position.clone();
        const movement = proj.velocity.clone().multiplyScalar(deltaTime);
        const newPos = oldPos.clone().add(movement);

        // Raycast to check for collisions
        const raycaster = new THREE.Raycaster(oldPos, movement.clone().normalize(), 0, movement.length() + 0.2);

        // Get all objects to check collision against
        const collisionObjects = [];
        scene.traverse((obj) => {
            if (obj.isMesh && obj !== proj.mesh && !obj.userData.isDecal &&
                !proj.mesh.children.includes(obj) && obj.visible) {
                collisionObjects.push(obj);
            }
        });

        const intersects = raycaster.intersectObjects(collisionObjects, true);

        if (intersects.length > 0) {
            // Hit something - explode!
            const hitPoint = intersects[0].point;
            const hitObject = intersects[0].object;

            createExplosion(hitPoint, proj.splashConfig, proj.damage);

            // Remove projectile
            scene.remove(proj.mesh);
            proj.mesh.traverse(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) obj.material.dispose();
            });
            activeEffects.projectiles.splice(i, 1);
            continue;
        }

        // Ground collision
        if (newPos.y <= 0.1) {
            createExplosion(new THREE.Vector3(newPos.x, 0.1, newPos.z), proj.splashConfig, proj.damage);

            scene.remove(proj.mesh);
            proj.mesh.traverse(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) obj.material.dispose();
            });
            activeEffects.projectiles.splice(i, 1);
            continue;
        }

        // Update position and rotation
        proj.mesh.position.copy(newPos);
        proj.mesh.lookAt(newPos.clone().add(proj.velocity));
    }
}

function createExplosion(position, splashConfig, damageConfig) {
    // Play explosion sound
    AudioSystem.playExplosion();

    // Visual explosion effect
    const explosionGroup = new THREE.Group();
    explosionGroup.userData.isDecal = true; // Mark so raycasts ignore it

    // Central flash
    const flashGeo = new THREE.SphereGeometry(1, 16, 16);
    const flashMat = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 1
    });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.castShadow = false;
    flash.receiveShadow = false;
    flash.userData.isDecal = true; // Mark so raycasts ignore it
    explosionGroup.add(flash);

    // Explosion light (no shadows for performance)
    const explosionLight = new THREE.PointLight(0xff6600, 10, 15);
    explosionLight.castShadow = false;
    explosionGroup.add(explosionLight);

    // Smoke particles
    for (let i = 0; i < 8; i++) {
        const smokeGeo = new THREE.SphereGeometry(0.3 + Math.random() * 0.3, 8, 8);
        const smokeMat = new THREE.MeshBasicMaterial({
            color: 0x333333,
            transparent: true,
            opacity: 0.7
        });
        const smoke = new THREE.Mesh(smokeGeo, smokeMat);
        smoke.castShadow = false;
        smoke.receiveShadow = false;
        smoke.userData.isDecal = true; // Mark so raycasts ignore it
        smoke.position.set(
            (Math.random() - 0.5) * 2,
            Math.random() * 1.5,
            (Math.random() - 0.5) * 2
        );
        smoke.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 3,
            2 + Math.random() * 3,
            (Math.random() - 0.5) * 3
        );
        explosionGroup.add(smoke);
    }

    explosionGroup.position.copy(position);
    scene.add(explosionGroup);

    // Animate explosion
    const startTime = Date.now();
    const duration = 500;

    function animateExplosion() {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;

        if (progress >= 1) {
            scene.remove(explosionGroup);
            explosionGroup.traverse(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) obj.material.dispose();
            });
            return;
        }

        // Expand flash
        const scale = 1 + progress * 3;
        flash.scale.set(scale, scale, scale);
        flashMat.opacity = 1 - progress;

        // Fade light
        explosionLight.intensity = 10 * (1 - progress);

        // Move smoke particles
        explosionGroup.children.forEach(child => {
            if (child.userData.velocity) {
                child.position.add(child.userData.velocity.clone().multiplyScalar(0.016));
                child.userData.velocity.y -= 5 * 0.016; // gravity
                if (child.material) {
                    child.material.opacity = 0.7 * (1 - progress);
                }
            }
        });

        requestAnimationFrame(animateExplosion);
    }
    animateExplosion();

    // Apply splash damage
    if (splashConfig && netState.opponent && netState.opponent.mesh) {
        const opponentPos = netState.opponent.mesh.position.clone();
        opponentPos.y += 1; // Approximate center of opponent

        const distance = position.distanceTo(opponentPos);

        if (distance <= splashConfig.radius) {
            // Calculate damage based on distance
            let damage;
            if (splashConfig.falloff === 'linear') {
                const falloffMult = 1 - (distance / splashConfig.radius);
                damage = Math.round(splashConfig.damage * falloffMult);
            } else {
                damage = splashConfig.damage;
            }

            if (damage > 0) {
                // Apply damage
                sendHit(damage, 'body');
                showHitMarker('body', opponentPos, netState.opponent.mesh);
                AudioSystem.playImpactPlayer();

                // Create blood effect
                const hitDirection = opponentPos.clone().sub(position).normalize();
                createBloodSplatter(opponentPos, hitDirection);
            }
        }
    }

    // Create ground scorch mark
    if (position.y < 1) {
        const scorchGeo = new THREE.CircleGeometry(splashConfig ? splashConfig.radius * 0.5 : 1, 16);
        const scorchMat = new THREE.MeshBasicMaterial({
            color: 0x1a1a1a,
            transparent: true,
            opacity: 0.6,
            depthWrite: false
        });
        const scorch = new THREE.Mesh(scorchGeo, scorchMat);
        scorch.rotation.x = -Math.PI / 2;
        scorch.position.set(position.x, 0.02, position.z);
        scene.add(scorch);

        // Add to hitmarks for cleanup
        activeEffects.hitMarks.push({
            mesh: scorch,
            createdAt: Date.now(),
            lifetime: 30000 // 30 seconds
        });
    }
}

function hideTargets() {
    targets.forEach(t => {
        if (t.mesh) t.mesh.visible = false;
    });
}

function showTargets() {
    targets.forEach(t => {
        if (t.mesh) t.mesh.visible = true;
    });
}

// Selected map (before game starts)
let selectedMap = 'arena';

function selectMap(mapId) {
    selectedMap = mapId;
    // Update UI
    document.querySelectorAll('.map-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.map === mapId);
    });
}

// Make selectMap available globally for onclick handlers
window.selectMap = selectMap;

// Game state
const gameState = {
    isRunning: false,
    score: 0,
    currentMap: 'arena',

    // Stance values (0 to 1 for crouch, -1 to 1 for lean/strafe)
    crouch: 0,          // 0 = standing, 1 = fully crouched
    lean: 0,            // -1 = full left, 0 = center, 1 = full right
    strafe: 0,          // -1 = full left, 0 = center, 1 = full right
    targetCrouch: 0,
    targetLean: 0,
    targetStrafe: 0,

    // Mouse look
    lookYaw: 0,         // Horizontal look angle
    lookPitch: 0,       // Vertical look angle

    // Weapon
    weaponHand: 'right', // 'left' or 'right'
    currentWeapon: 'assault_rifle',
    weaponSlot: 3,              // Current weapon slot (1-5)
    isWeaponSwitching: false,   // Prevent actions during switch

    // Aim down sights
    isAiming: false,        // Currently holding right mouse
    adsProgress: 0,         // 0 = hip fire, 1 = fully aimed
    ADS_SPEED: 8,           // How fast ADS transitions
    ADS_FOV: 45,            // FOV when aiming (default is 75)
    DEFAULT_FOV: 75,        // Normal FOV

    // Fire mode
    fireMode: 'single',     // 'single', 'burst', 'auto'
    fireRateMs: 100,        // Milliseconds between shots (1-1000)
    isFiring: false,        // Currently holding trigger
    fireInterval: null,     // Interval for auto/burst fire
    burstCount: 0,          // Shots remaining in burst

    // Input
    keys: {},
    mouseX: 0,
    mouseY: 0,

    // Constants
    CROUCH_SPEED: 3,        // How fast crouch changes
    LEAN_SPEED: 4,          // How fast lean changes
    STRAFE_SPEED: 3,        // How fast strafe changes
    STANCE_SMOOTHING: 8,    // Interpolation speed
    MOUSE_SENSITIVITY: 0.002,

    // Camera base position
    BASE_HEIGHT: 1.6,       // Standing eye height
    CROUCH_AMOUNT: 0.8,     // How much crouching lowers camera
    LEAN_AMOUNT: 0.6,       // How far to lean sideways
    LEAN_TILT: 0.15,        // How much camera tilts when leaning
    STRAFE_AMOUNT: 2.0,     // How far to strafe sideways
    LOOK_LIMIT_YAW: 0.8,    // Max horizontal look angle (radians)
    LOOK_LIMIT_PITCH: 0.5   // Max vertical look angle (radians)
};

// Three.js objects
let scene, camera, renderer;
let weapon, weaponPivot;
let targets = [];
let cover;
let ground;
let mapObjects = []; // Track all map-specific objects for cleanup
let mapLights = [];  // Track map-specific lights

// Initialize the game
function init() {
    // Display version
    const versionEl = document.getElementById('version');
    if (versionEl) versionEl.textContent = `v${GAME_VERSION}`;

    // Set current map from selection
    gameState.currentMap = selectedMap;

    // Get map configuration
    const mapConfig = typeof MapConfig !== 'undefined' ? MapConfig.getMap(gameState.currentMap) : null;
    const sceneConfig = mapConfig?.scene || { background: 0x1a1a24, fogColor: 0x1a1a24, fogDensity: 0.015 };

    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(sceneConfig.background);
    scene.fog = new THREE.FogExp2(sceneConfig.fogColor, sceneConfig.fogDensity);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, gameState.BASE_HEIGHT, 0);

    // Renderer - Enhanced for better visuals
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true, // Required for screenshots
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x for performance
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding; // Proper color space
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // Cinematic look
    renderer.toneMappingExposure = 1.1; // Slightly brighter
    document.getElementById('game-container').insertBefore(renderer.domElement, document.getElementById('crosshair'));

    // Lighting from map config
    const lightConfig = mapConfig?.lighting || {
        hemisphere: { skyColor: 0x8899aa, groundColor: 0x554433, intensity: 0.4 },
        ambient: { color: 0x404050, intensity: 0.3 },
        directional: { color: 0xffeedd, intensity: 1.0, position: [10, 25, 5] },
        fill: { color: 0x8899bb, intensity: 0.3, position: [-8, 10, -5] },
        accents: [
            { type: 'point', color: 0xff4444, intensity: 0.6, distance: 25, position: [-6, 4, -12] },
            { type: 'point', color: 0x4466ff, intensity: 0.6, distance: 25, position: [6, 4, -12] },
            { type: 'point', color: 0xffaa66, intensity: 0.3, distance: 15, position: [0, 3, 2] }
        ]
    };

    // Hemisphere light
    const hemiLight = new THREE.HemisphereLight(
        lightConfig.hemisphere.skyColor,
        lightConfig.hemisphere.groundColor,
        lightConfig.hemisphere.intensity
    );
    scene.add(hemiLight);
    mapLights.push(hemiLight);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(lightConfig.ambient.color, lightConfig.ambient.intensity);
    scene.add(ambientLight);
    mapLights.push(ambientLight);

    // Main directional light
    const directionalLight = new THREE.DirectionalLight(lightConfig.directional.color, lightConfig.directional.intensity);
    directionalLight.position.set(...lightConfig.directional.position);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 60;
    directionalLight.shadow.camera.left = -25;
    directionalLight.shadow.camera.right = 25;
    directionalLight.shadow.camera.top = 25;
    directionalLight.shadow.camera.bottom = -25;
    directionalLight.shadow.bias = -0.0005;
    directionalLight.shadow.normalBias = 0.02;
    scene.add(directionalLight);
    mapLights.push(directionalLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(lightConfig.fill.color, lightConfig.fill.intensity);
    fillLight.position.set(...lightConfig.fill.position);
    scene.add(fillLight);
    mapLights.push(fillLight);

    // Accent lights
    lightConfig.accents.forEach(accent => {
        if (accent.type === 'point') {
            const light = new THREE.PointLight(accent.color, accent.intensity, accent.distance);
            light.position.set(...accent.position);
            scene.add(light);
            mapLights.push(light);
        }
    });

    createEnvironment();
    createCover();
    createWeapon();
    createTargets();

    // Event listeners
    setupEventListeners();

    // Initialize debug console
    DebugConsole.init();

    // Start render loop
    animate();

    // Auto-connect to server if online
    // (can be triggered by UI button instead)
}

// Create opponent player mesh
function createOpponentMesh(opponent) {
    const teamColor = opponent.slot === 0 ? 0x4444aa : 0xaa4444;

    // Use HumanoidFactory if available
    if (typeof HumanoidFactory !== 'undefined') {
        console.log('[createOpponentMesh] Using HumanoidFactory');
        const humanoid = HumanoidFactory.create({
            teamColor: teamColor,
            skinColor: 0xddccbb,
            eyeColor: 0x446688,
            hasMask: false,
            slot: opponent.slot
        });

        const group = humanoid.root;

        // Tag all meshes with damage info from hitboxes
        humanoid.hitboxes.forEach(hb => {
            if (hb.mesh) {
                hb.mesh.userData.isOpponent = true;
                hb.mesh.userData.bodyPart = hb.part;
                const damage = typeof DamageConfig !== 'undefined' ?
                    DamageConfig.bodyParts[hb.part]?.damage : 10;
                hb.mesh.userData.damage = damage || 10;
            }
        });

        // Create and attach weapon to hand
        const weaponId = opponent.currentWeapon || 'assault_rifle';
        let weapon;
        if (typeof WeaponFactory !== 'undefined') {
            WeaponFactory.initMaterials();
            weapon = WeaponFactory.createOpponentWeapon(weaponId);
        } else {
            const weaponGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.4);
            const weaponMaterial = new THREE.MeshStandardMaterial({
                color: 0x222222,
                metalness: 0.8,
            });
            weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
        }

        // Attach weapon to hand bone
        const weaponHand = opponent.state?.weaponHand || 'right';
        const handBone = weaponHand === 'right' ? 'handR' : 'handL';
        humanoid.attachToBone(handBone, weapon);
        // Position: slightly forward and down from hand center
        // Rotation: weapon model points -Z, rotate to align with arm direction
        weapon.position.set(0, -0.08, 0.05);
        weapon.rotation.set(Math.PI / 2, 0, Math.PI);
        opponent.weaponMesh = weapon;

        // Apply weapon hold pose
        const weaponConfig = typeof WeaponConfig !== 'undefined' ?
            WeaponConfig.weapons[weaponId] : null;
        if (weaponConfig?.type === 'pistol') {
            humanoid.setPose(HumanoidFactory.poses.pistolHold);
        } else {
            humanoid.setPose(HumanoidFactory.poses.rifleHold);
        }

        // Store humanoid reference for pose updates
        opponent.humanoid = humanoid;

        // Initialize animation system
        if (typeof AnimationController !== 'undefined') {
            opponent.animController = new AnimationController(group);

            // Add bones from humanoid to animation controller
            if (humanoid.bones) {
                opponent.animController.addBones(humanoid.bones);
            }

            // Initialize animation state machine
            if (typeof AnimationStateMachine !== 'undefined') {
                opponent.stateMachine = new AnimationStateMachine(opponent.animController);
                opponent.animController.attachStateMachine(opponent.stateMachine);
            }

            // Enable aim IK
            opponent.animController.enableAimIK();
            console.log('[createOpponentMesh] Animation system initialized');
        }

        // Position opponent on opposite side of arena
        group.position.z = -15;
        opponent.mesh = group;
        scene.add(group);
        return;
    }

    // Fallback: legacy simple mesh
    console.log('[createOpponentMesh] Fallback to legacy mesh');
    const group = new THREE.Group();
    const skinColor = 0xddccbb;

    // Head - 25 damage
    const headGeometry = new THREE.SphereGeometry(0.18, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: skinColor,
        roughness: 0.8,
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.45;
    head.userData.isOpponent = true;
    head.userData.bodyPart = 'head';
    head.userData.damage = 25;
    group.add(head);

    // Chest - 15 damage (upper torso)
    const chestGeometry = new THREE.CylinderGeometry(0.28, 0.25, 0.5, 8);
    const chestMaterial = new THREE.MeshStandardMaterial({
        color: teamColor,
        roughness: 0.7,
    });
    const chest = new THREE.Mesh(chestGeometry, chestMaterial);
    chest.position.y = 1.0;
    chest.userData.isOpponent = true;
    chest.userData.bodyPart = 'chest';
    chest.userData.damage = 15;
    group.add(chest);

    // Belly - 10 damage (lower torso)
    const bellyGeometry = new THREE.CylinderGeometry(0.25, 0.28, 0.45, 8);
    const bellyMaterial = new THREE.MeshStandardMaterial({
        color: teamColor,
        roughness: 0.7,
    });
    const belly = new THREE.Mesh(bellyGeometry, bellyMaterial);
    belly.position.y = 0.5;
    belly.userData.isOpponent = true;
    belly.userData.bodyPart = 'belly';
    belly.userData.damage = 10;
    group.add(belly);

    // Left arm - 5 damage
    const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
    const armMaterial = new THREE.MeshStandardMaterial({
        color: skinColor,
        roughness: 0.8,
    });
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.38, 0.95, 0);
    leftArm.rotation.z = 0.2;
    leftArm.userData.isOpponent = true;
    leftArm.userData.bodyPart = 'arm';
    leftArm.userData.damage = 5;
    group.add(leftArm);

    // Right arm - 5 damage
    const rightArm = new THREE.Mesh(armGeometry, armMaterial.clone());
    rightArm.position.set(0.38, 0.95, 0);
    rightArm.rotation.z = -0.2;
    rightArm.userData.isOpponent = true;
    rightArm.userData.bodyPart = 'arm';
    rightArm.userData.damage = 5;
    group.add(rightArm);

    // Create weapon
    let weapon;
    const weaponId = opponent.currentWeapon || 'assault_rifle';
    if (typeof WeaponFactory !== 'undefined') {
        WeaponFactory.initMaterials();
        weapon = WeaponFactory.createOpponentWeapon(weaponId);
    } else {
        const weaponGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.4);
        const weaponMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            metalness: 0.8,
        });
        weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
    }
    const handOffset = opponent.state?.weaponHand === 'right' ? -0.3 : 0.3;
    weapon.position.set(handOffset, 0.9, -0.2);
    group.add(weapon);
    opponent.weaponMesh = weapon;

    // Position opponent on opposite side of arena
    group.position.z = -15;
    opponent.mesh = group;
    scene.add(group);
}

// Update opponent mesh based on their state
function updateOpponentMesh(opponent, deltaTime) {
    if (!opponent || !opponent.mesh) return;

    opponent.update(deltaTime);

    const state = opponent.state;
    const mesh = opponent.mesh;

    // Base height with crouch
    const baseY = 1.6 - (state.crouch * 0.8);

    // Position with strafe and lean - MIRRORED since opponent faces us
    // When they strafe left (negative), we see them move right (positive)
    const strafeX = -state.strafe * 2.0;
    const leanX = -state.lean * 0.6;

    mesh.position.x = strafeX + leanX;
    mesh.position.y = baseY - 1.6; // Adjust for mesh origin

    // Rotation based on look direction (mirrored)
    mesh.rotation.y = Math.PI - state.lookYaw; // Face toward player, mirror yaw

    // Lean tilt (mirrored)
    mesh.rotation.z = -state.lean * 0.15;

    // Apply stance poses to humanoid if available
    if (opponent.humanoid && typeof HumanoidFactory !== 'undefined') {
        // Get weapon hold pose
        const weaponId = opponent.currentWeapon || 'assault_rifle';
        const weaponConfig = typeof WeaponConfig !== 'undefined' ?
            WeaponConfig.weapons[weaponId] : null;

        let weaponPose;
        if (weaponConfig?.type === 'pistol') {
            weaponPose = HumanoidFactory.poses.pistolHold;
        } else {
            weaponPose = HumanoidFactory.poses.rifleHold;
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
        opponent.humanoid.setPose(finalPose);

        // Apply aim IK after stance poses (so it layers on top)
        if (opponent.animController?.aimIK && opponent.animController.aimIK.enabled) {
            // Set aim target from look direction
            opponent.animController.aimIK.setAimDirect(state.lookYaw, state.lookPitch);

            // Apply aim IK to spine bones
            const aimIK = opponent.animController.aimIK;
            const bones = opponent.humanoid.bones;

            // Smooth interpolation
            const lerpFactor = 1 - Math.exp(-aimIK.config.lerpSpeed * deltaTime);
            aimIK.currentYaw += (aimIK.targetYaw - aimIK.currentYaw) * lerpFactor;
            aimIK.currentPitch += (aimIK.targetPitch - aimIK.currentPitch) * lerpFactor;

            // Apply rotation to spine bones
            for (const boneConfig of aimIK.config.spineBones) {
                const bone = bones[boneConfig.name];
                if (!bone) continue;

                const yawAmount = aimIK.config.enableYaw ? aimIK.currentYaw * boneConfig.weight : 0;
                const pitchAmount = aimIK.config.enablePitch ? aimIK.currentPitch * boneConfig.weight : 0;

                bone.rotation.y += yawAmount;
                bone.rotation.x += pitchAmount;
            }
        }

        // Update state machine if present
        if (opponent.stateMachine) {
            opponent.stateMachine.update(deltaTime);
        }
    } else if (opponent.weaponMesh) {
        // Legacy: Update weapon hand position (mirrored)
        const handOffset = state.weaponHand === 'right' ? -0.3 : 0.3;
        opponent.weaponMesh.position.x = handOffset;
    }
}

function handleOpponentShot(opponent, shotData = null) {
    if (!opponent || !opponent.weaponMesh) return;

    // Get muzzle position in world space
    const muzzlePos = new THREE.Vector3();
    opponent.weaponMesh.getWorldPosition(muzzlePos);
    muzzlePos.z -= 0.3; // Offset to barrel tip

    // Play gunshot sound from opponent
    AudioSystem.playGunshot();

    // Create bullet tracer from opponent toward player
    createOpponentBulletTracer(muzzlePos, shotData);
}

function createOpponentBulletTracer(startPos, shotData) {
    // Debug logging for incoming shot data
    if (DebugConsole.debug.showHits) {
        DebugConsole.log(`[OPPONENT SHOT] Raw data: hitPlayer=${shotData?.hitPlayer}, hitCover=${shotData?.hitCover}, pos=(${shotData?.hitX?.toFixed(2) || 'null'}, ${shotData?.hitY?.toFixed(2) || 'null'}, ${shotData?.hitZ?.toFixed(2) || 'null'})`, 'warn');
    }

    // Transform hit point from shooter's coordinate system to receiver's
    // X: negated (mirror - left/right are reversed)
    // Z: transformed (shooter's z=-0.5 becomes receiver's z=-14.5 and vice versa)
    //    Formula: receiverZ = -15 - shooterZ
    const transformedX = shotData?.hitX ? -shotData.hitX : (Math.random() - 0.5) * 2;
    const transformedZ = shotData?.hitZ ? (-15 - shotData.hitZ) : 0;

    if (DebugConsole.debug.showHits) {
        DebugConsole.log(`[OPPONENT SHOT] Transformed: X=${transformedX.toFixed(2)}, Z=${transformedZ.toFixed(2)}`, 'warn');
    }

    const endPos = new THREE.Vector3(
        transformedX,
        shotData?.hitY || 1.2 + (Math.random() - 0.5) * 0.5,
        Math.max(-0.3, Math.min(0, transformedZ))  // Clamp near player (z=0 to z=-0.3)
    );

    // Create tracer line
    const points = [startPos, endPos];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.8,
    });
    const tracer = new THREE.Line(geometry, material);
    tracer.userData.isDecal = true;
    scene.add(tracer);

    // Create impact effect using the transmitted hit data (no local raycast)
    if (!shotData?.hitPlayer && shotData?.hitCover) {
        // Shot hit cover - create hit mark at transformed position
        const hitPos = new THREE.Vector3(
            transformedX,
            shotData?.hitY || 0.6,
            transformedZ
        );

        // Determine normal based on shot direction (from opponent toward us)
        const shotDir = new THREE.Vector3().subVectors(endPos, startPos).normalize();
        const hitNormal = shotDir.clone().negate();

        createHitMark(hitPos, hitNormal, 'opponent-cover');
        AudioSystem.playImpactBarrier();
    } else if (!shotData?.hitPlayer) {
        // Missed - do a quick raycast to find where it hit walls/ground
        const direction = new THREE.Vector3().subVectors(endPos, startPos).normalize();
        const raycaster = new THREE.Raycaster(startPos, direction);

        const envObjects = [];
        scene.traverse((obj) => {
            if (obj.isMesh && !obj.userData.isOpponent && !obj.userData.isDecal &&
                !obj.userData.isTarget && obj.visible) {
                envObjects.push(obj);
            }
        });

        const intersects = raycaster.intersectObjects(envObjects, true);
        if (intersects.length > 0) {
            const hit = intersects[0];
            if (hit.face) {
                const worldNormal = hit.face.normal.clone();
                if (hit.object.matrixWorld) {
                    worldNormal.transformDirection(hit.object.matrixWorld);
                }
                createHitMark(hit.point.clone(), worldNormal, 'opponent-miss-raycast');
                AudioSystem.playImpactWall();
            }
        }
    }

    // Fade out and remove tracer
    let opacity = 0.8;
    const fadeInterval = setInterval(() => {
        opacity -= 0.1;
        material.opacity = opacity;
        if (opacity <= 0) {
            clearInterval(fadeInterval);
            scene.remove(tracer);
            geometry.dispose();
            material.dispose();
        }
    }, 20);
}

function createEnvironment() {
    const mapConfig = typeof MapConfig !== 'undefined' ? MapConfig.getMap(gameState.currentMap) : null;

    // Ground
    const floorWidth = mapConfig?.floor?.width || 50;
    const floorHeight = mapConfig?.floor?.height || 50;
    const floorRepeat = mapConfig?.floor?.textureRepeat || [12, 12];
    const floorColor = mapConfig?.floor?.color;

    const groundGeometry = new THREE.PlaneGeometry(floorWidth, floorHeight);
    let groundMaterial;
    if (floorColor) {
        groundMaterial = new THREE.MeshStandardMaterial({ color: floorColor, roughness: 0.9, metalness: 0.1 });
    } else {
        groundMaterial = createDevMaterial(floorRepeat[0], floorRepeat[1]);
    }
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    mapObjects.push(ground);

    // Walls from config
    const walls = mapConfig?.walls || [
        { width: 50, height: 15, position: [0, 7.5, -20], rotation: 0, textureRepeat: [12, 4] },
        { width: 40, height: 15, position: [-10, 7.5, -10], rotation: Math.PI / 2, textureRepeat: [10, 4] },
        { width: 40, height: 15, position: [10, 7.5, -10], rotation: -Math.PI / 2, textureRepeat: [10, 4] }
    ];

    walls.forEach(wallDef => {
        const wallGeometry = new THREE.PlaneGeometry(wallDef.width, wallDef.height);
        let wallMaterial;
        if (wallDef.color) {
            wallMaterial = new THREE.MeshStandardMaterial({ color: wallDef.color, roughness: 0.8, metalness: 0.1 });
        } else {
            wallMaterial = createDevMaterial(wallDef.textureRepeat[0], wallDef.textureRepeat[1]);
        }
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(...wallDef.position);
        wall.rotation.y = wallDef.rotation;
        wall.receiveShadow = true;
        scene.add(wall);
        mapObjects.push(wall);
    });

    // Random obstacles (if defined)
    const obstacleConfig = mapConfig?.obstacles || { count: 5, sizeRange: [0.5, 1.5], xRange: [-7.5, 7.5], zRange: [-15, -5] };
    if (obstacleConfig.count > 0) {
        for (let i = 0; i < obstacleConfig.count; i++) {
            const sizeMin = obstacleConfig.sizeRange[0];
            const sizeMax = obstacleConfig.sizeRange[1];
            const size = sizeMin + Math.random() * (sizeMax - sizeMin);
            const boxGeometry = new THREE.BoxGeometry(size, size, size);
            const boxMaterial = createDevMaterial(1, 1);
            const box = new THREE.Mesh(boxGeometry, boxMaterial);
            const xMin = obstacleConfig.xRange[0];
            const xMax = obstacleConfig.xRange[1];
            const zMin = obstacleConfig.zRange[0];
            const zMax = obstacleConfig.zRange[1];
            box.position.set(
                xMin + Math.random() * (xMax - xMin),
                size / 2,
                zMin + Math.random() * (zMax - zMin)
            );
            box.castShadow = true;
            box.receiveShadow = true;
            scene.add(box);
            mapObjects.push(box);
        }
    }

    // Static obstacles (shelves, barrels, car lift, dugout, etc.)
    if (mapConfig?.staticObstacles) {
        mapConfig.staticObstacles.forEach(obs => {
            let obstacle;
            if (obs.type === 'shelf' && MapConfig.createShelf) {
                obstacle = MapConfig.createShelf(THREE, obs.position, obs.color);
            } else if (obs.type === 'barrel' && MapConfig.createBarrel) {
                obstacle = MapConfig.createBarrel(THREE, obs.position, obs.color);
            } else if (obs.type === 'car_lift' && MapConfig.createCarLift) {
                obstacle = MapConfig.createCarLift(THREE, obs.position, obs.color);
            } else if (obs.type === 'dugout' && MapConfig.createDugout) {
                obstacle = MapConfig.createDugout(THREE, obs.position, obs.color);
            } else if (obs.type === 'box') {
                const boxGeo = new THREE.BoxGeometry(...obs.size);
                const boxMat = new THREE.MeshStandardMaterial({ color: obs.color, roughness: 0.7, metalness: 0.1 });
                obstacle = new THREE.Mesh(boxGeo, boxMat);
                obstacle.position.set(...obs.position);
                obstacle.castShadow = true;
                obstacle.receiveShadow = true;
            }
            if (obstacle) {
                scene.add(obstacle);
                mapObjects.push(obstacle);
            }
        });
    }
}

function createCover() {
    const mapConfig = typeof MapConfig !== 'undefined' ? MapConfig.getMap(gameState.currentMap) : null;

    // Helper function to create cover elements
    function createCoverElement(element, baseZ) {
        const material = new THREE.MeshStandardMaterial({
            color: element.color || 0xff8800,
            roughness: 0.7,
            metalness: 0.1,
        });
        const geometry = new THREE.BoxGeometry(...element.size);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            element.position[0],
            element.position[1],
            baseZ + element.position[2]
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        mapObjects.push(mesh);
        return mesh;
    }

    // Get cover config or use defaults
    let playerCoverConfig = mapConfig?.playerCover || {
        z: -0.5,
        elements: [
            { type: 'box', size: [3, 1.2, 0.3], position: [0, 0.6, 0], color: 0xff8800 },
            { type: 'box', size: [0.3, 1.8, 0.5], position: [-1.65, 0.9, 0], color: 0xff8800 },
            { type: 'box', size: [0.3, 1.8, 0.5], position: [1.65, 0.9, 0], color: 0xff8800 }
        ]
    };

    let opponentCoverConfig = mapConfig?.opponentCover || {
        z: -14.5,
        elements: [
            { type: 'box', size: [3, 1.2, 0.3], position: [0, 0.6, 0], color: 0xff8800 },
            { type: 'box', size: [0.3, 1.8, 0.5], position: [-1.65, 0.9, 0], color: 0xff8800 },
            { type: 'box', size: [0.3, 1.8, 0.5], position: [1.65, 0.9, 0], color: 0xff8800 }
        ]
    };

    // Swap cover positions for player slot 1 (joiner)
    // This ensures each player sees their own cover near them
    if (netState.playerSlot === 1) {
        const tempZ = playerCoverConfig.z;
        playerCoverConfig = { ...playerCoverConfig, z: opponentCoverConfig.z };
        opponentCoverConfig = { ...opponentCoverConfig, z: tempZ };
    }

    // Create player-side cover
    playerCoverConfig.elements.forEach((element, index) => {
        const mesh = createCoverElement(element, playerCoverConfig.z);
        // Store first element as main cover reference
        if (index === 0) cover = mesh;
    });

    // Create opponent-side cover
    opponentCoverConfig.elements.forEach(element => {
        createCoverElement(element, opponentCoverConfig.z);
    });
}

function createWeapon() {
    // Weapon pivot point (attached to camera)
    weaponPivot = new THREE.Group();
    camera.add(weaponPivot);

    // Use WeaponFactory if available, otherwise create simple fallback
    if (typeof WeaponFactory !== 'undefined' && typeof WeaponConfig !== 'undefined') {
        WeaponFactory.initMaterials();
        const config = WeaponConfig.getWeapon(gameState.currentWeapon);

        // Apply weapon settings
        gameState.fireRateMs = config.fireRateMs;
        gameState.fireMode = config.defaultMode;
        gameState.ADS_SPEED = config.ads.speed;
        gameState.ADS_FOV = config.ads.fov;
        gameState.weaponSlot = config.slot;

        // Create weapon model
        weapon = WeaponFactory.createWeapon(gameState.currentWeapon);
        updateWeaponPosition();
        weaponPivot.add(weapon);
        scene.add(camera);

        // Update UI
        updateWeaponUI();
        updateFireModeUI();
        return;
    }

    // Legacy fallback: Create simple assault rifle model
    weapon = new THREE.Group();

    // Materials
    const metalDark = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.25,
        metalness: 0.9
    });
    const metalMedium = new THREE.MeshStandardMaterial({
        color: 0x2d2d2d,
        roughness: 0.3,
        metalness: 0.85
    });
    const polymer = new THREE.MeshStandardMaterial({
        color: 0x1f1f1f,
        roughness: 0.6,
        metalness: 0.1
    });
    const polymerTan = new THREE.MeshStandardMaterial({
        color: 0x3d3428,
        roughness: 0.55,
        metalness: 0.1
    });

    // === UPPER RECEIVER ===
    const upperGeometry = new THREE.BoxGeometry(0.055, 0.055, 0.28);
    const upper = new THREE.Mesh(upperGeometry, metalMedium);
    upper.position.set(0, 0.01, 0.02);
    weapon.add(upper);

    // Ejection port
    const ejectionGeometry = new THREE.BoxGeometry(0.03, 0.02, 0.06);
    const ejection = new THREE.Mesh(ejectionGeometry, metalDark);
    ejection.position.set(0.028, 0.02, 0);
    weapon.add(ejection);

    // Charging handle
    const chargingGeometry = new THREE.BoxGeometry(0.04, 0.015, 0.03);
    const charging = new THREE.Mesh(chargingGeometry, metalDark);
    charging.position.set(0, 0.045, 0.12);
    weapon.add(charging);

    // Forward assist
    const assistGeometry = new THREE.CylinderGeometry(0.008, 0.008, 0.02, 8);
    const assist = new THREE.Mesh(assistGeometry, metalDark);
    assist.rotation.z = Math.PI / 2;
    assist.position.set(0.035, 0.01, 0.05);
    weapon.add(assist);

    // === LOWER RECEIVER ===
    const lowerGeometry = new THREE.BoxGeometry(0.05, 0.045, 0.18);
    const lower = new THREE.Mesh(lowerGeometry, metalMedium);
    lower.position.set(0, -0.03, 0.07);
    weapon.add(lower);

    // Magazine well
    const magWellGeometry = new THREE.BoxGeometry(0.035, 0.025, 0.07);
    const magWell = new THREE.Mesh(magWellGeometry, metalDark);
    magWell.position.set(0, -0.055, 0.04);
    weapon.add(magWell);

    // Trigger guard
    const triggerGuardShape = new THREE.Shape();
    triggerGuardShape.moveTo(0, 0);
    triggerGuardShape.lineTo(0.05, 0);
    triggerGuardShape.lineTo(0.05, -0.035);
    triggerGuardShape.lineTo(0.045, -0.04);
    triggerGuardShape.lineTo(0.005, -0.04);
    triggerGuardShape.lineTo(0, -0.035);
    triggerGuardShape.lineTo(0, 0);
    const triggerGuardGeo = new THREE.ExtrudeGeometry(triggerGuardShape, { depth: 0.008, bevelEnabled: false });
    const triggerGuard = new THREE.Mesh(triggerGuardGeo, polymer);
    triggerGuard.rotation.y = Math.PI / 2;
    triggerGuard.position.set(0.004, -0.045, 0.13);
    weapon.add(triggerGuard);

    // Trigger
    const triggerGeometry = new THREE.BoxGeometry(0.006, 0.025, 0.015);
    const trigger = new THREE.Mesh(triggerGeometry, metalDark);
    trigger.position.set(0, -0.055, 0.1);
    trigger.rotation.x = 0.3;
    weapon.add(trigger);

    // === PISTOL GRIP ===
    const gripGeometry = new THREE.BoxGeometry(0.038, 0.095, 0.05);
    const grip = new THREE.Mesh(gripGeometry, polymer);
    grip.position.set(0, -0.095, 0.145);
    grip.rotation.x = 0.25;
    weapon.add(grip);

    // Grip texture lines
    for (let i = 0; i < 5; i++) {
        const lineGeo = new THREE.BoxGeometry(0.001, 0.06, 0.035);
        const line = new THREE.Mesh(lineGeo, metalDark);
        line.position.set(0.02, -0.09, 0.145);
        line.rotation.x = 0.25;
        line.position.x = 0.02 - i * 0.01;
        weapon.add(line);
    }

    // === STOCK ===
    // Buffer tube
    const bufferGeometry = new THREE.CylinderGeometry(0.018, 0.02, 0.15, 12);
    const buffer = new THREE.Mesh(bufferGeometry, metalMedium);
    buffer.rotation.x = Math.PI / 2;
    buffer.position.set(0, 0, 0.23);
    weapon.add(buffer);

    // Stock body
    const stockGeometry = new THREE.BoxGeometry(0.045, 0.065, 0.12);
    const stock = new THREE.Mesh(stockGeometry, polymer);
    stock.position.set(0, -0.005, 0.32);
    weapon.add(stock);

    // Stock buttpad
    const buttpadGeometry = new THREE.BoxGeometry(0.05, 0.075, 0.015);
    const buttpad = new THREE.Mesh(buttpadGeometry, polymerTan);
    buttpad.position.set(0, -0.005, 0.385);
    weapon.add(buttpad);

    // Cheek rest
    const cheekGeometry = new THREE.BoxGeometry(0.04, 0.02, 0.08);
    const cheek = new THREE.Mesh(cheekGeometry, polymer);
    cheek.position.set(0, 0.035, 0.3);
    weapon.add(cheek);

    // === HANDGUARD ===
    const handguardGeometry = new THREE.BoxGeometry(0.058, 0.058, 0.22);
    const handguard = new THREE.Mesh(handguardGeometry, polymer);
    handguard.position.set(0, 0.005, -0.22);
    weapon.add(handguard);

    // M-LOK slots
    for (let i = 0; i < 3; i++) {
        const slotGeo = new THREE.BoxGeometry(0.02, 0.008, 0.04);
        const slotLeft = new THREE.Mesh(slotGeo, metalDark);
        slotLeft.position.set(-0.032, 0.005, -0.13 - i * 0.06);
        weapon.add(slotLeft);
        const slotRight = new THREE.Mesh(slotGeo, metalDark);
        slotRight.position.set(0.032, 0.005, -0.13 - i * 0.06);
        weapon.add(slotRight);
    }

    // Bottom rail on handguard
    const bottomRailGeo = new THREE.BoxGeometry(0.025, 0.012, 0.18);
    const bottomRail = new THREE.Mesh(bottomRailGeo, metalMedium);
    bottomRail.position.set(0, -0.03, -0.2);
    weapon.add(bottomRail);

    // === BARREL ASSEMBLY ===
    // Gas block
    const gasBlockGeometry = new THREE.BoxGeometry(0.035, 0.04, 0.025);
    const gasBlock = new THREE.Mesh(gasBlockGeometry, metalDark);
    gasBlock.position.set(0, 0.025, -0.3);
    weapon.add(gasBlock);

    // Barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.012, 0.014, 0.35, 16);
    const barrel = new THREE.Mesh(barrelGeometry, metalDark);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.005, -0.42);
    weapon.add(barrel);

    // Muzzle device / flash hider
    const muzzleGeometry = new THREE.CylinderGeometry(0.016, 0.014, 0.06, 16);
    const muzzle = new THREE.Mesh(muzzleGeometry, metalDark);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0.005, -0.62);
    weapon.add(muzzle);

    // Muzzle ports
    for (let i = 0; i < 4; i++) {
        const portGeo = new THREE.BoxGeometry(0.025, 0.006, 0.008);
        const port = new THREE.Mesh(portGeo, metalMedium);
        port.position.set(0, 0.005, -0.6 - i * 0.012);
        weapon.add(port);
    }

    // === MAGAZINE ===
    const magBodyGeo = new THREE.BoxGeometry(0.028, 0.16, 0.055);
    const mag = new THREE.Mesh(magBodyGeo, metalMedium);
    mag.position.set(0, -0.13, 0.04);
    mag.rotation.x = 0.05;
    weapon.add(mag);

    // Magazine floor plate
    const floorPlateGeo = new THREE.BoxGeometry(0.032, 0.012, 0.06);
    const floorPlate = new THREE.Mesh(floorPlateGeo, polymerTan);
    floorPlate.position.set(0, -0.21, 0.04);
    weapon.add(floorPlate);

    // === OPTICS / SIGHTS ===
    // Picatinny rail
    const topRailGeo = new THREE.BoxGeometry(0.028, 0.015, 0.35);
    const topRail = new THREE.Mesh(topRailGeo, metalMedium);
    topRail.position.set(0, 0.045, -0.05);
    weapon.add(topRail);

    // Rail grooves
    for (let i = 0; i < 12; i++) {
        const grooveGeo = new THREE.BoxGeometry(0.03, 0.004, 0.008);
        const groove = new THREE.Mesh(grooveGeo, metalDark);
        groove.position.set(0, 0.055, 0.1 - i * 0.028);
        weapon.add(groove);
    }

    // Front sight post
    const frontSightBase = new THREE.BoxGeometry(0.025, 0.025, 0.015);
    const frontBase = new THREE.Mesh(frontSightBase, metalDark);
    frontBase.position.set(0, 0.055, -0.28);
    weapon.add(frontBase);

    const frontPostGeo = new THREE.BoxGeometry(0.008, 0.035, 0.008);
    const frontPost = new THREE.Mesh(frontPostGeo, metalDark);
    frontPost.position.set(0, 0.08, -0.28);
    weapon.add(frontPost);

    // Rear sight
    const rearSightBase = new THREE.BoxGeometry(0.035, 0.02, 0.025);
    const rearBase = new THREE.Mesh(rearSightBase, metalDark);
    rearBase.position.set(0, 0.055, 0.06);
    weapon.add(rearBase);

    const rearApertureLeft = new THREE.BoxGeometry(0.008, 0.03, 0.01);
    const rearLeft = new THREE.Mesh(rearApertureLeft, metalDark);
    rearLeft.position.set(-0.012, 0.075, 0.06);
    weapon.add(rearLeft);

    const rearApertureRight = new THREE.BoxGeometry(0.008, 0.03, 0.01);
    const rearRight = new THREE.Mesh(rearApertureRight, metalDark);
    rearRight.position.set(0.012, 0.075, 0.06);
    weapon.add(rearRight);

    // === BOLT CATCH / CONTROLS ===
    const boltCatchGeo = new THREE.BoxGeometry(0.008, 0.02, 0.015);
    const boltCatch = new THREE.Mesh(boltCatchGeo, metalDark);
    boltCatch.position.set(-0.03, -0.02, 0.08);
    weapon.add(boltCatch);

    // Selector switch
    const selectorGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.015, 8);
    const selector = new THREE.Mesh(selectorGeo, metalDark);
    selector.rotation.z = Math.PI / 2;
    selector.position.set(-0.032, -0.015, 0.12);
    weapon.add(selector);

    updateWeaponPosition();
    weaponPivot.add(weapon);
    scene.add(camera);
}

function updateWeaponPosition() {
    // Get weapon config for per-weapon positions
    let hipPos, hipRot, adsPos, adsRot;

    if (typeof WeaponConfig !== 'undefined') {
        const config = WeaponConfig.getWeapon(gameState.currentWeapon);
        const handMult = gameState.weaponHand === 'right' ? 1 : -1;

        hipPos = {
            x: config.hipPosition.x * handMult,
            y: config.hipPosition.y,
            z: config.hipPosition.z
        };
        hipRot = {
            x: config.hipRotation.x,
            y: config.hipRotation.y * handMult,
            z: config.hipRotation.z
        };
        adsPos = config.ads.position;
        adsRot = config.ads.rotation;
    } else {
        // Legacy fallback
        const handOffset = gameState.weaponHand === 'right' ? 0.25 : -0.25;
        hipPos = { x: handOffset, y: -0.2, z: -0.4 };
        hipRot = { x: 0, y: gameState.weaponHand === 'right' ? 0.02 : -0.02, z: 0 };
        adsPos = { x: 0, y: -0.075, z: -0.08 };
        adsRot = { x: 0, y: 0, z: 0 };
    }

    // Interpolate between hip and ADS based on adsProgress
    const t = gameState.adsProgress;
    weapon.position.set(
        hipPos.x + (adsPos.x - hipPos.x) * t,
        hipPos.y + (adsPos.y - hipPos.y) * t,
        hipPos.z + (adsPos.z - hipPos.z) * t
    );
    weapon.rotation.set(
        hipRot.x + (adsRot.x - hipRot.x) * t,
        hipRot.y + (adsRot.y - hipRot.y) * t,
        hipRot.z + (adsRot.z - hipRot.z) * t
    );
}

function createTargets() {
    // Clear existing targets
    targets.forEach(t => scene.remove(t.mesh));
    targets = [];

    // Target configurations - position, size, points, requires stance
    const targetConfigs = [
        // Center targets (visible when standing)
        { pos: [0, 1.8, -15], size: 0.4, points: 100, minCrouch: 0, maxCrouch: 0.3 },
        { pos: [-2, 2.2, -12], size: 0.35, points: 150, minCrouch: 0, maxCrouch: 0.4 },
        { pos: [2, 2.0, -14], size: 0.35, points: 150, minCrouch: 0, maxCrouch: 0.5 },

        // Low targets (visible when crouching less / standing)
        { pos: [0, 0.8, -10], size: 0.3, points: 100, minCrouch: 0, maxCrouch: 0.6 },
        { pos: [-1.5, 0.6, -8], size: 0.25, points: 200, minCrouch: 0, maxCrouch: 0.5 },

        // Lean-required targets (behind side cover)
        { pos: [-4, 1.5, -12], size: 0.35, points: 200, minLean: -0.5, maxLean: -0.2 },
        { pos: [4, 1.5, -12], size: 0.35, points: 200, minLean: 0.2, maxLean: 0.5 },
        { pos: [-3.5, 2.5, -15], size: 0.3, points: 250, minLean: -0.7, maxLean: -0.3 },
        { pos: [3.5, 2.5, -15], size: 0.3, points: 250, minLean: 0.3, maxLean: 0.7 },

        // High value targets (require specific stance combo)
        { pos: [-5, 0.8, -10], size: 0.25, points: 300, minLean: -0.8, maxLean: -0.5, minCrouch: 0, maxCrouch: 0.3 },
        { pos: [5, 0.8, -10], size: 0.25, points: 300, minLean: 0.5, maxLean: 0.8, minCrouch: 0, maxCrouch: 0.3 },
    ];

    targetConfigs.forEach(config => {
        createTarget(config);
    });
}

function createTarget(config) {
    const geometry = new THREE.Group();

    // Target backing (white base)
    const backingGeometry = new THREE.CylinderGeometry(config.size, config.size, 0.02, 32);
    const backingMaterial = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
    const backing = new THREE.Mesh(backingGeometry, backingMaterial);
    backing.rotation.x = Math.PI / 2;
    geometry.add(backing);

    // Target rings using RingGeometry to avoid z-fighting
    // Rings are flat and placed at slightly different z positions
    const ringConfigs = [
        { inner: 0.7, outer: 1.0, color: 0xff0000 },   // Outer red
        { inner: 0.5, outer: 0.7, color: 0xffffff },   // White
        { inner: 0.3, outer: 0.5, color: 0xff0000 },   // Red
        { inner: 0.15, outer: 0.3, color: 0xffffff },  // White
        { inner: 0, outer: 0.15, color: 0xff0000 },    // Center red
    ];

    ringConfigs.forEach((ring, i) => {
        const ringGeometry = new THREE.RingGeometry(
            config.size * ring.inner,
            config.size * ring.outer,
            32
        );
        const ringMaterial = new THREE.MeshStandardMaterial({
            color: ring.color,
            side: THREE.DoubleSide
        });
        const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
        ringMesh.position.z = 0.011 + (i * 0.001); // Stack toward player (positive Z)
        geometry.add(ringMesh);
    });

    // Bullseye (yellow center dot)
    const bullseyeGeometry = new THREE.CircleGeometry(config.size * 0.06, 16);
    const bullseyeMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        side: THREE.DoubleSide
    });
    const bullseye = new THREE.Mesh(bullseyeGeometry, bullseyeMaterial);
    bullseye.position.z = 0.02; // In front of rings (toward player)
    geometry.add(bullseye);

    // Target stand (positioned behind target face)
    const standGeometry = new THREE.BoxGeometry(0.05, config.pos[1], 0.05);
    const standMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4a4a });
    const stand = new THREE.Mesh(standGeometry, standMaterial);
    stand.position.y = -config.pos[1] / 2;
    stand.position.z = -0.05; // Behind the target face
    geometry.add(stand);

    geometry.position.set(...config.pos);
    geometry.castShadow = true;
    scene.add(geometry);

    targets.push({
        mesh: geometry,
        config: config,
        hit: false,
        size: config.size
    });
}

// ============================================
// WEAPON SWITCHING
// ============================================
function switchWeapon(slot) {
    // Validate slot
    if (slot < 1 || slot > 6) return;
    if (gameState.isWeaponSwitching) return;

    // Get weapon for this slot
    if (typeof WeaponConfig === 'undefined') return;
    const newWeapon = WeaponConfig.getWeaponBySlot(slot);
    if (!newWeapon || newWeapon.id === gameState.currentWeapon) return;

    // Stop any current firing
    stopFiring();

    // Mark as switching (brief lockout)
    gameState.isWeaponSwitching = true;

    // Remove old weapon
    if (weapon && weaponPivot) {
        weaponPivot.remove(weapon);
        if (typeof WeaponFactory !== 'undefined') {
            WeaponFactory.disposeWeapon(weapon);
        }
    }

    // Update state
    gameState.currentWeapon = newWeapon.id;
    gameState.weaponSlot = slot;
    gameState.fireRateMs = newWeapon.fireRateMs;
    gameState.ADS_SPEED = newWeapon.ads.speed;
    gameState.ADS_FOV = newWeapon.ads.fov;

    // Check if current fire mode is allowed
    if (!WeaponConfig.isFireModeAllowed(newWeapon.id, gameState.fireMode)) {
        gameState.fireMode = newWeapon.defaultMode;
    }

    // Reset ADS
    gameState.isAiming = false;
    gameState.adsProgress = 0;

    // Create new weapon
    if (typeof WeaponFactory !== 'undefined') {
        weapon = WeaponFactory.createWeapon(newWeapon.id);
        weaponPivot.add(weapon);
        updateWeaponPosition();
    }

    // Update UI
    updateWeaponUI();
    updateFireModeUI();

    // Emit event
    if (typeof EventBus !== 'undefined') {
        EventBus.emit('weapon:switched', {
            weaponId: newWeapon.id,
            slot: slot,
        });
    }

    // Brief delay before allowing actions again
    setTimeout(() => {
        gameState.isWeaponSwitching = false;
    }, 200);
}

function updateWeaponUI() {
    const nameEl = document.getElementById('weapon-name');
    const slotEl = document.getElementById('weapon-slot');

    if (typeof WeaponConfig !== 'undefined') {
        const config = WeaponConfig.getWeapon(gameState.currentWeapon);
        if (nameEl) nameEl.textContent = config.name.toUpperCase();
        if (slotEl) slotEl.textContent = `[${config.slot}]`;
    } else {
        if (nameEl) nameEl.textContent = 'ASSAULT RIFLE';
        if (slotEl) slotEl.textContent = '[3]';
    }
}

// Fire mode functions
function toggleFireMode() {
    // Use WeaponConfig for allowed modes
    if (typeof WeaponConfig !== 'undefined') {
        const newMode = WeaponConfig.getNextAllowedFireMode(
            gameState.currentWeapon,
            gameState.fireMode
        );
        gameState.fireMode = newMode;
    } else {
        // Legacy fallback
        const modes = ['single', 'burst', 'auto'];
        const currentIndex = modes.indexOf(gameState.fireMode);
        gameState.fireMode = modes[(currentIndex + 1) % modes.length];
    }

    updateFireModeUI();
    stopFiring();
}

function updateFireModeUI() {
    const el = document.getElementById('fire-mode');
    if (el) {
        const modeText = {
            'single': 'SINGLE',
            'burst': 'BURST',
            'auto': 'AUTO'
        };
        el.textContent = `Fire: ${modeText[gameState.fireMode]} (${gameState.fireRateMs}ms)`;
    }
}

function startFiring() {
    if (gameState.isFiring) return;
    if (gameState.isWeaponSwitching) return;
    gameState.isFiring = true;

    // Always fire first shot immediately
    shoot();

    if (gameState.fireMode === 'single') {
        // Single fire - just the one shot
        gameState.isFiring = false;
    } else if (gameState.fireMode === 'burst') {
        // Burst fire - 3 shots total (already fired 1)
        gameState.burstCount = 2;
        gameState.fireInterval = setInterval(() => {
            if (gameState.burstCount > 0) {
                shoot();
                gameState.burstCount--;
            } else {
                stopFiring();
            }
        }, gameState.fireRateMs);
    } else if (gameState.fireMode === 'auto') {
        // Full auto - continuous fire while holding
        gameState.fireInterval = setInterval(() => {
            if (gameState.isFiring) {
                shoot();
            }
        }, gameState.fireRateMs);
    }
}

function stopFiring() {
    gameState.isFiring = false;
    if (gameState.fireInterval) {
        clearInterval(gameState.fireInterval);
        gameState.fireInterval = null;
    }
    gameState.burstCount = 0;
}

function setupEventListeners() {
    // Keyboard
    document.addEventListener('keydown', (e) => {
        gameState.keys[e.key.toLowerCase()] = true;

        // Hand switch with Tab
        if (e.key === 'Tab') {
            e.preventDefault();
            gameState.weaponHand = gameState.weaponHand === 'right' ? 'left' : 'right';
            updateWeaponPosition();
            document.getElementById('hand-value').textContent = gameState.weaponHand.toUpperCase();
        }

        // Fire mode toggle with B
        if (e.key.toLowerCase() === 'b') {
            toggleFireMode();
        }

        // Weapon switching with number keys 1-6
        if (e.key >= '1' && e.key <= '6') {
            switchWeapon(parseInt(e.key));
        }

        // Kill both players with O
        if (e.key.toLowerCase() === 'o') {
            if (netState.gameMode === 'online' && netState.opponent) {
                // Kill opponent
                netState.opponent.state.health = 0;
                sendPeerMessage({ type: 'hit', damage: 100, bodyPart: 'nuke' });

                // Kill self
                netState.health = 0;
                updateHealthUI();
                showDamageEffect();

                // Update scores - both die so no one scores
                console.log('NUKE: Both players killed!');
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        gameState.keys[e.key.toLowerCase()] = false;
    });

    // Mouse movement for looking
    document.addEventListener('mousemove', (e) => {
        if (!gameState.isRunning) return;

        // Only track mouse movement when pointer is locked
        if (document.pointerLockElement === renderer.domElement) {
            gameState.lookYaw += e.movementX * gameState.MOUSE_SENSITIVITY;
            gameState.lookPitch -= e.movementY * gameState.MOUSE_SENSITIVITY;

            // Clamp look angles (skip in noclip mode for full 360 freedom)
            if (!DebugConsole.debug.noclip) {
                gameState.lookYaw = Math.max(-gameState.LOOK_LIMIT_YAW, Math.min(gameState.LOOK_LIMIT_YAW, gameState.lookYaw));
                gameState.lookPitch = Math.max(-gameState.LOOK_LIMIT_PITCH, Math.min(gameState.LOOK_LIMIT_PITCH, gameState.lookPitch));
            } else {
                // In noclip, only clamp pitch to prevent flipping (but allow looking straight up/down)
                gameState.lookPitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, gameState.lookPitch));
            }
        }
    });

    // Shooting
    document.addEventListener('mousedown', (e) => {
        if (!gameState.isRunning) return;
        if (e.button === 0) {
            // Request pointer lock on first click if not locked
            if (document.pointerLockElement !== renderer.domElement) {
                renderer.domElement.requestPointerLock();
            } else {
                startFiring();
            }
        }
    });

    document.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
            stopFiring();
        }
    });

    // Aim down sights (right click toggle)
    document.addEventListener('mousedown', (e) => {
        if (!gameState.isRunning) return;
        if (e.button === 2) {
            e.preventDefault();
            gameState.isAiming = !gameState.isAiming;
        }
    });

    // Prevent context menu on right click
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    // Handle pointer lock change
    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement !== renderer.domElement) {
            // Pointer unlocked - could show pause menu
        }
    });

    // ESC to unlock pointer
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.pointerLockElement === renderer.domElement) {
            document.exitPointerLock();
        }
    });

    // Window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function applyRecoil() {
    const weapon = getWeaponProfile(gameState.currentWeapon);
    const recoil = weapon.recoil;
    const now = Date.now();

    // Time since last shot affects how much drift has reset
    const timeSinceLastShot = now - recoilState.lastShotTime;

    // Reset shot count if enough time passed (burst reset)
    if (timeSinceLastShot > 200) {
        recoilState.shotCount = 0;
    }

    // Decay drift momentum based on time between shots
    // Quick shots = drift compounds, slow shots = drift resets
    const driftDecay = Math.min(1, timeSinceLastShot / 500); // Full reset after 500ms
    recoilState.driftMomentum *= (1 - driftDecay);
    recoilState.driftDirection *= (1 - driftDecay * 0.5); // Direction decays slower

    // Get pattern multiplier based on shot count
    const patternIndex = Math.min(recoilState.shotCount, recoil.pattern.length - 1);
    const patternMult = recoil.pattern[patternIndex];

    // Calculate base recoil with noise
    const baseVerticalKick = recoil.verticalBase + recoilState.noise.signed() * recoil.verticalVariance;
    const baseHorizontalKick = recoilState.noise.signed() * recoil.horizontalVariance;

    // CUMULATIVE RECOIL: Scale recoil based on current offset magnitude
    // The further from center, the more the next shot kicks
    const currentOffsetMagnitude = Math.sqrt(
        recoilState.pitchOffset * recoilState.pitchOffset +
        recoilState.yawOffset * recoilState.yawOffset
    );
    const cumulativeMultiplier = 1 + currentOffsetMagnitude * 2; // Compounds based on current offset

    // Apply pattern and cumulative multiplier to vertical
    const verticalKick = baseVerticalKick * patternMult * cumulativeMultiplier;

    // DRIFT SYSTEM: Horizontal recoil tends to continue in same direction during rapid fire
    // Update drift direction based on this shot's random horizontal
    recoilState.driftDirection += baseHorizontalKick * 0.5;
    recoilState.driftDirection = Math.max(-1, Math.min(1, recoilState.driftDirection));

    // Build drift momentum during rapid fire
    recoilState.driftMomentum = Math.min(1, recoilState.driftMomentum + 0.15);

    // Horizontal kick is a blend of random and drift direction
    // More rapid fire = more drift influence
    const driftInfluence = recoilState.driftMomentum * 0.7;
    const randomInfluence = 1 - driftInfluence;
    const horizontalKick = (
        baseHorizontalKick * randomInfluence +
        recoilState.driftDirection * recoil.horizontalVariance * driftInfluence
    ) * cumulativeMultiplier;

    // Apply to camera offset (compounds from current position)
    recoilState.pitchOffset += verticalKick;
    recoilState.yawOffset += horizontalKick;

    // Apply visual weapon kick
    recoilState.weaponKickBack = recoil.weaponKickBack;
    recoilState.weaponKickUp = recoil.weaponKickUp;
    recoilState.weaponKickSide = recoilState.noise.signed() * 0.01;

    // Update counters
    recoilState.shotCount++;
    recoilState.lastShotTime = now;
}

function updateRecoil(deltaTime) {
    const weapon = getWeaponProfile(gameState.currentWeapon);
    const recovery = weapon.recoil.recovery;

    // Recover camera recoil
    recoilState.pitchOffset *= Math.pow(0.1, deltaTime * recovery);
    recoilState.yawOffset *= Math.pow(0.1, deltaTime * recovery);

    // Recover visual weapon kick (faster)
    recoilState.weaponKickBack *= Math.pow(0.01, deltaTime * 10);
    recoilState.weaponKickUp *= Math.pow(0.01, deltaTime * 10);
    recoilState.weaponKickSide *= Math.pow(0.01, deltaTime * 10);

    // Decay drift momentum and direction over time (slower than recoil recovery)
    recoilState.driftMomentum *= Math.pow(0.3, deltaTime * recovery * 0.5);
    recoilState.driftDirection *= Math.pow(0.5, deltaTime * recovery * 0.3);

    // Clamp small values to zero
    if (Math.abs(recoilState.pitchOffset) < 0.0001) recoilState.pitchOffset = 0;
    if (Math.abs(recoilState.yawOffset) < 0.0001) recoilState.yawOffset = 0;
    if (Math.abs(recoilState.driftMomentum) < 0.001) recoilState.driftMomentum = 0;
    if (Math.abs(recoilState.driftDirection) < 0.001) recoilState.driftDirection = 0;
}

function shoot() {
    // Emit weapon fired event
    if (typeof EventBus !== 'undefined') {
        EventBus.emit(GameEvents.WEAPON_FIRED, {
            weapon: gameState.currentWeapon,
            position: camera.position.clone(),
            direction: camera.getWorldDirection(new THREE.Vector3()),
        });
    }

    // Gunshot sound
    AudioSystem.playGunshot();

    // Apply recoil
    applyRecoil();

    // Check if this is a projectile weapon (like RPG)
    if (typeof WeaponConfig !== 'undefined') {
        const weaponConfig = WeaponConfig.getWeapon(gameState.currentWeapon);
        if (weaponConfig.projectile) {
            fireProjectile(weaponConfig);
            return; // Don't do hitscan for projectile weapons
        }

        // Check if this is a pellet weapon (like shotgun)
        if (weaponConfig.damage.pellets) {
            firePellets(weaponConfig);
            return; // Don't do single hitscan for pellet weapons
        }
    }

    // Raycast from camera center (start past the weapon to avoid self-intersection)
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    raycaster.near = 1; // Start ray 1 unit from camera (past the weapon model)

    // Track shot result for network sync
    let hitOpponent = false;
    let shotTargetX = 0;
    let shotTargetY = 1.2;

    // Check hits on opponent (multiplayer) - but cover can block shots
    if (netState.gameMode === 'online' && netState.opponent && netState.opponent.mesh) {
        // Get all solid objects that can block shots (cover, walls, etc.)
        const blockingObjects = [];
        scene.traverse((obj) => {
            if (obj.isMesh && !obj.userData.isOpponent && !obj.userData.isTarget &&
                !obj.userData.isDecal && obj !== ground && obj.visible) {
                blockingObjects.push(obj);
            }
        });

        // Check opponent hit distance
        const opponentIntersects = raycaster.intersectObject(netState.opponent.mesh, true);

        if (opponentIntersects.length > 0) {
            const opponentHit = opponentIntersects[0];
            const opponentDistance = opponentHit.distance;

            // Check if any cover blocks the shot
            const coverIntersects = raycaster.intersectObjects(blockingObjects, true);
            let blocked = false;

            if (coverIntersects.length > 0) {
                const coverDistance = coverIntersects[0].distance;
                if (coverDistance < opponentDistance) {
                    // Cover blocks the shot - create hit mark on cover instead
                    blocked = true;
                    const coverHit = coverIntersects[0];
                    if (coverHit.face) {
                        const worldNormal = coverHit.face.normal.clone();
                        if (coverHit.object.matrixWorld) {
                            worldNormal.transformDirection(coverHit.object.matrixWorld);
                        }
                        createHitMark(coverHit.point.clone(), worldNormal, 'player-blocked-by-cover');
                    }
                }
            }

            if (!blocked) {
                // Hit opponent! Check which body part was hit
                const hitObject = opponentHit.object;
                const bodyPart = hitObject.userData.bodyPart || 'body';
                // Use WeaponConfig for weapon-specific damage, fall back to DamageConfig
                let damage;
                if (typeof WeaponConfig !== 'undefined') {
                    damage = WeaponConfig.getDamage(gameState.currentWeapon, bodyPart);
                } else if (typeof DamageConfig !== 'undefined') {
                    damage = DamageConfig.getDamage(bodyPart);
                } else {
                    damage = hitObject.userData.damage || 10;
                }

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

                sendHit(damage, bodyPart);
                showHitMarker(bodyPart, hitPoint, hitObject);
                AudioSystem.playImpactPlayer();

                // Create blood splatter at hit point
                createBloodSplatter(hitPoint, hitDirection);

                // Emit blood effects events
                if (typeof EventBus !== 'undefined') {
                    EventBus.emit(GameEvents.EFFECT_BLOOD_SPLATTER, {
                        position: hitPoint,
                        direction: hitDirection,
                    });
                }

                // Also create blood on the opponent mesh
                if (opponentHit.face) {
                    const worldNormal = opponentHit.face.normal.clone();
                    if (opponentHit.object.matrixWorld) {
                        worldNormal.transformDirection(opponentHit.object.matrixWorld);
                    }
                    createBloodDecal(hitPoint, worldNormal.negate());

                    if (typeof EventBus !== 'undefined') {
                        EventBus.emit(GameEvents.EFFECT_BLOOD_DECAL, {
                            position: hitPoint,
                            normal: worldNormal.negate(),
                        });
                    }
                }

                // Send shoot event with hit info
                sendShoot(true, hitPoint, false);
                return; // Don't check practice targets
            }
        }
    }

    // Send shoot event for misses (calculate where the shot went)
    const shootDir = raycaster.ray.direction.clone();
    const missPoint = raycaster.ray.origin.clone().add(shootDir.multiplyScalar(20));
    sendShoot(false, missPoint, false);

    // Check hits on practice targets (offline mode)
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

    if (hitTarget) {
        // Hit!
        hitTarget.hit = true;
        gameState.score += hitTarget.config.points;
        document.getElementById('score-value').textContent = gameState.score;

        // Hit marker
        const hitMarker = document.getElementById('hit-marker');
        hitMarker.classList.remove('show');
        void hitMarker.offsetWidth;
        hitMarker.classList.add('show');

        // Play target impact sound (no hit mark - target disappears anyway)
        AudioSystem.playImpactTarget();

        // Animate target falling
        animateTargetHit(hitTarget);

        // Check if all targets hit
        if (targets.every(t => t.hit)) {
            setTimeout(() => {
                // Respawn targets
                createTargets();
            }, 2000);
        }
        return;
    }

    // Missed all targets - check for environment hit marks
    const envObjects = [ground, cover];
    // Add walls and boxes from the scene
    scene.traverse((obj) => {
        if (obj.isMesh && obj !== ground && obj !== cover &&
            !obj.userData.isOpponent && !obj.userData.isTarget && !obj.userData.isDecal) {
            envObjects.push(obj);
        }
    });

    const envIntersects = raycaster.intersectObjects(envObjects, true);
    if (envIntersects.length > 0) {
        const hit = envIntersects[0];
        if (hit.face) {
            const worldNormal = hit.face.normal.clone();
            if (hit.object.matrixWorld) {
                worldNormal.transformDirection(hit.object.matrixWorld);
            }
            createHitMark(hit.point.clone(), worldNormal, 'player-environment');

            // Play impact sound based on surface type
            const hitObj = hit.object;
            if (hitObj === cover || hitObj.material?.color?.getHex() === 0xff8800) {
                // Orange barrier
                AudioSystem.playImpactBarrier();
            } else {
                // Wall/ground/concrete
                AudioSystem.playImpactWall();
            }
        }
    }
}

function animateTargetHit(target) {
    const startRotation = target.mesh.rotation.x;
    const startTime = Date.now();
    const duration = 500;

    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing
        const eased = 1 - Math.pow(1 - progress, 3);

        target.mesh.rotation.x = startRotation + eased * (Math.PI / 2);
        target.mesh.position.y -= eased * 0.02;

        // Fade out
        target.mesh.traverse(child => {
            if (child.material) {
                child.material.transparent = true;
                child.material.opacity = 1 - eased;
            }
        });

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }

    animate();
}

function updateStance(deltaTime) {
    // Handle noclip movement
    if (DebugConsole.debug.noclip) {
        const flySpeed = 10; // Units per second
        const pos = DebugConsole.debug.noclipPos;

        // Calculate forward/right vectors based on camera look direction
        const yaw = gameState.lookYaw;
        const pitch = gameState.lookPitch;

        // Forward vector (in XZ plane)
        const forwardX = Math.sin(yaw);
        const forwardZ = -Math.cos(yaw);

        // Right vector
        const rightX = Math.cos(yaw);
        const rightZ = Math.sin(yaw);

        // WASD movement
        if (gameState.keys['w']) {
            pos.x += forwardX * flySpeed * deltaTime;
            pos.z += forwardZ * flySpeed * deltaTime;
            pos.y -= Math.sin(pitch) * flySpeed * deltaTime;
        }
        if (gameState.keys['s']) {
            pos.x -= forwardX * flySpeed * deltaTime;
            pos.z -= forwardZ * flySpeed * deltaTime;
            pos.y += Math.sin(pitch) * flySpeed * deltaTime;
        }
        if (gameState.keys['a']) {
            pos.x -= rightX * flySpeed * deltaTime;
            pos.z -= rightZ * flySpeed * deltaTime;
        }
        if (gameState.keys['d']) {
            pos.x += rightX * flySpeed * deltaTime;
            pos.z += rightZ * flySpeed * deltaTime;
        }

        // Space/Shift for up/down
        if (gameState.keys[' ']) {
            pos.y += flySpeed * deltaTime;
        }
        if (gameState.keys['shift']) {
            pos.y -= flySpeed * deltaTime;
        }

        return; // Skip normal stance updates
    }

    // Update target crouch based on input (W/S)
    if (gameState.keys['s']) {
        gameState.targetCrouch = Math.min(1, gameState.targetCrouch + gameState.CROUCH_SPEED * deltaTime);
    } else if (gameState.keys['w']) {
        gameState.targetCrouch = Math.max(0, gameState.targetCrouch - gameState.CROUCH_SPEED * deltaTime);
    }

    // Update target lean based on input (Q/E) - persistent like crouch
    if (gameState.keys['q']) {
        gameState.targetLean = Math.max(-1, gameState.targetLean - gameState.LEAN_SPEED * deltaTime);
    } else if (gameState.keys['e']) {
        gameState.targetLean = Math.min(1, gameState.targetLean + gameState.LEAN_SPEED * deltaTime);
    }

    // Reset stance with R key
    if (gameState.keys['r']) {
        gameState.targetCrouch = 0;
        gameState.targetLean = 0;
        gameState.targetStrafe = 0;
    }

    // Update target strafe based on input (A/D)
    if (gameState.keys['a']) {
        gameState.targetStrafe = Math.max(-1, gameState.targetStrafe - gameState.STRAFE_SPEED * deltaTime);
    } else if (gameState.keys['d']) {
        gameState.targetStrafe = Math.min(1, gameState.targetStrafe + gameState.STRAFE_SPEED * deltaTime);
    } else {
        // Return to center when not strafing (optional - remove if you want position to hold)
        // For now, strafe position holds until you move the other way
    }

    // Smooth interpolation
    gameState.crouch += (gameState.targetCrouch - gameState.crouch) * gameState.STANCE_SMOOTHING * deltaTime;
    gameState.lean += (gameState.targetLean - gameState.lean) * gameState.STANCE_SMOOTHING * deltaTime;
    gameState.strafe += (gameState.targetStrafe - gameState.strafe) * gameState.STANCE_SMOOTHING * deltaTime;

    // Clamp values
    gameState.crouch = Math.max(0, Math.min(1, gameState.crouch));
    gameState.lean = Math.max(-1, Math.min(1, gameState.lean));
    gameState.strafe = Math.max(-1, Math.min(1, gameState.strafe));

    // Update HUD
    document.getElementById('crouch-fill').style.width = `${(1 - gameState.crouch) * 100}%`;

    // Lean indicator - center is 50%, goes 0-100%
    const leanPercent = (gameState.lean + 1) / 2 * 100;
    const leanFill = document.getElementById('lean-fill');
    if (gameState.lean < 0) {
        leanFill.style.width = `${50 - leanPercent}%`;
        leanFill.style.marginLeft = `${leanPercent}%`;
    } else {
        leanFill.style.width = `${leanPercent - 50}%`;
        leanFill.style.marginLeft = '50%';
    }
}

function updateCamera() {
    // Handle noclip camera position
    if (DebugConsole.debug.noclip) {
        const pos = DebugConsole.debug.noclipPos;
        camera.position.x = pos.x;
        camera.position.y = pos.y;
        camera.position.z = pos.z;

        // Apply mouse look rotation (no recoil in noclip)
        camera.rotation.y = -gameState.lookYaw;
        camera.rotation.x = gameState.lookPitch;
        camera.rotation.z = 0;
        return;
    }

    // Base position
    const baseY = gameState.BASE_HEIGHT - (gameState.crouch * gameState.CROUCH_AMOUNT);
    const leanX = gameState.lean * gameState.LEAN_AMOUNT;
    const strafeX = gameState.strafe * gameState.STRAFE_AMOUNT;

    // Apply position (strafe is world position, lean is local offset)
    camera.position.y = baseY;
    camera.position.x = strafeX + leanX;

    // Apply mouse look rotation + recoil offset
    camera.rotation.y = -gameState.lookYaw + recoilState.yawOffset;
    camera.rotation.x = gameState.lookPitch + recoilState.pitchOffset;

    // Tilt camera when leaning (add to z rotation)
    camera.rotation.z = -gameState.lean * gameState.LEAN_TILT;

    // Small camera sway for life (add subtle sway)
    const time = Date.now() * 0.001;
    camera.rotation.x += Math.sin(time * 0.5) * 0.002;
    camera.rotation.y += Math.sin(time * 0.3) * 0.002;
}

function updateWeapon(deltaTime) {
    // Update ADS progress (smooth transition)
    const adsTarget = gameState.isAiming ? 1 : 0;
    const adsDiff = adsTarget - gameState.adsProgress;
    gameState.adsProgress += adsDiff * gameState.ADS_SPEED * deltaTime;
    gameState.adsProgress = Math.max(0, Math.min(1, gameState.adsProgress));

    // Update weapon position based on ADS
    updateWeaponPosition();

    // Update camera FOV for zoom effect
    const targetFOV = gameState.DEFAULT_FOV - (gameState.DEFAULT_FOV - gameState.ADS_FOV) * gameState.adsProgress;
    camera.fov = targetFOV;
    camera.updateProjectionMatrix();

    // Hide crosshair when aiming down sights
    const crosshair = document.getElementById('crosshair');
    if (crosshair) {
        crosshair.style.opacity = 1 - gameState.adsProgress;
    }

    // Update spread circle (hip-fire accuracy indicator)
    const spreadCircle = document.getElementById('spread-circle');
    if (spreadCircle) {
        // Base spread size (pixels)
        const baseSize = 50;
        // Movement penalty - spread increases with strafing and leaning
        const movementPenalty = Math.abs(gameState.strafe) * 20 + Math.abs(gameState.lean) * 15;
        // Calculate final spread size
        const spreadSize = baseSize + movementPenalty;

        spreadCircle.style.width = `${spreadSize}px`;
        spreadCircle.style.height = `${spreadSize}px`;

        // Hide during ADS
        if (gameState.adsProgress > 0.3) {
            spreadCircle.classList.add('ads-hidden');
        } else {
            spreadCircle.classList.remove('ads-hidden');
        }
    }

    // Show sniper scope when ADS with sniper
    const sniperScope = document.getElementById('sniper-scope');
    const sniperScopeActive = gameState.currentWeapon === 'sniper' && gameState.adsProgress > 0.8;
    if (sniperScope) {
        if (sniperScopeActive) {
            sniperScope.classList.add('active');
        } else {
            sniperScope.classList.remove('active');
        }
    }

    // Hide weapon model when looking through sniper scope
    if (weapon) {
        weapon.visible = !sniperScopeActive;
    }

    // Weapon sway based on lean (reduced when aiming)
    const swayMultiplier = 1 - gameState.adsProgress * 0.7;
    const leanSway = gameState.lean * 0.1 * swayMultiplier;
    const crouchOffset = gameState.crouch * 0.05;

    // Apply visual recoil kick (reduced when aiming)
    const recoilMultiplier = 1 - gameState.adsProgress * 0.4;
    weaponPivot.rotation.x = -recoilState.weaponKickUp * recoilMultiplier;
    weaponPivot.rotation.z = leanSway + recoilState.weaponKickSide * recoilMultiplier;
    weaponPivot.position.z = recoilState.weaponKickBack * recoilMultiplier;
    weaponPivot.position.y = -crouchOffset - recoilState.weaponKickUp * 0.5 * recoilMultiplier;

    // Breathing sway (reduced when aiming)
    const time = Date.now() * 0.001;
    const breathMultiplier = 1 - gameState.adsProgress * 0.8;
    weaponPivot.position.x = Math.sin(time * 1.5) * 0.003 * breathMultiplier;
    weaponPivot.position.y += Math.sin(time * 1.2) * 0.002 * breathMultiplier;
}

let lastTime = Date.now();

// State sync throttle
let lastStateSend = 0;
const STATE_SEND_RATE = 1000 / 60; // 60 times per second

// Aimbot - auto-aim at opponent's head
function updateAimbot() {
    if (!DebugConsole.debug.aimbot) return;
    if (!netState.opponent || !netState.opponent.mesh) return;

    // Get opponent's head position
    const opponentMesh = netState.opponent.mesh;
    const headHeight = 1.2; // Aim at upper chest/neck area for reliable hits
    const headPos = new THREE.Vector3(
        opponentMesh.position.x,
        opponentMesh.position.y + headHeight,
        opponentMesh.position.z
    );

    // Get camera world position
    const camPos = new THREE.Vector3();
    camera.getWorldPosition(camPos);

    // Calculate direction to head
    const direction = new THREE.Vector3().subVectors(headPos, camPos);

    // Calculate yaw (horizontal angle) - note: Three.js forward is -Z
    const yaw = Math.atan2(direction.x, -direction.z);

    // Calculate pitch (vertical angle)
    const horizontalDist = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
    const pitch = Math.atan2(direction.y, horizontalDist);

    // Smoothly interpolate to target (instant snap feels too jarring)
    const smoothSpeed = 15;
    const deltaTime = 1/60; // Approximate frame time
    gameState.lookYaw += (yaw - gameState.lookYaw) * smoothSpeed * deltaTime;
    gameState.lookPitch += (pitch - gameState.lookPitch) * smoothSpeed * deltaTime;

    // Clamp pitch (skip in noclip mode)
    if (!DebugConsole.debug.noclip) {
        gameState.lookPitch = Math.max(-gameState.LOOK_LIMIT_PITCH, Math.min(gameState.LOOK_LIMIT_PITCH, gameState.lookPitch));
    }
}

function animate() {
    requestAnimationFrame(animate);

    const now = Date.now();
    const deltaTime = (now - lastTime) / 1000;
    lastTime = now;

    if (gameState.isRunning) {
        updateAimbot();
        updateStance(deltaTime);
        updateRecoil(deltaTime);
        updateCamera();
        updateWeapon(deltaTime);

        // Update opponent in multiplayer
        if (netState.opponent) {
            updateOpponentMesh(netState.opponent, deltaTime);
        }

        // Send state updates to server (throttled)
        if (netState.status === 'playing' && now - lastStateSend > STATE_SEND_RATE) {
            sendStateUpdate();
            lastStateSend = now;
        }
    }

    // Update blood particles and hit marks (runs even when paused for cleanup)
    updateBloodParticles(deltaTime);

    // Update projectiles (rockets, etc.)
    updateProjectiles(deltaTime);

    // Update debug console visuals
    DebugConsole.update();

    // Update debug hit indicators (tracked body part labels)
    updateDebugHitIndicators();

    renderer.render(scene, camera);
}

// Clear and rebuild map if selection changed
function reinitializeMap() {
    // Check if map needs to change
    if (gameState.currentMap === selectedMap) return;

    // Update current map
    gameState.currentMap = selectedMap;

    // Remove old map objects
    mapObjects.forEach(obj => {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(m => m.dispose());
            } else {
                obj.material.dispose();
            }
        }
    });
    mapObjects = [];

    // Remove old lights
    mapLights.forEach(light => scene.remove(light));
    mapLights = [];

    // Get new map config
    const mapConfig = typeof MapConfig !== 'undefined' ? MapConfig.getMap(gameState.currentMap) : null;

    // Update scene background and fog
    if (mapConfig?.scene) {
        scene.background = new THREE.Color(mapConfig.scene.background);
        scene.fog = new THREE.FogExp2(mapConfig.scene.fogColor, mapConfig.scene.fogDensity);
    }

    // Recreate lighting
    const lightConfig = mapConfig?.lighting || {
        hemisphere: { skyColor: 0x8899aa, groundColor: 0x554433, intensity: 0.4 },
        ambient: { color: 0x404050, intensity: 0.3 },
        directional: { color: 0xffeedd, intensity: 1.0, position: [10, 25, 5] },
        fill: { color: 0x8899bb, intensity: 0.3, position: [-8, 10, -5] },
        accents: []
    };

    const hemiLight = new THREE.HemisphereLight(lightConfig.hemisphere.skyColor, lightConfig.hemisphere.groundColor, lightConfig.hemisphere.intensity);
    scene.add(hemiLight);
    mapLights.push(hemiLight);

    const ambientLight = new THREE.AmbientLight(lightConfig.ambient.color, lightConfig.ambient.intensity);
    scene.add(ambientLight);
    mapLights.push(ambientLight);

    const directionalLight = new THREE.DirectionalLight(lightConfig.directional.color, lightConfig.directional.intensity);
    directionalLight.position.set(...lightConfig.directional.position);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 60;
    directionalLight.shadow.camera.left = -25;
    directionalLight.shadow.camera.right = 25;
    directionalLight.shadow.camera.top = 25;
    directionalLight.shadow.camera.bottom = -25;
    directionalLight.shadow.bias = -0.0005;
    directionalLight.shadow.normalBias = 0.02;
    scene.add(directionalLight);
    mapLights.push(directionalLight);

    const fillLight = new THREE.DirectionalLight(lightConfig.fill.color, lightConfig.fill.intensity);
    fillLight.position.set(...lightConfig.fill.position);
    scene.add(fillLight);
    mapLights.push(fillLight);

    if (lightConfig.accents) {
        lightConfig.accents.forEach(accent => {
            if (accent.type === 'point') {
                const light = new THREE.PointLight(accent.color, accent.intensity, accent.distance);
                light.position.set(...accent.position);
                scene.add(light);
                mapLights.push(light);
            }
        });
    }

    // Recreate environment and cover
    createEnvironment();
    createCover();
}

function startGame(mode = 'offline') {
    // Reinitialize map if selection changed
    reinitializeMap();

    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('menu-button').style.display = 'block';
    gameState.isRunning = true;

    // Initialize audio on first user interaction
    AudioSystem.init();

    if (mode === 'online') {
        // Recreate cover with correct positions for this player's slot
        recreateCoverForSlot();

        // Create opponent for P2P game
        const opponentSlot = netState.playerSlot === 0 ? 1 : 0;
        netState.opponent = new OpponentPlayer(opponentSlot);
        createOpponentMesh(netState.opponent);
        hideTargets();

        // Reset health and scores for new game
        netState.health = 100;
        netState.scores = [0, 0];
        updateHealthUI();
        updateScoreUI();
    }
}

// Recreate cover barriers for multiplayer (swaps positions based on player slot)
function recreateCoverForSlot() {
    // Remove existing cover meshes
    const toRemove = [];
    scene.traverse((obj) => {
        if (obj.isMesh && obj.material?.color?.getHex() === 0xff8800) {
            toRemove.push(obj);
        }
    });
    toRemove.forEach(obj => {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
    });

    // Recreate with correct slot-based positions
    createCover();
}

function startOnlineGame() {
    // Called after P2P connection is established
    startGame('online');
    updateNetworkUI();
}

function startOfflineGame() {
    startGame('offline');
}

// Toggle sound on/off
function toggleSound() {
    const muted = AudioSystem.toggleMute();
    const el = document.getElementById('sound-toggle');
    if (el) {
        el.textContent = muted ? 'Sound: OFF' : 'Sound: ON';
    }
}

// Initialize on load
window.addEventListener('load', init);
