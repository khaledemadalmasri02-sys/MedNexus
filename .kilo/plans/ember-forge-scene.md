# EMBER FORGE — Blender → Three.js Cinematic Scene

## Theme Identity
- **Mode:** Dark
- **Mood:** Volcanic forge, molten lava, rising embers, primal heat, industrial
- **Accent Colors:** Rose (#FB7185), Amber (#F59E0B), Orange (#F97316)
- **Reference:** Volcanic forges, molten metal, fire embers, industrial smelting

---

## Scene Architecture

```
SceneEmber.tsx
├── CameraController      — Slow dolly + mouse parallax + lookAt
├── Lighting              — 5 lights matching Blender spec + per-column lights
├── MoltenCore            — Outer distort shell + inner glowing core + point light
├── EmberParticles        — 400 GPU points, vertex colors, additive, rise + recycle
├── MoltenSpheres         — 18 orbital spheres, per-sphere pulse, float motion
├── HeatRibbons           — 7 TubeGeometry ribbons, wave deformation, vertical drift
├── ForgeColumns          — 6 octagonal columns with emissive veins + point lights
├── LavaPool              — Glowing circular pool beneath the core
├── FloatingEmbers        — 30 Trail-following octahedrons with motion
├── DistantRocks          — 12 dodecahedron boulders for depth
├── Sparkles (×2)         — 200 amber + 80 rose sparkles
└── Fog                   — #130806, near 12, far 75
```

---

## Key Improvements Over Previous Version

1. **MoltenCore** — Added inner glowing core mesh (icosahedron detail 3, #FDE68A emission) and a point light for actual scene illumination
2. **EmberParticles** — Increased to 400 particles with per-particle vertex colors using HSL color ramp matching the Blender spec (#FDE68A → #F97316 → #DC2626 → #7C2D12)
3. **MoltenSpheres** — Increased to 18 spheres with wider orbital radius and independent rotation speeds
4. **HeatRibbons** — Increased to 7 ribbons with more complex curves, per-vertex wave on both X and Z axes
5. **ForgeColumns** — Increased to 6 columns with varied heights, added secondary amber vein rings, per-column point lights
6. **LavaPool** — New: large glowing circular plane beneath the core simulating molten pool
7. **FloatingEmbers** — New: 30 octahedron meshes with Trail geometry for comet-like rising embers
8. **DistantRocks** — New: 12 dodecahedron boulders surrounding the scene for depth and scale
9. **Sparkles** — Two layers (amber + rose) with larger scale and higher count
10. **Bloom** — Increased intensity from 0.3 → 0.5, lowered threshold from 0.3 → 0.2 for more glow
11. **Tone mapping** — ACES Filmic with 1.1 exposure for cinematic warmth
12. **Camera** — Added explicit `lookAt(0, -1.5, -8)` for stable framing

---

## Performance Budget

| Component | Triangles | Notes |
|-----------|-----------|-------|
| MoltenCore | ~2,200 | Outer (1,280) + inner (512) |
| EmberParticles | 0 | Points only |
| MoltenSpheres | ~1,440 | 18 × 80 |
| HeatRibbons | ~8,960 | 7 × 80 × 8 × 2 |
| ForgeColumns | ~2,400 | 6 × (128 + 256 + 128) |
| LavaPool | ~128 | Circle geometry |
| FloatingEmbers | ~240 | 30 × 8 |
| DistantRocks | ~1,152 | 12 × 96 |
| **Total** | **~16,500** | Well under 50K target |

---

## Blender → Three.js Mapping

| Blender | Three.js |
|---------|----------|
| World Color #130806 | `fog` + dark background |
| Volume Absorption #1B0B07 | `THREE.Fog("#130806", 12, 75)` |
| Displace Modifier (Clouds/Voronoi) | `MeshDistortMaterial.distort` |
| Particle System (Newtonian) | Custom per-frame physics in `useFrame` |
| Force Field (Turbulence/Wind) | Sinusoidal sway in position updates |
| ColorRamp by particle age | HSL vertex colors with matching stops |
| Emission Strength animation | `emissiveIntensity` per-frame lerp |
| Compositor Glare | `@react-three/postprocessing` Bloom |

---

## Three.js Adjustments

- **Tone Mapping:** ACES Filmic, exposure 1.1
- **Bloom:** intensity 0.5, threshold 0.2, smoothing 0.6
- **Antialiasing:** Enabled
- **Power Preference:** High performance
- **Camera FOV:** 50 (close to Blender 55mm equivalent)
- **Fog:** Linear, near 12, far 75
