"""
Master Export Script for Anime Boys Theme 6
Exports all collections to individual GLB files with Draco compression.

Usage:
  blender --background --python export_glb.py

Requirements:
  - Blender 3.0+ (built-in Draco compression support)
  - Run from the directory containing the .blend file or append to existing scene

Output files (to ../public/models/anime-boys/):
  - boy-character-rigged.glb    (< 2MB, with rig + animations)
  - building-cyber-XX.glb       (×18 variants, < 300KB each)
  - neon-sign-XX.glb            (×8 variants, < 100KB each)
  - street-lamp-XX.glb          (×8, < 50KB each)
  - road-tile.glb               (< 200KB)
  - car-lowpoly-XX.glb          (×4, < 150KB each)
  - rain-system.glb             (< 500KB)
"""

import bpy
import os
import sys

# Configuration
OUTPUT_DIR = "//../public/models/anime-boys"
DRACO_COMPRESSION_LEVEL = 6  # 0-10, higher = smaller file, slower compression
DRACO_POSITION_QUANTIZATION = 14  # bits for position
DRACO_NORMAL_QUANTIZATION = 10  # bits for normals
DRACO_TEXCOORD_QUANTIZATION = 12  # bits for UVs


def ensure_output_dir():
    """Create output directory if it doesn't exist."""
    abs_output = bpy.path.abspath(OUTPUT_DIR)
    os.makedirs(abs_output, exist_ok=True)
    print(f"Output directory: {abs_output}")
    return abs_output


def export_collection(collection_name, file_name, export_animations=True,
                      export_skins=True, export_morph=True):
    """Export a single collection to GLB with Draco compression."""
    # Deselect all
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.select_all(action='DESELECT')

    # Select all objects in the collection and its children
    def select_collection_objects(collection):
        for obj in collection.objects:
            obj.select_set(True)
        for child_col in collection.children:
            select_collection_objects(child_col)

    collection = bpy.data.collections.get(collection_name)
    if not collection:
        print(f"  WARNING: Collection '{collection_name}' not found, skipping.")
        return

    select_collection_objects(collection)

    output_path = os.path.join(ensure_output_dir(), file_name)

    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_animations=export_animations,
        export_skins=export_skins,
        export_morph=export_morph,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=DRACO_COMPRESSION_LEVEL,
        export_draco_position_quantization=DRACO_POSITION_QUANTIZATION,
        export_draco_normal_quantization=DRACO_NORMAL_QUANTIZATION,
        export_draco_texcoord_quantization=DRACO_TEXCOORD_QUANTIZATION,
        export_image_format='WEBP',
        export_texture_dir='',
        export_colors=True,
        export_yup=True,
    )

    file_size = os.path.getsize(output_path)
    print(f"  Exported: {file_name} ({file_size / 1024:.1f} KB)")


def export_building_variants():
    """Export each building variant as a separate GLB."""
    building_col = bpy.data.collections.get("CyberBuildings")
    if not building_col:
        print("  WARNING: CyberBuildings collection not found.")
        return

    for child_col in building_col.children:
        idx = child_col.name.split("_")[-1]
        file_name = f"building-cyber-{idx}.glb"

        # Deselect all
        bpy.ops.object.select_all(action='DESELECT')

        # Select objects in this building
        def select_collection_objects(collection):
            for obj in collection.objects:
                obj.select_set(True)
            for cc in collection.children:
                select_collection_objects(cc)

        select_collection_objects(child_col)

        output_path = os.path.join(ensure_output_dir(), file_name)

        bpy.ops.export_scene.gltf(
            filepath=output_path,
            export_format='GLB',
            use_selection=True,
            export_apply=True,
            export_animations=False,
            export_draco_mesh_compression_enable=True,
            export_draco_mesh_compression_level=DRACO_COMPRESSION_LEVEL,
            export_draco_position_quantization=DRACO_POSITION_QUANTIZATION,
            export_draco_normal_quantization=DRACO_NORMAL_QUANTIZATION,
            export_draco_texcoord_quantization=DRACO_TEXCOORD_QUANTIZATION,
            export_image_format='WEBP',
            export_yup=True,
        )

        file_size = os.path.getsize(output_path)
        print(f"  Exported: {file_name} ({file_size / 1024:.1f} KB)")


def export_neon_sign_variants():
    """Export each neon sign variant as a separate GLB."""
    sign_col = bpy.data.collections.get("NeonSigns")
    if not sign_col:
        print("  WARNING: NeonSigns collection not found.")
        return

    for child_col in sign_col.children:
        idx = child_col.name.split("_")[-1]
        file_name = f"neon-sign-{idx}.glb"

        bpy.ops.object.select_all(action='DESELECT')

        def select_collection_objects(collection):
            for obj in collection.objects:
                obj.select_set(True)
            for cc in collection.children:
                select_collection_objects(cc)

        select_collection_objects(child_col)

        output_path = os.path.join(ensure_output_dir(), file_name)

        bpy.ops.export_scene.gltf(
            filepath=output_path,
            export_format='GLB',
            use_selection=True,
            export_apply=True,
            export_animations=True,
            export_draco_mesh_compression_enable=True,
            export_draco_mesh_compression_level=DRACO_COMPRESSION_LEVEL,
            export_draco_position_quantization=DRACO_POSITION_QUANTIZATION,
            export_draco_normal_quantization=DRACO_NORMAL_QUANTIZATION,
            export_draco_texcoord_quantization=DRACO_TEXCOORD_QUANTIZATION,
            export_image_format='WEBP',
            export_yup=True,
        )

        file_size = os.path.getsize(output_path)
        print(f"  Exported: {file_name} ({file_size / 1024:.1f} KB)")


def export_street_lamp_variants():
    """Export each street lamp as a separate GLB."""
    lamp_col = bpy.data.collections.get("StreetLamps")
    if not lamp_col:
        print("  WARNING: StreetLamps collection not found.")
        return

    for child_col in lamp_col.children:
        idx = child_col.name.split("_")[-1]
        file_name = f"street-lamp-{idx}.glb"

        bpy.ops.object.select_all(action='DESELECT')

        def select_collection_objects(collection):
            for obj in collection.objects:
                obj.select_set(True)
            for cc in collection.children:
                select_collection_objects(cc)

        select_collection_objects(child_col)

        output_path = os.path.join(ensure_output_dir(), file_name)

        bpy.ops.export_scene.gltf(
            filepath=output_path,
            export_format='GLB',
            use_selection=True,
            export_apply=True,
            export_animations=False,
            export_draco_mesh_compression_enable=True,
            export_draco_mesh_compression_level=DRACO_COMPRESSION_LEVEL,
            export_draco_position_quantization=DRACO_POSITION_QUANTIZATION,
            export_draco_normal_quantization=DRACO_NORMAL_QUANTIZATION,
            export_draco_texcoord_quantization=DRACO_TEXCOORD_QUANTIZATION,
            export_image_format='WEBP',
            export_yup=True,
        )

        file_size = os.path.getsize(output_path)
        print(f"  Exported: {file_name} ({file_size / 1024:.1f} KB)")


def export_car_variants():
    """Export each car variant as a separate GLB."""
    car_col = bpy.data.collections.get("Cars")
    if not car_col:
        print("  WARNING: Cars collection not found.")
        return

    for child_col in car_col.children:
        idx = child_col.name.split("_")[-1]
        file_name = f"car-lowpoly-{idx}.glb"

        bpy.ops.object.select_all(action='DESELECT')

        def select_collection_objects(collection):
            for obj in collection.objects:
                obj.select_set(True)
            for cc in collection.children:
                select_collection_objects(cc)

        select_collection_objects(child_col)

        output_path = os.path.join(ensure_output_dir(), file_name)

        bpy.ops.export_scene.gltf(
            filepath=output_path,
            export_format='GLB',
            use_selection=True,
            export_apply=True,
            export_animations=True,
            export_draco_mesh_compression_enable=True,
            export_draco_mesh_compression_level=DRACO_COMPRESSION_LEVEL,
            export_draco_position_quantization=DRACO_POSITION_QUANTIZATION,
            export_draco_normal_quantization=DRACO_NORMAL_QUANTIZATION,
            export_draco_texcoord_quantization=DRACO_TEXCOORD_QUANTIZATION,
            export_image_format='WEBP',
            export_yup=True,
        )

        file_size = os.path.getsize(output_path)
        print(f"  Exported: {file_name} ({file_size / 1024:.1f} KB)")


def main():
    print("=" * 60)
    print("Anime Boys Theme 6 — GLB Export Pipeline")
    print("=" * 60)

    ensure_output_dir()

    print("\n[1/7] Exporting Anime Boy Character (with rig + animations)...")
    export_collection("AnimeBoyCharacter", "boy-character-rigged.glb",
                      export_animations=True, export_skins=True, export_morph=True)

    print("\n[2/7] Exporting Cyberpunk Buildings (18 variants)...")
    export_building_variants()

    print("\n[3/7] Exporting Neon Signs (8 variants)...")
    export_neon_sign_variants()

    print("\n[4/7] Exporting Street Lamps (8 variants)...")
    export_street_lamp_variants()

    print("\n[5/7] Exporting Road & Puddles...")
    export_collection("RoadAndPuddles", "road-tile.glb", export_animations=False)

    print("\n[6/7] Exporting Cars (4 variants)...")
    export_car_variants()

    print("\n[7/7] Exporting Rain System...")
    # Rain system is a single object with particle system
    bpy.ops.object.select_all(action='DESELECT')
    rain_emitter = bpy.data.objects.get("RainEmitter")
    rain_drop = bpy.data.objects.get("RainDropInstance")
    if rain_emitter:
        rain_emitter.select_set(True)
    if rain_drop:
        rain_drop.select_set(True)
    if rain_emitter or rain_drop:
        output_path = os.path.join(ensure_output_dir(), "rain-system.glb")
        bpy.ops.export_scene.gltf(
            filepath=output_path,
            export_format='GLB',
            use_selection=True,
            export_apply=True,
            export_animations=False,
            export_draco_mesh_compression_enable=True,
            export_draco_mesh_compression_level=DRACO_COMPRESSION_LEVEL,
            export_draco_position_quantization=DRACO_POSITION_QUANTIZATION,
            export_draco_normal_quantization=DRACO_NORMAL_QUANTIZATION,
            export_draco_texcoord_quantization=DRACO_TEXCOORD_QUANTIZATION,
            export_image_format='WEBP',
            export_yup=True,
        )
        file_size = os.path.getsize(output_path)
        print(f"  Exported: rain-system.glb ({file_size / 1024:.1f} KB)")
    else:
        print("  WARNING: Rain system objects not found, skipping.")

    # Summary
    print("\n" + "=" * 60)
    print("Export Complete!")
    print("=" * 60)
    abs_output = bpy.path.abspath(OUTPUT_DIR)
    files = sorted(os.listdir(abs_output))
    total_size = 0
    for f in files:
        fpath = os.path.join(abs_output, f)
        fsize = os.path.getsize(fpath)
        total_size += fsize
        print(f"  {f}: {fsize / 1024:.1f} KB")
    print(f"\nTotal: {len(files)} files, {total_size / 1024:.1f} KB ({total_size / (1024*1024):.2f} MB)")


if __name__ == "__main__":
    main()
