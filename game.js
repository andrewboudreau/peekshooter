// Peek Shooter - Main Game Logic

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

// ============================================
// AUDIO SYSTEM - Procedural sound effects
// ============================================
const AudioSystem = {
    ctx: null,
    masterGain: null,
    initialized: false,
    muted: false,

    // Toggle mute
    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : 0.3;
        }
        return this.muted;
    },

    // Initialize audio context (must be called after user interaction)
    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3; // Master volume
            this.masterGain.connect(this.ctx.destination);
            this.initialized = true;
            console.log('Audio system initialized');
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    },

    // Resume audio context if suspended (browser autoplay policy)
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    // Gunshot sound - sharp crack with punch
    playGunshot() {
        if (!this.initialized) return;
        this.resume();

        const ctx = this.ctx;
        const now = ctx.currentTime;

        // HIGH CRACK - sharp transient noise burst
        const crackBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
        const crackData = crackBuffer.getChannelData(0);
        for (let i = 0; i < crackData.length; i++) {
            // Aggressive noise with fast decay baked in
            const decay = Math.exp(-i / (ctx.sampleRate * 0.008));
            crackData[i] = (Math.random() * 2 - 1) * decay;
        }

        const crack = ctx.createBufferSource();
        crack.buffer = crackBuffer;

        // Very high pass for the snap
        const crackFilter = ctx.createBiquadFilter();
        crackFilter.type = 'highpass';
        crackFilter.frequency.value = 2500;
        crackFilter.Q.value = 0.7;

        const crackGain = ctx.createGain();
        crackGain.gain.setValueAtTime(1.2, now);
        crackGain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);

        crack.connect(crackFilter);
        crackFilter.connect(crackGain);
        crackGain.connect(this.masterGain);

        // MID BODY - gives the shot some presence
        const bodyBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
        const bodyData = bodyBuffer.getChannelData(0);
        for (let i = 0; i < bodyData.length; i++) {
            bodyData[i] = (Math.random() * 2 - 1);
        }

        const body = ctx.createBufferSource();
        body.buffer = bodyBuffer;

        const bodyFilter = ctx.createBiquadFilter();
        bodyFilter.type = 'bandpass';
        bodyFilter.frequency.value = 800;
        bodyFilter.Q.value = 1.5;

        const bodyGain = ctx.createGain();
        bodyGain.gain.setValueAtTime(0.6, now);
        bodyGain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

        body.connect(bodyFilter);
        bodyFilter.connect(bodyGain);
        bodyGain.connect(this.masterGain);

        // LOW THUMP - weight and punch
        const thump = ctx.createOscillator();
        thump.type = 'sine';
        thump.frequency.setValueAtTime(120, now);
        thump.frequency.exponentialRampToValueAtTime(35, now + 0.08);

        const thumpGain = ctx.createGain();
        thumpGain.gain.setValueAtTime(0.9, now);
        thumpGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        thump.connect(thumpGain);
        thumpGain.connect(this.masterGain);

        // Play all layers
        crack.start(now);
        crack.stop(now + 0.04);
        body.start(now);
        body.stop(now + 0.08);
        thump.start(now);
        thump.stop(now + 0.12);
    },

    // Hit marker sound - satisfying tick
    playHitMarker() {
        if (!this.initialized) return;
        this.resume();

        const ctx = this.ctx;
        const now = ctx.currentTime;

        // High ping
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = 1800;

        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = 2400;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.masterGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.1);
        osc2.stop(now + 0.1);
    },

    // Damage taken sound - low thud
    playDamage() {
        if (!this.initialized) return;
        this.resume();

        const ctx = this.ctx;
        const now = ctx.currentTime;

        // Low impact thump
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        // Distortion for grit
        const distortion = ctx.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
            const x = (i / 128) - 1;
            curve[i] = Math.tanh(x * 2);
        }
        distortion.curve = curve;

        osc.connect(distortion);
        distortion.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.25);
    },

    // Kill sound - dramatic confirmation
    playKill() {
        if (!this.initialized) return;
        this.resume();

        const ctx = this.ctx;
        const now = ctx.currentTime;

        // Descending tone
        const osc1 = ctx.createOscillator();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(600, now);
        osc1.frequency.setValueAtTime(500, now + 0.1);
        osc1.frequency.setValueAtTime(400, now + 0.2);

        // Higher harmony
        const osc2 = ctx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(900, now);
        osc2.frequency.setValueAtTime(750, now + 0.1);
        osc2.frequency.setValueAtTime(600, now + 0.2);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.setValueAtTime(0.25, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        // Filter for less harsh square wave
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2000;

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.35);
        osc2.stop(now + 0.35);
    },

    // Death sound - for when you die
    playDeath() {
        if (!this.initialized) return;
        this.resume();

        const ctx = this.ctx;
        const now = ctx.currentTime;

        // Low descending tone
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.5);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.6);
    },

    // Impact: Target (metal ping - short and satisfying)
    playImpactTarget() {
        if (!this.initialized) return;
        this.resume();

        const ctx = this.ctx;
        const now = ctx.currentTime;

        // Short metallic ping - lowered frequencies, quick decay
        const osc1 = ctx.createOscillator();
        osc1.type = 'triangle'; // Softer than sine
        osc1.frequency.value = 600 + Math.random() * 100;

        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.value = 1400 + Math.random() * 150;

        // Quick attack/decay envelope
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

        // Lowpass to remove harsh highs
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2000;

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.08);
        osc2.stop(now + 0.08);
    },

    // Impact: Player (flesh thud)
    playImpactPlayer() {
        if (!this.initialized) return;
        this.resume();

        const ctx = this.ctx;
        const now = ctx.currentTime;

        // Short noise burst (splat)
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.015));
        }

        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        // Low pass for muffled impact
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 600;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        // Low thump
        const thump = ctx.createOscillator();
        thump.type = 'sine';
        thump.frequency.setValueAtTime(100, now);
        thump.frequency.exponentialRampToValueAtTime(50, now + 0.06);

        const thumpGain = ctx.createGain();
        thumpGain.gain.setValueAtTime(0.4, now);
        thumpGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        thump.connect(thumpGain);
        thumpGain.connect(this.masterGain);

        noise.start(now);
        noise.stop(now + 0.08);
        thump.start(now);
        thump.stop(now + 0.1);
    },

    // Impact: Barrier (solid construction thud)
    playImpactBarrier() {
        if (!this.initialized) return;
        this.resume();

        const ctx = this.ctx;
        const now = ctx.currentTime;

        // Punchy mid-frequency thud
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        // Add some grit
        const distortion = ctx.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
            const x = (i / 128) - 1;
            curve[i] = Math.tanh(x * 1.5);
        }
        distortion.curve = curve;

        osc.connect(distortion);
        distortion.connect(gain);
        gain.connect(this.masterGain);

        // Short noise for texture
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = (Math.random() * 2 - 1);
        }

        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 400;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.25, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.12);
        noise.start(now);
        noise.stop(now + 0.04);
    },

    // Impact: Wall/concrete (hard surface)
    playImpactWall() {
        if (!this.initialized) return;
        this.resume();

        const ctx = this.ctx;
        const now = ctx.currentTime;

        // Sharp crack/chip sound
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.025, ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.006));
        }

        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        // Highpass for crisp impact
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1500;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.35, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        // Low thud for weight
        const thud = ctx.createOscillator();
        thud.type = 'sine';
        thud.frequency.setValueAtTime(90, now);
        thud.frequency.exponentialRampToValueAtTime(40, now + 0.05);

        const thudGain = ctx.createGain();
        thudGain.gain.setValueAtTime(0.3, now);
        thudGain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);

        thud.connect(thudGain);
        thudGain.connect(this.masterGain);

        noise.start(now);
        noise.stop(now + 0.04);
        thud.start(now);
        thud.stop(now + 0.08);
    },
};

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
        godMode: false,
        hitboxHelpers: [],
        healthLabels: [],
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
                this.log('  god [on|off] - Toggle god mode (invincible)', 'info');
                this.log('  bot [on|off] - Toggle bot opponent (walks, peeks, shoots)', 'info');
                this.log('  kill - Kill yourself', 'info');
                this.log('  heal - Restore health to 100', 'info');
                this.log('  clear - Clear console', 'info');
                this.log('  status - Show game state', 'info');
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

            case 'god':
                const godState = args[0] === 'off' ? false : args[0] === 'on' ? true : !this.debug.godMode;
                this.debug.godMode = godState;
                this.log(godState ? 'God mode ON - You are invincible' : 'God mode OFF', godState ? 'success' : 'warn');
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
                if (netState.gameMode === 'online') {
                    netState.health = 0;
                    updateHealthUI();
                    showDeathScreen();
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
                    const box = new THREE.BoxHelper(child, this.getHitboxColor(child.userData.bodyPart));
                    scene.add(box);
                    this.debug.hitboxHelpers.push(box);
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
        // Update hitbox positions
        if (this.debug.showHitboxes) {
            this.debug.hitboxHelpers.forEach(helper => helper.update());
        }

        // Update health labels
        if (this.debug.showHealth && netState.opponent && netState.opponent.mesh) {
            this.updateHealthLabel(netState.opponent);
        }

        // Update bot AI
        if (this.bot.enabled) {
            this.updateBot();
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

        // Show muzzle flash
        showOpponentMuzzleFlash(netState.opponent);

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
// WEAPON PROFILES - Configurable recoil patterns
// ============================================
const WEAPON_PROFILES = {
    assault_rifle: {
        name: 'Assault Rifle',
        // Recoil characteristics
        recoil: {
            // Vertical kick per shot
            verticalBase: 0.025,
            verticalVariance: 0.008,

            // Horizontal drift per shot
            horizontalBase: 0,
            horizontalVariance: 0.015,

            // How fast recoil recovers (per second)
            recovery: 4.0,

            // Pattern: how recoil changes over sustained fire
            // Values multiply the base after N shots
            pattern: [1.0, 1.1, 1.2, 1.15, 1.1, 1.0, 0.95, 0.9],

            // Visual weapon kick
            weaponKickBack: 0.03,
            weaponKickUp: 0.02,
        },
        fireRate: 600,  // RPM
    },

    smg: {
        name: 'SMG',
        recoil: {
            verticalBase: 0.015,
            verticalVariance: 0.005,
            horizontalBase: 0,
            horizontalVariance: 0.02,
            recovery: 5.0,
            pattern: [1.0, 1.05, 1.1, 1.05, 1.0],
            weaponKickBack: 0.02,
            weaponKickUp: 0.015,
        },
        fireRate: 900,
    },

    sniper: {
        name: 'Sniper',
        recoil: {
            verticalBase: 0.08,
            verticalVariance: 0.01,
            horizontalBase: 0,
            horizontalVariance: 0.005,
            recovery: 2.0,
            pattern: [1.0],
            weaponKickBack: 0.08,
            weaponKickUp: 0.05,
        },
        fireRate: 40,
    },
};

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
        this.state = {
            crouch: 0,
            lean: 0,
            strafe: 0,
            lookYaw: 0,
            lookPitch: 0,
            weaponHand: 'right',
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
        this.targetState = { ...this.targetState, ...newState };
        this.lastUpdate = Date.now();
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
                showOpponentMuzzleFlash(netState.opponent);
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
        }
    });
}

function sendShoot() {
    if (!netState.connected || netState.status !== 'playing') return;
    sendPeerMessage({ type: 'shoot' });
}

function sendHit(damage, bodyPart) {
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
};

// Create a bullet hole decal at impact point
function createHitMark(position, normal) {
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

// Game state
const gameState = {
    isRunning: false,
    score: 0,

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

// Initialize the game
function init() {
    // Scene setup - Dark dev room atmosphere
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a24); // Slightly bluer dark
    scene.fog = new THREE.FogExp2(0x1a1a24, 0.015); // Exponential fog for depth

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, gameState.BASE_HEIGHT, 0);

    // Renderer - Enhanced for better visuals
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x for performance
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding; // Proper color space
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // Cinematic look
    renderer.toneMappingExposure = 1.1; // Slightly brighter
    document.getElementById('game-container').insertBefore(renderer.domElement, document.getElementById('crosshair'));

    // Lighting - Enhanced for dev textures
    // Hemisphere light for natural ambient gradient (sky blue to ground brown)
    const hemiLight = new THREE.HemisphereLight(0x8899aa, 0x554433, 0.4);
    scene.add(hemiLight);

    // Low ambient fill
    const ambientLight = new THREE.AmbientLight(0x404050, 0.3);
    scene.add(ambientLight);

    // Main directional light (sun-like) - brighter to show off textures
    const directionalLight = new THREE.DirectionalLight(0xffeedd, 1.0);
    directionalLight.position.set(10, 25, 5);
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

    // Secondary fill light from opposite side (cooler tone)
    const fillLight = new THREE.DirectionalLight(0x8899bb, 0.3);
    fillLight.position.set(-8, 10, -5);
    scene.add(fillLight);

    // Colored accent lights for atmosphere
    const redLight = new THREE.PointLight(0xff4444, 0.6, 25);
    redLight.position.set(-6, 4, -12);
    scene.add(redLight);

    const blueLight = new THREE.PointLight(0x4466ff, 0.6, 25);
    blueLight.position.set(6, 4, -12);
    scene.add(blueLight);

    // Warm accent near player
    const warmLight = new THREE.PointLight(0xffaa66, 0.3, 15);
    warmLight.position.set(0, 3, 2);
    scene.add(warmLight);

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
    const group = new THREE.Group();

    const teamColor = opponent.slot === 0 ? 0x4444aa : 0xaa4444;
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
    leftArm.rotation.z = 0.2; // Slight angle outward
    leftArm.userData.isOpponent = true;
    leftArm.userData.bodyPart = 'arm';
    leftArm.userData.damage = 5;
    group.add(leftArm);

    // Right arm - 5 damage
    const rightArm = new THREE.Mesh(armGeometry, armMaterial.clone());
    rightArm.position.set(0.38, 0.95, 0);
    rightArm.rotation.z = -0.2; // Slight angle outward
    rightArm.userData.isOpponent = true;
    rightArm.userData.bodyPart = 'arm';
    rightArm.userData.damage = 5;
    group.add(rightArm);

    // Simple weapon
    const weaponGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.4);
    const weaponMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        metalness: 0.8,
    });
    const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
    weapon.position.set(0.3, 0.9, -0.2);
    group.add(weapon);
    opponent.weaponMesh = weapon;

    // Position opponent on opposite side of arena
    group.position.z = -15; // Downrange
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

    // Update weapon hand position (mirrored)
    if (opponent.weaponMesh) {
        const handOffset = state.weaponHand === 'right' ? -0.3 : 0.3;
        opponent.weaponMesh.position.x = handOffset;
    }
}

function showOpponentMuzzleFlash(opponent) {
    if (!opponent || !opponent.weaponMesh) return;

    // Create temporary flash
    const flashGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 1,
    });
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(opponent.weaponMesh.position);
    flash.position.z -= 0.3;
    opponent.mesh.add(flash);

    // Remove after short delay
    setTimeout(() => {
        opponent.mesh.remove(flash);
    }, 50);
}

function createEnvironment() {
    // Ground - large area with repeating texture
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = createDevMaterial(12, 12); // Repeat 12x12 for ~4 unit tiles
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Back wall
    const wallGeometry = new THREE.PlaneGeometry(50, 15);
    const backWallMaterial = createDevMaterial(12, 4); // Wide wall
    const backWall = new THREE.Mesh(wallGeometry, backWallMaterial);
    backWall.position.set(0, 7.5, -20);
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Side walls
    const sideWallGeometry = new THREE.PlaneGeometry(40, 15);
    const sideWallMaterial = createDevMaterial(10, 4);

    const leftWall = new THREE.Mesh(sideWallGeometry, sideWallMaterial);
    leftWall.position.set(-10, 7.5, -10);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    const rightWallMaterial = createDevMaterial(10, 4);
    const rightWall = new THREE.Mesh(sideWallGeometry, rightWallMaterial);
    rightWall.position.set(10, 7.5, -10);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    // Add some boxes/obstacles in the environment with dev textures
    for (let i = 0; i < 5; i++) {
        const size = 0.5 + Math.random() * 1;
        const boxGeometry = new THREE.BoxGeometry(size, size, size);
        const boxMaterial = createDevMaterial(1, 1); // Single tile per face
        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        box.position.set(
            (Math.random() - 0.5) * 15,
            size / 2,
            -5 - Math.random() * 10
        );
        box.castShadow = true;
        box.receiveShadow = true;
        scene.add(box);
    }
}

function createCover() {
    // Cover uses solid orange/yellow color - stands out from grey environment
    const coverMaterial = new THREE.MeshStandardMaterial({
        color: 0xff8800, // Orange
        roughness: 0.7,
        metalness: 0.1,
    });

    // === PLAYER SIDE COVER (near z = 0) ===
    // Main cover wall the player hides behind
    const coverGeometry = new THREE.BoxGeometry(3, 1.2, 0.3);
    cover = new THREE.Mesh(coverGeometry, coverMaterial);
    cover.position.set(0, 0.6, -0.5);
    cover.castShadow = true;
    cover.receiveShadow = true;
    scene.add(cover);

    // Left side cover extension
    const sideGeometry = new THREE.BoxGeometry(0.3, 1.8, 0.5);
    const leftCover = new THREE.Mesh(sideGeometry, coverMaterial);
    leftCover.position.set(-1.65, 0.9, -0.5);
    leftCover.castShadow = true;
    leftCover.receiveShadow = true;
    scene.add(leftCover);

    const rightCover = new THREE.Mesh(sideGeometry, coverMaterial);
    rightCover.position.set(1.65, 0.9, -0.5);
    rightCover.castShadow = true;
    rightCover.receiveShadow = true;
    scene.add(rightCover);

    // === OPPONENT SIDE COVER (near z = -15) ===
    // This is where the opponent takes cover from their perspective
    const opponentCoverZ = -14.5; // Opponent is at z=-15, their cover is 0.5 in front

    const opponentMainCover = new THREE.Mesh(coverGeometry, coverMaterial);
    opponentMainCover.position.set(0, 0.6, opponentCoverZ);
    opponentMainCover.castShadow = true;
    opponentMainCover.receiveShadow = true;
    scene.add(opponentMainCover);

    const opponentLeftCover = new THREE.Mesh(sideGeometry, coverMaterial);
    opponentLeftCover.position.set(-1.65, 0.9, opponentCoverZ);
    opponentLeftCover.castShadow = true;
    opponentLeftCover.receiveShadow = true;
    scene.add(opponentLeftCover);

    const opponentRightCover = new THREE.Mesh(sideGeometry, coverMaterial);
    opponentRightCover.position.set(1.65, 0.9, opponentCoverZ);
    opponentRightCover.castShadow = true;
    opponentRightCover.receiveShadow = true;
    scene.add(opponentRightCover);
}

function createWeapon() {
    // Weapon pivot point (attached to camera)
    weaponPivot = new THREE.Group();
    camera.add(weaponPivot);

    // Create assault rifle model
    weapon = new THREE.Group();

    // Main body
    const bodyGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.5);
    const metalMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        roughness: 0.3,
        metalness: 0.8
    });
    const body = new THREE.Mesh(bodyGeometry, metalMaterial);
    weapon.add(body);

    // Barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.015, 0.02, 0.3, 8);
    const barrel = new THREE.Mesh(barrelGeometry, metalMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.01, -0.4);
    weapon.add(barrel);

    // Stock
    const stockGeometry = new THREE.BoxGeometry(0.06, 0.1, 0.2);
    const stock = new THREE.Mesh(stockGeometry, metalMaterial);
    stock.position.set(0, -0.02, 0.3);
    weapon.add(stock);

    // Magazine
    const magGeometry = new THREE.BoxGeometry(0.04, 0.15, 0.08);
    const mag = new THREE.Mesh(magGeometry, metalMaterial);
    mag.position.set(0, -0.1, 0.05);
    weapon.add(mag);

    // Grip
    const gripGeometry = new THREE.BoxGeometry(0.04, 0.1, 0.04);
    const grip = new THREE.Mesh(gripGeometry, metalMaterial);
    grip.position.set(0, -0.08, 0.15);
    grip.rotation.x = 0.3;
    weapon.add(grip);

    // Sight rail
    const railGeometry = new THREE.BoxGeometry(0.03, 0.02, 0.2);
    const rail = new THREE.Mesh(railGeometry, metalMaterial);
    rail.position.set(0, 0.05, -0.05);
    weapon.add(rail);

    // Iron sights - front
    const frontSightGeometry = new THREE.BoxGeometry(0.01, 0.03, 0.01);
    const frontSight = new THREE.Mesh(frontSightGeometry, metalMaterial);
    frontSight.position.set(0, 0.065, -0.22);
    weapon.add(frontSight);

    // Iron sights - rear
    const rearSightGeometry = new THREE.BoxGeometry(0.025, 0.025, 0.01);
    const rearSight = new THREE.Mesh(rearSightGeometry, metalMaterial);
    rearSight.position.set(0, 0.065, 0.05);
    weapon.add(rearSight);

    updateWeaponPosition();
    weaponPivot.add(weapon);
    scene.add(camera);
}

function updateWeaponPosition() {
    // Position weapon based on which hand
    const handOffset = gameState.weaponHand === 'right' ? 0.25 : -0.25;
    weapon.position.set(handOffset, -0.2, -0.4);

    // Add slight rotation for more natural look
    weapon.rotation.set(0, gameState.weaponHand === 'right' ? 0.02 : -0.02, 0);
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

    // Target stand
    const standGeometry = new THREE.BoxGeometry(0.05, config.pos[1], 0.05);
    const standMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4a4a });
    const stand = new THREE.Mesh(standGeometry, standMaterial);
    stand.position.y = -config.pos[1] / 2;
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

            // Clamp look angles
            gameState.lookYaw = Math.max(-gameState.LOOK_LIMIT_YAW, Math.min(gameState.LOOK_LIMIT_YAW, gameState.lookYaw));
            gameState.lookPitch = Math.max(-gameState.LOOK_LIMIT_PITCH, Math.min(gameState.LOOK_LIMIT_PITCH, gameState.lookPitch));
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
                shoot();
            }
        }
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
    const weapon = WEAPON_PROFILES[gameState.currentWeapon];
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
    const weapon = WEAPON_PROFILES[gameState.currentWeapon];
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

    // Muzzle flash
    const flash = document.getElementById('muzzle-flash');
    flash.classList.remove('show');
    void flash.offsetWidth; // Trigger reflow
    flash.classList.add('show');

    // Gunshot sound
    AudioSystem.playGunshot();

    // Apply recoil
    applyRecoil();

    // Send shoot event to server
    sendShoot();

    // Raycast from camera center
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);

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
                        createHitMark(coverHit.point.clone(), worldNormal);
                    }
                }
            }

            if (!blocked) {
                // Hit opponent! Check which body part was hit
                const hitObject = opponentHit.object;
                const bodyPart = hitObject.userData.bodyPart || 'body';
                // Use DamageConfig if available, otherwise fall back to userData
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

                return; // Don't check practice targets
            }
        }
    }

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
            createHitMark(hit.point.clone(), worldNormal);

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
    // Weapon sway based on lean
    const leanSway = gameState.lean * 0.1;
    const crouchOffset = gameState.crouch * 0.05;

    // Apply visual recoil kick
    weaponPivot.rotation.x = -recoilState.weaponKickUp;
    weaponPivot.rotation.z = leanSway + recoilState.weaponKickSide;
    weaponPivot.position.z = recoilState.weaponKickBack;
    weaponPivot.position.y = -crouchOffset - recoilState.weaponKickUp * 0.5;

    // Breathing sway
    const time = Date.now() * 0.001;
    weaponPivot.position.x = Math.sin(time * 1.5) * 0.003;
    weaponPivot.position.y += Math.sin(time * 1.2) * 0.002;
}

let lastTime = Date.now();

// State sync throttle
let lastStateSend = 0;
const STATE_SEND_RATE = 1000 / 60; // 60 times per second

function animate() {
    requestAnimationFrame(animate);

    const now = Date.now();
    const deltaTime = (now - lastTime) / 1000;
    lastTime = now;

    if (gameState.isRunning) {
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

    // Update debug console visuals
    DebugConsole.update();

    // Update debug hit indicators (tracked body part labels)
    updateDebugHitIndicators();

    renderer.render(scene, camera);
}

function startGame(mode = 'offline') {
    document.getElementById('start-screen').style.display = 'none';
    gameState.isRunning = true;

    // Initialize audio on first user interaction
    AudioSystem.init();

    if (mode === 'online') {
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
