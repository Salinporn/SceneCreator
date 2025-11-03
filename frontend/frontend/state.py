import reflex as rx
import httpx
import os
from typing import Optional
from .rooms_data import rooms_data
from .config import API_BASE_URL

SCENE_CREATOR_URL = os.getenv("SCENE_CREATOR_URL", "http://localhost:5173")

class AuthState(rx.State):
    is_logged_in: bool = False
    username: str = ""
    is_admin: bool = False
    is_staff: bool = False
    
    session_cookies: dict[str, str] = {}
    
    scene_creator_url: str = ""
    
    async def check_auth(self):
        """Check if user is authenticated - SENDS COOKIES"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{API_BASE_URL}/users/is_logged_in/",
                    cookies=self.session_cookies,
                    timeout=5.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.is_logged_in = data.get("logged_in", False)
                    self.username = data.get("username", "")
                    self.is_admin = data.get("is_admin", False)
                    self.is_staff = data.get("is_staff", False)
                    
                    print(f"✅ Auth check: logged_in={self.is_logged_in}, username={self.username}")
                    
                    if not self.is_logged_in:
                        self.session_cookies = {}
                else:
                    self.is_logged_in = False
                    self.session_cookies = {}
        except Exception as e:
            print(f"❌ Auth check failed: {e}")
            self.is_logged_in = False
    
    async def login(self, identifier: str, password: str):
        """Handle user login - SAVES COOKIES FROM RESPONSE"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{API_BASE_URL}/users/login/",
                    data={
                        "identifier": identifier,
                        "password": password
                    },
                    timeout=5.0,
                    follow_redirects=True
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # 👈 SAVE ALL COOKIES FROM LOGIN RESPONSE
                    self.session_cookies = dict(response.cookies)
                    
                    print(f"🍪 Saved cookies: {list(self.session_cookies.keys())}")
                    
                    # Update auth state 
                    self.is_logged_in = True
                    self.username = data.get("username", identifier)
                    self.is_admin = data.get("is_admin", False)
                    self.is_staff = data.get("is_staff", False)
                    
                    print(f"✅ Login successful: {self.username}")

                    if self.is_admin:
                        return rx.redirect("/admin_dashboard")
                    elif self.is_staff:
                        return rx.redirect("/staff_dashboard")
                    else:
                        return rx.redirect("/")   
                    
                else:
                    error_msg = response.json().get("error", "Login failed")
                    print(f"❌ Login failed: {error_msg}")
                    return rx.window_alert(f"Login failed: {error_msg}")
        except Exception as e:
            print(f"❌ Login error: {e}")
            return rx.window_alert(f"Login error: {str(e)}")
    
    async def logout(self):
        """Handle user logout - SENDS COOKIES"""
        try:
            async with httpx.AsyncClient() as client:
                await client.delete(
                    f"{API_BASE_URL}/users/logout/",
                    cookies=self.session_cookies,  
                    timeout=5.0
                )
        except Exception as e:
            print(f"❌ Logout failed: {e}")
        
        self.is_logged_in = False
        self.username = ""
        self.is_admin = False
        self.is_staff = False
        self.session_cookies = {}
        
        print("✅ Logged out, cookies cleared")
        
        return rx.redirect("/")
    
    async def make_authenticated_request(self, method: str, endpoint: str, **kwargs):

        async with httpx.AsyncClient() as client:
            url = f"{API_BASE_URL}{endpoint}"
            response = await client.request(
                method,
                url,
                cookies=self.session_cookies,
                timeout=5.0,
                **kwargs
            )
            return response
    
    async def get_scene_creator_token(self) -> Optional[str]:
        """Get authentication token for Scene Creator"""
        if not self.is_logged_in:
            print("❌ User not logged in, cannot get token")
            return None
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{API_BASE_URL}/users/get_login_token/",
                    cookies=self.session_cookies,
                    timeout=5.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    token = data.get("token")
                    print(f"🎟️ Got login token for user: {self.username}")
                    return token
                else:
                    print(f"❌ Failed to get token: {response.status_code}")
                    return None
        except Exception as e:
            print(f"❌ Error getting token: {e}")
            return None
    
    async def open_scene_creator(self):
        if not self.is_logged_in:
            return rx.window_alert("Please log in first to access Scene Creator")
        
        token = await self.get_scene_creator_token()
        
        if not token:
            return rx.window_alert("Failed to generate authentication token. Please try logging in again.")
        
        # Build Scene Creator URL with token
        self.scene_creator_url = f"{SCENE_CREATOR_URL}/#/login?token={token}"
        
        print(f"🚀 Opening Scene Creator: {self.scene_creator_url}")
        
        return rx.call_script(f"window.open('{self.scene_creator_url}', '_blank')")
        

class ModelState(rx.State):
    selected_model: str = "/models/gaming_chair_pink.glb"
    model_scale: float = 1.0  
    model_x: float = -2.0
    model_y: float = -3.0
    model_z: float = 4.0
    model_rotation_y: float = 0.0  
    
    def increase_scale(self):
        self.model_scale = min(3.0, self.model_scale + 0.1)  
    
    def decrease_scale(self):
        self.model_scale = max(0.1, self.model_scale - 0.1) 
    
    def move_left(self):
        self.model_x -= 0.5
    
    def move_right(self):
        self.model_x += 0.5
    
    def move_up(self):
        self.model_y += 0.5
    
    def move_down(self):
        self.model_y -= 0.5
    
    def move_forward(self):
        self.model_z -= 0.5
    
    def move_back(self):
        self.model_z += 0.5
    
    def rotate_left(self):
        self.model_rotation_y -= 0.3  
    
    def rotate_right(self):
        self.model_rotation_y += 0.3 
    
    def reset_position(self):
        self.model_scale = 1.0
        self.model_x = -2.0
        self.model_y = -3.0
        self.model_z = 4.0
        self.model_rotation_y = 0.0
    
   

class RoomSceneState(rx.State):
    selected_room_model: str = "/models/gamingRoom.glb"  
    
    def select_room(self, room_url: str):
        self.selected_room_model = room_url
        print(f"🏠 Room changed to: {room_url}")


class ModalState(rx.State):
    demo_modal_open: bool = False
    demo_model_url: str = ""
    
    def open_demo_modal(self, model_url: str):
        
        self.demo_model_url = model_url
        self.demo_modal_open = True
    
    def close_demo_modal(self):
        
        self.demo_modal_open = False

class DynamicState(rx.State):
    current_room: str = ""
    room_title: str = "Unknown Room"
    room_image: str = "/images/notfound.jpg"
    room_categories: list = []
    room_products: list[dict] = []
    
    def on_load(self):
        self.current_room = self.router.page.params.get("room", "")
        room = rooms_data.get(self.current_room)
        if room:
            self.room_title = room["title"]
            self.room_image = room["image"]
            self.room_categories = room.get("categories", [])
            self.room_products = room["products"]

class ProfileState(rx.State):
    selected_menu: str = "personal_info"  

    def set_menu(self, menu: str):
        self.selected_menu = menu


