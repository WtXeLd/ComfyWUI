"""
API Key generation and management utilities
"""
import secrets
import string
from datetime import datetime
from typing import Optional
import json
from pathlib import Path


def generate_api_key() -> str:
    """
    Generate a new API key with format: cfw_{32 random alphanumeric characters}

    Returns:
        str: Generated API key
    """
    chars = string.ascii_letters + string.digits
    random_part = ''.join(secrets.choice(chars) for _ in range(32))
    return f"cfw_{random_part}"


class APIKeyManager:
    """Manager for API keys storage and validation"""

    def __init__(self, keys_file: Path):
        self.keys_file = keys_file
        self._ensure_file_exists()

    def _ensure_file_exists(self):
        """Create API keys file if it doesn't exist"""
        if not self.keys_file.exists():
            self.keys_file.parent.mkdir(parents=True, exist_ok=True)
            self._save_keys({"keys": []})

    def _load_keys(self) -> dict:
        """Load API keys from file"""
        try:
            with open(self.keys_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {"keys": []}

    def _save_keys(self, data: dict):
        """Save API keys to file"""
        with open(self.keys_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def create_key(self, name: str = "Default Key", user_id: Optional[str] = None) -> str:
        """
        Create a new API key

        Args:
            name: Human-readable name for the key
            user_id: Optional user ID. If not provided, will generate one based on key

        Returns:
            str: The generated API key
        """
        key = generate_api_key()
        data = self._load_keys()

        # Generate user_id if not provided
        if not user_id:
            # Use a hash of the key as user_id for uniqueness
            import hashlib
            user_id = f"user_{hashlib.sha256(key.encode()).hexdigest()[:12]}"

        data["keys"].append({
            "key": key,
            "name": name,
            "user_id": user_id,
            "created_at": datetime.utcnow().isoformat(),
            "last_used": None,
            "is_active": True
        })

        self._save_keys(data)
        return key

    def validate_key(self, key: str) -> bool:
        """
        Validate if an API key is valid and active

        Args:
            key: API key to validate

        Returns:
            bool: True if key is valid and active
        """
        data = self._load_keys()

        for key_entry in data["keys"]:
            if key_entry["key"] == key and key_entry["is_active"]:
                # Update last_used timestamp
                key_entry["last_used"] = datetime.utcnow().isoformat()
                self._save_keys(data)
                return True

        return False

    def get_user_id(self, key: str) -> Optional[str]:
        """
        Get user ID associated with an API key

        Args:
            key: API key

        Returns:
            Optional[str]: User ID if key is valid and active, None otherwise
        """
        data = self._load_keys()

        for key_entry in data["keys"]:
            if key_entry["key"] == key and key_entry["is_active"]:
                return key_entry.get("user_id")

        return None

    def revoke_key(self, key: str) -> bool:
        """
        Revoke an API key

        Args:
            key: API key to revoke

        Returns:
            bool: True if key was found and revoked
        """
        data = self._load_keys()

        for key_entry in data["keys"]:
            if key_entry["key"] == key:
                key_entry["is_active"] = False
                self._save_keys(data)
                return True

        return False

    def list_keys(self) -> list[dict]:
        """
        List all API keys

        Returns:
            list: List of API key entries
        """
        data = self._load_keys()
        return data["keys"]

    def ensure_default_key_exists(self) -> Optional[str]:
        """
        Ensure at least one API key exists, create one if not

        Returns:
            Optional[str]: The default key if created, None otherwise
        """
        keys = self.list_keys()
        active_keys = [k for k in keys if k["is_active"]]

        if not active_keys:
            key = self.create_key("Default Key")
            return key

        return None
