import xml.etree.ElementTree as ET
import base64
import subprocess
import os

tree = ET.parse('client/public/favicon.svg')
ns = {'svg': 'http://www.w3.org/2000/svg'}
image_elem = tree.getroot().find('.//svg:image', ns)
if image_elem is None:
    image_elem = tree.getroot().find('.//image')

href = image_elem.attrib.get('href')
b64_data = href.split(',')[1]
with open('temp_icon.png', 'wb') as f:
    f.write(base64.b64decode(b64_data))

subprocess.run(['magick', 'temp_icon.png', '-background', 'white', '-alpha', 'remove', '-resize', '60x60!', '-threshold', '90%', 'temp_icon.txt'])

with open('temp_icon.txt', 'r') as f:
    lines = f.readlines()[1:] # skip header

grid = [[' ' for _ in range(60)] for _ in range(60)]
for line in lines:
    if not line.strip(): continue
    parts = line.split(':')
    coords = parts[0].strip()
    x, y = map(int, coords.split(','))
    color_info = parts[1]
    if '#000000' in color_info or 'black' in color_info:
        grid[y][x] = '#'

for row in grid:
    print(''.join(row))

os.remove('temp_icon.png')
os.remove('temp_icon.txt')
