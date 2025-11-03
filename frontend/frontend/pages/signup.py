"""import reflex as rx


def signup_multiple_thirdparty() -> rx.Component:
    return rx.center(
    rx.card(
        rx.vstack(
                rx.flex(
                    rx.heading(
                        "Create an account",
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
                        rx.link("Sign in", href="#", size="3"),
                        spacing="2",
                        opacity="0.8",
                        width="100%",


                    ),

                    direction="column",
                    spacing="4",
                    width="100%",
                    margin_bottom="-1rem"

            ),
            rx.hstack(

            rx.vstack(
                rx.text(
                    "First name",
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
                    placeholder="John",
                    type="text",
                    size="3",
                    width="100%",
                    style=input_style,
                ),
                spacing="2",
                width="100%",
            ),

            rx.vstack(
                rx.text(
                    "Last name",
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
                    placeholder="Doe",
                    type="text",
                    size="3",
                    width="100%",
                    style=input_style,
                ),
                spacing="2",
                width="100%",
            ),
            spacing="4",
            width="100%",
            margin_bottom="-1.5rem"
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
                    "Phone Number",
                    size="3",
                    weight="medium",
                    text_align="left",
                    width="100%",
                    color="#22282C",
                ),
                rx.input(
                    rx.input.slot(rx.icon("phone",style={"color":"#929FA7","width":"20px","height":"20px"})),
                    placeholder="0978987698",
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
                    "Password",
                    size="3",
                    weight="medium",
                    text_align="left",
                    width="100%",
                    color="#22282C",
                ),
                rx.input(
                    rx.input.slot(rx.icon("lock",style={"color":"#929FA7","width":"20px","height":"20px"})),
                    placeholder="Enter your password",
                    type="password",
                    size="3",
                    width="100%",
                    style = input_style

                ),
                justify="start",
                spacing="2",
                width="100%",
                margin_bottom="-1.5rem"
            ),
             rx.vstack(
                rx.text(
                    "Confirm Password",
                    size="3",
                    weight="medium",
                    text_align="left",
                    width="100%",
                    color="#22282C",
                ),
                rx.input(
                    rx.input.slot(rx.icon("lock",style={"color":"#929FA7","width":"20px","height":"20px"})),
                    placeholder="Confirm your password",
                    type="password",
                    size="3",
                    width="100%",
                    style = input_style

                ),
                justify="start",
                spacing="2",
                width="100%",
                margin_bottom="-1.5rem"
            ),
           rx.hstack(
                rx.checkbox(default_checked=True),
                rx.text(
                    "I Agree to Terms and Conditions",
                    size="3",
                    color="#929FA7",
                ),
                spacing="2",
                align_items="center"
            ),
            rx.button("Sign Up", size="3", width="100%",background_color="#22282C", border_radius = "8px", _hover={"background_color": "white", "color": "#22282C","border":"1px solid #929FA7"},on_click=rx.redirect("/login")),
            rx.hstack(
                rx.divider(margin="0",style=divider_style),
                rx.text(
                    "Or Sign Up with",
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
        size="4",
        max_width="28em",
        width="100%",
        style=background_style
    ),
    height="100%",

    )


border_style = {
    "border_radius": "100px" ,
    "color":"#22282C",
    "background_color":"white",
    "border": "1px solid #929FA7"}

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

divider_style = {
    "border_color": "#E9EBEC",
    "border_width": "1px",
    "width": "100%",
}

"""

import reflex as rx
import httpx
import re
from ..config import API_BASE_URL


class SignupState(rx.State):
    first_name: str = ""
    last_name: str = ""
    username: str = ""
    email: str = ""
    phone_no: str = ""
    password: str = ""
    confirm_password: str = ""
    agree_terms: bool = False

    # Loading and message states
    is_loading: bool = False
    error_message: str = ""
    success_message: str = ""

    # Field-specific error states for better UX
    username_error: str = ""
    email_error: str = ""
    phone_error: str = ""
    password_error: str = ""

    # Password strength indicator
    password_strength: str = ""
    password_strength_color: str = ""

    def set_first_name(self, value: str):
        self.first_name = value

    def set_last_name(self, value: str):
        self.last_name = value

    def set_username(self, value: str):
        self.username = value
        self.username_error = ""
        # Basic username validation
        if value and len(value) < 3:
            self.username_error = "Username must be at least 3 characters"
        elif value and not re.match(r"^[a-zA-Z0-9_]+$", value):
            self.username_error = (
                "Username can only contain letters, numbers, and underscores"
            )

    def set_email(self, value: str):
        self.email = value
        self.email_error = ""
        # Basic email validation
        if value and not re.match(
            r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", value
        ):
            self.email_error = "Please enter a valid email address"

    def set_phone_no(self, value: str):
        self.phone_no = value
        self.phone_error = ""
        # Basic phone validation (adjust regex based on your region)
        if value and not re.match(r"^[0-9+\-\s()]{8,}$", value):
            self.phone_error = "Please enter a valid phone number"

    def set_password(self, value: str):
        self.password = value
        self.password_error = ""

        # Password strength checker
        if not value:
            self.password_strength = ""
            self.password_strength_color = ""
        elif len(value) < 6:
            self.password_strength = "Too short"
            self.password_strength_color = "red"
            self.password_error = "Password must be at least 6 characters"
        elif len(value) < 8:
            self.password_strength = "Weak"
            self.password_strength_color = "orange"
        elif (
            len(value) < 10
            or not any(c.isupper() for c in value)
            or not any(c.isdigit() for c in value)
        ):
            self.password_strength = "Medium"
            self.password_strength_color = "yellow"
        else:
            self.password_strength = "Strong"
            self.password_strength_color = "green"

        # Check if passwords match
        if self.confirm_password and value != self.confirm_password:
            self.password_error = "Passwords do not match"

    def set_confirm_password(self, value: str):
        self.confirm_password = value
        self.password_error = ""
        if value and self.password != value:
            self.password_error = "Passwords do not match"

    def set_agree_terms(self, value: bool):
        self.agree_terms = value

    def validate_form(self) -> bool:
        """Validate all form fields before submission"""
        errors = []

        if not self.first_name.strip():
            errors.append("First name is required")

        if not self.last_name.strip():
            errors.append("Last name is required")

        if not self.username.strip():
            errors.append("Username is required")
        elif self.username_error:
            errors.append(self.username_error)

        if not self.email.strip():
            errors.append("Email is required")
        elif self.email_error:
            errors.append(self.email_error)

        if not self.phone_no.strip():
            errors.append("Phone number is required")
        elif self.phone_error:
            errors.append(self.phone_error)

        if not self.password:
            errors.append("Password is required")
        elif len(self.password) < 6:
            errors.append("Password must be at least 6 characters")

        if not self.confirm_password:
            errors.append("Please confirm your password")
        elif self.password != self.confirm_password:
            errors.append("Passwords do not match")

        if not self.agree_terms:
            errors.append("Please agree to terms and conditions")

        if errors:
            self.error_message = " • ".join(errors)
            return False

        return True

    async def handle_signup(self):
        """Handle signup form submission"""
        self.is_loading = True
        self.error_message = ""
        self.success_message = ""

        # Validate form
        if not self.validate_form():
            self.is_loading = False
            return

        try:
            form_data = {
                "first_name": self.first_name.strip(),
                "last_name": self.last_name.strip(),
                "username": self.username.strip(),
                "email": self.email.strip().lower(),
                "phone_no": self.phone_no.strip(),
                "password": self.password,
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{API_BASE_URL}/users/register/", data=form_data, timeout=10.0
                )

                if response.status_code == 201:
                    self.success_message = (
                        "Registration successful! Redirecting to login..."
                    )

                    # Clear form
                    self.first_name = ""
                    self.last_name = ""
                    self.username = ""
                    self.email = ""
                    self.phone_no = ""
                    self.password = ""
                    self.confirm_password = ""
                    self.agree_terms = False
                    self.password_strength = ""
                    self.password_strength_color = ""

                    # Redirect after a short delay
                    yield rx.redirect("/login")
                else:
                    try:
                        data = response.json()
                        self.error_message = data.get(
                            "error", "Registration failed. Please try again."
                        )
                    except:
                        self.error_message = (
                            f"Registration failed with status {response.status_code}"
                        )

        except httpx.TimeoutException:
            self.error_message = (
                "Request timed out. Please check your connection and try again."
            )
        except httpx.ConnectError:
            self.error_message = "Unable to connect to server. Please try again later."
        except Exception as e:
            self.error_message = f"An unexpected error occurred: {str(e)}"
        finally:
            self.is_loading = False


def form_field_with_validation(
    label: str,
    icon: str,
    placeholder: str,
    field_type: str,
    value,
    on_change,
    error_message,
    helper_text: str = "",
) -> rx.Component:
    """Reusable form field component with validation"""
    return rx.vstack(
        rx.text(
            label,
            size="3",
            weight="medium",
            text_align="left",
            width="100%",
            color="#22282C",
        ),
        rx.input(
            rx.input.slot(
                rx.icon(
                    icon, style={"color": "#929FA7", "width": "20px", "height": "20px"}
                )
            ),
            placeholder=placeholder,
            type=field_type,
            size="3",
            width="100%",
            color="#22282C",
            background_color="white",
            border_radius="8px",
            border=rx.cond(
                error_message != "",
                "1px solid #EF4444",
                "1px solid #929FA7",
            ),
            value=value,
            on_change=on_change,
        ),
        rx.cond(
            error_message != "",
            rx.text(
                error_message,
                size="2",
                color="#EF4444",
            ),
        ),
        rx.cond(
            (helper_text != "") & (error_message == ""),
            rx.text(
                helper_text,
                size="2",
                color="#929FA7",
            ),
        ),
        spacing="2",
        width="100%",
        margin_bottom="-1rem",
    )


def signup_page() -> rx.Component:
    return rx.center(
        rx.card(
            rx.vstack(
                # Error/Success Messages
                rx.cond(
                    SignupState.error_message != "",
                    rx.callout(
                        SignupState.error_message,
                        icon="triangle_alert",
                        color_scheme="red",
                        size="2",
                        width="100%",
                    ),
                ),
                rx.cond(
                    SignupState.success_message != "",
                    rx.callout(
                        SignupState.success_message,
                        icon="check",
                        color_scheme="green",
                        size="2",
                        width="100%",
                    ),
                ),
                # Header
                rx.flex(
                    rx.heading(
                        "Create an account",
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
                # First Name & Last Name
                rx.hstack(
                    form_field_with_validation(
                        "First name",
                        "user",
                        "John",
                        "text",
                        SignupState.first_name,
                        SignupState.set_first_name,
                        "",
                    ),
                    form_field_with_validation(
                        "Last name",
                        "user",
                        "Doe",
                        "text",
                        SignupState.last_name,
                        SignupState.set_last_name,
                        "",
                    ),
                    spacing="4",
                    width="100%",
                ),
                # Username
                form_field_with_validation(
                    "Username",
                    "user",
                    "myopapakyaw",
                    "text",
                    SignupState.username,
                    SignupState.set_username,
                    SignupState.username_error,
                    "Letters, numbers, and underscores only",
                ),
                # Email
                form_field_with_validation(
                    "Email address",
                    "mail",
                    "user@reflex.dev",
                    "email",
                    SignupState.email,
                    SignupState.set_email,
                    SignupState.email_error,
                ),
                # Phone Number
                form_field_with_validation(
                    "Phone Number",
                    "phone",
                    "0978987698",
                    "tel",
                    SignupState.phone_no,
                    SignupState.set_phone_no,
                    SignupState.phone_error,
                ),
                # Password with strength indicator
                rx.vstack(
                    rx.text(
                        "Password",
                        size="3",
                        weight="medium",
                        text_align="left",
                        width="100%",
                        color="#22282C",
                    ),
                    rx.input(
                        rx.input.slot(
                            rx.icon(
                                "lock",
                                style={
                                    "color": "#929FA7",
                                    "width": "20px",
                                    "height": "20px",
                                },
                            )
                        ),
                        placeholder="Enter your password",
                        type="password",
                        size="3",
                        width="100%",
                        color="#22282C",
                        background_color="white",
                        border_radius="8px",
                        border=rx.cond(
                            SignupState.password_error != "",
                            "1px solid #EF4444",
                            "1px solid #929FA7",
                        ),
                        value=SignupState.password,
                        on_change=SignupState.set_password,
                    ),
                    rx.cond(
                        SignupState.password_strength != "",
                        rx.hstack(
                            rx.text("Strength:", size="2", color="#929FA7"),
                            rx.text(
                                SignupState.password_strength,
                                size="2",
                                weight="bold",
                                color=rx.cond(
                                    SignupState.password_strength_color == "red",
                                    "#EF4444",
                                    rx.cond(
                                        SignupState.password_strength_color == "orange",
                                        "#F97316",
                                        rx.cond(
                                            SignupState.password_strength_color
                                            == "yellow",
                                            "#EAB308",
                                            "#10B981",
                                        ),
                                    ),
                                ),
                            ),
                            spacing="2",
                        ),
                    ),
                    rx.cond(
                        SignupState.password_error != "",
                        rx.text(
                            SignupState.password_error,
                            size="2",
                            color="#EF4444",
                        ),
                    ),
                    spacing="2",
                    width="100%",
                    margin_bottom="-1rem",
                ),
                # Confirm Password
                form_field_with_validation(
                    "Confirm Password",
                    "lock",
                    "Confirm your password",
                    "password",
                    SignupState.confirm_password,
                    SignupState.set_confirm_password,
                    "",
                ),
                # Terms and Conditions
                rx.hstack(
                    rx.checkbox(
                        checked=SignupState.agree_terms,
                        on_change=SignupState.set_agree_terms,
                    ),
                    rx.text(
                        "I agree to the ",
                        rx.link("Terms and Conditions", href="#", color="#3B82F6"),
                        size="3",
                        color="#929FA7",
                    ),
                    spacing="2",
                    align_items="center",
                ),
                # Sign Up Button
                rx.button(
                    rx.cond(
                        SignupState.is_loading,
                        rx.hstack(
                            rx.spinner(size="3"),
                            rx.text("Creating account..."),
                            spacing="2",
                        ),
                        rx.text("Sign Up"),
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
                    on_click=SignupState.handle_signup,
                    disabled=SignupState.is_loading,
                ),
                # Divider
                rx.hstack(
                    rx.divider(
                        margin="0",
                        border_color="#E9EBEC",
                        border_width="1px",
                        width="100%",
                    ),
                    rx.text(
                        "Or Sign Up with",
                        white_space="nowrap",
                        weight="medium",
                        color="#22282C",
                    ),
                    rx.divider(
                        margin="0",
                        border_color="#E9EBEC",
                        border_width="1px",
                        width="100%",
                    ),
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
            size="4",
            max_width="35em",
            width="100%",
            background_color="white",
        ),
        height="100vh",
        padding="4",
    )


border_style = {
    "border_radius": "100px",
    "color": "#22282C",
    "background_color": "white",
    "border": "1px solid #929FA7",
}

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

divider_style = {
    "border_color": "#E9EBEC",
    "border_width": "1px",
    "width": "100%",
}
