/**
 * Zero-Dependency Multi-Site Test Server
 * Hosts 3 lightweight client websites on ports 5001, 5002, 5003
 * Conforming to TRD §13 Hybrid Architecture & HMAC Webhook Revalidation
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const WEBHOOK_SECRET = process.env.WEBHOOK_DEFAULT_SECRET || 'wh_sec_jupsoft_default_revalidate_2026';

const SITES = [
  {
    port: 5001,
    id: 'site-cloud',
    name: 'Jupsoft Cloud & ERP',
    dir: path.join(__dirname, 'site1-cloud'),
  },
  {
    port: 5002,
    id: 'site-growth',
    name: 'DigifyNext Growth & Marketing',
    dir: path.join(__dirname, 'site2-growth'),
  },
  {
    port: 5003,
    id: 'site-edtech',
    name: 'School ERP Platform',
    dir: path.join(__dirname, 'site3-edtech'),
  },
];

// Helper to update database revalidateWebhookUrls to local ports for seamless testing
async function syncDatabaseWebhooks() {
  try {
    const backendDir = path.join(__dirname, '..', 'backend');
    const { PrismaClient } = require(path.join(backendDir, 'node_modules/@prisma/client'));
    const prisma = new PrismaClient();
    
    for (const site of SITES) {
      const webhookUrl = `http://localhost:${site.port}/api/revalidate`;
      await prisma.website.updateMany({
        where: { id: site.id },
        data: { revalidateWebhookUrl: webhookUrl },
      });
      console.log(`🔗 [DB SYNC] ${site.name} (${site.id}) webhook updated -> ${webhookUrl}`);
    }
    await prisma.$disconnect();
  } catch (err) {
    console.warn('⚠️ Could not sync DB webhook URLs automatically (backend might be using separate prisma):', err.message);
  }
}

// Start individual site server
function createSiteServer(site) {
  const sseClients = new Set();

  const server = http.createServer((req, res) => {
    // CORS headers for local integration
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-signature, x-timestamp, User-Agent');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://localhost:${site.port}`);

    // 1. Webhook Revalidation Endpoint (TRD §13)
    if (url.pathname === '/api/revalidate' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        const signature = req.headers['x-signature'];
        const timestamp = req.headers['x-timestamp'];

        console.log(`\n⚡ [${site.name} :${site.port}] Webhook received!`);
        console.log(`   Headers: x-signature=${signature || 'none'}, x-timestamp=${timestamp || 'none'}`);
        console.log(`   Payload: ${body}`);

        let verified = false;
        if (signature && WEBHOOK_SECRET) {
          const expectedSig = 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
          const sigBuf = Buffer.from(signature, 'utf8');
          const expBuf = Buffer.from(expectedSig, 'utf8');
          const isSignatureValid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
          
          // TRD §15: Replay attack guard - verify payload timestamp is within 5 minutes
          const parsedTime = timestamp ? parseInt(timestamp, 10) : NaN;
          const isFresh = !isNaN(parsedTime) ? Math.abs(Date.now() - parsedTime) <= 5 * 60 * 1000 : true;

          verified = isSignatureValid && isFresh;
          console.log(`   HMAC Verification: ${verified ? '✅ VALID (Signature Match & Fresh)' : '⚠️ INVALID'}`);
          if (!isFresh) {
            console.log(`   ⚠️ Webhook rejected: Stale timestamp (${Math.round(Math.abs(Date.now() - parsedTime) / 1000)}s old > 300s)`);
          }
        }

        let parsed = {};
        try { parsed = JSON.parse(body); } catch (e) {}

        // Notify connected browser clients via SSE
        const eventData = JSON.stringify({
          event: parsed.event || 'blog.revalidate',
          slug: parsed.slug || '',
          timestamp: Date.now(),
          verified,
        });

        for (const client of sseClients) {
          client.write(`data: ${eventData}\n\n`);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          revalidated: true,
          site: site.id,
          verified,
          timestamp: Date.now(),
        }));
      });
      return;
    }

    // 2. Server-Sent Events (SSE) Stream for Live Browser Updates
    if (url.pathname === '/api/events' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      res.write(': connected\n\n');
      sseClients.add(res);

      req.on('close', () => {
        sseClients.delete(res);
      });
      return;
    }

    // 3. Static Assets & SPA Routing
    const MIME_TYPES = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    };

    let targetPath = path.join(site.dir, url.pathname);
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
      targetPath = path.join(targetPath, 'index.html');
    }

    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
      const ext = path.extname(targetPath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      fs.readFile(targetPath, (err, content) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content);
        }
      });
    } else {
      // SPA Fallback: serve index.html for client-side routing
      const indexPath = path.join(site.dir, 'index.html');
      fs.readFile(indexPath, (err, content) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
        }
      });
    }
  });

  server.listen(site.port, '0.0.0.0', () => {
    console.log(`🌐 [Site ${site.port}] ${site.name} is running at: http://localhost:${site.port}`);
  });

  return server;
}

// Start all 3 site servers
async function main() {
  console.log('================================================================');
  console.log('🚀 STARTING 3 CLIENT TESTING WEBSITES (TRD §13 HYBRID INTEGRATION)');
  console.log('================================================================\n');

  await syncDatabaseWebhooks();

  SITES.forEach(createSiteServer);

  console.log('\n================================================================');
  console.log('✅ ALL 3 TESTING WEBSITES ARE LIVE:');
  console.log('   1. Cloud ERP:  http://localhost:5001');
  console.log('   2. Growth:     http://localhost:5002');
  console.log('   3. School ERP: http://localhost:5003');
  console.log('================================================================\n');
}

main();
