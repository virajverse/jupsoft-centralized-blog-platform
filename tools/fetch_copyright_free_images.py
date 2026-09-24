#!/usr/bin/env python3
"""
Copyright-Free Image Fetcher for Jupsoft Blogary CMS
======================================================
Enterprise-grade tool to fetch 100% copyright-safe images from:
- Unsplash (CC0-like, free commercial use)
- Pexels (CC0-like, free commercial use)
- Pixabay (CC0, no attribution required)
- Picsum (Lorem Picsum - for placeholders)

Author: Jupsoft CMS Admin (Auto-generated)
Use case: Auto-attach relevant images to blog posts without copyright risk.
"""

import os
import sys
import json
import hashlib
import requests
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime
from urllib.parse import quote_plus


# ============================================================
# CONFIGURATION
# ============================================================

# Get free API keys from:
#   Unsplash: https://unsplash.com/developers (free tier: 50 reqs/hr)
#   Pexels:   https://www.pexels.com/api/ (free tier: 200 reqs/hr, 20k/month)
#   Pixabay:  https://pixabay.com/api/docs/ (free tier: 5000 reqs/hr)
UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY", "YOUR_UNSPLASH_KEY")
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY", "YOUR_PEXELS_KEY")
PIXABAY_API_KEY = os.getenv("PIXABAY_API_KEY", "YOUR_PIXABAY_KEY")

# Output directory (relative to project root)
OUTPUT_DIR = Path(__file__).parent.parent / "public" / "uploads" / "blogs"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Image preferences
PREFERRED_WIDTH = 1200        # 1200px wide — ideal for blog hero + OG image
PREFERRED_HEIGHT = 630        # 1200x630 is the OpenGraph social card standard
MIN_WIDTH = 800               # Minimum acceptable
JPEG_QUALITY = 85             # For fallback JPEG conversion


# ============================================================
# LICENSE COMPLIANCE TRACKING
# ============================================================

class LicenseTracker:
    """Track license metadata for every downloaded image (compliance audit)."""

    def __init__(self):
        self.log_file = OUTPUT_DIR.parent / "image_license_audit.json"
        self.records = self._load_existing()

    def _load_existing(self) -> List[Dict]:
        if self.log_file.exists():
            with open(self.log_file, "r", encoding="utf-8") as f:
                return json.load(f)
        return []

    def record(self, image_data: Dict):
        """Append an image's license record to the audit log."""
        record = {
            "downloaded_at": datetime.utcnow().isoformat() + "Z",
            **image_data,
        }
        self.records.append(record)
        with open(self.log_file, "w", encoding="utf-8") as f:
            json.dump(self.records, f, indent=2, ensure_ascii=False)
        print(f"  📝 License logged: {record['source']} | {record.get('photographer', 'N/A')}")

    def summary(self):
        sources = {}
        for r in self.records:
            sources[r["source"]] = sources.get(r["source"], 0) + 1
        print("\n" + "=" * 60)
        print("📊 IMAGE LICENSE AUDIT SUMMARY")
        print("=" * 60)
        for src, count in sources.items():
            print(f"  {src:15} : {count} images")
        print(f"  {'TOTAL':15} : {len(self.records)} images")
        print(f"  📄 Audit log: {self.log_file}")
        print("=" * 60)


# ============================================================
# SOURCE 1: UNSPLASH (Best quality, 3M+ photos, CC0-like license)
# ============================================================

def fetch_unsplash(query: str, count: int = 1) -> List[Dict]:
    """
    Search Unsplash for copyright-free images.
    License: Unsplash License — https://unsplash.com/license
             Free for commercial and non-commercial use. No attribution required
             (though appreciated). Cannot be sold standalone or compiled to replicate
             a similar service.
    """
    if UNSPLASH_ACCESS_KEY == "YOUR_UNSPLASH_KEY":
        print("  ⚠️  Unsplash API key not configured — skipping")
        return []

    print(f"\n🔍 [Unsplash] Searching: '{query}'")
    url = "https://api.unsplash.com/search/photos"
    headers = {"Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"}
    params = {
        "query": query,
        "per_page": min(count, 30),
        "orientation": "landscape",
        "content_filter": "high",   # Safe for all audiences
    }

    try:
        resp = requests.get(url, headers=headers, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except requests.exceptions.RequestException as e:
        print(f"  ❌ Unsplash API error: {e}")
        return []

    results = []
    for item in data.get("results", []):
        # Prefer 'raw' (original quality) — Unsplash also serves CDN URLs
        raw_url = item["urls"].get("raw", item["urls"]["regular"])
        # Append size parameters to get our preferred dimensions
        sized_url = f"{raw_url}&w={PREFERRED_WIDTH}&h={PREFERRED_HEIGHT}&fit=crop&q=80&fm=webp"

        results.append({
            "source": "Unsplash",
            "license": "Unsplash License (Free commercial use, no attribution required)",
            "license_url": "https://unsplash.com/license",
            "image_id": item["id"],
            "url": sized_url,
            "thumbnail": item["urls"]["thumb"],
            "width": item["width"],
            "height": item["height"],
            "photographer": item["user"]["name"],
            "photographer_url": item["user"]["links"]["html"],
            "alt_text": item.get("alt_description") or item["description"] or query,
            "description": item.get("description", ""),
            "tags": [t["title"] for t in item.get("tags", [])],
            "color": item.get("color"),
            "download_location": item["links"].get("download_location"),  # For Unsplash API compliance
        })

    print(f"  ✅ Found {len(results)} Unsplash results")
    return results


# ============================================================
# SOURCE 2: PEXELS (Best variety, 1M+ photos/videos, CC0-like license)
# ============================================================

def fetch_pexels(query: str, count: int = 1) -> List[Dict]:
    """
    Search Pexels for copyright-free images.
    License: Pexels License — https://www.pexels.com/license/
             Free for commercial and non-commercial use. Attribution appreciated
             but not required. Cannot be sold standalone or to replicate Pexels.

    ⚠️  LEGAL COMPLIANCE: Pexels explicitly DISALLOWS production hotlinking.
        You MUST download the image to your own CDN. This is enforced by the
        orchestrator (download_image is always called).
    """
    if PEXELS_API_KEY == "YOUR_PEXELS_KEY":
        print("  ⚠️  Pexels API key not configured — skipping")
        return []

    print(f"\n🔍 [Pexels] Searching: '{query}'")
    url = "https://api.pexels.com/v1/search"
    headers = {"Authorization": PEXELS_API_KEY}
    params = {
        "query": query,
        "per_page": min(count, 80),
        "orientation": "landscape",
        "size": "medium",   # medium = ~1080px wide
    }

    try:
        resp = requests.get(url, headers=headers, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except requests.exceptions.RequestException as e:
        print(f"  ❌ Pexels API error: {e}")
        return []

    results = []
    for item in data.get("photos", []):
        results.append({
            "source": "Pexels",
            "license": "Pexels License (Free commercial use, no attribution required)",
            "license_url": "https://www.pexels.com/license/",
            "image_id": str(item["id"]),
            "url": item["src"]["large2x"],   # ~2x retina, ~1880px
            "thumbnail": item["src"]["tiny"],
            "width": item["width"],
            "height": item["height"],
            "photographer": item["photographer"],
            "photographer_url": item["photographer_url"],
            "alt_text": item.get("alt") or query,
            "description": "",
            "tags": [],
            "color": item.get("avg_color"),
        })

    print(f"  ✅ Found {len(results)} Pexels results")
    return results


# ============================================================
# SOURCE 3: PIXABAY (CC0 — no attribution, 4M+ images)
# ============================================================

def fetch_pixabay(query: str, count: int = 1) -> List[Dict]:
    """
    Search Pixabay for truly CC0 (public domain) images.
    License: Pixabay License — https://pixabay.com/service/license/
             CC0 — no attribution required, no commercial restrictions.
             Can be modified freely. Cannot be resold standalone.
    """
    if PIXABAY_API_KEY == "YOUR_PIXABAY_KEY":
        print("  ⚠️  Pixabay API key not configured — skipping")
        return []

    print(f"\n🔍 [Pixabay] Searching: '{query}'")
    url = "https://pixabay.com/api/"
    params = {
        "key": PIXABAY_API_KEY,
        "q": quote_plus(query),
        "image_type": "photo",
        "orientation": "horizontal",
        "min_width": MIN_WIDTH,
        "per_page": min(count, 200),
        "safesearch": "true",
    }

    try:
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except requests.exceptions.RequestException as e:
        print(f"  ❌ Pixabay API error: {e}")
        return []

    results = []
    for item in data.get("hits", []):
        results.append({
            "source": "Pixabay",
            "license": "Pixabay License / CC0 (Public domain, no attribution required)",
            "license_url": "https://pixabay.com/service/license/",
            "image_id": str(item["id"]),
            "url": item["largeImageURL"],
            "thumbnail": item["previewURL"],
            "width": item["imageWidth"],
            "height": item["imageHeight"],
            "photographer": item["user"],
            "photographer_url": f"https://pixabay.com/users/{item['user_id']}/",
            "alt_text": item.get("tags", query),
            "description": "",
            "tags": item.get("tags", "").split(", "),
            "color": None,
        })

    print(f"  ✅ Found {len(results)} Pixabay results")
    return results


# ============================================================
# DOWNLOAD + SAVE TO LOCAL STORAGE (S3-ready)
# ============================================================

def download_image(image_meta: Dict, slug: str) -> Optional[str]:
    """
    Download the image to local storage (or S3 in production).
    Returns the public URL path for the saved image.
    """
    try:
        resp = requests.get(image_meta["url"], timeout=30, stream=True)
        resp.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"  ❌ Download failed: {e}")
        return None

    # Generate a deterministic filename from blog slug + image_id
    ext = "webp" if "fm=webp" in image_meta["url"] or "image/webp" in resp.headers.get("content-type", "") else "jpg"
    filename = f"{slug}-{image_meta['image_id'][:8]}.{ext}"
    filepath = OUTPUT_DIR / filename

    with open(filepath, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)

    file_size_kb = filepath.stat().st_size / 1024
    print(f"  💾 Saved: {filename} ({file_size_kb:.1f} KB)")

    # Return public URL path (Next.js public folder convention)
    public_url = f"/uploads/blogs/{filename}"
    return public_url


# ============================================================
# MAIN ORCHESTRATOR
# ============================================================

def get_blog_images(
    blog_topic: str,
    blog_slug: str,
    count: int = 1,
    sources: List[str] = None,
) -> List[Dict]:
    """
    Master function: Fetch and download copyright-free images for a blog post.

    Args:
        blog_topic: Search keyword (e.g. "cloud computing", "AI machine learning")
        blog_slug: Blog post slug for filename generation
        count: How many images to return
        sources: List of sources to try, in priority order.
                 Default: ["unsplash", "pexels", "pixabay"]

    Returns:
        List of image metadata dicts with public URLs and license info.
    """
    if sources is None:
        sources = ["unsplash", "pexels", "pixabay"]

    print("\n" + "=" * 60)
    print(f"🎨 FETCHING COPYRIGHT-FREE IMAGES FOR: '{blog_topic}'")
    print("=" * 60)

    all_candidates = []
    source_fns = {
        "unsplash": fetch_unsplash,
        "pexels": fetch_pexels,
        "pixabay": fetch_pixabay,
    }

    # Fetch candidates from all requested sources
    per_source = max(2, count * 2)   # Fetch 2x to allow filtering
    for src in sources:
        if src not in source_fns:
            print(f"  ⚠️  Unknown source: {src}")
            continue
        candidates = source_fns[src](blog_topic, count=per_source)
        all_candidates.extend(candidates)

    if not all_candidates:
        print("  ⚠️  No images found from any source!")
        return []

    # Sort by quality: prefer larger dimensions, then by source priority
    source_priority = {"unsplash": 1, "pexels": 2, "pixabay": 3}
    all_candidates.sort(
        key=lambda x: (
            -x.get("width", 0),                      # Larger first
            source_priority.get(x["source"].lower(), 99),  # Preferred source first
        )
    )

    # Download top N
    tracker = LicenseTracker()
    selected = []
    for candidate in all_candidates[:count]:
        public_url = download_image(candidate, blog_slug)
        if public_url:
            candidate["public_url"] = public_url
            candidate["saved_at"] = datetime.utcnow().isoformat() + "Z"
            tracker.record(candidate)
            selected.append(candidate)

    tracker.summary()
    return selected


# ============================================================
# CLI USAGE EXAMPLE
# ============================================================

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python fetch_copyright_free_images.py '<topic>' '<slug>' [count]")
        print('Example: python fetch_copyright_free_images.py "cloud computing kubernetes" "future-of-cloud-erp-2026" 1')
        sys.exit(1)

    topic = sys.argv[1]
    slug = sys.argv[2]
    count = int(sys.argv[3]) if len(sys.argv) > 3 else 1

    images = get_blog_images(topic, slug, count=count)
    print(f"\n🎉 Successfully prepared {len(images)} image(s) for blog: {slug}")
    for img in images:
        print(f"   → {img['public_url']}  (by {img['photographer']} on {img['source']})")
