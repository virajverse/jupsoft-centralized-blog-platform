"""
Jupsoft CMS MCP Server — Super Admin Control Suite
Exposes 52 tools for AI agents to fully operate the Jupsoft Centralized Blog Platform.
Uses FastMCP (same pattern as spectra-browser-mcp and infinity-scraper).
Author: Jupsoft Systems / VirajVerse
"""

import sys
import os
import json
import logging
from typing import Any, Dict, List, Optional

if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from mcp.server.fastmcp import FastMCP
from jupsoft_cms.service import JupsoftCMSService

logging.basicConfig(level=logging.INFO, stream=sys.stderr, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("jupsoft_cms")

mcp = FastMCP(
    "jupsoft-cms-admin",
    instructions=(
        "You are operating as a Super Admin of the Jupsoft Centralized Multi-Site Blog CMS. "
        "You have unrestricted access to all 3 tenant websites (Jupsoft Cloud & ERP, DigifyNext Marketing, School ERP Platform). "
        "You can create, edit, approve, schedule, publish, and archive blogs; manage users, categories, tags, media, 301 redirects; "
        "run SEO audits; inspect webhook delivery logs and trigger cache revalidations; view analytics; and manage tenant websites. "
        "Always use cms_health_check first to verify the backend is running. "
        "The backend runs on http://localhost:4000. "
        "Default website IDs: 'site-cloud' (Jupsoft Cloud), 'site-growth' (DigifyNext), 'site-edtech' (School ERP)."
    ),
)

service = JupsoftCMSService()


# ==========================================================
# 🏥 1. SYSTEM
# ==========================================================

@mcp.tool()
def cms_health_check() -> Dict[str, Any]:
    """Check if the Jupsoft CMS backend API is running and healthy. Always call this first."""
    return service.health_check()


# ==========================================================
# 🔐 2. AUTH
# ==========================================================

@mcp.tool()
def cms_login(email: str = "admin@jupsoft.com", password: str = "Admin@12345") -> Dict[str, Any]:
    """Login to the CMS as Super Admin. Auto-called on startup. Returns JWT token + user profile."""
    return service.login(email, password)


@mcp.tool()
def cms_get_profile() -> Dict[str, Any]:
    """Get the currently authenticated admin user's profile, role assignments, and permissions."""
    return service.get_profile()


@mcp.tool()
def cms_logout() -> Dict[str, Any]:
    """Log out from CMS and revoke the current refresh token in Redis (prevents replay)."""
    return service.logout()


# ==========================================================
# 🏢 3. WEBSITES / MULTI-TENANT
# ==========================================================

@mcp.tool()
def cms_list_websites() -> Dict[str, Any]:
    """
    List all tenant websites managed in the CMS.
    Returns id, name, domain, status, apiKey, supportedLanguages.
    Known site IDs: 'site-cloud', 'site-growth', 'site-edtech'.
    """
    return service.list_websites()


@mcp.tool()
def cms_get_website(website_id: str) -> Dict[str, Any]:
    """
    Retrieve single website tenant details including domain, API key, webhook URL, and article count.
    website_id: e.g. 'site-cloud', 'site-growth', or 'site-edtech'.
    """
    return service.get_website(website_id)


@mcp.tool()
def cms_create_website(
    name: str,
    domain: str,
    description: str = "",
    default_language: str = "en",
    supported_languages: Optional[List[str]] = None,
    logo_url: str = "",
) -> Dict[str, Any]:
    """
    Create a new tenant website. Only Super Admin can do this.
    Example: name='My Blog', domain='localhost:5004' (or 'myblog.com')
    """
    return service.create_website(name, domain, description, default_language, supported_languages or ["en"], logo_url)


@mcp.tool()
def cms_update_website(
    website_id: str,
    name: Optional[str] = None,
    domain: Optional[str] = None,
    logo_url: Optional[str] = None,
    description: Optional[str] = None,
    status: Optional[str] = None,
    revalidate_webhook_url: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Update an existing website's config (domain, name, logo, description, status, webhook URL).
    website_id: 'site-cloud', 'site-growth', or 'site-edtech'
    domain: e.g. change from 'localhost:5001' to 'cloud.jupsoft.com'
    status: 'active' or 'inactive'
    """
    return service.update_website(website_id, name, domain, logo_url, description, status, revalidate_webhook_url)


@mcp.tool()
def cms_delete_website(website_id: str) -> Dict[str, Any]:
    """Delete a tenant website permanently. Use with caution — this removes all associated content."""
    return service.delete_website(website_id)


# ==========================================================
# ✍️ 4. BLOG MANAGEMENT & WORKFLOW
# ==========================================================

@mcp.tool()
def cms_list_blogs(
    website_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    author_id: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> Dict[str, Any]:
    """
    List blogs from the CMS with optional filters.
    website_id: Filter by tenant ('site-cloud', 'site-growth', 'site-edtech'). Omit for all sites.
    status: Filter by workflow stage — 'Draft', 'Under Review', 'Approved', 'Scheduled', 'Published', 'Archived'
    search: Search in titles and content
    author_id: Filter by author user ID
    """
    return service.list_blogs(website_id, status, search, author_id, page, limit)


@mcp.tool()
def cms_get_blog(blog_id: str) -> Dict[str, Any]:
    """Get a single blog post by its ID, including all language translations, workflow logs, and SEO fields."""
    return service.get_blog(blog_id)


@mcp.tool()
def cms_create_blog(
    website_id: str,
    title: str,
    content: str,
    excerpt: str = "",
    featured_image: str = "",
    featured_image_alt: str = "",
    category_ids: Optional[List[str]] = None,
    tag_ids: Optional[List[str]] = None,
    meta_title: Optional[str] = None,
    meta_description: Optional[str] = None,
    focus_keyword: Optional[str] = None,
    canonical_url: Optional[str] = None,
    og_title: Optional[str] = None,
    og_description: Optional[str] = None,
    og_image: Optional[str] = None,
    language: str = "en",
) -> Dict[str, Any]:
    """
    Create a new blog draft in the CMS.
    website_id: Which tenant website this blog belongs to ('site-cloud', 'site-growth', 'site-edtech')
    content: HTML content of the blog post
    Returns the created blog with its ID for further workflow operations.
    """
    return service.create_blog(
        website_id=website_id,
        title=title,
        content=content,
        excerpt=excerpt,
        featured_image=featured_image,
        featured_image_alt=featured_image_alt,
        category_ids=category_ids or [],
        tag_ids=tag_ids or [],
        meta_title=meta_title or title,
        meta_description=meta_description or excerpt,
        focus_keyword=focus_keyword or "",
        canonical_url=canonical_url or "",
        og_title=og_title or title,
        og_description=og_description or excerpt,
        og_image=og_image or featured_image,
        language=language,
    )


@mcp.tool()
def cms_update_blog(
    blog_id: str,
    title: Optional[str] = None,
    content: Optional[str] = None,
    excerpt: Optional[str] = None,
    featured_image: Optional[str] = None,
    featured_image_alt: Optional[str] = None,
    category_ids: Optional[List[str]] = None,
    tag_ids: Optional[List[str]] = None,
    meta_title: Optional[str] = None,
    meta_description: Optional[str] = None,
    focus_keyword: Optional[str] = None,
    canonical_url: Optional[str] = None,
    og_title: Optional[str] = None,
    og_description: Optional[str] = None,
    og_image: Optional[str] = None,
    language: str = "en",
) -> Dict[str, Any]:
    """
    Update an existing blog post's content, SEO fields, categories, or tags.
    Only specify the fields you want to change.
    """
    return service.update_blog(
        blog_id=blog_id,
        title=title,
        content=content,
        excerpt=excerpt,
        featured_image=featured_image,
        featured_image_alt=featured_image_alt,
        category_ids=category_ids,
        tag_ids=tag_ids,
        meta_title=meta_title,
        meta_description=meta_description,
        focus_keyword=focus_keyword,
        canonical_url=canonical_url,
        og_title=og_title,
        og_description=og_description,
        og_image=og_image,
        language=language,
    )


@mcp.tool()
def cms_upsert_translation(
    blog_id: str,
    language: str,
    title: str,
    content: str,
    excerpt: str = "",
    meta_title: Optional[str] = None,
    meta_description: Optional[str] = None,
    focus_keyword: Optional[str] = None,
    canonical_url: Optional[str] = None,
    og_title: Optional[str] = None,
    og_description: Optional[str] = None,
    og_image: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Add or update a translation in a specific language (e.g. 'hi' for Hindi, 'ar' for Arabic) for an existing blog post.
    language: 2-letter ISO code e.g. 'hi', 'fr', 'ar', 'es'
    """
    return service.upsert_translation(
        blog_id=blog_id,
        language=language,
        title=title,
        content=content,
        excerpt=excerpt,
        meta_title=meta_title or title,
        meta_description=meta_description or excerpt,
        focus_keyword=focus_keyword or "",
        canonical_url=canonical_url or "",
        og_title=og_title or title,
        og_description=og_description or excerpt,
        og_image=og_image or "",
    )


@mcp.tool()
def cms_delete_blog(blog_id: str) -> Dict[str, Any]:
    """Permanently delete a blog post. This action cannot be undone."""
    return service.delete_blog(blog_id)


@mcp.tool()
def cms_submit_blog_for_review(blog_id: str, notes: str = "") -> Dict[str, Any]:
    """
    Move a blog from Draft → Under Review stage.
    notes: Optional editorial notes for the reviewer.
    """
    return service.submit_blog_for_review(blog_id, notes)


@mcp.tool()
def cms_approve_blog(blog_id: str, notes: str = "") -> Dict[str, Any]:
    """
    Approve a blog (Under Review → Approved).
    As Super Admin you can approve any blog.
    notes: Optional approval notes.
    """
    return service.approve_blog(blog_id, notes)


@mcp.tool()
def cms_publish_blog(blog_id: str, notes: str = "") -> Dict[str, Any]:
    """
    Publish a blog immediately (Approved → Published).
    This triggers Redis cache invalidation + HMAC webhook revalidation on the consumer website.
    notes: Optional publishing notes.
    """
    return service.publish_blog(blog_id, notes)


@mcp.tool()
def cms_schedule_blog(blog_id: str, scheduled_at: str, notes: str = "") -> Dict[str, Any]:
    """
    Schedule an approved blog post for release at a future timestamp (Approved → Scheduled).
    scheduled_at: ISO 8601 datetime string e.g. '2026-09-25T10:00:00Z'
    notes: Optional scheduling notes.
    """
    return service.schedule_blog(blog_id, scheduled_at, notes)


@mcp.tool()
def cms_archive_blog(blog_id: str) -> Dict[str, Any]:
    """Archive a published blog (Published → Archived). The blog becomes inaccessible on the public API."""
    return service.archive_blog(blog_id)


@mcp.tool()
def cms_run_seo_audit(blog_id: str, lang: str = "en") -> Dict[str, Any]:
    """
    Run the 8-check automated SEO audit on a blog post and get a score 0-100 with actionable recommendations.
    Checks: title length, meta description length, focus keyword density & presence in intro,
    heading hierarchy (single H1, multiple H2), image alt tags, canonical URL, and robots directive.
    """
    return service.run_seo_audit(blog_id, lang)


# ==========================================================
# 📂 5. TAXONOMY (Categories & Tags)
# ==========================================================

@mcp.tool()
def cms_list_categories(website_id: Optional[str] = None) -> Dict[str, Any]:
    """
    List all categories for a website (or all websites if website_id omitted).
    Categories are scoped per tenant and can be nested (parent_id).
    """
    return service.list_categories(website_id)


@mcp.tool()
def cms_create_category(
    website_id: str,
    name: str,
    slug: str = "",
    description: str = "",
    parent_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Create a new category in a website's taxonomy.
    parent_id: Set to nest under a parent category (optional).
    slug: URL-friendly identifier. Auto-generated from name if empty.
    """
    return service.create_category(website_id, name, slug, description, parent_id)


@mcp.tool()
def cms_delete_category(category_id: str) -> Dict[str, Any]:
    """Delete a category by its ID."""
    return service.delete_category(category_id)


@mcp.tool()
def cms_list_tags(website_id: Optional[str] = None) -> Dict[str, Any]:
    """List all tags for a website. Tags are scoped per tenant."""
    return service.list_tags(website_id)


@mcp.tool()
def cms_create_tag(
    website_id: str,
    name: str,
    slug: str = "",
) -> Dict[str, Any]:
    """
    Create a new tag in a website's taxonomy.
    slug: URL-friendly identifier. Auto-generated from name if empty.
    """
    return service.create_tag(website_id, name, slug)


@mcp.tool()
def cms_delete_tag(tag_id: str) -> Dict[str, Any]:
    """Delete a tag by its ID."""
    return service.delete_tag(tag_id)


# ==========================================================
# 👥 6. USER MANAGEMENT
# ==========================================================

@mcp.tool()
def cms_list_users() -> Dict[str, Any]:
    """
    List all users in the system across all tenant websites.
    Returns name, email, role assignments per website, status, and last login IP.
    """
    return service.list_users()


@mcp.tool()
def cms_invite_user(
    name: str,
    email: str,
    role: str,
    website_id: str,
) -> Dict[str, Any]:
    """
    Invite a new user to the CMS with a specific role on a website.
    role: 'Super Admin' | 'Website Admin' | 'Role Admin' | 'Editor' | 'Content Writer' | 'Publisher' | 'SEO Manager'
    website_id: Which tenant website to assign the role on.
    The user will receive a temporary password (Admin@12345 by default).
    """
    return service.invite_user(name, email, role, website_id)


@mcp.tool()
def cms_update_user_role(
    user_id: str,
    role: str,
    website_id: str,
) -> Dict[str, Any]:
    """
    Change a user's role on a specific website.
    role: 'Super Admin' | 'Website Admin' | 'Role Admin' | 'Editor' | 'Content Writer' | 'Publisher' | 'SEO Manager'
    """
    return service.update_user_role(user_id, role, website_id)


@mcp.tool()
def cms_update_user_status(user_id: str, status: str) -> Dict[str, Any]:
    """
    Activate or suspend a user account.
    status: 'active' or 'suspended'
    """
    return service.update_user_status(user_id, status)


@mcp.tool()
def cms_delete_user(user_id: str) -> Dict[str, Any]:
    """Permanently remove a user from the CMS. They will lose all access."""
    return service.delete_user(user_id)


# ==========================================================
# 🖼️ 7. MEDIA LIBRARY
# ==========================================================

@mcp.tool()
def cms_list_media(website_id: Optional[str] = None) -> Dict[str, Any]:
    """
    List all uploaded media assets in the media library.
    Returns file name, type, size, CDN URL, dimensions, and alt text.
    """
    return service.list_media(website_id)


@mcp.tool()
def cms_upload_media_file(
    file_path: str,
    website_id: str,
    alt_text: str = "",
) -> Dict[str, Any]:
    """
    Directly upload an image file from the local file system into the CMS Media Library (TRD §10).
    The backend automatically converts the image to WebP and generates responsive thumbnail sizes.
    file_path: Absolute local path to the image file (e.g. 'C:/images/banner.png')
    website_id: Tenant website ('site-cloud', 'site-growth', 'site-edtech')
    """
    return service.upload_media_file(file_path, website_id, alt_text)


@mcp.tool()
def cms_get_presigned_upload_url(
    file_name: str,
    file_type: str,
    website_id: str,
    file_size_bytes: int = 0,
    alt_text: str = "",
) -> Dict[str, Any]:
    """
    Get an AWS S3 pre-signed URL to upload a media file directly.
    file_type: MIME type e.g. 'image/jpeg', 'image/png', 'image/webp'
    file_size_bytes: File size in bytes
    Returns: uploadUrl (PUT to this), s3Key, cdnUrl
    """
    return service.get_presigned_upload_url(file_name, file_type, website_id, file_size_bytes, alt_text)


@mcp.tool()
def cms_confirm_media_upload(
    website_id: str,
    file_name: str,
    file_type: str,
    file_size_bytes: int,
    s3_key: str,
    cdn_url: str,
    alt_text: str = "",
) -> Dict[str, Any]:
    """
    Confirm and register client-uploaded media asset metadata into database after direct S3 upload.
    """
    return service.confirm_media_upload(website_id, file_name, file_type, file_size_bytes, s3_key, cdn_url, alt_text)


@mcp.tool()
def cms_delete_media(media_id: str) -> Dict[str, Any]:
    """Soft-delete a media asset from the media library (marks as deleted, S3 lifecycle cleans up)."""
    return service.delete_media(media_id)


# ==========================================================
# 🔄 8. 301 REDIRECTS
# ==========================================================

@mcp.tool()
def cms_list_redirects(website_id: Optional[str] = None) -> Dict[str, Any]:
    """
    List all 301 permanent redirect rules for a website.
    Redirects are auto-created when a published blog's slug changes.
    """
    return service.list_redirects(website_id)


@mcp.tool()
def cms_create_redirect(
    website_id: str,
    from_slug: str,
    to_slug: str,
) -> Dict[str, Any]:
    """
    Manually create a 301 redirect rule for a website.
    from_slug: Old URL path slug (e.g. 'old-blog-title')
    to_slug: New URL path slug (e.g. 'new-blog-title')
    """
    return service.create_redirect(website_id, from_slug, to_slug)


@mcp.tool()
def cms_delete_redirect(redirect_id: str) -> Dict[str, Any]:
    """Delete a 301 redirect rule."""
    return service.delete_redirect(redirect_id)


# ==========================================================
# 📊 9. ANALYTICS
# ==========================================================

@mcp.tool()
def cms_get_analytics_dashboard(
    website_id: str,
    days: int = 30,
) -> Dict[str, Any]:
    """
    Get website-level analytics dashboard data.
    website_id: 'site-cloud', 'site-growth', or 'site-edtech'
    days: Time range — 7, 30, 90, or 365
    Returns: totalViews, uniqueVisitors, avgReadPercent, topBlogs, topReferrers, topAuthors
    """
    return service.get_analytics_dashboard(website_id, days)


@mcp.tool()
def cms_get_blog_analytics(blog_id: str, days: int = 30) -> Dict[str, Any]:
    """Get per-blog analytics: views, unique visitors, read completion, and referrer breakdown."""
    return service.get_blog_analytics(blog_id, days)


@mcp.tool()
def cms_track_view(
    blog_id: str,
    website_id: str,
    session_id: str = "agent-session-001",
    referrer: str = "",
    event: str = "page_view",
) -> Dict[str, Any]:
    """
    Track a page view event for analytics (simulates a reader visiting a blog).
    event: 'page_view' or 'read_complete'
    """
    return service.track_view(blog_id, website_id, session_id, referrer, event)


# ==========================================================
# 📡 10. WEBHOOKS & CACHE REVALIDATION (TRD §13 & §15)
# ==========================================================

@mcp.tool()
def cms_get_webhook_logs(
    website_id: Optional[str] = None,
    limit: int = 50,
) -> Dict[str, Any]:
    """
    Retrieve HMAC webhook delivery logs to check if cache revalidation succeeded or failed.
    website_id: Filter by tenant (optional).
    Returns list of delivery logs with targetUrl, statusCode, attempt, delivered status.
    """
    return service.get_webhook_logs(website_id, limit)


@mcp.tool()
def cms_trigger_cache_revalidate(
    website_id: str,
    slug: str,
    event: str = "blog.published",
) -> Dict[str, Any]:
    """
    Manually dispatch an HMAC-SHA256 cache revalidation ping to a consumer website (TRD §13).
    event: 'blog.published' | 'blog.updated' | 'blog.unpublished'
    """
    return service.trigger_cache_revalidate(website_id, slug, event)


@mcp.tool()
def cms_retry_failed_webhooks() -> Dict[str, Any]:
    """
    Trigger the background webhook retry worker to re-attempt failed webhook deliveries.
    """
    return service.retry_failed_webhooks()


# ==========================================================
# 📋 11. AUDIT LOGS & PUBLIC CONSUMER APIS
# ==========================================================

@mcp.tool()
def cms_get_audit_logs(
    website_id: Optional[str] = None,
    event: Optional[str] = None,
    limit: int = 50,
) -> Dict[str, Any]:
    """
    Retrieve the admin activity audit log — who did what, when, from which IP.
    website_id: Filter by tenant (optional).
    event: Filter by event type e.g. 'blog.created', 'blog.published', 'user.invite'
    limit: Number of recent log entries to return.
    """
    return service.get_audit_logs(website_id, event, limit)


@mcp.tool()
def cms_get_blog_by_slug(
    slug: str,
    website_id: Optional[str] = None,
    language: str = "en",
) -> Dict[str, Any]:
    """
    Retrieve a published blog by its slug as rendered on consumer websites (TRD §12).
    Includes full rich text, author, categories, tags, and Schema.org JSON-LD structure.
    """
    return service.get_blog_by_slug(slug, website_id, language)


@mcp.tool()
def cms_get_latest_blogs(
    website_id: Optional[str] = None,
    language: str = "en",
    limit: int = 5,
) -> Dict[str, Any]:
    """
    Retrieve the latest published blogs for consumer websites (TRD §12).
    """
    return service.get_latest_blogs(website_id, language, limit)


@mcp.tool()
def cms_get_popular_blogs(
    website_id: Optional[str] = None,
    language: str = "en",
    limit: int = 5,
) -> Dict[str, Any]:
    """
    Retrieve the most popular (view count) published blogs for consumer websites (TRD §12).
    """
    return service.get_popular_blogs(website_id, language, limit)


@mcp.tool()
def cms_search_blogs(
    query: str,
    website_id: Optional[str] = None,
    language: str = "en",
    limit: int = 10,
) -> Dict[str, Any]:
    """
    Perform full-text search across published articles by keyword (TRD §12).
    """
    return service.search_blogs(query, website_id, language, limit)


@mcp.tool()
def cms_change_password(
    old_password: str,
    new_password: str,
) -> Dict[str, Any]:
    """
    Change the authenticated admin's password.
    """
    return service.change_password(old_password, new_password)


if __name__ == "__main__":
    mcp.run()
