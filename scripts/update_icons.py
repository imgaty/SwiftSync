import json

path = '/Users/hilarioferreira/.vscode/extensions/ztluwu.lucide-icons-0.3.3/dist/lucide-icons.json'
with open(path, 'r') as f:
    data = json.load(f)

icons = data['iconDefinitions']

# Change agent icon to use JSON icon character (\E0CD)
icons['agent'] = {'fontCharacter': '\\E0CD'}
print(f"agent set to: {icons['agent']}")

# Change copilot icon to sparkle (\E155)
icons['copilot'] = {'fontCharacter': '\\E155'}
print(f"copilot set to: {icons['copilot']}")

with open(path, 'w') as f:
    json.dump(data, f, indent=2)

print('JSON saved!')
