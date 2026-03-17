from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = False
    DEVICE: str = "cpu"
    LOAD_DEEPFAKE_MODELS: bool = True
    LOG_LEVEL: str = "INFO"

    # Featherless.ai LLM Settings
    FEATHERLESS_API_KEY: str = ""
    FEATHERLESS_MODEL: str = "meta-llama/Meta-Llama-3.1-8B-Instruct"

    # Twilio Settings
    TWILIO_AUTH_TOKEN: str = "your_twilio_auth_token_here"
    TWILIO_ACCOUNT_SID: str = "your_twilio_account_sid_here"
    TWILIO_PHONE_NUMBER: str = "your_twilio_phone_number_here"
    TWILIO_WHATSAPP_NUMBER: str | None = None
    ALERT_RECIPIENT_NUMBER: str | None = None
    TWILIO_VALIDATE_SIGNATURES: bool = True

    # PhishTank Settings
    PHISHTANK_API_KEY: str | None = None

    # MongoDB Settings
    MONGO_CONNECTION_STRING: str | None = None

    model_config = {
        "env_file": ".env",
        "extra": "ignore"
    }

settings = Settings()
