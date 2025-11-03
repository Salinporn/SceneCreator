import persistent

class Model3D(persistent.Persistent):
    def __init__(self, model_id, file, filename, textures=None):
        self.model_id = model_id
        self.file = file
        self.filename = filename
        self.textures = textures if textures else []
        
    def get_model_id(self):
        return self.model_id

    def get_filename(self):
        return self.filename

    def get_file(self):
        return self.file
    
    def get_textures(self):
        return self.textures

class Texture(persistent.Persistent):
    def __init__(self, texture_id, filename, file):
        self.texture_id = texture_id
        self.filename = filename
        self.file = file
        
    def get_filename(self):
        return self.filename
        
    def get_texture_id(self):
        return self.texture_id
    
    def get_file(self):
        return self.file
    
class DisplayScene(persistent.Persistent):
    def __init__(self, scene_id, file, filename):
        self.scene_id = scene_id
        self.file = file
        self.filename = filename
        
    def get_scene_id(self):
        return self.scene_id
    
    def get_file(self):
        return self.file
    
    def get_filename(self):
        return self.filename
    
class Item(persistent.Persistent):
    def __init__(self, id, name, description, image, model_id, category, type, is_container, created_at):
        self.id = id
        self.name = name
        self.description = description
        self.model_id = model_id
        self.image = image
        self.category = category
        self.type = type
        self.is_container = is_container
        self.created_at = created_at
        self.updated_at = created_at
    
    def get_id(self):
        return self.id
        
    def get_name(self):
        return self.name
    
    def get_description(self):
        return self.description
    
    def get_image(self):
        return self.image
    
    def get_model_id(self):
        return self.model_id
    
    def get_category(self):
        return self.category
    
    def get_type(self):
        return self.type
    
    def get_is_container(self):
        return self.is_container
    
    def get_created_at(self):
        return self.created_at
    
    def get_updated_at(self):
        return self.updated_at
    
class Product(persistent.Persistent):
    def __init__(self, id, item, digital_price, physical_price, stock, digital_available, physical_available, display_scenes):
        self.id = id
        self.item = item
        self.digital_price = digital_price
        self.physical_price = physical_price
        self.stock = stock
        self.reviews = []
        self.rating = 0.0
        self.digital_available = digital_available
        self.physical_available = physical_available
        self.display_scenes = display_scenes
    
    def get_id(self):
        return self.id
        
    def get_item(self):
        return self.item
    
    def get_digital_price(self):
        return self.digital_price
    
    def get_physical_price(self):
        return self.physical_price
    
    def get_stock(self):
        return self.stock
    
    def get_reviews(self):
        return self.reviews
    
    def get_rating(self):
        return self.rating
    
    def is_digital_available(self):
        return self.digital_available
    
    def is_physical_available(self):
        return self.physical_available
    
    def get_display_scenes(self):
        return self.display_scenes
    
    def set_display_scenes(self, display_scenes):
        self.display_scenes = display_scenes
        
    def add_review(self, review_id):
        self.reviews.append(review_id)

    def remove_review(self, review_id):
        self.reviews.remove(review_id)

    def set_rating(self, rating):
        self.rating = rating
    
class OwnedItem(Item):
    def __init__(self, id, owner_id, name, description, model_id, image, category, type, is_container, spatial_id, texture_id, created_at):
        super().__init__(id=id, name=name, description=description, model_id=model_id, image=image, category=category, type=type, is_container=is_container, created_at=created_at)
        self.spatial_id = spatial_id
        self.texture_id = texture_id
        self.owner_id = owner_id
        
    def get_owner_id(self):
        return self.owner_id
       
    def get_spatial_id(self):
        return self.spatial_id
     
    def get_texture_id(self):
        return self.texture_id
    
    def set_texture_id(self, texture_id):
        self.texture_id = texture_id
        
    def set_spatial_id(self, spatial_id):
        self.spatial_id = spatial_id    
class ContainerOwnedItem(OwnedItem):
    def __init__(self, id, owner_id, name, description, model_id, image, category, type, is_container, spatial_id, texture_id, contained_item, created_at):
        super().__init__(id=id, owner_id=owner_id, name=name, description=description, model_id=model_id, image=image, category=category, type=type, is_container=is_container, spatial_id=spatial_id, texture_id=texture_id, created_at=created_at)
        self.contained_item = contained_item

    def get_contained_item(self):
        return self.contained_item
    
    def set_contained_item(self, contained_item):
        self.contained_item = contained_item

class NonContainerOwnedItem(OwnedItem):
    def __init__(self, id, owner_id, name, description, model_id, image, category, type, is_container, spatial_id, texture_id, composition, created_at):
        super().__init__(id=id, owner_id=owner_id, name=name, description=description, model_id=model_id, image=image, category=category, type=type, is_container=is_container, spatial_id=spatial_id, texture_id=texture_id, created_at=created_at)
        self.composition = composition
    
    def get_composition(self):
        return self.composition
    
    def set_composition(self, composition):
        self.composition = composition