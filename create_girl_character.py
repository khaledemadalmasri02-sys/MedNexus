import bpy
import math
import mathutils
from mathutils import Vector

# Clear existing objects
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# Set up scene
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'GPU'
scene.cycles.samples = 128
scene.cycles.use_denoising = True
scene.world = bpy.data.worlds.new("World")
scene.world.use_nodes = True
bg = scene.world.node_tree.nodes["Background"]
bg.inputs[0].default_value = (1.0, 0.965, 0.984, 1.0) # #FFF7FB
bg.inputs[1].default_value = 0.6

# Head
def create_head():
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.36, location=(0, 0, 1.6))
    head = bpy.context.active_object
    head.name = "Head"
    # Enter edit mode to modify
    bpy.context.view_layer.objects.active = head
    bpy.ops.object.mode_set(mode='EDIT')
    # Select all vertices
    bpy.ops.mesh.select_all(action='SELECT')
    # Scale to make it slightly narrower in x and wider in y? Actually, we want:
    # Scale: (1.0, 1.03, 0.93) as per spec
    bpy.ops.transform.resize(value=(1.0, 1.03, 0.93))
    # Now we want to narrow the chin (bottom) and soften jaw, round cheeks, flatten front.
    # We'll do this by selecting bottom vertices and scaling in X, and front vertices and scaling in Y.
    # But note: We are in edit mode.
    # Let's first go back to object mode to apply the scale, then we'll go back to edit for further modifications.
    bpy.ops.object.mode_set(mode='OBJECT')
    # Now we'll apply the scale and then go back to edit for further modifications.
    # Actually, we can stay in object mode and use shape keys for details? The spec mentions shape keys for face.
    # We'll create the base head with the scale, then add shape keys for expressions.
    # For now, we'll just create the base shape and then add shape keys later.
    # We'll return the head object and then later add shape keys.
    return head

head = create_head()
print("Head created. Please continue with the next part.")
