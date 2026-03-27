import os, json, re, time
from PIL import Image

# Blog
files = [f for f in os.listdir('content/blog') if f.endswith('.md')]
out = []
for f in files:
    with open(os.path.join('content/blog', f), 'r', encoding='utf-8') as file:
        content = file.read()
    match = re.search(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if match:
        meta = {}
        for line in match.group(1).split('\n'):
            if ':' in line:
                k, v = line.split(':', 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                meta[k] = v
        meta['slug'] = os.path.splitext(f)[0]
        out.append(meta)
out.sort(key=lambda x: x.get('updated') if x.get('updated') else x.get('date', ''), reverse=True)
with open('content/blog/index.json', 'w', encoding='utf-8') as w:
    json.dump(out, w, indent=2, ensure_ascii=False)

# Gallery
out_gal = []
for root, dirs, files in os.walk('content/gallery'):
    for f in files:
        if f.endswith('.json') and f != 'index.json':
            with open(os.path.join(root, f), 'r', encoding='utf-8') as file:
                data = json.load(file)
            if data:
                if 'images' in data:
                    for img in data['images']:
                        if img.get('image') and not img['image'].startswith('/'):
                            img['image'] = '/content/gallery/' + root.replace('\\', '/') + '/' + img['image']
                out_gal.append(data)
out_gal.sort(key=lambda x: x.get('date', ''), reverse=True)
with open('content/gallery/index.json', 'w', encoding='utf-8') as w:
    json.dump(out_gal, w, indent=2, ensure_ascii=False)

# Build Version
version_data = {
    "version": int(time.time() * 1000)
}
with open('content/version.json', 'w', encoding='utf-8') as w:
    json.dump(version_data, w, indent=2)

# Generate Thumbnails
img_dir = 'content/gallery/images'
thumb_dir = 'content/gallery/thumbnails'
if not os.path.exists(thumb_dir):
    os.makedirs(thumb_dir)

for filename in os.listdir(img_dir):
    if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
        img_path = os.path.join(img_dir, filename)
        thumb_filename = os.path.splitext(filename)[0] + '.webp'
        thumb_path = os.path.join(thumb_dir, thumb_filename)
        
        if not os.path.exists(thumb_path):
            try:
                with Image.open(img_path) as img:
                    width, height = img.size
                    new_size = (int(width * 0.33), int(height * 0.33))
                    thumb = img.resize(new_size, Image.LANCZOS)
                    thumb.save(thumb_path, 'WEBP', quality=85)
                    print(f"Generated thumbnail: {thumb_path}")
            except Exception as e:
                print(f"Failed to process {filename}: {e}")
