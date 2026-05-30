from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./greenhouse.db"
    SECRET_KEY: str = "change-this-secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"
    CELERY_TASK_ALWAYS_EAGER: bool = False

    CORS_ORIGINS: str = "http://localhost:3000"

    # Mail (Resend API — preferred)
    RESEND_API_KEY: str = ""
    MAIL_FROM: str = "onboarding@resend.dev"
    MAIL_FROM_NAME: str = "TeplytsiaPlan"
    MAIL_ENABLED: bool = False

    # Mail (SMTP fallback)
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_PORT: int = 587

    class Config:
        env_file = ".env"


settings = Settings()
