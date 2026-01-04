// ============================================
// AUDIO SYSTEM
// Procedural sound effects using Web Audio API
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
            console.log('[AudioSystem] Initialized');
        } catch (e) {
            console.warn('[AudioSystem] Web Audio API not supported:', e);
        }
    },

    // Resume audio context if suspended (browser autoplay policy)
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    // ============================================
    // Weapon Sounds
    // ============================================

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

    // ============================================
    // UI Feedback Sounds
    // ============================================

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

    // ============================================
    // Damage Sounds
    // ============================================

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

    // ============================================
    // Impact Sounds
    // ============================================

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

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioSystem;
}
