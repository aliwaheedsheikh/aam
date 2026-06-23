import re

# Read the file
with open('/src/app/components/calendar/NewReservationDialog.tsx', 'r') as f:
    content = f.read()

# Replace all \\" with "
content = content.replace('\\"', '"')

# Write back
with open('/src/app/components/calendar/NewReservationDialog.tsx', 'w') as f:
    f.write(content)

print("Fixed escaped quotes!")
