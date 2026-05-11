#!/usr/bin/env python3
"""
Test script for Runware integration
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from app.services.runware_service import RunwareService
from app.services.storage_service import StorageService
from app.models.cloud_provider import CloudGenerateRequest
from app.config import settings


async def test_runware():
    """Test Runware service"""

    # Check if API key is configured
    if not settings.runware_api_key:
        print("❌ RUNWARE_API_KEY not configured in .env")
        print("Please add: RUNWARE_API_KEY=your_api_key")
        return

    print(f"✓ Runware API key configured: {settings.runware_api_key[:10]}...")

    # Initialize services
    storage_service = StorageService(
        workflows_path=settings.workflows_path,
        images_path=settings.images_path,
        metadata_path=settings.metadata_path
    )

    runware_service = RunwareService(storage_service, api_key=settings.runware_api_key)

    print("\n🧪 Testing Runware SDK connection...")

    # Test with 即梦 4.5
    request = CloudGenerateRequest(
        prompt="a beautiful sunset over mountains",
        model_id="runware-seedream-4.5",
        width=2048,
        height=2048
    )

    print(f"\n📝 Test parameters:")
    print(f"   Model: bytedance:seedream@4.5")
    print(f"   Prompt: {request.prompt}")
    print(f"   Size: {request.width}x{request.height}")

    print("\n🚀 Generating image...")

    result = await runware_service.generate_image(
        request=request,
        model_name="即梦 4.5",
        provider_model_id="bytedance:seedream@4.5",
        owner_id="test_user"
    )

    if result.status == "success":
        print(f"\n✅ Generation successful!")
        print(f"   Image ID: {result.image_id}")
        print(f"   Image URL: {result.image_url}")
        print(f"   Size: {result.width}x{result.height}")
    else:
        print(f"\n❌ Generation failed: {result.message}")


if __name__ == "__main__":
    asyncio.run(test_runware())
