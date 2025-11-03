from django.http import FileResponse, JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from app_api.products.objectModels import ContainerOwnedItem, NonContainerOwnedItem
from app_api.products.models import SpatialData
from zodb.zodb_management import *
from app_api.digitalhomes.homeObject import HomeObject
from app_api.digitalhomes.models import HomeSpatialData
from app_api.digitalhomes.funcHelper import *
from app_api.products.product_func import fetch_texture, create_3d_model
from app_api.orders.funcHelper import create_spatial_instance, get_container_owned_item_id, get_noncontainer_owned_item_id
from datetime import datetime
import transaction
import json
import base64

@login_required
@require_http_methods(["GET"])
def list_available_items(request):
    connection, root = get_connection()
    try:
        customer = request.user.customer
        available_items = []
        for entry in customer.owned_digital_products:
            item_id = entry.get('id')
            is_container = entry.get('is_container', False)
            if not item_id:
                continue
            try:
                if is_container:
                    item = root.containerOwnedItems[str(item_id)]
                else:
                    item = root.nonContainerOwnedItems[str(item_id)]
                available_items.append({
                    'id': item.get_id(),
                    'name': item.get_name(),
                    'description': item.get_description(),
                    'model_id': item.get_model_id(),
                    'image': item.get_image(),
                    'category': item.get_category(),
                    'type': item.get_type(),
                    'is_container': is_container,
                    'created_at': item.created_at.isoformat(),
                    
                })
            except (KeyError, TypeError):
                continue
        return JsonResponse({'available_items': available_items}, status=200)
    except Exception as e:
        try:
            transaction.abort()
        except Exception:
            pass
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        connection.close()

@csrf_exempt
@login_required
@require_http_methods(["POST"])
def get_specific_item(request):
    connection, root = get_connection()
    try:
        customer = request.user.customer
        
        # Retrieve values from query parameters
        item_id = request.POST.get('item_id')
        is_container = request.POST.get('is_container', 'false').lower() == 'true'

        if not item_id:
            return JsonResponse({'error': 'item_id is required'}, status=400)

        if int(item_id) not in [item.get('id') for item in customer.owned_digital_products]:
            return JsonResponse({'error': 'You do not own this item'}, status=403)
        
        try:
            if is_container:
                item = root.containerOwnedItems[str(item_id)]
            else:
                item = root.nonContainerOwnedItems[str(item_id)]
        except (KeyError, TypeError):
            return JsonResponse({'error': 'Item not found'}, status=404)
        
        item_data = {
            'id': item.get_id(),
            'name': item.get_name(),
            'description': item.get_description(),
            'model_id': item.get_model_id(),
            'category': item.get_category(),
            'type': item.get_type(),
            'is_container': is_container,
            'created_at': item.created_at.isoformat(),
            'image': item.get_image(),
        }
        return JsonResponse({'item': item_data}, status=200)
    except Exception as e:
        try:
            transaction.abort()
        except Exception:
            pass
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        connection.close()
        
@csrf_exempt
@login_required
@require_http_methods(["POST"])
def add_digital_home(request):
    connection, root = get_connection()
    try:
        customer = request.user.customer

        if not customer:
            return JsonResponse({'error': 'Only customers can manage digital homes'}, status=403)

        name = request.POST.get('name')
        model_files = request.FILES.get('model_file')
        texture_files = request.FILES.getlist('texture_files')

        if not name or not model_files:
            return JsonResponse({'error': 'Name and model_file are required'}, status=400)
        
        home_id = get_home_object_id(root)
        model_id = create_home_model(root, model_files, texture_files)
        spatialData_id = create_home_spatial_instance(model_files)
        deployedItems = []
        created_at = datetime.now()
        root.digitalHomes[home_id] = HomeObject(
            id=home_id,
            name=name,
            home_id=model_id,
            deployedItems=deployedItems,
            spatialData_id=spatialData_id,
            created_at=created_at
        )
        customer.digital_home.append(home_id)
        customer.save()
        transaction.commit()
        return JsonResponse({'message': 'Digital home added successfully'}, status=201)
    except Exception as e:
        try:
            transaction.abort()
        except Exception:
            pass
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        connection.close()
        
@login_required
@require_http_methods(["GET"])
def get_digital_homes(request):
    connection, root = get_connection()
    try:
        with transaction.manager:
            customer = request.user.customer

            if not customer:
                return JsonResponse({'error': 'Only customers can view digital homes'}, status=403)

            digital_homes = []
            for home_id in customer.digital_home:
                try:
                    home = root.digitalHomes[home_id]
                    spatial_id = home.get_spatialData_id()
                    spatial_data = HomeSpatialData.objects.get(id=spatial_id)
                    position = get_position(spatial_id)
                    rotation = parse_coordinates(spatial_data.rotation)
                    scale = parse_coordinates(spatial_data.scale)
                    digital_homes.append({
                        'id': home.get_id(),
                        'name': home.get_name(),
                        'home_id': home.get_home_id(),
                        'deployedItems': home.get_deployedItems(),
                        'spatialData': {
                            'id': spatial_data.id,
                            'positions': position,
                            'rotation': rotation,
                            'scale': scale,
                            'boundary': spatial_data.boundary,
                        },
                        'texture_id': home.get_texture_id(),
                        'created_at': home.get_created_at().isoformat(),
                        'updated_at': home.get_updated_at().isoformat(),
                    })
                except (KeyError, TypeError):
                    continue
            return JsonResponse({'digital_homes': digital_homes}, status=200)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        connection.close()
@login_required
@require_http_methods(["GET"])
def get_digital_home(request, id):
    connection, root = get_connection()
    try:
        customer = request.user.customer

        if not customer:
            return JsonResponse({'error': 'Only customers can view digital homes'}, status=403)

        if int(id) not in customer.digital_home:
            return JsonResponse({'error': 'You do not own this digital home'}, status=403)

        try:
            home = root.digitalHomes[int(id)]
            spatial_data = HomeSpatialData.objects.get(id=home.spatialData_id)
            position = get_position(home.spatialData_id)
            rotation = parse_coordinates(spatial_data.rotation)
            scale = parse_coordinates(spatial_data.scale)
            home_data = {
                'id': home.get_id(),
                'name': home.get_name(),
                'home_id': home.get_home_id(),
                'deployedItems': home.get_deployedItems(),
                'spatialData': {
                    'id': spatial_data.id,
                    'positions': position,
                    'rotation': rotation,
                    'scale': scale,
                    'boundary': spatial_data.boundary,
                },
                'texture_id': home.get_texture_id(),
                'created_at': home.get_created_at().isoformat(),
                'updated_at': home.get_updated_at().isoformat(),
            }
            return JsonResponse({'digital_home': home_data}, status=200)
        except (KeyError, TypeError):
            return JsonResponse({'error': 'Digital home not found'}, status=404)
    except Exception as e:
        try:
            transaction.abort()
        except Exception:
            pass
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        connection.close()
        
@require_http_methods(["GET"])
@login_required
def get_home_model(request, home_id):
    try:
        model = fetch_home_model(home_id)
        if not model:
            return JsonResponse({'error': 'Model not found'}, status=404)

        blob = model.get_file()
        if blob is None:
            return JsonResponse({'error': 'Model file not found'}, status=404)

        response = FileResponse(blob.open('r'), as_attachment=True, filename=model.get_filename())
        return response
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    
@require_http_methods(["GET"])
@login_required
def get_textures(request, home_id):
    try:
        model = fetch_home_model(home_id)
        if not model:
            return JsonResponse({'error': 'Model not found'}, status=404)

        texture_files = []
        for tex_id in model.get_textures():
            texture = fetch_texture(tex_id)
            texture_files.append({'texture_id': tex_id, 'file': texture})

        return JsonResponse({'textures': texture_files}, status=200)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    
@csrf_exempt
@login_required
@require_http_methods(["DELETE"])
def delete_digital_home(request, id):
    connection, root = get_connection()
    try:
        customer = request.user.customer

        if not customer:
            return JsonResponse({'error': 'Only customers can manage digital homes'}, status=403)

        if int(id) not in customer.digital_home:
            return JsonResponse({'error': 'You do not own this digital home'}, status=403)

        try:
            digital_home = root.digitalHomes[int(id)]
            home_id = digital_home.get_id()
            if home_id is not None:
                delete_home_3d_assets(root, home_id)
            
            del root.digitalHomes[int(id)]
            customer.digital_home.remove(int(id))
            customer.save()
            transaction.commit()
            return JsonResponse({'message': 'Digital home deleted successfully'}, status=200)
        except (KeyError, TypeError):
            return JsonResponse({'error': 'Digital home not found'}, status=404)
    except Exception as e:
        try:
            transaction.abort()
        except Exception:
            pass
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        connection.close()
        
@csrf_exempt
@login_required
@require_http_methods(["POST"])
def update_texture(request):
    connection, root = get_connection()
    try:
        home_id = request.POST.get('home_id')
        texture_files = request.FILES.getlist('texture_files')

        if not home_id:
            return JsonResponse({'error': 'home_id is required'}, status=400)
        
        if not texture_files:
            return JsonResponse({'error': 'No texture file provided'}, status=400)
        update_Texture(root, home_id, texture_files)
        return JsonResponse({'message': 'Home texture updated successfully'}, status=200)
    except Exception as e:
        try:
            transaction.abort()
        except Exception:
            pass
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        connection.close()
        
@csrf_exempt
@login_required
@require_http_methods(["POST"])
def add_custom_item(request):
    connection, root = get_connection()
    try:
        
        customer = request.user.customer
        if not customer:
            return JsonResponse({'error': 'Only customers can add custom items'}, status=403)
        
        name = request.POST.get('name')
        description = request.POST.get('description')
        category = request.POST.get('category')
        type = request.POST.get('type')
        is_container = request.POST.get('is_container', 'false').lower() == 'true'
        model_files = request.FILES.get('model_file')
        texture_files = request.FILES.getlist('texture_files')
        image = request.FILES.get('image')
        
        image_base64 = None
        if image:
            image_base64 = base64.b64encode(image.read()).decode('utf-8')
        
        if not name or not model_files:
            return JsonResponse({'error': 'Name and model_file are required'}, status=400)
        
        spatial_id = create_spatial_instance()
        current_time = datetime.now()
        model_id = create_3d_model(root, model_files, texture_files)
        if is_container:
            container_id = get_container_owned_item_id(root)
            categorizedItem = ContainerOwnedItem(
                id=container_id,
                owner_id=customer.id,
                name=name,
                description=description,
                model_id=model_id,
                image=image_base64,
                category=category,
                type=type,
                is_container=is_container,
                spatial_id=spatial_id,
                texture_id=None,
                contained_item=[],
                created_at=current_time
            )
            root.containerOwnedItems[str(container_id)] = categorizedItem
        else:
            noncontainer_id = get_noncontainer_owned_item_id(root)
            categorizedItem = NonContainerOwnedItem(
                id=noncontainer_id,
                owner_id=customer.id,
                name=name,
                description=description,
                model_id=model_id,
                image=image_base64,
                category=category,
                type=type,
                is_container=is_container,
                spatial_id=spatial_id,
                texture_id=None,
                composition=[],
                created_at=current_time
            )
            root.nonContainerOwnedItems[str(noncontainer_id)] = categorizedItem
        transaction.commit()
        customer.owned_digital_products.append({ 'id': categorizedItem.get_id(), 'is_container': categorizedItem.is_container})
        customer.save()
        return JsonResponse({'message': 'Custom item added successfully'}, status=201)
    except Exception as e:
        try:
            transaction.abort()
        except Exception:
            pass
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        connection.close()
        
@csrf_exempt
@login_required
@require_http_methods(["POST"])
def update_home_design(request):
    connection, root = get_connection()
    try:
        home_id = request.POST.get('id')
        deployed_items_raw = request.POST.get('deployedItems')

        if not home_id:
            return JsonResponse({'error': 'id is required'}, status=400)
        if not deployed_items_raw:
            return JsonResponse({'error': 'deployedItems is required'}, status=400)

        try:
            deployed_items = json.loads(deployed_items_raw)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON format for deployedItems'}, status=400)

        home = root.digitalHomes[int(home_id)]
    
        updated_item_ids = []
        for item_id, item_data in deployed_items.items():
            update_deployed_item(root, item_id, home.id, item_data)
            updated_item_ids.append({"id": item_id, "is_container": item_data.get('is_container', False)})

        home.set_deployedItems(updated_item_ids)
        transaction.commit()

        return JsonResponse({'message': 'Home design updated successfully'}, status=200)
    except Exception as e:
        try:
            transaction.abort()
        except Exception:
            pass
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        connection.close()

@csrf_exempt
@login_required
@require_http_methods(["GET"])
def get_deployed_item_details(request, id):
    connection, root = get_connection()
    try:
        home = root.digitalHomes[int(id)]
        deployed_items_details = []
        for itemIdentifier in home.get_deployedItems():
            item_id = int(itemIdentifier.get('id'))
            is_container = itemIdentifier.get('is_container', False)
            key = f'item_{int(item_id)}_home_{int(id)}'
            if is_container:
                item = root.containerOwnedItems[key]
            else:
                item = root.nonContainerOwnedItems[key]
            spatial_id = item.get_spatial_id()
            spatial_data = SpatialData.objects.get(id=spatial_id)
            position = get_item_position(spatial_id)
            rotation = parse_coordinates(spatial_data.rotation)
            scale = parse_coordinates(spatial_data.scale)
            position_history = spatial_data.position_history

            deployed_items_details.append({item_id: {
                'name': item.get_name(),
                'description': item.get_description(),
                'model_id': item.get_model_id(),
                'texture_id': item.get_texture_id(),
                'category': item.get_category(),
                'type': item.get_type(),
                'is_container': is_container,
                'spatialData': {
                    'id': spatial_data.id,
                    'positions': position,
                    'rotation': rotation,
                    'scale': scale,
                    'position_history': position_history,
                },
                'containered_item': item.get_contained_item() if is_container else None,
                'composite': item.get_composition() if not is_container else None,
                'created_at': item.created_at.isoformat(),
            }})
        return JsonResponse({'deployed_items': deployed_items_details}, status=200)
    except Exception as e:
        try:
            transaction.abort()
        except Exception:
            pass
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        connection.close()

@csrf_exempt
@login_required
@require_http_methods(["POST"])        
def get_deployed_item_detail(request, id):
    connection, root = get_connection()
    try:
        item_id = request.POST.get('item_id')
        is_container = request.POST.get('is_container', 'false').lower() == 'true'
        if item_id not in [item.get('id') for item in root.digitalHomes[int(id)].get_deployedItems()]:
            return JsonResponse({'error': 'Item not deployed in this home'}, status=403)
        key = f'item_{int(item_id)}_home_{int(id)}'
        if is_container:
            item = root.containerOwnedItems[key]
        else:
            item = root.nonContainerOwnedItems[key]
        spatial_id = item.get_spatial_id()
        spatial_data = SpatialData.objects.get(id=spatial_id)
        position = get_item_position(spatial_id)
        rotation = parse_coordinates(spatial_data.rotation)
        scale = parse_coordinates(spatial_data.scale)
        position_history = spatial_data.position_history

        item_detail = {
            'id': item_id,
            'name': item.get_name(),
            'description': item.get_description(),
            'model_id': item.get_model_id(),
            'category': item.get_category(),
            'texture_id': item.get_texture_id(),
            'type': item.get_type(),
            'is_container': is_container,
            'spatialData': {
                'id': spatial_data.id,
                'positions': position,
                'rotation': rotation,
                'scale': scale,
                'position_history': position_history,
            },
            'containered_item': item.get_contained_item() if is_container else None,
            'composite': item.get_composition() if not is_container else None,
            'created_at': item.created_at.isoformat(),
        }
        return JsonResponse({'item_detail': item_detail}, status=200)
    except Exception as e:
        try:
            transaction.abort()
        except Exception:
            pass
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        connection.close()