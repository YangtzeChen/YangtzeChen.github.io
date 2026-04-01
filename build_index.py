import os, json, re, time
from PIL import Image

# Configuration
BLOG_DIR = 'content/blog'
GALLERY_DIR = 'content/gallery'
IMAGE_DIR = os.path.join(GALLERY_DIR, 'images')
THUMB_DIR = os.path.join(GALLERY_DIR, 'thumbnails')
ITEMS_DIR = os.path.join(GALLERY_DIR, 'items')
BLOG_INDEX = os.path.join(BLOG_DIR, 'index.json')
GALLERY_INDEX = os.path.join(GALLERY_DIR, 'index.json')
VERSION_FILE = 'content/version.json'

def rebuild_blog_index():
    print("Rebuilding Blog Index...")
    if not os.path.exists(BLOG_DIR):
        print(f"Skipping blog: {BLOG_DIR} not found.")
        return

    files = [f for f in os.listdir(BLOG_DIR) if f.endswith('.md')]
    out = []
    for f in files:
        try:
            with open(os.path.join(BLOG_DIR, f), 'r', encoding='utf-8') as file:
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
        except Exception as e:
            print(f"Error processing blog {f}: {e}")

    out.sort(key=lambda x: x.get('updated') if x.get('updated') else x.get('date', ''), reverse=True)
    with open(BLOG_INDEX, 'w', encoding='utf-8') as w:
        json.dump(out, w, indent=2, ensure_ascii=False)
    print(f"Blog index saved: {len(out)} posts.")

def rebuild_gallery_index():
    print("Rebuilding Gallery Index...")
    if not os.path.exists(ITEMS_DIR):
        print(f"Skipping gallery items: {ITEMS_DIR} not found.")
        return

    out_gal = []
    # Only look into items/ directory for metadata
    files = [f for f in os.listdir(ITEMS_DIR) if f.endswith('.json')]
    
    for f in files:
        file_path = os.path.join(ITEMS_DIR, f)
        try:
            with open(file_path, 'r', encoding='utf-8-sig') as file:
                data = json.load(file)
            
            if data and 'images' in data:
                valid_entries = []
                for img_obj in data['images']:
                    img_path = img_obj.get('image', '')
                    if not img_path: continue
                    
                    # Ensure path is absolute for frontend
                    if not img_path.startswith('/'):
                        img_path = '/content/gallery/images/' + img_path
                        img_obj['image'] = img_path
                    
                    # Verify physical file existence (relative from root)
                    local_img_path = img_path.lstrip('/')
                    if os.path.exists(local_img_path):
                        valid_entries.append(img_obj)
                    else:
                        print(f"  Warning: Image {local_img_path} MISSING for {f}")
                
                if valid_entries:
                    data['images'] = valid_entries
                    out_gal.append(data)
        except Exception as e:
            print(f"Error processing gallery item {f}: {e}")

    out_gal.sort(key=lambda x: str(x.get('date', '')), reverse=True)
    with open(GALLERY_INDEX, 'w', encoding='utf-8') as w:
        json.dump(out_gal, w, indent=2, ensure_ascii=False)
    print(f"Gallery index saved: {len(out_gal)} entries.")

def generate_thumbnails():
    print("Generating Thumbnails...")
    if not os.path.exists(IMAGE_DIR):
        print(f"Skipping thumbnails: {IMAGE_DIR} not found.")
        return
        
    if not os.path.exists(THUMB_DIR):
        os.makedirs(THUMB_DIR)

    for filename in os.listdir(IMAGE_DIR):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            img_path = os.path.join(IMAGE_DIR, filename)
            thumb_filename = os.path.splitext(filename)[0] + '.webp'
            thumb_path = os.path.join(THUMB_DIR, thumb_filename)
            
            if not os.path.exists(thumb_path):
                try:
                    with Image.open(img_path) as img:
                        # Convert to RGB if needed (e.g. for RGBA or CMYK)
                        if img.mode in ("RGBA", "P"):
                            img = img.convert("RGB")
                        
                        width, height = img.size
                        # Max dimension 800px for thumbnails
                        max_dim = 800
                        if width > max_dim or height > max_dim:
                            if width > height:
                                new_size = (max_dim, int(height * (max_dim / width)))
                            else:
                                new_size = (int(width * (max_dim / height)), max_dim)
                        else:
                            new_size = (width, height)
                            
                        thumb = img.resize(new_size, Image.LANCZOS)
                        thumb.save(thumb_path, 'WEBP', quality=85)
                        print(f"Generated thumbnail: {thumb_path}")
                except Exception as e:
                    print(f"Failed to process {filename}: {e}")

def update_version():
    version_data = {
        "version": int(time.time() * 1000)
    }
    with open(VERSION_FILE, 'w', encoding='utf-8') as w:
        json.dump(version_data, w, indent=2)
    print(f"Version updated: {version_data['version']}")

if __name__ == "__main__":
    rebuild_blog_index()
    rebuild_gallery_index()
    generate_thumbnails()
    update_version()
    print("Build completed successfully.")
