import reflex as rx
import httpx
from ..config import API_BASE_URL


class AdminSignupState(rx.State):
    """State management for admin signup form."""

    first_name: str = ""
    last_name: str = ""
    username: str = ""
    password: str = ""

    error_message: str = ""
    success_message: str = ""
    is_loading: bool = False

    async def handle_admin_signup(self):
        """Send signup request to Django backend."""
        self.is_loading = True
        self.error_message = ""
        self.success_message = ""

        data = {
            "first_name": self.first_name,
            "last_name": self.last_name,
            "username": self.username,
            "password": self.password,
        }

        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    f"{API_BASE_URL}/users/admin/register/", data=data
                )

            if res.status_code == 201:
                self.success_message = "Admin account created successfully!"
                self.first_name = self.last_name = self.username = self.password = ""
                yield rx.redirect("/login")
            elif res.status_code == 409:
                self.error_message = "Username already exists."
            else:
                self.error_message = res.json().get("error", "Something went wrong.")
        except Exception as e:
            self.error_message = f"Connection error: {e}"
        finally:
            self.is_loading = False


def form_field(
    label, icon_name, placeholder, field_value, set_field, field_type="text"
):
    """Reusable input field with consistent style."""
    return rx.vstack(
        rx.text(label, size="3", weight="medium", color="#22282C", width="100%"),
        rx.input(
            rx.input.slot(
                rx.icon(
                    icon_name,
                    style={"color": "#929FA7", "width": "20px", "height": "20px"},
                )
            ),
            placeholder=placeholder,
            type=field_type,
            size="3",
            width="100%",
            color="#22282C",
            background_color="white",
            border="1px solid #929FA7",
            border_radius="8px",
            value=field_value,
            on_change=set_field,
        ),
        width="100%",
        spacing="2",
    )


def adminsignup_page() -> rx.Component:
    return rx.center(
        rx.card(
            rx.vstack(
                # Error / Success messages
                rx.cond(
                    AdminSignupState.error_message != "",
                    rx.callout(
                        AdminSignupState.error_message,
                        icon="triangle_alert",
                        color_scheme="red",
                        size="2",
                        width="100%",
                    ),
                ),
                rx.cond(
                    AdminSignupState.success_message != "",
                    rx.callout(
                        AdminSignupState.success_message,
                        icon="check",
                        color_scheme="green",
                        size="2",
                        width="100%",
                    ),
                ),
                # Header
                rx.flex(
                    rx.heading(
                        "Create an Admin Account",
                        size="6",
                        as_="h2",
                        width="100%",
                        color="#22282C",
                        text_align="center",
                    ),
                    rx.hstack(
                        rx.text(
                            "Already registered?",
                            size="3",
                            text_align="left",
                            color="#22282C",
                        ),
                        rx.link("Sign in", href="/login", size="3"),
                        spacing="2",
                        opacity="0.8",
                        width="100%",
                    ),
                    direction="column",
                    spacing="4",
                    width="100%",
                    margin_bottom="-1rem",
                ),
                # Name fields
                rx.hstack(
                    form_field(
                        "First Name",
                        "user",
                        "John",
                        AdminSignupState.first_name,
                        AdminSignupState.set_first_name,
                    ),
                    form_field(
                        "Last Name",
                        "user",
                        "Doe",
                        AdminSignupState.last_name,
                        AdminSignupState.set_last_name,
                    ),
                    spacing="4",
                    width="100%",
                ),
                # Username
                form_field(
                    "Username",
                    "user",
                    "admin_username",
                    AdminSignupState.username,
                    AdminSignupState.set_username,
                ),
                # Password
                form_field(
                    "Password",
                    "lock",
                    "Enter password",
                    AdminSignupState.password,
                    AdminSignupState.set_password,
                    "password",
                ),
                # Register Button
                rx.button(
                    rx.cond(
                        AdminSignupState.is_loading,
                        rx.hstack(
                            rx.spinner(size="3"),
                            rx.text("Creating account..."),
                            spacing="2",
                        ),
                        rx.text("Sign Up as Admin"),
                    ),
                    size="3",
                    width="100%",
                    background_color="#22282C",
                    border_radius="8px",
                    _hover={
                        "background_color": "white",
                        "color": "#22282C",
                        "border": "1px solid #929FA7",
                    },
                    on_click=AdminSignupState.handle_admin_signup,
                    disabled=AdminSignupState.is_loading,
                ),
                spacing="6",
                width="100%",
            ),
            size="4",
            max_width="35em",
            width="100%",
            background_color="white",
        ),
        height="100vh",
        padding="4",
    )
