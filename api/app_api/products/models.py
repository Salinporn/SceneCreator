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

class SpatialData(models.Model):
    positions = PointZMField()
    rotation = gis_models.PointField(dim=3, srid=SRID_3D)
    scale = gis_models.PointField(dim=3, srid=SRID_3D)
    position_history = models.JSONField(default=list)