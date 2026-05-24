import re
import random

def generate_svg(width, height, num_stars, max_r=1.5):
    svg = f'<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg">'
    for _ in range(num_stars):
        cx = random.uniform(0, width)
        cy = random.uniform(0, height)
        r = random.uniform(0.3, max_r)
        opacity = random.uniform(0.3, 1.0)
        svg += f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="white" opacity="{opacity:.2f}"/>'
    svg += '</svg>'
    return svg

svg1 = "url('data:image/svg+xml;utf8," + generate_svg(400, 400, 300, 1.5) + "')"
svg2 = "url('data:image/svg+xml;utf8," + generate_svg(600, 600, 200, 2.0) + "')"
svg3 = "url('data:image/svg+xml;utf8," + generate_svg(800, 800, 100, 2.5) + "')"

gradient = """    --space-bg: 
      radial-gradient(ellipse 150% 30% at 50% 50%, rgba(85, 33, 166, 0.45) 0%, rgba(35, 23, 115, 0.25) 40%, transparent 70%),
      radial-gradient(ellipse 80% 50% at 30% 60%, rgba(45, 13, 89, 0.3) 0%, transparent 60%),
      radial-gradient(ellipse 80% 50% at 70% 40%, rgba(20, 31, 102, 0.3) 0%, transparent 60%),
      linear-gradient(135deg, #05030f 0%, #0d081f 50%, #020108 100%);"""

with open('index.css', 'r') as f:
    content = f.read()

# Replace gradient
content = re.sub(r'--space-bg:.*?(?=--stars-svg-1)', gradient + '\n    ', content, flags=re.DOTALL)

# Replace SVGs
content = re.sub(r"--stars-svg-1: url\('data:image/svg\+xml;utf8,.*?'\);", f"--stars-svg-1: {svg1};", content)
content = re.sub(r"--stars-svg-2: url\('data:image/svg\+xml;utf8,.*?'\);", f"--stars-svg-2: {svg2};", content)
content = re.sub(r"--stars-svg-3: url\('data:image/svg\+xml;utf8,.*?'\);", f"--stars-svg-3: {svg3};", content)

with open('index.css', 'w') as f:
    f.write(content)
