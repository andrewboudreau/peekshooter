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

    // Noise generator for this session
    noise: new NoiseGenerator(Date.now()),
};

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
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 10, 50);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, gameState.BASE_HEIGHT, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').insertBefore(renderer.domElement, document.getElementById('crosshair'));

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Add some point lights for atmosphere
    const redLight = new THREE.PointLight(0xff4444, 0.5, 20);
    redLight.position.set(-5, 3, -10);
    scene.add(redLight);

    const blueLight = new THREE.PointLight(0x4444ff, 0.5, 20);
    blueLight.position.set(5, 3, -10);
    scene.add(blueLight);

    createEnvironment();
    createCover();
    createWeapon();
    createTargets();

    // Event listeners
    setupEventListeners();

    // Start render loop
    animate();
}

function createEnvironment() {
    // Ground
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x333344,
        roughness: 0.8,
        metalness: 0.2
    });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Back wall
    const wallGeometry = new THREE.PlaneGeometry(50, 15);
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2a3a,
        roughness: 0.9
    });
    const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
    backWall.position.set(0, 7.5, -20);
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Side walls
    const sideWallGeometry = new THREE.PlaneGeometry(40, 15);

    const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    leftWall.position.set(-10, 7.5, -10);
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    rightWall.position.set(10, 7.5, -10);
    rightWall.rotation.y = -Math.PI / 2;
    scene.add(rightWall);

    // Add some boxes/obstacles in the environment
    const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x444455 });

    for (let i = 0; i < 5; i++) {
        const size = 0.5 + Math.random() * 1;
        const boxGeometry = new THREE.BoxGeometry(size, size, size);
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
    // Main cover wall the player hides behind
    const coverGeometry = new THREE.BoxGeometry(3, 1.2, 0.3);
    const coverMaterial = new THREE.MeshStandardMaterial({
        color: 0x556655,
        roughness: 0.7
    });
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
    scene.add(leftCover);

    const rightCover = new THREE.Mesh(sideGeometry, coverMaterial);
    rightCover.position.set(1.65, 0.9, -0.5);
    rightCover.castShadow = true;
    scene.add(rightCover);
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
        ringMesh.position.z = -0.011 - (i * 0.001); // Stack front to back
        geometry.add(ringMesh);
    });

    // Bullseye (yellow center dot)
    const bullseyeGeometry = new THREE.CircleGeometry(config.size * 0.06, 16);
    const bullseyeMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        side: THREE.DoubleSide
    });
    const bullseye = new THREE.Mesh(bullseyeGeometry, bullseyeMaterial);
    bullseye.position.z = -0.02;
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

    // Reset shot count if enough time passed (burst reset)
    if (now - recoilState.lastShotTime > 200) {
        recoilState.shotCount = 0;
    }

    // Get pattern multiplier based on shot count
    const patternIndex = Math.min(recoilState.shotCount, recoil.pattern.length - 1);
    const patternMult = recoil.pattern[patternIndex];

    // Calculate recoil with noise
    const verticalKick = (recoil.verticalBase + recoilState.noise.signed() * recoil.verticalVariance) * patternMult;
    const horizontalKick = recoil.horizontalBase + recoilState.noise.signed() * recoil.horizontalVariance;

    // Apply to camera offset (will be added to look angles)
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

    // Clamp small values to zero
    if (Math.abs(recoilState.pitchOffset) < 0.0001) recoilState.pitchOffset = 0;
    if (Math.abs(recoilState.yawOffset) < 0.0001) recoilState.yawOffset = 0;
}

function shoot() {
    // Muzzle flash
    const flash = document.getElementById('muzzle-flash');
    flash.classList.remove('show');
    void flash.offsetWidth; // Trigger reflow
    flash.classList.add('show');

    // Apply recoil
    applyRecoil();

    // Raycast from camera center
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);

    // Check hits on targets
    let hitTarget = null;
    let closestDistance = Infinity;

    targets.forEach(target => {
        if (target.hit) return;

        const intersects = raycaster.intersectObject(target.mesh, true);
        if (intersects.length > 0 && intersects[0].distance < closestDistance) {
            closestDistance = intersects[0].distance;
            hitTarget = target;
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

        // Animate target falling
        animateTargetHit(hitTarget);

        // Check if all targets hit
        if (targets.every(t => t.hit)) {
            setTimeout(() => {
                // Respawn targets
                createTargets();
            }, 2000);
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
    }

    renderer.render(scene, camera);
}

function startGame() {
    document.getElementById('start-screen').style.display = 'none';
    gameState.isRunning = true;
}

// Initialize on load
window.addEventListener('load', init);
