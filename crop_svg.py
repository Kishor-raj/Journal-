import xml.etree.ElementTree as ET
import base64
from PIL import Image
import io

# 1. Parse SVG
tree = ET.parse('client/public/favicon.svg')
root = tree.getroot()

# Handle namespaces
ns = {'svg': 'http://www.w3.org/2000/svg'}
image_elem = root.find('.//svg:image', ns)

if image_elem is None:
    # try without namespace
    image_elem = root.find('.//image')

if image_elem is not None:
    href = image_elem.attrib.get('href')
    if href and href.startswith('data:image/png;base64,'):
        b64_data = href.split(',')[1]
        img_data = base64.b64decode(b64_data)
        
        img = Image.open(io.BytesIO(img_data)).convert('RGBA')
        bbox = img.getbbox()  # returns (left, upper, right, lower) of non-zero alpha
        
        print("Original size:", img.size)
        print("Bounding box:", bbox)
        
        if bbox:
            left, upper, right, lower = bbox
            width = right - left
            height = lower - upper
            
            print(f"New viewBox should be: {left} {upper} {width} {height}")
            
            # modify SVG
            root.attrib['viewBox'] = f"{left} {upper} {width} {height}"
            root.attrib['width'] = str(width)
            root.attrib['height'] = str(height)
            
            # Save new SVG
            tree.write('client/public/favicon.svg', xml_declaration=True, encoding='UTF-8')
            print("Successfully updated favicon.svg")
else:
    print("No base64 image found in SVG")
