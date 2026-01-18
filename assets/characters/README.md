# Character Assets

This folder contains 3D character models and animations for PeekShooter.

## Mixamo Export Instructions

### Downloading Characters

1. Go to [Mixamo](https://www.mixamo.com/)
2. Choose a character (T-Pose recommended)
3. Click **Download**
4. Settings:
   - Format: **FBX Binary (.fbx)**
   - Pose: **T-Pose** (for the base character)
5. Convert to GLB (see below)

### Downloading Animations

1. Select your character on Mixamo
2. Browse animations (Idle, Walking, etc.)
3. Click **Download**
4. Settings:
   - Format: **FBX Binary (.fbx)**
   - Skin: **Without Skin** (smaller file size)
   - Frames per Second: 30
   - Keyframe Reduction: None

### Converting FBX to GLB

**Option 1: Online Converter**
- Use [glTF-Transform Viewer](https://gltf-transform.donmccurdy.com/) or
- [glb-packer](https://glb-packer.glitch.me/)

**Option 2: Blender**
1. Import FBX file
2. Export as glTF 2.0 (.glb)
3. Enable: +Y Up, Apply Modifiers

**Option 3: Command Line**
```bash
npx gltf-transform copy input.fbx output.glb
```

## File Naming Convention

```
characters/
  opponent.glb         # Main opponent character model
  player.glb           # Player character (if needed)

animations/
  idle.glb             # Idle animation
  rifle_hold.glb       # Holding rifle pose
  pistol_hold.glb      # Holding pistol pose
  hit_reaction.glb     # Hit reaction animation
```

## Integration Notes

- Models are loaded by `MixamoCharacterLoader`
- Bone names are automatically remapped from Mixamo format
- Animations can be loaded separately and applied to any compatible rig
- The loader falls back to procedural humanoid if assets are missing

## Bone Mapping

Mixamo bones are automatically remapped to our internal names:

| Mixamo Bone | Internal Name |
|-------------|---------------|
| mixamorig:Hips | pelvis |
| mixamorig:Spine | stomach |
| mixamorig:Spine1/2 | chest |
| mixamorig:Neck | neck |
| mixamorig:Head | head |
| mixamorig:LeftArm | upperArmL |
| mixamorig:LeftForeArm | elbowL |
| mixamorig:LeftHand | handL |
| mixamorig:RightArm | upperArmR |
| mixamorig:RightForeArm | elbowR |
| mixamorig:RightHand | handR |
| mixamorig:LeftUpLeg | hipL |
| mixamorig:LeftLeg | kneeL |
| mixamorig:LeftFoot | ankleL |
| mixamorig:RightUpLeg | hipR |
| mixamorig:RightLeg | kneeR |
| mixamorig:RightFoot | ankleR |

## Testing

Use the Humanoid Viewer (`docs/humanoid-viewer.html`) to:
1. Load GLB files via file input
2. View bone mapping (green = mapped, red = unmapped)
3. Play animation clips
4. Test pose blending
