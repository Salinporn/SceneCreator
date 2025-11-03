import persistent

class HomeObject(persistent.Persistent):
    def __init__(self, id, name, home_id, deployedItems, spatialData_id, created_at):
        self.id = id
        self.name = name
        self.home_id = home_id
        self.deployedItems = deployedItems
        self.spatialData_id = spatialData_id
        self.texture_id = None
        self.created_at = created_at
        self.updated_at = created_at
        
    def get_id(self):
        return self.id

    def get_name(self):
        return self.name

    def get_home_id(self):
        return self.home_id

    def get_texture_files(self):
        return self.texture_files
    
    def get_deployedItems(self):
        return self.deployedItems
    
    def set_deployedItems(self, deployedItems):
        self.deployedItems = deployedItems
    
    def get_spatialData_id(self):
        return self.spatialData_id

    def get_texture_id(self):
        return self.texture_id
    
    def set_texture_id(self, texture_id):
        self.texture_id = texture_id
        
    def get_created_at(self):
        return self.created_at
    
    def get_updated_at(self):
        return self.updated_at
    
class Home3D(persistent.Persistent):
    def __init__(self, id, file, filename, textures=None):
        self.id = id
        self.file = file
        self.filename = filename
        self.textures = textures if textures else []

    def get_home_id(self):
        return self.home_id

    def get_filename(self):
        return self.filename

    def get_file(self):
        return self.file
    
    def get_textures(self):
        return self.textures