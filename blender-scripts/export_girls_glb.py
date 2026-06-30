"""
Master Export Script for Anime Girls Theme 7
Exports all collections to individual GLB files with Draco compression.

Usage:
  blender --background --python export_girls_glb.py

Output files (to ../public/models/anime-girls/):
  - girl-character-rigged.glb    (< 2MB, with rig + animations)
  - building-pastel-XX.glb        (×18 variants, < 300KB each)
  - cafe-shop.glb                 (< 400KB)
  - street-lamp-cute-XX.glb       (×8, < 50KB each)
  - road-tile-warm.glb            (< 200KB)
  - car-cute-XX.glb               (×3, < 150KB each)
  - sakura-petals-warm.glb        (< 400KB)
  - npc-figure-XX.glb             (×6, < 200KB each)
"""

import bpy
import os

OUTPUT_DIR = "//../public/models/anime-girls"
DRACO_COMPRESSION_LEVEL = 6
DRACO_POSITION_QUANTIZATION = 14
DRACO_NORMAL_QUANTIZATION = 10
DRACO_TEXCOORD_QUANTIZATION = 12


def ensure_output_dir():
    abs_output = bpy.path.abspath(OUTPUT_DIR)
    os.makedirs(abs_output, exist_ok=True)
    print(f"Output directory: {abs_output}")
    return abs_output


def select_collection_objects(collection):
    for obj in collection.objects:
        obj.select_set(True)
    for child_col in collection.children:
        select_collection_objects(child_col)


def export_collection(collection_name, file_name, export_animations=True,
                      export_skins=True, export_morph=True):
    collection = bpy.data.collections.get(collection_name)
    if not collection:
        print(f"  WARNING: Collection '{collection_name}' not found, skipping.")
        return
    bpy.ops.object.select_all(action='DESELECT')
    select_collection_objects(collection)
    output_path = os.path.join(ensure_output_dir(), file_name)
    bpy.ops.export_scene.gltf(
        filepath=output_path, export_format='GLB', use_selection=True,
        export_apply=True, export_animations=export_animations,
        export_skins=export_skins, export_morph=export_morph,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=DRACO_COMPRESSION_LEVEL,
        export_draco_position_quantization=DRACO_POSITION_QUANTIZATION,
        export_draco_normal_quantization=DRACO_NORMAL_QUANTIZATION,
        export_draco_texcoord_quantization=DRACO_TEXCOORD_QUANTIZATION,
        export_image_format='WEBP', export_yup=True,
    )
    file_size = os.path.getsize(output_path)
    print(f"  Exported: {file_name} ({file_size / 1024:.1f} KB)")


def export_child_collections(parent_name, file_prefix, export_anim=False):
    parent = bpy.data.collections.get(parent_name)
    if not parent:
        print(f"  WARNING: {parent_name} not found.")
        return
    for child_col in parent.children:
        idx = child_col.name.split("_")[-1]
        file_name = f"{file_prefix}-{idx}.glb"
        bpy.ops.object.select_all(action='DESELECT')
        select_collection_objects(child_col)
        output_path = os.path.join(ensure_output_dir(), file_name)
        bpy.ops.export_scene.gltf(
            filepath=output_path, export_format='GLB', use_selection=True,
            export_apply=True, export_animations=export_anim,
            export_draco_mesh_compression_enable=True,
            export_draco_mesh_compression_level=DRACO_COMPRESSION_LEVEL,
            export_draco_position_quantization=DRACO_POSITION_QUANTIZATION,
            export_draco_normal_quantization=DRACO_NORMAL_QUANTIZATION,
            export_draco_texcoord_quantization=DRACO_TEXCOORD_QUANTIZATION,
            export_image_format='WEBP', export_yup=True,
        )
        file_size = os.path.getsize(output_path)
        print(f"  Exported: {file_name} ({file_size / 1024:.1f} KB)")


def main():
    print("=" * 60)
    print("Anime Girls Theme 7 — GLB Export Pipeline")
    print("=" * 60)
    ensure_output_dir()

    print("\n[1/8] Exporting Anime Girl Character...")
    export_collection("AnimeGirlCharacter", "girl-character-rigged.glb", True, True, True)

    print("\n[2/8] Exporting Pastel Buildings (18 variants)...")
    export_child_collections("PastelBuildings", "building-pastel")

    print("\n[3/8] Exporting Café Shop...")
    export_collection("CafeShop", "cafe-shop.glb", False)

    print("\n[4/8] Exporting Street Lamps (8 variants)...")
    export_child_collections("StreetLampsCute", "street-lamp-cute")

    print("\n[5/8] Exporting Road & Trees...")
    export_collection("RoadWarm", "road-tile-warm.glb", False)

    print("\n[6/8] Exporting Cute Cars (3 variants)...")
    export_child_collections("CuteCars", "car-cute", export_anim=True)

    print("\n[7/8] Exporting Sakura Petals...")
    export_collection("SakuraPetals", "sakura-petals-warm.glb", False)

    print("\n[8/8] Exporting NPC Figures (6 variants)...")
    export_child_collections("NPCFigures", "npc-figure")

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
