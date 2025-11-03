from datetime import datetime
from .objectModels import *
from zodb.zodb_management import *
import transaction
from ZODB.blob import Blob
import base64

def get_item_id(root):
    if not root.objectItems:
        return 1
    existing_ids = [
        int(key)
        for key in root.objectItems.keys()
    ]
    return max(existing_ids) + 1

def get_product_id(root):
    if not root.products:
        return 1
    existing_ids = [
        int(key)
        for key in root.products.keys()
    ]
    return max(existing_ids) + 1

def create_product(name, description, digital_price, physical_price, category, image, product_type, stock, model_files, scene_files, digital_available, physical_available, is_container, texture_files=None):
    connection, root = get_connection()
    try:
        if digital_available and digital_price is None:
            raise ValueError("Digital price must be provided if digital version is available")
        if physical_available and physical_price is None:
            raise ValueError("Physical price must be provided if physical version is available")
        image_base64 = base64.b64encode(image.read()).decode('utf-8')
        display_scenes = []
        model_id = None
        if digital_available:
            model_id = create_3d_model(root, model_files, texture_files)
            for scene_file in scene_files:
                scene_id = create_display_scene(root, scene_file)
                display_scenes.append(scene_id)
            
        item_id = get_item_id(root)
        current_datetime = datetime.now()
        item = Item(
            id=item_id,
            name=name,
            description=description,
            model_id=model_id,
            image=image_base64,
            category=category,
            type=product_type,
            is_container=is_container,
            created_at=current_datetime,
        )
        root.objectItems[item_id] = item

        product_id = get_product_id(root)
        product = Product(
            id=product_id,
            item=item,
            digital_price=digital_price,
            physical_price=physical_price,
            stock=stock,
            digital_available=digital_available,
            physical_available=physical_available,
            display_scenes=display_scenes
        )
        root.products[product_id] = product
        transaction.commit()
        return product_id
    except Exception:
        try:
            transaction.abort()
        except Exception:
            pass
    finally:
        connection.close()

def update_existing_product(product_id, name, description, digital_price, physical_price, category, image, product_type, stock, model_files, scene_files, digital_available, physical_available, is_container, texture_files):
    connection, root = get_connection()
    try:
        product_id = int(product_id)
        product = root.products[product_id]

        if not product:
            raise ValueError("Product not found")
        
        item = product.item
        if name:
            item.name = name
        if description:
            item.description = description
        if digital_price is not None:
            product.digital_price = digital_price
        if physical_price is not None:
            product.physical_price = physical_price
        if category:
            item.category = category
        if image:
            image_base64 = base64.b64encode(image.read()).decode('utf-8')
            item.image = image_base64
        if product_type:
            item.type = product_type
        if stock is not None and stock >= 0:
            product.stock = stock
        if digital_available is not None:
            product.digital_available = digital_available
            if model_files:
                model_id = item.get_model_id()
                if model_id is None:
                    model_id = create_3d_model(root, model_files, texture_files)
                    item.model_id = model_id
                else:
                    update_3d_model(root, model_id, model_files, texture_files)
            if scene_files:
                if len(product.get_display_scenes()) == 0:
                    display_scene_ids = []
                    for scene_file in scene_files:
                        scene_id = create_display_scene(root, scene_file)
                        display_scene_ids.append(scene_id)
                    product.set_display_scenes(display_scene_ids)
                else:
                    display_scene_ids = product.get_display_scenes()
                    new_display_scene_ids = update_display_scene(root, display_scene_ids, scene_files)
                    product.set_display_scenes(new_display_scene_ids)
        if physical_available is not None:
            product.physical_available = physical_available
        if is_container is not None:
            item.is_container = is_container


        current_datetime = datetime.now()
        item.updated_at = current_datetime
        transaction.commit()
    except Exception:
        try:
            transaction.abort()
        except Exception:
            pass
    finally:
        connection.close()

def delete_existing_product(product_id):
    connection, root = get_connection()
    try:
        product = root.products[product_id]
        item = product.item
        model_id = item.model_id

        if model_id is not None:
            delete_product_3d_assets(root, model_id, product.display_scenes)
        
        del root.products[product_id]
        del root.objectItems[item.id]
        transaction.commit()
        return True
    except Product.DoesNotExist:
        return False
    except Exception:
        try:
            transaction.abort()
        except Exception:
            pass
    finally:
        connection.close()
    
def direct_create_Texture(texture_file):
    connection, root = get_connection()
    try:
        texture_id = len(root.textures) + 1
        filename = getattr(texture_file, 'name', f'texture_{texture_id}.png')
        file_base64 = base64.b64encode(texture_file.read()).decode('utf-8')

        root.textures[f'texture_{texture_id}'] = Texture(
            texture_id=texture_id,
            filename=filename,
            file=file_base64
        )
        transaction.commit()
        return texture_id
    except Exception:
        try:
            transaction.abort()
        except Exception:
            pass
        raise
    finally:
        connection.close()

def get_next_texture_id(root):
    if not root.textures:
        return 1
    existing_ids = [
        int(key.split('_')[-1]) 
        for key in root.textures.keys()
        if key.startswith('texture_')
    ]
    return max(existing_ids) + 1

def create_Texture(texture_file, root, texture_id=None):
    if texture_id is None:
        texture_id = get_next_texture_id(root)
    else:
        texture_id += 1

    filename = getattr(texture_file, 'name', f'texture_{texture_id}.png')
    file_base64 = base64.b64encode(texture_file.read()).decode('utf-8')

    root.textures[f'texture_{texture_id}'] = Texture(
        texture_id=texture_id,
        filename=filename,
        file=file_base64
    )

    return texture_id

def delete_texture(texture_id, root):
    textures = root.textures
    if not textures or f'texture_{texture_id}' not in textures:
        raise ValueError("Texture not found")
    
    del textures[f'texture_{texture_id}']
    
def get_model_id(root):
    if not root.objectModels:
        return 1
    existing_ids = [
        int(key.split('_')[-1]) 
        for key in root.objectModels.keys()
        if key.startswith('model_')
    ]
    return max(existing_ids) + 1

def create_3d_model(root, model_file, texture_files=None):
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

        root.objectModels[f'model_{model_id}'] = Model3D(
            model_id=model_id,
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

def update_3d_model(root, model_id, model_file=None, texture_files=None):
    try:
        object_models = root.objectModels
        if not object_models or f'model_{model_id}' not in object_models:
            raise ValueError("3D Model not found")

        model = object_models[f'model_{model_id}']

        if model_file:
            filename = getattr(model_file, 'name', f'model_{model_id}.glb')
            file_content = model_file.read()
            blob = Blob()
            with blob.open('w') as f:
                if isinstance(file_content, (bytes, bytearray)):
                    f.write(file_content)
                else:
                    f.write(file_content.encode('latin-1'))
            model.file = blob
            model.filename = filename

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
        
def get_next_display_scene_id(root):
    if not root.displayScenes:
        return 1
    existing_ids = [
        int(key.split('_')[-1]) 
        for key in root.displayScenes.keys()
        if key.startswith('display_scene_')
    ]
    return max(existing_ids) + 1

def create_display_scene(root, model_file):
    try:
        display_scene_id = get_next_display_scene_id(root)
        filename = getattr(model_file, 'name', f'model_{display_scene_id}.glb')
        
        file_content = model_file.read()
        blob = Blob()
        with blob.open('w') as f:
            if isinstance(file_content, (bytes, bytearray)):
                f.write(file_content)
            else:
                f.write(file_content.encode('latin-1'))

        root.displayScenes[f'display_scene_{display_scene_id}'] = DisplayScene(
            scene_id=display_scene_id,
            file=blob,
            filename=filename
        )
        transaction.commit()
        return display_scene_id
    except Exception:
        try:
            transaction.abort()
        except Exception:
            pass
        raise
        
def delete_display_scene(display_scene_id, root):
    display_scenes = root.displayScenes
    if not display_scenes or f'display_scene_{display_scene_id}' not in display_scenes:
        raise ValueError("Display Scene not found")
    
    del display_scenes[f'display_scene_{display_scene_id}']
        
def update_display_scene(root, display_scene_ids, model_files):
    try:
        display_scenes = root.displayScenes
        if not display_scenes:
            raise ValueError("No Display Scenes found")
        
        for ds_id in display_scene_ids:
            if f'display_scene_{ds_id}' not in display_scenes:
                raise ValueError(f"Display Scene {ds_id} not found")
            delete_display_scene(ds_id, root)

        new_display_scene_ids = []
        for model_file in model_files:
            display_scene_id = get_next_display_scene_id(root)
            filename = getattr(model_file, 'name', f'model_{display_scene_id}.glb')
            
            file_content = model_file.read()
            blob = Blob()
            with blob.open('w') as f:
                if isinstance(file_content, (bytes, bytearray)):
                    f.write(file_content)
                else:
                    f.write(file_content.encode('latin-1'))

            root.displayScenes[f'display_scene_{display_scene_id}'] = DisplayScene(
                scene_id=display_scene_id,
                file=blob,
                filename=filename
            )
            new_display_scene_ids.append(display_scene_id)
        
        transaction.commit()
        return new_display_scene_ids
    except Exception:
        try:
            transaction.abort()
        except Exception:
            pass
        raise
        
def delete_product_3d_assets(root, model_id, display_scene_ids):
    try:
        object_models = root.objectModels
        if not object_models or f'model_{model_id}' not in object_models:
            return 

        model = object_models[f'model_{model_id}']
        
        for texture_id in model.get_textures():
            delete_texture(texture_id, root)
        
        del object_models[f'model_{model_id}']
        
        display_scenes = root.displayScenes
        if display_scenes:
            for ds_id in display_scene_ids:
                if f'display_scene_{ds_id}' in display_scenes:
                    delete_display_scene(ds_id, root)
        
        transaction.commit()
    except Exception:
        try:
            transaction.abort()
        except Exception:
            pass
        raise

def fetch_3d_model(model_id: int):
    _, root = get_connection()
    object_models = root.objectModels
    if not object_models:
        return None
    return object_models[f"model_{model_id}"]


def fetch_display_scene(display_scene_id: int):
    _, root = get_connection()
    display_scenes = root.displayScenes
    if not display_scenes:
        return None
    return display_scenes[f"display_scene_{display_scene_id}"]

def fetch_texture(texture_id: int):
    connection, root = get_connection()
    try:
        textures = root.textures
        if not textures:
            return None
        return textures[f"texture_{texture_id}"].get_file()
    except Exception as e:
        try:
            transaction.abort()
        except Exception:
            pass
    finally:
        connection.close()