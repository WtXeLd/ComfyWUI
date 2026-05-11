"""
Cloud provider configuration service
Manages cloud model configurations from config file
"""
import json
import logging
from pathlib import Path
from typing import List, Optional, Dict
from app.models.cloud_provider import CloudModelConfig, CloudProvider

logger = logging.getLogger(__name__)


class CloudConfigService:
    """Service for managing cloud provider configurations"""

    def __init__(self, config_path: Path):
        """
        Initialize cloud config service

        Args:
            config_path: Path to cloud_models.json
        """
        self.config_path = config_path
        self._models: List[CloudModelConfig] = []
        self._load_config()

    def _load_config(self):
        """Load cloud models configuration from file"""
        try:
            if not self.config_path.exists():
                # Create default config
                self._create_default_config()
                return

            with open(self.config_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self._models = [CloudModelConfig(**model) for model in data.get('models', [])]
                logger.info(f"Loaded {len(self._models)} cloud models from config")
        except Exception as e:
            logger.error(f"Failed to load cloud config: {e}")
            self._create_default_config()

    def _create_default_config(self):
        """Create default cloud models configuration"""
        default_models = [
            # Google AI Models
            CloudModelConfig(
                id="google-gemini-2.5-flash",
                name="Nano banana",
                provider=CloudProvider.GOOGLE_AI,
                model_id="gemini-2.5-flash-image",
                supports_resolution_tiers=False,
                supports_reference_image=True,
                aspect_ratios=["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"]
            ),
            CloudModelConfig(
                id="google-gemini-3-pro",
                name="Nano banana Pro",
                provider=CloudProvider.GOOGLE_AI,
                model_id="gemini-3-pro-image-preview",
                supports_resolution_tiers=True,
                supports_reference_image=True,
                aspect_ratios=["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"],
                resolution_tiers=["1K", "2K", "4K"]
            ),
            # Runware Models
            CloudModelConfig(
                id="runware-gpt-image-1",
                name="GPT Image 1",
                provider=CloudProvider.RUNWARE,
                model_id="openai:1@1",
                supports_resolution_tiers=False,
                supports_reference_image=True,
                aspect_ratios=["3:2"]
            ),
            CloudModelConfig(
                id="runware-gpt-image-2",
                name="GPT Image 2",
                provider=CloudProvider.RUNWARE,
                model_id="openai:gpt-image@2",
                supports_resolution_tiers=False,
                supports_reference_image=True,
                aspect_ratios=["3:2", "4:3"]
            ),
            CloudModelConfig(
                id="runware-gpt-image-1-mini",
                name="GPT Image 1 Mini",
                provider=CloudProvider.RUNWARE,
                model_id="openai:1@2",
                supports_resolution_tiers=False,
                supports_reference_image=True,
                aspect_ratios=["1:1", "2:3", "3:2"]
            ),
            CloudModelConfig(
                id="runware-seedream-4.5",
                name="Seedream 4.5",
                provider=CloudProvider.RUNWARE,
                model_id="bytedance:seedream@4.5",
                supports_resolution_tiers=False,
                supports_reference_image=True,
                aspect_ratios=["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"]
            ),
            CloudModelConfig(
                id="runware-seedream-4.0",
                name="Seedream 4.0",
                provider=CloudProvider.RUNWARE,
                model_id="bytedance:5@0",
                supports_resolution_tiers=False,
                supports_reference_image=False,
                aspect_ratios=["1:1", "16:9", "9:16", "4:3", "3:4"]
            )
        ]

        self._models = default_models
        self._save_config()
        logger.info("Created default cloud models configuration")

    def _save_config(self):
        """Save cloud models configuration to file"""
        try:
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            data = {
                "models": [model.model_dump() for model in self._models]
            }
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            logger.info(f"Saved {len(self._models)} cloud models to config")
        except Exception as e:
            logger.error(f"Failed to save cloud config: {e}")

    def get_all_models(self) -> List[CloudModelConfig]:
        """Get all cloud models"""
        return self._models.copy()

    def get_model(self, model_id: str) -> Optional[CloudModelConfig]:
        """Get a specific cloud model by ID"""
        for model in self._models:
            if model.id == model_id:
                return model
        return None

    def add_model(self, model: CloudModelConfig) -> bool:
        """Add a new cloud model"""
        # Check if model ID already exists
        if any(m.id == model.id for m in self._models):
            logger.warning(f"Model {model.id} already exists")
            return False

        self._models.append(model)
        self._save_config()
        logger.info(f"Added cloud model: {model.id}")
        return True

    def update_model(self, model_id: str, model: CloudModelConfig) -> bool:
        """Update an existing cloud model"""
        for i, m in enumerate(self._models):
            if m.id == model_id:
                self._models[i] = model
                self._save_config()
                logger.info(f"Updated cloud model: {model_id}")
                return True
        logger.warning(f"Model {model_id} not found")
        return False

    def delete_model(self, model_id: str) -> bool:
        """Delete a cloud model"""
        for i, m in enumerate(self._models):
            if m.id == model_id:
                self._models.pop(i)
                self._save_config()
                logger.info(f"Deleted cloud model: {model_id}")
                return True
        logger.warning(f"Model {model_id} not found")
        return False

    def reload_config(self):
        """Reload configuration from file"""
        self._load_config()
