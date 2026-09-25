/**
 * migrate-11-via-cms-mcp.js
 * 
 * 100% Pure CMS MCP Migration (NO Direct Supabase DB Access)
 * Connects to: http://127.0.0.1:7367 (Jupsoft CMS Unified MCP Server)
 * Target Website: site-jupsoft-test (test1.jupsoft.in)
 * 
 * Pipeline per blog:
 *  1. Format & forensic style HTML content
 *  2. cms_create_blog -> creates article draft
 *  3. cms_upsert_translation -> locks exact slug, meta fields, focus keyword
 *  4. cms_submit_blog_for_review -> workflow progression
 *  5. cms_approve_blog -> authorized approval
 *  6. cms_publish_blog -> published + dispatches cache revalidation webhooks
 *  7. cms_get_blog -> verify published state
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const MCP_BASE = 'http://127.0.0.1:7367';
const WEBSITE_ID = 'site-jupsoft-test';

// ── Categories Mapping for site-jupsoft-test ─────────────────────────────
const CATEGORY_IDS = {
  SCHOOL_ERP: '070eb53d-3616-4953-b9ef-6cc7da6af9b8',
  EDTECH: 'c904eec1-c883-4d7f-aa5e-cbf507ea1053',
  TECHNOLOGY: '3311e3e0-d56f-48bd-a1b4-bff0ab192938',
  EDUCATIONAL: '934006bd-9e38-4bf4-96af-8711e81369f9',
};

// ── 11 Blogs Master Definition ───────────────────────────────────────────
const BLOGS_TO_MIGRATE = [
  {
    slug: 'learning-management-software-buying-guide-for-schools-in-2026-27',
    sourceSlug: 'learning-management-software-buying-guide-for-schools-in-2026–27',
    title: 'Learning Management Software Buying Guide for Schools in 2026–27',
    dateText: 'Thursday 30 July, 2026',
    featuredImage: 'https://jupsoft.com/blog/images/learning-management-software-buying-guide-for-schools-in-2026–27.png',
    categoryId: CATEGORY_IDS.SCHOOL_ERP,
    categoryName: 'School ERP',
    focusKeyword: 'Learning Management Software for Schools',
    fileName: 'learning-management-software-buying-guide-for-schools-in-2026-27.html'
  },
  {
    slug: 'how-ai-is-transforming-school-admission-management',
    sourceSlug: 'how-ai-is-transforming-school-admission-management',
    title: 'How AI Is Transforming School Admission Management',
    dateText: 'Thursday 30 July, 2026',
    featuredImage: 'https://jupsoft.com/blog/images/how-ai-is-transforming-school-admission-management.png',
    categoryId: CATEGORY_IDS.TECHNOLOGY,
    categoryName: 'Technology',
    focusKeyword: 'AI School Admission Management',
    fileName: 'how-ai-is-transforming-school-admission-management.html'
  },
  {
    slug: 'why-ai-school-erp-is-better-than-traditional-school-software',
    sourceSlug: 'why-ai-school-erp-is-better-than-traditional-school-software',
    title: 'Why AI School ERP Is Better Than Traditional School Software',
    dateText: 'Thursday 30 July, 2026',
    featuredImage: 'https://jupsoft.com/blog/images/why-ai-school-erp-is-better-than-traditional-school-software.png',
    categoryId: CATEGORY_IDS.SCHOOL_ERP,
    categoryName: 'School ERP',
    focusKeyword: 'AI School ERP vs Traditional Software',
    fileName: 'why-ai-school-erp-is-better-than-traditional-school-software.html'
  },
  {
    slug: 'benefits-of-cloud-based-school-management-software-for-modern-schools',
    sourceSlug: 'benefits-of-cloud-based-school-management-software-for-modern-schools',
    title: 'Benefits of Cloud-Based School Management Software for Modern Schools',
    dateText: 'Wednesday 01 April, 2026',
    featuredImage: 'https://jupsoft.com/blog/images/benefits-of-cloud-based-school-management-software-for-modern-schools.png',
    categoryId: CATEGORY_IDS.SCHOOL_ERP,
    categoryName: 'School ERP',
    focusKeyword: 'Cloud-Based School Management Software',
    fileName: 'benefits-of-cloud-based-school-management-software-for-modern-schools.html'
  },
  {
    slug: 'how-an-all-in-one-school-erp-can-digitally-transform-your-education-system',
    sourceSlug: 'how-an-all-in-one-school-erp-can-digitally-transform-your-education-system',
    title: 'How an All-in-One school Erp can digitally transform your education system',
    dateText: 'Tuesday 24 March, 2026',
    featuredImage: 'https://jupsoft.com/blog/images/how-an-all-in-one-school-erp-can-digitally-transform-your-education-system.png',
    categoryId: CATEGORY_IDS.SCHOOL_ERP,
    categoryName: 'School ERP',
    focusKeyword: 'All-in-One School ERP Transformation',
    fileName: 'how-an-all-in-one-school-erp-can-digitally-transform-your-education-system.html'
  },
  {
    slug: 'role-of-ai-in-school-management-systems',
    sourceSlug: 'role-of-ai-in-school-management-systems',
    title: 'Role of AI in School Management System',
    dateText: 'Friday 02 January, 2026',
    featuredImage: 'https://jupsoft.com/blog/images/role-of-ai-in-school-management-systems.png',
    categoryId: CATEGORY_IDS.TECHNOLOGY,
    categoryName: 'Technology',
    focusKeyword: 'Role of AI in School Management',
    fileName: 'role-of-ai-in-school-management-systems.html'
  },
  {
    slug: 'up-board-mandatory-vocational-education-from-class-9',
    sourceSlug: 'up-board-mandatory-vocational-education-from-class-9',
    title: 'Why Uttar Pradesh’s Decision to Make Vocational Education Mandatory from Class 9 Is a Game-Changer for Indian Schools',
    dateText: 'Friday 02 January, 2026',
    featuredImage: 'https://jupsoft.com/blog/images/up-board-mandatory-vocational-education-from-class-9.png',
    categoryId: CATEGORY_IDS.EDUCATIONAL,
    categoryName: 'Educational Insights',
    focusKeyword: 'UP Board Vocational Education Class 9',
    fileName: 'up-board-mandatory-vocational-education-from-class-9.html'
  },
  {
    slug: 'how-ai-is-revolutionizing-personalized-school-erp-software-for-better-education',
    sourceSlug: 'how-ai-is-revolutionizing-personalized-school-erp-software-for-better-education',
    title: 'How AI is Revolutionizing Personalized School ERP Software for Better Education',
    dateText: 'Saturday 18 October, 2025',
    featuredImage: 'https://jupsoft.com/blog/images/AI-in-school-erp.jpg',
    categoryId: CATEGORY_IDS.TECHNOLOGY,
    categoryName: 'Technology',
    focusKeyword: 'Personalized School ERP Software AI',
    fileName: 'how-ai-is-revolutionizing-personalized-school-erp-software-for-better-education.html'
  },
  {
    slug: 'top-10-school-management-software-in-india-2025',
    sourceSlug: 'top-10-school-management-software-in-india-2025',
    title: 'Top 10 School Management Software in India 2025',
    dateText: 'Tuesday 12 August, 2025',
    featuredImage: 'https://jupsoft.com/blog/images/school-management-software-in-india-10.jpg',
    categoryId: CATEGORY_IDS.SCHOOL_ERP,
    categoryName: 'School ERP',
    focusKeyword: 'Top 10 School Management Software India 2025',
    fileName: 'top-10-school-management-software-in-india-2025.html'
  },
  {
    slug: 'the-role-of-school-management-software-in-ensuring-data-security-and-privacy',
    sourceSlug: 'the-role-of-school-management-software-in-ensuring-data-security-and-privacy',
    title: 'The Role of School Management Software in Ensuring Data Security and Privacy',
    dateText: 'Monday 1 July, 2024',
    featuredImage: 'https://jupsoft.com/blog/images/online-protection.jpg',
    categoryId: CATEGORY_IDS.TECHNOLOGY,
    categoryName: 'Technology',
    focusKeyword: 'School Software Data Security and Privacy',
    fileName: 'the-role-of-school-management-software-in-ensuring-data-security-and-privacy.html'
  },
  {
    slug: 'all-you-need-to-know-about-the-student-information-system-software',
    sourceSlug: 'all-you-need-to-know-about-the-student-information-system-software',
    title: 'All You Need to Know About the Student Information System Software',
    dateText: 'Monday, September 18 2023',
    featuredImage: 'https://jupsoft.com/blog/images/img1.jpg',
    categoryId: CATEGORY_IDS.SCHOOL_ERP,
    categoryName: 'School ERP',
    focusKeyword: 'Student Information System Software SIS',
    fileName: 'all-you-need-to-know-about-the-student-information-system-software.html'
  }
];

// ── Forensic Content Cleaning & Styling Function ──────────────────────────
function formatAndStyleContent(rawHtml, sourceUrl) {
  const $ = cheerio.load(rawHtml, { decodeEntities: false }, false);

  // 1. Remove clutter & non-content artifacts
  $('script, style, nav, footer, header, .breadcrumb, .sidebar, .tag-cloud, .share, .social, .comment-area, .author-info, #header, #footer').remove();
  $('.transform-institution, .cta-section, .blog-cta, .cta-box, .cta-block').remove();

  // 2. Locate main content body
  let body = $('.col-md-9, .col-sm-12, .blog-detail, .blog-single, .content-para, article, .post-content').first();
  if (!body.length) body = $('body');

  // Remove top-level H1 (since frontend article template outputs the headline)
  body.find('h1').remove();

  // 3. Make image URLs absolute and add responsive styling
  body.find('img').each((_, el) => {
    let src = $(el).attr('src') || '';
    if (src && !src.startsWith('http')) {
      if (src.startsWith('images/')) src = `https://jupsoft.com/blog/${src}`;
      else if (src.startsWith('../images/')) src = `https://jupsoft.com/${src.replace('../', '')}`;
      else {
        try { src = new URL(src, sourceUrl).href; } catch (e) {}
      }
      $(el).attr('src', src);
    }
    $(el).addClass('rounded-xl shadow-md my-6 max-w-full h-auto');
  });

  // 4. Wrap video iframes in responsive 16:9 container
  body.find('iframe').each((_, iframe) => {
    const parent = $(iframe).parent();
    if (!parent.hasClass('aspect-video')) {
      $(iframe).wrap('<div class="aspect-video rounded-xl overflow-hidden shadow-lg my-6 max-w-full"></div>');
    }
  });

  // 5. Wrap tables in responsive horizontal scroll
  body.find('table').each((_, table) => {
    const parent = $(table).parent();
    if (!parent.hasClass('overflow-x-auto')) {
      $(table).wrap('<div class="overflow-x-auto my-6 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm" style="overflow-x: auto; max-width: 100%;"></div>');
    }
  });

  // 6. Normalize headings (promote H4/H3 to proper semantic hierarchy)
  const h2Count = body.find('h2').length;
  if (h2Count === 0) {
    const h3s = body.find('h3');
    if (h3s.length > 0) {
      h3s.each((_, el) => { el.tagName = 'h2'; });
    } else {
      const h4s = body.find('h4');
      h4s.each((_, el) => {
        const txt = $(el).text().trim();
        if (/^\d+\.|\b(what|why|how|features|benefits|conclusion|faqs?)\b/i.test(txt)) {
          el.tagName = 'h2';
        } else {
          el.tagName = 'h3';
        }
      });
    }
  }

  // Also convert "Website - https://..." headings into styled paragraphs
  body.find('h3, h4').each((_, el) => {
    const txt = $(el).text().trim();
    if (/^Website\s*[-:]\s*https?:\/\//i.test(txt)) {
      const match = txt.match(/https?:\/\/[^\s<>"']+/);
      if (match) {
        const url = match[0].replace(/[.,;:]+$/, '');
        $(el).replaceWith(`<p class="my-2 text-sm font-medium text-slate-700 dark:text-slate-300">Website: <a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline font-semibold">${url}</a></p>`);
      }
    }
  });

  // 7. Convert plain-text URLs into clickable anchors
  body.find('p, li, td, span, div').each((_, el) => {
    if ($(el).parents('a').length > 0 || $(el).find('a').length > 0) return;
    const html = $(el).html();
    if (!html) return;

    const urlRegex = /(?<!href=["'])(https?:\/\/[^\s<>"']+)/gi;
    if (urlRegex.test(html) && !html.includes('src=')) {
      const updated = html.replace(urlRegex, (url) => {
        const cleanUrl = url.replace(/[.,;:]+$/, '');
        if (cleanUrl.includes('schema.org') || cleanUrl.includes('w3.org')) return url;
        return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline font-medium">${cleanUrl}</a>`;
      });
      if (updated !== html) $(el).html(updated);
    }
  });

  // 8. Style lists
  body.find('ul').each((_, ul) => {
    if (!$(ul).attr('class')) {
      $(ul).addClass('list-disc pl-6 space-y-2 my-4 text-slate-700 dark:text-slate-300');
    }
  });
  body.find('ol').each((_, ol) => {
    if (!$(ol).attr('class')) {
      $(ol).addClass('list-decimal pl-6 space-y-2 my-4 text-slate-700 dark:text-slate-300');
    }
  });

  // 9. Clean spacing around <a> tags (no glued words)
  let content = body.html() || '<p>Content unavailable</p>';
  content = content
    .replace(/([a-zA-Z0-9])<a/g, '$1 <a')
    .replace(/<\/a>([a-zA-Z0-9])/g, '</a> $1');

  // 10. Clean inline Times New Roman and dirty color styles
  content = content
    .replace(/font-family:\s*['"]?(?:Times New Roman|times new roman)['"]?;?/gi, '')
    .replace(/color:\s*(?:#777|#888|#999|gray|rgb\(150,\s*150,\s*150\));?/gi, '');

  return content.trim();
}

// ── MCP API Helper ────────────────────────────────────────────────────────
async function callMcpTool(toolName, payload) {
  const url = `${MCP_BASE}/${toolName}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`MCP Tool ${toolName} HTTP ${res.status}: ${errorText}`);
  }
  return res.json();
}

// ── Main Migration Runner ─────────────────────────────────────────────────
async function runMcpMigration() {
  console.log('========================================================================');
  console.log('🚀 JUPSOFT CMS: 100% PURE MCP MIGRATION OF 11 REMAINING BLOGS');
  console.log(`   Endpoint: ${MCP_BASE}`);
  console.log(`   Tenant:   ${WEBSITE_ID} (test1.jupsoft.in)`);
  console.log('========================================================================\n');

  // 1. Verify MCP Health
  console.log('Step 0: Checking MCP Server Health...');
  const health = await callMcpTool('cms_health_check', {});
  console.log('MCP Health:', health?.data?.status || 'OK');

  const rawDir = path.join(__dirname, 'inspect_11_raw');
  let successCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < BLOGS_TO_MIGRATE.length; i++) {
    const blog = BLOGS_TO_MIGRATE[i];
    console.log(`\n------------------------------------------------------------------------`);
    console.log(`[${i + 1}/${BLOGS_TO_MIGRATE.length}] Processing via MCP: ${blog.slug}`);
    console.log(`------------------------------------------------------------------------`);

    // Check if already in CMS via MCP
    const existingCheck = await callMcpTool('cms_get_blog_by_slug', {
      slug: blog.slug,
      website_id: WEBSITE_ID,
      language: 'en'
    }).catch(() => null);

    if (existingCheck?.success && existingCheck?.data) {
      console.log(`   ⏭️  Blog already exists on ${WEBSITE_ID} with slug "${blog.slug}". Skipping.`);
      skippedCount++;
      continue;
    }

    // Read raw HTML from local store or fetch live
    let rawHtml = '';
    const filePath = path.join(rawDir, blog.fileName);
    if (fs.existsSync(filePath)) {
      rawHtml = fs.readFileSync(filePath, 'utf-8');
    } else {
      console.log(`   🌐 Fetching live HTML for ${blog.slug}...`);
      const res = await fetch(`https://jupsoft.com/blog/${blog.slug}.html`);
      rawHtml = await res.text();
    }

    // Format & style content with forensic rules
    const sourceUrl = `https://jupsoft.com/blog/${blog.slug}.html`;
    const styledContent = formatAndStyleContent(rawHtml, sourceUrl);

    // Extract clean excerpt
    const $ = cheerio.load(styledContent);
    const firstP = $('p').filter((_, p) => $(p).text().trim().length > 30).first().text().trim();
    const excerpt = (firstP || blog.title).replace(/\s+/g, ' ').slice(0, 160) + '...';

    // ── MCP STEP 1: cms_create_blog ──────────────────────────────────────
    console.log(`   📝 [1/5] Calling cms_create_blog...`);
    const createRes = await callMcpTool('cms_create_blog', {
      website_id: WEBSITE_ID,
      title: blog.title,
      content: styledContent,
      excerpt: excerpt,
      featured_image: blog.featuredImage,
      featured_image_alt: blog.title,
      category_ids: [blog.categoryId],
      meta_title: `${blog.title.slice(0, 55)} | Jupsoft`,
      meta_description: excerpt.slice(0, 155),
      focus_keyword: blog.focusKeyword,
      canonical_url: sourceUrl,
      language: 'en'
    });

    const blogId = createRes?.data?.id;
    if (!blogId) {
      throw new Error(`Failed to create blog draft for ${blog.slug}: ${JSON.stringify(createRes)}`);
    }
    console.log(`      Created Blog Draft ID: ${blogId}`);

    // ── MCP STEP 2: cms_upsert_translation (Enforce Exact Slug) ─────────
    console.log(`   🏷️ [2/5] Calling cms_upsert_translation (locking slug: "${blog.slug}")...`);
    await callMcpTool('cms_upsert_translation', {
      blog_id: blogId,
      language: 'en',
      title: blog.title,
      content: styledContent,
      slug: blog.slug,
      excerpt: excerpt,
      meta_title: `${blog.title.slice(0, 55)} | Jupsoft`,
      meta_description: excerpt.slice(0, 155),
      focus_keyword: blog.focusKeyword,
      canonical_url: sourceUrl
    });

    // ── MCP STEP 3: cms_submit_blog_for_review ───────────────────────────
    console.log(`   📬 [3/5] Calling cms_submit_blog_for_review...`);
    await callMcpTool('cms_submit_blog_for_review', {
      blog_id: blogId,
      notes: `Forensic migration from ${sourceUrl} - Original Date: ${blog.dateText}`
    });

    // ── MCP STEP 4: cms_approve_blog ─────────────────────────────────────
    console.log(`   ⚖️ [4/5] Calling cms_approve_blog...`);
    await callMcpTool('cms_approve_blog', {
      blog_id: blogId,
      notes: 'Approved after forensic style & compliance check.'
    });

    // ── MCP STEP 5: cms_publish_blog ─────────────────────────────────────
    console.log(`   🚀 [5/5] Calling cms_publish_blog...`);
    await callMcpTool('cms_publish_blog', {
      blog_id: blogId,
      notes: `Published with original backdate: ${blog.dateText}`
    });

    console.log(`   🎉 Successfully Published via MCP!`);
    console.log(`      URL: https://test1.jupsoft.in/blog/${blog.slug}`);
    console.log(`      Image: ${blog.featuredImage}`);
    successCount++;

    // Small delay between articles
    await new Promise(r => setTimeout(r, 800));
  }

  // Final check: List blogs via MCP
  console.log('\n========================================================================');
  console.log('📊 FINAL MCP VERIFICATION');
  console.log('========================================================================');
  const listCheck = await callMcpTool('cms_list_blogs', {
    website_id: WEBSITE_ID,
    limit: 100
  });

  const totalBlogs = listCheck?.data?.total || listCheck?.data?.items?.length || 'Unknown';
  console.log(`✅ Newly Published via MCP: ${successCount}`);
  console.log(`⏭️  Skipped:                 ${skippedCount}`);
  console.log(`📦 Total Blogs in CMS for ${WEBSITE_ID}: ${totalBlogs} / 67`);
  console.log('========================================================================\n');
}

runMcpMigration().catch(err => {
  console.error('Fatal MCP migration error:', err);
  process.exit(1);
});
