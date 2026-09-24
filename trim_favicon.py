import xml.etree.ElementTree as ET
import base64
import os
import subprocess

tree = ET.parse('client/public/favicon.svg')
root = tree.getroot()
ns = {'svg': 'http://www.w3.org/2000/svg'}
image_elem = root.find('.//svg:image', ns)
if image_elem is None:
    image_elem = root.find('.//image')

href = image_elem.attrib.get('href')
b64_data = href.split(',')[1]
img_data = base64.b64decode(b64_data)

# Save to temp file
with open('temp_img.png', 'wb') as f:
    f.write(img_data)

# Trim using imagemagick
subprocess.run(['magick', 'temp_img.png', '-trim', 'temp_trimmed.png'])

# Get new dimensions
output = subprocess.check_output(['magick', 'identify', '-format', '%w %h', 'temp_trimmed.png']).decode('utf-8')
new_width, new_height = output.split()

# Read back and encode
with open('temp_trimmed.png', 'rb') as f:
    trimmed_b64 = base64.b64encode(f.read()).decode('utf-8')

# Update SVG
image_elem.attrib['href'] = f"data:image/png;base64,{trimmed_b64}"
image_elem.attrib['width'] = new_width
image_elem.attrib['height'] = new_height
root.attrib['viewBox'] = f"0 0 {new_width} {new_height}"
root.attrib['width'] = new_width
root.attrib['height'] = new_height

# add namespace prefix to avoid prefix0 if using default write
ET.register_namespace('', 'http://www.w3.org/2000/svg')
ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
tree.write('client/public/favicon.svg', xml_declaration=True, encoding='UTF-8')

os.remove('temp_img.png')
os.remove('temp_trimmed.png')
print("Successfully trimmed and updated favicon.svg to", new_width, "x", new_height)
