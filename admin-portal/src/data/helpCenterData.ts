export interface HelpStep {
  step: number;
  instruction: string;
  detail?: string;
}

export interface HelpQuestion {
  id: string;
  title: string;
  titleHi: string;
  shortDesc: string;
  tags: string[];
  summary: string;
  summaryHi?: string;
  steps: HelpStep[];
  proTip?: string;
  actionLink?: {
    label: string;
    href: string;
  };
}

export interface HelpCategory {
  id: string;
  title: string;
  titleHi: string;
  description: string;
  iconName: string;
  badgeColor: string;
  questions: HelpQuestion[];
}

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: 'users-rbac',
    title: 'Super Admin & Team Management',
    titleHi: 'सुपर एडमिन और टीम मैनेजमेंट',
    description: 'Create Super Admins, invite staff, manage role permissions, and share credentials.',
    iconName: 'Users',
    badgeColor: 'purple',
    questions: [
      {
        id: 'create-super-admin',
        title: 'How to create a new Super Admin from the UI?',
        titleHi: 'UI se Naya Super Admin kaise banayein?',
        shortDesc: 'Create full-privilege Super Admins directly without running SQL scripts.',
        tags: ['super admin', 'create super admin', 'users', 'roles', 'add admin', 'invite'],
        summary: 'Super Admins can create new Super Admin accounts directly from the Team Roles & Permissions page without running any SQL queries.',
        summaryHi: 'Super Admin login karke UI ke "Team Roles & Permissions" page se seedha Super Admin bana sakte hain bina kisi SQL script ke.',
        steps: [
          {
            step: 1,
            instruction: 'Log in as a Super Admin and go to Team Roles & Permissions (/users)',
            detail: 'Navigate to Team Roles & Permissions from the left sidebar or the navigation bar.',
          },
          {
            step: 2,
            instruction: 'Click the "Invite Team Member" button in the top-right corner',
            detail: 'The member invitation modal will open.',
          },
          {
            step: 3,
            instruction: 'Enter Member Name, Email, and Password',
            detail: 'A secure temporary password is automatically generated, or you can type a custom one.',
          },
          {
            step: 4,
            instruction: 'In the "Assigned Role" dropdown, select "Super Admin"',
            detail: 'The Website Assignment Scope will automatically set to "All Websites (Network Wide / Global)".',
          },
          {
            step: 5,
            instruction: 'Click "Invite Team Member" to complete',
            detail: 'The backend will automatically grant global privileges and seed permissions for all websites so no 403 Forbidden errors occur.',
          },
          {
            step: 6,
            instruction: 'Share login credentials with the user via WhatsApp or Email',
            detail: 'A credential share modal will immediately appear with a pre-formatted invitation message.',
          },
        ],
        proTip: 'The primary root master account (superadmin@jupsoft.com) is permanently protected against accidental deletion.',
        actionLink: {
          label: 'Go to Team Management (/users)',
          href: '/users',
        },
      },
      {
        id: 'invite-team-member',
        title: 'How to invite Writers, Editors, and SEO Managers?',
        titleHi: 'Team Member (Writer, Editor, SEO Manager) kaise add karein?',
        shortDesc: 'Invite regional writers and editors to specific websites.',
        tags: ['invite', 'writer', 'editor', 'seo manager', 'member', 'team', 'website'],
        summary: 'Invite team members and assign them strictly to specific websites with designated roles.',
        summaryHi: 'Kisi bhi website ke liye Content Writer, Editor, Publisher, ya SEO Manager assign karein.',
        steps: [
          {
            step: 1,
            instruction: 'Open Team Roles & Permissions (/users)',
            detail: 'Click "Invite Team Member" at the top of the page.',
          },
          {
            step: 2,
            instruction: 'Fill in the member’s name and corporate email address',
          },
          {
            step: 3,
            instruction: 'Select the Website Assignment Scope (e.g., Jupsoft Cloud, DigifyNext)',
            detail: 'This isolates the user so they can only access and edit content for that specific website.',
          },
          {
            step: 4,
            instruction: 'Choose the appropriate role: Editor, Content Writer, Publisher, or SEO Manager',
          },
          {
            step: 5,
            instruction: 'Submit the form and dispatch the credentials via WhatsApp or Email',
          },
        ],
        actionLink: {
          label: 'Invite a Team Member (/users)',
          href: '/users',
        },
      },
      {
        id: 'share-credentials',
        title: 'How to share login credentials via WhatsApp or Email?',
        titleHi: 'WhatsApp ya Email se login details kaise share karein?',
        shortDesc: 'Send instant 1-click WhatsApp or Email messages with portal link and password.',
        tags: ['share', 'whatsapp', 'email', 'credentials', 'password', 'login details'],
        summary: 'Send instant WhatsApp or Email messages containing the sign-in URL, email, and temporary password.',
        summaryHi: 'Ek-click me pre-formatted message bhej sakte hain jisme portal URL, email aur temporary password hota hai.',
        steps: [
          {
            step: 1,
            instruction: 'Go to the Team Directory table on /users',
          },
          {
            step: 2,
            instruction: 'Find the user and click the green Share icon (arrow) in the right action column',
            detail: 'The Credentials Dispatch modal will pop up.',
          },
          {
            step: 3,
            instruction: 'Choose "Share via WhatsApp" or "Share via Email" or "Copy Credentials"',
            detail: 'WhatsApp will open directly with a polite, ready-to-send welcome message for the employee.',
          },
        ],
        proTip: 'Advise new team members to change their temporary password upon their first sign-in.',
        actionLink: {
          label: 'Open Member Directory (/users)',
          href: '/users',
        },
      },
      {
        id: 'role-hierarchy',
        title: 'What are the permissions and capabilities of each Role?',
        titleHi: 'Har Role ki kya permissions hoti hain? (Roles & Hierarchy)',
        shortDesc: 'Understand the 7 team roles from Super Admin down to Staff Writer.',
        tags: ['roles', 'permissions', 'hierarchy', 'access', 'editor', 'writer'],
        summary: 'The platform features 7 strictly segregated roles designed for enterprise editorial governance.',
        summaryHi: 'CMS me 7 granular roles hain: Super Admin, Website Admin, Role Admin, Editor, Content Writer, Publisher, aur SEO Manager.',
        steps: [
          {
            step: 1,
            instruction: 'Super Admin',
            detail: 'Network-wide supreme authority. Manages all websites, users, permissions, domain configurations, security tokens, and plugins.',
          },
          {
            step: 2,
            instruction: 'Website Admin',
            detail: 'Full administrative authority strictly over their assigned website (blogs, workflow, media, categories, team invites).',
          },
          {
            step: 3,
            instruction: 'Editor',
            detail: 'Reviews, critiques, edits, approves, and rejects article submissions authored by Content Writers.',
          },
          {
            step: 4,
            instruction: 'Content Writer',
            detail: 'Drafts articles, uploads media, and submits drafts for review. Cannot directly push content to live public websites.',
          },
          {
            step: 5,
            instruction: 'Publisher',
            detail: 'Authorized to execute live edge publishing, purge Redis/CDN cache, and schedule publications.',
          },
          {
            step: 6,
            instruction: 'SEO Manager',
            detail: 'Manages meta tags, categories & tags, focus keywords, old link redirects, and analytics telemetry.',
          },
        ],
        actionLink: {
          label: 'View Role Matrix (/users?tab=matrix)',
          href: '/users?tab=matrix',
        },
      },
      {
        id: 'fix-403-forbidden',
        title: 'Why do users get "403 Forbidden: Access Denied" and how to fix it?',
        titleHi: 'User ko 403 Forbidden Access Denied error kyu aata hai?',
        shortDesc: 'Resolve website scope mismatch when users access websites they are not assigned to.',
        tags: ['403', 'forbidden', 'access denied', 'permission error', 'website mismatch'],
        summary: 'A 403 error occurs when a user tries to access a website that has not been assigned to their account in the database.',
        summaryHi: 'Jab user kisi aisi website ka blog view ya edit karne ki koshish karta hai jiska permission unke account me assign nahi hai, to 403 error aata hai.',
        steps: [
          {
            step: 1,
            instruction: 'Log in as Super Admin and navigate to /users',
          },
          {
            step: 2,
            instruction: 'Find the affected user in the directory and click the Edit (Pencil) button',
          },
          {
            step: 3,
            instruction: 'Under "Assigned Website Scopes", check if the target website is present',
            detail: 'If missing, select the website from "+ Add Website Scope to this User" and assign a role.',
          },
          {
            step: 4,
            instruction: 'Click "Save Changes"',
            detail: 'Have the user log out and log back in, or refresh their browser. The 403 error will be immediately resolved.',
          },
        ],
        actionLink: {
          label: 'Resolve in Team Roles & Permissions (/users)',
          href: '/users',
        },
      },
      {
        id: 'reset-password',
        title: 'How to reset a user password if they forgot it?',
        titleHi: 'User ka Password Reset kaise karein?',
        shortDesc: 'Generate and dispatch a new secure temporary password.',
        tags: ['reset password', 'forgot password', 'change password', 'credentials'],
        summary: 'Admins can instantly generate a new 12-character strong temporary password for any user.',
        summaryHi: 'Agar koi user password bhool jaye, to admin ek naya temporary password generate kar sakta hai.',
        steps: [
          {
            step: 1,
            instruction: 'Open /users and locate the user row',
          },
          {
            step: 2,
            instruction: 'Click the Edit (Pencil) icon, or click the Share icon and choose "Generate New Password"',
          },
          {
            step: 3,
            instruction: 'Copy the newly generated password and forward it to the user',
          },
        ],
        actionLink: {
          label: 'Go to /users',
          href: '/users',
        },
      },
    ],
  },
  {
    id: 'blogs-writing',
    title: 'Blog Writing & Content Studio',
    titleHi: 'ब्लॉग लिखना और कंटेंट स्टूडियो',
    description: 'Authoring articles, featured images, multi-language tabs, and scheduling.',
    iconName: 'FileText',
    badgeColor: 'blue',
    questions: [
      {
        id: 'write-new-blog',
        title: 'How to write a new blog and save a draft?',
        titleHi: 'Naya blog kaise likhein aur draft kaise save karein?',
        shortDesc: 'Step-by-step guide to authoring content in the full-page blog canvas.',
        tags: ['write blog', 'new article', 'draft', 'editor', 'publish blog', 'save draft'],
        summary: 'Create and draft rich articles with automatic slug generation and word count telemetry.',
        summaryHi: 'Distraction-free full-screen editor me structured article draft banayein.',
        steps: [
          {
            step: 1,
            instruction: 'Click "+ New Article" in the top navbar or navigate to /blogs/new',
          },
          {
            step: 2,
            instruction: 'Select the Target Website from the scope selector at the top',
            detail: 'Ensures the blog belongs to the correct website tenant (e.g. Jupsoft Cloud or DigifyNext).',
          },
          {
            step: 3,
            instruction: 'Enter your Article Title in the main title field',
            detail: 'The URL slug is automatically generated in clean lowercase with hyphens.',
          },
          {
            step: 4,
            instruction: 'Write your content using the rich-text canvas',
            detail: 'Supports H2/H3 headings, ordered/unordered lists, code snippets, blockquotes, and tables.',
          },
          {
            step: 5,
            instruction: 'Click "Save Draft" in the top-right corner',
            detail: 'Your article is now safely stored as a Draft in the database.',
          },
        ],
        actionLink: {
          label: 'Write New Blog (/blogs/new)',
          href: '/blogs/new',
        },
      },
      {
        id: 'featured-image-media',
        title: 'How to add a Featured Image and media inside the blog?',
        titleHi: 'Featured Image aur Blog Media kaise add karein?',
        shortDesc: 'Optimal dimensions, alt tags, and automated WebP conversion.',
        tags: ['featured image', 'upload image', 'media', 'webp', 'thumbnail', 'photo'],
        summary: 'Upload high-resolution featured images that are automatically optimized into fast-loading WebP assets.',
        summaryHi: 'Right sidebar me Featured Image box se banner image dalein jo Google aur social media shares me dikhegi.',
        steps: [
          {
            step: 1,
            instruction: 'In the Blog Editor, look at the right sidebar "Featured Image" section',
          },
          {
            step: 2,
            instruction: 'Click the upload zone or drag-and-drop an image file',
            detail: 'Recommended aspect ratio is 1200x630px (1.91:1) for optimal social sharing on WhatsApp, Twitter, and LinkedIn.',
          },
          {
            step: 3,
            instruction: 'Always enter descriptive Image Alt Text',
            detail: 'Alt text is critical for accessibility and satisfies the 8-point automated SEO audit.',
          },
          {
            step: 4,
            instruction: 'To embed images inside article body, click the Image icon in the editor toolbar',
          },
        ],
        proTip: 'All uploaded images are automatically compressed and delivered via CDN in modern WebP format for fast sub-second page loads.',
        actionLink: {
          label: 'Media Library (/media)',
          href: '/media',
        },
      },
      {
        id: 'multi-language-translations',
        title: 'How does multi-language (Hindi, English, etc.) translation work?',
        titleHi: 'Multi-language (Hindi, English, etc.) translations kaise likhein?',
        shortDesc: 'Manage English, Hindi, French, and Arabic versions within a single article record.',
        tags: ['translation', 'hindi', 'english', 'language', 'locale', 'multilingual'],
        summary: 'Publish native localized versions across EN, HI, FR, and AR without duplicate blog posts.',
        summaryHi: 'Ek hi blog ko multiple languages me bina duplicate post banaye publish kar sakte hain.',
        steps: [
          {
            step: 1,
            instruction: 'In the Blog Editor, locate the Language Tabs above the title: EN, HI, FR, AR',
          },
          {
            step: 2,
            instruction: 'Click on the language tab you want to write in (e.g., "HI" for Hindi)',
          },
          {
            step: 3,
            instruction: 'Enter the translated title, localized slug, and body content',
            detail: 'Each language retains its own independent SEO title, meta description, and excerpt.',
          },
          {
            step: 4,
            instruction: 'Save the article',
            detail: 'On consumer frontends, readers can switch languages via the website header dropdown.',
          },
        ],
      },
      {
        id: 'schedule-blog',
        title: 'How to schedule a blog for future publishing?',
        titleHi: 'Future date ke liye Blog Schedule kaise karein?',
        shortDesc: 'Queue articles to automatically go live at an exact date and time.',
        tags: ['schedule', 'future publish', 'calendar', 'automatic release', 'queue'],
        summary: 'Set an automated release date so articles go live at optimal audience reading hours.',
        summaryHi: 'Apne blog ko kisi future date aur time par automatically live karne ke liye schedule karein.',
        steps: [
          {
            step: 1,
            instruction: 'In the Blog Editor right sidebar, find the "Publication Status" dropdown',
          },
          {
            step: 2,
            instruction: 'Select "Scheduled" from the list',
          },
          {
            step: 3,
            instruction: 'Choose your desired Publish Date and Time in the calendar picker',
          },
          {
            step: 4,
            instruction: 'Click "Schedule Article"',
            detail: 'The blog will move to the "Scheduled" queue on the Kanban board and publish automatically.',
          },
        ],
        actionLink: {
          label: 'View Workflow Board (/workflow)',
          href: '/workflow',
        },
      },
      {
        id: 'updating-slugs-redirects',
        title: 'What precautions to take when changing an existing article slug?',
        titleHi: 'Blog ka URL / Slug change karne par kya dhyaan rakhein?',
        shortDesc: 'Prevent broken 404 links and preserve search rankings by adding 301 redirects.',
        tags: ['slug', 'url', 'redirect', '301', '404', 'broken link'],
        summary: 'Always set up a 301 Permanent Redirect whenever an already-published URL slug is modified.',
        summaryHi: 'Jab bhi slug change karein, hamesha 301 Permanent Redirect banayein taaki purane traffic aur rankings ka loss na ho.',
        steps: [
          {
            step: 1,
            instruction: 'Copy the existing/old article URL path before editing',
          },
          {
            step: 2,
            instruction: 'Update the slug in the Blog Editor and save',
          },
          {
            step: 3,
            instruction: 'Go to 301 Redirects (/redirects)',
          },
          {
            step: 4,
            instruction: 'Click "+ Add Redirect Rule" and map Old Path -> New Path',
          },
        ],
        actionLink: {
          label: 'Open 301 Redirects (/redirects)',
          href: '/redirects',
        },
      },
    ],
  },
  {
    id: 'workflow-kanban',
    title: 'Editorial Workflow & Approvals',
    titleHi: 'एडिटोरियल वर्कफ़्लो और अप्रूवल',
    description: '6-Stage sequential pipeline, drag-and-drop Workflow Board, and review audits.',
    iconName: 'Kanban',
    badgeColor: 'emerald',
    questions: [
      {
        id: 'kanban-lifecycle',
        title: 'How does the 6-Stage Editorial Workflow Board work?',
        titleHi: '6-Stage Editorial Workflow Board kaise kaam karta hai?',
        shortDesc: 'Understand the sequential path from draft authoring to live edge deployment.',
        tags: ['workflow', 'stages', 'approval', 'draft', 'review', 'published'],
        summary: 'Every article progresses through a governed 6-stage lifecycle ensuring high editorial quality.',
        summaryHi: 'Content quality ensure karne ke liye har article sequential approval pipeline se guzarta hai.',
        steps: [
          {
            step: 1,
            instruction: '1. Draft',
            detail: 'Writer authors initial ideas. Visible only to author and admins.',
          },
          {
            step: 2,
            instruction: '2. Under Review',
            detail: 'Submitted for editorial quality control and factual verification.',
          },
          {
            step: 3,
            instruction: '3. Approved',
            detail: 'Reviewed and approved by Editor or Admin. Ready for deployment.',
          },
          {
            step: 4,
            instruction: '4. Scheduled',
            detail: 'Queued with a target timestamp for automated publication.',
          },
          {
            step: 5,
            instruction: '5. Published',
            detail: 'Live on consumer frontends. Triggers instant sub-300ms edge cache invalidation.',
          },
          {
            step: 6,
            instruction: '6. Archived',
            detail: 'Decommissioned from public view while preserving database history.',
          },
        ],
        actionLink: {
          label: 'Open Workflow Board (/workflow)',
          href: '/workflow',
        },
      },
      {
        id: 'drag-and-drop-kanban',
        title: 'How to advance articles using Drag-and-Drop?',
        titleHi: 'Drag-and-Drop se Status kaise change karein?',
        shortDesc: 'Move cards between columns on the visual Workflow board.',
        tags: ['drag and drop', 'move card', 'workflow board', 'advance status'],
        summary: 'Simply drag an article card from one column to another to update its workflow state.',
        summaryHi: 'Workflow board par card ko ek column se dusre column me drag karke turant status change kar sakte hain.',
        steps: [
          {
            step: 1,
            instruction: 'Navigate to /workflow',
          },
          {
            step: 2,
            instruction: 'Click and hold any article card',
          },
          {
            step: 3,
            instruction: 'Drag it into the desired column (e.g. from "Under Review" to "Approved")',
          },
          {
            step: 4,
            instruction: 'Release to drop. The status updates immediately in PostgreSQL with an activity log.',
          },
        ],
        actionLink: {
          label: 'Go to Workflow Board (/workflow)',
          href: '/workflow',
        },
      },
      {
        id: 'publishing-latency',
        title: 'How quickly do published articles appear on the public website?',
        titleHi: 'Publish hone ke baad live website par kitni der me dikhta hai?',
        shortDesc: 'Instant edge cache purging via HMAC-SHA256 on-demand revalidation.',
        tags: ['instant publish', 'cache purge', 'webhook', 'edge invalidation', 'latency'],
        summary: 'Articles go live immediately (typically under 300ms) without redeploying the website.',
        summaryHi: 'Instant (sub-300ms)! Backend HMAC webhook fire karta hai jo frontend cache turant purge kar deta hai.',
        steps: [
          {
            step: 1,
            instruction: 'When an article transitions to "Published", the backend creates an HMAC-SHA256 signature.',
          },
          {
            step: 2,
            instruction: 'It dispatches an On-Demand Revalidation webhook to the consumer frontend.',
          },
          {
            step: 3,
            instruction: 'The frontend immediately purges its cached HTML/JSON and fetches the latest article data.',
          },
        ],
        proTip: 'If you still see old content on your device, perform a hard refresh (Ctrl + F5 or Cmd + Shift + R) to clear your local browser cache.',
      },
    ],
  },
  {
    id: 'tenants-scoping',
    title: 'Multi-Website Management & Scope',
    titleHi: 'मल्टी-वेबसाइट और डोमेन',
    description: 'Switching website scopes, website isolation, and live domains.',
    iconName: 'Globe',
    badgeColor: 'sky',
    questions: [
      {
        id: 'network-vs-site-scope',
        title: 'What is the difference between "All Websites" and Single Website Scope?',
        titleHi: '"All Websites" vs Single Website Scope me kya farak hai?',
        shortDesc: 'Aggregated company-wide view vs brand-isolated workspace.',
        tags: ['scope', 'all websites', 'single website', 'multi-site', 'switch website'],
        summary: 'The scope pill in the top navbar toggles between company-wide overview and website-specific operations.',
        summaryHi: 'Top navbar me Website Scope selector se aap decide karte hain ki aapko poori company ka data dekhna hai ya ek single website ka.',
        steps: [
          {
            step: 1,
            instruction: 'All Websites Scope (?site=all)',
            detail: 'Displays aggregated metrics, total articles across all client domains, cross-site publishing trends, and network-wide team members.',
          },
          {
            step: 2,
            instruction: 'Single Website Scope (?site=site-cloud etc.)',
            detail: 'Strictly isolates Articles, Categories, Tags, Media Library, and Old Link Redirects to the selected website brand.',
          },
          {
            step: 3,
            instruction: 'To switch scopes, click the Website pill with the globe icon in the top navbar.',
          },
        ],
      },
      {
        id: 'view-live-article',
        title: 'How to preview or view an article on the live consumer website?',
        titleHi: 'Live website ka URL kaise dekhein?',
        shortDesc: '1-Click external preview links for published and draft articles.',
        tags: ['live url', 'preview', 'website link', 'external link', 'view live'],
        summary: 'Click the external link icon next to any article to view it directly on the public domain.',
        summaryHi: 'Blog list ya editor me external link icon par click karke article ko public website domain par dekh sakte hain.',
        steps: [
          {
            step: 1,
            instruction: 'In the Blogs list (/blogs) or Blog Editor, look for the External Link icon (square with arrow)',
          },
          {
            step: 2,
            instruction: 'Click the icon to open the article on its production domain in a new tab',
          },
        ],
        actionLink: {
          label: 'Browse Articles (/blogs)',
          href: '/blogs',
        },
      },
    ],
  },
  {
    id: 'taxonomy-seo',
    title: 'Categories, Tags & 8-Point SEO',
    titleHi: 'कैटेगरी, टैग्स और एसईओ',
    description: 'Category hierarchy, keyword tags, and algorithmic SEO audit score.',
    iconName: 'Tag',
    badgeColor: 'amber',
    questions: [
      {
        id: 'manage-categories-tags',
        title: 'How to create and organize Categories and Tags?',
        titleHi: 'Nayi Category aur Tag kaise banayein?',
        shortDesc: 'Organize articles into website-isolated hierarchical categories and flat tags.',
        tags: ['category', 'tags', 'categories', 'add category', 'add tag', 'organize'],
        summary: 'Categories provide structured folder-like organization while tags act as searchable index keywords.',
        summaryHi: 'Navigation me Categories & Tags (/taxonomy) par click karein aur target website ke liye categories aur tags banayein.',
        steps: [
          {
            step: 1,
            instruction: 'Click "Categories & Tags" (/taxonomy) in the left sidebar',
          },
          {
            step: 2,
            instruction: 'Select the target website from the scope dropdown (categories are strictly website-isolated)',
          },
          {
            step: 3,
            instruction: 'Click "+ Add Category" to create a main topic category',
            detail: 'Provide a clean Title and URL slug.',
          },
          {
            step: 4,
            instruction: 'Click "+ Add Tag" to create reusable keyword labels',
          },
        ],
        actionLink: {
          label: 'Manage Categories & Tags (/taxonomy)',
          href: '/taxonomy',
        },
      },
      {
        id: 'seo-audit-engine',
        title: 'How does the 8-Point Automated SEO Score work?',
        titleHi: '8-Point Automated SEO Score kaise calculate hota hai?',
        shortDesc: 'The 8 algorithmic checks required to achieve a 100/100 SEO rating.',
        tags: ['seo score', '8 point audit', 'ranking', 'keywords', 'meta description'],
        summary: 'The blog studio algorithm evaluates 8 critical ranking parameters in real time.',
        summaryHi: 'Blog Editor me real-time quality score dikhta hai jo 8 SEO parameters check karta hai.',
        steps: [
          {
            step: 1,
            instruction: '1. Title Length: Optimal between 40 and 65 characters.',
          },
          {
            step: 2,
            instruction: '2. Meta Description: Optimal between 120 and 160 characters with clear call-to-action.',
          },
          {
            step: 3,
            instruction: '3. Focus Keyword in Title: Keyword should appear near the beginning of the title.',
          },
          {
            step: 4,
            instruction: '4. Focus Keyword in First Paragraph: Mention focus keyword within the first 100 words.',
          },
          {
            step: 5,
            instruction: '5. Focus Keyword in URL Slug: Clean hyphenated slug containing the keyword.',
          },
          {
            step: 6,
            instruction: '6. Heading Hierarchy: Use H2 and H3 subheadings throughout the body.',
          },
          {
            step: 7,
            instruction: '7. Image Alt Text: Descriptive alt tags on featured image and embedded media.',
          },
          {
            step: 8,
            instruction: '8. Word Count: Minimum 600+ words recommended for authoritative Google search indexing.',
          },
        ],
        actionLink: {
          label: 'Test in Blog Studio (/blogs/new)',
          href: '/blogs/new',
        },
      },
    ],
  },
  {
    id: 'redirects-routing',
    title: '301 Permanent Redirects',
    titleHi: '301 रीडायरेक्ट्स और ब्रोकन लिंक्स',
    description: 'Eliminate 404 errors, route old slugs, and preserve Google SEO rank equity.',
    iconName: 'ArrowRightLeft',
    badgeColor: 'rose',
    questions: [
      {
        id: 'create-301-redirect',
        title: 'When and how to create a 301 Permanent Redirect?',
        titleHi: '301 Redirect kab aur kaise banayein?',
        shortDesc: 'Seamlessly forward visitors and search bots from old URLs to new destinations.',
        tags: ['301 redirect', 'redirect', '404 error', 'route', 'slug change', 'seo ranking'],
        summary: 'Create 301 rules whenever an old URL is replaced so search engine rank authority is fully preserved.',
        summaryHi: 'Jab kisi blog ka URL change ho, to purane link ko naye link par redirect karein taaki 404 error na aaye.',
        steps: [
          {
            step: 1,
            instruction: 'Go to 301 Redirects (/redirects)',
          },
          {
            step: 2,
            instruction: 'Click "+ Add Redirect Rule"',
          },
          {
            step: 3,
            instruction: 'Enter Source Path (e.g. /blogs/old-school-software)',
            detail: 'The old URL that visitors or Google search might still have indexed.',
          },
          {
            step: 4,
            instruction: 'Enter Destination Path (e.g. /blogs/best-school-erp-software)',
            detail: 'The new active URL where visitors should land.',
          },
          {
            step: 5,
            instruction: 'Select the Target Website and click Save Rule',
          },
        ],
        actionLink: {
          label: 'Manage Redirects (/redirects)',
          href: '/redirects',
        },
      },
    ],
  },
  {
    id: 'login-security',
    title: 'Login, Google 1-Click & Security',
    titleHi: 'लॉगिन और सिक्योरिटी',
    description: 'Google OAuth single sign-on, lockout prevention, and password management.',
    iconName: 'Lock',
    badgeColor: 'indigo',
    questions: [
      {
        id: 'google-oauth-login',
        title: 'How does Google 1-Click Sign-In work?',
        titleHi: 'Google 1-Click Sign-In kaise use karein?',
        shortDesc: 'Passwordless corporate login using your company Google account.',
        tags: ['google login', 'oauth', '1-click', 'sign in with google', 'passwordless'],
        summary: 'Sign in effortlessly without entering passwords using your registered Google workspace email.',
        summaryHi: 'Password yaad rakhne ki zaroorat nahi — seedha apne corporate Google account se login karein.',
        steps: [
          {
            step: 1,
            instruction: 'Navigate to the Login page (/login)',
          },
          {
            step: 2,
            instruction: 'Click the "Sign in with Google" button',
          },
          {
            step: 3,
            instruction: 'Choose your Google account in the Google GIS popup',
          },
          {
            step: 4,
            instruction: 'If your email is already registered in the CMS, you are instantly authenticated into the dashboard',
          },
        ],
        proTip: 'For security, Google 1-Click login enforces strict email whitelisting. The email must first be invited by an Administrator on /users before it can sign in.',
        actionLink: {
          label: 'Open Login Page (/login)',
          href: '/login',
        },
      },
      {
        id: 'account-lockout',
        title: 'Why does an account get locked and how to unlock it?',
        titleHi: 'Account Lockout kyu hota hai aur unlock kaise hota hai?',
        shortDesc: 'Brute-force protection rules and 15-minute temporary lockout.',
        tags: ['lockout', 'account locked', 'wrong password', 'unlock', 'security'],
        summary: 'To protect against brute-force attacks, accounts are temporarily locked after 5 consecutive incorrect passwords.',
        summaryHi: 'Security safety feature. 5 lagatar galat password dalne par account 15 minute ke liye lock ho jata hai.',
        steps: [
          {
            step: 1,
            instruction: 'Wait 15 minutes for the lockout window to expire automatically.',
          },
          {
            step: 2,
            instruction: 'Or request a Super Admin to generate a new temporary password from /users.',
          },
        ],
      },
    ],
  },
  {
    id: 'troubleshooting-faq',
    title: 'Troubleshooting & Quick FAQs',
    titleHi: 'अक्सर पूछे जाने वाले सवाल (FAQs)',
    description: 'Instant solutions for common operational queries and unexpected issues.',
    iconName: 'AlertCircle',
    badgeColor: 'red',
    questions: [
      {
        id: 'faq-missing-blogs',
        title: 'Why is a blog not appearing on the public website after publishing?',
        titleHi: 'Website par publish karne ke baad blog kyu nahi dikh raha?',
        shortDesc: 'Verify workflow status, target website selection, and CDN browser cache.',
        tags: ['blog not showing', 'missing blog', 'publish error', 'cache not updating'],
        summary: 'Verify the publication status is set to "Published" and the website scope matches the domain.',
        summaryHi: 'Check karein ki status "Published" hai aur website wahi select hai jo live site hai.',
        steps: [
          {
            step: 1,
            instruction: 'Verify Status is "Published"',
            detail: 'Check if the article is still in "Draft" or "Under Review" on /workflow.',
          },
          {
            step: 2,
            instruction: 'Verify Website Selection',
            detail: 'Ensure the blog was authored under the intended website (e.g. site-cloud vs site-growth).',
          },
          {
            step: 3,
            instruction: 'Perform Hard Browser Refresh',
            detail: 'Press Ctrl + F5 (Windows) or Cmd + Shift + R (Mac) on the public website to bypass device cache.',
          },
        ],
        actionLink: {
          label: 'Check in Workflow (/workflow)',
          href: '/workflow',
        },
      },
      {
        id: 'faq-google-unregistered',
        title: 'Why does Google login show "Account not registered"?',
        titleHi: 'Google login me "Account not registered" popup kyu aata hai?',
        shortDesc: 'Strict security whitelist requires prior administrative invitation.',
        tags: ['google login failed', 'not registered', 'whitelist', 'oauth error'],
        summary: 'The portal enforces a strict security whitelist. Random Google accounts cannot sign in without being invited first.',
        summaryHi: 'Security ke liye anjaan Google accounts allowed nahi hain. Pehle Super Admin se invite karwayein.',
        steps: [
          {
            step: 1,
            instruction: 'Ask a Super Admin to go to /users and invite your Google email address.',
          },
          {
            step: 2,
            instruction: 'Once invited, click "Sign in with Google" again — you will be admitted instantly.',
          },
        ],
        actionLink: {
          label: 'Go to Team Management (/users)',
          href: '/users',
        },
      },
    ],
  },
];
