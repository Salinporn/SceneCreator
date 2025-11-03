from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.http import FileResponse

from .product_func import *
from zodb.zodb_management import *

@csrf_exempt
@require_http_methods(["POST"])
@login_required
def add_product(request):
    try:
        name = request.POST.get('name')
        description = request.POST.get('description')
        digital_price = float(request.POST.get('digital_price', 0))
        physical_price = float(request.POST.get('physical_price', 0))
        category = request.POST.get('category')
        image = request.FILES.get('image')
        product_type = request.POST.get('product_type')
        stock = int(request.POST.get('stock', 0))
        model_files = request.FILES.get('model_file')
        scene_files = request.FILES.getlist('scene_files')
        texture_files = request.FILES.getlist('texture_files')
        digital_available_str = request.POST.get('digital_available', 'false')
        digital_available = digital_available_str.lower() == 'true'
        physical_available_str = request.POST.get('physical_available', 'false')
        physical_available = physical_available_str.lower() == 'true'
        is_container = request.POST.get('is_container', 'false').lower() == 'true'
        
        if not all([name, description, category, product_type, image]) or stock < 0 or not model_files:
            return JsonResponse({'error': 'Invalid input data'}, status=400)

        if digital_price < 0 or physical_price < 0:
            return JsonResponse({'error': 'Prices must be non-negative'}, status=400)

        if not digital_available and not physical_available:
            return JsonResponse({'error': 'At least one of digital or physical availability must be true'}, status=400)

        product_id = create_product(name, description, digital_price, physical_price, category, image, product_type, stock, model_files, scene_files, digital_available, physical_available, is_container, texture_files)

        return JsonResponse({'message': 'Product created successfully', 'product_id': product_id}, status=201)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
@login_required
def update_product(request):
    try:
        product_id = request.POST.get('product_id')
        name = request.POST.get('name')
        description = request.POST.get('description')
        digital_price = float(request.POST.get('digital_price', 0))
        physical_price = float(request.POST.get('physical_price', 0))
        category = request.POST.get('category')
        image = request.FILES.get('image')
        product_type = request.POST.get('product_type')
        stock = int(request.POST.get('stock', 0))
        model_files = request.FILES.get('model_file')
        scene_files = request.FILES.getlist('scene_files')
        texture_files = request.FILES.getlist('texture_files')
        digital_available_str = request.POST.get('digital_available', 'false')
        digital_available = digital_available_str.lower() == 'true'
        physical_available_str = request.POST.get('physical_available', 'false')
        physical_available = physical_available_str.lower() == 'true'
        is_container = request.POST.get('is_container', 'false').lower() == 'true'
        
        if not product_id:
            return JsonResponse({'error': 'Product ID is required'}, status=400)
        if not all([name, description, category, product_type, image]) or stock < 0 or not model_files:
            return JsonResponse({'error': 'Invalid input data'}, status=400)

        if digital_price < 0 or physical_price < 0:
            return JsonResponse({'error': 'Prices must be non-negative'}, status=400)

        if not digital_available and not physical_available:
            return JsonResponse({'error': 'At least one of digital or physical availability must be true'}, status=400)
        
        update_existing_product(product_id, name, description, digital_price, physical_price, category, image, product_type, stock, model_files, scene_files, digital_available, physical_available, is_container, texture_files)
        return JsonResponse({'message': 'Product updated successfully', 'product_id': product_id}, status=200)
    except Product.DoesNotExist:
        return JsonResponse({'error': 'Product not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
@login_required
def get_products(request):
    connection, root = get_connection()
    try:
        search_query = request.POST.get('search_query', None)
        category = request.POST.get('category', None)
        min_price = request.POST.get('min_price', None)
        max_price = request.POST.get('max_price', None)
        format = request.POST.get('format', None)
        product_type =  request.POST.get('product_type', None)
        sort_by = request.POST.get('sort_by', None)
        
        product_list = []
        for product in root.products.values():
            item = product.get_item()
            item_category = item.get_category().lower()
            item_name = item.get_name().lower()
            if search_query is not None:
                if search_query and search_query.lower() not in item_name:
                    continue
            if category is not None and category.lower() != item_category:
                continue
            if min_price is not None:
                try:
                    min_price_val = float(min_price)
                    if (product.get_digital_price() is not None and product.get_digital_price() < min_price_val) and (product.get_physical_price() is not None and product.get_physical_price() < min_price_val):
                        continue
                except ValueError:
                    return JsonResponse({'error': 'Invalid min_price value'}, status=400)
            if max_price is not None:
                try:
                    max_price_val = float(max_price)
                    if (product.get_digital_price() is not None and product.get_digital_price() > max_price_val) and (product.get_physical_price() is not None and product.get_physical_price() > max_price_val):
                        continue
                except ValueError:
                    return JsonResponse({'error': 'Invalid max_price value'}, status=400)
            if format is not None:
                if format.lower() == 'digital' and not product.is_digital_available():
                    continue
                if format.lower() == 'physical' and not product.is_physical_available():
                    continue

            if product_type is not None and product_type.lower() != item.get_type().lower():
                continue

            product_data = {
                'id': product.id,
                'name': item.get_name(),
                'description': item.get_description(),
                'category': item.get_category(),
                'digital_price': str(product.get_digital_price()),
                'physical_price': str(product.get_physical_price()),
                'image': item.get_image(),
                'rating': product.get_rating(),
                'product_type': item.get_type(),
                'created_at': item.get_created_at(),
            }
            product_list.append(product_data)
        if sort_by is not None:
            if sort_by == 'popularity' or sort_by == None:
                product_list.sort(key=lambda x: x['rating'], reverse=True)
            elif sort_by == 'newest':
                product_list.sort(key=lambda x: x['created_at'], reverse=True)
            elif sort_by == 'digital_price_low_to_high':
                product_list.sort(key=lambda x: float(x['digital_price']) if x['digital_price'] not in [None, 'None'] else float('inf'))
            elif sort_by == 'digital_price_high_to_low':
                product_list.sort(key=lambda x: float(x['digital_price']) if x['digital_price'] not in [None, 'None'] else float('-inf'), reverse=True)
            elif sort_by == 'physical_price_low_to_high':
                product_list.sort(key=lambda x: float(x['physical_price']) if x['physical_price'] not in [None, 'None'] else float('inf'))
            elif sort_by == 'physical_price_high_to_low':
                product_list.sort(key=lambda x: float(x['physical_price']) if x['physical_price'] not in [None, 'None'] else float('-inf'), reverse=True)
    
        return JsonResponse({'products': product_list}, status=200)
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
def get_product_detail(request, product_id):
    connection, root = get_connection()
    try:
        if not product_id:
            return JsonResponse({'error': 'Product ID is required'}, status=400)
        product = root.products[product_id]
        item = product.item
        
        product_data = {
            'id': product.id,
            'name': item.get_name(),
            'description': item.get_description(),
            'digital_price': str(product.get_digital_price()),
            'physical_price': str(product.get_physical_price()),
            'category': item.get_category(),
            'type': item.get_type(),
            'image': item.get_image(),
            'stock': product.get_stock(),
            'reviews': product.get_reviews(),
            'rating': product.get_rating(),
            'created_at': item.get_created_at(),
            'updated_at': item.get_updated_at(),
            'model_id': item.get_model_id(),
            'display_scenes_ids': product.get_display_scenes()
        }
        return JsonResponse({'product': product_data}, status=200)
    except Product.DoesNotExist:
        return JsonResponse({'error': 'Product not found'}, status=404)
    except Exception as e:
        try:
            transaction.abort()
        except Exception:
            pass
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        connection.close()

@csrf_exempt
@require_http_methods(["DELETE"])
@login_required
def delete_product(request, product_id):
    try:
        if not product_id:
            return JsonResponse({'error': 'Product ID is required'}, status=400)
        
        delete_existing_product(product_id)
        
        return JsonResponse({'message': 'Product deleted successfully'}, status=200)
    except Product.DoesNotExist:
        return JsonResponse({'error': 'Product not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    
    
@require_http_methods(["GET"])
@login_required
def get_3d_model(request, model_id):
    try:
        model = fetch_3d_model(model_id)
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
def get_display_scene(request, display_scene_id):
    try:
        scene = fetch_display_scene(display_scene_id)
        if not scene:
            return JsonResponse({'error': 'Scene not found'}, status=404)

        blob = scene.get_file()
        if blob is None:
            return JsonResponse({'error': 'Scene file not found'}, status=404)

        response = FileResponse(blob.open('r'), as_attachment=True, filename=scene.get_filename())
        return response
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    
@require_http_methods(["GET"])
@login_required
def get_textures(request, model_id):
    try:
        model = fetch_3d_model(model_id)
        if not model:
            return JsonResponse({'error': 'Model not found'}, status=404)

        texture_files = []
        for tex_id in model.get_textures():
            texture = fetch_texture(tex_id)
            texture_files.append({'texture_id': tex_id, 'file': texture})

        return JsonResponse({'textures': texture_files}, status=200)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    
@require_http_methods(["GET"])
@login_required
def get_all_categories(request):
    connection, root = get_connection()
    try:
        categories = set()
        for obj in root.objectItems.values():
            try:
                categories.add(obj.get_category())
            except Exception:
                continue
        return JsonResponse({'categories': list(categories)}, status=200)
    except Exception as e:
        try:
            transaction.abort()
        except Exception:
            pass
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        connection.close()
        
@csrf_exempt
@require_http_methods(["POST"])
@login_required
def get_all_product_types(request):
    connection, root = get_connection()
    try:
        category = request.POST.get('category', None)
        product_types = set()
        for obj in root.objectItems.values():
            try:
                if category is None or obj.get_category() == category:
                    product_types.add(obj.get_type())
            except Exception:
                continue
        return JsonResponse({'product_types': list(product_types)}, status=200)
    except Exception as e:
        try:
            transaction.abort()
        except Exception:
            pass
        return JsonResponse({"error": str(e)}, status=500)
    finally:
        connection.close()