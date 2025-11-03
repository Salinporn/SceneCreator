import os
import ZODB
import ZODB.FileStorage
from ZODB.blob import BlobStorage
import BTrees.OOBTree

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZODB_DIR = os.path.join(BASE_DIR, 'zodb_data')
BLOB_DIR = os.path.join(ZODB_DIR, 'blobs')
os.makedirs(ZODB_DIR, exist_ok=True)
os.makedirs(BLOB_DIR, exist_ok=True)
ZODB_FILE = os.path.join(ZODB_DIR, 'zodb.fs')

file_storage = ZODB.FileStorage.FileStorage(ZODB_FILE)
storage = BlobStorage(BLOB_DIR, file_storage)
db = ZODB.DB(storage)

#Get a fresh connection and ensure root is initialized
def get_connection():
    connection = db.open()
    root = connection.root()
    
    # Initialize root attributes if they don't exist
    if not hasattr(root, "objectModels"):
        root.objectModels = BTrees.OOBTree.BTree()
    if not hasattr(root, "textures"):
        root.textures = BTrees.OOBTree.BTree()
    if not hasattr(root, "displayScenes"):
        root.displayScenes = BTrees.OOBTree.BTree()
    if not hasattr(root, "objectItems"):
        root.objectItems = BTrees.OOBTree.BTree()
    if not hasattr(root, "ownedItems"):
        root.ownedItems = BTrees.OOBTree.BTree()
    if not hasattr(root, "containerOwnedItems"):
        root.containerOwnedItems = BTrees.OOBTree.BTree()
    if not hasattr(root, "nonContainerOwnedItems"):
        root.nonContainerOwnedItems = BTrees.OOBTree.BTree()
    if not hasattr(root, "products"):
        root.products = BTrees.OOBTree.BTree()
    if not hasattr(root, "digitalHomes"):
        root.digitalHomes = BTrees.OOBTree.BTree()
    if not hasattr(root, "homeObjectModels"):
        root.homeObjectModels = BTrees.OOBTree.BTree()
    if not hasattr(root, "placedItems"):
        root.placedItems = BTrees.OOBTree.BTree()
    
    return connection, root

def close_zodb():
    db.close()
    storage.close()
    file_storage.close()