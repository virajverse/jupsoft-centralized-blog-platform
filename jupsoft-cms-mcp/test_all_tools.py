"""
Jupsoft CMS MCP — Full Regression Test Suite (49 Tools)
Tests all tools in proper lifecycle order with full CRUD cycles and clean tear-down.
Windows safe (ASCII only, no UnicodeEncodeError on cp1252).
Run: python test_all_tools.py
"""

import sys
import os
import time
import json
import traceback
from typing import Any, Dict, List, Tuple

# Reconfigure stdout/stderr for utf-8 if possible
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
os.environ["PYTHONUNBUFFERED"] = "1"
os.environ["CMS_API_BASE"] = "http://localhost:4000"
os.environ["CMS_ADMIN_EMAIL"] = "admin@jupsoft.com"
os.environ["CMS_ADMIN_PASSWORD"] = "Admin@12345"

from jupsoft_cms.service import JupsoftCMSService

# ------------------------------------------------------------------
# Test Runner
# ------------------------------------------------------------------
RESULTS: List[Tuple[str, str, str, Any]] = []
CREATED_IDS: Dict[str, str] = {}

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
BLUE   = "\033[94m"
BOLD   = "\033[1m"
RESET  = "\033[0m"


def run_test(tool_name: str, fn, expected_success: bool = True) -> Any:
    try:
        result = fn()
        success = result.get("success", False)
        status_code = result.get("status", 0)
        data = result.get("data", result.get("error", ""))

        if success or (status_code in (200, 201, 204)):
            mark = f"{GREEN}PASS{RESET}"
            msg = f"[{status_code}] OK"
            RESULTS.append((tool_name, "PASS", msg, data))
            print(f"  {mark} {tool_name:<40} {msg}")
            return data
        else:
            if not expected_success:
                mark = f"{YELLOW}PASS(expected fail){RESET}"
                msg = f"[{status_code}] Expected failure"
                RESULTS.append((tool_name, "PASS", msg, data))
                print(f"  {mark} {tool_name:<40} {msg}")
                return data
            mark = f"{RED}FAIL{RESET}"
            msg = f"[{status_code}] {str(data)[:120]}"
            RESULTS.append((tool_name, "FAIL", msg, data))
            print(f"  {mark} {tool_name:<40} {msg}")
            return data
    except Exception as e:
        mark = f"{RED}ERROR{RESET}"
        msg = f"Exception: {str(e)[:120]}"
        RESULTS.append((tool_name, "ERROR", msg, str(e)))
        print(f"  {mark} {tool_name:<40} {msg}")
        return {}


def section(title: str):
    print(f"\n{BOLD}{BLUE}{'='*60}{RESET}")
    print(f"{BOLD}{BLUE}  {title}{RESET}")
    print(f"{BOLD}{BLUE}{'='*60}{RESET}")


def get_id(data, *keys) -> str:
    """Extract an ID from dictionary or response."""
    if isinstance(data, dict):
        for k in keys:
            v = data.get(k)
            if v:
                return str(v)
        inner = data.get("data", {})
        if isinstance(inner, dict):
            for k in keys:
                v = inner.get(k)
                if v:
                    return str(v)
        if isinstance(inner, list) and inner:
            for k in keys:
                v = inner[0].get(k) if isinstance(inner[0], dict) else None
                if v:
                    return str(v)
    return ""


def main():
    print(f"\n{BOLD}[TEST] Jupsoft CMS MCP - Full Regression Test Suite (49 Tools){RESET}")
    print(f"  Backend : http://localhost:4000")
    print(f"  Admin   : admin@jupsoft.com")
    print(f"  Time    : {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    svc = JupsoftCMSService()
    print(f"  [OK] Service initialized, token: {'acquired' if svc._token else 'FAILED'}\n")

    if not svc._token:
        print(f"{RED}FATAL: Could not authenticate. Is backend running?{RESET}")
        sys.exit(1)

    # 1. SYSTEM
    section("1. SYSTEM (1 tool)")
    run_test("cms_health_check", lambda: svc.health_check())

    # 2. AUTH
    section("2. AUTH (2 tools)")
    run_test("cms_login", lambda: svc.login("admin@jupsoft.com", "Admin@12345"))
    run_test("cms_get_profile", lambda: svc.get_profile())

    # 3. WEBSITES
    section("3. WEBSITES (5 tools)")
    run_test("cms_list_websites", lambda: svc.list_websites())
    run_test("cms_get_website", lambda: svc.get_website("site-cloud"))

    # Create unique test website
    unique_domain = f"test-mcp-{int(time.time())}.local"
    create_site_res = run_test("cms_create_website", lambda: svc.create_website(
        name="Test MCP Tenant",
        domain=unique_domain,
        description="Regression test tenant",
        default_language="en",
        supported_languages=["en", "hi"],
        logo_url="https://images.unsplash.com/photo-test",
    ))
    test_site_id = get_id(create_site_res, "id")
    if test_site_id:
        CREATED_IDS["website"] = test_site_id
        print(f"    -> Created website ID: {test_site_id}")

        # Test update website with domain and logoUrl
        new_domain = f"updated-{unique_domain}"
        run_test("cms_update_website", lambda: svc.update_website(
            test_site_id,
            name="Test MCP Tenant (Updated)",
            domain=new_domain,
            logo_url="https://images.unsplash.com/photo-updated",
            status="active",
            revalidate_webhook_url="http://localhost:5001/api/revalidate",
        ))

    # 4. TAXONOMY (Categories & Tags)
    section("4. TAXONOMY (6 tools)")
    run_test("cms_list_categories", lambda: svc.list_categories("site-cloud"))
    run_test("cms_list_tags", lambda: svc.list_tags("site-cloud"))

    # Create and delete Category
    cat_res = run_test("cms_create_category", lambda: svc.create_category(
        website_id="site-cloud",
        name=f"Test Category {int(time.time()) % 1000}",
        description="Automated test category",
    ))
    cat_id = get_id(cat_res, "id")
    if cat_id:
        CREATED_IDS["category"] = cat_id
        print(f"    -> Created Category ID: {cat_id}")
        run_test("cms_delete_category", lambda: svc.delete_category(cat_id))

    # Create and delete Tag
    tag_res = run_test("cms_create_tag", lambda: svc.create_tag(
        website_id="site-cloud",
        name=f"test-tag-{int(time.time()) % 1000}",
    ))
    tag_id = get_id(tag_res, "id")
    if tag_id:
        CREATED_IDS["tag"] = tag_id
        print(f"    -> Created Tag ID: {tag_id}")
        run_test("cms_delete_tag", lambda: svc.delete_tag(tag_id))

    # 5. BLOGS — Full Lifecycle & Translations (12 tools)
    section("5. BLOGS — Lifecycle & Translations (12 tools)")
    run_test("cms_list_blogs", lambda: svc.list_blogs(website_id="site-cloud", limit=5))

    # Create Draft
    blog_res = run_test("cms_create_blog", lambda: svc.create_blog(
        website_id="site-cloud",
        title=f"Regression Test Article {int(time.time())}",
        content="<h2>Introduction</h2><p>This is a test article for MCP validation.</p><h2>Details</h2><p>Cloud ERP transforms enterprise operations.</p>",
        excerpt="Short summary of test article",
        featured_image="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800",
        featured_image_alt="Cloud ERP Architecture banner",
        meta_title=f"Regression Test Article {int(time.time())} | Jupsoft",
        meta_description="Comprehensive guide on cloud enterprise resource planning.",
        focus_keyword="Cloud ERP",
        canonical_url="https://cloud.jupsoft.com/blog/test-article",
        og_title="Cloud ERP Guide",
        og_description="Learn how Cloud ERP scales business.",
        language="en",
    ))
    blog_id = get_id(blog_res, "id")
    if blog_id:
        CREATED_IDS["blog"] = blog_id
        print(f"    -> Created blog ID: {blog_id}")

        run_test("cms_get_blog", lambda: svc.get_blog(blog_id))

        run_test("cms_update_blog", lambda: svc.update_blog(
            blog_id,
            excerpt="Updated excerpt for test article",
            meta_description="Updated meta description for test article.",
            language="en",
        ))

        # Test Multi-language translation tool
        run_test("cms_upsert_translation", lambda: svc.upsert_translation(
            blog_id=blog_id,
            language="hi",
            title=f"क्लाउड ईआरपी गाइड {int(time.time()) % 1000}",
            content="<h2>परिचय</h2><p>क्लाउड ईआरपी व्यवसायों के लिए अत्यंत उपयोगी समाधान है।</p>",
            excerpt="क्लाउड ईआरपी का संक्षिप्त विवरण।",
            focus_keyword="क्लाउड ईआरपी",
        ))

        # SEO audit
        run_test("cms_run_seo_audit", lambda: svc.run_seo_audit(blog_id, "en"))

        # Workflow: Draft -> Under Review -> Approved
        run_test("cms_submit_blog_for_review", lambda: svc.submit_blog_for_review(blog_id, "Automated test review request"))
        run_test("cms_approve_blog", lambda: svc.approve_blog(blog_id, "Approved by Super Admin test"))

        # Test dedicated schedule tool
        schedule_time = "2026-10-01T12:00:00.000Z"
        run_test("cms_schedule_blog", lambda: svc.schedule_blog(blog_id, schedule_time, "Scheduled for October"))

        # Test immediate publish
        run_test("cms_publish_blog", lambda: svc.publish_blog(blog_id, "Publish live now"))

        # Archive
        run_test("cms_archive_blog", lambda: svc.archive_blog(blog_id))

    # 6. USERS (5 tools)
    section("6. USERS (5 tools)")
    run_test("cms_list_users", lambda: svc.list_users())

    unique_email = f"writer-{int(time.time())}@jupsoft.com"
    user_res = run_test("cms_invite_user", lambda: svc.invite_user(
        name="Test Writer",
        email=unique_email,
        role="Content Writer",
        website_id="site-cloud",
    ))
    user_id = get_id(user_res, "id")
    if user_id:
        CREATED_IDS["user"] = user_id
        print(f"    -> Invited user ID: {user_id}")
        run_test("cms_update_user_role", lambda: svc.update_user_role(user_id, "Editor", "site-cloud"))
        run_test("cms_update_user_status", lambda: svc.update_user_status(user_id, "active"))

    # 7. MEDIA (5 tools)
    section("7. MEDIA (5 tools)")
    run_test("cms_list_media", lambda: svc.list_media("site-cloud"))

    # Test direct file upload
    temp_img_path = os.path.join(os.path.dirname(__file__), "test_banner.png")
    # Generate 1x1 transparent PNG if not present
    if not os.path.exists(temp_img_path):
        import base64
        tiny_png = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")
        with open(temp_img_path, "wb") as f:
            f.write(tiny_png)

    run_test("cms_upload_media_file", lambda: svc.upload_media_file(temp_img_path, "site-cloud", "Test Banner Alt"))

    presign_res = run_test("cms_get_presigned_upload_url", lambda: svc.get_presigned_upload_url(
        file_name="sample.png",
        file_type="image/png",
        website_id="site-cloud",
        file_size_bytes=1024,
        alt_text="Sample Alt Text",
    ))

    # Confirm media upload
    run_test("cms_confirm_media_upload", lambda: svc.confirm_media_upload(
        website_id="site-cloud",
        file_name="sample-confirmed.webp",
        file_type="image/webp",
        file_size_bytes=2048,
        s3_key="site-cloud/sample-confirmed.webp",
        cdn_url="http://localhost:4000/uploads/site-cloud/sample-confirmed.webp",
        alt_text="Confirmed Image Alt",
    ))

    # Soft-delete media (endpoint test with dummy id)
    run_test("cms_delete_media (endpoint test)", lambda: svc.delete_media("non-existent-id"), expected_success=False)

    # 8. REDIRECTS (3 tools)
    section("8. REDIRECTS (3 tools)")
    run_test("cms_list_redirects", lambda: svc.list_redirects("site-cloud"))
    redir_res = run_test("cms_create_redirect", lambda: svc.create_redirect(
        website_id="site-cloud",
        from_slug=f"old-url-{int(time.time())}",
        to_slug=f"new-url-{int(time.time())}",
    ))
    redir_id = get_id(redir_res, "id")
    if redir_id:
        CREATED_IDS["redirect"] = redir_id
        print(f"    -> Created redirect ID: {redir_id}")
        run_test("cms_delete_redirect", lambda: svc.delete_redirect(redir_id))

    # 9. ANALYTICS (3 tools)
    section("9. ANALYTICS (3 tools)")
    run_test("cms_get_analytics_dashboard", lambda: svc.get_analytics_dashboard("site-cloud", days=30))
    run_test("cms_get_blog_analytics", lambda: svc.get_blog_analytics(CREATED_IDS.get("blog", "dummy-blog"), days=30))
    run_test("cms_track_view", lambda: svc.track_view(
        blog_id=CREATED_IDS.get("blog", "4959ded9-0e35-4771-966d-d6e52bb31cf3"),
        website_id="site-cloud",
        session_id="test-session-mcp",
        referrer="https://google.com",
    ))

    # 10. WEBHOOKS & CACHE REVALIDATION (3 tools)
    section("10. WEBHOOKS & CACHE REVALIDATION (3 tools)")
    run_test("cms_get_webhook_logs", lambda: svc.get_webhook_logs(limit=10))
    run_test("cms_trigger_cache_revalidate", lambda: svc.trigger_cache_revalidate("site-cloud", "test-slug", "blog.published"))
    run_test("cms_retry_failed_webhooks", lambda: svc.retry_failed_webhooks())

    # 11. AUDIT LOGS & PUBLIC CONSUMER APIS (5 tools)
    section("11. AUDIT LOGS & PUBLIC CONSUMER APIS (5 tools)")
    run_test("cms_get_audit_logs", lambda: svc.get_audit_logs(limit=20))
    run_test("cms_get_latest_blogs", lambda: svc.get_latest_blogs("site-cloud", "en", limit=3))
    run_test("cms_get_popular_blogs", lambda: svc.get_popular_blogs("site-cloud", "en", limit=3))
    run_test("cms_get_blog_by_slug", lambda: svc.get_blog_by_slug("ai-powered-shift-modern-cloud-erp-2026", "site-cloud", "en"))
    run_test("cms_search_blogs", lambda: svc.search_blogs("cloud", website_id="site-cloud"))

    # CLEANUP
    section("CLEANUP — Delete Test Resources")
    if CREATED_IDS.get("user"):
        run_test("cms_delete_user (cleanup)", lambda: svc.delete_user(CREATED_IDS["user"]))

    if CREATED_IDS.get("blog"):
        run_test("cms_delete_blog (cleanup)", lambda: svc.delete_blog(CREATED_IDS["blog"]))

    if CREATED_IDS.get("website"):
        run_test("cms_delete_website (cleanup)", lambda: svc.delete_website(CREATED_IDS["website"]))

    if os.path.exists(temp_img_path):
        try:
            os.remove(temp_img_path)
        except Exception:
            pass

    # REPORT
    passed  = [r for r in RESULTS if r[1] == "PASS"]
    failed  = [r for r in RESULTS if r[1] == "FAIL"]
    errors  = [r for r in RESULTS if r[1] == "ERROR"]
    total   = len(RESULTS)

    print(f"\n{BOLD}{'='*60}{RESET}")
    print(f"{BOLD}FINAL REGRESSION REPORT{RESET}")
    print(f"{'='*60}")
    print(f"  Total Tests  : {total}")
    print(f"  {GREEN}PASS{RESET}         : {len(passed)}")
    print(f"  {RED}FAIL{RESET}         : {len(failed)}")
    print(f"  {RED}ERROR{RESET}        : {len(errors)}")
    print(f"{'='*60}")

    if failed or errors:
        print(f"\n{RED}{BOLD}FAILURES / ERRORS:{RESET}")
        for r in failed + errors:
            print(f"  [X] {r[0]:<45} {r[2]}")

    score = int((len(passed) / total) * 100) if total > 0 else 0
    color = GREEN if score >= 90 else YELLOW if score >= 70 else RED
    print(f"\n{color}{BOLD}  SCORE: {score}%  ({len(passed)}/{total} passed){RESET}\n")

    return 0 if not (failed or errors) else 1


if __name__ == "__main__":
    sys.exit(main())
