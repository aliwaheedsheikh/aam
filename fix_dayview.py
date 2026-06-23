# Fix escape sequences in DayViewV2.tsx
import re

# Read the file
with open('/tmp/sandbox/src/app/components/calendar/DayViewV2.tsx', 'r') as f:
    content = f.read()

# Replace the literal \n escape sequences with actual newlines
# Line 966: let primeSpaceId = '';\\n            let primeSpaceName = '';\\n            \\            if (isPrime) {
content = content.replace(
    "let primeSpaceId = '';\\\\n            let primeSpaceName = '';\\\\n            \\\\            if (isPrime) {",
    "let primeSpaceId = '';\n            let primeSpaceName = '';\n            \n            if (isPrime) {"
)

# Line 974: );\\n              if (parentPrime) {
content = content.replace(
    ");\\\\n              if (parentPrime) {",
    ");\n              if (parentPrime) {"
)

# Write the file back
with open('/tmp/sandbox/src/app/components/calendar/DayViewV2.tsx', 'w') as f:
    f.write(content)

print("Fixed escape sequences in DayViewV2.tsx")
