const { PrismaClient } = require('@prisma/client');
const cheerio = require('cheerio');

const prisma = new PrismaClient();
const WEBSITE_ID = 'site-jupsoft-test';

const CTA_BLOCK = `
<div class="my-10 p-6 bg-slate-900 text-white rounded-xl border border-slate-700 shadow-lg">
  <h3 class="text-xl font-bold mb-2 text-white">Transform Your Institution with Jupsoft</h3>
  <p class="text-slate-300 mb-4 text-sm leading-relaxed">Discover how our modular School ERP & campus management suite streamlines administration, enhances parent-teacher communication, and drives academic excellence.</p>
  <a href="https://jupsoft.com/contact" target="_blank" rel="noopener noreferrer" style="display:inline-block; padding: 10px 22px; background: #2563eb; color: #fff; font-weight: 600; border-radius: 8px; text-decoration: none; font-size: 14px;">Book a Free Demo &rarr;</a>
</div>`;

async function fixAllDefects() {
  console.log('===============================================================');
  console.log('🔧 FIXING FORENSIC DEFECTS (Slugs remain 100% UNCHANGED)');
  console.log('===============================================================');

  // ── FIX 1: cbse-result-2025-a-quick-guide ────────────────────────────────
  const blog1 = await prisma.blogTranslation.findFirst({
    where: { slug: 'cbse-result-2025-a-quick-guide', blog: { websiteId: WEBSITE_ID } }
  });
  if (blog1) {
    console.log('Fixing [1/6]: cbse-result-2025-a-quick-guide ...');
    let content = blog1.content;
    const $ = cheerio.load(content);

    // Replace the 5 step paragraphs with a sleek styled numbered list
    const stepItems = [];
    $('p').each((_, p) => {
      const txt = $(p).text().trim();
      const match = txt.match(/^(\d+)\.\s*(?:Visit|Select|Enter|Submit|Download)(.*)/i);
      if (/^\d+\.\s+/i.test(txt)) {
        stepItems.push(txt.replace(/^\d+\.\s*/, '').trim());
        $(p).remove();
      }
    });

    if (stepItems.length > 0) {
      const stepsHtml = `
<div class="my-6 p-5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
  <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">Steps to Check CBSE Results 2025:</h3>
  <ol class="space-y-3 pl-2">
    ${stepItems.map((step, idx) => `
      <li class="flex items-start gap-3">
        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">${idx + 1}</span>
        <span class="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">${step}</span>
      </li>
    `).join('')}
  </ol>
</div>`;

      // Insert steps after the first paragraph
      $('p').first().after(stepsHtml);
    }

    let finalHtml = $('body').html();
    if (!finalHtml.includes('Transform Your Institution with Jupsoft')) {
      finalHtml += CTA_BLOCK;
    }

    await prisma.blogTranslation.update({
      where: { id: blog1.id },
      data: { content: finalHtml }
    });
    console.log('   ✅ cbse-result-2025-a-quick-guide updated with semantic steps list.');
  }

  // ── FIX 2: school-erp-software-jupsoft-vs-others ─────────────────────────
  const blog2 = await prisma.blogTranslation.findFirst({
    where: { slug: 'school-erp-software-jupsoft-vs-others', blog: { websiteId: WEBSITE_ID } }
  });
  if (blog2) {
    console.log('Fixing [2/6]: school-erp-software-jupsoft-vs-others ...');
    let content = blog2.content;
    if (!content.includes('Transform Your Institution with Jupsoft')) {
      content += CTA_BLOCK;
      await prisma.blogTranslation.update({
        where: { id: blog2.id },
        data: { content }
      });
      console.log('   ✅ Added branded CTA to school-erp-software-jupsoft-vs-others.');
    }
  }

  // ── FIX 3: top-9-school-erp-software-providers-in-india-improving-academic-efficiency ──
  const blog3 = await prisma.blogTranslation.findFirst({
    where: { slug: 'top-9-school-erp-software-providers-in-india-improving-academic-efficiency', blog: { websiteId: WEBSITE_ID } }
  });
  if (blog3) {
    console.log('Fixing [3/6]: top-9-school-erp-software-providers ...');
    let content = blog3.content;
    const $ = cheerio.load(content);

    // Format FAQ questions and answers into structured FAQ cards
    const faqItems = [];
    const elementsToRemove = [];

    $('p').each((_, p) => {
      const txt = $(p).text().trim();
      const match = txt.match(/^(\d+)\.\s*(What|Who|Is|Can|How|In what)(.*)/i);
      if (match) {
        const nextP = $(p).next('p');
        const question = txt.replace(/^\d+\.\s*/, '').trim();
        const answer = nextP.text().trim();
        if (question && answer) {
          faqItems.push({ question, answer });
          elementsToRemove.push($(p), nextP);
        }
      }
    });

    if (faqItems.length > 0) {
      elementsToRemove.forEach(el => el.remove());

      const faqsHtml = `
<div class="my-8">
  <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">Frequently Asked Questions (FAQs)</h2>
  <div class="space-y-4">
    ${faqItems.map(faq => `
      <div class="p-5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 class="font-bold text-base text-slate-900 dark:text-slate-100 mb-2">Q: ${faq.question}</h3>
        <p class="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">${faq.answer}</p>
      </div>
    `).join('')}
  </div>
</div>`;

      $('body').append(faqsHtml);
    }

    let finalHtml = $('body').html();
    if (!finalHtml.includes('Transform Your Institution with Jupsoft')) {
      finalHtml += CTA_BLOCK;
    }

    await prisma.blogTranslation.update({
      where: { id: blog3.id },
      data: { content: finalHtml }
    });
    console.log('   ✅ top-9-school-erp-software-providers updated with FAQ cards and CTA.');
  }

  // ── FIX 4: the-crucial-role-of-digital-assessment-tools-in-school-erp-solutions ──
  const blog4 = await prisma.blogTranslation.findFirst({
    where: { slug: 'the-crucial-role-of-digital-assessment-tools-in-school-erp-solutions', blog: { websiteId: WEBSITE_ID } }
  });
  if (blog4) {
    console.log('Fixing [4/6]: the-crucial-role-of-digital-assessment-tools ...');
    let content = blog4.content;
    const $ = cheerio.load(content);

    $('p').each((_, p) => {
      const txt = $(p).text().trim();
      const match = txt.match(/^(\d+)\.\s*([A-Z][a-zA-Z\s\-]+?)\s+([A-Z][a-z].*)/);
      if (match) {
        const num = match[1];
        const heading = match[2].trim();
        const paragraph = match[3].trim();
        $(p).replaceWith(`
          <div class="my-4">
            <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">${num}. ${heading}</h3>
            <p class="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">${paragraph}</p>
          </div>
        `);
      }
    });

    let finalHtml = $('body').html();
    if (!finalHtml.includes('Transform Your Institution with Jupsoft')) {
      finalHtml += CTA_BLOCK;
    }

    await prisma.blogTranslation.update({
      where: { id: blog4.id },
      data: { content: finalHtml }
    });
    console.log('   ✅ the-crucial-role-of-digital-assessment-tools headings & paragraphs separated.');
  }

  // ── FIX 5: utilizing-smart-boards-for-effective-instruction ───────────────
  const blog5 = await prisma.blogTranslation.findFirst({
    where: { slug: 'utilizing-smart-boards-for-effective-instruction', blog: { websiteId: WEBSITE_ID } }
  });
  if (blog5) {
    console.log('Fixing [5/6]: utilizing-smart-boards-for-effective-instruction ...');
    let content = blog5.content;
    const $ = cheerio.load(content);

    $('p').each((_, p) => {
      const txt = $(p).text().trim();
      const match = txt.match(/^(\d+)\.\s*([A-Z][a-zA-Z\s\-]+?)\s+([A-Z][a-z].*)/);
      if (match) {
        const num = match[1];
        const heading = match[2].trim();
        const paragraph = match[3].trim();
        $(p).replaceWith(`
          <div class="my-4">
            <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">${num}. ${heading}</h3>
            <p class="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">${paragraph}</p>
          </div>
        `);
      }
    });

    let finalHtml = $('body').html();
    if (!finalHtml.includes('Transform Your Institution with Jupsoft')) {
      finalHtml += CTA_BLOCK;
    }

    await prisma.blogTranslation.update({
      where: { id: blog5.id },
      data: { content: finalHtml }
    });
    console.log('   ✅ utilizing-smart-boards-for-effective-instruction headings & paragraphs separated.');
  }

  // ── FIX 6: holistic-progress-card-for-cbse ────────────────────────────────
  const blog6 = await prisma.blogTranslation.findFirst({
    where: { slug: 'holistic-progress-card-for-cbse', blog: { websiteId: WEBSITE_ID } }
  });
  if (blog6) {
    console.log('Fixing [6/6]: holistic-progress-card-for-cbse (Rich Multimedia & Comprehensive Guide) ...');
    const enrichedContent = `
<p class="text-base text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
  The <strong>Holistic Progress Card (HPC)</strong> introduced by the Central Board of Secondary Education (CBSE) represents a revolutionary 360-degree, multidimensional assessment framework. It shifts the educational paradigm away from rote memorization toward a comprehensive, competency-based evaluation that reflects each learner's unique strengths across cognitive, affective, socio-emotional, and psychomotor domains.
</p>

<!-- Video Orientation Showcase -->
<div class="my-8 p-4 bg-slate-900 rounded-2xl shadow-xl border border-slate-700">
  <h3 class="text-base font-semibold text-slate-200 mb-3 flex items-center gap-2">
    <span>📺</span> Official CBSE Orientation Video: Implementing the Holistic Progress Card
  </h3>
  <div class="relative w-full aspect-video rounded-xl overflow-hidden shadow-inner bg-black">
    <iframe 
      class="w-full h-full" 
      src="https://www.youtube-nocookie.com/embed/sI5i31P3iPQ" 
      title="CBSE Holistic Progress Card Orientation" 
      frameborder="0" 
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
      allowfullscreen>
    </iframe>
  </div>
</div>

<h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-8 mb-4">4 Key Pillars of the CBSE Holistic Progress Card</h2>
<div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
  <div class="p-5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900">
    <h3 class="font-bold text-blue-900 dark:text-blue-200 mb-2">1. Cognitive Domain</h3>
    <p class="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">Assessing conceptual clarity, inquiry-driven problem solving, and analytical thinking rather than textbook memorization.</p>
  </div>
  <div class="p-5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900">
    <h3 class="font-bold text-emerald-900 dark:text-emerald-200 mb-2">2. Affective Domain</h3>
    <p class="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">Tracking student values, emotional regulation, empathy, self-reflection, and collaborative team dynamics.</p>
  </div>
  <div class="p-5 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-900">
    <h3 class="font-bold text-purple-900 dark:text-purple-200 mb-2">3. Socio-Emotional Development</h3>
    <p class="text-sm text-purple-800 dark:text-purple-300 leading-relaxed">Evaluating peer relationships, interpersonal communication, resilience, and classroom citizenship.</p>
  </div>
  <div class="p-5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900">
    <h3 class="font-bold text-amber-900 dark:text-amber-200 mb-2">4. Psychomotor Domain</h3>
    <p class="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">Measuring motor coordination, physical fitness, sportsmanship, and creative expression in arts and crafts.</p>
  </div>
</div>

<h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-8 mb-4">How Jupsoft School ERP Automates HPC Compliance</h2>
<p class="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
  Modern schools require digital tools to record continuous observations without creating administrative overhead for teachers. Jupsoft's Examination & Result Analysis module enables educators to input formative qualitative observations, automatically aggregate multi-dimensional indicators, and generate CBSE-compliant Holistic Progress Cards with a single click.
</p>

${CTA_BLOCK}`;

    await prisma.blogTranslation.update({
      where: { id: blog6.id },
      data: { content: enrichedContent }
    });
    console.log('   ✅ holistic-progress-card-for-cbse enriched with video player, 4 pillars grid, and CTA.');
  }

  console.log('\n===============================================================');
  console.log('🎉 ALL 6 DEFECTS REPAIRED!');
  console.log('===============================================================');
}

fixAllDefects()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
