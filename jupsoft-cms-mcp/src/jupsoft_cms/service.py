"""
Jupsoft CMS Service Layer — handles all HTTP calls to the backend REST API.
Auto-authenticates as Super Admin on init. Thread-safe token management.
Supports full Super Admin Suite (Websites, Blogs, Taxonomy, Users, Media,
Redirects, Analytics, Webhooks, and Public APIs).
"""

import logging
import os
import time
import mimetypes
from typing import Any, Dict, List, Optional

import requests

logger = logging.getLogger("jupsoft_cms.service")

DEFAULT_API_BASE = "https://blogary.jupsoft.com"
DEFAULT_ADMIN_EMAIL = "superadmin@jupsoft.com"
DEFAULT_ADMIN_PASSWORD = os.environ.get("CMS_ADMIN_PASSWORD", "Jupsoft#SuperAdmin2026!$")


class JupsoftCMSService:
    def __init__(self):
        self.api_base = os.environ.get("CMS_API_BASE", DEFAULT_API_BASE).rstrip("/")
        self.admin_email = os.environ.get("CMS_ADMIN_EMAIL", DEFAULT_ADMIN_EMAIL)
        self.admin_password = os.environ.get("CMS_ADMIN_PASSWORD", DEFAULT_ADMIN_PASSWORD)
        if not self.admin_password:
            raise RuntimeError(
                "CMS_ADMIN_PASSWORD environment variable is not set — refusing to run with "
                "default/hardcoded credentials."
            )
        self._token: Optional[str] = None
        self._refresh_token: Optional[str] = None
        self._token_expires_at: float = 0.0
        # Auto-login on startup
        self._ensure_authenticated()

    # ------------------------------------------------------------------
    # Internal Auth Helpers
    # ------------------------------------------------------------------

    def _ensure_authenticated(self) -> None:
        """Ensures a valid JWT token is present. Auto-logs in if missing or expired."""
        if self._token and time.time() < self._token_expires_at - 60:
            return
        # Try refresh first
        if self._refresh_token:
            try:
                res = requests.post(
                    f"{self.api_base}/admin/auth/refresh",
                    json={"refreshToken": self._refresh_token},
                    timeout=10,
                )
                if res.ok:
                    data = res.json()
                    self._token = data.get("accessToken")
                    self._refresh_token = data.get("refreshToken", self._refresh_token)
                    self._token_expires_at = time.time() + 6 * 24 * 3600  # ~6 days
                    logger.info("Token refreshed successfully.")
                    return
            except Exception as e:
                logger.warning(f"Token refresh failed: {e}")
        # Fresh login
        try:
            res = requests.post(
                f"{self.api_base}/admin/auth/login",
                json={"email": self.admin_email, "password": self.admin_password},
                timeout=10,
            )
            if res.ok:
                data = res.json()
                self._token = data.get("accessToken")
                self._refresh_token = data.get("refreshToken")
                self._token_expires_at = time.time() + 6 * 24 * 3600
                logger.info(f"Logged in as {self.admin_email} — token acquired.")
            else:
                logger.error(f"Login failed: {res.status_code} {res.text}")
        except Exception as e:
            logger.error(f"Login request failed: {e}")

    def _headers(self) -> Dict[str, str]:
        self._ensure_authenticated()
        headers = {"Content-Type": "application/json"}
        if self._token:
            headers["Authorization"] = f"Bearer {self._token}"
        return headers

    def _get(self, path: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        try:
            res = requests.get(f"{self.api_base}{path}", headers=self._headers(), params=params, timeout=15)
            return {"success": res.ok, "status": res.status_code, "data": res.json() if res.text else {}}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _post(self, path: str, body: Dict = None) -> Dict[str, Any]:
        try:
            res = requests.post(f"{self.api_base}{path}", headers=self._headers(), json=body or {}, timeout=15)
            return {"success": res.ok, "status": res.status_code, "data": res.json() if res.text else {}}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _put(self, path: str, body: Dict = None) -> Dict[str, Any]:
        try:
            res = requests.put(f"{self.api_base}{path}", headers=self._headers(), json=body or {}, timeout=15)
            return {"success": res.ok, "status": res.status_code, "data": res.json() if res.text else {}}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _delete(self, path: str) -> Dict[str, Any]:
        try:
            res = requests.delete(f"{self.api_base}{path}", headers=self._headers(), timeout=15)
            return {"success": res.ok, "status": res.status_code, "data": res.json() if res.text else {}}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # ------------------------------------------------------------------
    # System
    # ------------------------------------------------------------------

    def health_check(self) -> Dict[str, Any]:
        """Fast, unauthenticated health check — directly queries /v1/health without triggering login cascade."""
        try:
            res = requests.get(f"{self.api_base}/v1/health", timeout=3)
            return {"success": res.ok, "status": res.status_code, "data": res.json() if res.text else {}}
        except Exception as e:
            return {"success": False, "status": 0, "error": f"Backend offline or unreachable at {self.api_base}: {str(e)}"}

    # ------------------------------------------------------------------
    # Auth
    # ------------------------------------------------------------------

    def login(self, email: str, password: str) -> Dict[str, Any]:
        try:
            res = requests.post(
                f"{self.api_base}/admin/auth/login",
                json={"email": email, "password": password},
                timeout=10,
            )
            if res.ok:
                data = res.json()
                self._token = data.get("accessToken")
                self._refresh_token = data.get("refreshToken")
                self._token_expires_at = time.time() + 6 * 24 * 3600
                return {"success": True, "status": 200, "data": {"user": data.get("user"), "tokenAcquired": True}}
            return {"success": False, "status": res.status_code, "data": res.json()}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def logout(self) -> Dict[str, Any]:
        """Revoke current refresh token in Redis and clear cached token."""
        refresh_token = self._refresh_token or ""
        result = self._post("/admin/auth/logout", {"refreshToken": refresh_token})
        self._token = None
        self._refresh_token = None
        self._token_expires_at = 0.0
        return result

    def get_profile(self) -> Dict[str, Any]:
        return self._get("/admin/auth/me")

    def change_password(self, old_password: str, new_password: str) -> Dict[str, Any]:
        return self._put("/admin/auth/change-password", {
            "currentPassword": old_password,
            "newPassword": new_password,
        })

    # ------------------------------------------------------------------
    # Websites
    # ------------------------------------------------------------------

    def list_websites(self) -> Dict[str, Any]:
        return self._get("/admin/websites")

    def get_website(self, website_id: str) -> Dict[str, Any]:
        return self._get(f"/admin/websites/{website_id}")

    def create_website(self, name: str, domain: str, description: str = "", default_language: str = "en", supported_languages: List[str] = None, logo_url: str = "", website_id: Optional[str] = None) -> Dict[str, Any]:
        import re, time as _time
        site_id = website_id or (re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-') + '-' + str(int(_time.time()))[-4:])
        body = {
            "id": site_id,
            "name": name, "domain": domain, "description": description,
            "defaultLanguage": default_language, "supportedLanguages": supported_languages or ["en"],
        }
        if logo_url:
            body["logoUrl"] = logo_url
        return self._post("/admin/websites", body)

    def update_website(self, website_id: str, name=None, domain=None, logo_url=None, description=None, status=None, revalidate_webhook_url=None) -> Dict[str, Any]:
        body = {k: v for k, v in {
            "name": name, "domain": domain, "logoUrl": logo_url,
            "description": description, "status": status,
            "revalidateWebhookUrl": revalidate_webhook_url,
        }.items() if v is not None}
        return self._put(f"/admin/websites/{website_id}", body)

    def delete_website(self, website_id: str) -> Dict[str, Any]:
        return self._delete(f"/admin/websites/{website_id}")

    # ------------------------------------------------------------------
    # Blogs
    # ------------------------------------------------------------------

    def list_blogs(self, website_id=None, status=None, search=None, author_id=None, page=1, limit=20) -> Dict[str, Any]:
        params = {}
        if website_id and website_id != "all":
            params["websiteId"] = website_id
        if status:
            params["status"] = status
        if search:
            params["search"] = search
        if author_id:
            params["authorId"] = author_id
        if page:
            params["page"] = page
        if limit:
            params["limit"] = limit
        return self._get("/admin/blogs", params)

    def get_blog(self, blog_id: str) -> Dict[str, Any]:
        return self._get(f"/admin/blogs/{blog_id}")

    def _make_slug(self, title: str, fallback_prefix: str = "post") -> str:
        import re, time as _time
        slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
        if not slug:
            slug = f"{fallback_prefix}-{int(_time.time())}"
        return slug

    def _build_blog_payload(self, title=None, content=None, excerpt=None, featured_image=None, featured_image_alt=None,
                             category_ids=None, tag_ids=None, meta_title=None, meta_description=None, focus_keyword=None,
                             canonical_url=None, og_title=None, og_description=None, og_image=None, language="en") -> Dict:
        translation: Dict[str, Any] = {"lang": language or "en"}
        if title is not None:
            translation["title"] = title
            translation["slug"] = self._make_slug(title, fallback_prefix=f"{language or 'post'}")
        if content is not None:
            translation["content"] = content
        if excerpt is not None:
            translation["excerpt"] = excerpt
        if meta_title is not None:
            translation["metaTitle"] = meta_title
        if meta_description is not None:
            translation["metaDescription"] = meta_description
        if focus_keyword is not None:
            translation["focusKeyword"] = focus_keyword
        if canonical_url:
            translation["canonicalUrl"] = canonical_url
        if og_title is not None:
            translation["ogTitle"] = og_title
        if og_description is not None:
            translation["ogDescription"] = og_description
        if og_image is not None:
            translation["ogImage"] = og_image

        payload: Dict[str, Any] = {"translations": [translation]}
        if featured_image is not None:
            payload["featuredImage"] = featured_image
        if featured_image_alt is not None:
            payload["featuredImageAlt"] = featured_image_alt
        if category_ids is not None:
            payload["categoryIds"] = category_ids
        if tag_ids is not None:
            payload["tagIds"] = tag_ids
        return payload

    def create_blog(self, website_id: str, title: str, content: str, excerpt: str = "",
                    featured_image: str = "", featured_image_alt: str = "",
                    category_ids: Optional[List[str]] = None, tag_ids: Optional[List[str]] = None,
                    meta_title: Optional[str] = None, meta_description: Optional[str] = None,
                    focus_keyword: Optional[str] = None, canonical_url: Optional[str] = None,
                    og_title: Optional[str] = None, og_description: Optional[str] = None,
                    og_image: Optional[str] = None, language: str = "en") -> Dict[str, Any]:
        payload = self._build_blog_payload(title, content, excerpt, featured_image, featured_image_alt,
                                           category_ids, tag_ids, meta_title, meta_description, focus_keyword,
                                           canonical_url, og_title, og_description, og_image, language)
        payload["websiteId"] = website_id
        return self._post("/admin/blogs", payload)

    def update_blog(self, blog_id: str, title: Optional[str] = None, content: Optional[str] = None,
                    excerpt: Optional[str] = None, featured_image: Optional[str] = None,
                    featured_image_alt: Optional[str] = None, category_ids: Optional[List[str]] = None,
                    tag_ids: Optional[List[str]] = None, meta_title: Optional[str] = None,
                    meta_description: Optional[str] = None, focus_keyword: Optional[str] = None,
                    canonical_url: Optional[str] = None, og_title: Optional[str] = None,
                    og_description: Optional[str] = None, og_image: Optional[str] = None,
                    language: str = "en") -> Dict[str, Any]:
        has_translation_fields = any(v is not None for v in [title, content, excerpt, meta_title, meta_description, focus_keyword, canonical_url, og_title, og_description, og_image])
        payload: Dict[str, Any] = {}
        if featured_image is not None:
            payload["featuredImage"] = featured_image
        if featured_image_alt is not None:
            payload["featuredImageAlt"] = featured_image_alt
        if category_ids is not None:
            payload["categoryIds"] = category_ids
        if tag_ids is not None:
            payload["tagIds"] = tag_ids

        if has_translation_fields:
            current_title = title
            current_slug = self._make_slug(title) if title else None
            if not current_title:
                curr = self.get_blog(blog_id)
                if curr.get("success") and curr.get("data"):
                    translations = curr["data"].get("translations", {})
                    trans_data = translations.get(language, {})
                    current_title = trans_data.get("title", "Updated Post")
                    current_slug = trans_data.get("slug", self._make_slug(current_title))
                else:
                    current_title = "Updated Post"
                    current_slug = "updated-post"

            translation: Dict[str, Any] = {
                "lang": language or "en",
                "title": current_title,
                "slug": current_slug,
            }
            if content is not None:
                translation["content"] = content
            if excerpt is not None:
                translation["excerpt"] = excerpt
            if meta_title is not None:
                translation["metaTitle"] = meta_title
            if meta_description is not None:
                translation["metaDescription"] = meta_description
            if focus_keyword is not None:
                translation["focusKeyword"] = focus_keyword
            if canonical_url is not None:
                translation["canonicalUrl"] = canonical_url
            if og_title is not None:
                translation["ogTitle"] = og_title
            if og_description is not None:
                translation["ogDescription"] = og_description
            if og_image is not None:
                translation["ogImage"] = og_image

            payload["translations"] = [translation]

        return self._put(f"/admin/blogs/{blog_id}", payload)

    def upsert_translation(self, blog_id: str, language: str, title: str, content: str,
                           slug: Optional[str] = None, excerpt: str = "", meta_title: str = "",
                           meta_description: str = "", focus_keyword: str = "",
                           canonical_url: str = "", og_title: str = "",
                           og_description: str = "", og_image: str = "") -> Dict[str, Any]:
        chosen_slug = slug or self._make_slug(title, fallback_prefix=f"{language}-post")
        trans: Dict[str, Any] = {
            "lang": language,
            "title": title,
            "slug": chosen_slug,
            "content": content,
            "excerpt": excerpt,
            "metaTitle": meta_title or title,
            "metaDescription": meta_description or excerpt,
            "focusKeyword": focus_keyword,
            "ogTitle": og_title or title,
            "ogDescription": og_description or excerpt,
            "ogImage": og_image,
        }
        if canonical_url:
            trans["canonicalUrl"] = canonical_url
        return self._put(f"/admin/blogs/{blog_id}", {"translations": [trans]})

    def delete_blog(self, blog_id: str) -> Dict[str, Any]:
        return self._delete(f"/admin/blogs/{blog_id}")

    def submit_blog_for_review(self, blog_id: str, notes: str = "") -> Dict[str, Any]:
        return self._post(f"/admin/blogs/{blog_id}/submit", {"notes": notes})

    def approve_blog(self, blog_id: str, notes: str = "") -> Dict[str, Any]:
        return self._post(f"/admin/blogs/{blog_id}/approve", {"notes": notes})

    def publish_blog(self, blog_id: str, notes: str = "") -> Dict[str, Any]:
        body = {"notes": notes} if notes else {}
        return self._post(f"/admin/blogs/{blog_id}/publish", body)

    def schedule_blog(self, blog_id: str, scheduled_at: str, notes: str = "") -> Dict[str, Any]:
        body = {"scheduledAt": scheduled_at}
        if notes:
            body["notes"] = notes
        return self._post(f"/admin/blogs/{blog_id}/schedule", body)

    def archive_blog(self, blog_id: str) -> Dict[str, Any]:
        return self._post(f"/admin/blogs/{blog_id}/archive", {})

    def run_seo_audit(self, blog_id: str, lang: str = "en") -> Dict[str, Any]:
        return self._post(f"/admin/blogs/{blog_id}/seo-audit?lang={lang}", {})

    # ------------------------------------------------------------------
    # Taxonomy
    # ------------------------------------------------------------------

    def list_categories(self, website_id: Optional[str] = None) -> Dict[str, Any]:
        params = {}
        if website_id and website_id != "all":
            params["websiteId"] = website_id
        return self._get("/admin/categories", params)

    def create_category(self, website_id: str, name: str, slug: str = "", description: str = "", parent_id: Optional[str] = None) -> Dict[str, Any]:
        body = {"websiteId": website_id, "name": name}
        if slug:
            body["slug"] = slug
        if description:
            body["description"] = description
        if parent_id:
            body["parentId"] = parent_id
        return self._post("/admin/categories", body)

    def delete_category(self, category_id: str) -> Dict[str, Any]:
        return self._delete(f"/admin/categories/{category_id}")

    def list_tags(self, website_id: Optional[str] = None) -> Dict[str, Any]:
        params = {}
        if website_id and website_id != "all":
            params["websiteId"] = website_id
        return self._get("/admin/tags", params)

    def create_tag(self, website_id: str, name: str, slug: str = "") -> Dict[str, Any]:
        body = {"websiteId": website_id, "name": name}
        if slug:
            body["slug"] = slug
        return self._post("/admin/tags", body)

    def delete_tag(self, tag_id: str) -> Dict[str, Any]:
        return self._delete(f"/admin/tags/{tag_id}")

    # ------------------------------------------------------------------
    # Users
    # ------------------------------------------------------------------

    def list_users(self) -> Dict[str, Any]:
        return self._get("/admin/users")

    def invite_user(self, name: str, email: str, role: str, website_id: str) -> Dict[str, Any]:
        return self._post("/admin/users/invite", {"name": name, "email": email, "role": role, "websiteId": website_id})

    def update_user_role(self, user_id: str, role: str, website_id: str) -> Dict[str, Any]:
        return self._put(f"/admin/users/{user_id}/role", {"role": role, "websiteId": website_id})

    def update_user_status(self, user_id: str, status: str) -> Dict[str, Any]:
        return self._put(f"/admin/users/{user_id}/status", {"status": status})

    def delete_user(self, user_id: str) -> Dict[str, Any]:
        return self._delete(f"/admin/users/{user_id}")

    # ------------------------------------------------------------------
    # Media
    # ------------------------------------------------------------------

    def list_media(self, website_id: Optional[str] = None) -> Dict[str, Any]:
        params = {}
        if website_id and website_id != "all":
            params["websiteId"] = website_id
        return self._get("/admin/media", params=params)

    def upload_media_file(self, file_path: str, website_id: str, alt_text: str = "") -> Dict[str, Any]:
        if not os.path.exists(file_path):
            return {"success": False, "status": 400, "error": f"File not found: {file_path}"}

        file_name = os.path.basename(file_path)
        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            mime_type = "image/jpeg"

        self._ensure_authenticated()
        headers = {}
        if self._token:
            headers["Authorization"] = f"Bearer {self._token}"

        try:
            with open(file_path, "rb") as f:
                files = {"file": (file_name, f, mime_type)}
                data = {"websiteId": website_id, "altText": alt_text}
                res = requests.post(f"{self.api_base}/admin/media/upload", headers=headers, files=files, data=data, timeout=30)
                return {"success": res.ok, "status": res.status_code, "data": res.json() if res.text else {}}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_presigned_upload_url(self, file_name: str, file_type: str, website_id: str, file_size_bytes: int = 0, alt_text: str = "") -> Dict[str, Any]:
        body: Dict[str, Any] = {
            "fileName": file_name,
            "fileType": file_type,
            "websiteId": website_id,
            "fileSizeBytes": file_size_bytes,
        }
        if alt_text:
            body["altText"] = alt_text
        return self._post("/admin/media/presigned-url", body)

    def confirm_media_upload(self, website_id: str, file_name: str, file_type: str, file_size_bytes: int, s3_key: str, cdn_url: str, alt_text: str = "") -> Dict[str, Any]:
        body = {
            "websiteId": website_id,
            "fileName": file_name,
            "fileType": file_type,
            "fileSizeBytes": file_size_bytes,
            "s3Key": s3_key,
            "cdnUrl": cdn_url,
            "altText": alt_text,
        }
        return self._post("/admin/media/confirm", body)

    def delete_media(self, media_id: str) -> Dict[str, Any]:
        return self._delete(f"/admin/media/{media_id}")

    # ------------------------------------------------------------------
    # Redirects
    # ------------------------------------------------------------------

    def list_redirects(self, website_id: Optional[str] = None) -> Dict[str, Any]:
        params = {}
        if website_id and website_id != "all":
            params["websiteId"] = website_id
        return self._get("/admin/redirects", params=params)

    def create_redirect(self, website_id: str, from_slug: str, to_slug: str) -> Dict[str, Any]:
        return self._post("/admin/redirects", {"websiteId": website_id, "fromSlug": from_slug, "toSlug": to_slug, "statusCode": 301})

    def delete_redirect(self, redirect_id: str) -> Dict[str, Any]:
        return self._delete(f"/admin/redirects/{redirect_id}")

    # ------------------------------------------------------------------
    # Analytics
    # ------------------------------------------------------------------

    def get_analytics_dashboard(self, website_id: str, days: int = 30) -> Dict[str, Any]:
        return self._get(f"/admin/analytics?websiteId={website_id}&days={days}")

    def get_blog_analytics(self, blog_id: str, days: int = 30) -> Dict[str, Any]:
        return self._get(f"/admin/analytics/blog/{blog_id}?days={days}")

    def track_view(self, blog_id: str, website_id: str, session_id: str = "agent-session-001", referrer: str = "", event: str = "page_view") -> Dict[str, Any]:
        body: Dict[str, Any] = {
            "blogId": blog_id,
            "websiteId": website_id,
            "sessionId": session_id,
        }
        if referrer:
            body["referrer"] = referrer
        if event:
            body["event"] = event
        try:
            res = requests.post(f"{self.api_base}/v1/track", headers=self._headers(), json=body, timeout=10)
            return {"success": res.status_code in (200, 204), "status": res.status_code, "data": {"tracked": True}}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # ------------------------------------------------------------------
    # Webhooks (TRD §13 & §15)
    # ------------------------------------------------------------------

    def get_webhook_logs(self, website_id: Optional[str] = None, limit: int = 50) -> Dict[str, Any]:
        params: Dict[str, Any] = {"limit": limit}
        if website_id and website_id != "all":
            params["websiteId"] = website_id
        return self._get("/admin/webhooks/logs", params)

    def trigger_cache_revalidate(self, website_id: str, slug: str, event: str = "blog.published") -> Dict[str, Any]:
        return self._post("/admin/webhooks/revalidate", {
            "websiteId": website_id,
            "slug": slug,
            "event": event,
        })

    def retry_failed_webhooks(self) -> Dict[str, Any]:
        return self._post("/admin/webhooks/retry", {})

    # ------------------------------------------------------------------
    # Public Consumer APIs (TRD §12)
    # ------------------------------------------------------------------

    def get_blog_by_slug(self, slug: str, website_id: Optional[str] = None, language: str = "en") -> Dict[str, Any]:
        params = {"lang": language}
        if website_id and website_id != "all":
            params["websiteId"] = website_id
        return self._get(f"/v1/blogs/{slug}", params)

    def get_latest_blogs(self, website_id: Optional[str] = None, language: str = "en", limit: int = 5) -> Dict[str, Any]:
        params = {"lang": language, "limit": limit}
        if website_id and website_id != "all":
            params["websiteId"] = website_id
        return self._get("/v1/blogs/latest", params)

    def get_popular_blogs(self, website_id: Optional[str] = None, language: str = "en", limit: int = 5) -> Dict[str, Any]:
        params = {"lang": language, "limit": limit}
        if website_id and website_id != "all":
            params["websiteId"] = website_id
        return self._get("/v1/blogs/popular", params)

    def search_blogs(self, query: str, website_id: Optional[str] = None, language: str = "en", limit: int = 10) -> Dict[str, Any]:
        params = {"q": query, "lang": language, "limit": limit}
        if website_id and website_id != "all":
            params["websiteId"] = website_id
        return self._get("/v1/search", params)

    # ------------------------------------------------------------------
    # Audit Logs
    # ------------------------------------------------------------------

    def get_audit_logs(self, website_id: Optional[str] = None, event: Optional[str] = None, limit: int = 50) -> Dict[str, Any]:
        params: Dict[str, Any] = {"limit": limit}
        if website_id and website_id != "all":
            params["websiteId"] = website_id
        if event:
            params["event"] = event
        return self._get("/admin/audit-logs", params)
