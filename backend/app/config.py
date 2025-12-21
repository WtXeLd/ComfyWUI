"""
Configuration management for ComfyUI Webapp
"""
from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""

    # ComfyUI Configuration
    comfyui_base_url: str = "http://localhost:8188"

    # Google AI Configuration
    google_api_key: Optional[str] = None

    # Data Storage
    data_path: Path = Path("./data")
    workflows_path: Path = Path("./data/workflows")
    images_path: Path = Path("./data/images")
    metadata_path: Path = Path("./data/metadata")
    api_keys_file: Path = Path("./data/api_keys.json")

    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8290

    # CORS - Allow all origins (use ["*"] for development, specify domains in production)
    cors_origins: list[str] = ["*"]

    class Config:
        env_file = ".env"
        case_sensitive = False

    def initialize_directories(self):
        """Create necessary directories if they don't exist"""
        self.data_path.mkdir(exist_ok=True)
        self.workflows_path.mkdir(parents=True, exist_ok=True)
        self.images_path.mkdir(parents=True, exist_ok=True)
        self.metadata_path.mkdir(parents=True, exist_ok=True)


# Global settings instance
settings = Settings()
