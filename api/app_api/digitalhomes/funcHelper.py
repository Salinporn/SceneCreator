from datetime import datetime
from django.db import connection
from app_api.products.objectModels import ContainerOwnedItem, NonContainerOwnedItem
from app_api.orders.funcHelper import create_spatial_instance, get_container_owned_item_id, get_noncontainer_owned_item_id
from zodb.zodb_management import *
from ZODB.blob import Blob
from app_api.digitalhomes.homeObject import Home3D
from app_api.digitalhomes.models import SRID_3D
from app_api.products.product_func import create_Texture, delete_texture, fetch_3d_model
import trimesh
import transaction
import json


def load_mesh(file):
    try:
        mesh = trimesh.load(file, file_type='glb')
    except Exception:
        import tempfile, os
        with tempfile.NamedTemporaryFile(delete=False, suffix='.glb') as temp_file:
            for chunk in file.chunks():
                temp_file.write(chunk)
            temp_file.flush()
            mesh = trimesh.load(temp_file.name, file_type='glb')
        os.unlink(temp_file.name)

    if mesh.is_empty:
        raise ValueError("Loaded mesh is empty or invalid")

    # Apply scene graph transforms
    if isinstance(mesh, trimesh.Scene):
        mesh = mesh.dump(concatenate=True)

    return mesh

def getBoundaryFromMesh(file):
    mesh = load_mesh(file)
    bounding = {}
    bounding['min_x'] = float(mesh.bounds[0][0])
    bounding['max_x'] = float(mesh.bounds[1][0])
    bounding['min_y'] = float(mesh.bounds[0][1])
    bounding['max_y'] = float(mesh.bounds[1][1])
    bounding['min_z'] = float(mesh.bounds[0][2])
    bounding['max_z'] = float(mesh.bounds[1][2])
    return bounding

def create_home_spatial_instance(file):
    boundary = getBoundaryFromMesh(file)
    boundary_json = json.dumps(boundary)

    with connection.cursor() as cursor:
        cursor.execute("""
            INSERT INTO digitalhomes_homespatialdata (positions, rotation, scale, boundary)
            VALUES (
                ST_GeomFromEWKT(%s),
                ST_GeomFromEWKT(%s),
                ST_GeomFromEWKT(%s),
                %s::jsonb
            )
            RETURNING id
        """, [
            f'SRID={SRID_3D};POINT ZM(0 0 0 0)',
            f'SRID={SRID_3D};POINT Z(0 0 0)',
            f'SRID={SRID_3D};POINT Z(1 1 1)',
            boundary_json
        ])
        spatial_id = cursor.fetchone()[0]
    return spatial_id

def get_home_object_id(root):
    if not root.digitalHomes:
        return 1
    existing_ids = [
        int(key)
        for key in root.digitalHomes.keys()
    ]
    return max(existing_ids) + 1

def get_model_id(root):
    if not root.homeObjectModels:
        return 1
    existing_ids = [
        int(key)
        for key in root.homeObjectModels.keys()
    ]
    return max(existing_ids) + 1

def create_home_model(root, model_file, texture_files=None):
    try:
        model_id = get_model_id(root)
        filename = getattr(model_file, 'name', f'model_{model_id}.glb')
        
        file_content = model_file.read()
        blob = Blob()
        with blob.open('w') as f:
            if isinstance(file_content, (bytes, bytearray)):
                f.write(file_content)
            else:
                f.write(file_content.encode('latin-1'))

        texture_ids = []
        texture_id = None
        if texture_files:
            for tex in texture_files:
                if texture_id is None:
                    texture_id = create_Texture(tex, root)
                else:
                    texture_id = create_Texture(tex, root, texture_id)
                texture_ids.append(texture_id)
        
        root.homeObjectModels[model_id] = Home3D(
            id=model_id,
            file=blob,
            filename=filename,
            textures=texture_ids
        )
        transaction.commit()
        return model_id
    except Exception:
        try:
            transaction.abort()
        except Exception:
            pass
        raise
    
def fetch_home_model(home_id: int):
    _, root = get_connection()
    home_models = root.homeObjectModels
    if not home_models:
        return None
    if not home_models[home_id]:
        return None
    return home_models[home_id]
        
def delete_home_3d_assets(root, home_id):
    try:
        home_models = root.homeObjectModels
        if not home_models or not home_models[home_id]:
            return None

        model = home_models[home_id]

        for texture_id in model.get_textures():
            delete_texture(texture_id, root)

        del home_models[home_id]

    except Exception:
        try:
            transaction.abort()
        except Exception:
            pass
        raise
    
def update_Texture(root, home_id, texture_files=None):
    try:
        home_models = root.homeObjectModels
        if not home_models or not home_models[int(home_id)]:
            raise ValueError("3D Model not found")

        model = home_models[int(home_id)]

        for tex_id in model.get_textures():
            delete_texture(tex_id, root)
        
        model.textures = []
        for tex in texture_files:
            new_tex_id = create_Texture(tex, root)
            model.textures.append(new_tex_id)

        transaction.commit()
    except Exception:
        try:
            transaction.abort()
        except Exception:
            pass
        raise

def get_position(id):
    with connection.cursor() as cursor:
        cursor.execute("SELECT ST_AsEWKT(positions) FROM digitalhomes_homespatialdata WHERE id=%s", [id])
        ewkt = cursor.fetchone()[0]  # ewkt = 'SRID=4326;POINT ZM(x y z m)'

    coords = [float(c) for c in ewkt.split('(')[1].rstrip(')').split()] 
    return coords

def get_item_position(id):
    with connection.cursor() as cursor:
        cursor.execute("SELECT ST_AsEWKT(positions) FROM products_spatialdata WHERE id=%s", [id])
        ewkt = cursor.fetchone()[0]  # ewkt = 'SRID=4326;POINT ZM(x y z m)'

    coords = [float(c) for c in ewkt.split('(')[1].rstrip(')').split()] 
    return coords

def parse_coordinates(coor):
    coor = coor.wkt
    coords = [float(c) for c in coor.split('(')[1].rstrip(')').split()]
    return coords

def update_deployed_item(root, item_id, id, item_data):
    key_item = f'item_{int(item_id)}_home_{int(id)}'
    if key_item in root.containerOwnedItems or key_item in root.nonContainerOwnedItems:
        if item_data.get('is_container'):
            item = root.containerOwnedItems[key_item]
            item.set_contained_item(item_data.get('contain', []))
        else:
            item = root.nonContainerOwnedItems[key_item]
            item.set_composition(item_data.get('composite', []))
        spatial_id = item.get_spatial_id()
    else:
        current_date = datetime.now()
        if item_data.get('is_container'):
            containerId = get_container_owned_item_id(root)
            copy_item = root.containerOwnedItems.get(str(item_id))
            root.containerOwnedItems[key_item] = ContainerOwnedItem(
                id=containerId,
                owner_id=copy_item.get_owner_id(),
                name=copy_item.get_name(),
                description=copy_item.get_description(),
                model_id=copy_item.get_model_id(),
                image=copy_item.get_image(),
                category=copy_item.get_category(),
                type=copy_item.get_type(),
                is_container=True,
                spatial_id=None,
                texture_id=copy_item.get_texture_id(),
                contained_item=item_data.get('contain', []),
                created_at=current_date
            )
            item = root.containerOwnedItems[key_item]
            item.set_contained_item(item_data.get('contain', []))
        else:
            copy_item = root.nonContainerOwnedItems.get(str(item_id))
            nonContainerId = get_noncontainer_owned_item_id(root)
            root.nonContainerOwnedItems[key_item] = NonContainerOwnedItem(
                id=nonContainerId,
                owner_id=copy_item.get_owner_id(),
                name=copy_item.get_name(),
                description=copy_item.get_description(),
                model_id=copy_item.get_model_id(),
                image=copy_item.get_image(),
                category=copy_item.get_category(),
                type=copy_item.get_type(),
                is_container=False,
                spatial_id=None,
                texture_id=copy_item.get_texture_id(),
                composition=item_data.get('composite', []),
                created_at=current_date
            )
            item = root.nonContainerOwnedItems[key_item]
            item.set_composition(item_data.get('composite', []))
        
        spatial_id = create_spatial_instance()
        item.set_spatial_id(spatial_id)

    with connection.cursor() as cursor:
        old_coords = get_item_position(spatial_id)
        cursor.execute("""
            UPDATE products_spatialdata
            SET 
                positions = ST_GeomFromEWKT(%s),
                rotation = ST_GeomFromEWKT(%s),
                scale = ST_GeomFromEWKT(%s),
                position_history = position_history || %s::jsonb
            WHERE id = %s
        """, [
            f'SRID={SRID_3D};POINT ZM({item_data["position"][0]} {item_data["position"][1]} {item_data["position"][2]} {item_data["position"][3]})',
            f'SRID={SRID_3D};POINT Z({item_data["rotation"][0]} {item_data["rotation"][1]} {item_data["rotation"][2]})',
            f'SRID={SRID_3D};POINT Z({item_data["scale"][0]} {item_data["scale"][1]} {item_data["scale"][2]})',
            json.dumps([old_coords]),  # append old position to history
            spatial_id
        ])
    
    if item_data.get('texture_id') is not None:
        model = fetch_3d_model(item.get_model_id())
        if item_data.get('texture_id') not in model.get_textures():
            raise ValueError("Texture does not belong to the item's 3D model")
        item.set_texture_id(item_data.get('texture_id'))
    