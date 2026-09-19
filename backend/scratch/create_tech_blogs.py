import sys
import time

if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

sys.path.append(r'D:\Company work\jupsoft-centralized-blog-platform\jupsoft-cms-mcp\src')
from jupsoft_cms.service import JupsoftCMSService

svc = JupsoftCMSService()
website_id = "site-hgello"

print("=============================================================")
print(f"🚀 Publishing 5 Latest Tech Blogs for Tenant: {website_id}")
print("=============================================================")

# 1. Ensure Categories
categories = {
    "Artificial Intelligence": "artificial-intelligence",
    "Web Engineering": "web-engineering",
    "Cloud & DevOps": "cloud-devops",
    "Cybersecurity": "cybersecurity",
}

cat_map = {}
existing_cats = svc.list_categories(website_id).get("data", [])
for c in existing_cats:
    cat_map[c["name"]] = c["id"]

for name, slug in categories.items():
    if name not in cat_map:
        res = svc.create_category(website_id, name, slug, f"Insights and architecture on {name}")
        if res.get("success") and res.get("data"):
            cat_map[name] = res["data"]["id"]
            print(f"  ✔ Created category: {name}")
    else:
        print(f"  ✔ Existing category found: {name}")

# 2. Blog Definitions
blogs = [
    {
        "title": "The Rise of Autonomous AI Agents in Modern Software Engineering",
        "category": "Artificial Intelligence",
        "excerpt": "Explore how LLM-based autonomous coding agents, Model Context Protocol (MCP), and multi-agent loops are transforming full-stack software development in 2026.",
        "focus_keyword": "Autonomous AI Agents",
        "meta_title": "The Rise of Autonomous AI Agents in Software Engineering",
        "meta_description": "Explore how LLM-based autonomous coding agents, MCP protocol, and multi-agent coordination frameworks are transforming full-stack engineering in 2026.",
        "featured_image": "/uploads/blogs/default-blog-cover.webp",
        "featured_image_alt": "Autonomous AI Coding Agents Visualization",
        "content": """
<p class="lead">Software engineering is experiencing its most radical paradigm shift since the emergence of cloud computing. In 2026, development teams are moving away from simple autocomplete assistants toward <strong>fully autonomous AI agents</strong> capable of reasoning, planning, executing shell commands, and debugging production regressions autonomously.</p>

<h2>1. What Makes an AI Agent "Autonomous"?</h2>
<p>Unlike traditional LLM chatbots that simply output conversational markdown, autonomous agents operate in an iterative <em>Observe-Plan-Act-Verify</em> loop:</p>
<ul>
  <li><strong>Environmental Awareness:</strong> Agents ingest codebase ASTs, directory trees, runtime logs, and lint errors directly via the Model Context Protocol (MCP).</li>
  <li><strong>Tool Execution:</strong> They manipulate the filesystem, execute automated test suites, and deploy serverless functions without human intervention.</li>
  <li><strong>Self-Correction:</strong> When a build error or failed test occurs, the agent introspects the stack trace, adjusts its plan, and refactors the code until green.</li>
</ul>

<h2>2. The Breakthrough of Model Context Protocol (MCP)</h2>
<p>Developed to standardize how AI models interface with local tools and enterprise databases, MCP has eliminated proprietary plugin silos. Development environments can now safely expose microservice APIs, database poolers, and telemetry streams through secure JSON-RPC socket protocols.</p>

<pre><code class="language-typescript">
// Example: Autonomous Agent executing dynamic tool invocation
async function executeAgenticLoop(prompt: string) {
  const context = await mcp.fetchContext({ workspace: "production" });
  const plan = await planner.generate(prompt, context);
  
  for (const step of plan.steps) {
    const result = await tools.execute(step.action, step.params);
    if (!result.ok) {
      await agent.diagnoseAndFix(result.error);
    }
  }
}
</code></pre>

<h2>3. Human-in-the-Loop vs Fully Autonomous Pipelines</h2>
<p>While autonomous agents handle boilerplate CRUD generation, dependency security patching, and test suite expansion, human engineers focus on high-leverage architectural topology and product intuition. The future of programming is not typing code—it is directing intelligent agent swarms.</p>
"""
    },
    {
        "title": "Next.js 15 App Router & React 19: High-Scale Architecture",
        "category": "Web Engineering",
        "excerpt": "A deep architectural guide to React 19 Server Components, Partial Prerendering (PPR), streaming SSR, and zero-latency ISR cache revalidation patterns.",
        "focus_keyword": "Next.js 15 App Router Architecture",
        "meta_title": "Next.js 15 App Router & React 19: High-Scale Architecture",
        "meta_description": "Master React 19 Server Components, streaming SSR, Partial Prerendering (PPR), and zero-latency on-demand ISR cache revalidation in Next.js 15.",
        "featured_image": "/uploads/blogs/default-blog-cover.webp",
        "featured_image_alt": "Next.js 15 Architecture Diagram",
        "content": """
<p class="lead">Building modern web applications at enterprise scale requires ruthless optimization of Time to First Byte (TTFB) and First Contentful Paint (FCP). With Next.js 15 and React 19 now mainstream, engineering teams have unlocked unprecedented rendering velocity.</p>

<h2>1. React 19 Server Components (RSC) Paradigm</h2>
<p>React Server Components shift component execution completely to the server side, resulting in:</p>
<ol>
  <li><strong>Zero Client-Side JavaScript:</strong> Components that fetch data and render static content send pure HTML to the client without hydrating bundle weight.</li>
  <li><strong>Direct Database Access:</strong> Server components can query PostgreSQL, Redis, or Prisma directly without building intermediate REST API endpoints.</li>
  <li><strong>Automatic Code Splitting:</strong> Dependencies imported inside server components are never shipped to the visitor's browser.</li>
</ol>

<h2>2. Partial Prerendering (PPR)</h2>
<p>Partial Prerendering combines the instant delivery of static edge caching with the personalized dynamic capabilities of server rendering. The static shell (navigation, header, footer) is served in under 10 milliseconds, while dynamic personalization streams into suspended boundaries.</p>

<h2>3. On-Demand ISR & HMAC Webhooks</h2>
<p>Incremental Static Regeneration (ISR) ensures pages remain statically cached until remote CMS webhooks trigger targeted cache tag invalidation:</p>

<pre><code class="language-typescript">
// app/api/revalidate/route.ts
import { revalidateTag } from 'next/cache';
import { jupsoft } from '@jupsoft/next-blog/webhook';

export { POST } from '@jupsoft/next-blog/webhook';
</code></pre>
<p>Whenever a blog post or product is updated in the CMS, remote cache tags like <code>revalidateTag('blogs')</code> purge stale memory caches worldwide in less than 50 milliseconds.</p>
"""
    },
    {
        "title": "Kubernetes & Edge Computing: Zero-Downtime Microservices",
        "category": "Cloud & DevOps",
        "excerpt": "How modern DevOps teams deploy distributed microservices across global edge clusters with sub-10ms response times and automated self-healing failover.",
        "focus_keyword": "Kubernetes Edge Computing Microservices",
        "meta_title": "Kubernetes & Edge Computing: Zero-Downtime Microservices",
        "meta_description": "Learn how modern cloud architects deploy distributed microservices across edge clusters with automated failover and sub-10ms global latency.",
        "featured_image": "/uploads/blogs/default-blog-cover.webp",
        "featured_image_alt": "Kubernetes Edge Computing Cluster",
        "content": """
<p class="lead">Centralized monolithic data centers are no longer sufficient for real-time applications requiring instant responsiveness. Modern infrastructure teams are utilizing Kubernetes clusters deployed directly to the edge to eliminate latency bottlenecks.</p>

<h2>1. The Shift to Edge Kubernetes (K3s & MicroK8s)</h2>
<p>By running lightweight Kubernetes distributions closer to regional users, organizations achieve:</p>
<ul>
  <li><strong>Ultra-Low Latency:</strong> Traffic is handled within regional PoPs (Points of Presence) without traversing trans-continental fiber routes.</li>
  <li><strong>Local Data Compliance:</strong> Adherence to stringent data sovereignty regulations (GDPR, DPDP) by keeping sensitive customer data inside local geographic boundaries.</li>
  <li><strong>Offline Survivability:</strong> Edge pods continue executing critical business logic even during centralized WAN disconnects.</li>
</ul>

<h2>2. Canary Deployments & Automated Rollbacks</h2>
<p>Using service mesh technologies like Istio and Linkerd, new application versions are rolled out progressively:</p>

<pre><code class="language-yaml">
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: microservice-api
spec:
  replicas: 10
  strategy:
    canary:
      steps:
      - setWeight: 10
      - pause: { duration: 5m }
      - setWeight: 50
      - pause: { duration: 10m }
</code></pre>
<p>If error rates exceed 0.1% or p99 latency spikes during the canary window, traffic immediately routes back to stable pods with zero downtime observed by end users.</p>
"""
    },
    {
        "title": "Post-Quantum Cryptography & Zero Trust: Securing APIs in 2026",
        "category": "Cybersecurity",
        "excerpt": "As quantum computing advances, enterprise engineering teams must transition to post-quantum cryptographic standards and strict zero-trust API architecture.",
        "focus_keyword": "Post-Quantum Cryptography Zero Trust",
        "meta_title": "Post-Quantum Cryptography & Zero Trust: Securing APIs in 2026",
        "meta_description": "Understand the transition to post-quantum cryptography (PQC) and how Zero Trust API gateways prevent modern adversary breaches.",
        "featured_image": "/uploads/blogs/default-blog-cover.webp",
        "featured_image_alt": "Quantum Cryptography and API Security",
        "content": """
<p class="lead">The looming emergence of cryptographically relevant quantum computers poses an existential threat to classical public-key cryptography (RSA and ECC). Security teams are actively migrating to lattice-based Post-Quantum Cryptography (PQC) and Zero Trust architecture.</p>

<h2>1. The "Harvest Now, Decrypt Later" Threat</h2>
<p>Malicious actors are currently intercepting and archiving encrypted enterprise network traffic. When quantum hardware reaches practical scale, this encrypted data will be retroactively deciphered unless organizations migrate to quantum-resistant encryption algorithms today.</p>

<h2>2. NIST Post-Quantum Standards in Production</h2>
<p>Key standards endorsed by NIST are being rolled out across production TLS ciphers:</p>
<ul>
  <li><strong>ML-KEM (CRYSTALS-Kyber):</strong> General encryption and key encapsulation mechanism.</li>
  <li><strong>ML-DSA (CRYSTALS-Dilithium):</strong> Primary digital signature standard for identity verification and token signing.</li>
  <li><strong>SLH-DSA (SPHINCS+):</strong> Stateless hash-based digital signature backup.</li>
</ul>

<h2>3. Zero Trust API Principles</h2>
<p>Perimeter defenses are obsolete. Under Zero Trust, every microservice call must verify:</p>
<ol>
  <li><strong>Explicit Verification:</strong> Mutual TLS (mTLS) with ephemeral cryptographic certificates.</li>
  <li><strong>Least Privilege Access:</strong> Fine-grained OAuth 2.1 scopes evaluated on every single transaction.</li>
  <li><strong>Assume Breach:</strong> End-to-end cryptographic payload signing (such as HMAC SHA-256 webhook signatures) to prevent man-in-the-middle tampering.</li>
</ol>
"""
    },
    {
        "title": "Vector Databases & Graph RAG: Eliminating LLM Hallucinations",
        "category": "Artificial Intelligence",
        "excerpt": "Moving beyond naive vector search: How knowledge graphs combined with dense vector retrieval are powering hyper-accurate enterprise question answering.",
        "focus_keyword": "Graph RAG Vector Databases",
        "meta_title": "Vector Databases & Graph RAG: Eliminating LLM Hallucinations",
        "meta_description": "Discover how Graph RAG and hybrid vector databases eliminate hallucinations and deliver verified enterprise retrieval-augmented generation.",
        "featured_image": "/uploads/blogs/default-blog-cover.webp",
        "featured_image_alt": "Graph RAG and Knowledge Graph Retrieval",
        "content": """
<p class="lead">Retrieval-Augmented Generation (RAG) is the foundational architecture for enterprise AI. However, naive top-k cosine vector similarity often fails on complex multi-hop queries. The industry standard has evolved to <strong>Graph RAG</strong>.</p>

<h2>1. Limitations of Naive Vector Search</h2>
<p>Traditional vector embeddings compress semantic meaning into dense mathematical vectors. While effective for simple keyword matching, they lose structured relationships, temporal hierarchies, and explicit entity connections spanning multiple documents.</p>

<h2>2. How Graph RAG Bridges the Gap</h2>
<p>Graph RAG constructs an interconnected knowledge graph from unstructured enterprise corpora:</p>
<ul>
  <li><strong>Entity Extraction:</strong> Nodes represent people, services, APIs, and business entities.</li>
  <li><strong>Relationship Mapping:</strong> Edges define typed connections (e.g., <em>`DEPENDS_ON`</em>, <em>`PUBLISHED_BY`</em>, <em>`AUTHENTICATES_VIA`</em>).</li>
  <li><strong>Community Summarization:</strong> Hierarchical graph clustering summarizes macro-themes across thousands of documents.</li>
</ul>

<pre><code class="language-python">
# Conceptual Graph RAG retrieval pipeline
def query_graph_rag(user_prompt: str):
    dense_matches = vector_db.similarity_search(user_prompt, k=5)
    graph_entities = knowledge_graph.extract_entities(user_prompt)
    subgraph = knowledge_graph.traverse_neighbors(graph_entities, depth=2)
    
    combined_context = fuse_context(dense_matches, subgraph)
    return llm.generate_response(user_prompt, context=combined_context)
</code></pre>

<h2>3. Production Results</h2>
<p>Enterprises implementing hybrid Graph RAG report an 85% reduction in hallucination rates and a 4x improvement in complex relational query accuracy compared to traditional vector-only pipelines.</p>
"""
    }
]

# 3. Create, Submit, Approve, and Publish
published_count = 0
for idx, b in enumerate(blogs, 1):
    print(f"\n[{idx}/5] Processing: \"{b['title']}\"")
    cat_id = cat_map.get(b["category"])
    cat_ids = [cat_id] if cat_id else []

    # Step 1: Create Blog Draft
    res = svc.create_blog(
        website_id=website_id,
        title=b["title"],
        content=b["content"],
        excerpt=b["excerpt"],
        featured_image=b["featured_image"],
        featured_image_alt=b["featured_image_alt"],
        category_ids=cat_ids,
        meta_title=b["meta_title"],
        meta_description=b["meta_description"],
        focus_keyword=b["focus_keyword"],
    )

    if not res.get("success") or not res.get("data"):
        print(f"  ❌ Failed to create draft: {res}")
        continue

    blog_id = res["data"]["id"]
    print(f"  ✔ Draft Created (ID: {blog_id})")

    # Step 2: Submit for Review
    sub_res = svc.submit_blog_for_review(blog_id, notes="Ready for editorial approval")
    if not sub_res.get("success"):
        print(f"  ⚠️ Submit note: {sub_res.get('message')}")

    # Step 3: Approve Blog
    app_res = svc.approve_blog(blog_id, notes="Approved for publication")
    if not app_res.get("success"):
        print(f"  ⚠️ Approve note: {app_res.get('message')}")

    # Step 4: Publish Blog (Triggers Webhook!)
    pub_res = svc.publish_blog(blog_id, notes="Published live via MCP Super Admin Suite")
    if pub_res.get("success"):
        print(f"  🎉 PUBLISHED LIVE & DISPATCHED WEBHOOK!")
        published_count += 1
    else:
        print(f"  ❌ Publish failed: {pub_res}")

    time.sleep(1)

print("\n=============================================================")
print(f"✅ COMPLETED! Published {published_count}/5 blogs successfully.")
print("=============================================================\n")
