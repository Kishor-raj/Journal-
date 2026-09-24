import xml.etree.ElementTree as ET

tree = ET.parse('client/public/favicon.svg')
root = tree.getroot()

# current viewBox: "0 0 621 655"
# We want to zoom in by removing ~15% from the margins.
# Width: 621, Height: 655
# 15% of width = 93, 15% of height = 98
# Let's crop 12% on all sides to make it significantly larger.
# 12% of 621 = 74
# 12% of 655 = 78
# New x = 74
# New y = 78
# New w = 621 - 148 = 473
# New h = 655 - 156 = 499

root.attrib['viewBox'] = "74 78 473 499"

# Write out the SVG
ET.register_namespace('', 'http://www.w3.org/2000/svg')
ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
tree.write('client/public/favicon.svg', xml_declaration=True, encoding='UTF-8')

print("Favicon zoomed.")
