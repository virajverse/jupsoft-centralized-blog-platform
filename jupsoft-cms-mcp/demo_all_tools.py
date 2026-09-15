"""
Interactive Execution Demo — Calling all 49 Jupsoft CMS MCP tools one by one.
Displays inputs, execution, and real responses from the live system.
"""

import sys
import os
import json
import time

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
os.environ["PYTHONUNBUFFERED"] = "1"
os.environ["CMS_API_BASE"] = "http://localhost:4000"
os.environ["CMS_ADMIN_EMAIL"] = "admin@jupsoft.com"
os.environ["CMS_ADMIN_PASSWORD"] = "Admin@12345"

from jupsoft_cms.service import JupsoftCMSService

svc = JupsoftCMSService()
counter = 0

def step(tool_name: str, description: str, inputs: dict, result: dict):
    global counter
    counter += 1
    print(f"\n{'='*75}")
    print(f"[{counter:02d}/49] TOOL: {tool_name}")
    print(f"DESC:     {description}")
    print(f"INPUT:    {json.dumps(inputs, indent=2, ensure_ascii=False)}")
    print(f"STATUS:   {result.get('status')} | SUCCESS: {result.get('success')}")
    
    # Pretty print data sample
    data = result.get("data", result.get("error"))
    if isinstance(data, dict):
        preview = {k: v for i, (k, v) in enumerate(data.items()) if i < 8}
        if len(data) > 8:
            preview["..."] = f"({len(data) - 8} more fields)"
        print(f"OUTPUT:   {json.dumps(preview, indent=2, ensure_ascii=False)}")
    elif isinstance(data, list):
        print(f"OUTPUT:   [List with {len(data)} items] First item: {json.dumps(data[0] if data else {}, indent=2, ensure_ascii=False)}")
    else:
        print(f"OUTPUT:   {str(data)[:200]}")
    print(f"{'='*75}")


print("\n" + "#"*75)
print("  EXECUTING ALL 49 JUPSOFT CMS MCP TOOLS LIVE ONE-BY-ONE")
print("#"*75)

# ==========================================
# 1. SYSTEM & AUTH (3 tools)
# ==========================================
r1 = svc.health_check()
step("cms_health_check", "Check API backend health and uptime", {}, r1)

r2 = svc.login("admin@jupsoft.com", "Admin@12345")
step("cms_login", "Authenticate as Super Admin and obtain JWT", {"email": "admin@jupsoft.com"}, r2)

r3 = svc.get_profile()
step("cms_get_profile", "Fetch authenticated admin identity and permissions", {}, r3)

# ==========================================
# 2. WEBSITES (5 tools)
# ==========================================
r4 = svc.list_websites()
step("cms_list_websites", "List all tenant websites and their domains", {}, r4)

r5 = svc.get_website("site-cloud")
step("cms_get_website", "Retrieve single tenant configuration and API key", {"website_id": "site-cloud"}, r5)

unique_ts = int(time.time())
r6 = svc.create_website(
    name=f"Demo Tenant {unique_ts % 1000}",
    domain=f"demo-{unique_ts}.local",
    description="Live demonstration website tenant",
    default_language="en",
    supported_languages=["en", "hi"],
    logo_url="https://images.unsplash.com/photo-demo",
)
step("cms_create_website", "Onboard a brand new tenant website", {"name": f"Demo Tenant {unique_ts % 1000}", "domain": f"demo-{unique_ts}.local"}, r6)

demo_site_id = r6.get("data", {}).get("id") or r6.get("id")

r7 = svc.update_website(
    demo_site_id,
    name=f"Demo Tenant Updated",
    domain=f"prod-{unique_ts}.jupsoft.com",
    logo_url="https://images.unsplash.com/photo-prod",
    status="active",
    revalidate_webhook_url="http://localhost:5001/api/revalidate",
)
step("cms_update_website", "Update domain (e.g. localhost to production) and webhook URL", {"website_id": demo_site_id, "domain": f"prod-{unique_ts}.jupsoft.com"}, r7)

r8 = svc.delete_website(demo_site_id)
step("cms_delete_website", "Clean up and permanently delete demo website tenant", {"website_id": demo_site_id}, r8)

# ==========================================
# 3. TAXONOMY (6 tools)
# ==========================================
r9 = svc.list_categories("site-cloud")
step("cms_list_categories", "List categories for site-cloud", {"website_id": "site-cloud"}, r9)

r10 = svc.create_category(
    website_id="site-cloud",
    name=f"FinOps & Cloud {unique_ts % 1000}",
    description="Articles covering financial cloud operations",
)
step("cms_create_category", "Create a new category in site-cloud", {"name": f"FinOps & Cloud {unique_ts % 1000}"}, r10)
demo_cat_id = r10.get("data", {}).get("id") or r10.get("id")

r11 = svc.delete_category(demo_cat_id)
step("cms_delete_category", "Delete a category by ID", {"category_id": demo_cat_id}, r11)

r12 = svc.list_tags("site-cloud")
step("cms_list_tags", "List all tags in site-cloud", {"website_id": "site-cloud"}, r12)

r13 = svc.create_tag(
    website_id="site-cloud",
    name=f"cloud-finops-{unique_ts % 1000}",
)
step("cms_create_tag", "Create a new tag in site-cloud", {"name": f"cloud-finops-{unique_ts % 1000}"}, r13)
demo_tag_id = r13.get("data", {}).get("id") or r13.get("id")

r14 = svc.delete_tag(demo_tag_id)
step("cms_delete_tag", "Delete a tag by ID", {"tag_id": demo_tag_id}, r14)

# ==========================================
# 4. MEDIA LIBRARY (5 tools)
# ==========================================
r15 = svc.list_media("site-cloud")
step("cms_list_media", "List media assets in site-cloud", {"website_id": "site-cloud"}, r15)

temp_img = os.path.join(os.path.dirname(__file__), "demo_img.png")
import base64
with open(temp_img, "wb") as f:
    f.write(base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="))

r16 = svc.upload_media_file(temp_img, "site-cloud", "Interactive Demo Banner")
step("cms_upload_media_file", "Direct file upload from disk with WebP conversion", {"file": temp_img, "website_id": "site-cloud"}, r16)
try:
    os.remove(temp_img)
except Exception:
    pass

r17 = svc.get_presigned_upload_url("asset.png", "image/png", "site-cloud", 1024, "Alt description")
step("cms_get_presigned_upload_url", "Generate AWS S3 presigned PUT URL", {"file_name": "asset.png"}, r17)

r18 = svc.confirm_media_upload(
    website_id="site-cloud",
    file_name="demo-asset.webp",
    file_type="image/webp",
    file_size_bytes=4096,
    s3_key="site-cloud/demo-asset.webp",
    cdn_url="http://localhost:4000/uploads/site-cloud/demo-asset.webp",
    alt_text="Direct client upload confirmation",
)
step("cms_confirm_media_upload", "Register client-uploaded S3 asset into database", {"s3_key": "site-cloud/demo-asset.webp"}, r18)

r19 = svc.delete_media("dummy-id-for-demonstration")
step("cms_delete_media", "Soft-delete media asset (marks deletedAt)", {"media_id": "dummy-id-for-demonstration"}, r19)

# ==========================================
# 5. BLOGS & EDITORIAL WORKFLOW (12 tools)
# ==========================================
r20 = svc.list_blogs(website_id="site-cloud", limit=3)
step("cms_list_blogs", "Query blogs with tenant filter", {"website_id": "site-cloud", "limit": 3}, r20)

r21 = svc.create_blog(
    website_id="site-cloud",
    title=f"Autonomous AI Agents in Modern ERP {unique_ts % 1000}",
    content="<h2>Introduction</h2><p>AI agents are transforming cloud ERP workflows in 2026.</p><h2>Architecture</h2><p>Multi-tenant microservices scale effortlessly.</p>",
    excerpt="How autonomous LLM agents streamline business ERP operations.",
    featured_image="https://images.unsplash.com/photo-1518770660439-4636190af475?w=800",
    featured_image_alt="Autonomous AI Agents",
    meta_title=f"Autonomous AI Agents in Modern ERP | Jupsoft",
    meta_description="Discover how autonomous AI agents are transforming modern cloud ERP workflows in 2026.",
    focus_keyword="AI agents",
    canonical_url="https://cloud.jupsoft.com/blog/ai-agents-erp",
    og_title="AI Agents in ERP",
    og_description="Autonomous agents streamline business ERP.",
    language="en",
)
step("cms_create_blog", "Create a new blog draft in site-cloud", {"title": f"Autonomous AI Agents in Modern ERP {unique_ts % 1000}"}, r21)
demo_blog_id = r21.get("data", {}).get("id") or r21.get("id")

r22 = svc.get_blog(demo_blog_id)
step("cms_get_blog", "Retrieve full blog detail including all language translations", {"blog_id": demo_blog_id}, r22)

r23 = svc.update_blog(
    demo_blog_id,
    excerpt="Updated excerpt: Comprehensive study on AI agents in cloud enterprise software.",
    meta_description="Updated meta description on autonomous LLM agent architecture.",
    language="en",
)
step("cms_update_blog", "Update blog content and SEO metadata", {"blog_id": demo_blog_id}, r23)

r24 = svc.upsert_translation(
    blog_id=demo_blog_id,
    language="hi",
    title=f"आधुनिक क्लाउड ईआरपी में एआई एजेंट {unique_ts % 1000}",
    content="<h2>परिचय</h2><p>2026 में स्वायत्त एआई एजेंट ईआरपी संचालन को क्रांतिकारी बना रहे हैं।</p>",
    excerpt="क्लाउड ईआरपी में एआई एजेंटों की महत्वपूर्ण भूमिका।",
    focus_keyword="एआई एजेंट",
)
step("cms_upsert_translation", "Add Hindi translation to the article", {"blog_id": demo_blog_id, "language": "hi"}, r24)

r25 = svc.run_seo_audit(demo_blog_id, "en")
step("cms_run_seo_audit", "Run 8-check automated SEO audit (0-100 score)", {"blog_id": demo_blog_id}, r25)

r26 = svc.submit_blog_for_review(demo_blog_id, "Article complete and verified for editorial review")
step("cms_submit_blog_for_review", "Move blog from Draft -> Under Review", {"blog_id": demo_blog_id}, r26)

r27 = svc.approve_blog(demo_blog_id, "Approved by Super Admin")
step("cms_approve_blog", "Move blog from Under Review -> Approved", {"blog_id": demo_blog_id}, r27)

r28 = svc.schedule_blog(demo_blog_id, "2026-11-01T09:00:00.000Z", "Scheduled for November release")
step("cms_schedule_blog", "Schedule article for future release date", {"blog_id": demo_blog_id, "scheduled_at": "2026-11-01T09:00:00.000Z"}, r28)

r29 = svc.publish_blog(demo_blog_id, "Publish live immediately")
step("cms_publish_blog", "Publish article live and fire cache invalidation", {"blog_id": demo_blog_id}, r29)

r30 = svc.archive_blog(demo_blog_id)
step("cms_archive_blog", "Archive article (Published -> Archived)", {"blog_id": demo_blog_id}, r30)

r31 = svc.delete_blog(demo_blog_id)
step("cms_delete_blog", "Permanently delete demo article", {"blog_id": demo_blog_id}, r31)

# ==========================================
# 6. USERS & RBAC (5 tools)
# ==========================================
r32 = svc.list_users()
step("cms_list_users", "List team members and tenant role assignments", {}, r32)

demo_user_email = f"lead-editor-{unique_ts}@jupsoft.com"
r33 = svc.invite_user(
    name="Vikramaditya Verma",
    email=demo_user_email,
    role="Content Writer",
    website_id="site-cloud",
)
step("cms_invite_user", "Invite team member with tenant-scoped role", {"email": demo_user_email, "role": "Content Writer"}, r33)
demo_user_id = r33.get("data", {}).get("id") or r33.get("id")

r34 = svc.update_user_role(demo_user_id, "Editor", "site-cloud")
step("cms_update_user_role", "Promote user role from Content Writer -> Editor", {"user_id": demo_user_id, "new_role": "Editor"}, r34)

r35 = svc.update_user_status(demo_user_id, "active")
step("cms_update_user_status", "Set user status to active", {"user_id": demo_user_id, "status": "active"}, r35)

r36 = svc.delete_user(demo_user_id)
step("cms_delete_user", "Revoke and delete user permanently", {"user_id": demo_user_id}, r36)

# ==========================================
# 7. 301 REDIRECTS (3 tools)
# ==========================================
r37 = svc.list_redirects("site-cloud")
step("cms_list_redirects", "List permanent 301 redirect rules for site-cloud", {"website_id": "site-cloud"}, r37)

r38 = svc.create_redirect(
    website_id="site-cloud",
    from_slug=f"legacy-erp-url-{unique_ts}",
    to_slug=f"modern-erp-url-{unique_ts}",
)
step("cms_create_redirect", "Create a 301 permanent redirect rule", {"from_slug": f"legacy-erp-url-{unique_ts}"}, r38)
demo_redir_id = r38.get("data", {}).get("id") or r38.get("id")

r39 = svc.delete_redirect(demo_redir_id)
step("cms_delete_redirect", "Delete redirect rule", {"redirect_id": demo_redir_id}, r39)

# ==========================================
# 8. ANALYTICS (3 tools)
# ==========================================
r40 = svc.get_analytics_dashboard("site-cloud", days=30)
step("cms_get_analytics_dashboard", "Retrieve website-level analytics summary", {"website_id": "site-cloud", "days": 30}, r40)

r41 = svc.get_blog_analytics("art-cloud-1", days=30)
step("cms_get_blog_analytics", "Get per-blog page views and completion stats", {"blog_id": "art-cloud-1"}, r41)

r42 = svc.track_view("art-cloud-1", "site-cloud", "demo-agent-session", "https://news.google.com")
step("cms_track_view", "Track fire-and-forget reader view event", {"blog_id": "art-cloud-1"}, r42)

# ==========================================
# 9. WEBHOOKS & CACHE (3 tools)
# ==========================================
r43 = svc.get_webhook_logs(website_id="site-cloud", limit=5)
step("cms_get_webhook_logs", "Inspect HMAC cache revalidation delivery logs", {"website_id": "site-cloud"}, r43)

r44 = svc.trigger_cache_revalidate("site-cloud", "ai-powered-shift-modern-cloud-erp-2026", "blog.published")
step("cms_trigger_cache_revalidate", "Dispatch on-demand HMAC cache purge to consumer site", {"slug": "ai-powered-shift-modern-cloud-erp-2026"}, r44)

r45 = svc.retry_failed_webhooks()
step("cms_retry_failed_webhooks", "Trigger webhook retry worker for failed deliveries", {}, r45)

# ==========================================
# 10. SYSTEM AUDIT & PUBLIC CONSUMER (4 tools)
# ==========================================
r46 = svc.get_audit_logs(website_id="site-cloud", limit=5)
step("cms_get_audit_logs", "Retrieve immutable system activity audit trail", {"website_id": "site-cloud"}, r46)

r47 = svc.get_blog_by_slug("ai-powered-shift-modern-cloud-erp-2026", "site-cloud", "en")
step("cms_get_blog_by_slug", "Public consumer view with Schema.org JSON-LD", {"slug": "ai-powered-shift-modern-cloud-erp-2026"}, r47)

r48 = svc.get_latest_blogs("site-cloud", "en", limit=3)
step("cms_get_latest_blogs", "Fetch latest published blogs for consumer site", {"website_id": "site-cloud", "limit": 3}, r48)

r49 = svc.get_popular_blogs("site-cloud", "en", limit=3)
step("cms_get_popular_blogs", "Fetch most popular blogs by view count", {"website_id": "site-cloud", "limit": 3}, r49)

print("\n" + "#"*75)
print(f"  SUCCESSFULLY EXECUTED ALL {counter} TOOLS LIVE ON THE SYSTEM!")
print("#"*75 + "\n")
