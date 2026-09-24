import xml.etree.ElementTree as ET

tree = ET.parse('client/public/favicon.svg')
root = tree.getroot()

# Original was 0 0 621 655
# We want to zoom in substantially. 
# Let's crop 20% from all sides.
# 20% of 621 = 124
# 20% of 655 = 131
# New x = 124
# New y = 131
# New w = 621 - 248 = 373
# New h = 655 - 262 = 393

root.attrib['viewBox'] = "124 131 373 393"

ET.register_namespace('', 'http://www.w3.org/2000/svg')
ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
tree.write('client/public/favicon.svg', xml_declaration=True, encoding='UTF-8')

print("Favicon zoomed even more.")
