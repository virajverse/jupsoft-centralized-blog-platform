const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Checking Prerequisites for site-qmsmodeltown ---');
  
  const website = await prisma.website.findUnique({
    where: { id: 'site-qmsmodeltown' }
  });
  
  if (!website) {
    throw new Error('Website site-qmsmodeltown not found in database!');
  }
  console.log(`Found website: ${website.name} (${website.id})`);

  let adminUser = await prisma.user.findFirst({
    where: { email: 'admin@jupsoft.com' }
  });

  if (!adminUser) {
    adminUser = await prisma.user.findFirst();
  }

  const authorId = adminUser ? adminUser.id : null;
  console.log(`Using Author: ${adminUser ? adminUser.name : 'System'} (${authorId})`);

  // Ensure Categories
  const categoriesData = [
    {
      id: 'cat-qms-holistic',
      websiteId: 'site-qmsmodeltown',
      name: 'Holistic Education',
      slug: 'holistic-education',
      description: 'Nurturing intellectual, emotional, and ethical growth in young women.'
    },
    {
      id: 'cat-qms-innovation',
      websiteId: 'site-qmsmodeltown',
      name: 'Academics & Innovation',
      slug: 'academics-innovation',
      description: 'Scientific inquiry, modern pedagogy, and classroom innovations.'
    }
  ];

  for (const cat of categoriesData) {
    await prisma.category.upsert({
      where: {
        websiteId_slug: {
          websiteId: cat.websiteId,
          slug: cat.slug
        }
      },
      update: {
        name: cat.name,
        description: cat.description
      },
      create: cat
    });
    console.log(`Category ready: ${cat.name} (${cat.slug})`);
  }

  // Define 2 High Quality Sample Blogs
  const blogsToCreate = [
    {
      blogId: 'blog-qms-001',
      title: 'Empowering Young Women: The Importance of Holistic Education in Today\'s World',
      slug: 'empowering-young-women-holistic-education',
      categoryId: 'cat-qms-holistic',
      publishDate: new Date('2024-04-10T10:00:00.000Z'),
      readTime: 4,
      featuredImage: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1200&q=80',
      featuredImageAlt: 'Empowering young women through holistic education and leadership',
      excerpt: 'Holistic education goes far beyond textbooks to nurture emotional intelligence, leadership, ethical values, and resilience, preparing young women to lead and inspire in an ever-evolving world.',
      content: `<p class="lead">In an era characterized by rapid technological advancement and socio-economic transformation, the definition of education has expanded substantially beyond textbook memorization. At Queen Mary's School, Northend, we believe that education must nurture the mind, body, and spirit in equal measure.</p>
<h2>The Core Dimensions of Holistic Development</h2>
<p>True education is multifaceted. It acknowledges that every young learner possesses unique talents, aspirations, and perspectives. When schools cultivate holistic learning environments, students evolve from passive recipients of knowledge into active, compassionate leaders.</p>
<h3>1. Intellectual Rigor and Critical Thinking</h3>
<p>Academic excellence remains the foundation. However, intellectual rigor in a modern classroom means teaching students how to think rather than what to think. By encouraging inquiry, debates, and analytical problem-solving, young women learn to evaluate diverse viewpoints and make sound judgments.</p>
<blockquote>
  "Education is not merely the accumulation of facts; it is the ignition of an inner flame that guides students toward truth, integrity, and impactful leadership."
</blockquote>
<h3>2. Emotional Intelligence and Empathy</h3>
<p>Academic acumen without emotional maturity is incomplete. Developing empathy, self-awareness, and relational intelligence enables students to navigate complex interpersonal dynamics. Our guidance programs and collaborative classroom projects foster mutual respect, inclusivity, and emotional resilience.</p>
<h3>3. Co-Curricular Excellence and Character Building</h3>
<p>Character is forged on the sports field, the stage, and through community service. A well-rounded education integrates:</p>
<ul>
  <li><strong>Performing Arts & Public Speaking:</strong> Building self-expression, stage presence, and confidence.</li>
  <li><strong>Sports & Physical Well-being:</strong> Instilling discipline, sportsmanship, and teamwork.</li>
  <li><strong>Social Initiatives & Outreach:</strong> Instilling civic duty and compassion toward the broader community.</li>
</ul>
<h2>Preparing Tomorrow's Trailblazers</h2>
<p>As our students step out into the world, their holistic grounding equips them to break glass ceilings with grace and confidence. By championing both academic brilliance and human values, we ensure that our students leave an enduring positive imprint on society.</p>`
    },
    {
      blogId: 'blog-qms-002',
      title: 'Cultivating Scientific Curiosity and Creative Innovation in the Modern Classroom',
      slug: 'cultivating-scientific-curiosity-creative-innovation',
      categoryId: 'cat-qms-innovation',
      publishDate: new Date('2024-03-15T10:00:00.000Z'),
      readTime: 5,
      featuredImage: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80',
      featuredImageAlt: 'Students exploring scientific experiments in modern laboratory',
      excerpt: 'Discover how experiential learning, modern STEM laboratories, and interactive inquiry nurture young minds to question, experiment, and engineer real-world solutions.',
      content: `<p class="lead">Curiosity is the engine of intellectual growth. From questioning the mysteries of the cosmos to finding sustainable solutions for everyday challenges, fostering scientific inquiry within young learners is crucial for cultivating tomorrow's innovators.</p>
<h2>Experiential Learning: Moving Beyond Rote Memorization</h2>
<p>Hands-on discovery changes everything. When students touch, measure, synthesize, and observe scientific phenomena directly, abstract theories transform into concrete understanding. At Queen Mary's School, our laboratories and interactive STEM sessions empower students to test hypotheses and embrace discovery.</p>
<h3>The Power of Inquiry-Based Pedagogy</h3>
<p>Instead of providing direct answers, our educators present intriguing problems. Why does a specific chemical reaction produce luminescence? How can aerodynamic design reduce drag? When students arrive at solutions through guided experimentation, their cognitive retention and enthusiasm skyrocket.</p>
<blockquote>
  "The greatest scientists are not those who have all the answers, but those who are unafraid to ask the most daring questions."
</blockquote>
<h3>Interdisciplinary STEM & Creative Problem Solving</h3>
<p>Modern science does not exist in a silo. Mathematics, physics, digital technology, and creative design converge to produce elegant engineering solutions. Key pillars of our innovative curriculum include:</p>
<ul>
  <li><strong>Robotics & Coding:</strong> Introducing computational logic and algorithmic thinking early.</li>
  <li><strong>Environmental Science:</strong> Engaging students in real-world sustainability projects and ecological audits.</li>
  <li><strong>Research & Science Exhibitions:</strong> Encouraging independent research, peer reviews, and interactive demonstrations.</li>
</ul>
<h2>Inspiring the Next Generation of Innovators</h2>
<p>By empowering young women to immerse themselves fearlessly in science, technology, engineering, and mathematics, we are dismantling historical barriers and shaping a future where women lead global breakthroughs. Scientific curiosity is not just an academic discipline—it is a lifelong pursuit of truth and progress.</p>`
    }
  ];

  for (const b of blogsToCreate) {
    // Check if blog already exists by translation slug
    const existingTranslation = await prisma.blogTranslation.findFirst({
      where: {
        slug: b.slug,
        blog: { websiteId: 'site-qmsmodeltown' }
      },
      include: { blog: true }
    });

    let blogRecord;
    if (existingTranslation && existingTranslation.blog) {
      console.log(`Updating existing blog [${b.slug}]...`);
      blogRecord = await prisma.blog.update({
        where: { id: existingTranslation.blog.id },
        data: {
          authorId: authorId,
          authorName: "Queen Mary's Editorial Desk",
          featuredImage: b.featuredImage,
          featuredImageAlt: b.featuredImageAlt,
          status: 'Published',
          publishDate: b.publishDate,
          readTimeMinutes: b.readTime,
          categoryIds: [b.categoryId]
        }
      });

      await prisma.blogTranslation.update({
        where: { id: existingTranslation.id },
        data: {
          title: b.title,
          excerpt: b.excerpt,
          content: b.content,
          metaTitle: `${b.title} | Queen Mary's School, Northend`,
          metaDescription: b.excerpt,
          ogTitle: b.title,
          ogDescription: b.excerpt,
          ogImage: b.featuredImage,
          twitterTitle: b.title,
          twitterDescription: b.excerpt,
          twitterImage: b.featuredImage
        }
      });
    } else {
      console.log(`Creating new blog [${b.slug}]...`);
      blogRecord = await prisma.blog.create({
        data: {
          id: b.blogId,
          websiteId: 'site-qmsmodeltown',
          authorId: authorId,
          authorName: "Queen Mary's Editorial Desk",
          featuredImage: b.featuredImage,
          featuredImageAlt: b.featuredImageAlt,
          status: 'Published',
          publishDate: b.publishDate,
          readTimeMinutes: b.readTime,
          categoryIds: [b.categoryId],
          translations: {
            create: {
              lang: 'en',
              title: b.title,
              slug: b.slug,
              excerpt: b.excerpt,
              content: b.content,
              metaTitle: `${b.title} | Queen Mary's School, Northend`,
              metaDescription: b.excerpt,
              ogTitle: b.title,
              ogDescription: b.excerpt,
              ogImage: b.featuredImage,
              twitterTitle: b.title,
              twitterDescription: b.excerpt,
              twitterImage: b.featuredImage
            }
          }
        }
      });

      // Also create join table entry
      await prisma.blogCategory.upsert({
        where: {
          blogId_categoryId: {
            blogId: blogRecord.id,
            categoryId: b.categoryId
          }
        },
        update: {},
        create: {
          blogId: blogRecord.id,
          categoryId: b.categoryId
        }
      });
    }

    console.log(`✅ Blog Ready: ${b.title} (${b.slug})`);
  }

  // Update category counts
  for (const cat of categoriesData) {
    const count = await prisma.blogCategory.count({
      where: {
        categoryId: cat.id,
        blog: { status: 'Published' }
      }
    });
    await prisma.category.update({
      where: { id: cat.id },
      data: { count }
    });
    console.log(`Updated category [${cat.name}] count to ${count}`);
  }

  console.log('--- All QMS Blogs & Categories Successfully Created / Synchronized! ---');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error inserting sample blogs:', err);
  process.exit(1);
});
