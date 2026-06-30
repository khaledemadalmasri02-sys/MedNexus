# CAR DRIFT — New Three.js Theme Plan

## Theme Identity
- **Mode:** Dark / Neon
- **Mood:** Night racing, tire smoke, drifting, speed, urban street circuit
- **Accent Colors:** Cyan (#06B6D4), Magenta (#EC4899), Orange (#F97316)
- **Reference:** Starter-Kit Racing assets from `"C:\Users\ahmad\Downloads\new app\new app\threejs-scene\Starter-Kit-Racing-master"`

---

## Architecture Overview

```
SceneCarDrift.tsx
├── RacingTrack          — Track GLB models from Starter-Kit-Racing
├── DriftCar            — Vehicle with drift physics and tire smoke
├── StreetLights        — Neon-lit poles around track
├── TireMarks           — Animated drift marks on asphalt
├── SpeedParticles      — Motion blur / speed lines
├── Environment         — Night sky, fog, ambient glow
└── Camera              — Chase cam with drift follow
```

---

## Source Assets (from Starter-Kit-Racing-master)

### Models to Load
| File | Usage |
|------|-------|
| `track-straight.glb` | Straight track sections |
| `track-corner.glb` | Corner track sections |
| `track-bump.glb` | Speed bump |
| `track-finish.glb` | Start/finish line |
| `track-tents.glb` | Tents/gantry |
| `decoration-empty.glb` | Empty decoration |
| `decoration-forest.glb` | Trees/forest around track |
| `decoration-tents.glb` | Pit tents |
| `vehicle-truck-yellow.glb` | Player vehicle |
| `vehicle-truck-green.glb` | NPC vehicle 1 |
| `vehicle-truck-purple.glb` | NPC vehicle 2 |
| `vehicle-truck-red.glb` | NPC vehicle 3 |
| `models/Textures/colormap.png` | Shared texture atlas |

### Track Layout (from Track.js)
Grid-based system with cells:
```
[-3,-3,corner,16] [-2,-3,straight,22] [-1,-3,straight,22] [0,-3,corner,0]
[-3,-2,straight,0]                                         [0,-2,straight,0]
[-3,-1,corner,10]  [-2,-1,corner,0]   [0,-1,straight,0]
                   [-2,0,straight,10]  [0,0,finish,0]
                   [-2,1,straight,10]  [0,1,straight,0]
[-3,2,corner,10]   [-1,2,straight,16] [0,2,corner,22]
```

---

## Implementation Steps

### Step 1: RacingTrack Component
- Load all track GLB models using useGLTF from drei
- Apply colormap.png texture
- Place track pieces using the grid system from Track.js
- Scale and position appropriately
- Use InstancedMesh for decorations (trees, tents)

### Step 2: DriftCar Component
- Load vehicle-truck-yellow.glb
- Implement drift physics (simplified):
  - Forward momentum
  - Lateral slip angle for drifting
  - Tire smoke particles on drift
  - Drift marks on ground
- Keyboard/touch controls for steering and throttle

### Step 3: TireMarks
- Render dark streak marks on track where car drifts
- Fade over time
- Use simple plane geometries or decal-like rendering

### Step 4: SpeedParticles
- Emit smoke/spray from wheels during drift
- Use Points with additive blending
- Match vehicle color theme

### Step 5: StreetEnvironment
- Night sky (#0A0A0F)
- Neon-lit track edges
- Glowing finish line
- Atmospheric fog

### Step 6: Camera
- Chase camera following vehicle
- Smooth lerp with drift-aware offset
- Slight FOV increase at speed

### Step 7: Lighting
- Low ambient (night scene)
- Point lights at finish line (neon glow)
- Vehicle headlights (spotlight)
- Colored accent lights (cyan/magenta)

### Step 8: Post-Processing
- Bloom for neon glow
- Slight vignette
- Motion blur effect on speed

---

## File Structure

```
new-frontend/src/components/theme/
├── SceneCarDrift.tsx      — Main scene component
├── RacingTrack.tsx        — Track mesh placement
├── DriftCar.tsx           — Vehicle with drift physics
├── TireMarks.tsx          — Drift mark rendering
├── SpeedParticles.tsx     — Smoke/spray particles
└── StreetLights.tsx       — Neon environment lighting
```

---

## Performance Budget

| Component | Triangles | Notes |
|-----------|-----------|-------|
| Track | ~8,000 | 16 pieces, instanced decorations |
| Vehicles | ~2,000 | 4 trucks × 500 |
| Tire marks | ~500 | Dynamic planes |
| Particles | 0 | Points-based |
| **Total** | **~10,500** | Well under 50K |

---

## Three.js Adjustments

| Setting | Value |
|---------|-------|
| Background | #0A0A0F |
| Fog | Near 15, Far 80 |
| Tone Mapping | ACES Filmic |
| Exposure | 1.0 |
| Bloom | Intensity 0.6 |
| Shadows | Enabled, soft |

---

## Controls

| Input | Action |
|-------|--------|
| W / ↑ | Accelerate |
| S / ↓ | Brake |
| A / ← | Steer left |
| D / → | Steer right |
| Space | Handbrake (initiates drift) |
| Mouse | Camera orbit |

---

## Color Palette

| Element | Color |
|---------|-------|
| Sky | #0A0A0F |
| Track | #1A1A2E (dark asphalt) |
| Neon cyan | #06B6D4 |
| Neon magenta | #EC4899 |
| Vehicle orange | #F97316 |
| Tire smoke | #FFFFFF (additive) |
| Drift marks | #0D0D0D |
