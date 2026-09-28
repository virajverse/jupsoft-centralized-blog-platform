/**
 * JUPSOFT IMAGE UPLOAD PIPELINE v2
 * ─────────────────────────────────────────────────────────────────────────────
 * Pipeline:
 *   1. Login to CMS
 *   2. For each unique image → POST /admin/media/upload (server converts to WebP)
 *   3. Get CDN URL from response
 *   4. PUT /admin/blogs/:id  → update featuredImage to new CDN URL
 *
 * Run: node blogs/upload-pipeline.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs   = require('fs');
const path = require('path');

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const IMAGES_SRC  = path.join(__dirname, 'images');
const CMS_API     = 'https://blogary.jupsoft.com';
const WEBSITE_ID  = 'site-jupsoft-test';
const ADMIN_EMAIL = 'superadmin@jupsoft.com';
const ADMIN_PASS  = 'Jupsoft#SuperAdmin2026!$';
const REPORT_FILE = path.join(__dirname, 'pipeline-report.json');

// ─── BLOG → IMAGE MAP (67 blogs) ─────────────────────────────────────────────
const BLOG_IMAGE_MAP = [
  { id: '75439447-80ab-4179-9dad-8d3a7dc3f683', slug: 'why-ai-school-erp-is-better-than-traditional-school-software',                    img: 'why-ai-school-erp-is-better-than-traditional-school-software.png' },
  { id: '3fa563dc-ac7d-41b9-9632-ea4083a8b00c', slug: 'learning-management-software-buying-guide-for-schools-in-2026-27',               img: 'learning-management-software-buying-guide-for-schools-in-2026\u201327.png' },
  { id: '716e51d6-c65c-44fc-a568-9d7669ed5e66', slug: 'unlocking-academic-excellence',                                                   img: 'CBSE_Result_Analysis_Software.png' },
  { id: '704d9f21-a04e-4391-a97a-026f219cb15a', slug: 'cbse-result-2025-a-quick-guide',                                                  img: 'Jupsoft_CBSE_Result_2025.png' },
  { id: 'e6d77ef7-8555-42ef-9e12-b8cca02d6a7c', slug: 'india-eight-best-school-mobile-apps',                                             img: 'blog-best-school-mobile-apps.jpg' },
  { id: '568a2e6f-63f2-4798-be7a-b83d6cc6d60a', slug: 'top-10-school-management-software-providers-in-india',                            img: 'top-10-school-img.jpg' },
  { id: 'cef37b33-5766-4b28-9561-daee89be4fe1', slug: 'fee-management',                                                                   img: 'Jupsoft-fee-management.png' },
  { id: 'fcc7ceda-a384-4ca5-a98a-bb184ed461cf', slug: 'whatsapp-bans-how-to-prevent-them-and-how-to-get-unlocked',                       img: 'whatsapp-ban.jpg' },
  { id: '72e98849-20b4-4918-873b-abe17807cda6', slug: 'role-of-ai-in-school-management-systems',                                         img: 'role-of-ai-in-school-management-systems.png' },
  { id: '6f96c091-995e-40ce-a016-522b26926770', slug: 'up-board-mandatory-vocational-education-from-class-9',                            img: 'up-board-mandatory-vocational-education-from-class-9.png' },
  { id: '769e13c8-6c79-44f2-8032-0641ef5d7831', slug: 'how-ai-is-revolutionizing-personalized-school-erp-software-for-better-education', img: 'AI-in-school-erp.jpg' },
  { id: '75c3f838-2df1-43ec-8602-1701f083d04d', slug: 'top-10-school-management-software-in-india-2025',                                 img: 'school-management-software-in-india-10.jpg' },
  { id: '4b6d2e5a-ea9c-44de-ad4f-aec7c454676b', slug: 'the-role-of-school-management-software-in-ensuring-data-security-and-privacy',   img: 'online-protection.jpg' },
  { id: '47bda300-d6d5-4010-89a2-b7270ca87489', slug: 'the-role-of-school-management-systems-in-enhancing-academic-performance',        img: 'sms-s.jpg' },
  { id: 'a1a9692f-59d3-460c-b971-0b7b0adabcb9', slug: 'enhancing-parent-teacher-communication-with-school-mobile-applications',         img: '123.jpg' },
  { id: '0eb8529b-872a-4576-8036-b645f0ab4aa4', slug: 'the-impact-of-AI-technologies-on-education-in-2024',                             img: '3d-rendering-biorobots-concept.jpg' },
  { id: 'd8877062-b8a2-4e96-9a9e-8d991dbd604a', slug: 'trai-guidelines-for-whitelist-urls-and-callback-numbers-on-dlt',                 img: 'home.jpg' },
  { id: '886396d5-b053-4158-98f2-3e1bdcd00d3f', slug: 'why-does-the-educational-system-need-a-school-mobile-app',                       img: 'mobile-app.jpg' },
  { id: 'fc8f9855-8e12-42f7-b70e-a02287400aba', slug: 'the-impact-of-school-ERP-software-in-india',                                     img: 'erp-software.jpg' },
  { id: 'a10a7562-e217-42ed-9688-908a90f4766c', slug: 'innovating-communication-channels-for-improved-education',                        img: 'enhance-erp.jpg' },
  { id: '2c050998-a8de-4d3c-9bfd-6effe5238908', slug: 'the-importance-of-school-exam-management-software-in-modern-education',          img: 'examination.png' },
  { id: '19a4e9da-3e93-475d-a42f-1bbe7c00ac64', slug: 'all-you-need-to-know-about-the-student-information-system-software',             img: 'img1.jpg' },
  { id: '861dbb1f-3d2f-4956-9150-c43770a10bf7', slug: 'top-9-school-erp-software-providers-in-india-improving-academic-efficiency',     img: 'top-9-school-erp-software-provider-in-india.png' },
  { id: 'e84fec44-57af-4091-9ba7-709320f1f000', slug: 'benefits-of-cloud-based-school-management-software-for-modern-schools',          img: 'benefits-of-cloud-based-school-management-software-for-modern-schools.png' },
  { id: 'ba40cc1c-5064-4bd6-a5de-d4af36269214', slug: 'top-10-strategies-to-manage-the-classroom-effectively',                          img: 'blog11.jpg' },
  { id: 'd885d5ee-0804-4e9d-a0e8-e3de33376606', slug: 'the-role-of-interactive-flat-panels-for-teachers',                               img: 'IFP_Banner.png' },
  { id: 'a3f67522-bfb5-4a51-af96-31fb02a95c8b', slug: 'unveiling-the-power-of-cbse-result-analysis-software',                           img: 'CBSEResult.png' },
  { id: '71ec6c9d-fcb1-4656-b95a-728b0acc39cf', slug: 'how-school-erp-systems-drive-growth',                                            img: 'imh.jpg' },
  { id: 'c5e88d4f-e15d-47a9-918e-7142ecc16f70', slug: 'the-impact-of-school-management-systems',                                        img: 'impact.jpeg' },
  { id: 'ac793d8b-227b-48e7-b891-37c4f82111df', slug: 'the-simplicity-of-long-distance-learning',                                       img: 'learning.png' },
  { id: '0d106a8d-c90b-414f-a556-b3e27cac6ba3', slug: 'why-are-online-exams-gaining-popularity-in-india',                               img: 'exam11.png' },
  { id: '7c9be211-f680-48b7-bd91-c5a51bab47a3', slug: 'holistic-progress-card-for-cbse',                                                 img: 'hpc.png' },
  { id: 'e48eb299-770e-438e-92f2-330bf10d767d', slug: 'the-role-of-artificial-intelligence-inside-the-future-of-education',             img: 'ai.jpg' },
  { id: 'd6f57d4d-09c7-4400-92cc-85f95f5ec645', slug: 'seamless-collaboration-for-success',                                              img: 'smss.jpg' },
  { id: '070362a7-390e-427f-9ca8-9a4c7d3c6037', slug: 'the-benefits-of-a-school-information-management-system',                         img: 'lms.jpg' },
  { id: 'd58f2288-5657-47b2-ab7c-c2d247fef6cf', slug: 'top-5-factors-to-consider-while-choosing-school-mobile-app',                     img: 'g1.png' },
  { id: '63f2ee9c-53c6-4ecd-b9c4-6f5a3a9d22ae', slug: 'top-10-school-management-software-in-india-to-elevate-your-schools-efficiency',  img: 'sms.jpg' },
  { id: '32db26a2-9f6f-4509-af81-38d5ecda625e', slug: 'revamp-your-schools-operations-by-implementing-software-for-school-management',  img: 'ban.jpg' },
  { id: '99f0b40e-9c98-4375-882e-954f8171abb9', slug: 'the-pros-and-cons-of-adopting-the-school-management-app',                        img: 'education.jpg' },
  { id: 'c43b0e3e-c034-4d49-843a-b326ac068064', slug: 'maximizing-lead-conversion-with-a-lead-management-system-software',              img: 'why-should-you-use-visitor-management-software.jpg' },
  { id: 'd8d9be28-d558-4097-8a49-b5deb8e2dd6e', slug: '5-reasons-why-your-school-needs-a-learning-management-system',                   img: 'Online-Schooling-Addressing-Health-Concerns.png' },
  { id: '7662d86d-6731-4763-affb-3e574f3d547b', slug: 'top-10-benefits-of-college-management-software',                                 img: 'Rebooting-Education-Shifting-Online.png' },
  { id: 'e3a7480d-9cf5-45dc-98f6-b165952c6778', slug: 'how-school-erp-software-can-revolutionize-the-education-system',                 img: 'Online-Schooling-Addressing-Health-Concerns.png' },
  { id: '3b10b7ca-c75b-41bf-a482-98ec1dfd1212', slug: 'Online-Schooling-Addressing-Health-Concerns',                                    img: 'Online-Schooling-Addressing-Health-Concerns.png' },
  { id: '868bd043-d8cf-4e95-b0a0-cfedbc9fb78d', slug: 'ease-in-administrative-hassles-and-bring-efficiency-in-your-school',             img: 'ease-in-administrative-hassles-and-bring-efficiency-in-your-school.png' },
  { id: '7d5673aa-d28c-4b0b-ab9b-1e1d421afc73', slug: 'rebooting-education-a-shift-of-education-industry-to-online-ecosystem',          img: 'Rebooting-Education-Shifting-Online.png' },
  { id: '7998ba63-88dc-4e92-b7d7-ae3bac8767dd', slug: 'What-Parents-Want',                                                               img: 'jupsoft-what-parent-want.jpg' },
  { id: '33502702-ed77-47f6-9cd1-6045208f1023', slug: 'Boosting-Attendance',                                                             img: 'jupsoft-Boosting-Attendance.jpg' },
  { id: '6e810936-47a5-4096-897e-28d064bf1395', slug: 'Is-Your-School-a-Green-School',                                                   img: 'Jupsoft-Is-Your-School-a-Green-School.png' },
  { id: '877de7be-fc84-4d3d-83e7-1766effe9171', slug: 'Why-Do-You-Need-A-Visitor-Management-System',                                    img: 'Jupsoft-visitor-management-system.jpg' },
  { id: '6d9f206f-772d-480e-85b8-4aa9b648219f', slug: 'How-can-Doctors-Ensure-a-Speedy-with-a-Clinic-Management-System',               img: 'How-can-Doctors-Ensure-a-Speedy-with-a-Clinic-Management-System.jpg' },
  { id: 'dc14dc9b-ec5d-4ede-85d1-07a9fecd0fac', slug: 'why-should-you-use-visitor-management-software',                                 img: 'why-should-you-use-visitor-management-software.jpg' },
  { id: 'de7e906c-55d4-4b27-bda2-5af878ab98ce', slug: 'choosing-a-pioneering-it-company-in-india',                                      img: 'choosing-a-pioneering-it-company-in-india.jpg' },
  { id: '28c167e4-2048-4e14-98bc-4ab26a0a2717', slug: 'tech-driven-pedagogy-the-teachers-viewpoint',                                    img: 'tech-driven-pedagogy-the-teachers-viewpoint.jpg' },
  { id: '478be735-6588-4a1d-894a-67d9e4d56d1e', slug: 'online-assessments-in-schools-and-colleges',                                     img: 'online-assessments-in-schools-and-colleges.jpg' },
  { id: 'fd6944e6-a958-4f54-a074-0bec587a651d', slug: 'choosing-the-right-school-information-management-system',                        img: 'Online-Schooling-Addressing-Health-Concerns.png' },
  { id: 'a9b51879-04b1-4a68-bce0-5b899714caf4', slug: 'role-of-school-mobile-app-in-school',                                            img: 'role_of_mobile_App_in_School_Jupsoft.png' },
  { id: '81365955-f83b-41fb-91af-0fd457321a3c', slug: 'how-lms-for-school-can-improve-student-engagement-and-performance',              img: 'adaptive-learning.jpg' },
  { id: 'c9eef0cf-4465-40a9-ad17-c5c9e95d7a63', slug: 'faculty-management-solution',                                                     img: 'Jupsoft-Faculty-Management-Solution.jpg' },
  { id: '1506f3a0-ab23-4f15-acfe-952d27ba3ef9', slug: 'Hostel-Management',                                                               img: 'Jupsoft-hostel-management.jpg' },
  { id: '6fc9dfff-0767-4ada-b4df-fb630793f751', slug: 'front-desk-management',                                                           img: 'Jupsoft-front-desk-managment.jpg' },
  { id: '855f9f79-892a-4533-895e-da9751576b34', slug: 'how-ai-is-transforming-school-admission-management',                              img: 'how-ai-is-transforming-school-admission-management.png' },
  { id: '5ec5d4f8-1fd9-4206-b1f8-c720603c1451', slug: 'the-crucial-role-of-digital-assessment-tools-in-school-erp-solutions',           img: 'analytics.jpg' },
  { id: 'a67be9ae-1a1b-4dd3-bde3-264bcf3f52f2', slug: 'school-erp-software-jupsoft-vs-others',                                          img: 'school-erp-software-jupsoft-vs-others.jpg' },
  { id: 'efda7b13-b4d5-49e5-a4fb-4b957e8bd60f', slug: 'top-10-school-ERP-software-providers-in-India',                                 img: 'erp.jpg' },
  { id: 'b5678d28-26dc-4fee-bd4c-8494a60a2f88', slug: 'how-an-all-in-one-school-erp-can-digitally-transform-your-education-system',     img: 'how-an-all-in-one-school-erp-can-digitally-transform-your-education-system.png' },
  { id: 'cafa6d2f-105f-4d83-bb04-0fb56be2ffec', slug: 'utilizing-smart-boards-for-effective-instruction',                               img: '21.jpg' },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log   = (e, m) => console.log(`${e} ${m}`);

async function apiJSON(method, endpoint, body, token) {
  const res = await fetch(`${CMS_API}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${endpoint} → HTTP ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function uploadImage(imgFilename, token) {
  const srcPath = path.join(IMAGES_SRC, imgFilename);
  if (!fs.existsSync(srcPath)) throw new Error(`Source not found: ${srcPath}`);

  const fileBuffer = fs.readFileSync(srcPath);
  const ext = path.extname(imgFilename).toLowerCase();
  const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
  const mimeType = mimeMap[ext] || 'image/jpeg';

  const blob = new Blob([fileBuffer], { type: mimeType });
  const form = new FormData();
  form.append('file', blob, imgFilename);
  form.append('websiteId', WEBSITE_ID);
  form.append('altText', imgFilename.replace(/[-_]/g, ' ').replace(/\.[^.]+$/, '').trim());

  const res = await fetch(`${CMS_API}/admin/media/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    signal: AbortSignal.timeout(120000),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Upload failed HTTP ${res.status}: ${JSON.stringify(data)}`);

  // Extract CDN URL from response
  const cdnUrl = data?.cdnUrl || data?.data?.cdnUrl || data?.url || data?.data?.url;
  if (!cdnUrl) throw new Error(`No CDN URL in response: ${JSON.stringify(data)}`);
  return cdnUrl;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n════════════════════════════════════════════════════════');
  log('🚀', 'JUPSOFT IMAGE UPLOAD PIPELINE v2');
  log('📋', `Blogs to process : ${BLOG_IMAGE_MAP.length}`);
  console.log('════════════════════════════════════════════════════════\n');

  // ── Step 1: Login ─────────────────────────────────────────────────────────
  log('🔐', 'Authenticating...');
  const loginData = await apiJSON('POST', '/admin/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });
  const token = loginData.accessToken;
  log('✅', `Logged in as ${loginData.user?.email || ADMIN_EMAIL}\n`);

  // ── Step 2: Build unique image set (avoid re-uploading duplicates) ────────
  const uniqueImages = [...new Set(BLOG_IMAGE_MAP.map(b => b.img))];
  log('📊', `Unique images to upload: ${uniqueImages.length}`);

  const uploadCache  = {};  // imgFilename → cdnUrl
  const uploadErrors = {};  // imgFilename → error message
  let uploadOk = 0, uploadFail = 0;

  // ── Step 3: Upload each unique image ─────────────────────────────────────
  log('', '\n── PHASE 1: UPLOAD IMAGES ──────────────────────────────\n');
  for (let i = 0; i < uniqueImages.length; i++) {
    const imgName = uniqueImages[i];
    const progress = `[${String(i + 1).padStart(2, '0')}/${uniqueImages.length}]`;

    try {
      const cdnUrl = await uploadImage(imgName, token);
      uploadCache[imgName] = cdnUrl;
      uploadOk++;
      log('☁️ ', `${progress} UPLOADED  ${imgName}`);
      log('   ', `          → ${cdnUrl}`);
    } catch (err) {
      uploadErrors[imgName] = err.message;
      uploadFail++;
      log('❌', `${progress} FAILED    ${imgName}`);
      log('   ', `          ⚠ ${err.message}`);
    }

    await sleep(300); // rate limit protection
  }

  console.log(`\n── Upload Summary: ✅ ${uploadOk} succeeded  ❌ ${uploadFail} failed\n`);

  // ── Step 4: Update blogs featuredImage ────────────────────────────────────
  log('', '── PHASE 2: UPDATE BLOG FEATURED IMAGES ───────────────\n');
  let updated = 0, skipped = 0, updateFail = 0;
  const failures = [];

  for (let i = 0; i < BLOG_IMAGE_MAP.length; i++) {
    const blog = BLOG_IMAGE_MAP[i];
    const progress = `[${String(i + 1).padStart(2, '0')}/${BLOG_IMAGE_MAP.length}]`;
    const cdnUrl = uploadCache[blog.img];

    if (!cdnUrl) {
      log('⏩', `${progress} SKIP  ${blog.slug}`);
      log('   ', `      ⚠ No CDN URL for ${blog.img} (upload failed)`);
      skipped++;
      continue;
    }

    try {
      await apiJSON('PUT', `/admin/blogs/${blog.id}`, { featuredImage: cdnUrl }, token);
      updated++;
      log('✅', `${progress} UPDATED  ${blog.slug}`);
    } catch (err) {
      updateFail++;
      failures.push({ id: blog.id, slug: blog.slug, img: blog.img, error: err.message });
      log('❌', `${progress} FAILED   ${blog.slug} — ${err.message}`);
    }

    await sleep(150);
  }

  // ── Final Report ─────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════');
  log('🎉', 'PIPELINE COMPLETE!');
  console.log('════════════════════════════════════════════════════════');
  log('☁️ ', `Images uploaded    : ${uploadOk} / ${uniqueImages.length}`);
  log('❌', `Images failed      : ${uploadFail} / ${uniqueImages.length}`);
  log('✅', `Blogs updated      : ${updated} / ${BLOG_IMAGE_MAP.length}`);
  log('⏩', `Blogs skipped      : ${skipped}`);
  log('❌', `Blogs update fail  : ${updateFail}`);
  console.log('════════════════════════════════════════════════════════\n');

  if (failures.length) {
    log('⚠️ ', 'FAILED ITEMS:');
    failures.forEach(f => log('   ', `- [${f.slug}] ${f.error}`));
  }

  const report = {
    timestamp : new Date().toISOString(),
    uploadOk, uploadFail, updated, skipped, updateFail,
    uploadCache, uploadErrors, failures,
  };
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  log('📄', `Full report → ${REPORT_FILE}`);
}

main().catch(err => { console.error('\n💥 PIPELINE CRASHED:', err.message); process.exit(1); });
