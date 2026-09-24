#!/usr/bin/env python3
"""
Publish 4 DigifyNext blogs to Jupsoft CMS via unified MCP server (port 7367).
Uses correct snake_case field names per the OpenAPI schema.
"""
import json
import os
import re
import sys
from pathlib import Path
import urllib.request
import urllib.parse
import http.cookiejar


MCP_BASE = "http://127.0.0.1:7367"
CMS_EMAIL = os.environ.get("CMS_EMAIL", "superadmin@jupsoft.com")
CMS_PASSWORD = os.environ.get("CMS_PASSWORD", "")
if not CMS_PASSWORD:
    sys.exit("CMS_PASSWORD environment variable is required — credentials are no longer hardcoded.")

TARGET_WEBSITE_ID = "site-growth"

BLOGS_DIR = Path(r"D:\Company work\jupsoft-centralized-blog-platform\blogs\digifynext")
BLOG_FILES = [
    "01-b2b-saas-seo-strategy-2026.md",
    "02-10-proven-b2b-saas-seo-tactics.md",
    "03-ai-search-optimization-b2b-saas.md",
    "04-b2b-saas-content-marketing-playbook.md",
]

IMAGE_ALTS = {
    "01-b2b-saas-seo-strategy-2026.md": "B2B SaaS SEO strategy framework showing technical, content, authority, and GEO pillars",
    "02-10-proven-b2b-saas-seo-tactics.md": "Top 10 B2B SaaS SEO tactics driving pipeline growth",
    "03-ai-search-optimization-b2b-saas.md": "AI search optimization flow showing ChatGPT, Perplexity, and Google AI Overviews",
    "04-b2b-saas-content-marketing-playbook.md": "B2B SaaS content marketing playbook showing strategy, creation, distribution, measurement",
}


def md_to_html(md_text: str) -> str:
    """Convert markdown to clean HTML."""
    html = md_text
    # Headings
    html = re.sub(r'^#### (.+)$', r'<h4>\1</h4>', html, flags=re.MULTILINE)
    html = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^# (.+)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)
    # Blockquotes
    html = re.sub(r'^> (.+)$', r'<blockquote>\1</blockquote>', html, flags=re.MULTILINE)
    # Code blocks
    html = re.sub(r'```(\w*)\n(.*?)\n```', r'<pre><code class="language-\1">\2</code></pre>', html, flags=re.DOTALL)
    html = re.sub(r'`([^`]+)`', r'<code>\1</code>', html)
    # Bold/italic
    html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)
    html = re.sub(r'\*(.+?)\*', r'<em>\1</em>', html)
    # Links
    html = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2" rel="noopener noreferrer">\1</a>', html)
    # Images
    html = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', r'<img src="\2" alt="\1" loading="lazy" />', html)
    # HR
    html = re.sub(r'^---+$', r'<hr />', html, flags=re.MULTILINE)
    # Tables
    def convert_table(match):
        lines = match.group(0).strip().split('\n')
        rows = [l for l in lines if '|' in l and not re.match(r'^\|[\s\-|:]+\|$', l.strip())]
        if not rows:
            return match.group(0)
        result = ['<table>']
        for i, row in enumerate(rows):
            cells = [c.strip() for c in row.strip('|').split('|')]
            tag = 'th' if i == 0 else 'td'
            result.append('<tr>' + ''.join(f'<{tag}>{c}</{tag}>' for c in cells) + '</tr>')
        result.append('</table>')
        return '\n'.join(result)
    html = re.sub(r'(?:^\|.*\|$\n?)+', convert_table, html, flags=re.MULTILINE)
    # Lists
    html = re.sub(r'^- (.+)$', r'<li>\1</li>', html, flags=re.MULTILINE)
    html = re.sub(r'(<li>.*?</li>\n?)+', lambda m: '<ul>' + m.group(0) + '</ul>', html, flags=re.DOTALL)
    html = re.sub(r'^\d+\. (.+)$', r'<li>\1</li>', html, flags=re.MULTILINE)
    # Paragraphs
    paragraphs = []
    for para in re.split(r'\n\n+', html):
        para = para.strip()
        if not para:
            continue
        if re.match(r'^<(h[1-6]|ul|ol|li|blockquote|pre|table|hr|img)', para):
            paragraphs.append(para)
        else:
            para = para.replace('\n', '<br />\n')
            paragraphs.append(f'<p>{para}</p>')
    return '\n\n'.join(paragraphs)


def parse_frontmatter(md_text: str):
    if not md_text.startswith('---'):
        return {}, md_text
    parts = md_text.split('---', 2)
    if len(parts) < 3:
        return {}, md_text
    fm_raw = parts[1].strip()
    body = parts[2].strip()
    meta = {}
    current_list = None
    for line in fm_raw.split('\n'):
        line = line.rstrip()
        if not line:
            continue
        if line.startswith('  - '):
            if current_list is not None:
                current_list.append(line[4:].strip())
            continue
        if ':' in line and not line.startswith(' '):
            key, _, val = line.partition(':')
            key = key.strip()
            val = val.strip()
            if not val:
                current_list = []
                meta[key] = current_list
            else:
                current_list = None
                if val.startswith('"') and val.endswith('"'):
                    val = val[1:-1]
                elif val.startswith("'") and val.endswith("'"):
                    val = val[1:-1]
                try:
                    if val.isdigit():
                        val = int(val)
                except (ValueError, AttributeError):
                    pass
                meta[key] = val
    return meta, body


class CmsClient:
    def __init__(self, base_url):
        self.base_url = base_url
        self.cookie_jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookie_jar))

    def call(self, endpoint, payload=None):
        url = f"{self.base_url}/{endpoint}"
        data = json.dumps(payload or {}).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
        try:
            with self.opener.open(req, timeout=30) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8', errors='replace')
            return {"success": False, "status": e.code, "data": {"error": body}}

    def login(self, email, password):
        return self.call("cms_login", {"email": email, "password": password})


def create_blog(client, meta, html_content):
    """Create blog with correct snake_case fields."""
    payload = {
        "website_id": TARGET_WEBSITE_ID,
        "title": meta.get("title", ""),
        "content": html_content,
        "excerpt": (meta.get("metaDescription") or "")[:160],
        "featured_image": "",
        "featured_image_alt": IMAGE_ALTS.get(meta.get("slug", ""), meta.get("title", "")),
        "meta_title": meta.get("metaTitle"),
        "meta_description": meta.get("metaDescription"),
        "focus_keyword": meta.get("focusKeyword"),
        "og_title": meta.get("metaTitle"),
        "og_description": meta.get("metaDescription"),
        "language": meta.get("language", "en"),
    }

    print(f"\n[CREATE] {meta.get('title', '?')[:60]}")
    print(f"   Slug: {meta.get('slug', '?')}")
    print(f"   Word count target: {meta.get('wordCount', '?')}")
    print(f"   HTML content length: {len(html_content)} chars")

    result = client.call("cms_create_blog", payload)
    if not result.get("success"):
        print(f"   [FAIL] {result}")
        return None

    blog_id = None
    data = result.get("data", {})
    if isinstance(data, dict):
        blog_id = data.get("id") or data.get("blogId") or data.get("blog_id")
    elif isinstance(data, str):
        blog_id = data
    print(f"   [OK] Blog ID: {blog_id}")
    return blog_id


def transition(client, blog_id, endpoint, label):
    print(f"   -> {label}...")
    result = client.call(endpoint, {"blog_id": blog_id, "notes": f"Auto: {label} via unified MCP server port 7367"})
    if not result.get("success"):
        print(f"   [FAIL] {label}: {result}")
        return False
    status = result.get("data", {}).get("status", "ok")
    print(f"   [OK] {label} -> status: {status}")
    return True


def run_audit(client, blog_id):
    print(f"   -> Running SEO audit...")
    result = client.call("cms_run_seo_audit", {"blog_id": blog_id, "lang": "en"})
    if not result.get("success"):
        print(f"   [WARN] Audit failed: {result}")
        return 0
    data = result.get("data", {})
    score = data.get("score") or data.get("seoScore") or data.get("auditScore") or 0
    issues = data.get("issues", [])
    print(f"   [OK] SEO Score: {score}/100 (issues: {len(issues) if isinstance(issues, list) else 'n/a'})")
    return score


def main():
    print("=" * 70)
    print("Jupsoft CMS - Auto-Publishing 4 DigifyNext Blogs")
    print("=" * 70)

    print("\n[1] Login...")
    client = CmsClient(MCP_BASE)
    login = client.login(CMS_EMAIL, CMS_PASSWORD)
    if not login.get("success"):
        print(f"[FAIL] Login: {login}")
        sys.exit(1)
    user = login.get("data", {}).get("user", {})
    print(f"[OK] {user.get('name')} ({user.get('email')})")

    print(f"\n[2] Confirming tenant {TARGET_WEBSITE_ID}...")
    sites = client.call("cms_list_websites")
    target = next((s for s in sites.get("data", []) if s.get("id") == TARGET_WEBSITE_ID), None)
    if not target:
        print(f"[FAIL] Tenant not found")
        sys.exit(1)
    print(f"[OK] {target.get('name')} - {target.get('domain')}")

    results = []
    for blog_file in BLOG_FILES:
        path = BLOGS_DIR / blog_file
        if not path.exists():
            print(f"\n[SKIP] {blog_file} not found")
            continue

        print(f"\n{'='*70}")
        print(f"Processing: {blog_file}")
        print('='*70)

        md = path.read_text(encoding='utf-8')
        meta, body = parse_frontmatter(md)
        if not meta:
            print(f"[FAIL] No frontmatter in {blog_file}")
            continue

        html = md_to_html(body)
        # Word count check
        word_count = len(re.findall(r'\w+', body))

        blog_id = create_blog(client, meta, html)
        if not blog_id:
            continue

        # Audit while in Draft
        seo = run_audit(client, blog_id)

        # Workflow transitions
        if not transition(client, blog_id, "cms_submit_blog_for_review", "Submit for review"):
            continue
        if not transition(client, blog_id, "cms_approve_blog", "Approve"):
            continue
        if not transition(client, blog_id, "cms_publish_blog", "Publish (triggers webhook)"):
            continue

        results.append({
            "file": blog_file,
            "blogId": blog_id,
            "title": meta.get("title"),
            "slug": meta.get("slug"),
            "seo": seo,
            "words": word_count,
        })

    print(f"\n\n{'='*70}")
    print("FINAL SUMMARY")
    print('='*70)
    for r in results:
        print(f"\n[OK] {r['file']}")
        print(f"   Title: {r['title'][:55]}...")
        print(f"   Blog ID: {r['blogId']}")
        print(f"   Slug: {r['slug']}")
        print(f"   SEO Score: {r['seo']}/100")
        print(f"   Word Count: {r['words']} (target: varies)")
    print(f"\n[SUCCESS] {len(results)}/4 blogs published!")


if __name__ == "__main__":
    main()
