from PIL import Image, ImageDraw, ImageFont
import os

os.makedirs('icons', exist_ok=True)

def create_icon(size, filename):
    img = Image.new('RGBA', (size, size), (99, 102, 241, 255))
    draw = ImageDraw.Draw(img)

    font_size = size // 2
    font = None
    for path in ['arial.ttf', 'Arial.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']:
        try:
            font = ImageFont.truetype(path, font_size)
            break
        except OSError:
            continue
    if font is None:
        font = ImageFont.load_default()

    text = 'AC'
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (size - text_w) // 2 - bbox[0]
    y = (size - text_h) // 2 - bbox[1]

    draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
    img.save(f'icons/{filename}')
    print(f'Created icons/{filename} ({size}x{size})')

create_icon(16, 'icon16.png')
create_icon(48, 'icon48.png')
create_icon(128, 'icon128.png')
print('Done!')
