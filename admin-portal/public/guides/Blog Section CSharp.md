# Jupsoft Centralized Blog Platform — C# .NET 8 / ASP.NET Core Integration Guide

> **Architecture Overview**: Complete C# ASP.NET Core MVC & Web API implementation using strongly typed models, dependency injection, and `HttpClientFactory`.

---

## 1. App Configuration (`appsettings.json`)

```json
{
  "JupsoftCms": {
    "ApiUrl": "https://blogary.jupsoft.com/v1",
    "WebsiteId": "YOUR_WEBSITE_ID",
    "ApiKey": "YOUR_API_KEY"
  }
}
```

---

## 2. Strongly Typed C# Models (`Models/BlogModels.cs`)

```csharp
namespace Company.Blog.Models
{
    public class BlogPost
    {
        public string Id { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Excerpt { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string? FeaturedImage { get; set; }
        public DateTime PublishedAt { get; set; }
        public string? AuthorName { get; set; }
        public string? PrimaryCategory { get; set; }
        public int? ReadTimeMinutes { get; set; }
        public BlogSeo? Seo { get; set; }
    }

    public class BlogSeo
    {
        public string? MetaTitle { get; set; }
        public string? MetaDescription { get; set; }
        public string? CanonicalUrl { get; set; }
    }

    public class CmsResponse<T>
    {
        public bool Success { get; set; }
        public T? Data { get; set; }
        public PaginationMeta? Meta { get; set; }
    }

    public class PaginationMeta
    {
        public int Page { get; set; }
        public int Limit { get; set; }
        public int Total { get; set; }
        public int TotalPages { get; set; }
    }
}
```

---

## 3. Dependency Injection & Service Client (`Services/JupsoftCmsService.cs`)

```csharp
using System.Net.Http.Json;
using Company.Blog.Models;
using Microsoft.Extensions.Configuration;

namespace Company.Blog.Services
{
    public interface IJupsoftCmsService
    {
        Task<List<BlogPost>> GetBlogsAsync(int page = 1, int limit = 10);
        Task<BlogPost?> GetBlogBySlugAsync(string slug);
    }

    public class JupsoftCmsService : IJupsoftCmsService
    {
        private readonly HttpClient _http;
        private readonly string _websiteId;

        public JupsoftCmsService(HttpClient http, IConfiguration config)
        {
            _http = http;
            var baseUrl = config["JupsoftCms:ApiUrl"] ?? "https://blogary.jupsoft.com/v1";
            _websiteId = config["JupsoftCms:WebsiteId"] ?? "";
            var apiKey = config["JupsoftCms:ApiKey"] ?? "";

            _http.BaseAddress = new Uri(baseUrl);
            _http.DefaultRequestHeaders.Add("Accept", "application/json");
            _http.DefaultRequestHeaders.Add("x-api-key", apiKey);
        }

        public async Task<List<BlogPost>> GetBlogsAsync(int page = 1, int limit = 10)
        {
            var url = $"/blogs?website={Uri.EscapeDataString(_websiteId)}&page={page}&limit={limit}";
            var response = await _http.GetFromJsonAsync<CmsResponse<List<BlogPost>>>(url);
            return response?.Data ?? new List<BlogPost>();
        }

        public async Task<BlogPost?> GetBlogBySlugAsync(string slug)
        {
            var url = $"/blogs/{Uri.EscapeDataString(slug)}?website={Uri.EscapeDataString(_websiteId)}";
            var response = await _http.GetFromJsonAsync<CmsResponse<BlogPost>>(url);
            return response?.Data;
        }
    }
}
```

Register in `Program.cs`:
```csharp
builder.Services.AddHttpClient<IJupsoftCmsService, JupsoftCmsService>();
```

---

## 4. ASP.NET Core Controller (`Controllers/BlogController.cs`)

```csharp
using Company.Blog.Services;
using Microsoft.AspNetCore.Mvc;

namespace Company.Blog.Controllers
{
    public class BlogController : Controller
    {
        private readonly IJupsoftCmsService _cms;

        public BlogController(IJupsoftCmsService cms)
        {
            _cms = cms;
        }

        // GET: /blog
        public async Task<IActionResult> Index([FromQuery] int page = 1)
        {
            var articles = await _cms.GetBlogsAsync(page, 9);
            return View(articles);
        }

        // GET: /blog/{slug}
        [Route("blog/{slug}")]
        public async Task<IActionResult> Detail(string slug)
        {
            var article = await _cms.GetBlogBySlugAsync(slug);
            if (article == null) return NotFound();

            ViewData["Title"] = article.Seo?.MetaTitle ?? article.Title;
            ViewData["MetaDescription"] = article.Seo?.MetaDescription ?? article.Excerpt;
            return View(article);
        }
    }
}
```

---

## 5. Razor View (`Views/Blog/Detail.cshtml`)

```html
@model Company.Blog.Models.BlogPost

@{
    Layout = "_Layout";
}

<article class="container mx-auto max-w-3xl py-12 px-4">
    <header class="mb-8">
        <span class="text-sm font-bold text-indigo-600 uppercase tracking-wider">@Model.PrimaryCategory</span>
        <h1 class="text-4xl font-extrabold text-slate-900 mt-2 mb-4">@Model.Title</h1>
        <div class="text-sm text-slate-500">
            <span>By @(Model.AuthorName ?? "Editorial Team")</span> • 
            <span>@Model.PublishedAt.ToString("MMM dd, yyyy")</span>
        </div>
    </header>

    @if (!string.IsNullOrEmpty(Model.FeaturedImage))
    {
        <img src="@Model.FeaturedImage" alt="@Model.Title" class="w-full rounded-2xl mb-8 shadow-sm" />
    }

    <!-- Raw HTML output (sanitized by CMS API) -->
    <div class="prose prose-slate max-w-none text-lg leading-relaxed">
        @Html.Raw(Model.Content)
    </div>
</article>
```
