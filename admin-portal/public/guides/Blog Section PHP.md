# Jupsoft Centralized Blog Platform — PHP & Laravel Integration Guide

> **Architecture Overview**: Complete PHP implementation for standalone Core PHP sites, custom CMS templates, and Laravel applications.

---

## 1. Environment Configuration (`.env`)

```env
JUPSOFT_API_URL="https://blogary.jupsoft.com/v1"
JUPSOFT_WEBSITE_ID="YOUR_WEBSITE_ID"
JUPSOFT_API_KEY="YOUR_API_KEY"
```

---

## 2. Standalone Core PHP Client Helper (`JupsoftCms.php`)

```php
<?php
/**
 * Jupsoft Centralized Blog Platform — PHP Client Helper
 */
class JupsoftCms {
    private string $apiUrl;
    private string $websiteId;
    private string $apiKey;

    public function __construct(?string $websiteId = null, ?string $apiKey = null, ?string $apiUrl = null) {
        $this->apiUrl = $apiUrl ?: (getenv('JUPSOFT_API_URL') ?: 'https://blogary.jupsoft.com/v1');
        $this->websiteId = $websiteId ?: (getenv('JUPSOFT_WEBSITE_ID') ?: '');
        $this->apiKey = $apiKey ?: (getenv('JUPSOFT_API_KEY') ?: '');
    }

    private function request(string $endpoint, array $params = []): array {
        $params['website'] = $this->websiteId;
        $url = rtrim($this->apiUrl, '/') . '/' . ltrim($endpoint, '/') . '?' . http_build_query($params);

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 8,
            CURLOPT_HTTPHEADER => [
                'Accept: application/json',
                'x-api-key: ' . $this->apiKey,
            ],
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $json = json_decode((string)$response, true);
        $json = is_array($json) ? $json : [];

        return [
            'status' => $httpCode,
            'success' => $httpCode >= 200 && $httpCode < 300,
            'data' => $json['data'] ?? $json,
            'meta' => $json['meta'] ?? $json['pagination'] ?? null,
        ];
    }

    public function getBlogs(int $page = 1, int $limit = 10): array {
        return $this->request('blogs', ['page' => $page, 'limit' => $limit]);
    }

    public function getBlogBySlug(string $slug): array {
        return $this->request('blogs/' . urlencode($slug));
    }

    public function getLatest(int $limit = 3): array {
        return $this->request('blogs/latest', ['limit' => $limit]);
    }
}
```

---

## 3. Blog Listing Page (`blog.php`)

```php
<?php
require_once 'JupsoftCms.php';
$cms = new JupsoftCms();
$page = (int)($_GET['page'] ?? 1);
$result = $cms->getBlogs($page, 9);
$blogs = $result['success'] ? $result['data'] : [];
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Blog Archive</title>
  <style>
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
    .card { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #fff; }
    .card img { width: 100%; height: 200px; object-fit: cover; }
    .card-body { padding: 1.25rem; }
  </style>
</head>
<body>
  <div style="max-width: 1200px; margin: 3rem auto; padding: 0 1rem;">
    <h1>Latest News & Articles</h1>
    <div class="grid">
      <?php if (empty($blogs)): ?>
        <p>No articles found.</p>
      <?php else: ?>
        <?php foreach ($blogs as $post): ?>
          <div class="card">
            <?php if (!empty($post['featuredImage'])): ?>
              <a href="blog-detail.php?slug=<?= urlencode($post['slug']) ?>">
                <img src="<?= htmlspecialchars($post['featuredImage']) ?>" alt="<?= htmlspecialchars($post['title']) ?>">
              </a>
            <?php endif; ?>
            <div class="card-body">
              <h3><a href="blog-detail.php?slug=<?= urlencode($post['slug']) ?>"><?= htmlspecialchars($post['title']) ?></a></h3>
              <p><?= htmlspecialchars($post['excerpt'] ?? '') ?></p>
              <small><?= htmlspecialchars($post['publishedAt'] ?? '') ?></small>
            </div>
          </div>
        <?php endforeach; ?>
      <?php endif; ?>
    </div>
  </div>
</body>
</html>
```

---

## 4. Single Article Page with Dynamic SEO (`blog-detail.php`)

```php
<?php
require_once 'JupsoftCms.php';
$cms = new JupsoftCms();
$slug = $_GET['slug'] ?? '';

if (empty($slug)) {
    http_response_code(404);
    die('Article not specified');
}

$response = $cms->getBlogBySlug($slug);
$article = $response['success'] ? $response['data'] : null;

if (!$article) {
    http_response_code(404);
    die('Article Not Found');
}

$metaTitle = $article['seo']['metaTitle'] ?? $article['title'];
$metaDesc = $article['seo']['metaDescription'] ?? ($article['excerpt'] ?? '');
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title><?= htmlspecialchars($metaTitle) ?></title>
  <meta name="description" content="<?= htmlspecialchars($metaDesc) ?>">
  <?php if (!empty($article['schemaJsonLd'])): ?>
    <script type="application/ld+json"><?= json_encode($article['schemaJsonLd']) ?></script>
  <?php endif; ?>
</head>
<body>
  <article style="max-width: 800px; margin: 3rem auto; padding: 0 1rem;">
    <h1><?= htmlspecialchars($article['title']) ?></h1>
    <p>By <?= htmlspecialchars($article['authorName'] ?? 'Editorial Team') ?> • <?= htmlspecialchars($article['publishedAt'] ?? '') ?></p>
    
    <?php if (!empty($article['featuredImage'])): ?>
      <img src="<?= htmlspecialchars($article['featuredImage']) ?>" alt="<?= htmlspecialchars($article['title']) ?>" style="width: 100%; border-radius: 12px; margin: 1.5rem 0;">
    <?php endif; ?>

    <!-- Sanitized HTML article content -->
    <div class="article-body">
      <?= $article['content'] ?>
    </div>
  </article>
</body>
</html>
```
