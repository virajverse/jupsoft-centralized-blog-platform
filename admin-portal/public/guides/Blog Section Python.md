# Jupsoft Centralized Blog Platform — Python Integration Guide

> **Architecture Overview**: Complete Python integration using FastAPI, Django, or Flask with typed Pydantic models and requests/httpx.

---

## 1. Environment Configuration (`.env`)

```env
JUPSOFT_API_URL="https://blogary.jupsoft.com/v1"
JUPSOFT_WEBSITE_ID="YOUR_WEBSITE_ID"
JUPSOFT_API_KEY="YOUR_API_KEY"
```

---

## 2. Python Client Module (`jupsoft_cms.py`)

```python
"""
Jupsoft Centralized Blog Platform — Python Client
Requires: pip install requests
"""
import os
import urllib.parse
from typing import Dict, Any, Optional, List
import requests

API_URL = os.getenv("JUPSOFT_API_URL", "https://blogary.jupsoft.com/v1").rstrip("/")
WEBSITE_ID = os.getenv("JUPSOFT_WEBSITE_ID", "")
API_KEY = os.getenv("JUPSOFT_API_KEY", "")

HEADERS = {
    "Accept": "application/json",
    "x-api-key": API_KEY,
}

def get_blogs(page: int = 1, limit: int = 10, category: Optional[str] = None) -> List[Dict[str, Any]]:
    """Fetch paginated blog posts."""
    params = {"website": WEBSITE_ID, "page": page, "limit": limit}
    if category:
        params["category"] = category
    res = requests.get(f"{API_URL}/blogs", headers=HEADERS, params=params, timeout=10)
    res.raise_for_status()
    payload = res.json()
    return payload.get("data", payload)

def get_blog_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    """Fetch a single article by its slug."""
    encoded_slug = urllib.parse.quote(slug)
    res = requests.get(f"{API_URL}/blogs/{encoded_slug}", headers=HEADERS, params={"website": WEBSITE_ID}, timeout=10)
    if res.status_code == 404:
        return None
    res.raise_for_status()
    payload = res.json()
    return payload.get("data", payload)

def get_latest(limit: int = 3) -> List[Dict[str, Any]]:
    """Fetch recent articles."""
    res = requests.get(f"{API_URL}/blogs/latest", headers=HEADERS, params={"website": WEBSITE_ID, "limit": limit}, timeout=10)
    res.raise_for_status()
    payload = res.json()
    return payload.get("data", payload)
```

---

## 3. FastAPI Implementation (`main.py`)

```python
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
import jupsoft_cms

app = FastAPI(title="School Website with CMS Blogs")
templates = Jinja2Templates(directory="templates")

@app.get("/blog", response_class=HTMLResponse)
async def blog_list(request: Request, page: int = 1):
    try:
        articles = jupsoft_cms.get_blogs(page=page, limit=9)
        return templates.TemplateResponse("blog_list.html", {"request": request, "blogs": articles})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/blog/{slug}", response_class=HTMLResponse)
async def blog_detail(request: Request, slug: str):
    article = jupsoft_cms.get_blog_by_slug(slug)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return templates.TemplateResponse("blog_detail.html", {"request": request, "article": article})
```
