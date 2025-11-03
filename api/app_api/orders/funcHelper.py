from app_api.products.models import SRID_3D
from django.db import connection
from zodb.zodb_management import *

def get_container_owned_item_id(root):
    if not root.containerOwnedItems:
        return 1
    existing_ids = [
        int(key)
        for key in root.containerOwnedItems.keys() if key.isdigit()
    ]
    return max(existing_ids) + 1

def get_noncontainer_owned_item_id(root):
    if not root.nonContainerOwnedItems:
        return 1
    existing_ids = [
        int(key)
        for key in root.nonContainerOwnedItems.keys() if key.isdigit()
    ]
    return max(existing_ids) + 1

def create_spatial_instance():
    with connection.cursor() as cursor:
        cursor.execute("""
            INSERT INTO products_spatialdata (positions, rotation, scale, position_history)
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
            '[]'
        ])
        spatial_id = cursor.fetchone()[0]
    return spatial_id