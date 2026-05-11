"""
Migration script to convert Windows paths to POSIX paths in metadata files
This fixes the issue when switching from Windows to WSL
"""
import json
from pathlib import Path


def migrate_metadata_paths(metadata_dir: Path):
    """Convert all Windows-style paths to POSIX paths in metadata files"""

    if not metadata_dir.exists():
        print(f"Metadata directory not found: {metadata_dir}")
        return

    updated_count = 0
    error_count = 0

    for metadata_file in metadata_dir.glob("*.json"):
        try:
            # Read metadata
            with open(metadata_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Check if file_path needs conversion
            if 'file_path' in data and '\\' in data['file_path']:
                old_path = data['file_path']
                # Convert backslashes to forward slashes
                new_path = old_path.replace('\\', '/')
                data['file_path'] = new_path

                # Write back
                with open(metadata_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)

                print(f"✓ Updated: {metadata_file.name}")
                print(f"  Old: {old_path}")
                print(f"  New: {new_path}")
                updated_count += 1
            else:
                print(f"- Skipped: {metadata_file.name} (already POSIX format)")

        except Exception as e:
            print(f"✗ Error processing {metadata_file.name}: {e}")
            error_count += 1

    print(f"\n{'='*60}")
    print(f"Migration complete!")
    print(f"Updated: {updated_count} files")
    print(f"Errors: {error_count} files")
    print(f"{'='*60}")


if __name__ == "__main__":
    # Default path
    metadata_dir = Path("./data/metadata")

    print("Starting metadata path migration...")
    print(f"Metadata directory: {metadata_dir.absolute()}")
    print(f"{'='*60}\n")

    migrate_metadata_paths(metadata_dir)
