# Peek Shooter

**[Play Now](https://andrewboudreau.github.io/peekshooter/)**

A lean-and-crouch 3D shooter where positioning and stance control matter more than movement speed.

## Concept

Unlike traditional shooters with full movement freedom, Peek Shooter focuses on **analog stance control**:
- Smoothly control how much you crouch
- Lean left/right around cover
- Strafe between cover positions
- All stances are persistent until you change them

The core gameplay loop is peeking around obstacles to shoot targets while managing your exposure.

## Controls

| Key | Action |
|-----|--------|
| **W/S** | Stand / Crouch (analog) |
| **A/D** | Strafe left / right |
| **Q/E** | Lean left / right (analog) |
| **R** | Reset stance to neutral |
| **Mouse** | Aim (after clicking to lock) |
| **Left Click** | Shoot |
| **B** | Toggle fire mode (single/burst/auto) |
| **Tab** | Switch weapon hand |
| **ESC** | Unlock mouse |
| **~** | Open debug console |

## Features

### Analog Stance System
- Smooth interpolation on all stance changes
- Crouch affects camera height
- Lean adds camera tilt and horizontal offset
- Strafe moves between cover positions

### Recoil System
- Seeded noise generator for consistent-but-random recoil
- Per-weapon recoil profiles (vertical kick, horizontal drift, recovery rate)
- Pattern system for sustained fire behavior
- Visual weapon kick synchronized with camera recoil

### Weapon Profiles
Currently includes profiles for:
- **Assault Rifle** - Balanced recoil, medium recovery
- **SMG** - Lower recoil, faster recovery, more horizontal drift
- **Sniper** - High single-shot kick, slow recovery

## Running the Game

### Quick Start
```bash
npm install
npm start
```
Then open http://localhost:3000

### Screenshot Tool
Capture screenshots for debugging:
```bash
npm run screenshot                    # Basic capture
npm run screenshot -- -o test.png     # Custom filename
npm run screenshot -- -d 3000         # Wait 3 seconds before capture
```

## Project Structure

```
peekshooter/
├── index.html      # Game HTML + UI
├── game.js         # Core game logic
│   ├── NoiseGenerator     # Seeded PRNG for recoil
│   ├── WEAPON_PROFILES    # Configurable weapon stats
│   ├── recoilState        # Runtime recoil tracking
│   └── gameState          # Player state + constants
├── screenshot.js   # CLI screenshot tool
└── package.json
```

## Tech Stack
- Three.js for 3D rendering
- Vanilla JavaScript
- Puppeteer for screenshots

## Roadmap
- [x] Multiplayer support (WebRTC P2P)
- [x] Sound effects (procedural audio)
- [x] Fire modes (single/burst/auto)
- [ ] Additional weapons
- [ ] Enemy AI
- [ ] Mobile/gamepad support (dual analog would be ideal for this control scheme)

## License
MIT
