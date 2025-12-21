"""
Migration script to update existing workflows with configurable parameters
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.storage_service import StorageService
from app.utils.parameter_detector import detect_configurable_params
from app.config import settings


async def migrate_workflows():
    """Update all existing workflows with configurable parameters"""
    # Initialize directories
    settings.initialize_directories()

    storage = StorageService(
        workflows_path=settings.workflows_path,
        images_path=settings.images_path,
        metadata_path=settings.metadata_path
    )

    print("Loading workflows...")
    workflows = await storage.list_workflows()
    print(f"Found {len(workflows)} workflows")

    updated_count = 0
    for workflow in workflows:
        print(f"\nProcessing: {workflow.name} ({workflow.id})")

        # Detect configurable parameters
        configurable_params = detect_configurable_params(workflow.workflow_json)

        if configurable_params:
            print(f"  Detected {len(configurable_params)} parameters:")
            for param_name, param_config in configurable_params.items():
                print(f"    - {param_name}: {param_config['label']} (default: {param_config['default']})")

            # Update workflow
            workflow.configurable_params = configurable_params
            await storage.save_workflow(workflow)
            updated_count += 1
            print(f"  ✓ Updated")
        else:
            print("  No configurable parameters detected")

    print(f"\n{'='*50}")
    print(f"Migration complete!")
    print(f"Updated {updated_count} workflows")


if __name__ == "__main__":
    asyncio.run(migrate_workflows())
