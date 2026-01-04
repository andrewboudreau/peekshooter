# Peek Shooter - Session Notes

Last updated: 2026-01-01

## Project Overview

A lean-and-crouch 3D shooter where analog stance control is the core mechanic rather than traditional FPS movement.

## What's Been Built

### Core Mechanics
- **Analog Crouch (W/S)** - Smooth vertical stance, persistent
- **Analog Lean (Q/E)** - Smooth left/right lean, persistent
- **Strafe (A/D)** - Move between cover positions, persistent
- **Reset Stance (R)** - Return all stance to neutral
- **Hand Switch (Tab)** - Swap weapon between left/right hand
- **Mouse Look** - Pointer lock aiming

### Recoil System
- `NoiseGenerator` class - Seeded PRNG (Mulberry32) for consistent random recoil
- `WEAPON_PROFILES` - Configurable per-weapon recoil patterns:
  - `assault_rifle` - Balanced, medium recovery
  - `smg` - Low recoil, fast recovery, more horizontal drift
  - `sniper` - High kick, slow recovery
- Pattern system for sustained fire behavior
- Visual weapon kick synced with camera recoil

### Multiplayer (Socket.io)
- **server.js** - Node.js WebSocket server
- Room-based auto-matchmaking (1v1)
- 60hz state sync (position, stance, look direction)
- Client-side hit detection, server-validated damage
- 25 damage per hit, 100 HP total (4 hits = kill)
- Round reset after 3 seconds post-kill
- Score tracking

### UI Elements
- Health bar
- Crouch/lean indicators
- Network status (Offline/Connecting/Waiting/Playing)
- Damage overlay (red vignette on hit)
- Death screen with respawn
- Hit markers

### Tools
- **screenshot.js** - Puppeteer CLI for capturing game screenshots
  ```bash
  npm run screenshot -- -o test.png -d 3000
  ```

## File Structure

```
peekshooter/
├── index.html          # Game HTML + CSS + UI
├── game.js             # All game logic (~1200 lines)
│   ├── NoiseGenerator      # Seeded PRNG
│   ├── WEAPON_PROFILES     # Weapon configs
│   ├── recoilState         # Recoil tracking
│   ├── netState            # Multiplayer state
│   ├── OpponentPlayer      # Opponent class with interpolation
│   ├── gameState           # Player state + constants
│   └── [functions]         # Init, update, render, network
├── server.js           # Socket.io multiplayer server
├── screenshot.js       # Puppeteer screenshot tool
├── package.json        # Dependencies
└── README.md           # Public readme
```

## Key Constants (game.js)

```javascript
// Stance
CROUCH_SPEED: 3
LEAN_SPEED: 4
STRAFE_SPEED: 3
STANCE_SMOOTHING: 8

// Camera
BASE_HEIGHT: 1.6
CROUCH_AMOUNT: 0.8
LEAN_AMOUNT: 0.6
LEAN_TILT: 0.15
STRAFE_AMOUNT: 2.0
LOOK_LIMIT_YAW: 0.8
LOOK_LIMIT_PITCH: 0.5

// Network
STATE_SEND_RATE: 1000/60  // 60hz
```

## Running the Game

```bash
# Install dependencies
npm install

# Start multiplayer server
npm start
# Then open http://localhost:3000

# Or for offline development
npm run dev
```

## Next Steps / Ideas

- [ ] Sound effects (shots, hits, footsteps)
- [ ] More weapon types with different feels
- [ ] Cover system improvements (multiple cover positions)
- [ ] Gamepad support (dual analog would be ideal)
- [ ] Mobile touch controls
- [ ] Server-authoritative hit detection (anti-cheat)
- [ ] Lobby system with player names
- [ ] Spectator mode
- [ ] Replay system (noise generator is seeded for determinism)
- [ ] Different game modes (best of 5, time limit)

## Technical Notes

### Recoil Noise
The `NoiseGenerator` uses seeded Mulberry32 PRNG. Same seed = same recoil pattern. This enables:
- Deterministic replays
- Network sync without sending every recoil value
- Consistent feel across sessions

### Opponent Interpolation
`OpponentPlayer.update()` interpolates toward `targetState` at `lerpSpeed = 15`. Network updates go to `targetState`, rendered state smoothly catches up. Prevents jittery movement from network latency.

### Hit Detection
Currently client-authoritative - shooter's client does raycast, sends hit to server. Server trusts it and applies damage. For production, would want server-side validation.

## Dependencies

- three.js r128 (CDN)
- socket.io 4.7.2
- express 4.18.2
- puppeteer 21.x (dev, for screenshots)
