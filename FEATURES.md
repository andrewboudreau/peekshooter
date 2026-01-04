# Peek Shooter - Features & Architecture

## Current Version
See `GAME_VERSION` in `game.js` (auto-incremented on deploy)

---

## Table of Contents
- [Core Features](#core-features)
- [Architecture Overview](#architecture-overview)
- [Module Reference](#module-reference)
- [Systems](#systems)
- [Configuration](#configuration)
- [Networking](#networking)
- [Debug Tools](#debug-tools)

---

## Core Features

### Gameplay
| Feature | Status | Description |
|---------|--------|-------------|
| Analog Stance Control | Complete | Smooth crouch (W/S), lean (Q/E), strafe (A/D) |
| First-Person Shooting | Complete | Raycast-based hit detection |
| Fire Modes | Complete | Single, burst (3-shot), full auto (B to toggle) |
| Adjustable Fire Rate | Complete | 1-1000ms via console command |
| Recoil System | Complete | Per-weapon patterns with cumulative drift |
| Practice Targets | Complete | Offline mode with shooting range targets |

### Multiplayer
| Feature | Status | Description |
|---------|--------|-------------|
| P2P WebRTC | Complete | PeerJS-based direct connection |
| Room Codes | Complete | 4-character codes for matchmaking |
| State Sync | Complete | Position, stance, look direction |
| Hit Registration | Complete | Client-authoritative with body part detection |
| Kill/Death/Respawn | Complete | Score tracking, 3-second respawn |

### Audio
| Feature | Status | Description |
|---------|--------|-------------|
| Procedural Sounds | Complete | Web Audio API, no pre-recorded files |
| Gunshot | Complete | 3-layer: crack, body, thump |
| Impact Sounds | Complete | Target (metal), player (flesh), barrier, wall |
| UI Sounds | Complete | Hit marker, kill confirm, damage, death |
| Mute Toggle | Complete | Click UI button or console command |

### Visuals
| Feature | Status | Description |
|---------|--------|-------------|
| Dev Textures | Complete | Source Engine style grey grid |
| Normal Mapping | Complete | Surface depth on walls/floor |
| Dynamic Lighting | Complete | Hemisphere + directional + accent lights |
| Hit Marks | Complete | Bullet hole decals on surfaces |
| Blood Effects | Complete | Particles + decals on player hits |
| Muzzle Flash | Complete | First-person and opponent weapons |
| Damage Overlay | Complete | Red vignette on taking damage |

### UI/HUD
| Feature | Status | Description |
|---------|--------|-------------|
| Health Bar | Complete | Bottom-left with numeric display |
| Stance Indicators | Complete | Crouch and lean bars |
| Score Display | Complete | Top-right |
| Fire Mode Display | Complete | Shows mode and rate |
| Network Status | Complete | Connection state badge |
| Debug Console | Complete | Toggle with ~ key |
| Version Display | Complete | Bottom-right corner |

---

## Architecture Overview

```
peekshooter/
├── index.html              # Entry point, UI, script loading
├── game.js                 # Legacy monolithic game logic (~3000 lines)
├── server.js               # Socket.io server (alternative to P2P)
├── lib/                    # Bundled third-party libraries
│   ├── three.min.js        # 3D rendering engine
│   └── peerjs.min.js       # WebRTC P2P networking
└── src/                    # New modular architecture
    ├── main.js             # Module initialization & bridging
    ├── core/
    │   └── EventBus.js     # Pub/sub event system
    ├── config/
    │   ├── DamageConfig.js # Damage values & body parts
    │   └── PhysicsConfig.js# Movement & visual constants
    ├── components/
    │   ├── HealthComponent.js
    │   ├── TransformComponent.js
    │   └── HitboxComponent.js
    ├── entities/
    │   ├── Entity.js       # Base entity class
    │   ├── Player.js       # Local player
    │   └── Opponent.js     # Remote player
    ├── systems/
    │   ├── AudioSystem.js  # Procedural sound
    │   ├── EffectsSystem.js# Visual effects
    │   └── ShootingSystem.js# Hit detection
    └── debug/
        └── BotController.js# Practice AI
```

### Architecture Status
The codebase is mid-refactoring from monolithic (`game.js`) to Entity-Component-System (`src/`).

| Layer | Status | Notes |
|-------|--------|-------|
| EventBus | Active | Used for cross-system communication |
| Configs | Active | DamageConfig, PhysicsConfig in use |
| Entities | Partial | Player/Opponent created but legacy still drives state |
| Components | Partial | Defined but not fully integrated |
| Systems | Partial | AudioSystem active, others partially integrated |
| Legacy (game.js) | Active | Still contains main game loop |

---

## Module Reference

### Core

#### EventBus (`src/core/EventBus.js`)
Centralized publish-subscribe event system.

```javascript
// Subscribe to event
EventBus.on('WEAPON_FIRED', (data) => { ... });

// Emit event
EventBus.emit('WEAPON_FIRED', { weapon: 'assault_rifle' });

// Wildcard listener (receives all events)
EventBus.onAny((eventName, data) => { ... });
```

**Event Categories:**
- `WEAPON_*` - Fired, reload, switch
- `HIT_*` - Opponent, environment, cover, target
- `DAMAGE_*` - Dealt, received
- `HEALTH_*` - Changed, depleted
- `PLAYER_*` - Killed, spawned
- `NETWORK_*` - Connected, disconnected, state update

### Configuration

#### DamageConfig (`src/config/DamageConfig.js`)
```javascript
DamageConfig.BODY_PARTS = {
    head:  { damage: 25, multiplier: 2.5, color: 0xff0000 },
    chest: { damage: 15, multiplier: 1.5, color: 0x00ff00 },
    belly: { damage: 10, multiplier: 1.0, color: 0x0000ff },
    arm:   { damage: 5,  multiplier: 0.5, color: 0xffff00 }
};
```

#### PhysicsConfig (`src/config/PhysicsConfig.js`)
```javascript
PhysicsConfig.MOVEMENT = {
    crouchSpeed: 3,
    leanSpeed: 4,
    strafeSpeed: 3,
    stanceSmoothing: 8
};

PhysicsConfig.CAMERA = {
    baseHeight: 1.6,
    crouchAmount: 0.8,
    leanAmount: 0.6,
    leanTilt: 0.15
};
```

### Components

#### HealthComponent
- Health tracking (0-100)
- Damage application with body part multipliers
- Death detection and respawn
- Invulnerability frames

#### TransformComponent
- Position (x, y, z)
- Rotation (yaw, pitch)
- Stance (crouch, lean, strafe)
- Smooth interpolation
- Mesh attachment

#### HitboxComponent
- Body part hitbox definitions
- Raycast intersection testing
- Debug visualization (wireframe boxes)
- Damage multiplier per part

### Entities

#### Player (`src/entities/Player.js`)
Local player entity with:
- HealthComponent
- TransformComponent
- Weapon state (hand, current weapon)
- Input tracking
- Network state serialization

#### Opponent (`src/entities/Opponent.js`)
Remote player entity with:
- HealthComponent
- TransformComponent
- HitboxComponent
- 3D mesh (head, chest, arms, weapon)
- Team color coding (blue/red)
- State interpolation for smooth movement

---

## Systems

### AudioSystem (`src/systems/AudioSystem.js`)
Procedural sound generation using Web Audio API.

**Methods:**
| Method | Description |
|--------|-------------|
| `init()` | Create audio context (call after user interaction) |
| `playGunshot()` | 3-layer gunshot (crack + body + thump) |
| `playHitMarker()` | High ping on hit confirmation |
| `playDamage()` | Low thud when taking damage |
| `playKill()` | Descending chord on kill |
| `playDeath()` | Low sweep on death |
| `playImpactTarget()` | Metal ping for targets |
| `playImpactPlayer()` | Flesh thud for player hits |
| `playImpactBarrier()` | Solid thud for barriers |
| `playImpactWall()` | Concrete chip for walls |
| `toggleMute()` | Enable/disable all sounds |

### EffectsSystem (`src/systems/EffectsSystem.js`)
Visual effect creation and management.

**Methods:**
| Method | Description |
|--------|-------------|
| `createHitMark(position, normal)` | Bullet hole decal |
| `createBloodSplatter(position, direction)` | Blood particles |
| `createBloodDecal(position)` | Blood surface stain |
| `createMuzzleFlash(weapon)` | Weapon flash effect |

### ShootingSystem (`src/systems/ShootingSystem.js`)
Multi-phase hit detection.

**Phases:**
1. **Prepare** - Emit events, play sound, apply recoil
2. **Raycast** - Camera-based ray intersection
3. **Process** - Priority: opponent > targets > environment

---

## Networking

### P2P Mode (Primary)
Uses PeerJS for WebRTC data channels.

```javascript
// Room creation
initializePeer();  // Generates 4-char room code

// Joining
joinRoom('ABCD'); // Connect to existing room

// Message types
{ type: 'state', crouch, lean, strafe, lookYaw, lookPitch, weaponHand }
{ type: 'shoot', hitPlayer, hitX, hitY, hitZ, hitCover }
{ type: 'hit', damage, bodyPart }
{ type: 'killed' }
{ type: 'reset' }
```

### Server Mode (Alternative)
Socket.io server in `server.js` for fallback.

---

## Debug Tools

### Console Commands
Open with `~` key.

| Command | Description |
|---------|-------------|
| `help` | List all commands |
| `debug [on\|off]` | Toggle debug mode |
| `hitboxes [on\|off]` | Show body part wireframes |
| `health [on\|off]` | Show health labels |
| `god [on\|off]` | Invincibility |
| `bot [on\|off]` | Enable practice AI |
| `kill` | Kill yourself (if not god mode) |
| `heal` | Restore to 100 HP |
| `firerate <ms>` | Set fire rate (1-1000) |
| `firemode <mode>` | Set single/burst/auto |
| `status` | Show game state |
| `clear` | Clear console output |

### BotController (`src/debug/BotController.js`)
AI opponent for practice mode.

**Behavior phases:**
1. Move left
2. Peek (lean out)
3. Shoot (60% accuracy)
4. Unpeek (lean back)
5. Move right
6. Repeat

---

## Known Issues & Technical Debt

### Incomplete Integration
- `ShootingSystem` fully implemented but not integrated (legacy `shoot()` in game.js)
- `EffectsSystem` ready but effect functions still in game.js
- `Player`/`Opponent` ECS entities defined but legacy `gameState`/`OpponentPlayer` drive state
- `main.js` creates event bridge but sync is manual

### Modules Status
| Module | Status | Notes |
|--------|--------|-------|
| AudioSystem | **Active** | Used throughout game.js |
| EventBus | **Active** | Events emitted but handlers mixed |
| DamageConfig | **Active** | Referenced for damage values |
| PhysicsConfig | **Active** | Referenced for movement values |
| BotController | **Active** | Practice mode AI |
| ShootingSystem | Ready | Not integrated, legacy shoot() used |
| EffectsSystem | Ready | Not integrated, legacy effects used |
| Player/Opponent | Ready | ECS structure unused |

### Future Improvements
- [ ] Integrate ShootingSystem to replace legacy shoot()
- [ ] Integrate EffectsSystem to replace legacy effect functions
- [ ] Switch from OpponentPlayer to Opponent entity
- [ ] Add unit tests
- [ ] Implement weapon switching
- [ ] Add mobile/gamepad support

---

## Build & Deploy

### Local Development
```bash
npm install
npm run dev     # Start local server
```

### Version Bump
```bash
npm run bump    # Increment GAME_VERSION
```

### GitHub Pages Deploy
Push to `master` triggers GitHub Actions workflow:
1. Bump version automatically
2. Commit version change
3. Deploy to GitHub Pages

---

## Dependencies

### Runtime
- **Three.js** r128 - 3D rendering
- **PeerJS** 1.5.2 - WebRTC P2P

### Server (optional)
- **Express** 4.18 - HTTP server
- **Socket.io** 4.7 - WebSocket fallback

### Development
- **Puppeteer** 21.0 - Screenshots
- **Serve** 14.0 - Static file server
