from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = False
    DEVICE: str = "cpu"
    LOAD_DEEPFAKE_MODELS: bool = True
    LOG_LEVEL: str = "INFO"

    # Twilio Settings
    TWILIO_AUTH_TOKEN: str = "your_twilio_auth_token_here"
    TWILIO_ACCOUNT_SID: str = "your_twilio_account_sid_here"
    TWILIO_PHONE_NUMBER: str = "your_twilio_phone_number_here"
    TWILIO_VALIDATE_SIGNATURES: bool = True

    # PhishTank Settings
    PHISHTANK_API_KEY: str | None = None

    model_config = {
        "env_file": ".env",
        "extra": "ignore"
    }

settings = Settings()
