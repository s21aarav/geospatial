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

print("    --stars-svg-1: url('data:image/svg+xml;utf8," + generate_svg(400, 400, 300, 1.5) + "');")
print("    --stars-svg-2: url('data:image/svg+xml;utf8," + generate_svg(600, 600, 200, 2.0) + "');")
print("    --stars-svg-3: url('data:image/svg+xml;utf8," + generate_svg(800, 800, 100, 2.5) + "');")
