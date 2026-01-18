# CLAUDE.md

## Project Overview

**Peek Shooter** is a 3D first-person tactical shooter built with Three.js. The core mechanic focuses on analog stance control (crouch, lean, strafe) rather than traditional movement. Players peek around cover to shoot opponents while managing exposure.

**Play at:** https://andrewboudreau.github.io/peekshooter/

## Tech Stack

- **Three.js** (r128) - 3D rendering (bundled in `lib/three.min.js`)
- **PeerJS** (1.5.2) - WebRTC P2P multiplayer (bundled in `lib/peerjs.min.js`)
- **Socket.io** (4.7.2) + Express - Server fallback for multiplayer
- **Web Audio API** - Procedural sound generation (no audio files)
- **Vanilla JavaScript** - No frontend framework

## Quick Commands

```bash
npm install          # Install dependencies
npm start            # Start server on localhost:3000
npm run dev          # Static file server via 'serve'
npm test             # Run multiplayer bot test
npm run screenshot   # Capture game screenshot
npm run bump         # Auto-increment GAME_VERSION
```

## Project Structure

```
peekshooter/
├── index.html          # Main entry point with UI/HUD
├── game.js             # Core game logic (~4,900 lines, monolithic)
├── server.js           # Express + Socket.io multiplayer server
├── src/                # Modern modular architecture
│   ├── config/         # Data-driven configuration
│   │   ├── DamageConfig.js   # Body part damage values
│   │   ├── PhysicsConfig.js  # Movement, camera, network constants
│   │   ├── WeaponConfig.js   # 5 weapons with full stats
│   │   └── MapConfig.js      # Level layouts, obstacles, lighting
│   ├── core/
│   │   └── EventBus.js       # Pub/sub event system
│   ├── components/           # ECS components
│   │   ├── HealthComponent.js
│   │   ├── TransformComponent.js
│   │   └── HitboxComponent.js
│   ├── entities/             # ECS entities
│   │   ├── Entity.js
│   │   ├── Player.js
│   │   └── Opponent.js
│   ├── systems/              # Game systems
│   │   ├── AudioSystem.js
│   │   ├── EffectsSystem.js
│   │   └── ShootingSystem.js
│   ├── weapons/
│   │   └── WeaponFactory.js  # Procedural 3D weapon models
│   ├── debug/
│   │   └── BotController.js  # Practice AI opponent
│   └── main.js               # Module initialization
├── lib/                # Bundled libraries
│   ├── three.min.js
│   └── peerjs.min.js
└── docs/               # HTML documentation
```

## Architecture Notes

**Hybrid Architecture**: Legacy monolithic `game.js` + modern modular `src/` folder. New modules integrate alongside legacy code with bridging functions.

**Module Load Order** (in `index.html`):
1. Libraries (three.min.js, peerjs.min.js)
2. Config files (DamageConfig, PhysicsConfig, WeaponConfig, MapConfig)
3. Core (EventBus)
4. ECS (Entity, Components, Player, Opponent)
5. Systems (Shooting, Effects, Audio)
6. WeaponFactory, BotController
7. main.js (bridging)
8. game.js (main loop)

**Key Patterns**:
- All game mechanics are data-driven through config objects - no magic numbers
- EventBus for cross-system communication
- 60Hz network state sync
- Client-authoritative hit detection

## Key Files

| File | Purpose |
|------|---------|
| `game.js` | Main game loop, input handling, rendering, networking |
| `src/config/WeaponConfig.js` | Weapon stats (damage, fire rate, recoil, etc.) |
| `src/config/PhysicsConfig.js` | Movement speeds, body dimensions, network rate |
| `src/config/DamageConfig.js` | Body part multipliers, health values |
| `src/systems/AudioSystem.js` | Procedural sound synthesis |
| `src/debug/BotController.js` | Practice AI bot |

## game.js Sections

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

## Common Tasks

### Adding a New Weapon
1. Add weapon definition to `src/config/WeaponConfig.js`
2. Create first-person model in `src/weapons/WeaponFactory.js` → `createWeapon()`
3. Create opponent model in `WeaponFactory.js` → `createOpponentWeapon()`

### Adding a New Map
1. Add map definition to `src/config/MapConfig.js`
2. Define: floor, walls, playerCover, opponentCover, staticObstacles, lighting

### Adding a New Component
1. Create class extending `Component` in `src/components/`
2. Implement lifecycle hooks: `onAttach()`, `update()`, `onDetach()`
3. Add to entities that need it

### Adding a New System
1. Create in `src/systems/`
2. Subscribe to relevant `GameEvents`
3. Initialize in `src/main.js`

## Debug Console

Press **~** to toggle. Commands:
- `help` - List all commands
- `debug [on|off]` - Toggle debug mode
- `hitboxes [on|off]` - Show opponent hitboxes
- `health [on|off]` - Show health labels
- `bot [on|off]` - Toggle practice bot
- `god [on|off]` - Invincibility
- `firerate <ms>` - Set fire rate (1-1000)
- `firemode <mode>` - Set mode (single/burst/auto)
- `status` - Show game state

## Network State (60Hz)

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

## Deployment

GitHub Actions auto-deploys on push to `master`:
1. Bumps `GAME_VERSION` in game.js
2. Commits version change with `[skip ci]`
3. Deploys to GitHub Pages

## Controls

| Key | Action |
|-----|--------|
| W/S | Stand / Crouch (analog) |
| A/D | Strafe left / right |
| Q/E | Lean left / right (analog) |
| R | Reset stance |
| Mouse | Aim |
| Left Click | Shoot |
| B | Toggle fire mode |
| Tab | Switch weapon hand |
| ESC | Unlock mouse |
| ~ | Debug console |
