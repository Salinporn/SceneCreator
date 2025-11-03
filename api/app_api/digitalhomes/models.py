from django.db import models
from django.contrib.gis.db import models as gis_models

SRID_3D = 4979

class PointZMField(gis_models.GeometryField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault('srid', SRID_3D)
        kwargs.setdefault('dim', 4)
        super().__init__(*args, **kwargs)
    
    @property
    def geom_type(self):
        return 'POINTZM'

class HomeSpatialData(models.Model):
    positions = PointZMField()
    rotation = gis_models.PointField(dim=3, srid=SRID_3D)
    scale = gis_models.PointField(dim=3, srid=SRID_3D)
    boundary = models.JSONField(default=dict)  # e.g., {"min_x": 0, "max_x": 10, "min_y": 0, "max_y": 10, "min_z": 0, "max_z": 10}

    def __str__(self):
        return str(self.boundary)