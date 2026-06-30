"""
Anime Girls Theme 7 — Full Blender Scene Creation
Pastel Tokyo street with anime girl character, cherry blossoms, cute café district.

Usage:
  blender --background --python create_anime_girls_scene.py

Produces a complete scene with:
  - Warm pastel world (#FFF7FB)
  - Animated cinematic camera (720 frames)
  - 6 lights (sun, pink fill, orange accent, cyan rim, ambient, ground)
  - Anime girl character with rig + walk cycle + blink + hair/skirt physics
  - 18 pastel building variants
  - Café shop
  - 8 cute street lamps
  - Warm road with cherry blossom trees
  - 3 cute cars (1 driving)
  - Sakura petal particle system
  - 6 NPC figures
  - Post-processing compositor
"""

import bpy
import math
import random
import colorsys
from mathutils import Vector

random.seed(7)

# ─── Color Constants ───
PINK = (0.957, 0.447, 0.714, 1.0)       # #F472B6
ORANGE = (0.984, 0.573, 0.235, 1.0)     # #FB923C
CYAN = (0.404, 0.910, 0.976, 1.0)       # #67E8F9
SKIN = (0.961, 0.816, 0.690, 1.0)       # #F5D0B0
SKIN_SUB = (0.941, 0.753, 0.627, 1.0)   # #F0C0A0
HAIR_BASE = (0.831, 0.471, 0.612, 1.0)  # #D4789C
HAIR_HL = (0.941, 0.627, 0.784, 1.0)    # #F0A0C8
IRIS_COLOR = (0.831, 0.471, 0.612, 1.0) # #D4789C (pink iris)
JACKET = (0.957, 0.447, 0.714, 1.0)     # #F472B6
SHIRT = (1.0, 1.0, 1.0, 1.0)            # #FFFFFF
SKIRT = (0.745, 0.094, 0.365, 1.0)      # #BE185D
SOCKS = (1.0, 1.0, 1.0, 1.0)            # #FFFFFF
SHOE_MAIN = (1.0, 1.0, 1.0, 1.0)        # #FFFFFF
SHOE_ACCENT = (0.957, 0.447, 0.714, 1.0)# #F472B6
BAG_MAIN = (0.992, 0.643, 0.686, 1.0)   # #FDA4AF
BAG_FLAP = (0.984, 0.443, 0.522, 1.0)   # #FB7185
WORLD_BG = (1.0, 0.969, 0.984, 1.0)     # #FFF7FB
PINK_FILL = (1.0, 0.918, 0.953, 1.0)    # #FFEAF3
SUN_COLOR = (1.0, 0.969, 0.980, 1.0)    # #FFF7FA
MOUTH_COLOR = (0.910, 0.627, 0.722, 1.0)# #E8A0B8
LASH_COLOR = (0.102, 0.102, 0.180, 1.0) # #1A1A2E
WARM_WOOD = (0.831, 0.647, 0.455, 1.0)  # #D4A574
CAFE_METAL = (0.898, 0.906, 0.922, 1.0) # #E5E7EB
STRING_LIGHT = (0.992, 0.902, 0.541, 1.0)# #FDE68A
POLE_COLOR = (0.898, 0.906, 0.922, 1.0) # #E5E7EB
ROAD_COLOR = (0.898, 0.878, 0.847, 1.0) # #E5E0D8
SIDEWALK_COLOR = (0.961, 0.929, 0.878, 1.0) # #F5EDE0
CHERRYBLOSSOM_1 = (0.984, 0.812, 0.910, 1.0) # #FBCFE8
CHERRYBLOSSOM_2 = (0.976, 0.659, 0.831, 1.0) # #F9A8D4
CHERRYBLOSSOM_3 = (0.957, 0.447, 0.714, 1.0) # #F472B6
CAR_PINK = (0.984, 0.812, 0.910, 1.0)   # #FBCFE8
CAR_BLUE = (0.749, 0.863, 0.996, 1.0)   # #BFDBFE
CAR_YELLOW = (0.992, 0.902, 0.541, 1.0) # #FDE68A
CAR_GREEN = (0.655, 0.953, 0.816, 1.0)  # #A7F3D0


def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        bpy.data.collections.remove(collection)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat)
    for arm in list(bpy.data.armatures):
        bpy.data.armatures.remove(arm)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)


def make_material(name, color, metallic=0.0, roughness=0.7, emissive=False,
                  emissive_color=None, emissive_strength=0.0, alpha=1.0,
                  subsurface=0.0, subsurface_color=None, ior=1.45,
                  specular=0.5, clearcoat=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    output = nodes.new('ShaderNodeOutputMaterial')
    output.location = (600, 0)
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.location = (200, 0)
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Alpha'].default_value = alpha
    bsdf.inputs['Specular IOR Level'].default_value = specular
    bsdf.inputs['Coat Weight'].default_value = clearcoat
    bsdf.inputs['IOR'].default_value = ior
    if subsurface > 0:
        bsdf.inputs['Subsurface Weight'].default_value = subsurface
        if subsurface_color:
            bsdf.inputs['Subsurface Color'].default_value = subsurface_color
    if emissive:
        bsdf.inputs['Emission Color'].default_value = emissive_color or color
        bsdf.inputs['Emission Strength'].default_value = emissive_strength
    links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
    return mat


# ═══════════════════════════════════════
# WORLD SETTINGS
# ═══════════════════════════════════════
def setup_world():
    world = bpy.data.worlds.new(name="AnimeGirlsWorld")
    bpy.context.scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    nodes.clear()
    output = nodes.new('ShaderNodeOutputWorld')
    output.location = (400, 0)
    bg = nodes.new('ShaderNodeBackground')
    bg.location = (0, 0)
    bg.inputs['Color'].default_value = WORLD_BG
    bg.inputs['Strength'].default_value = 0.6
    links.new(bg.outputs['Background'], output.inputs['Surface'])
    # AO
    bpy.context.scene.eevee.use_gtao = True
    bpy.context.scene.eevee.gtao_distance = 1.5
    bpy.context.scene.eevee.gtao_factor = 0.25


# ═══════════════════════════════════════
# CAMERA SETUP
# ═══════════════════════════════════════
def setup_camera():
    cam_data = bpy.data.cameras.new(name="CinematicCam")
    cam_data.lens = 38.0
    cam_data.clip_start = 0.1
    cam_data.clip_end = 200.0
    cam_obj = bpy.data.objects.new(name="CinematicCam", object_data=cam_data)
    bpy.context.collection.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj
    cam_obj.location = (2.2, 3.2, 7.5)
    cam_obj.rotation_euler = (math.radians(-12), math.radians(12), 0)
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 720
    bpy.context.scene.render.fps = 30
    # Animate
    cam_obj.location = (2.2, 3.2, 7.5)
    cam_obj.keyframe_insert(data_path="location", frame=1)
    cam_obj.location = (2.5, 3.1, 7.0)
    cam_obj.keyframe_insert(data_path="location", frame=360)
    cam_obj.location = (2.2, 3.2, 7.5)
    cam_obj.keyframe_insert(data_path="location", frame=720)
    if cam_obj.animation_data and cam_obj.animation_data.action:
        for fcurve in cam_obj.animation_data.action.fcurves:
            for kf in fcurve.keyframe_points:
                kf.interpolation = 'BEZIER'
                kf.easing = 'EASE_IN_OUT'


# ═══════════════════════════════════════
# LIGHTING SETUP (6 lights)
# ═══════════════════════════════════════
def setup_lighting():
    # Light 1 — Warm Sun
    sun = bpy.data.lights.new(name="WarmSun", type='SUN')
    sun.color = SUN_COLOR[:3]
    sun.energy = 3.0
    sun.angle = math.radians(4)
    obj1 = bpy.data.objects.new(name="WarmSun", object_data=sun)
    bpy.context.collection.objects.link(obj1)
    obj1.location = (8, 14, 6)
    obj1.rotation_euler = (math.radians(45), math.radians(15), 0)

    # Light 2 — Pink Fill (Area)
    area2 = bpy.data.lights.new(name="PinkFill", type='AREA')
    area2.color = PINK_FILL[:3]
    area2.energy = 120
    area2.size = 12
    obj2 = bpy.data.objects.new(name="PinkFill", object_data=area2)
    bpy.context.collection.objects.link(obj2)
    obj2.location = (-6, 4, 8)

    # Light 3 — Orange Accent (Point)
    pt3 = bpy.data.lights.new(name="OrangeAccent", type='POINT')
    pt3.color = ORANGE[:3]
    pt3.energy = 200
    pt3.shadow_soft_size = 6
    obj3 = bpy.data.objects.new(name="OrangeAccent", object_data=pt3)
    bpy.context.collection.objects.link(obj3)
    obj3.location = (5, 3, -6)

    # Light 4 — Cyan Rim (Point)
    pt4 = bpy.data.lights.new(name="CyanRim", type='POINT')
    pt4.color = CYAN[:3]
    pt4.energy = 150
    pt4.shadow_soft_size = 5
    obj4 = bpy.data.objects.new(name="CyanRim", object_data=pt4)
    bpy.context.collection.objects.link(obj4)
    obj4.location = (-4, 4, -10)

    # Light 5 — Ambient (Area)
    area5 = bpy.data.lights.new(name="AmbientArea", type='AREA')
    area5.color = WORLD_BG[:3]
    area5.energy = 80
    area5.size = 25
    obj5 = bpy.data.objects.new(name="AmbientArea", object_data=area5)
    bpy.context.collection.objects.link(obj5)
    obj5.location = (0, 10, 0)

    # Light 6 — Ground Warm (Area)
    area6 = bpy.data.lights.new(name="GroundWarm", type='AREA')
    area6.color = PINK_FILL[:3]
    area6.energy = 40
    area6.size = 20
    obj6 = bpy.data.objects.new(name="GroundWarm", object_data=area6)
    bpy.context.collection.objects.link(obj6)
    obj6.location = (0, -1, 0)


# ═══════════════════════════════════════
# MODEL 1: ANIME GIRL CHARACTER
# ═══════════════════════════════════════
def create_anime_girl():
    char_col = bpy.data.collections.new("AnimeGirlCharacter")
    bpy.context.scene.collection.children.link(char_col)

    # Materials
    skin_mat = make_material("GirlSkin", SKIN, roughness=0.7, subsurface=0.18, subsurface_color=SKIN_SUB)
    hair_mat = make_material("GirlHair", HAIR_BASE, roughness=0.85, metallic=0.02)
    hair_hl_mat = make_material("GirlHairHL", HAIR_HL, roughness=0.85, metallic=0.02)
    sclera_mat = make_material("GirlSclera", (1,1,1,1), roughness=0.3)
    iris_mat = make_material("GirlIris", IRIS_COLOR, roughness=0.2)
    highlight_mat = make_material("GirlHighlight", CYAN, emissive=True, emissive_color=CYAN, emissive_strength=0.3)
    lash_mat = make_material("GirlLashes", LASH_COLOR)
    nose_mat = make_material("GirlNose", SKIN, roughness=0.7)
    mouth_mat = make_material("GirlMouth", MOUTH_COLOR, roughness=0.6)
    jacket_mat = make_material("GirlJacket", JACKET, roughness=0.7, metallic=0.05)
    shirt_mat = make_material("GirlShirt", SHIRT, roughness=0.8, metallic=0.02)
    skirt_mat = make_material("GirlSkirt", SKIRT, roughness=0.75, metallic=0.03)
    socks_mat = make_material("GirlSocks", SOCKS, roughness=0.6)
    shoe_main_mat = make_material("GirlShoeMain", SHOE_MAIN, roughness=0.4)
    shoe_accent_mat = make_material("GirlShoeAccent", SHOE_ACCENT, roughness=0.4, emissive=True, emissive_color=SHOE_ACCENT, emissive_strength=0.15)
    hp_body_mat = make_material("GirlHPBody", JACKET, roughness=0.4)
    hp_led_mat = make_material("GirlHPLED", CYAN, roughness=0.3, emissive=True, emissive_color=CYAN, emissive_strength=0.3)
    bag_main_mat = make_material("GirlBagMain", BAG_MAIN, roughness=0.6)
    bag_flap_mat = make_material("GirlBagFlap", BAG_FLAP, roughness=0.6)
    bag_clasp_mat = make_material("GirlBagClasp", JACKET, emissive=True, emissive_color=JACKET, emissive_strength=0.2)

    # ─── Head ───
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.36, segments=32, rings=16, location=(0, 0, 1.58))
    head = bpy.context.active_object
    head.name = "Head"
    head.scale = (1.0, 1.03, 0.93)
    bpy.ops.object.transform_apply(scale=True)
    head.data.materials.append(skin_mat)
    char_col.objects.link(head)
    bpy.context.collection.objects.unlink(head)

    # Shape keys
    head.shape_key_add(name="Basis")
    head.shape_key_add(name="Blink")
    head.shape_key_add(name="MouthOpen")
    head.shape_key_add(name="Smile")
    head.shape_key_add(name="Surprise")

    # ─── Hair ───
    # Main volume back
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.38, segments=24, rings=12, location=(0, 0.04, 1.66))
    hair_back = bpy.context.active_object
    hair_back.name = "HairBack"
    hair_back.scale = (1.02, 1.04, 0.92)
    bpy.ops.object.transform_apply(scale=True)
    hair_back.data.materials.append(hair_mat)
    char_col.objects.link(hair_back)
    bpy.context.collection.objects.unlink(hair_back)

    hair_pieces = [hair_back]
    # Bangs
    bang_data = [
        (-0.14, 0.08, 1.87, 0.2, 0, 0.05),
        (0.10, 0.10, 1.89, 0.15, 0, -0.03),
        (0, 0.14, 1.90, 0.18, 0, 0),
        (-0.22, 0.06, 1.84, 0.12, 0.1, 0.08),
        (0.20, 0.06, 1.85, 0.14, -0.1, -0.06),
        (-0.18, -0.02, 1.78, 0.1, 0.2, 0.1),
        (0.16, -0.01, 1.79, 0.11, -0.15, -0.08),
    ]
    for i, (x, y, z, rx, ry, rz) in enumerate(bang_data):
        bpy.ops.mesh.primitive_cone_add(radius1=0.04, depth=0.10, location=(x, y, z))
        bang = bpy.context.active_object
        bang.name = f"HairBang_{i}"
        bang.rotation_euler = (rx, ry, rz)
        bpy.ops.object.transform_apply(rotation=True)
        bang.data.materials.append(hair_hl_mat if i % 2 == 0 else hair_mat)
        char_col.objects.link(bang)
        bpy.context.collection.objects.unlink(bang)
        hair_pieces.append(bang)

    # Side locks
    for side in [-1, 1]:
        for j in range(3):
            bx = side * (0.32 + j * 0.02)
            by = -0.04 - j * 0.03
            bz = 1.55 - j * 0.08
            bpy.ops.mesh.primitive_cone_add(radius1=0.035, depth=0.14, location=(bx, by, bz))
            lock = bpy.context.active_object
            lock.name = f"HairSide_{'L' if side == -1 else 'R'}_{j}"
            lock.rotation_euler = (-0.2 - j * 0.1, 0, side * 0.25)
            bpy.ops.object.transform_apply(rotation=True)
            lock.data.materials.append(hair_mat)
            char_col.objects.link(lock)
            bpy.context.collection.objects.unlink(lock)
            hair_pieces.append(lock)

    # Back hair strands
    for i in range(5):
        angle = (i / 5) * math.pi * 0.6 - math.pi * 0.3
        bx = math.sin(angle) * 0.25
        by = -0.1 - i * 0.03
        bz = 1.35 - i * 0.06
        bpy.ops.mesh.primitive_cone_add(radius1=0.04, depth=0.20, location=(bx, by, bz))
        strand = bpy.context.active_object
        strand.name = f"HairStrand_{i}"
        strand.rotation_euler = (-0.15 - i * 0.05, angle * 0.3, angle * 0.2)
        bpy.ops.object.transform_apply(rotation=True)
        strand.data.materials.append(hair_hl_mat if i % 2 == 0 else hair_mat)
        char_col.objects.link(strand)
        bpy.context.collection.objects.unlink(strand)
        hair_pieces.append(strand)

    # ─── Eyes ───
    for side in [-1, 1]:
        # Sclera
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.07, segments=12, rows=8, location=(side * 0.09, -0.02, 1.51))
        sclera = bpy.context.active_object
        sclera.name = f"Sclera_{'L' if side == -1 else 'R'}"
        sclera.scale = (1.1, 1.0, 0.5)
        bpy.ops.object.transform_apply(scale=True)
        sclera.data.materials.append(sclera_mat)
        char_col.objects.link(sclera)
        bpy.context.collection.objects.unlink(sclera)
        # Iris
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.045, segments=10, rows=6, location=(side * 0.09, 0.0, 1.515))
        iris = bpy.context.active_object
        iris.name = f"Iris_{'L' if side == -1 else 'R'}"
        iris.scale = (1.1, 1.0, 0.5)
        bpy.ops.object.transform_apply(scale=True)
        iris.data.materials.append(iris_mat)
        char_col.objects.link(iris)
        bpy.context.collection.objects.unlink(iris)
        # Highlight dot
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.01, rows=4, segments=6, location=(side * 0.07, 0.02, 1.57))
        hl = bpy.context.active_object
        hl.name = f"Highlight_{'L' if side == -1 else 'R'}"
        hl.data.materials.append(highlight_mat)
        char_col.objects.link(hl)
        bpy.context.collection.objects.unlink(hl)
        # Eyelashes
        bpy.ops.mesh.primitive_plane_add(size=0.06, location=(side * 0.09, -0.01, 1.53))
        lash = bpy.context.active_object
        lash.name = f"Lash_{'L' if side == -1 else 'R'}"
        lash.scale = (1.0, 0.02, 0.08)
        bpy.ops.object.transform_apply(scale=True)
        lash.data.materials.append(lash_mat)
        char_col.objects.link(lash)
        bpy.context.collection.objects.unlink(lash)

    # ─── Nose ───
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.02, rows=4, segments=6, location=(0, -0.02, 1.47))
    nose = bpy.context.active_object
    nose.name = "Nose"
    nose.scale = (0.6, 0.4, 0.4)
    bpy.ops.object.transform_apply(scale=True)
    nose.data.materials.append(nose_mat)
    char_col.objects.link(nose)
    bpy.context.collection.objects.unlink(nose)

    # ─── Mouth ───
    bpy.ops.mesh.primitive_cube_add(size=0.04, location=(0, -0.09, 1.44))
    mouth = bpy.context.active_object
    mouth.name = "Mouth"
    mouth.scale = (1.0, 0.2, 0.1)
    bpy.ops.object.transform_apply(scale=True)
    mouth.data.materials.append(mouth_mat)
    char_col.objects.link(mouth)
    bpy.context.collection.objects.unlink(mouth)

    # ─── Ears ───
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.025, rows=4, segments=6, location=(side * 0.34, 0.0, 1.55))
        ear = bpy.context.active_object
        ear.name = f"Ear_{'L' if side == -1 else 'R'}"
        ear.scale = (0.4, 1.0, 0.8)
        bpy.ops.object.transform_apply(scale=True)
        ear.data.materials.append(skin_mat)
        char_col.objects.link(ear)
        bpy.context.collection.objects.unlink(ear)

    # ─── Neck ───
    bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=0.12, vertices=8, location=(0, 0, 1.32))
    neck = bpy.context.active_object
    neck.name = "Neck"
    neck.data.materials.append(skin_mat)
    char_col.objects.link(neck)
    bpy.context.collection.objects.unlink(neck)

    # ─── Torso (Jacket + Shirt) ───
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.07))
    torso = bpy.context.active_object
    torso.name = "Torso"
    torso.scale = (0.52, 0.65, 0.22)
    bpy.ops.object.transform_apply(scale=True)
    torso.data.materials.append(jacket_mat)
    char_col.objects.link(torso)
    bpy.context.collection.objects.unlink(torso)

    # Shirt collar peeking
    bpy.ops.mesh.primitive_cube_add(size=0.2, location=(0, 0.0, 1.18))
    collar = bpy.context.active_object
    collar.name = "ShirtCollar"
    collar.scale = (1.0, 0.15, 0.1)
    bpy.ops.object.transform_apply(scale=True)
    collar.data.materials.append(shirt_mat)
    char_col.objects.link(collar)
    bpy.context.collection.objects.unlink(collar)

    # Hair clips
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_ico_sphere_add(radius=0.02, location=(side * 0.30, 0.08, 1.82))
        clip = bpy.context.active_object
        clip.name = f"HairClip_{'L' if side == -1 else 'R'}"
        clip.data.materials.append(make_material(f"ClipMat_{side}", JACKET, emissive=True, emissive_color=JACKET, emissive_strength=0.1))
        char_col.objects.link(clip)
        bpy.context.collection.objects.unlink(clip)

    # ─── Skirt ───
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.65))
    skirt = bpy.context.active_object
    skirt.name = "Skirt"
    skirt.scale = (0.56, 0.15, 0.28)
    bpy.ops.object.transform_apply(scale=True)
    skirt.data.materials.append(skirt_mat)
    char_col.objects.link(skirt)
    bpy.context.collection.objects.unlink(skirt)

    # ─── Arms ───
    for side in [-1, 1]:
        # Upper arm
        bpy.ops.mesh.primitive_capsule_add(radius=0.065, depth=0.20, location=(side * 0.30, 0, 1.05))
        upper_arm = bpy.context.active_object
        upper_arm.name = f"UpperArm_{'L' if side == -1 else 'R'}"
        upper_arm.data.materials.append(jacket_mat)
        char_col.objects.link(upper_arm)
        bpy.context.collection.objects.unlink(upper_arm)
        # Forearm
        bpy.ops.mesh.primitive_capsule_add(radius=0.055, depth=0.18, location=(side * 0.31, 0, 0.78))
        forearm = bpy.context.active_object
        forearm.name = f"Forearm_{'L' if side == -1 else 'R'}"
        forearm.data.materials.append(jacket_mat)
        char_col.objects.link(forearm)
        bpy.context.collection.objects.unlink(forearm)
        # Hand
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.04, rows=4, segments=6, location=(side * 0.32, 0, 0.60))
        hand = bpy.context.active_object
        hand.name = f"Hand_{'L' if side == -1 else 'R'}"
        hand.scale = (0.6, 0.6, 0.8)
        bpy.ops.object.transform_apply(scale=True)
        hand.data.materials.append(skin_mat)
        char_col.objects.link(hand)
        bpy.context.collection.objects.unlink(hand)

    # ─── Legs ───
    for side in [-1, 1]:
        # Socks area (upper leg)
        bpy.ops.mesh.primitive_capsule_add(radius=0.085, depth=0.16, location=(side * 0.11, 0, 0.42))
        thigh = bpy.context.active_object
        thigh.name = f"Thigh_{'L' if side == -1 else 'R'}"
        thigh.data.materials.append(socks_mat)
        char_col.objects.link(thigh)
        bpy.context.collection.objects.unlink(thigh)
        # Shin (socks)
        bpy.ops.mesh.primitive_capsule_add(radius=0.07, depth=0.14, location=(side * 0.11, 0, 0.22))
        shin = bpy.context.active_object
        shin.name = f"Shin_{'L' if side == -1 else 'R'}"
        shin.data.materials.append(socks_mat)
        char_col.objects.link(shin)
        bpy.context.collection.objects.unlink(shin)
        # Shoe
        bpy.ops.mesh.primitive_cube_add(size=0.08, location=(side * 0.11, 0.02, 0.06))
        shoe = bpy.context.active_object
        shoe.name = f"Shoe_{'L' if side == -1 else 'R'}"
        shoe.scale = (1.2, 0.55, 1.8)
        bpy.ops.object.transform_apply(scale=True)
        shoe.data.materials.append(shoe_main_mat)
        char_col.objects.link(shoe)
        bpy.context.collection.objects.unlink(shoe)
        # Shoe accent stripe
        bpy.ops.mesh.primitive_cube_add(size=0.03, location=(side * 0.11, 0.035, 0.06))
        accent = bpy.context.active_object
        accent.name = f"ShoeAccent_{'L' if side == -1 else 'R'}"
        accent.scale = (1.3, 0.15, 1.6)
        bpy.ops.object.transform_apply(scale=True)
        accent.data.materials.append(shoe_accent_mat)
        char_col.objects.link(accent)
        bpy.context.collection.objects.unlink(accent)

    # ─── Headphones ───
    bpy.ops.mesh.primitive_torus_add(major_radius=0.38, minor_radius=0.022, location=(0, -0.08, 1.58), abo_res=24, major_res=1)
    headband = bpy.context.active_object
    headband.name = "HP_Headband"
    headband.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    headband.data.materials.append(hp_body_mat)
    char_col.objects.link(headband)
    bpy.context.collection.objects.unlink(headband)

    for side in [-1, 1]:
        bpy.ops.mesh.primitive_torus_add(major_radius=0.06, minor_radius=0.03, location=(side * 0.36, -0.08, 1.58), abo_res=12, major_res=1)
        ear_cup = bpy.context.active_object
        ear_cup.name = f"HP_EarCup_{'L' if side == -1 else 'R'}"
        ear_cup.rotation_euler = (0, math.radians(90), 0)
        bpy.ops.object.transform_apply(rotation=True)
        ear_cup.data.materials.append(hp_body_mat)
        char_col.objects.link(ear_cup)
        bpy.context.collection.objects.unlink(ear_cup)
        # LED ring (emissive cyan)
        bpy.ops.mesh.primitive_torus_add(major_radius=0.05, minor_radius=0.008, location=(side * 0.36, -0.08, 1.58), abo_res=12, major_res=1)
        led = bpy.context.active_object
        led.name = f"HP_LED_{'L' if side == -1 else 'R'}"
        led.rotation_euler = (0, math.radians(90), 0)
        bpy.ops.object.transform_apply(rotation=True)
        led.data.materials.append(hp_led_mat)
        char_col.objects.link(led)
        bpy.context.collection.objects.unlink(led)
        # Heart LED on outer cup
        bpy.ops.mesh.primitive_ico_sphere_add(radius=0.012, location=(side * 0.36, -0.08, 1.64))
        heart_led = bpy.context.active_object
        heart_led.name = f"HP_HeartLED_{'L' if side == -1 else 'R'}"
        heart_led.data.materials.append(hp_led_mat)
        char_col.objects.link(heart_led)
        bpy.context.collection.objects.unlink(heart_led)

    # ─── Shoulder Bag ───
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.11, location=(0.22, 0.08, 0.88))
    bag = bpy.context.active_object
    bag.name = "BagBody"
    bag.scale = (1.0, 1.2, 0.4)
    bpy.ops.object.transform_apply(scale=True)
    bag.data.materials.append(bag_main_mat)
    char_col.objects.link(bag)
    bpy.context.collection.objects.unlink(bag)

    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.09, location=(0.22, 0.15, 0.88))
    bag_flap = bpy.context.active_object
    bag_flap.name = "BagFlap"
    bag_flap.scale = (1.0, 0.8, 0.3)
    bpy.ops.object.transform_apply(scale=True)
    bag_flap.data.materials.append(bag_flap_mat)
    char_col.objects.link(bag_flap)
    bpy.context.collection.objects.unlink(bag_flap)

    # Strap
    bpy.ops.mesh.primitive_torus_add(major_radius=0.22, minor_radius=0.012, location=(0.15, 0.0, 1.05), abo_res=8, major_res=1)
    strap = bpy.context.active_object
    strap.name = "BagStrap"
    strap.rotation_euler = (0, math.radians(90), 0.3)
    bpy.ops.object.transform_apply(rotation=True)
    strap.data.materials.append(hp_body_mat)
    char_col.objects.link(strap)
    bpy.context.collection.objects.unlink(strap)

    # Heart clasp
    bpy.ops.mesh.primitive_ico_sphere_add(radius=0.015, location=(0.22, 0.20, 0.90))
    clasp = bpy.context.active_object
    clasp.name = "BagClasp"
    clasp.data.materials.append(bag_clasp_mat)
    char_col.objects.link(clasp)
    bpy.context.collection.objects.unlink(clasp)

    # ─── Armature & Rigging ───
    bpy.ops.object.armature_add(location=(0, 0, 1.0))
    armature = bpy.context.active_object
    armature.name = "GirlRig"
    armature.data.display_type = 'STICK'
    edit_bones = armature.data.edit_bones

    bone_defs = [
        ("Root", (0, 0, 0), (0, 0, 0.1)),
        ("Spine1", (0, 0, 0.35), (0, 0, 0.65)),
        ("Spine2", (0, 0, 0.65), (0, 0, 0.9)),
        ("Spine3", (0, 0, 0.9), (0, 0, 1.15)),
        ("Neck", (0, 0, 1.15), (0, 0, 1.3)),
        ("Head", (0, 0, 1.3), (0, 0, 1.6)),
        ("Shoulder_L", (0.1, 0, 1.1), (0.25, 0, 1.05)),
        ("UpperArm_L", (0.25, 0, 1.05), (0.3, 0, 0.85)),
        ("Forearm_L", (0.3, 0, 0.85), (0.31, 0, 0.68)),
        ("Hand_L", (0.31, 0, 0.68), (0.31, 0, 0.58)),
        ("Shoulder_R", (-0.1, 0, 1.1), (-0.25, 0, 1.05)),
        ("UpperArm_R", (-0.25, 0, 1.05), (-0.3, 0, 0.85)),
        ("Forearm_R", (-0.3, 0, 0.85), (-0.31, 0, 0.68)),
        ("Hand_R", (-0.31, 0, 0.68), (-0.31, 0, 0.58)),
        ("Thigh_L", (0.1, 0, 0.55), (0.11, 0, 0.35)),
        ("Shin_L", (0.11, 0, 0.35), (0.11, 0, 0.15)),
        ("Foot_L", (0.11, 0, 0.15), (0.11, -0.05, 0.02)),
        ("Thigh_R", (-0.1, 0, 0.55), (-0.11, 0, 0.35)),
        ("Shin_R", (-0.11, 0, 0.35), (-0.11, 0, 0.15)),
        ("Foot_R", (-0.11, 0, 0.15), (-0.11, -0.05, 0.02)),
        ("Hair_1", (0, 0, 1.7), (0, 0.05, 1.9)),
        ("Hair_2", (0, 0.05, 1.9), (0, 0.1, 2.05)),
        ("Hair_3", (0, -0.05, 1.65), (0, -0.12, 1.45)),
        ("Hair_4", (0.15, -0.05, 1.55), (0.2, -0.12, 1.3)),
        ("Hair_5", (-0.15, -0.05, 1.55), (-0.2, -0.12, 1.3)),
        ("Skirt_1", (0.15, 0, 0.62), (0.2, 0, 0.55)),
        ("Skirt_2", (-0.15, 0, 0.62), (-0.2, 0, 0.55)),
        ("Skirt_3", (0, 0.12, 0.62), (0, 0.18, 0.55)),
        ("BagBone", (0.22, 0.08, 0.88), (0.22, 0.12, 0.92)),
    ]

    bpy.ops.object.mode_set(mode='EDIT')
    for name, head_pos, tail_pos in bone_defs:
        if name not in edit_bones:
            bone = edit_bones.new(name)
            bone.head = head_pos
            bone.tail = tail_pos

    # Parenting bones
    eb = edit_bones
    eb["Spine1"].parent = eb["Root"]
    eb["Spine2"].parent = eb["Spine1"]
    eb["Spine3"].parent = eb["Spine2"]
    eb["Neck"].parent = eb["Spine3"]
    eb["Head"].parent = eb["Neck"]
    eb["Shoulder_L"].parent = eb["Spine3"]
    eb["UpperArm_L"].parent = eb["Shoulder_L"]
    eb["Forearm_L"].parent = eb["UpperArm_L"]
    eb["Hand_L"].parent = eb["Forearm_L"]
    eb["Shoulder_R"].parent = eb["Spine3"]
    eb["UpperArm_R"].parent = eb["Shoulder_R"]
    eb["Forearm_R"].parent = eb["UpperArm_R"]
    eb["Hand_R"].parent = eb["Forearm_R"]
    eb["Thigh_L"].parent = eb["Root"]
    eb["Shin_L"].parent = eb["Thigh_L"]
    eb["Foot_L"].parent = eb["Shin_L"]
    eb["Thigh_R"].parent = eb["Root"]
    eb["Shin_R"].parent = eb["Thigh_R"]
    eb["Foot_R"].parent = eb["Shin_R"]
    eb["Hair_1"].parent = eb["Head"]
    eb["Hair_2"].parent = eb["Hair_1"]
    eb["Hair_3"].parent = eb["Head"]
    eb["Hair_4"].parent = eb["Head"]
    eb["Hair_5"].parent = eb["Head"]
    eb["Skirt_1"].parent = eb["Root"]
    eb["Skirt_2"].parent = eb["Root"]
    eb["Skirt_3"].parent = eb["Root"]
    eb["BagBone"].parent = eb["Spine3"]

    bpy.ops.object.mode_set(mode='OBJECT')

    # Parent all mesh parts to armature with automatic weights
    mesh_parts = []
    for obj in char_col.objects:
        if obj.type == 'MESH':
            mesh_parts.append(obj)

    for part in mesh_parts:
        part.select_set(True)
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

    # ─── Animation: Walk Cycle (120 frames) ───
    bpy.context.scene.frame_set(1)
    action = bpy.data.actions.new(name="WalkCycle")
    armature.animation_data_create()
    armature.animation_data.action = action

    def key_bone(bone_name, prop, value, frame):
        for fcurve in action.fcurves:
            for kp in fcurve.keyframe_points:
                if kp.co[0] == frame:
                    return
        bone = armature.pose.bones.get(bone_name)
        if bone:
            if prop == "rotation":
                bone.rotation_euler = value
                bone.keyframe_insert(data_path="rotation_euler", frame=frame)
            elif prop == "location":
                bone.location = value
                bone.keyframe_insert(data_path="location", frame=frame)

    # Walk cycle keyframes (bouncier, cuter)
    for frame, phase in [(1, 0), (30, 0.25), (60, 0.5), (90, 0.75), (120, 1.0)]:
        rt = phase * math.pi * 2
        # Legs
        key_bone("Thigh_L", "rotation", (math.sin(rt) * 0.4, 0, 0), frame)
        key_bone("Shin_L", "rotation", (max(0, -math.sin(rt)) * 0.3, 0, 0), frame)
        key_bone("Foot_L", "rotation", (0, 0, 0), frame)
        key_bone("Thigh_R", "rotation", (math.sin(rt + math.pi) * 0.4, 0, 0), frame)
        key_bone("Shin_R", "rotation", (max(0, -math.sin(rt + math.pi)) * 0.3, 0, 0), frame)
        key_bone("Foot_R", "rotation", (0, 0, 0), frame)
        # Arms (swing opposite to legs)
        key_bone("UpperArm_L", "rotation", (math.sin(rt + math.PI) * 0.35, 0, 0.05), frame)
        key_bone("Forearm_L", "rotation", (math.sin(rt + math.PI) * 0.15, 0, 0), frame)
        key_bone("UpperArm_R", "rotation", (math.sin(rt) * 0.35, 0, -0.05), frame)
        key_bone("Forearm_R", "rotation", (math.sin(rt) * 0.15, 0, 0), frame)
        # Hip sway
        key_bone("Root", "rotation", (0, 0, math.sin(rt) * 0.04), frame)
        # Head bob (softer)
        key_bone("Head", "rotation", (math.sin(rt) * 0.01, math.sin(rt) * 0.015, 0), frame)
        # Body bounce
        key_bone("Root", "location", (0, abs(math.sin(rt)) * 0.02, 0), frame)
        # Skirt swing
        key_bone("Skirt_1", "rotation", (math.sin(rt) * 0.06, 0, 0), frame)
        key_bone("Skirt_2", "rotation", (math.sin(rt + math.PI) * 0.06, 0, 0), frame)
        key_bone("Skirt_3", "rotation", (0, math.sin(rt) * 0.06, 0), frame)
        # Hair bounce (delayed, overlap)
        key_bone("Hair_1", "rotation", (math.sin(rt - 0.3) * 0.04, 0, 0), frame)
        key_bone("Hair_2", "rotation", (math.sin(rt - 0.5) * 0.06, 0, 0), frame)
        key_bone("Hair_3", "rotation", (math.sin(rt - 0.4) * 0.05, 0, 0), frame)
        key_bone("Hair_4", "rotation", (math.sin(rt - 0.3) * 0.04, 0, math.sin(rt) * 0.03), frame)
        key_bone("Hair_5", "rotation", (math.sin(rt - 0.3) * 0.04, 0, -math.sin(rt) * 0.03), frame)
        # Bag bounce
        key_bone("BagBone", "location", (0, abs(math.sin(rt)) * 0.015, 0), frame)

    # ─── Idle Breathing (60 frames) ───
    bpy.context.scene.frame_set(1)
    idle_action = bpy.data.actions.new(name="IdleBreath")
    arm2 = bpy.data.armatures.new(name="IdleArmature")
    armature.data = arm2

    # ─── Blink Animation on Shape Keys ───
    head_obj = bpy.data.objects.get("Head")
    if head_obj and head_obj.data.shape_keys:
        kb = head_obj.data.shape_keys.key_blocks
        if "Blink" in kb:
            kb["Blink"].value = 0.0
            head_obj.data.shape_keys.keyframe_insert(data_path='key_blocks["Blink"].value', frame=1)
            # Blink at frames 80, 160, 280, 400, 550
            for blink_f in [80, 160, 280, 400, 550]:
                kb["Blink"].value = 0.0
                head_obj.data.shape_keys.keyframe_insert(data_path='key_blocks["Blink"].value', frame=blink_f)
                kb["Blink"].value = 1.0
                head_obj.data.shape_keys.keyframe_insert(data_path='key_blocks["Blink"].value', frame=blink_f + 2)
                kb["Blink"].value = 0.0
                head_obj.data.shape_keys.keyframe_insert(data_path='key_blocks["Blink"].value', frame=blink_f + 4)

    char_col.objects.link(armature)
    bpy.context.collection.objects.unlink(armature)

    return char_col


# ═══════════════════════════════════════
# MODEL 2: PASTEL BUILDINGS (18 variants)
# ═══════════════════════════════════════
def create_pastel_buildings():
    building_col = bpy.data.collections.new("PastelBuildings")
    bpy.context.scene.collection.children.link(building_col)

    for i in range(18):
        side = -1 if i % 2 == 0 else 1
        width = 1.4 + random.random() * 1.8
        height = 2.5 + random.random() * 6
        depth = 1.4 + random.random() * 1.8
        x_offset = 4 + random.random() * 11
        z_pos = -5 - random.random() * 30

        building_group = bpy.data.collections.new(f"PastelBuilding_{i:02d}")
        building_col.children.link(building_group)

        # Pastel color
        if random.random() > 0.5:
            hue = (320 + random.random() * 40) / 360
        else:
            hue = (20 + random.random() * 30) / 360
        sat = 0.25 + random.random() * 0.25
        lit = 0.75 + random.random() * 0.15
        r, g, b = colorsys.hls_to_rgb(hue, lit, sat)
        bldg_color = (r, g, b, 1.0)

        # Building base material
        bldg_mat = make_material(f"PastelBldgMat_{i:02d}", bldg_color, roughness=0.8, metallic=0.02)

        # Main mesh
        bpy.ops.mesh.primitive_cube_add(size=1, location=(side * x_offset, height / 2 - 3, z_pos))
        bldg = bpy.context.active_object
        bldg.name = f"PastelBuilding_{i:02d}_Base"
        bldg.scale = (width, height, depth)
        bpy.ops.object.transform_apply(scale=True)
        bldg.data.materials.append(bldg_mat)
        building_group.objects.link(bldg)
        bpy.context.collection.objects.unlink(bldg)

        # Bevel modifier
        bevel = bldg.modifiers.new(name="Bevel", type='BEVEL')
        bevel.width = 0.03
        bevel.segments = 3

        # Roof
        roof_type = i % 3
        if roof_type == 0:
            # Flat with railing
            bpy.ops.mesh.primitive_cube_add(size=1, location=(side * x_offset, height - 2.9, z_pos))
            roof = bpy.context.active_object
            roof.name = f"Roof_{i:02d}"
            roof.scale = (width + 0.1, 0.15, depth + 0.1)
            bpy.ops.object.transform_apply(scale=True)
            roof.data.materials.append(bldg_mat)
            building_group.objects.link(roof)
            bpy.context.collection.objects.unlink(roof)
        elif roof_type == 1:
            # Slight pitched
            bpy.ops.mesh.primitive_cube_add(size=1, location=(side * x_offset, height - 2.8, z_pos))
            roof = bpy.context.active_object
            roof.name = f"Roof_{i:02d}"
            roof.scale = (width + 0.15, 0.25, depth + 0.1)
            roof.rotation_euler = (math.radians(15), 0, 0)
            bpy.ops.object.transform_apply(rotation=True)
            roof.data.materials.append(bldg_mat)
            building_group.objects.link(roof)
            bpy.context.collection.objects.unlink(roof)
        else:
            # Rounded top
            bpy.ops.mesh.primitive_uv_sphere_add(radius=depth / 2, segments=16, rings=8,
                                                   location=(side * x_offset, height - 3.1, z_pos))
            roof = bpy.context.active_object
            roof.name = f"Roof_{i:02d}"
            roof.scale = (width / depth, 0.5, 1.0)
            bpy.ops.object.transform_apply(scale=True)
            roof.data.materials.append(bldg_mat)
            building_group.objects.link(roof)
            bpy.context.collection.objects.unlink(roof)

        # Windows
        floors = max(1, int(height / 0.6))
        cols = max(1, int(width / 0.5))
        for row in range(floors):
            for col in range(cols):
                is_lit = random.random() < 0.6
                wx = -width / 2 + 0.25 + col * 0.5
                wy = -height / 2 + 0.3 + row * 0.6
                wz_front = depth / 2 + 0.01
                wz_back = -depth / 2 - 0.01

                for wz in [wz_front, wz_back]:
                    bpy.ops.mesh.primitive_plane_add(size=1, location=(side * x_offset + wx, wy - 3 + height / 2, z_pos + wz))
                    win = bpy.context.active_object
                    win.name = f"Win_{i:02d}_{row}_{col}_{'F' if wz > 0 else 'B'}"
                    win.scale = (0.3, 0.2, 1.0)
                    bpy.ops.object.transform_apply(scale=True)

                    if is_lit:
                        glow_color = random.choice([WORLD_BG, PINK_FILL, (1, 1, 1, 1)])
                        win_mat = make_material(f"WinLit_{i:02d}_{row}_{col}",
                                                glow_color[:3], roughness=0.1, alpha=0.6, ior=1.5,
                                                emissive=True, emissive_color=glow_color[:3], emissive_strength=0.15)
                    else:
                        win_mat = make_material(f"WinDark_{i:02d}_{row}_{col}",
                                                (1.0, 0.969, 0.984, 1.0), roughness=0.1, alpha=0.6, ior=1.5)
                    win.data.materials.append(win_mat)
                    building_group.objects.link(win)
                    bpy.context.collection.objects.unlink(win)

        # Flower boxes (some buildings)
        if i % 3 == 0:
            for row in range(min(floors, 3)):
                wx = 0
                wy = -height / 2 + 0.3 + row * 0.6 - 0.25
                bpy.ops.mesh.primitive_cube_add(size=1, location=(side * x_offset + wx, wy - 3 + height / 2, z_pos + depth / 2 + 0.05))
                fbox = bpy.context.active_object
                fbox.name = f"FlowerBox_{i:02d}_{row}"
                fbox.scale = (width * 0.6, 0.08, 0.08)
                bpy.ops.object.transform_apply(scale=True)
                fbox_mat = make_material(f"FBMat_{i:02d}_{row}", (0.655, 0.953, 0.816, 1.0), roughness=0.8)  # #A7F3D0
                fbox.data.materials.append(fbox_mat)
                building_group.objects.link(fbox)
                bpy.context.collection.objects.unlink(fbox)
                # Flowers
                for fi in range(3):
                    bx = (fi - 1) * 0.15
                    bpy.ops.mesh.primitive_ico_sphere_add(radius=0.03,
                                                           location=(side * x_offset + bx, wy - 3 + height / 2 + 0.05, z_pos + depth / 2 + 0.08))
                    flower = bpy.context.active_object
                    flower.name = f"Flower_{i:02d}_{row}_{fi}"
                    fc = random.choice([PINK, CHERRYBLOSSOM_1, CHERRYBLOSSOM_2, (1,1,1,1), ORANGE])
                    flower.data.materials.append(make_material(f"FlowerMat_{i:02d}_{row}_{fi}", fc, roughness=0.7))
                    building_group.objects.link(flower)
                    bpy.context.collection.objects.unlink(flower)

        # Awnings (some buildings)
        if i % 4 == 0:
            bpy.ops.mesh.primitive_cube_add(size=1, location=(side * x_offset, height - 3 + height / 2 + 0.3, z_pos + depth / 2 + 0.15))
            awning = bpy.context.active_object
            awning.name = f"Awning_{i:02d}"
            awning.scale = (width * 0.8, 0.05, 0.3)
            awning.rotation_euler = (math.radians(15), 0, 0)
            bpy.ops.object.transform_apply(rotation=True)
            awning_mat = make_material(f"AwningMat_{i:02d}", random.choice([PINK, ORANGE, CHERRYBLOSSOM_1]), roughness=0.7)
            awning.data.materials.append(awning_mat)
            building_group.objects.link(awning)
            bpy.context.collection.objects.unlink(awning)

        # Hanging signage (some buildings)
        if i % 3 == 1:
            bpy.ops.mesh.primitive_cube_add(size=1, location=(side * x_offset, height - 3 + height / 2 - 0.15, z_pos + depth / 2 + 0.1))
            sign = bpy.context.active_object
            sign.name = f"Sign_{i:02d}"
            sign.scale = (0.8 + random.random() * 0.4, 0.2 + random.random() * 0.15, 0.04)
            bpy.ops.object.transform_apply(scale=True)
            sign_mat = make_material(f"SignMat_{i:02d}", random.choice([JACKET, BAG_FLAP, CYAN]), roughness=0.5)
            sign.data.materials.append(sign_mat)
            building_group.objects.link(sign)
            bpy.context.collection.objects.unlink(sign)
            # Animate sign swing
            sign.rotation_euler = (0, 0, math.radians(0))
            sign.keyframe_insert(data_path="rotation_euler", frame=1)
            sign.rotation_euler = (0, 0, math.radians(2))
            sign.keyframe_insert(data_path="rotation_euler", frame=60)
            sign.rotation_euler = (0, 0, math.radians(0))
            sign.keyframe_insert(data_path="rotation_euler", frame=120)
            sign.rotation_euler = (0, 0, math.radians(-2))
            sign.keyframe_insert(data_path="rotation_euler", frame=180)
            sign.rotation_euler = (0, 0, math.radians(0))
            sign.keyframe_insert(data_path="rotation_euler", frame=240)

    return building_col


# ═══════════════════════════════════════
# MODEL 3: CAFÉ SHOP
# ═══════════════════════════════════════
def create_cafe_shop():
    cafe_col = bpy.data.collections.new("CafeShop")
    bpy.context.scene.collection.children.link(cafe_col)

    pos = (6, 0, -10)

    cafe_mat = make_material("CafeWall", (1.0, 0.969, 0.929, 1.0), roughness=0.7)  # #FFF7ED
    wood_mat = make_material("CafeWood", WARM_WOOD, roughness=0.7)
    glass_mat = make_material("CafeGlass", (1.0, 0.969, 0.984, 1.0), roughness=0.1, alpha=0.5, ior=1.5)
    metal_mat = make_material("CafeMetal", CAFE_METAL, metallic=0.4, roughness=0.4)
    sign_mat = make_material("CafeSign", JACKET, roughness=0.5)
    string_light_mat = make_material("StringLights", STRING_LIGHT, emissive=True, emissive_color=STRING_LIGHT, emissive_strength=1.5)

    # Main building
    bpy.ops.mesh.primitive_cube_add(size=1, location=(pos[0], pos[1] + 1.25, pos[2]))
    main = bpy.context.active_object
    main.name = "CafeMain"
    main.scale = (3, 2.5, 2.5)
    bpy.ops.object.transform_apply(scale=True)
    main.data.materials.append(cafe_mat)
    cafe_col.objects.link(main)
    bpy.context.collection.objects.unlink(main)

    # Rounded top edge
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.25, segments=16, rings=8,
                                           location=(pos[0], pos[1] + 2.45, pos[2]))
    top = bpy.context.active_object
    top.name = "CafeTop"
    top.scale = (3 / 2.5, 0.3, 1.0)
    bpy.ops.object.transform_apply(scale=True)
    top.data.materials.append(cafe_mat)
    cafe_col.objects.link(top)
    bpy.context.collection.objects.unlink(top)

    # Glass windows front (2 large)
    for wx in [-0.8, 0.8]:
        bpy.ops.mesh.primitive_cube_add(size=1, location=(pos[0] + wx, pos[1] + 1.3, pos[2] + 1.26))
        glass = bpy.context.active_object
        glass.name = f"CafeGlass_{wx}"
        glass.scale = (1.0, 2.0, 0.05)
        bpy.ops.object.transform_apply(scale=True)
        glass.data.materials.append(glass_mat)
        cafe_col.objects.link(glass)
        bpy.context.collection.objects.unlink(glass)

    # Round-top door
    bpy.ops.mesh.primitive_cube_add(size=1, location=(pos[0], pos[1] + 0.6, pos[2] + 1.26))
    door = bpy.context.active_object
    door.name = "CafeDoor"
    door.scale = (0.7, 1.2, 0.05)
    bpy.ops.object.transform_apply(scale=True)
    door.data.materials.append(glass_mat)
    cafe_col.objects.link(door)
    bpy.context.collection.objects.unlink(door)

    # Outdoor seating: 3 tables, 6 chairs
    table_positions = [(-1.0, 2.0), (0, 2.5), (1.0, 2.0)]
    for ti, (tx, tz) in enumerate(table_positions):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.3, depth=0.05, vertices=16,
                                              location=(pos[0] + tx, pos[1] + 0.4, pos[2] + tz))
        table = bpy.context.active_object
        table.name = f"CafeTable_{ti}"
        table.data.materials.append(wood_mat)
        cafe_col.objects.link(table)
        bpy.context.collection.objects.unlink(table)

        # Chairs around each table
        for ci in range(2):
            angle = ci * math.pi + ti * 0.5
            cx = pos[0] + tx + math.cos(angle) * 0.45
            cz = pos[2] + tz + math.sin(angle) * 0.45
            bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, pos[1] + 0.25, cz))
            chair = bpy.context.active_object
            chair.name = f"CafeChair_{ti}_{ci}"
            chair.scale = (0.25, 0.5, 0.25)
            chair.rotation_euler = (0, -angle, 0)
            bpy.ops.object.transform_apply(rotation=True)
            chair.data.materials.append(metal_mat)
            cafe_col.objects.link(chair)
            bpy.context.collection.objects.unlink(chair)

    # Hanging sign
    bpy.ops.mesh.primitive_cube_add(size=1, location=(pos[0], pos[1] + 2.9, pos[2] + 1.5))
    hsign = bpy.context.active_object
    hsign.name = "CafeHangingSign"
    hsign.scale = (1.0, 0.3, 0.05)
    bpy.ops.object.transform_apply(scale=True)
    hsign.data.materials.append(sign_mat)
    cafe_col.objects.link(hsign)
    bpy.context.collection.objects.unlink(hsign)

    # A-frame sidewalk sign
    bpy.ops.mesh.primitive_cube_add(size=1, location=(pos[0] + 1.5, pos[1] + 0.4, pos[2] + 1.5))
    asign = bpy.context.active_object
    asign.name = "CafeAFrameSign"
    asign.scale = (0.5, 0.6, 0.03)
    asign.rotation_euler = (0.2, 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    asign.data.materials.append(wood_mat)
    cafe_col.objects.link(asign)
    bpy.context.collection.objects.unlink(asign)

    # Flower pots on windowsill
    for fi in range(4):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(pos[0] - 1.0 + fi * 0.6, pos[1] + 0.6, pos[2] + 1.3))
        pot = bpy.context.active_object
        pot.name = f"CafePot_{fi}"
        pot.scale = (0.12, 0.15, 0.12)
        bpy.ops.object.transform_apply(scale=True)
        pot.data.materials.append(make_material(f"PotMat_{fi}", (0.8, 0.5, 0.3, 1.0), roughness=0.8))
        cafe_col.objects.link(pot)
        bpy.context.collection.objects.unlink(pot)
        # Flower
        bpy.ops.mesh.primitive_ico_sphere_add(radius=0.05,
                                                location=(pos[0] - 1.0 + fi * 0.6, pos[1] + 0.75, pos[2] + 1.3))
        fl = bpy.context.active_object
        fl.name = f"CafeFlower_{fi}"
        fl.data.materials.append(make_material(f"CafeFlowerMat_{fi}", random.choice([PINK, CHERRYBLOSSOM_1, ORANGE]), roughness=0.7))
        cafe_col.objects.link(fl)
        bpy.context.collection.objects.unlink(fl)

    # String lights across front
    for li in range(12):
        lx = pos[0] - 1.5 + li * 0.28
        ly = pos[1] + 2.6 + math.sin(li * 0.5) * 0.08
        lz = pos[2] + 1.4
        bpy.ops.mesh.primitive_ico_sphere_add(radius=0.025, location=(lx, ly, lz))
        bulb = bpy.context.active_object
        bulb.name = f"StringLight_{li}"
        bulb.data.materials.append(string_light_mat)
        cafe_col.objects.link(bulb)
        bpy.context.collection.objects.unlink(bulb)

    # Chalkboard menu
    bpy.ops.mesh.primitive_cube_add(size=1, location=(pos[0] + 1.2, pos[1] + 1.5, pos[2] + 1.26))
    board = bpy.context.active_object
    board.name = "CafeChalkboard"
    board.scale = (0.4, 0.5, 0.03)
    bpy.ops.object.transform_apply(scale=True)
    board.data.materials.append(make_material("ChalkboardMat", (0.15, 0.2, 0.15, 1.0), roughness=0.9))
    cafe_col.objects.link(board)
    bpy.context.collection.objects.unlink(board)

    return cafe_col


# ═══════════════════════════════════════
# MODEL 4: CUTE STREET LAMPS (8)
# ═══════════════════════════════════════
def create_street_lamps():
    lamp_col = bpy.data.collections.new("StreetLampsCute")
    bpy.context.scene.collection.children.link(lamp_col)

    for i in range(8):
        side = -1 if i % 2 == 0 else 1
        pos = (side * (2.5 + random.random() * 1.2), 0, -4 - i * 5 - random.random() * 2)

        lamp_group = bpy.data.collections.new(f"CuteLamp_{i:02d}")
        lamp_col.children.link(lamp_group)

        pole_mat = make_material(f"LampPoleMat_{i:02d}", POLE_COLOR, metallic=0.3, roughness=0.5)
        lamp_mat = make_material(f"LampGlowMat_{i:02d}", (1.0, 0.969, 0.984, 1.0),
                                 emissive=True, emissive_color=(1.0, 0.969, 0.984, 1.0), emissive_strength=2.0)
        ring_mat = make_material(f"LampRingMat_{i:02d}", JACKET, metallic=0.2, roughness=0.4)

        # Pole
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.035, depth=3.5,
                                              location=(pos[0], 1.75, pos[2]))
        pole = bpy.context.active_object
        pole.name = f"CuteLamp_{i:02d}_Pole"
        pole.data.materials.append(pole_mat)
        lamp_group.objects.link(pole)
        bpy.context.collection.objects.unlink(pole)

        # Lamp head (spherical/flower-shaped)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, rings=8, radius=0.12,
                                               location=(pos[0], 3.6, pos[2]))
        lamp_head = bpy.context.active_object
        lamp_head.name = f"CuteLamp_{i:02d}_Head"
        lamp_head.scale = (1.0, 0.8, 1.0)
        bpy.ops.object.transform_apply(scale=True)
        lamp_head.data.materials.append(lamp_mat)
        lamp_group.objects.link(lamp_head)
        bpy.context.collection.objects.unlink(lamp_head)

        # Decorative ring
        bpy.ops.mesh.primitive_torus_add(major_radius=0.08, minor_radius=0.01,
                                           location=(pos[0], 3.45, pos[2]), abo_res=12, major_res=1)
        ring = bpy.context.active_object
        ring.name = f"CuteLamp_{i:02d}_Ring"
        ring.data.materials.append(ring_mat)
        lamp_group.objects.link(ring)
        bpy.context.collection.objects.unlink(ring)

    return lamp_col


# ═══════════════════════════════════════
# MODEL 5: WARM ROAD + CHERRY BLOSSOM TREES
# ═══════════════════════════════════════
def create_road_and_trees():
    road_col = bpy.data.collections.new("RoadWarm")
    bpy.context.scene.collection.children.link(road_col)

    road_mat = make_material("WarmRoad", ROAD_COLOR, roughness=0.7)
    sidewalk_mat = make_material("WarmSidewalk", SIDEWALK_COLOR, roughness=0.8)
    trunk_mat = make_material("TreeTrunk", (0.45, 0.3, 0.2, 1.0), roughness=0.9)
    foliage_mats = [
        make_material("CherryFoliage1", CHERRYBLOSSOM_1, roughness=0.8),
        make_material("CherryFoliage2", CHERRYBLOSSOM_2, roughness=0.8),
        make_material("CherryFoliage3", CHERRYBLOSSOM_3, roughness=0.8),
    ]

    # Road surface
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0.01, -18))
    road = bpy.context.active_object
    road.name = "RoadSurface"
    road.scale = (3.5, 35, 1)
    bpy.ops.object.transform_apply(scale=True)
    road.data.materials.append(road_mat)
    road_col.objects.link(road)
    bpy.context.collection.objects.unlink(road)

    # Lane markings (dashed center line)
    for i in range(30):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.015, -2 - i * 2.3))
        marking = bpy.context.active_object
        marking.name = f"LaneMark_{i:02d}"
        marking.scale = (0.015, 0.4, 0.01)
        bpy.ops.object.transform_apply(scale=True)
        marking.data.materials.append(make_material(f"LaneMat_{i:02d}", (0.992, 0.902, 0.541, 1.0)))
        road_col.objects.link(marking)
        bpy.context.collection.objects.unlink(marking)

    # Sidewalks
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cube_add(size=1, location=(side * 4.2, 0.075, -18))
        sidewalk = bpy.context.active_object
        sidewalk.name = f"Sidewalk_{'L' if side == -1 else 'R'}"
        sidewalk.scale = (1.2, 0.15, 35)
        bpy.ops.object.transform_apply(scale=True)
        sidewalk.data.materials.append(sidewalk_mat)
        road_col.objects.link(sidewalk)
        bpy.context.collection.objects.unlink(sidewalk)

    # Crosswalk
    for ci in range(8):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(-3 + ci * 0.85, 0.02, -15))
        cw = bpy.context.active_object
        cw.name = f"Crosswalk_{ci}"
        cw.scale = (0.5, 0.01, 1.2)
        bpy.ops.object.transform_apply(scale=True)
        cw.data.materials.append(make_material(f"CWMat_{ci}", (1, 1, 1, 1), roughness=0.7))
        road_col.objects.link(cw)
        bpy.context.collection.objects.unlink(cw)

    # Cherry Blossom Trees (5)
    tree_positions = [(-4.5, -8), (4.5, -12), (-4.5, -20), (4.5, -25), (-4.5, -30)]
    for ti, (tx, tz) in enumerate(tree_positions):
        # Trunk
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.08 + random.random() * 0.04,
                                              depth=1.2 + random.random() * 0.5,
                                              location=(tx, 0.6, tz))
        trunk = bpy.context.active_object
        trunk.name = f"TreeTrunk_{ti}"
        trunk.data.materials.append(trunk_mat)
        road_col.objects.link(trunk)
        bpy.context.collection.objects.unlink(trunk)

        # Foliage clusters (pink spheres)
        for fi in range(8):
            fx = tx + (random.random() - 0.5) * 1.2
            fy = 1.2 + random.random() * 0.8
            fz = tz + (random.random() - 0.5) * 1.2
            fr = 0.2 + random.random() * 0.3
            bpy.ops.mesh.primitive_ico_sphere_add(radius=fr, location=(fx, fy, fz))
            foliage = bpy.context.active_object
            foliage.name = f"TreeFoliage_{ti}_{fi}"
            foliage.data.materials.append(foliage_mats[fi % 3])
            road_col.objects.link(foliage)
            bpy.context.collection.objects.unlink(foliage)

    return road_col


# ═══════════════════════════════════════
# MODEL 6: CUTE CARS (3 variants)
# ═══════════════════════════════════════
def create_cute_cars():
    car_col = bpy.data.collections.new("CuteCars")
    bpy.context.scene.collection.children.link(car_col)

    car_colors = [CAR_PINK, CAR_BLUE, CAR_YELLOW]
    car_positions = [(-1.5, -8), (1.5, -20), (-1.5, -30)]

    for i in range(3):
        car_group = bpy.data.collections.new(f"CuteCar_{i:02d}")
        car_col.children.link(car_group)

        body_color = car_colors[i]
        x_pos, z_start = car_positions[i]

        car_mat = make_material(f"CuteCarMat_{i:02d}", body_color, metallic=0.3, roughness=0.35, clearcoat=0.4)
        wheel_mat = make_material(f"CarWheelMat_{i:02d}", (0.1, 0.1, 0.1, 1.0), roughness=0.8)
        headlight_mat = make_material(f"CarHeadlightMat_{i:02d}", STRING_LIGHT, emissive=True,
                                       emissive_color=STRING_LIGHT, emissive_strength=1.0)

        # Body (rounded box)
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x_pos, 0.35, z_start))
        body = bpy.context.active_object
        body.name = f"CuteCar_{i:02d}_Body"
        body.scale = (1.5, 0.7, 0.45)
        bpy.ops.object.transform_apply(scale=True)
        body.data.materials.append(car_mat)
        car_group.objects.link(body)
        bpy.context.collection.objects.unlink(body)

        # Cabin
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x_pos + 0.05, 0.7, z_start))
        cabin = bpy.context.active_object
        cabin.name = f"CuteCar_{i:02d}_Cabin"
        cabin.scale = (0.9, 0.5, 0.4)
        bpy.ops.object.transform_apply(scale=True)
        cabin.data.materials.append(car_mat)
        car_group.objects.link(cabin)
        bpy.context.collection.objects.unlink(cabin)

        # Wheels
        wheel_positions = [
            (x_pos - 0.5, 0.05, z_start + 0.22),
            (x_pos + 0.5, 0.05, z_start + 0.22),
            (x_pos - 0.5, 0.05, z_start - 0.22),
            (x_pos + 0.5, 0.05, z_start - 0.22),
        ]
        for j, wpos in enumerate(wheel_positions):
            bpy.ops.mesh.primitive_cylinder_add(radius=0.1, depth=0.06, location=wpos)
            wheel = bpy.context.active_object
            wheel.name = f"CuteCar_{i:02d}_Wheel_{j}"
            wheel.rotation_euler = (0, math.radians(90), 0)
            bpy.ops.object.transform_apply(rotation=True)
            wheel.data.materials.append(wheel_mat)
            car_group.objects.link(wheel)
            bpy.context.collection.objects.unlink(wheel)

        # Round headlights
        for hx in [-0.25, 0.25]:
            bpy.ops.mesh.primitive_ico_sphere_add(radius=0.05, location=(x_pos + hx, 0.35, z_start + 0.23))
            hl = bpy.context.active_object
            hl.name = f"CuteCar_{i:02d}_Headlight_{'L' if hx < 0 else 'R'}"
            hl.data.materials.append(headlight_mat)
            car_group.objects.link(hl)
            bpy.context.collection.objects.unlink(hl)

        # Antenna
        bpy.ops.mesh.primitive_cylinder_add(radius=0.008, depth=0.3, location=(x_pos + 0.3, 1.0, z_start))
        antenna = bpy.context.active_object
        antenna.name = f"CuteCar_{i:02d}_Antenna"
        antenna.data.materials.append(wheel_mat)
        car_group.objects.link(antenna)
        bpy.context.collection.objects.unlink(antenna)

        # Heart mirror
        bpy.ops.mesh.primitive_ico_sphere_add(radius=0.03, location=(x_pos + 0.7, 0.5, z_start + 0.22))
        mirror = bpy.context.active_object
        mirror.name = f"CuteCar_{i:02d}_Mirror"
        mirror.data.materials.append(make_material(f"MirrorMat_{i:02d}", JACKET, emissive=True, emissive_color=JACKET, emissive_strength=0.1))
        car_group.objects.link(mirror)
        bpy.context.collection.objects.unlink(mirror)

        # Animate car 1 (driving)
        if i == 1:
            body.location.z = z_start
            body.keyframe_insert(data_path="location", frame=1)
            body.location.z = z_start - 10
            body.keyframe_insert(data_path="location", frame=720)

    return car_col


# ═══════════════════════════════════════
# MODEL 7: SAKURA PETALS
# ═══════════════════════════════════════
def create_sakura_petals():
    petal_col = bpy.data.collections.new("SakuraPetals")
    bpy.context.scene.collection.children.link(petal_col)

    petal_mat = make_material("WarmPetal", CHERRYBLOSSOM_1, roughness=0.7, alpha=0.65,
                               subsurface=0.1, subsurface_color=CHERRYBLOSSOM_1)

    # Create petal emitter plane
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 8, -18))
    emitter = bpy.context.active_object
    emitter.name = "PetalEmitter"
    emitter.scale = (8, 30, 1)
    bpy.ops.object.transform_apply(scale=True)

    # Particle system
    emitter.modifiers.new(name="PetalParticles", type='PARTICLE_SYSTEM')
    ps = emitter.particle_systems[0]
    ps.name = "SakuraPetals"
    settings = ps.settings
    settings.count = 80
    settings.lifetime = 300
    settings.emit_from = 'FACE'
    settings.physics_type = 'NEWTON'
    settings.mass = 0.0005
    settings.particle_size = 0.04
    settings.normal_factor = 0
    settings.factor_random = 0.3
    settings.effector_weights.gravity = 0.02
    settings.drag_factor = 0.4
    settings.use_render_emitter = False
    settings.render_type = 'OBJECT'

    # Petal instance object
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 20, 0))
    petal_obj = bpy.context.active_object
    petal_obj.name = "PetalInstance"
    petal_obj.scale = (0.06, 0.03, 1.0)
    bpy.ops.object.transform_apply(scale=True)
    petal_obj.data.materials.append(petal_mat)
    settings.instance_object = petal_obj
    settings.particle_size = 1.0

    petal_col.objects.link(emitter)
    bpy.context.collection.objects.unlink(emitter)
    petal_col.objects.link(petal_obj)
    bpy.context.collection.objects.unlink(petal_obj)

    return petal_col


# ═══════════════════════════════════════
# MODEL 8: NPC FIGURES (6)
# ═══════════════════════════════════════
def create_npc_figures():
    npc_col = bpy.data.collections.new("NPCFigures")
    bpy.context.scene.collection.children.link(npc_col)

    npc_configs = [
        {"pos": (-3.8, -0.8, -6), "color": (0.15, 0.15, 0.2, 1.0), "height": 1.6, "type": "business"},
        {"pos": (3.8, -0.8, -12), "color": (0.2, 0.2, 0.25, 1.0), "height": 1.55, "type": "student"},
        {"pos": (-3.8, -0.8, -18), "color": (0.18, 0.18, 0.22, 1.0), "height": 1.5, "type": "elderly"},
        {"pos": (3.8, -0.8, -24), "color": (0.12, 0.12, 0.18, 1.0), "height": 1.65, "type": "casual"},
        {"pos": (-3.8, -0.8, -30), "color": (0.2, 0.15, 0.15, 1.0), "height": 1.58, "type": "student2"},
        {"pos": (3.8, -0.8, -36), "color": (0.15, 0.18, 0.15, 1.0), "height": 1.62, "type": "casual2"},
    ]

    for i, cfg in enumerate(npc_configs):
        npc_group = bpy.data.collections.new(f"NPC_{i:02d}")
        npc_col.children.link(npc_group)

        pos = cfg["pos"]
        h = cfg["height"]
        body_color = cfg["color"]

        npc_body_mat = make_material(f"NPCBodyMat_{i:02d}", body_color, roughness=0.8)
        npc_head_mat = make_material(f"NPCHeadMat_{i:02d}", SKIN, roughness=0.7)

        # Body
        bpy.ops.mesh.primitive_capsule_add(radius=0.12, depth=h * 0.4, location=(pos[0], pos[1] + h * 0.35, pos[2]))
        body = bpy.context.active_object
        body.name = f"NPC_{i:02d}_Body"
        body.data.materials.append(npc_body_mat)
        npc_group.objects.link(body)
        bpy.context.collection.objects.unlink(body)

        # Head
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.1, segments=8, rows=6,
                                               location=(pos[0], pos[1] + h * 0.7, pos[2]))
        head = bpy.context.active_object
        head.name = f"NPC_{i:02d}_Head"
        head.data.materials.append(npc_head_mat)
        npc_group.objects.link(head)
        bpy.context.collection.objects.unlink(head)

        # Simple legs (two capsules)
        for side in [-1, 1]:
            bpy.ops.mesh.primitive_capsule_add(radius=0.06, depth=h * 0.3,
                                                location=(pos[0] + side * 0.05, pos[1] + h * 0.1, pos[2]))
            leg = bpy.context.active_object
            leg.name = f"NPC_{i:02d}_Leg_{'L' if side == -1 else 'R'}"
            leg.data.materials.append(npc_body_mat)
            npc_group.objects.link(leg)
            bpy.context.collection.objects.unlink(leg)

        # Accessory based on type
        npc_type = cfg["type"]
        if npc_type == "business":
            # Briefcase
            bpy.ops.mesh.primitive_cube_add(size=0.1, location=(pos[0] + 0.2, pos[1] + h * 0.35, pos[2]))
            case = bpy.context.active_object
            case.name = f"NPC_{i:02d}_Briefcase"
            case.scale = (0.5, 0.35, 0.15)
            bpy.ops.object.transform_apply(scale=True)
            case.data.materials.append(make_material(f"BriefcaseMat_{i:02d}", (0.2, 0.15, 0.1, 1.0), roughness=0.7))
            npc_group.objects.link(case)
            bpy.context.collection.objects.unlink(case)
        elif npc_type == "student" or npc_type == "student2":
            # Backpack
            bpy.ops.mesh.primitive_cube_add(size=0.15, location=(pos[0], pos[1] + h * 0.4, pos[2] - 0.12))
            bp = bpy.context.active_object
            bp.name = f"NPC_{i:02d}_Backpack"
            bp.scale = (0.6, 0.7, 0.3)
            bpy.ops.object.transform_apply(scale=True)
            bp.data.materials.append(make_material(f"BPMat_{i:02d}", JACKET, roughness=0.8))
            npc_group.objects.link(bp)
            bpy.context.collection.unlink(bp)
        elif npc_type == "elderly":
            # Cane
            bpy.ops.mesh.primitive_cylinder_add(radius=0.015, depth=0.8,
                                                  location=(pos[0] + 0.2, pos[1] + h * 0.35, pos[2]))
            cane = bpy.context.active_object
            cane.name = f"NPC_{i:02d}_Cane"
            cane.data.materials.append(make_material(f"CaneMat_{i:02d}", (0.4, 0.25, 0.15, 1.0), roughness=0.8))
            npc_group.objects.link(cane)
            bpy.context.collection.unlink(cane)

    return npc_col


# ═══════════════════════════════════════
# POST-PROCESSING (Compositor)
# ═══════════════════════════════════════
def setup_compositor():
    bpy.context.scene.use_nodes = True
    tree = bpy.context.scene.node_tree
    nodes = tree.nodes
    links = tree.links
    nodes.clear()

    render_layers = nodes.new('CompositorNodeRLayers')
    render_layers.location = (0, 0)

    glare = nodes.new('CompositorNodeGlare')
    glare.location = (200, 0)
    glare.glare_type = 'FOG_GLOW'
    glare.quality = 'HIGH'
    glare.mix = 0.25
    glare.threshold = 0.5
    glare.size = 6

    color_balance = nodes.new('CompositorNodeColorBalance')
    color_balance.location = (400, 0)
    color_balance.correction_method = 'LIFT_GAMMA_GAIN'
    color_balance.lift = WORLD_BG
    color_balance.gamma = (1.05, 1.05, 1.05, 1.0)
    color_balance.gain = (1.0, 1.0, 1.0, 1.0)

    composite = nodes.new('CompositorNodeComposite')
    composite.location = (600, 0)

    links.new(render_layers.outputs['Image'], glare.inputs['Image'])
    links.new(glare.outputs['Image'], color_balance.inputs['Image'])
    links.new(color_balance.outputs['Image'], composite.inputs['Image'])

    # EEVEE Bloom
    bpy.context.scene.eevee.use_bloom = True
    bpy.context.scene.eevee.bloom_intensity = 0.03
    bpy.context.scene.eevee.bloom_threshold = 0.9
    bpy.context.scene.eevee.bloom_radius = 5
    bpy.context.scene.eevee.bloom_color = PINK[:3]


# ═══════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════
def main():
    clear_scene()
    setup_world()
    setup_camera()
    setup_lighting()
    create_anime_girl()
    create_pastel_buildings()
    create_cafe_shop()
    create_street_lamps()
    create_road_and_trees()
    create_cute_cars()
    create_sakura_petals()
    create_npc_figures()
    setup_compositor()

    print("=" * 60)
    print("Anime Girls Theme 7 — Blender scene created successfully!")
    print("=" * 60)
    print("Collections created:")
    for col in bpy.data.collections:
        print(f"  - {col.name}")
    print(f"Total objects: {len(bpy.data.objects)}")
    print(f"Total materials: {len(bpy.data.materials)}")
    print(f"Frame range: {bpy.context.scene.frame_start} - {bpy.context.scene.frame_end}")
    print(f"FPS: {bpy.context.scene.render.fps}")


if __name__ == "__main__":
    main()
       