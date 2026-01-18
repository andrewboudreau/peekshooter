# Peek Shooter Architecture Guide

## Overview

Peek Shooter uses a **hybrid architecture**: a monolithic legacy `game.js` file containing core gameplay, wrapped with a modern modular `src/` folder using ECS-inspired patterns, event-driven communication, and centralized configuration.

**Key Principles:**
- Data-driven gameplay through config objects
- Event-based system communication via EventBus
- Component composition for entity behavior
- Three.js 3D rendering with procedural models
- Multiplayer support via Socket.io
- Developer-friendly debugging with in-game console

---

## File Structure

```
peekshooter/
├── index.html              # Main entry point with UI
├── game.js                 # Legacy monolithic game logic (~3,900 lines)
├── server.js               # Express + Socket.io multiplayer backend
├── package.json            # Dependencies
│
├── src/                    # Modern modular architecture
│   ├── config/             # Game configuration
│   │   ├── DamageConfig.js
│   │   ├── PhysicsConfig.js
│   │   ├── WeaponConfig.js
│   │   └── MapConfig.js
│   │
│   ├── core/               # Infrastructure
│   │   └── EventBus.js
│   │
│   ├── entities/           # ECS entities
│   │   ├── Entity.js
│   │   ├── Player.js
│   │   └── Opponent.js
│   │
│   ├── components/         # Reusable components
│   │   ├── HealthComponent.js
│   │   ├── TransformComponent.js
│   │   └── HitboxComponent.js
│   │
│   ├── systems/            # Game systems
│   │   ├── ShootingSystem.js
│   │   ├── EffectsSystem.js
│   │   └── AudioSystem.js
│   │
│   ├── weapons/
│   │   └── WeaponFactory.js
│   │
│   ├── debug/
│   │   └── BotController.js
│   │
│   └── main.js             # Architecture initialization
│
├── lib/
│   ├── three.min.js        # Three.js rendering
│   └── peerjs.min.js       # P2P networking
│
└── screenshots/            # Auto-generated screenshots
```

---

## Module Load Order

Scripts are loaded in `index.html` in this order:

```
1. lib/three.min.js, lib/peerjs.min.js
2. src/config/* (DamageConfig, PhysicsConfig, WeaponConfig, MapConfig)
3. src/core/EventBus.js
4. src/entities/Entity.js
5. src/components/* (Health, Transform, Hitbox)
6. src/entities/Player.js, Opponent.js
7. src/systems/* (Shooting, Effects, Audio)
8. src/weapons/WeaponFactory.js
9. src/debug/BotController.js
10. src/main.js (verification & bridging)
11. game.js (main game loop)
```

---

## Configuration System

All game mechanics are data-driven through config objects. No magic numbers in code.

### WeaponConfig.js

Defines all 5 weapons with complete stats:

```javascript
WeaponConfig.weapons.assault_rifle = {
    id: 'assault_rifle',
    name: 'Assault Rifle',
    slot: 3,
    damage: { base: 15, headshotMult: 2.0 },
    fireRate: 600,           // RPM
    fireRateMs: 100,         // ms between shots
    allowedModes: ['single', 'burst', 'auto'],
    recoil: { verticalBase: 0.015, horizontalBase: 0.008, recovery: 8.0 },
    ads: { position: {x,y,z}, fov: 45, speed: 0.15 },
    hipPosition: {x,y,z}
}

// Methods
WeaponConfig.getWeapon(id)
WeaponConfig.getWeaponBySlot(1-5)
WeaponConfig.getDamage(weaponId, bodyPart)
WeaponConfig.getNextAllowedFireMode(weaponId, currentMode)
```

### DamageConfig.js

Body part damage values and multipliers:

```javascript
DamageConfig.bodyParts = {
    head:  { damage: 25, multiplier: 2.0, isCritical: true },
    chest: { damage: 15, multiplier: 1.0 },
    belly: { damage: 10, multiplier: 0.8 },
    arm:   { damage: 5,  multiplier: 0.5 }
}

DamageConfig.health = { player: 100, opponent: 100 }
```

### PhysicsConfig.js

Movement, physics, and timing values:

```javascript
PhysicsConfig = {
    player: {
        baseHeight: 1.6,
        crouchAmount: 0.8,
        leanAmount: 0.6,
        strafeAmount: 2.0,
        mouseSensitivity: 0.002
    },
    opponent: {
        headRadius: 0.18,
        chestRadius: [0.28, 0.25],
        // ... body dimensions
    },
    blood: {
        particleCount: [8, 16],
        lifetime: [800, 1200],
        gravity: 9.8
    },
    bot: {
        moveTime: 1500,
        peekTime: 800,
        accuracy: 0.6
    },
    network: {
        updateRate: 60  // Hz
    }
}
```

### MapConfig.js

Map layouts with cover, obstacles, and lighting:

```javascript
MapConfig.maps.garage = {
    scene: { background: 0x1a1815, fogDensity: 0.012 },
    floor: { width: 55, height: 55 },
    walls: [{ type: 'back', width: 55, height: 18, position: [...] }],
    playerCover: {
        z: -0.5,
        elements: [
            { type: 'box', size: [1.2, 1.2, 1.2], position: [0, 0.6, 0], color: 0x8B4513 }
        ]
    },
    opponentCover: { z: -14.5, elements: [...] },
    staticObstacles: [
        { type: 'shelf', position: [-8, 0, -8] },
        { type: 'barrel', position: [4.5, 0, -8] },
        { type: 'car_lift', position: [5, 0, -7] },
        { type: 'dugout', position: [-7, 0, -10] }
    ],
    lighting: {
        hemisphere: { skyColor, groundColor, intensity },
        directional: { color, intensity, position },
        accents: [{ type: 'point', color, intensity, position }]
    }
}

// Helper methods for obstacle creation
MapConfig.createShelf(THREE, position, color)
MapConfig.createBarrel(THREE, position, color)
MapConfig.createCarLift(THREE, position, color)
MapConfig.createDugout(THREE, position, color)
```

---

## Entity-Component System

### Entity Base Class

```javascript
class Entity {
    id: number              // Auto-incremented
    type: string            // 'player', 'opponent', etc.
    components: Map         // Component instances
    tags: Set               // For querying
    active: boolean

    addComponent(component)
    getComponent(name)      // Returns by constructor name
    hasComponent(name)
    removeComponent(name)
    addTag(tag)
    hasTag(tag)
    update(deltaTime)       // Calls update on all components
    serialize()
    deserialize(data)
    destroy()
}
```

### Component Base Class

```javascript
class Component {
    entity: Entity          // Parent reference
    active: boolean

    onAttach(entity)        // Called when added
    update(deltaTime)       // Per-frame update
    onDetach(entity)        // Called when removed
    onDestroy()             // Cleanup
    serialize()
    deserialize(data)
}
```

### Player Entity

```javascript
class Player extends Entity {
    // Components
    health: HealthComponent
    transform: TransformComponent

    // State
    currentWeapon: string
    weaponHand: 'left' | 'right'
    input: { keys, mouseX, mouseY }

    // Methods
    getNetworkState()       // For transmission
    applyNetworkState(state)
    respawn()
    switchHand()
    syncFromLegacy(gameState)
    syncToLegacy(gameState)
}
```

### Opponent Entity

```javascript
class Opponent extends Entity {
    // Components
    health: HealthComponent
    transform: TransformComponent
    hitbox: HitboxComponent

    // State
    slot: number
    currentWeapon: string
    mesh: THREE.Group
    weaponMesh: THREE.Mesh

    // Methods
    createMesh(scene)       // Procedural body
    updateMesh(deltaTime)   // Apply transforms
    updateFromNetwork(state)
    updateWeapon(weaponId)
    destroy()
}
```

### HealthComponent

```javascript
class HealthComponent extends Component {
    currentHealth: number
    maxHealth: number
    isDead: boolean
    damageHistory: []       // Last 10 hits

    takeDamage(amount, options)  // Returns { dealt, killed, blocked }
    heal(amount)
    setHealth(value)
    respawn()
}
```

### TransformComponent

```javascript
class TransformComponent extends Component {
    position: { x, y, z }
    rotation: { x, y, z }
    stance: { crouch, lean, strafe }        // Current (interpolated)
    targetStance: { crouch, lean, strafe }  // Target values
    look: { yaw, pitch }
    mesh: THREE.Object3D

    setPosition(x, y, z)
    setStance(stance)
    setTargetStance(stance)
    isPeeking()
    isCrouched()
    attachMesh(mesh)
    update(deltaTime)       // Interpolates stance
}
```

### HitboxComponent

```javascript
class HitboxComponent extends Component {
    parts: Map              // name -> { mesh, damage, multiplier, isCritical }

    addPart(name, mesh, damage, options)
    removePart(name)
    getPart(name)
    setMeshGroup(group)
    showDebug()
    hideDebug()
}
```

---

## Event System

### EventBus

Central pub/sub system with wildcard support:

```javascript
EventBus.on(event, callback)
EventBus.once(event, callback)
EventBus.off(event, callback)
EventBus.emit(event, data)
EventBus.onAny(callback)    // Wildcard listener
```

### GameEvents

Named event constants:

```javascript
// Weapons
WEAPON_FIRED, WEAPON_RELOAD, WEAPON_SWITCH

// Combat
HIT_OPPONENT, HIT_PLAYER, DAMAGE_DEALT, DAMAGE_RECEIVED

// Health
HEALTH_CHANGED, HEALTH_DEPLETED

// Kills
PLAYER_KILLED, OPPONENT_KILLED

// Network
NET_CONNECTED, NET_DISCONNECTED, NET_STATE_UPDATE

// UI
UI_SHOW_HITMARKER, UI_UPDATE_HEALTH

// Effects
EFFECT_BLOOD_SPLATTER, EFFECT_BLOOD_DECAL, EFFECT_HIT_MARK
```

---

## Systems

### AudioSystem

Procedural audio via Web Audio API (no audio files):

```javascript
AudioSystem.init()
AudioSystem.playGunshot()
AudioSystem.playDamage()
AudioSystem.playImpactPlayer()
AudioSystem.playImpactWall()
AudioSystem.playImpactBarrier()
AudioSystem.playDeath()
AudioSystem.toggleMute()
```

### ShootingSystem

Multi-phase hit detection:

```javascript
ShootingSystem.setCamera(camera)
ShootingSystem.setScene(scene)

// Shooting phases
1. prepareShot(gameState)    // Emit events, gather data
2. performRaycast()          // Ray from camera
3. processHits(intersects)   // Check opponent, cover, environment
4. handleOpponentHit()       // Apply damage, create effects
5. handleEnvironmentHit()    // Create hit marks
```

### EffectsSystem

Visual effects management:

```javascript
EffectsSystem.createHitMark(position, normal)
EffectsSystem.createBloodSplatter(position, direction)
EffectsSystem.createBloodDecal(position, normal)
```

### WeaponFactory

Procedural 3D weapon models:

```javascript
WeaponFactory.initMaterials()
WeaponFactory.createWeapon(weaponId)        // First-person model
WeaponFactory.createOpponentWeapon(weaponId) // Simplified model
WeaponFactory.disposeWeapon(group)
```

---

## Networking Architecture

### Server (server.js)

Express + Socket.io server:

```javascript
// Classes
Player { id, slot, state, lastUpdate }
Room { id, players: Map, state, scores }

// Events
'join'       -> Assign slot, start if room full
'state'      -> Broadcast to opponent (60Hz)
'shoot'      -> Broadcast shot
'hit'        -> Apply damage, handle kills
'disconnect' -> Cleanup
```

### Client (game.js)

```javascript
netState = {
    gameMode: 'offline' | 'online',
    status: 'disconnected' | 'connecting' | 'waiting' | 'playing',
    playerSlot: 0 | 1,
    opponent: Opponent,
    health: 100,
    scores: [0, 0]
}

// Functions
initializePeer()
connectToPeer(roomCode)
sendStateUpdate()           // 60Hz
sendShoot(hitPlayer, hitPoint, hitCover)
sendHit(damage, bodyPart)
handlePeerMessage(data)
```

### State Synchronization

Transmitted at 60Hz:
```javascript
{
    crouch: 0-1,
    lean: -1 to 1,
    strafe: -1 to 1,
    lookYaw: -0.8 to 0.8,
    lookPitch: -0.5 to 0.5,
    weaponHand: 'left' | 'right',
    health: 0-100,
    weapon: 'assault_rifle'
}
```

### Coordinate Transformation

Players face each other from opposite ends:
- Player 0: z=0, facing z=-15
- Player 1: z=-15, facing z=0

Transformation for received data:
```javascript
transformedX = -shotData.hitX           // Mirror X
transformedZ = -15 - shotData.hitZ      // Transform Z
```

---

## game.js Organization

Major sections (~3,900 lines):

| Lines | Section |
|-------|---------|
| 1-230 | Noise & texture generation |
| 238-850 | Debug console system |
| 852-920 | Weapon & network state |
| 922-1400 | Networking functions |
| 1411-1670 | UI functions |
| 1675-1870 | Effect creation |
| 1975-2156 | Game state & init |
| 2159-2350 | Entity & mesh creation |
| 2544-3080 | Weapon management |
| 3119-3233 | Input handling |
| 3327-3540 | Shooting & raycast |
| 3572-3710 | Stance & camera |
| 3712-3750 | Animation loop |
| 3840-3910 | Game lifecycle |

---

## Three.js Rendering

### Scene Setup

```javascript
scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1a24)
scene.fog = new THREE.FogExp2(color, density)

camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000)

renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true  // For screenshots
})
renderer.shadowMap.enabled = true
renderer.toneMapping = THREE.ACESFilmicToneMapping
```

### Lighting Hierarchy

1. **Hemisphere Light** - Global ambient
2. **Ambient Light** - Flat fill
3. **Directional Light** - Main shadow-casting
4. **Fill Light** - Side accent
5. **Point Lights** - Colored accents

### Procedural Models

All models are generated at runtime:
- **Opponent body**: Head (sphere), chest/belly (cylinders), arms (cylinders)
- **Weapons**: Assembled from boxes and cylinders
- **Cover**: Box geometry from MapConfig
- **Obstacles**: Shelves, barrels, forklifts from MapConfig helpers

### Animation Loop

```javascript
function animate() {
    requestAnimationFrame(animate)

    updateStance(deltaTime)
    updateCamera()
    updateWeaponPosition()
    updateOpponentMesh(deltaTime)
    updateBloodParticles(deltaTime)
    updateRecoil(deltaTime)

    sendStateUpdate()  // Network at 60Hz

    renderer.render(scene, camera)
}
```

---

## Debug Console

Press **~** (tilde) to toggle.

### Commands

| Command | Description |
|---------|-------------|
| `help` | List commands |
| `debug [on\|off]` | Toggle debug mode |
| `hitboxes [on\|off]` | Show opponent hitboxes |
| `health [on\|off]` | Show health labels |
| `hits [on\|off]` | Log bullet impacts |
| `god [on\|off]` | Invincibility |
| `bot [on\|off]` | Toggle bot opponent |
| `kill` | Kill yourself |
| `heal` | Restore health |
| `firerate <ms>` | Set fire rate |
| `firemode <mode>` | Set fire mode |
| `status` | Show game state |
| `clear` | Clear console |

### Visual Debugging

- **Hitboxes**: BoxHelper outlines on opponent body parts
- **Health labels**: Canvas labels above opponent
- **Hit indicators**: Colored markers at impact points

---

## Data Flow

```
User Input (Mouse, Keyboard)
    │
    ▼
setupEventListeners() → updateStance(), updateCamera()
    │
    ▼
shoot() → Raycast from camera
    │
    ▼
Hit opponent mesh → Get HitboxComponent
    │
    ▼
HealthComponent.takeDamage()
    │
    ▼
EventBus.emit(DAMAGE_RECEIVED)
    │
    ├──► AudioSystem.playDamage()
    ├──► showHitMarker()
    └──► createBloodSplatter()
    │
    ▼
sendShoot() → Network → Server → Opponent
```

---

## Adding New Features

### New Weapon

1. Add to `WeaponConfig.weapons`
2. Create model in `WeaponFactory.createWeapon()`
3. Add opponent model in `WeaponFactory.createOpponentWeapon()`

### New Map

1. Add to `MapConfig.maps`
2. Define: floor, walls, cover, obstacles, lighting
3. Add any custom obstacle creators

### New Component

1. Create class extending `Component` in `src/components/`
2. Implement lifecycle hooks
3. Add to entities that need it

### New System

1. Create in `src/systems/`
2. Subscribe to relevant events
3. Initialize in `src/main.js`

---

## Performance Considerations

- **Network**: 60Hz state updates, minimal payload
- **Rendering**: Pixel ratio capped at 2x, soft shadows
- **Effects**: Particle limits, effect pooling
- **Raycasting**: Single ray per shot, filtered objects
