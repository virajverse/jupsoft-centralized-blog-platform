# Jupsoft Centralized Blog Platform — Java / Spring Boot Integration Guide

> **Architecture Overview**: Complete Java 17+ and Spring Boot implementation using `HttpClient`, Jackson JSON deserialization, and Spring MVC controllers.

---

## 1. Application Properties (`application.properties`)

```properties
jupsoft.cms.api-url=https://blogary.jupsoft.com/v1
jupsoft.cms.website-id=YOUR_WEBSITE_ID
jupsoft.cms.api-key=YOUR_API_KEY
```

---

## 2. Spring Service Client (`JupsoftCmsService.java`)

```java
package com.company.blog.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Service
public class JupsoftCmsService {

    @Value("${jupsoft.cms.api-url:https://blogary.jupsoft.com/v1}")
    private String apiUrl;

    @Value("${jupsoft.cms.website-id}")
    private String websiteId;

    @Value("${jupsoft.cms.api-key}")
    private String apiKey;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_2)
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public String getBlogs(int page, int limit) throws Exception {
        String endpoint = String.format("%s/blogs?website=%s&page=%d&limit=%d",
                apiUrl, URLEncoder.encode(websiteId, StandardCharsets.UTF_8), page, limit);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(endpoint))
                .header("Accept", "application/json")
                .header("x-api-key", apiKey)
                .timeout(Duration.ofSeconds(10))
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new RuntimeException("CMS Error HTTP " + response.statusCode() + ": " + response.body());
        }
        return response.body();
    }

    public String getBlogBySlug(String slug) throws Exception {
        String endpoint = String.format("%s/blogs/%s?website=%s",
                apiUrl, URLEncoder.encode(slug, StandardCharsets.UTF_8), URLEncoder.encode(websiteId, StandardCharsets.UTF_8));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(endpoint))
                .header("Accept", "application/json")
                .header("x-api-key", apiKey)
                .timeout(Duration.ofSeconds(10))
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() == 404) return null;
        if (response.statusCode() != 200) {
            throw new RuntimeException("CMS Error HTTP " + response.statusCode() + ": " + response.body());
        }
        return response.body();
    }
}
```

---

## 3. Spring MVC Controller (`BlogController.java`)

```java
package com.company.blog.controller;

import com.company.blog.service.JupsoftCmsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/blogs")
public class BlogController {

    private final JupsoftCmsService cmsService;

    public BlogController(JupsoftCmsService cmsService) {
        this.cmsService = cmsService;
    }

    @GetMapping
    public ResponseEntity<String> getBlogs(@RequestParam(defaultValue = "1") int page) {
        try {
            return ResponseEntity.ok(cmsService.getBlogs(page, 9));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }

    @GetMapping("/{slug}")
    public ResponseEntity<String> getBlogDetail(@PathVariable String slug) {
        try {
            String json = cmsService.getBlogBySlug(slug);
            if (json == null) return ResponseEntity.notFound().build();
            return ResponseEntity.ok(json);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }
}
```
