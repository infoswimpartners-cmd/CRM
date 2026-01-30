
import os
import re

MIGRATION_DIR = 'supabase/migrations'

def fix_migration_filenames():
    files = sorted([f for f in os.listdir(MIGRATION_DIR) if f.endswith('.sql')])
    
    # Group files by their version prefix
    version_groups = {}
    for filename in files:
        # Extract version number (leading digits)
        match = re.match(r'^(\d+)(.*)', filename)
        if match:
            version = match.group(1)
            suffix = match.group(2)
            if version not in version_groups:
                version_groups[version] = []
            version_groups[version].append((filename, suffix))
    
    for version, items in version_groups.items():
        # If there are multiple files with the same version, or if the version is short (8 digits)
        # we generally want to convert them to 14 digits timestamp format to avoid conflicts.
        # But specifically we need to fix duplicates.
        
        # If we have duplicates, or if we want to standardize everything to 14 digits (recommended).
        # Let's just fix duplicates for now by appending seconds.
        
        if len(items) > 1:
            print(f"Fixing duplicates for version {version}:")
            base_version = version
            
            # If base version is 8 digits (YYYYMMDD), convert to YYYYMMDDHHMMSS format base
            if len(base_version) == 8:
                base_version = base_version + "000000"
            
            # Use base_version as integer
            current_ver_int = int(base_version)
            
            for i, (filename, suffix) in enumerate(items):
                # Increment version for each file to ensure uniqueness
                # We add 'i' to the seconds part. 
                # Be careful not to conflict with existing 14-digit versions if any.
                # Since we are iterating all files, we might need a more global approach.
                pass

    # Alternative approach:
    # Just iterate ALL files, and ensure strictly increasing version numbers.
    # But we want to keep the dates correct.
    
    # Let's look at 8-digit versions specifically.
    # The error was Key (version)=(20240114) already exists.
    # This means multiple files start with 20240114.
    
    # Let's just suffix them with time to make them unique and 14 chars long.
    # E.g. 20240114_foo.sql -> 20240114120000_foo.sql (conceptually)
    
    # Better yet: keep the date, add HHMMSS.
    # Since we don't know the original creation time, we assigns artificial times based on sort order.
    
    processed_count = 0
    
    # We will process each group.
    for version, items in version_groups.items():
        # Only process if we have duplicates OR if it looks like a date-only version (8 digits)
        # Actually, Supabase CLI prefers 14 digits.
        
        if len(version) == 8:
            print(f"Processing version group {version} ({len(items)} files)")
            
            for i, (filename, suffix) in enumerate(items):
                # Create a new version number: YYYYMMDD + HHMMSS
                # We use 'i' to increment seconds. 
                # i=0 -> 000001 (to avoid 000000 collision if strictly 8 digits were used? 
                # actually 20240114000000_init.sql exists as a separate file with 14 digits)
                
                # Careful: 20240114000000 exists. 20240114 also exists.
                # 20240114 becomes 20240114000000 effectively? No, strictly it's the number.
                
                # To be safe, let's map 8-digit versions to 14-digit versions starting from 100000 (10 AM)
                # to avoid conflict with 000000 (init).
                
                hhmmss = f"{100000 + i:06d}" 
                new_version = f"{version}{hhmmss}"
                
                new_filename = f"{new_version}{suffix}"
                
                src = os.path.join(MIGRATION_DIR, filename)
                dst = os.path.join(MIGRATION_DIR, new_filename)
                
                print(f"Renaming {filename} -> {new_filename}")
                os.rename(src, dst)
                processed_count += 1

if __name__ == '__main__':
    fix_migration_filenames()
