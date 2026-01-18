"""
FBX to GLB Converter using Blender
===================================
Converts all FBX files in assets/ to GLB format.

Usage:
  npm run convert-assets

Or manually:
  blender --background --python scripts/convert-fbx-to-glb.py
"""

import bpy
import os

# Get the project root (where this script is run from)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
ASSETS_DIR = os.path.join(PROJECT_ROOT, "assets")

def clear_scene():
    """Remove all objects from the scene"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

    # Clear orphan data
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.armatures:
        if block.users == 0:
            bpy.data.armatures.remove(block)
    for block in bpy.data.actions:
        if block.users == 0:
            bpy.data.actions.remove(block)

def convert_fbx_to_glb(fbx_path, glb_path):
    """Convert a single FBX file to GLB"""
    print(f"  Converting: {os.path.basename(fbx_path)}")

    # Clear scene
    clear_scene()

    # Import FBX
    bpy.ops.import_scene.fbx(
        filepath=fbx_path,
        use_anim=True,
        ignore_leaf_bones=False,
        automatic_bone_orientation=True
    )

    # Export as GLB
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        export_animations=True,
        export_skins=True,
        export_yup=True
    )

    print(f"  Created: {os.path.basename(glb_path)}")
    return True

def find_fbx_files(directory):
    """Recursively find all FBX files"""
    fbx_files = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.lower().endswith('.fbx'):
                fbx_files.append(os.path.join(root, file))
    return fbx_files

def main():
    print("\n" + "=" * 50)
    print("FBX to GLB Converter")
    print("=" * 50)
    print(f"Assets directory: {ASSETS_DIR}\n")

    # Find all FBX files
    fbx_files = find_fbx_files(ASSETS_DIR)

    if not fbx_files:
        print("No FBX files found in assets/")
        return

    print(f"Found {len(fbx_files)} FBX file(s):\n")

    converted = 0
    skipped = 0
    failed = 0

    for fbx_path in fbx_files:
        # Generate output path (same location, .glb extension)
        glb_path = os.path.splitext(fbx_path)[0] + ".glb"

        # Skip if GLB already exists and is newer than FBX
        if os.path.exists(glb_path):
            fbx_mtime = os.path.getmtime(fbx_path)
            glb_mtime = os.path.getmtime(glb_path)
            if glb_mtime >= fbx_mtime:
                print(f"  Skipping (up to date): {os.path.basename(fbx_path)}")
                skipped += 1
                continue

        try:
            convert_fbx_to_glb(fbx_path, glb_path)
            converted += 1
        except Exception as e:
            print(f"  FAILED: {os.path.basename(fbx_path)} - {e}")
            failed += 1

    print("\n" + "-" * 50)
    print(f"Done! Converted: {converted}, Skipped: {skipped}, Failed: {failed}")
    print("=" * 50 + "\n")

    # Also copy/rename the main character for the game
    opponent_glb = os.path.join(ASSETS_DIR, "characters", "opponent.glb")
    character_glb = os.path.join(ASSETS_DIR, "characters", "character.glb")

    if os.path.exists(character_glb) and not os.path.exists(opponent_glb):
        import shutil
        shutil.copy(character_glb, opponent_glb)
        print(f"Created opponent.glb (copy of character.glb)")

if __name__ == "__main__":
    main()
