import os
import reflex as rx
from ..template import template
from ..state import AuthState
import httpx
from typing import Optional, Callable, Any
from ..config import API_BASE_URL


class Address(rx.Base):
    id: int
    address: str
    is_default: bool


class ProfileState(rx.State):
    # Menu / section
    active_section: str = "profile"
    show_password_form: bool = False
    has_addresses: bool = False
    selected_menu: str = "personal_info"

    profile_picture: str = ""  # Base64 encoded image or URL
    is_uploading: bool = False
    upload_error: str = ""

    # Personal info
    first_name: str = ""
    last_name: str = ""
    username: str = ""
    email: str = ""
    phone_number: str = ""
    gender: str = ""
    birthday: str = ""
    province: str = ""
    street_address: str = ""

    # Password fields
    current_password: str = ""
    new_password: str = ""
    confirm_password: str = ""
    show_password_form: bool = False
    show_current_password: bool = False
    show_new_password: bool = False
    show_confirm_password: bool = False
    is_submitting: bool = False
    password_error: str = ""
    password_success: str = ""

    # Address management
    addresses: list[Address] = []
    editing_address_id: int = 0  # 0 means new address, >0 means editing
    form_username: str = ""
    form_phone_number: str = ""
    form_province: str = ""
    form_street_address: str = ""

    def set_form_username(self, value: str):
        self.form_username = value

    def set_form_province(self, value: str):
        self.form_province = value

    def set_form_street_address(self, value: str):
        self.form_street_address = value

    def set_form_phone_number(self, value: str):
        self.form_phone_number = value

    def set_first_name(self, value: str):
        self.first_name = value

    def set_last_name(self, value: str):
        self.last_name = value

    def set_username(self, value: str):
        self.username = value

    def set_email(self, value: str):
        self.email = value

    def set_phone_number(self, value: str):
        self.phone_number = value

    def set_gender(self, value: str):
        self.gender = value

    def set_birthday(self, value: str):
        self.birthday = value

    def set_current_password(self, value: str):
        self.current_password = value

    def set_new_password(self, value: str):
        self.new_password = value

    def set_confirm_password(self, value: str):
        self.confirm_password = value

    # Sections / menu handling
    def set_section(self, section: str):
        self.active_section = section

    def set_menu(self, menu: str):
        self.selected_menu = menu

    # Password form
    def open_password_form(self):
        self.show_password_form = True

    def close_password_form(self):
        self.show_password_form = False
        self.current_password = ""
        self.new_password = ""
        self.confirm_password = ""

    def toggle_current_password(self):
        self.show_current_password = not self.show_current_password

    def toggle_new_password(self):
        self.show_new_password = not self.show_new_password

    def toggle_confirm_password(self):
        self.show_confirm_password = not self.show_confirm_password

    # Your existing methods...
    def close_password_form(self):
        self.show_password_form = False

    def clear_password_fields(self):
        """Clear all password fields and messages"""
        self.current_password = ""
        self.new_password = ""
        self.confirm_password = ""
        self.password_error = ""
        self.password_success = ""
        self.show_current_password = False
        self.show_new_password = False
        self.show_confirm_password = False

    async def submit_password_change(self):
        """Submit password change request to backend"""
        print("=== PASSWORD CHANGE STARTED ===")

        # Set loading state
        self.is_submitting = True

        # Clear previous messages
        self.password_error = ""
        self.password_success = ""

        print(f"Current password length: {len(self.current_password)}")
        print(f"New password length: {len(self.new_password)}")
        print(f"Confirm password length: {len(self.confirm_password)}")

        # Validate inputs
        if not self.current_password:
            self.password_error = "Please enter your current password"
            self.is_submitting = False
            print(f"Validation error: {self.password_error}")
            return

        if not self.new_password:
            self.password_error = "Please enter a new password"
            self.is_submitting = False
            print(f"Validation error: {self.password_error}")
            return

        if len(self.new_password) < 6:
            self.password_error = "New password must be at least 6 characters"
            self.is_submitting = False
            print(f"Validation error: {self.password_error}")
            return

        if not self.confirm_password:
            self.password_error = "Please confirm your new password"
            self.is_submitting = False
            print(f"Validation error: {self.password_error}")
            return

        if self.new_password != self.confirm_password:
            self.password_error = "New passwords do not match"
            self.is_submitting = False
            print(f"Validation error: {self.password_error}")
            return

        if self.current_password == self.new_password:
            self.password_error = "New password must be different from current password"
            self.is_submitting = False
            print(f"Validation error: {self.password_error}")
            return

        print("Validation passed, getting auth state...")

        # Get auth state
        auth_state = await self.get_state(AuthState)
        cookies_dict = auth_state.session_cookies if auth_state.session_cookies else {}

        print(f"Cookies available: {bool(cookies_dict)}")
        print(f"API URL: {API_BASE_URL}/users/change_password/")

        # Make API request
        try:
            async with httpx.AsyncClient() as client:
                print("Sending request to backend...")
                response = await client.put(
                    f"{API_BASE_URL}/users/change_password/",
                    json={
                        "current_password": self.current_password,
                        "new_password": self.new_password,
                    },
                    cookies=cookies_dict,
                    timeout=10.0,
                )

                print(f"Response status: {response.status_code}")
                print(f"Response body: {response.text}")

                if response.status_code == 200:
                    self.password_success = (
                        "Password changed successfully! Redirecting to login..."
                    )
                    print("Password changed successfully!")
                    self.clear_password_fields()
                    self.show_password_form = False
                    self.is_submitting = False

                    # Redirect to login page
                    return rx.redirect("/login")

                elif response.status_code == 403:
                    self.password_error = "Current password is incorrect"
                    print(f"Error: {self.password_error}")

                elif response.status_code == 400:
                    data = response.json()
                    self.password_error = data.get("error", "Invalid request")
                    print(f"Error: {self.password_error}")

                elif response.status_code == 401:
                    self.password_error = (
                        "Authentication required. Please log in again."
                    )
                    print(f"Error: {self.password_error}")
                    self.is_submitting = False
                    return rx.redirect("/login")

                else:
                    self.password_error = (
                        f"Server error (Status: {response.status_code})"
                    )
                    print(f"Error: {self.password_error}")

        except httpx.TimeoutException as e:
            self.password_error = "Request timeout. Please check your connection."
            print(f"Timeout error: {e}")
        except httpx.RequestError as e:
            self.password_error = "Network error. Please try again."
            print(f"Request error: {e}")
        except Exception as e:
            self.password_error = f"An unexpected error occurred: {str(e)}"
            print(f"Unexpected error: {e}")

        self.is_submitting = False
        print("=== PASSWORD CHANGE ENDED ===")
        print(f"Final error message: {self.password_error}")
        print(f"Final success message: {self.password_success}")

    async def save_profile(self):
        # Access AuthState instance to get the actual cookie value
        auth_state = await self.get_state(AuthState)
        cookies_dict = auth_state.session_cookies if auth_state.session_cookies else {}

        # Prepare payload
        payload = {
            "first_name": self.first_name,
            "last_name": self.last_name,
            "username": self.username,
            "email": self.email,
            "phone_no": self.phone_number,
            "gender": self.gender,
            "date_of_birth": self.birthday,
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.put(
                    f"{API_BASE_URL}/users/profile/update/",
                    json=payload,
                    cookies=cookies_dict,
                    timeout=5.0,
                )

            if response.status_code == 200:
                data = response.json()
                print(f"Profile updated: {data}")
                # Reload user data
                await self.load_user_data()
            else:
                print(f"Failed to update profile: {response.text}")

        except Exception as e:
            print(f"Error updating profile: {str(e)}")

    async def load_user_data(self):
        """Fetch user profile from backend"""
        auth_state = await self.get_state(AuthState)

        if not auth_state.is_logged_in:
            return

        cookies_dict = auth_state.session_cookies if auth_state.session_cookies else {}

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{API_BASE_URL}/users/profile/", cookies=cookies_dict, timeout=5.0
                )
            if response.status_code == 200:
                data = response.json()
                user = data.get("user_profile", {})

                # DEBUG: Print the entire user object
                print("=== USER DATA ===")
                print(f"Full user object: {user}")
                print(f"Profile pic raw: {user.get('profilePic', 'NOT FOUND')}")
                print(f"All keys: {user.keys()}")

                self.first_name = user.get("first_name", "")
                self.last_name = user.get("last_name", "")
                self.username = user.get("username", "")
                self.email = user.get("email", "")
                self.phone_number = user.get("phone_no", "")
                self.gender = user.get("gender", "")
                self.birthday = user.get("date_of_birth", "")

                profile_pic = user.get("profilePic", "")
                if profile_pic:
                    # Check if it already has the data URI prefix
                    if profile_pic.startswith("data:image"):
                        self.profile_picture = profile_pic
                    else:
                        self.profile_picture = f"data:image/png;base64,{profile_pic}"
                    print(
                        f"Profile picture set to: {self.profile_picture[:100]}..."
                    )  # Print first 100 chars
                else:
                    self.profile_picture = ""
                    print("Profile picture is empty")

        except Exception as e:
            print(f"Error loading user data: {str(e)}")

    async def handle_upload(self, files: Any):
        """Handle file upload from Reflex upload component"""
        print(f"=== UPLOAD DEBUG ===")
        print(f"Files received: {files}")
        print(f"Files type: {type(files)}")

        if not files:
            self.upload_error = "No file selected"
            return

        try:
            self.is_uploading = True
            self.upload_error = ""

            # Get the first file
            upload_file = files[0] if isinstance(files, list) else files

            print(f"Upload file: {upload_file}")
            print(f"Upload file type: {type(upload_file)}")
            print(f"Upload file dir: {dir(upload_file)}")

            # Check various possible formats
            if hasattr(upload_file, "read"):
                # It's an UploadFile object with read method
                print("Has read method - treating as UploadFile")
                file_content = await upload_file.read()
                filename = getattr(upload_file, "filename", "profile.png")
                content_type = getattr(upload_file, "type", "image/png")
            elif isinstance(upload_file, str):
                # It's a file path string
                print(f"File path received: {upload_file}")
                with open(upload_file, "rb") as f:
                    file_content = f.read()
                filename = os.path.basename(upload_file)
                ext = filename.split(".")[-1].lower()
                content_type = "image/jpeg" if ext in ["jpg", "jpeg"] else "image/png"
            elif isinstance(upload_file, bytes):
                # It's raw bytes
                print("Raw bytes received")
                file_content = upload_file
                filename = "profile.png"
                content_type = "image/png"
            else:
                # Unknown format
                print(f"Unknown format: {type(upload_file)}")
                self.upload_error = f"Unexpected file format: {type(upload_file)}"
                self.is_uploading = False
                return

            # Validate file type
            if content_type not in ["image/png", "image/jpeg", "image/jpg"]:
                self.upload_error = "Invalid file type. Only PNG and JPEG are allowed."
                self.is_uploading = False
                return

            # Validate file size (5MB limit)
            if len(file_content) > 5 * 1024 * 1024:
                self.upload_error = "Profile picture exceeds size limit of 5MB"
                self.is_uploading = False
                return

            # Upload to backend
            await self.upload_profile_picture_with_content(
                file_content, filename, content_type
            )

        except Exception as e:
            self.upload_error = f"Error handling upload: {str(e)}"
            print(f"Error in handle_upload: {str(e)}")
            import traceback

            traceback.print_exc()
            self.is_uploading = False

    async def upload_profile_picture_with_content(
        self, file_content: bytes, filename: str, content_type: str
    ):
        """Upload profile picture to backend with file content"""
        auth_state = await self.get_state(AuthState)
        cookies_dict = auth_state.session_cookies if auth_state.session_cookies else {}

        try:
            # Create form data with the file content
            files_data = {"profile_picture": (filename, file_content, content_type)}

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{API_BASE_URL}/users/profile/upload_profile_picture/",
                    files=files_data,
                    cookies=cookies_dict,
                    timeout=10.0,
                )

            if response.status_code == 200:
                print("Profile picture uploaded successfully")
                # Reload user data to get new profile picture
                await self.load_user_data()
                self.upload_error = ""
            else:
                error_msg = (
                    response.json().get("error", "Unknown error")
                    if response.text
                    else "Unknown error"
                )
                self.upload_error = f"Failed to upload: {error_msg}"
                print(f"Upload failed: {response.text}")

        except Exception as e:
            self.upload_error = f"Error uploading profile picture: {str(e)}"
            print(f"Error uploading profile picture: {str(e)}")
        finally:
            self.is_uploading = False


def profile_avatar_section() -> rx.Component:
    """Profile avatar with upload functionality"""
    return rx.vstack(
        rx.center(
            rx.cond(
                ProfileState.profile_picture != "",
                rx.image(
                    src=ProfileState.profile_picture,
                    width="120px",
                    height="120px",
                    border_radius="full",
                    object_fit="cover",
                    border="4px solid #E5E7EB",
                ),
                rx.avatar(
                    fallback=rx.cond(
                        ProfileState.username != "",
                        ProfileState.username[0:2].upper(),
                        "U",
                    ),
                    size="8",
                    radius="full",
                    color_scheme="blue",
                ),
            ),
            width="100%",
            padding="20px 0px",
        ),
        # Upload component with button
        rx.upload(
            rx.button(
                rx.icon("camera", size=16),
                "Change Photo",
                size="1",
                variant="soft",
                cursor="pointer",
            ),
            id="profile_picture_upload",
            accept={
                "image/png": [".png"],
                "image/jpeg": [".jpg", ".jpeg"],
            },
            max_files=1,
            on_drop=ProfileState.handle_upload,
        ),
        # Username display
        rx.center(
            rx.text(
                rx.cond(ProfileState.username != "", ProfileState.username, "User"),
                font_size="18px",
                font_weight="bold",
                color="#22282C",
            ),
            width="100%",
        ),
        # Upload status messages
        rx.cond(
            ProfileState.is_uploading,
            rx.center(
                rx.spinner(size="2"),
                rx.text("Uploading...", font_size="12px", color="#6B7280"),
                spacing="2",
                width="100%",
            ),
            rx.fragment(),
        ),
        rx.cond(
            ProfileState.upload_error != "",
            rx.center(
                rx.text(
                    ProfileState.upload_error,
                    font_size="12px",
                    color="#EF4444",
                    text_align="center",
                ),
                width="100%",
                padding="0 10px",
            ),
            rx.fragment(),
        ),
        spacing="3",
        width="100%",
    )


def profile_content() -> rx.Component:
    return rx.hstack(
        rx.box(
            rx.vstack(
                profile_avatar_section(),
                rx.vstack(
                    nav_button("Personal Information", "profile"),
                    nav_button("My Address", "address"),
                    nav_button("Wishlist", "wishlist"),
                    nav_button("My Orders", "orders"),
                    nav_button("My Reviews", "reviews"),
                    nav_button("Notification", "notification"),
                    rx.link("Logout", href="/logout", style=menu_item_style(False)),
                    spacing="3",
                ),
            ),
            width="280px",
            height="100%",
            bg="#F9FAFB",
        ),
        rx.box(
            rx.match(
                ProfileState.active_section,
                ("profile", profile_info_content()),
                ("address", address_content()),
                ("wishlist", wishlist_content()),
                ("orders", orders_content()),
                ("reviews", reviews_content()),
                ("notification", notification_content()),
                profile_info_content(),
            ),
            flex="1",
            padding="40px",
            bg="white",
        ),
        # Password Change Modal
        password_change_modal(),
        width="100%",
        height="100%",
    )


def nav_button(text: str, section: str) -> rx.Component:
    return rx.button(
        text,
        on_click=lambda: ProfileState.set_section(section),
        style=rx.cond(
            ProfileState.active_section == section,
            menu_item_style(True),
            menu_item_style(False),
        ),
        color="#22282c",
    )


def profile_info_content() -> rx.Component:
    return rx.vstack(
        rx.center(
            rx.text(
                "Personal Information",
                font_size="20px",
                font_weight="bold",
                margin_bottom="20px",
                color="#22282c",
            ),
            width="100%",
        ),
        rx.hstack(
            input_with_label(
                "First Name",
                value=ProfileState.first_name,
                on_change=ProfileState.set_first_name,
            ),
            input_with_label(
                "Last Name",
                value=ProfileState.last_name,
                on_change=ProfileState.set_last_name,
            ),
            spacing="4",
            width="100%",
        ),
        input_with_label(
            "Username", ProfileState.username, on_change=ProfileState.set_username
        ),
        input_with_label(
            "E-mail", ProfileState.email, on_change=ProfileState.set_email
        ),
        input_with_label(
            "Mobile No.",
            ProfileState.phone_number,
            on_change=ProfileState.set_phone_number,
        ),
        rx.hstack(
            select_with_label(
                "Gender (Optional)",
                ["Male", "Female", "Other"],
                value=ProfileState.gender,
                on_change=ProfileState.set_gender,
            ),
            input_with_label_date(
                "Birthday (Optional)",
                ProfileState.birthday,
                on_change=ProfileState.set_birthday,
            ),
            spacing="4",
            width="100%",
        ),
        rx.button(
            "Save",
            width="100%",
            bg="#22282C",
            color="white",
            border_radius="8px",
            padding="20px",
            cursor="pointer",
            on_click=ProfileState.save_profile,
        ),
        rx.button(
            "Change Password",
            on_click=ProfileState.open_password_form,
            width="100%",
            variant="outline",
            border_radius="8px",
            margin_top="12px",
            padding="30px",
            color="#22282c",
            border="0.5px solid #929FA7",
        ),
        spacing="5",
        width="100%",
    )


def password_change_modal() -> rx.Component:
    return rx.cond(
        ProfileState.show_password_form,
        rx.box(
            rx.box(
                rx.vstack(
                    rx.box(
                        rx.icon(
                            tag="x",
                            size=28,
                            color="#6B7280",
                            cursor="pointer",
                            on_click=ProfileState.close_password_form,
                            _hover={"color": "#22282C"},
                        ),
                        width="100%",
                        display="flex",
                        justify_content="flex-end",
                    ),
                    rx.center(
                        rx.text(
                            "Change Password",
                            font_size="24px",
                            font_weight="bold",
                            color="#22282C",
                        ),
                        width="100%",
                    ),
                    rx.text(
                        "Please enter a new password",
                        font_size="16px",
                        color="#22282C",
                    ),
                    # Current Password Field
                    rx.vstack(
                        rx.text(
                            "Current Password",
                            font_size="16px",
                            font_weight="600",
                            color="#22282C",
                        ),
                        rx.box(
                            rx.input(
                                type=rx.cond(
                                    ProfileState.show_current_password,
                                    "text",
                                    "password",
                                ),
                                placeholder="Enter a password ( at least 6 characters )",
                                value=ProfileState.current_password,
                                on_change=ProfileState.set_current_password,
                                width="100%",
                                padding="5px",
                                border="1px solid #D1D5DB",
                                border_radius="12px",
                                font_size="16px",
                                color="#22282C",
                                name="current_password",
                                id="current_password",
                                background_color="#ffffff",
                            ),
                            rx.icon(
                                tag=rx.cond(
                                    ProfileState.show_current_password, "eye-off", "eye"
                                ),
                                size=24,
                                color="#9CA3AF",
                                position="absolute",
                                right="18px",
                                top="50%",
                                transform="translateY(-50%)",
                                cursor="pointer",
                                on_click=ProfileState.toggle_current_password,
                                _hover={"color": "#6B7280"},
                            ),
                            position="relative",
                            width="100%",
                        ),
                        spacing="2",
                        width="100%",
                        align_items="flex-start",
                    ),
                    rx.box(
                        rx.text(
                            "Forget Password ?",
                            font_size="16px",
                            color="#EF4444",
                            cursor="pointer",
                            _hover={"text_decoration": "underline"},
                        ),
                        width="100%",
                        text_align="right",
                        margin_top="-20px",
                    ),
                    # New Password Field
                    rx.vstack(
                        rx.text(
                            "New Password",
                            font_size="16px",
                            font_weight="600",
                            color="#22282C",
                        ),
                        rx.box(
                            rx.input(
                                type=rx.cond(
                                    ProfileState.show_new_password, "text", "password"
                                ),
                                placeholder="Enter a password ( at least 6 characters )",
                                value=ProfileState.new_password,
                                on_change=ProfileState.set_new_password,
                                width="100%",
                                padding="5px",
                                border="1px solid #D1D5DB",
                                border_radius="12px",
                                font_size="16px",
                                color="#22282C",
                                name="new_password",
                                id="new_password",
                                background_color="#ffffff",
                            ),
                            rx.icon(
                                tag=rx.cond(
                                    ProfileState.show_new_password, "eye-off", "eye"
                                ),
                                size=24,
                                color="#9CA3AF",
                                position="absolute",
                                right="18px",
                                top="50%",
                                transform="translateY(-50%)",
                                cursor="pointer",
                                on_click=ProfileState.toggle_new_password,
                                _hover={"color": "#6B7280"},
                            ),
                            position="relative",
                            width="100%",
                        ),
                        spacing="2",
                        width="100%",
                        align_items="flex-start",
                    ),
                    # Confirm Password Field
                    rx.vstack(
                        rx.text(
                            "Confirm New Password",
                            font_size="16px",
                            font_weight="600",
                            color="#22282C",
                        ),
                        rx.box(
                            rx.input(
                                type=rx.cond(
                                    ProfileState.show_confirm_password,
                                    "text",
                                    "password",
                                ),
                                placeholder="Enter a password ( at least 6 characters )",
                                value=ProfileState.confirm_password,
                                on_change=ProfileState.set_confirm_password,
                                width="100%",
                                padding="5px",
                                border="1px solid #D1D5DB",
                                border_radius="12px",
                                font_size="16px",
                                color="#22282C",
                                name="confirm_new_password",
                                id="confirm_new_password",
                                background_color="#ffffff",
                            ),
                            rx.icon(
                                tag=rx.cond(
                                    ProfileState.show_confirm_password, "eye-off", "eye"
                                ),
                                size=24,
                                color="#9CA3AF",
                                position="absolute",
                                right="18px",
                                top="50%",
                                transform="translateY(-50%)",
                                cursor="pointer",
                                on_click=ProfileState.toggle_confirm_password,
                                _hover={"color": "#6B7280"},
                            ),
                            position="relative",
                            width="100%",
                        ),
                        spacing="2",
                        width="100%",
                        align_items="flex-start",
                    ),
                    rx.button(
                        "Change Password",
                        on_click=ProfileState.submit_password_change,
                        width="100%",
                        bg="#22282C",
                        color="white",
                        border_radius="12px",
                        padding="25px",
                        font_size="18px",
                        font_weight="600",
                        cursor="pointer",
                        margin_top="20px",
                        border="none",
                        _hover={"opacity": "0.9"},
                        margin_bottom="20px",
                    ),
                    spacing="6",
                    width="100%",
                ),
                bg="white",
                padding="20px 50px",
                border_radius="20px",
                width="600px",
                max_width="90vw",
                max_height="90vh",
                overflow_y="auto",
                box_shadow="0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                position="relative",
            ),
            position="fixed",
            top="0",
            left="0",
            right="0",
            bottom="0",
            bg="rgba(0, 0, 0, 0.5)",
            display="flex",
            align_items="center",
            justify_content="center",
            z_index="1001",
        ),
    )


import json


class Address(rx.Base):
    id: int
    address: str
    is_default: bool = False


class AddressState(rx.State):
    show_form: bool = False
    addresses: list[Address] = []
    new_address: str = ""
    editing_address_id: int = 0
    is_loading: bool = False
    error_message: str = ""
    success_message: str = ""

    def start_edit_address(self, address_id: int, current_address: str):
        self.editing_address_id = address_id
        self.show_form = True  # reuse the form modal for editing
        self.new_address = current_address  # pre-fill with existing address
        print(f"Starting edit for address ID {address_id}: {current_address}")

    def toggle_form(self):
        """Toggle visibility of the address form."""
        self.show_form = True
        self.editing_address_id = 0  # Reset editing state
        self.new_address = ""  # Clear input field
        print("Opening address form.")

    def close_form(self):
        """Close the address form and clear input."""
        self.show_form = False
        self.new_address = ""
        self.editing_address_id = 0  # Reset editing state

    def set_new_address(self, value: str):
        """Update the new_address field."""
        self.new_address = value

    async def save_address(self):
        """Save address (add new or update existing)."""
        if self.editing_address_id == 0:
            # Adding new address
            await self.add_address()
        else:
            # Editing existing address
            await self.edit_address(self.editing_address_id, self.new_address)

    async def add_address(self):
        auth_state = await self.get_state(AuthState)
        cookies_dict = auth_state.session_cookies if auth_state.session_cookies else {}

        if not self.new_address.strip():
            print("No address entered. Skipping.")
            return

        data = {"address": self.new_address.strip(), "is_default": False}
        print("Sending new address to backend:", data)

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{API_BASE_URL}/users/address/add/",
                    data=data,
                    cookies=cookies_dict,
                )
            print("POST response status:", response.status_code)

            if response.status_code == 201:
                # Reload addresses
                await self.load_addresses()
                self.new_address = ""
                self.show_form = False
                self.editing_address_id = 0
                print("Address added successfully.")
            else:
                print("Error adding address:", response.text)
        except Exception as e:
            print("Request failed:", e)

    async def load_addresses(self):
        """Fetch existing addresses from backend when the page loads."""
        auth_state = await self.get_state(AuthState)
        cookies_dict = auth_state.session_cookies if auth_state.session_cookies else {}

        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    f"{API_BASE_URL}/users/address/",
                    cookies=cookies_dict,
                )
            if res.status_code == 200:
                addresses_data = res.json()
                addresses_list = addresses_data.get("addresses", [])
                self.addresses = [
                    Address(
                        id=addr.get("id", 0),
                        address=addr.get("address", ""),
                        is_default=addr.get("is_default", False),
                    )
                    for addr in addresses_list
                ]
                print("Addresses loaded:", self.addresses)
            else:
                print("Failed to fetch addresses:", res.text)
        except Exception as e:
            print("Request failed:", e)

    async def delete_address(self, address_id: int):
        auth_state = await self.get_state(AuthState)
        cookies_dict = auth_state.session_cookies or {}

        # Make DELETE request
        async with httpx.AsyncClient() as client:
            response = await client.request(
                "DELETE",
                f"{API_BASE_URL}/users/address/delete/",
                data=json.dumps({"address_id": address_id}),
                headers={"Content-Type": "application/json"},
                cookies=cookies_dict,
            )

        if response.status_code == 200:
            # Update reactive list safely
            new_addresses = [addr for addr in self.addresses if addr.id != address_id]
            self.addresses = new_addresses
        else:
            print("Failed to delete address:", response.text)

    async def edit_address(self, address_id: int, new_address: str):
        auth_state = await self.get_state(AuthState)
        cookies_dict = auth_state.session_cookies or {}

        if not new_address.strip():
            print("No address entered. Skipping.")
            return

        try:
            async with httpx.AsyncClient() as client:
                response = await client.request(
                    "PUT",
                    f"{API_BASE_URL}/users/address/edit/",
                    data=json.dumps(
                        {"address_id": address_id, "address": new_address.strip()}
                    ),
                    headers={"Content-Type": "application/json"},
                    cookies=cookies_dict,
                )

            if response.status_code == 200:
                # Reload addresses from backend
                await self.load_addresses()
                self.new_address = ""
                self.show_form = False
                self.editing_address_id = 0
                print("Address updated successfully.")
            else:
                print("Failed to edit address:", response.text)
        except Exception as e:
            print("Request failed:", e)

    async def set_default_address(self, address_id: int):
        """Set an address as the default address"""
        self.is_loading = True
        self.error_message = ""
        self.success_message = ""
        auth_state = await self.get_state(AuthState)
        cookies_dict = auth_state.session_cookies or {}

        try:
            # Make PUT request to set default address
            async with httpx.AsyncClient() as client:
                response = await client.put(
                    f"{API_BASE_URL}/users/address/set_default/",
                    json={"address_id": address_id},
                    headers={"Content-Type": "application/json"},
                    cookies=cookies_dict,
                    timeout=10.0,
                )

                if response.status_code == 200:
                    self.success_message = "Default address updated successfully"

                    updated_addresses = []
                    for addr in self.addresses:
                        addr_copy = addr.copy()
                        if addr_copy["id"] == address_id:
                            addr_copy["is_default"] = True
                        else:
                            addr_copy["is_default"] = False
                        updated_addresses.append(addr_copy)

                    # Assign the new list to trigger state update
                    self.addresses = updated_addresses

                elif response.status_code == 401:
                    self.error_message = "Authentication required"
                elif response.status_code == 403:
                    self.error_message = "Only customers can manage addresses"
                elif response.status_code == 404:
                    self.error_message = "Address not found"
                else:
                    data = response.json()
                    self.error_message = data.get(
                        "error", "Failed to set default address"
                    )

        except httpx.TimeoutException:
            self.error_message = "Request timed out. Please try again."
        except httpx.RequestError as e:
            self.error_message = f"Connection error: {str(e)}"
        except Exception as e:
            self.error_message = f"An error occurred: {str(e)}"
        finally:
            self.is_loading = False


def new_address_modal() -> rx.Component:
    return rx.cond(
        AddressState.show_form,
        rx.box(
            rx.box(
                rx.vstack(
                    # Close button
                    rx.box(
                        rx.icon(
                            tag="x",
                            size=28,
                            color="#6B7280",
                            cursor="pointer",
                            on_click=AddressState.close_form,
                            _hover={"color": "#22282C"},
                        ),
                        width="100%",
                        display="flex",
                        justify_content="flex-end",
                    ),
                    # Modal Title (changes based on mode)
                    rx.center(
                        rx.cond(
                            AddressState.editing_address_id == 0,
                            rx.text(
                                "Add New Address",
                                font_size="24px",
                                font_weight="bold",
                                color="#22282C",
                            ),
                            rx.text(
                                "Edit Address",
                                font_size="24px",
                                font_weight="bold",
                                color="#22282C",
                            ),
                        ),
                        width="100%",
                    ),
                    rx.cond(
                        AddressState.editing_address_id == 0,
                        rx.text(
                            "Please enter your new address",
                            font_size="16px",
                            color="#22282C",
                        ),
                        rx.text(
                            "Update your address",
                            font_size="16px",
                            color="#22282C",
                        ),
                    ),
                    # Address Input Field
                    rx.vstack(
                        rx.input(
                            placeholder="Enter your address...",
                            value=AddressState.new_address,
                            on_change=AddressState.set_new_address,
                            width="100%",
                            padding="5px",
                            border="1px solid #D1D5DB",
                            border_radius="12px",
                            font_size="16px",
                            background_color="#ffffff",
                            color="#22282C",
                        ),
                        spacing="2",
                        width="100%",
                        align_items="flex-start",
                    ),
                    # Submit Button (text changes based on mode)
                    rx.button(
                        rx.cond(
                            AddressState.editing_address_id == 0,
                            "Save Address",
                            "Update Address",
                        ),
                        on_click=AddressState.save_address,
                        width="100%",
                        bg="#2E6FF2",
                        color="white",
                        border_radius="12px",
                        padding="15px",
                        font_size="16px",
                        font_weight="600",
                        cursor="pointer",
                        _hover={"opacity": "0.9"},
                        margin_top="20px",
                    ),
                    spacing="4",
                    width="100%",
                ),
                bg="white",
                padding="20px 40px",
                border_radius="20px",
                width="500px",
                max_width="90vw",
                box_shadow="0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
                position="relative",
            ),
            position="fixed",
            top="0",
            left="0",
            right="0",
            bottom="0",
            bg="rgba(0, 0, 0, 0.5)",
            display="flex",
            align_items="center",
            justify_content="center",
            z_index="1001",
        ),
    )


def address_card(address: dict):
    return rx.box(
        rx.vstack(
            # Row 1: Name + Edit/Delete buttons
            rx.hstack(
                rx.text(
                    f"{ProfileState.first_name} {ProfileState.last_name}",
                    font_weight="bold",
                    color="#22282C",
                ),
                rx.spacer(),
                rx.hstack(
                    rx.icon(
                        "pencil",
                        size=18,
                        color="#2E6FF2",
                        cursor="pointer",
                        on_click=lambda: AddressState.start_edit_address(
                            address["id"], address["address"]
                        ),
                    ),
                    rx.text(
                        "Edit",
                        font_weight="semibold",
                        color="#2E6FF2",
                        cursor="pointer",
                        on_click=lambda: AddressState.start_edit_address(
                            address["id"], address["address"]
                        ),
                    ),
                    rx.icon(
                        "trash",
                        size=18,
                        color="#FF4D4D",
                        cursor="pointer",
                        on_click=lambda: AddressState.delete_address(address["id"]),
                    ),
                    rx.text(
                        "Delete",
                        font_weight="semibold",
                        color="#FF4D4D",
                        cursor="pointer",
                        on_click=lambda: AddressState.delete_address(address["id"]),
                    ),
                    spacing="3",
                    align="center",
                ),
                align="center",
                width="100%",
            ),
            # Row 2: Phone number
            rx.text(ProfileState.phone_number, color="#555", mt="5px"),
            rx.hstack(
                # Left side: address with icon
                rx.hstack(
                    rx.icon("map-pin", color="#2E6FF2"),
                    rx.text(address["address"], font_weight="medium", color="#22282C"),
                    align="center",
                    spacing="2",
                ),
                # Right side: default indicator or button
                rx.cond(
                    address["is_default"],
                    rx.text("Default Address", font_weight="bold", color="green"),
                    rx.button(
                        "Set as Default",
                        font_weight="bold",
                        color="white",
                        bg="#2E6FF2",
                        border_radius="5px",
                        padding="6px 12px",
                        cursor="pointer",
                        _hover={"opacity": "0.9"},
                        on_click=lambda: AddressState.set_default_address(
                            address["id"]
                        ),
                    ),
                ),
                justify="between",  # Spread items left/right
                align="center",
                width="100%",
                mt="5px",
            ),
        ),
        # Card styling
        border="1px solid #E0E0E0",
        border_radius="10px",
        padding="20px",
        width="100%",
        background_color="white",
        box_shadow="sm",
        mt="15px",
    )


def address_content() -> rx.Component:
    return rx.vstack(
        rx.center(
            rx.text(
                "My Address",
                font_size="20px",
                font_weight="bold",
                margin_bottom="20px",
                color="#22282c",
            ),
            width="100%",
        ),
        # Add New Address Button
        rx.button(
            "Add New Address",
            on_click=AddressState.toggle_form,
            background_color="#2E6FF2",
            color="white",
            border_radius="5px",
            padding="20px 10px",
            margin_bottom="20px",
            align_self="flex-end",
            font_weight="bold",
            cursor="pointer",
        ),
        # Address Form Modal
        new_address_modal(),
        # Dynamic Address List
        rx.foreach(AddressState.addresses, lambda a: address_card(a)),
        spacing="2",
        width="100%",
        on_mount=AddressState.load_addresses,
    )


def wishlist_content() -> rx.Component:
    return rx.vstack(
        rx.center(
            rx.text(
                "Wishlist",
                font_size="20px",
                font_weight="bold",
                margin_bottom="20px",
                color="#22282c",
            ),
            width="100%",
        ),
        rx.text("Your wishlist items will appear here...", color="#22282c"),
        spacing="5",
        width="100%",
    )


def orders_content() -> rx.Component:
    return rx.vstack(
        rx.center(
            rx.text(
                "My Orders",
                font_size="20px",
                font_weight="bold",
                margin_bottom="20px",
                color="#22282c",
            ),
            width="100%",
        ),
        rx.text("Your order history will appear here...", color="#22282c"),
        spacing="5",
        width="100%",
    )


def reviews_content() -> rx.Component:
    return rx.vstack(
        rx.center(
            rx.text(
                "My Reviews",
                font_size="20px",
                font_weight="bold",
                margin_bottom="20px",
                color="#22282c",
            ),
            width="100%",
        ),
        rx.text("Your reviews will appear here...", color="#22282c"),
        spacing="5",
        width="100%",
    )


def notification_content() -> rx.Component:
    return rx.vstack(
        rx.center(
            rx.text(
                "Notifications",
                font_size="20px",
                font_weight="bold",
                margin_bottom="20px",
                color="#22282c",
            ),
            width="100%",
        ),
        rx.text("Your notifications will appear here...", color="#22282c"),
        spacing="5",
        width="100%",
    )


def input_with_label(
    label: str, value: str = "", on_change: Optional[Callable] = None
) -> rx.Component:
    return rx.vstack(
        rx.text(label, font_size="14px", font_weight="500", margin_bottom="4px"),
        rx.input(
            value=value,  # reactive binding
            placeholder=label,
            width="100%",
            style=input_style,
            on_change=on_change,  # update state on user input
        ),
        spacing="1",
        width="100%",
        color="#22282c",
    )


def input_with_label_date(
    label: str, value: str = "", on_change: Optional[Callable] = None
) -> rx.Component:
    return rx.vstack(
        rx.text(label, font_size="14px", font_weight="500", margin_bottom="4px"),
        rx.input(
            type="date",
            value=value,  # use `value` instead of default_value
            placeholder=label,
            width="100%",
            style=input_style,
            on_change=on_change,  # reactive binding
        ),
        spacing="1",
        width="100%",
        color="#22282c",
    )


def select_with_label(
    label: str,
    options: list[str],
    value: str = "",
    on_change: Optional[Callable] = None,
) -> rx.Component:
    return rx.vstack(
        rx.text(label, font_size="14px", font_weight="500", margin_bottom="4px"),
        rx.select(
            options, value=value, placeholder=label, width="100%", on_change=on_change
        ),
        spacing="1",
        width="100%",
        color="#22282c",
    )


def menu_item_style(active: bool = False):
    return {
        "padding": "12px",
        "font_size": "15px",
        "text_decoration": "none",
        "width": "280px",
        "border": "none",
        "cursor": "pointer",
        "text_align": "left",
        "background_color": "#F9FAFB" if active else "white",
        "color": "#22282C" if active else "#6B7280",
        "font_weight": "600" if active else "400",
        "_hover": {"background_color": "#F3F4F6", "color": "#22282C"},
    }


def profile_page() -> rx.Component:
    return rx.box(template(profile_content), on_mount=ProfileState.load_user_data)


input_style = {
    "color": "#22282C",
    "background_color": "white",
    "border": "1px solid #929FA7",
    "border_radius": "8px",
}
