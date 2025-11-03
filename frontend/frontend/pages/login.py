'''import reflex as rx

def login_page() -> rx.Component:
    return rx.center(
        rx.card(
        rx.vstack(
            rx.center(
             
                rx.heading(
                    "Sign in to your account",
                    size="6",
                    as_="h2",
                    text_align="center",
                    width="100%",
                    color="#22282C",
                ),
                direction="column",
                spacing="5",
                width="100%",
            ),

            rx.vstack(
                rx.text(
                    "Username",
                    size="3",
                    weight="medium",
                    text_align="left",
                    width="100%",
                    color="#22282C",
                ),
                rx.input(
                    rx.input.slot(rx.icon("user",style={"color":"#929FA7","width":"20px","height":"20px"})),
                    placeholder="myopapakyaw",
                    type="email",
                    size="3",
                    width="100%",
                    style = input_style
                ),
                justify="start",
                spacing="2",
                width="100%",
                color="white",
                margin_bottom="-1.5rem"
            ),
            rx.vstack(
                rx.text(
                    "Email address",
                    size="3",
                    weight="medium",
                    text_align="left",
                    width="100%",
                    color="#22282C",
                ),
                rx.input(
                    rx.input.slot(rx.icon("mail",style={"color":"#929FA7","width":"20px","height":"20px"})),
                    placeholder="user@reflex.dev",
                    type="email",
                    size="3",
                    width="100%",
                    style=input_style
                ),
                spacing="2",
                width="100%",
                margin_bottom="-1.5rem"
            ),
            rx.vstack(
                rx.hstack(
                    rx.text(
                        "Password",
                        size="3",
                        weight="medium",
                        color="#22282C",
                    ),
                    rx.link(
                        "Forgot password?",
                        href="#",
                        size="3",
                    ),
                    justify="between",
                    width="100%",
                ),
                rx.input(
                    rx.input.slot(rx.icon("lock",style={"color":"#929FA7","width":"20px","height":"20px"})),
                    placeholder="Enter your password",
                    type="password",
                    size="3",
                    width="100%",
                    style=input_style
                ),
                spacing="2",
                width="100%",
                margin_bottom="-1.5rem"
            ),
            rx.vstack(
                rx.text("New here?", size="3",  color="#22282C",),
                rx.link("Sign up", href="/signup", size="3"),
                opacity="0.8",
                spacing="2",
                direction="row",
                width="100%",
               
            ),
            rx.button("Sign In", size="3", width="100%",background_color="#22282C", border_radius = "8px", _hover={"background_color": "white", "color": "#22282C","border":"1px solid #929FA7"},on_click=rx.redirect("/signup")),
            rx.hstack(
                rx.divider(margin="0",style=divider_style),
                rx.text(
                    "Or Sign In with",
                    white_space="nowrap",
                    weight="medium",
                    color="#22282C",
                ),
                rx.divider( margin="0",style=divider_style),
                align="center",
                width="100%",
                
            ),
            rx.center(
                rx.icon_button(
                    rx.icon(tag="chrome"),
                    variant="soft",
                    size="3",
                    style=border_style,
                ),
                rx.icon_button(
                    rx.icon(tag="facebook"),
                    variant="soft",
                    size="3",
                    radius="full", 
                    style=border_style

                ),
                rx.icon_button(
                    rx.icon(tag="instagram"),
                    variant="soft",
                    size="3",
                    style=border_style
                ),
                rx.icon_button(
                    rx.icon(tag="twitter"),
                    variant="soft",
                    size="3",
                    style=border_style
                ),
                spacing="4",
                direction="row",
                width="100%",
           
            ),
            spacing="6",
            width="100%",
        ),
        max_width="28em",
        size="4",
        width="100%",
        style=background_style,
    ),
        height="100vh",
       
    )

    ++++++++++++++++++++++=====================


import reflex as rx
import httpx
import os
from ..state import AuthState

API_BASE_URL = os.getenv("API_URL", "http://localhost:8001")

class LoginState(rx.State):
    # Form fields
    identifier: str = ""  # Can be username or email
    password: str = ""
    
    # State management
    is_loading: bool = False
    error_message: str = ""
    success_message: str = ""
    
    # User info after login
    is_logged_in: bool = False
    username: str = ""
    is_admin: bool = False
    is_staff: bool = False
    
    def set_identifier(self, value: str):
        self.identifier = value
        self.error_message = ""
    
    def set_password(self, value: str):
        self.password = value
        self.error_message = ""
    
    async def handle_login(self):
        """Handle login form submission"""
        self.is_loading = True
        self.error_message = ""
        self.success_message = ""
        
        # Validation
        if not self.identifier.strip():
            self.error_message = "Username or email is required"
            self.is_loading = False
            return
        
        if not self.password:
            self.error_message = "Password is required"
            self.is_loading = False
            return
        
        try:
            form_data = {
                "identifier": self.identifier.strip(),
                "password": self.password,
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{API_BASE_URL}/users/login/",
                    data=form_data,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.success_message = data.get("message", "Login successful!")
                    self.is_logged_in = True
                    self.is_admin = data.get("is_admin", False)
                    self.is_staff = data.get("is_staff", False)
                    
             
                    self.password = ""
                    
                 
                    if self.is_admin:
                        yield rx.redirect("/admin-dashboard")
                    elif self.is_staff:
                        yield rx.redirect("/staff-dashboard")
                    else:
                        yield rx.redirect("/")
                else:
                    data = response.json()
                    self.error_message = data.get("error", "Login failed. Please try again.")
                    
        except httpx.TimeoutException:
            self.error_message = "Request timed out. Please check your connection."
        except httpx.ConnectError:
            self.error_message = "Unable to connect to server. Please try again later."
        except Exception as e:
            self.error_message = f"An error occurred: {str(e)}"
        finally:
            self.is_loading = False
    
    async def check_login_status(self):
        """Check if user is already logged in"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{API_BASE_URL}/users/is_logged_in/",
                    timeout=5.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.is_logged_in = data.get("logged_in", False)
                    self.username = data.get("username", "")
        except Exception:
            pass


def login_page() -> rx.Component:
    return rx.center(
        rx.card(
            rx.vstack(
                # Error/Success Messages
                rx.cond(
                    LoginState.error_message != "",
                    rx.callout(
                        LoginState.error_message,
                        icon="triangle_alert",
                        color_scheme="red",
                        size="2",
                        width="100%",
                    )
                ),
                rx.cond(
                    LoginState.success_message != "",
                    rx.callout(
                        LoginState.success_message,
                        icon="check",
                        color_scheme="green",
                        size="2",
                        width="100%",
                    )
                ),
                
                # Header
                rx.center(
                    rx.heading(
                        "Sign in to your account",
                        size="6",
                        as_="h2",
                        text_align="center",
                        width="100%",
                        color="#22282C",
                    ),
                    direction="column",
                    spacing="5",
                    width="100%",
                ),
                
                # Username or Email Field
                rx.vstack(
                    rx.text(
                        "Username or Email",
                        size="3",
                        weight="medium",
                        text_align="left",
                        width="100%",
                        color="#22282C",
                    ),
                    rx.input(
                        rx.input.slot(
                            rx.icon("user", style={"color": "#929FA7", "width": "20px", "height": "20px"})
                        ),
                        placeholder="myopapakyaw or user@reflex.dev",
                        type="text",
                        size="3",
                        width="100%",
                        color="#22282C",
                        background_color="white",
                        border="1px solid #929FA7",
                        border_radius="8px",
                        value=LoginState.identifier,
                        on_change=LoginState.set_identifier,
                    ),
                    justify="start",
                    spacing="2",
                    width="100%",
                    margin_bottom="-1.5rem"
                ),
                
                # Password Field
                rx.vstack(
                    rx.hstack(
                        rx.text(
                            "Password",
                            size="3",
                            weight="medium",
                            color="#22282C",
                        ),
                        rx.link(
                            "Forgot password?",
                            href="#",
                            size="3",
                        ),
                        justify="between",
                        width="100%",
                    ),
                    rx.input(
                        rx.input.slot(
                            rx.icon("lock", style={"color": "#929FA7", "width": "20px", "height": "20px"})
                        ),
                        placeholder="Enter your password",
                        type="password",
                        size="3",
                        width="100%",
                        color="#22282C",
                        background_color="white",
                        border="1px solid #929FA7",
                        border_radius="8px",
                        value=LoginState.password,
                        on_change=LoginState.set_password,
                    ),
                    spacing="2",
                    width="100%",
                    margin_bottom="-1.5rem"
                ),
                
                # Sign Up Link
                rx.hstack(
                    rx.text("New here?", size="3", color="#22282C"),
                    rx.link("Sign up", href="/signup", size="3"),
                    opacity="0.8",
                    spacing="2",
                    width="100%",
                ),
                
                # Sign In Button
                rx.button(
                    rx.cond(
                        LoginState.is_loading,
                        rx.hstack(
                            rx.spinner(size="3"),
                            rx.text("Signing in..."),
                            spacing="2",
                        ),
                        rx.text("Sign In"),
                    ),
                    size="3",
                    width="100%",
                    background_color="#22282C",
                    border_radius="8px",
                    _hover={"background_color": "white", "color": "#22282C", "border": "1px solid #929FA7"},
                    on_click=LoginState.handle_login,
                    disabled=LoginState.is_loading,
                ),
                
                # Divider
                rx.hstack(
                    rx.divider(margin="0", border_color="#E9EBEC", border_width="1px", width="100%"),
                    rx.text(
                        "Or Sign In with",
                        white_space="nowrap",
                        weight="medium",
                        color="#22282C",
                    ),
                    rx.divider(margin="0", border_color="#E9EBEC", border_width="1px", width="100%"),
                    align="center",
                    width="100%",
                ),
                
                # Social Login Buttons
                rx.center(
                    rx.icon_button(
                        rx.icon(tag="chrome"),
                        variant="soft",
                        size="3",
                        border_radius="100px",
                        color="#22282C",
                        background_color="white",
                        border="1px solid #929FA7",
                    ),
                    rx.icon_button(
                        rx.icon(tag="facebook"),
                        variant="soft",
                        size="3",
                        radius="full",
                        border_radius="100px",
                        color="#22282C",
                        background_color="white",
                        border="1px solid #929FA7",
                    ),
                    rx.icon_button(
                        rx.icon(tag="instagram"),
                        variant="soft",
                        size="3",
                        border_radius="100px",
                        color="#22282C",
                        background_color="white",
                        border="1px solid #929FA7",
                    ),
                    rx.icon_button(
                        rx.icon(tag="twitter"),
                        variant="soft",
                        size="3",
                        border_radius="100px",
                        color="#22282C",
                        background_color="white",
                        border="1px solid #929FA7",
                    ),
                    spacing="4",
                    direction="row",
                    width="100%",
                ),
                
                spacing="6",
                width="100%",
            ),
            max_width="28em",
            size="4",
            width="100%",
            background_color="white",
        ),
        height="100vh",
    )
background_style = {
    "width": "100%",
    "align_items": "center",
    "background_color": "white",
}

input_style = {
    "color": "#22282C",
    "background_color": "white",
    "border": "1px solid #929FA7",
    "border_radius": "8px",
  
}

border_style = {
    "border_radius": "100px" ,
    "color":"#22282C",
    "background_color":"white",
    "border": "1px solid #929FA7"}

divider_style = {
    "border_color": "#E9EBEC",
    "border_width": "1px",
    "width": "100%",
}

'''
import reflex as rx
from ..state import AuthState

class LoginState(rx.State):
    # Form fields
    identifier: str = ""
    password: str = ""
    
    # UI state
    is_loading: bool = False
    error_message: str = ""
    
    def set_identifier(self, value: str):
        self.identifier = value
        self.error_message = ""
    
    def set_password(self, value: str):
        self.password = value
        self.error_message = ""
    
    def reset_form(self):
        """Reset form state when page loads"""
        self.identifier = ""
        self.password = ""
        self.error_message = ""
        self.is_loading = False
    
    async def handle_login(self):
        """Handle login form submission"""
        # Validation
        if not self.identifier.strip():
            self.error_message = "Username or email is required"
            return
        
        if not self.password:
            self.error_message = "Password is required"
            return
        
        # Clear error and set loading
        self.error_message = ""
        self.is_loading = True
        
        try:
            # Get auth state and call login
            auth_state = await self.get_state(AuthState)
            
            # Perform login
            result = await auth_state.login(self.identifier.strip(), self.password)
            
            # If we get here and auth is successful, redirect will happen
            # Clear the form
            self.password = ""
            self.identifier = ""
            
            return result
            
        except Exception as e:
            self.error_message = f"Login error: {str(e)}"
            self.is_loading = False
        finally:
            # Reset loading state
            self.is_loading = False


def login_page() -> rx.Component:
    return rx.center(
        rx.card(
            rx.vstack(
                # Error Message
                rx.cond(
                    LoginState.error_message != "",
                    rx.callout(
                        LoginState.error_message,
                        icon="triangle_alert",
                        color_scheme="red",
                        size="2",
                        width="100%",
                    )
                ),
                
                # Header
                rx.center(
                    rx.heading(
                        "Sign in to your account",
                        size="6",
                        as_="h2",
                        text_align="center",
                        width="100%",
                        color="#22282C",
                    ),
                    direction="column",
                    spacing="5",
                    width="100%",
                ),
                
                # Username or Email Field
                rx.vstack(
                    rx.text(
                        "Username or Email",
                        size="3",
                        weight="medium",
                        text_align="left",
                        width="100%",
                        color="#22282C",
                    ),
                    rx.input(
                        rx.input.slot(
                            rx.icon("user", style={"color": "#929FA7", "width": "20px", "height": "20px"})
                        ),
                        placeholder="myopapakyaw or user@reflex.dev",
                        type="text",
                        size="3",
                        width="100%",
                        color="#22282C",
                        background_color="white",
                        border="1px solid #929FA7",
                        border_radius="8px",
                        value=LoginState.identifier,
                        on_change=LoginState.set_identifier,
                    ),
                    justify="start",
                    spacing="2",
                    width="100%",
                    margin_bottom="-1.5rem"
                ),
                
                # Password Field
                rx.vstack(
                    rx.hstack(
                        rx.text(
                            "Password",
                            size="3",
                            weight="medium",
                            color="#22282C",
                        ),
                        rx.link(
                            "Forgot password?",
                            href="#",
                            size="3",
                        ),
                        justify="between",
                        width="100%",
                    ),
                    rx.input(
                        rx.input.slot(
                            rx.icon("lock", style={"color": "#929FA7", "width": "20px", "height": "20px"})
                        ),
                        placeholder="Enter your password",
                        type="password",
                        size="3",
                        width="100%",
                        color="#22282C",
                        background_color="white",
                        border="1px solid #929FA7",
                        border_radius="8px",
                        value=LoginState.password,
                        on_change=LoginState.set_password,
                        # Add Enter key support
                        on_key_down=lambda key: rx.cond(
                            key == "Enter",
                            LoginState.handle_login(),
                            rx.noop()
                        ),
                    ),
                    spacing="2",
                    width="100%",
                    margin_bottom="-1.5rem"
                ),
                
                # Sign Up Link
                rx.hstack(
                    rx.text("New here?", size="3", color="#22282C"),
                    rx.link("Sign up", href="/signup", size="3"),
                    opacity="0.8",
                    spacing="2",
                    width="100%",
                ),
                
                # Sign In Button
                rx.button(
                    rx.cond(
                        LoginState.is_loading,
                        rx.hstack(
                            rx.spinner(size="3"),
                            rx.text("Signing in..."),
                            spacing="2",
                        ),
                        rx.text("Sign In"),
                    ),
                    size="3",
                    width="100%",
                    background_color="#22282C",
                    border_radius="8px",
                    _hover={"background_color": "white", "color": "#22282C", "border": "1px solid #929FA7"},
                    on_click=LoginState.handle_login,
                    disabled=LoginState.is_loading,
                ),
                
                # Divider
                rx.hstack(
                    rx.divider(margin="0", border_color="#E9EBEC", border_width="1px", width="100%"),
                    rx.text(
                        "Or Sign In with",
                        white_space="nowrap",
                        weight="medium",
                        color="#22282C",
                    ),
                    rx.divider(margin="0", border_color="#E9EBEC", border_width="1px", width="100%"),
                    align="center",
                    width="100%",
                ),
                
                # Social Login Buttons
                rx.center(
                    rx.icon_button(
                        rx.icon(tag="chrome"),
                        variant="soft",
                        size="3",
                        border_radius="100px",
                        color="#22282C",
                        background_color="white",
                        border="1px solid #929FA7",
                    ),
                    rx.icon_button(
                        rx.icon(tag="facebook"),
                        variant="soft",
                        size="3",
                        radius="full",
                        border_radius="100px",
                        color="#22282C",
                        background_color="white",
                        border="1px solid #929FA7",
                    ),
                    rx.icon_button(
                        rx.icon(tag="instagram"),
                        variant="soft",
                        size="3",
                        border_radius="100px",
                        color="#22282C",
                        background_color="white",
                        border="1px solid #929FA7",
                    ),
                    rx.icon_button(
                        rx.icon(tag="twitter"),
                        variant="soft",
                        size="3",
                        border_radius="100px",
                        color="#22282C",
                        background_color="white",
                        border="1px solid #929FA7",
                    ),
                    spacing="4",
                    direction="row",
                    width="100%",
                ),
                
                spacing="6",
                width="100%",
            ),
            max_width="28em",
            size="4",
            width="100%",
            background_color="white",
        ),
        height="100vh",
        # 👇 Reset form state when page loads
        on_mount=[LoginState.reset_form, AuthState.check_auth],
    )

background_style = {
    "width": "100%",
    "align_items": "center",
    "background_color": "white",
}

input_style = {
    "color": "#22282C",
    "background_color": "white",
    "border": "1px solid #929FA7",
    "border_radius": "8px",
  
}

border_style = {
    "border_radius": "100px" ,
    "color":"#22282C",
    "background_color":"white",
    "border": "1px solid #929FA7"}

divider_style = {
    "border_color": "#E9EBEC",
    "border_width": "1px",
    "width": "100%",
}