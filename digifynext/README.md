# 🌍 DigifyNext — Reference Tenant Client Website

This directory contains the production marketing website for **DigifyNext**, demonstrating how external tenant websites integrate dynamically with the **Jupsoft Centralized Blog Platform**.

---

## 🏗️ Architecture & Integration

- **Frontend Tech**: Static Semantic HTML5 + Vanilla JS + CSS3 + Bootstrap 5.
- **Dynamic Content Engine**: Connects to Jupsoft CMS REST API (`/v1/blogs`) with client-side caching.
- **Pages**:
  - `blog.html`: Dynamic multi-tenant blog grid with search, categories, and pagination.
  - `blogdetail.html`: Full article view with dynamic metadata, social sharing, reading time, and author cards.
  - `build-static.js`: Static compilation helper.
- **Live Production URL**: [https://digifynext.com/blog](https://digifynext.com/blog)
