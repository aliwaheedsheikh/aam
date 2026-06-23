#!/usr/bin/env python3
"""
Quick validation script for NewReservationDialog.tsx
Checks for common JSX syntax errors
"""

import re

def check_file_for_errors(filepath):
    """Check for common JSX syntax errors"""
    errors = []
    warnings = []
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        for i, line in enumerate(lines, 1):
            # Check for duplicate closing tags (standalone />)
            if re.match(r'^\s+\/>\s*$', line):
                errors.append(f"Line {i}: Standalone '/>' tag found (likely duplicate)")
            
            # Check for unclosed tags before />
            if '/>' in line and line.count('/>') > 1:
                warnings.append(f"Line {i}: Multiple '/>' on same line - verify correctness")
            
            # Check for missing opening brackets
            if '>' in line and '<' not in line and 'const' not in line and 'return' not in line:
                if re.match(r'^\s+>\s*$', line):
                    errors.append(f"Line {i}: Standalone '>' character")
        
        print(f"✅ Validation complete for {filepath}")
        print(f"   Total lines: {len(lines)}")
        print(f"   Errors found: {len(errors)}")
        print(f"   Warnings: {len(warnings)}")
        
        if errors:
            print("\n❌ ERRORS:")
            for error in errors:
                print(f"   {error}")
        
        if warnings:
            print("\n⚠️  WARNINGS:")
            for warning in warnings:
                print(f"   {warning}")
        
        if not errors and not warnings:
            print("\n✅ No issues found! File looks good.")
        
        return len(errors) == 0
    
    except FileNotFoundError:
        print(f"❌ File not found: {filepath}")
        return False
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        return False

if __name__ == "__main__":
    filepath = "/src/app/components/calendar/NewReservationDialog.tsx"
    check_file_for_errors(filepath)
