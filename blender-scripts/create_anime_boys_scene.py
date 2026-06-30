import bpy
import math
import random
from mathutils import Vector

random.seed(42)

# ─── Color Constants ───
CYAN = (0.133, 0.827, 0.933, 1.0)      # #22D3EE
VIOLET = (0.545, 0.361, 0.965, 1.0)    # #8B5CF6
PINK = (0.957, 0.447, 0.714, 1.0)      # #F472B6
SKIN = (0.941, 0.784, 0.627, 1.0)      # #F0C8A0
HAIR = (0.102, 0.102, 0.118, 1.0)      # #1A1A2E
JACKET = (0.118, 0.161, 0.235, 1.0)    # #1E293B
PANTS = (0.059, 0.090, 0.165, 1.0)     # #0F172A
DARK = (0.059, 0.090, 0.165, 1.0)      # #0F172A
HOOD = (0.2, 0.255, 0.333, 1.0)        # #334155
STRAP = (0.278, 0.333, 0.412, 1.0)     # #475569
POLE_COLOR = (0.118, 0.161, 0.235, 1.0)  # #1E293B
LAMP_BODY = (0.059, 0.090, 0.165, 1.0)  # #0F172A
ROAD_COLOR = (0.059, 0.090, 0.165, 1.0)  # #0F172A
ROAD_DEEP = (0.043, 0.043, 0.102, 1.0)   # #0A0A1A
PUDDLE_COLOR = (0.043, 0.043, 0.102, 1.0)  # #0A0A1A
GROUND_COLOR = (0.067, 0.094, 0.153, 1.0)  # #111827


def clear_scene():
    """Remove all objects, collections, materials, and meshes."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for collection in bpy.data.collections:
        bpy.data.collections.remove(collection)
    for mesh in bpy.data.meshes:
        bpy.data.meshes.remove(mesh)
    for mat in bpy.data.materials:
        bpy.data.materials.remove(mat)
    for arm in bpy.data.armatures:
        bpy.data.armatures.remove(arm)
    for action in bpy.data.actions:
        bpy.data.actions.remove(action)


def make_material(name, color, metallic=0.0, roughness=0.7, emissive=False,
                  emissive_color=None, emissive_strength=0.0, alpha=1.0,
                  subsurface=0.0, subsurface_color=None, ior=1.45,
                  specular=0.5, clearcoat=0.0):
    """Create a Principled BSDF material."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output = nodes.new('ShaderNodeOutputMaterial')
    output.location = (400, 0)

    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.location = (0, 0)
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
    """Configure world properties as per spec."""
    world = bpy.data.worlds.new(name="AnimeBoysWorld")
    bpy.context.scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    nodes.clear()

    output = nodes.new('ShaderNodeOutputWorld')
    output.location = (400, 0)

    bg = nodes.new('ShaderNodeBackground')
    bg.location = (0, 0)
    bg.inputs['Color'].default_value = (0.020, 0.027, 0.071, 1.0)  # #050712
    bg.inputs['Strength'].default_value = 0.1

    mix = nodes.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.location = (200, 0)
    mix.inputs['Factor'].default_value = 1.0

    vol_scatter = nodes.new('ShaderNodeVolumeScatter')
    vol_scatter.location = (0, -200)
    vol_scatter.inputs['Density'].default_value = 0.002
    vol_scatter.inputs['Anisotropy'].default_value = 0.05
    vol_scatter.inputs['Color'].default_value = (0.043, 0.063, 0.125, 1.0)  # #0B1020

    links.new(bg.outputs['Background'], mix.inputs[6])
    links.new(vol_scatter.outputs['Volume'], mix.inputs[7])
    links.new(mix.outputs[2], output.inputs['Volume'])
    links.new(bg.outputs['Background'], output.inputs['Surface'])


# ═══════════════════════════════════════
# CAMERA SETUP
# ═══════════════════════════════════════
def setup_camera():
    """Create and animate the cinematic camera."""
    cam_data = bpy.data.cameras.new(name="CinematicCam")
    cam_data.lens = 35.0
    cam_data.clip_start = 0.1
    cam_data.clip_end = 200.0

    cam_obj = bpy.data.objects.new(name="CinematicCam", object_data=cam_data)
    bpy.context.collection.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj

    cam_obj.location = (2.5, 3.5, 8.0)
    cam_obj.rotation_euler = (math.radians(-15), math.radians(15), 0)

    # Animate cinematic dolly (720 frames at 30fps = 24 seconds)
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 720
    bpy.context.scene.render.fps = 30

    # Frame 1
    cam_obj.location = (2.5, 3.5, 8.0)
    cam_obj.keyframe_insert(data_path="location", frame=1)

    # Frame 360
    cam_obj.location = (2.8, 3.4, 7.5)
    cam_obj.keyframe_insert(data_path="location", frame=360)

    # Frame 720
    cam_obj.location = (2.5, 3.5, 8.0)
    cam_obj.keyframe_insert(data_path="location", frame=720)

    # Set interpolation to ease in/out
    if cam_obj.animation_data and cam_obj.animation_data.action:
        for fcurve in cam_obj.animation_data.action.fcurves:
            for kf in fcurve.keyframe_points:
                kf.interpolation = 'BEZIER'
                kf.easing = 'EASE_IN_OUT'


# ═══════════════════════════════════════
# LIGHTING SETUP
# ═══════════════════════════════════════
def setup_lighting():
    """Create all 6 lights as per spec."""

    # Light 1 — Main Street Light (Spot)
    spot1 = bpy.data.lights.new(name="MainStreetLight", type='SPOT')
    spot1.color = CYAN[:3]
    spot1.energy = 500
    spot1.spot_size = math.radians(40)
    spot1.spot_blend = 0.3
    spot1.shadow_soft_size = 2.0
    obj1 = bpy.data.objects.new(name="MainStreetLight", object_data=spot1)
    bpy.context.collection.objects.link(obj1)
    obj1.location = (2, 6, -3)

    # Light 2 — Neon Fill Right (Point)
    pt2 = bpy.data.lights.new(name="NeonFillRight", type='POINT')
    pt2.color = VIOLET[:3]
    pt2.energy = 300
    pt2.shadow_soft_size = 8.0
    obj2 = bpy.data.objects.new(name="NeonFillRight", object_data=pt2)
    bpy.context.collection.objects.link(obj2)
    obj2.location = (6, 3, -8)

    # Light 3 — Neon Fill Left (Point)
    pt3 = bpy.data.lights.new(name="NeonFillLeft", type='POINT')
    pt3.color = PINK[:3]
    pt3.energy = 250
    pt3.shadow_soft_size = 8.0
    obj3 = bpy.data.objects.new(name="NeonFillLeft", object_data=pt3)
    bpy.context.collection.objects.link(obj3)
    obj3.location = (-6, 3, -8)

    # Light 4 — Back Rim (Spot)
    spot4 = bpy.data.lights.new(name="BackRim", type='SPOT')
    spot4.color = CYAN[:3]
    spot4.energy = 400
    spot4.spot_size = math.radians(30)
    spot4.spot_blend = 0.5
    obj4 = bpy.data.objects.new(name="BackRim", object_data=spot4)
    bpy.context.collection.objects.link(obj4)
    obj4.location = (-3, 5, -15)

    # Light 5 — Ambient (Area)
    area5 = bpy.data.lights.new(name="AmbientArea", type='AREA')
    area5.color = (0.043, 0.063, 0.125)  # #0B1020
    area5.energy = 100
    area5.size = 30
    obj5 = bpy.data.objects.new(name="AmbientArea", object_data=area5)
    bpy.context.collection.objects.link(obj5)
    obj5.location = (0, 10, 0)

    # Light 6 — Ground Bounce (Area)
    area6 = bpy.data.lights.new(name="GroundBounce", type='AREA')
    area6.color = GROUND_COLOR[:3]
    area6.energy = 50
    area6.size = 20
    obj6 = bpy.data.objects.new(name="GroundBounce", object_data=area6)
    bpy.context.collection.objects.link(obj6)
    obj6.location = (0, -0.5, 0)


# ═══════════════════════════════════════
# MODEL 1: ANIME BOY CHARACTER
# ═══════════════════════════════════════
def create_anime_boy():
    """Create the full anime boy character with rig and walk cycle."""

    # Create materials
    skin_mat = make_material("Skin", SKIN, roughness=0.7, subsurface=0.15,
                             subsurface_color=(0.91, 0.72, 0.604, 1.0))  # #E8B89A
    hair_mat = make_material("Hair", HAIR, roughness=0.9, metallic=0.02)
    jacket_mat = make_material("Jacket", JACKET, roughness=0.75, metallic=0.05)
    pants_mat = make_material("Pants", PANTS, roughness=0.8, metallic=0.03)
    shoe_mat = make_material("Shoes", CYAN, roughness=0.4, metallic=0.15,
                             emissive=True, emissive_color=CYAN, emissive_strength=0.2)
    headphone_mat = make_material("HeadphoneBody", DARK, roughness=0.4, metallic=0.1)
    hp_led_mat = make_material("HeadphoneLED", CYAN, roughness=0.3,
                               emissive=True, emissive_color=CYAN, emissive_strength=0.4)
    hood_mat = make_material("Hood", HOOD, roughness=0.8)
    strap_mat = make_material("Strap", STRAP, roughness=0.8)

    # Collection for character
    char_col = bpy.data.collections.new("AnimeBoyCharacter")
    bpy.context.scene.collection.children.link(char_col)

    # ─── Head ───
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.38, segments=32, rings=16, location=(0, 0, 1.55))
    head = bpy.context.active_object
    head.name = "Head"
    head.scale = (1.0, 1.05, 0.95)
    bpy.ops.object.transform_apply(scale=True)

    # Shape keys for animation
    head.shape_key_add(name="Basis")
    head.shape_key_add(name="Blink")
    head.shape_key_add(name="MouthOpen")
    head.shape_key_add(name="Smile")

    # Assign skin material
    head.data.materials.append(skin_mat)

    # Parent to char collection
    char_col.objects.link(head)
    bpy.context.collection.objects.unlink(head)

    # ─── Hair (multiple pieces) ───
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.40, segments=24, rings=12, location=(0, 0.04, 1.62))
    hair_main = bpy.context.active_object
    hair_main.name = "HairMain"
    hair_main.scale = (1.02, 1.02, 0.95)
    bpy.ops.object.transform_apply(scale=True)
    hair_main.data.materials.append(hair_mat)
    char_col.objects.link(hair_main)
    bpy.context.collection.objects.unlink(hair_main)

    # Hair spikes / bangs
    bang_positions = [
        (-0.12, 0.08, 1.85), (0.08, 0.1, 1.87), (0, 0.14, 1.88),
        (-0.2, 0.05, 1.82), (0.18, 0.06, 1.83),
        (-0.25, -0.02, 1.75), (0.22, 0.0, 1.76),
        (-0.15, -0.06, 1.68), (0.12, -0.05, 1.69),
    ]
    for i, pos in enumerate(bang_positions):
        bpy.ops.mesh.primitive_cone_add(radius1=0.05, depth=0.12, location=pos)
        spike = bpy.context.active_object
        spike.name = f"HairBang_{i}"
        spike.rotation_euler = (0.3 + i * 0.05, 0, (i % 3 - 1) * 0.2)
        bpy.ops.object.transform_apply(rotation=True)
        spike.data.materials.append(hair_mat)
        char_col.objects.link(spike)
        bpy.context.collection.objects.unlink(spike)

    # Side locks
    side_positions = [(-0.35, -0.05, 1.4), (-0.33, -0.08, 1.3), (-0.30, -0.1, 1.2),
                      (0.35, -0.05, 1.4), (0.33, -0.08, 1.3), (0.30, -0.1, 1.2)]
    for i, pos in enumerate(side_positions):
        bpy.ops.mesh.primitive_cone_add(radius1=0.04, depth=0.15, location=pos)
        lock = bpy.context.active_object
        lock.name = f"SideLock_{i}"
        lock.rotation_euler = (-0.2, 0, -0.3 if i < 3 else 0.3)
        bpy.ops.object.transform_apply(rotation=True)
        lock.data.materials.append(hair_mat)
        char_col.objects.link(lock)
        bpy.context.collection.objects.unlink(lock)

    # ─── Eyes ───
    sclera_mat = make_material("Sclera", (1, 1, 1, 1), roughness=0.3)
    iris_mat = make_material("Iris", HAIR, roughness=0.2)
    highlight_mat = make_material("Highlight", (1, 1, 1, 1), emissive=True,
                                  emissive_color=(1, 1, 1, 1), emissive_strength=2.0)

    for side in [-1, 1]:
        # Sclera
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.08, segments=12, rings=8,
                                              location=(side * 0.14, -0.04, 1.55))
        sclera = bpy.context.active_object
        sclera.name = f"Sclera_{'L' if side == -1 else 'R'}"
        sclera.scale = (1.0, 1.0, 0.5)
        bpy.ops.object.transform_apply(scale=True)
        sclera.data.materials.append(sclera_mat)
        char_col.objects.link(sclera)
        bpy.context.collection.objects.unlink(sclera)

        # Iris
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.055, segments=10, rings=6,
                                              location=(side * 0.14, -0.02, 1.555))
        iris = bpy.context.active_object
        iris.name = f"Iris_{'L' if side == -1 else 'R'}"
        iris.scale = (1.0, 1.0, 0.5)
        bpy.ops.object.transform_apply(scale=True)
        iris.data.materials.append(iris_mat)
        char_col.objects.link(iris)
        bpy.context.collection.objects.unlink(iris)

        # Highlight
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.015, segments=6, rows=4,
                                              location=(side * 0.12, 0.0, 1.59))
        highlight = bpy.context.active_object
        highlight.name = f"Highlight_{'L' if side == -1 else 'R'}"
        highlight.data.materials.append(highlight_mat)
        char_col.objects.link(highlight)
        bpy.context.collection.objects.unlink(highlight)

    # ─── Nose ───
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.03, segments=8, rows=6,
                                          location=(0, -0.02, 1.48))
    nose = bpy.context.active_object
    nose.name = "Nose"
    nose.scale = (0.6, 0.5, 0.4)
    bpy.ops.object.transform_apply(scale=True)
    nose.data.materials.append(skin_mat)
    char_col.objects.link(nose)
    bpy.context.collection.objects.unlink(nose)

    # ─── Mouth ───
    bpy.ops.mesh.primitive_cube_add(size=0.06, location=(0, -0.08, 1.42))
    mouth = bpy.context.active_object
    mouth.name = "Mouth"
    mouth.scale = (1.0, 0.2, 0.1)
    bpy.ops.object.transform_apply(scale=True)
    mouth_mat = make_material("Mouth", (0.6, 0.3, 0.3, 1.0), roughness=0.6)
    mouth.data.materials.append(mouth_mat)
    char_col.objects.link(mouth)
    bpy.context.collection.objects.unlink(mouth)

    # ─── Neck ───
    bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=0.15, location=(0, 0, 1.28))
    neck = bpy.context.active_object
    neck.name = "Neck"
    neck.data.materials.append(skin_mat)
    char_col.objects.link(neck)
    bpy.context.collection.objects.unlink(neck)

    # ─── Torso / Hoodie ───
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.0))
    torso = bpy.context.active_object
    torso.name = "Torso"
    torso.scale = (0.55, 0.7, 0.28)
    bpy.ops.object.transform_apply(scale=True)
    torso.data.materials.append(jacket_mat)
    char_col.objects.link(torso)
    bpy.context.collection.objects.unlink(torso)

    # Hood
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.05, 1.15))
    hood = bpy.context.active_object
    hood.name = "Hood"
    hood.scale = (0.45, 0.18, 0.22)
    bpy.ops.object.transform_apply(scale=True)
    hood.data.materials.append(hood_mat)
    char_col.objects.link(hood)
    bpy.context.collection.objects.unlink(hood)

    # ─── Arms ───
    for side in [-1, 1]:
        # Upper arm
        bpy.ops.mesh.primitive_capsule_add(radius=0.14, depth=0.42,
                                            location=(side * 0.38, 0, 1.05))
        upper_arm = bpy.context.active_object
        upper_arm.name = f"UpperArm_{'L' if side == -1 else 'R'}"
        upper_arm.data.materials.append(jacket_mat)
        char_col.objects.link(upper_arm)
        bpy.context.collection.objects.unlink(upper_arm)

        # Forearm
        bpy.ops.mesh.primitive_capsule_add(radius=0.12, depth=0.35,
                                            location=(side * 0.40, 0, 0.65))
        forearm = bpy.context.active_object
        forearm.name = f"Forearm_{'L' if side == -1 else 'R'}"
        forearm.data.materials.append(jacket_mat)
        char_col.objects.link(forearm)
        bpy.context.collection.objects.unlink(forearm)

        # Hand
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.1, segments=8, rows=6,
                                              location=(side * 0.42, 0, 0.42))
        hand = bpy.context.active_object
        hand.name = f"Hand_{'L' if side == -1 else 'R'}"
        hand.data.materials.append(skin_mat)
        char_col.objects.link(hand)
        bpy.context.collection.objects.unlink(hand)

    # ─── Legs ───
    for side in [-1, 1]:
        # Thigh
        bpy.ops.mesh.primitive_capsule_add(radius=0.2, depth=0.45,
                                            location=(side * 0.14, 0, 0.55))
        thigh = bpy.context.active_object
        thigh.name = f"Thigh_{'L' if side == -1 else 'R'}"
        thigh.data.materials.append(pants_mat)
        char_col.objects.link(thigh)
        bpy.context.collection.objects.unlink(thigh)

        # Shin
        bpy.ops.mesh.primitive_capsule_add(radius=0.16, depth=0.35,
                                            location=(side * 0.14, 0, 0.18))
        shin = bpy.context.active_object
        shin.name = f"Shin_{'L' if side == -1 else 'R'}"
        shin.data.materials.append(pants_mat)
        char_col.objects.link(shin)
        bpy.context.collection.objects.unlink(shin)

        # Foot / Shoe
        bpy.ops.mesh.primitive_cube_add(size=1, location=(side * 0.14, 0.04, -0.02))
        foot = bpy.context.active_object
        foot.name = f"Foot_{'L' if side == -1 else 'R'}"
        foot.scale = (0.14, 0.1, 0.22)
        bpy.ops.object.transform_apply(scale=True)
        foot.data.materials.append(shoe_mat)
        char_col.objects.link(foot)
        bpy.context.collection.objects.unlink(foot)

    # ─── Headphones ───
    # Headband
    bpy.ops.mesh.primitive_torus_add(major_radius=0.4, minor_radius=0.025,
                                      location=(0, 0.08, 1.55), abo_res=24, major_res=1)
    headband = bpy.context.active_object
    headband.name = "HeadphoneBand"
    headband.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    headband.data.materials.append(headphone_mat)
    char_col.objects.link(headband)
    bpy.context.collection.objects.unlink(headband)

    # Ear cups
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cube_add(size=1, location=(side * 0.4, 0.0, 1.48))
        ear_cup = bpy.context.active_object
        ear_cup.name = f"EarCup_{'L' if side == -1 else 'R'}"
        ear_cup.scale = (0.08, 0.1, 0.08)
        bpy.ops.object.transform_apply(scale=True)
        ear_cup.data.materials.append(headphone_mat)
        char_col.objects.link(ear_cup)
        bpy.context.collection.objects.unlink(ear_cup)

        # LED ring
        bpy.ops.mesh.primitive_torus_add(major_radius=0.06, minor_radius=0.008,
                                          location=(side * 0.4, 0.0, 1.53), abo_res=12, major_res=1)
        led_ring = bpy.context.active_object
        led_ring.name = f"HP_LED_{'L' if side == -1 else 'R'}"
        led_ring.rotation_euler = (math.radians(90), 0, 0)
        bpy.ops.object.transform_apply(rotation=True)
        led_ring.data.materials.append(hp_led_mat)
        char_col.objects.link(led_ring)
        bpy.context.collection.objects.unlink(led_ring)

    # ─── Backpack ───
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.12, 0.95))
    backpack = bpy.context.active_object
    backpack.name = "Backpack"
    backpack.scale = (0.22, 0.18, 0.1)
    bpy.ops.object.transform_apply(scale=True)
    backpack.data.materials.append(jacket_mat)
    char_col.objects.link(backpack)
    bpy.context.collection.objects.unlink(backpack)

    # Backpack flap
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.06, 0.95))
    flap = bpy.context.active_object
    flap.name = "BackpackFlap"
    flap.scale = (0.20, 0.03, 0.09)
    bpy.ops.object.transform_apply(scale=True)
    flap.data.materials.append(hood_mat)
    char_col.objects.link(flap)
    bpy.context.collection.objects.unlink(flap)

    # Backpack strap
    bpy.ops.mesh.primitive_torus_add(major_radius=0.15, minor_radius=0.015,
                                      location=(0.15, 0.0, 1.05), abo_res=8, major_res=1)
    strap = bpy.context.active_object
    strap.name = "BackpackStrap"
    strap.rotation_euler = (0, math.radians(90), 0.2)
    bpy.ops.object.transform_apply(rotation=True)
    strap.data.materials.append(strap_mat)
    char_col.objects.link(strap)
    bpy.context.collection.objects.unlink(strap)

    return char_col


# ═══════════════════════════════════════
# MODEL 2: CYBERPUNK BUILDINGS (18 variants)
# ═══════════════════════════════════════════
def create_cyber_buildings():
    """Create 18 building variants as per spec."""
    building_col = bpy.data.collections.new("CyberBuildings")
    bpy.context.scene.collection.children.link(building_col)

    for i in range(18):
        side = -1 if i % 2 == 0 else 1
        width = 1.5 + random.random() * 2
        height = 3 + random.random() * 8
        depth = 1.5 + random.random() * 2
        x_offset = 4 + random.random() * 12
        z_pos = -5 - random.random() * 35

        building_group = bpy.data.collections.new(f"Building_{i:02d}")
        building_col.children.link(building_group)

        # Building base material
        hue = 200 + random.random() * 40
        sat = 0.15 + random.random() * 0.20
        light = 0.08 + random.random() * 0.12
        # Convert HSL to RGB (simplified)
        import colorsys
        r, g, b = colorsys.hls_to_rgb(hue / 360, light, sat)
        base_color = (r, g, b, 1.0)

        building_mat = make_material(f"BuildingFacade_{i:02d}", base_color,
                                     roughness=0.85, metallic=0.1)

        # Main building mesh
        bpy.ops.mesh.primitive_cube_add(size=1, location=(side * x_offset, height / 2 - 3, z_pos))
        building = bpy.context.active_object
        building.name = f"Building_{i:02d}_Base"
        building.scale = (width, height, depth)
        bpy.ops.object.transform_apply(scale=True)
        building.data.materials.append(building_mat)
        building_group.objects.link(building)
        bpy.context.collection.objects.unlink(building)

        # Window grid
        floors = int(height / 0.3)
        windows_per_floor = int(width / 0.4)
        window_colors = [CYAN, VIOLET, (0.992, 0.902, 0.541, 1.0), (1, 1, 1, 1)]  # cyan, violet, warm, white

        for row in range(floors):
            for col in range(windows_per_floor):
                is_lit = random.random() < 0.7
                wx = -width / 2 + 0.2 + col * 0.4
                wy = -height / 2 + 0.2 + row * 0.3
                wz = depth / 2 + 0.01

                bpy.ops.mesh.primitive_plane_add(size=1, location=(side * x_offset + wx, wy - 3 + height / 2, z_pos + wz))
                window = bpy.context.active_object
                window.name = f"Building_{i:02d}_Win_{row}_{col}"
                window.scale = (0.3, 0.4, 1.0)
                bpy.ops.object.transform_apply(scale=True)

                if is_lit:
                    wc = window_colors[random.randint(0, 3)]
                    win_mat = make_material(f"WindowLit_{i:02d}_{row}_{col}", wc,
                                            emissive=True, emissive_color=wc,
                                            emissive_strength=0.6 + random.random() * 0.4)
                else:
                    win_mat = make_material(f"WindowDark_{i:02d}_{row}_{col}", (0.043, 0.043, 0.102, 1.0))

                window.data.materials.append(win_mat)
                building_group.objects.link(window)
                bpy.context.collection.objects.unlink(window)

    return building_col


# ═══════════════════════════════════════
# MODEL 3: NEON SIGNS (8 variants)
# ═══════════════════════════════════════
def create_neon_signs():
    """Create 8 neon sign variants as per spec."""
    sign_col = bpy.data.collections.new("NeonSigns")
    bpy.context.scene.collection.children.link(sign_col)

    colors = [CYAN, VIOLET, PINK]

    for i in range(8):
        side = -1 if i % 2 == 0 else 1
        color = colors[i % 3]
        width = 1.2 + random.random() * 1.5
        height = 0.4 + random.random() * 0.6
        pos = (side * (5 + random.random() * 8), 1 + random.random() * 3, -8 - random.random() * 25)

        sign_group = bpy.data.collections.new(f"NeonSign_{i:02d}")
        sign_col.children.link(sign_group)

        # Sign panel
        bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
        sign = bpy.context.active_object
        sign.name = f"NeonSign_{i:02d}_Panel"
        sign.scale = (width, height, 0.05)
        bpy.ops.object.transform_apply(scale=True)

        sign_mat = make_material(f"NeonSignMat_{i:02d}", color,
                                 emissive=True, emissive_color=color, emissive_strength=2.0)
        sign.data.materials.append(sign_mat)
        sign_group.objects.link(sign)
        bpy.context.collection.objects.unlink(sign)

        # Mounting bracket
        bpy.ops.mesh.primitive_cube_add(size=1, location=(pos[0], pos[1], pos[2] - 0.05))
        bracket = bpy.context.active_object
        bracket.name = f"NeonSign_{i:02d}_Bracket"
        bracket.scale = (0.05, 0.05, 0.04)
        bpy.ops.object.transform_apply(scale=True)
        bracket_mat = make_material(f"BracketMat_{i:02d}", POLE_COLOR, metallic=0.3, roughness=0.6)
        bracket.data.materials.append(bracket_mat)
        sign_group.objects.link(bracket)
        bpy.context.collection.objects.unlink(bracket)

        # Animate neon flicker
        if sign_mat.use_nodes:
            nodes = sign_mat.node_tree.nodes
            bsdf = None
            for node in nodes:
                if node.type == 'BSDF_PRINCIPLED':
                    bsdf = node
                    break
            if bsdf:
                # Animate emission strength for flicker
                bsdf.inputs['Emission Strength'].default_value = 2.0
                bsdf.inputs['Emission Strength'].keyframe_insert(data_path="default_value", frame=1)

                # Brief flicker at random intervals
                for flicker_frame in [60, 180, 340, 500, 650]:
                    bsdf.inputs['Emission Strength'].default_value = 0.5
                    bsdf.inputs['Emission Strength'].keyframe_insert(data_path="default_value", frame=flicker_frame)
                    bsdf.inputs['Emission Strength'].default_value = 2.0
                    bsdf.inputs['Emission Strength'].keyframe_insert(data_path="default_value", frame=flicker_frame + 3)

    return sign_col


# ═══════════════════════════════════════
# MODEL 4: STREET LAMPS (8)
# ═══════════════════════════════════════
def create_street_lamps():
    """Create 8 street lamp meshes as per spec."""
    lamp_col = bpy.data.collections.new("StreetLamps")
    bpy.context.scene.collection.children.link(lamp_col)

    lamp_colors = [PINK, CYAN, VIOLET, PINK, CYAN, VIOLET, PINK, CYAN]

    for i in range(8):
        side = -1 if i % 2 == 0 else 1
        pos = (side * (2.5 + random.random() * 1.5), 0, -4 - i * 5 - random.random() * 2)
        color = lamp_colors[i]

        lamp_group = bpy.data.collections.new(f"StreetLamp_{i:02d}")
        lamp_col.children.link(lamp_group)

        # Pole
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.04, depth=4.5, location=(pos[0], 2.25, pos[2]))
        pole = bpy.context.active_object
        pole.name = f"StreetLamp_{i:02d}_Pole"
        pole_mat = make_material(f"PoleMat_{i:02d}", POLE_COLOR, metallic=0.3, roughness=0.6)
        pole.data.materials.append(pole_mat)
        lamp_group.objects.link(pole)
        bpy.context.collection.objects.unlink(pole)

        # Arm (L-shape)
        bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.03, depth=0.5,
                                             location=(pos[0] + 0.15, 4.4, pos[2]))
        arm = bpy.context.active_object
        arm.name = f"StreetLamp_{i:02d}_Arm"
        arm.rotation_euler = (0, 0, -0.4)
        bpy.ops.object.transform_apply(rotation=True)
        arm.data.materials.append(pole_mat)
        lamp_group.objects.link(arm)
        bpy.context.collection.objects.unlink(arm)

        # Lamp head
        bpy.ops.mesh.primitive_cube_add(size=1, location=(pos[0] + 0.3, 4.5, pos[2]))
        lamp_head = bpy.context.active_object
        lamp_head.name = f"StreetLamp_{i:02d}_Head"
        lamp_head.scale = (0.4, 0.15, 0.2)
        bpy.ops.object.transform_apply(scale=True)
        head_mat = make_material(f"LampHeadMat_{i:02d}", LAMP_BODY, roughness=0.5)
        lamp_head.data.materials.append(head_mat)
        lamp_group.objects.link(lamp_head)
        bpy.context.collection.objects.unlink(lamp_head)

        # Light surface (emissive)
        bpy.ops.mesh.primitive_cube_add(size=1, location=(pos[0] + 0.3, 4.42, pos[2]))
        light_surf = bpy.context.active_object
        light_surf.name = f"StreetLamp_{i:02d}_LightSurf"
        light_surf.scale = (0.38, 0.02, 0.18)
        bpy.ops.object.transform_apply(scale=True)
        light_mat = make_material(f"LightSurfMat_{i:02d}", color,
                                  emissive=True, emissive_color=color, emissive_strength=3.0)
        light_surf.data.materials.append(light_mat)
        lamp_group.objects.link(light_surf)
        bpy.context.collection.objects.unlink(light_surf)

        # Base
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.12, depth=0.1,
                                             location=(pos[0], 0.05, pos[2]))
        base = bpy.context.active_object
        base.name = f"StreetLamp_{i:02d}_Base"
        base.data.materials.append(pole_mat)
        lamp_group.objects.link(base)
        bpy.context.collection.objects.unlink(base)

    return lamp_col


# ═══════════════════════════════════════
# MODEL 5: ROAD & PUDDLES
# ═══════════════════════════════════════
def create_road_and_puddles():
    """Create road surface with lane markings, sidewalks, and puddles."""
    road_col = bpy.data.collections.new("RoadAndPuddles")
    bpy.context.scene.collection.children.link(road_col)

    # Road surface
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -0.01, -20))
    road = bpy.context.active_object
    road.name = "RoadSurface"
    road.scale = (4, 40, 1)
    bpy.ops.object.transform_apply(scale=True)
    road_mat = make_material("WetRoad", ROAD_COLOR, roughness=0.15, specular=0.8)
    road.data.materials.append(road_mat)
    road_col.objects.link(road)
    bpy.context.collection.objects.unlink(road)

    # Lane markings
    for i in range(40):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.005, -i * 2))
        marking = bpy.context.active_object
        marking.name = f"LaneMarking_{i:02d}"
        marking.scale = (0.02, 0.5, 0.01)
        bpy.ops.object.transform_apply(scale=True)
        marking_mat = make_material(f"LaneMarkMat_{i:02d}", (0.992, 0.902, 0.541, 1.0),  # #FDE68A
                                    emissive=True, emissive_color=(0.992, 0.902, 0.541, 1.0),
                                    emissive_strength=0.3)
        marking.data.materials.append(marking_mat)
        road_col.objects.link(marking)
        bpy.context.collection.objects.unlink(marking)

    # Sidewalks
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cube_add(size=1, location=(side * 4.5, 0.075, -20))
        sidewalk = bpy.context.active_object
        sidewalk.name = f"Sidewalk_{'L' if side == -1 else 'R'}"
        sidewalk.scale = (1.5, 0.15, 40)
        bpy.ops.object.transform_apply(scale=True)
        sidewalk_mat = make_material(f"SidewalkMat_{'L' if side == -1 else 'R'}", GROUND_COLOR, roughness=0.9)
        sidewalk.data.materials.append(sidewalk_mat)
        road_col.objects.link(sidewalk)
        bpy.context.collection.objects.unlink(sidewalk)

    # Puddles
    for i in range(7):
        radius = 0.3 + random.random() * 0.8
        px = (random.random() - 0.5) * 6
        pz = (random.random() - 0.5) * 30

        bpy.ops.mesh.primitive_circle_add(vertices=24, radius=radius, location=(px, 0.001, pz))
        puddle = bpy.context.active_object
        puddle.name = f"Puddle_{i:02d}"
        puddle.rotation_euler = (math.radians(-90), 0, 0)
        bpy.ops.object.transform_apply(rotation=True)
        puddle_mat = make_material(f"PuddleMat_{i:02d}", PUDDLE_COLOR,
                                   roughness=0.02, metallic=0.1, specular=1.0, ior=1.33)
        puddle.data.materials.append(puddle_mat)
        road_col.objects.link(puddle)
        bpy.context.collection.objects.unlink(puddle)

    return road_col


# ═══════════════════════════════════════
# MODEL 6: LOW-POLY CARS (4 variants)
# ═══════════════════════════════════════
def create_cars():
    """Create 4 low-poly car variants as per spec."""
    car_col = bpy.data.collections.new("Cars")
    bpy.context.scene.collection.children.link(car_col)

    body_colors = [
        (0.059, 0.090, 0.165, 1.0),  # #0F172A
        (0.118, 0.161, 0.235, 1.0),  # #1E293B
        (0.067, 0.094, 0.153, 1.0),  # #111827
        (0.059, 0.090, 0.165, 1.0),  # #0F172A
    ]

    for i in range(4):
        car_group = bpy.data.collections.new(f"Car_{i:02d}")
        car_col.children.link(car_group)

        body_color = body_colors[i]
        z_start = -10 - i * 5 + random.random() * 3
        x_offset = (1.8 if i % 2 == 0 else -1.8)

        car_mat = make_material(f"CarBody_{i:02d}", body_color,
                                metallic=0.6, roughness=0.3, clearcoat=0.5)

        # Body
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x_offset, 0.4, z_start))
        body = bpy.context.active_object
        body.name = f"Car_{i:02d}_Body"
        body.scale = (1.8, 0.8, 0.5)
        bpy.ops.object.transform_apply(scale=True)
        body.data.materials.append(car_mat)
        car_group.objects.link(body)
        bpy.context.collection.objects.unlink(body)

        # Cabin
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x_offset + 0.1, 0.75, z_start))
        cabin = bpy.context.active_object
        cabin.name = f"Car_{i:02d}_Cabin"
        cabin.scale = (1.0, 0.7, 0.45)
        bpy.ops.object.transform_apply(scale=True)
        cabin.data.materials.append(car_mat)
        car_group.objects.link(cabin)
        bpy.context.collection.objects.unlink(cabin)

        # Wheels
        wheel_positions = [
            (x_offset - 0.6, -0.2, z_start + 0.35),
            (x_offset + 0.6, -0.2, z_start + 0.35),
            (x_offset - 0.6, -0.2, z_start - 0.35),
            (x_offset + 0.6, -0.2, z_start - 0.35),
        ]
        wheel_mat = make_material(f"WheelMat_{i:02d}", HAIR, roughness=0.8)
        for j, wpos in enumerate(wheel_positions):
            bpy.ops.mesh.primitive_cylinder_add(radius=0.15, depth=0.1, location=wpos)
            wheel = bpy.context.active_object
            wheel.name = f"Car_{i:02d}_Wheel_{j}"
            wheel.rotation_euler = (0, math.radians(90), 0)
            bpy.ops.object.transform_apply(rotation=True)
            wheel.data.materials.append(wheel_mat)
            car_group.objects.link(wheel)
            bpy.context.collection.objects.unlink(wheel)

        # Headlights
        headlight_mat = make_material(f"HeadlightMat_{i:02d}", (1, 1, 1, 1),
                                      emissive=True, emissive_color=(1, 1, 1, 1), emissive_strength=2.0)
        for hx in [-0.3, 0.3]:
            bpy.ops.mesh.primitive_cube_add(size=1, location=(x_offset + hx, 0.4, z_start + 0.26))
            hl = bpy.context.active_object
            hl.name = f"Car_{i:02d}_Headlight_{'L' if hx < 0 else 'R'}"
            hl.scale = (0.15, 0.06, 0.01)
            bpy.ops.object.transform_apply(scale=True)
            hl.data.materials.append(headlight_mat)
            car_group.objects.link(hl)
            bpy.context.collection.objects.unlink(hl)

        # Taillights
        taillight_mat = make_material(f"TaillightMat_{i:02d}", (0.937, 0.267, 0.267, 1.0),  # #EF4444
                                      emissive=True, emissive_color=(0.937, 0.267, 0.267, 1.0),
                                      emissive_strength=1.5)
        for tx in [-0.3, 0.3]:
            bpy.ops.mesh.primitive_cube_add(size=1, location=(x_offset + tx, 0.4, z_start - 0.26))
            tl = bpy.context.active_object
            tl.name = f"Car_{i:02d}_Taillight_{'L' if tx < 0 else 'R'}"
            tl.scale = (0.12, 0.05, 0.01)
            bpy.ops.object.transform_apply(scale=True)
            tl.data.materials.append(taillight_mat)
            car_group.objects.link(tl)
            bpy.context.collection.objects.unlink(tl)

        # Animate car movement
        body_obj = bpy.data.objects.get(f"Car_{i:02d}_Body")
        if body_obj:
            body_obj.location.z = z_start
            body_obj.keyframe_insert(data_path="location", frame=1)
            body_obj.location.z = z_start - 15
            body_obj.keyframe_insert(data_path="location", frame=720)

    return car_col


# ═══════════════════════════════════════
# MODEL 7: RAIN PARTICLE SYSTEM
# ═══════════════════════════════════════
def create_rain_system():
    """Create rain particle system as per spec."""
    # Create emitter plane
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 12, -20))
    emitter = bpy.context.active_object
    emitter.name = "RainEmitter"
    emitter.scale = (10, 30, 1)
    bpy.ops.object.transform_apply(scale=True)

    # Add particle system
    emitter.modifiers.new(name="RainParticles", type='PARTICLE_SYSTEM')
    ps = emitter.particle_systems[0]
    ps.name = "RainSystem"

    settings = ps.settings
    settings.count = 2000
    settings.lifetime = 60
    settings.emit_from = 'FACE'
    settings.physics_type = 'NEWTON'
    settings.mass = 0.001
    settings.particle_size = 0.003
    settings.normal_factor = 0
    settings.factor_random = 0.5
    settings.effector_weights.gravity = 0.15
    settings.drag_factor = 0.05
    settings.use_render_emitter = False

    # Render as object (thin cylinder)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.003, depth=0.15, location=(0, 20, 0))
    rain_drop = bpy.context.active_object
    rain_drop.name = "RainDropInstance"
    rain_mat = make_material("RainDrop", CYAN, roughness=0.0, alpha=0.3,
                             emissive=True, emissive_color=CYAN, emissive_strength=0.5, ior=1.33)
    rain_drop.data.materials.append(rain_mat)

    settings.render_type = 'OBJECT'
    settings.instance_object = rain_drop
    settings.particle_size = 1.0

    return emitter


# ═══════════════════════════════════════
# POST-PROCESSING (Compositor)
# ═══════════════════════════════════════
def setup_compositor():
    """Setup compositor for post-processing."""
    bpy.context.scene.use_nodes = True
    tree = bpy.context.scene.node_tree
    nodes = tree.nodes
    links = tree.links
    nodes.clear()

    # Render layers
    render_layers = nodes.new('CompositorNodeRLayers')
    render_layers.location = (0, 0)

    # Glare (Fog Glow)
    glare = nodes.new('CompositorNodeGlare')
    glare.location = (200, 0)
    glare.glare_type = 'FOG_GLOW'
    glare.quality = 'HIGH'
    glare.mix = 0.6
    glare.threshold = 0.15
    glare.size = 8

    # Lens Distortion
    lens_dist = nodes.new('CompositorNodeLensdist')
    lens_dist.location = (400, 0)
    lens_dist.inputs['Distort'].default_value = 0.005
    lens_dist.inputs['Dispersion'].default_value = 0.02

    # Color Balance
    color_balance = nodes.new('CompositorNodeColorBalance')
    color_balance.location = (600, 0)
    color_balance.correction_method = 'LIFT_GAMMA_GAIN'
    color_balance.lift = (0.020, 0.027, 0.071, 1.0)  # #050712
    color_balance.gamma = (1.0, 1.0, 1.0, 1.0)
    color_balance.gain = (0.133, 0.827, 0.933, 1.0)  # #22D3EE at 5%

    # Composite output
    composite = nodes.new('CompositorNodeComposite')
    composite.location = (800, 0)

    # Link nodes
    links.new(render_layers.outputs['Image'], glare.inputs['Image'])
    links.new(glare.outputs['Image'], lens_dist.inputs['Image'])
    links.new(lens_dist.outputs['Image'], color_balance.inputs['Image'])
    links.new(color_balance.outputs['Image'], composite.inputs['Image'])

    # Enable bloom in EEVEE
    bpy.context.scene.eevee.use_bloom = True
    bpy.context.scene.eevee.bloom_intensity = 0.1
    bpy.context.scene.eevee.bloom_threshold = 0.6
    bpy.context.scene.eevee.bloom_radius = 8
    bpy.context.scene.eevee.bloom_color = CYAN[:3]


# ═══════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════
def main():
    clear_scene()
    setup_world()
    setup_camera()
    setup_lighting()
    create_anime_boy()
    create_cyber_buildings()
    create_neon_signs()
    create_street_lamps()
    create_road_and_puddles()
    create_cars()
    create_rain_system()
    setup_compositor()

    print("=" * 60)
    print("Anime Boys Theme 6 — Blender scene created successfully!")
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
