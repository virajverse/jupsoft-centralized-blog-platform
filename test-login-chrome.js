const puppeteer = require('puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function test() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('Navigating to http://localhost:3000/login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
  
  console.log('Typing email and password...');
  await page.type('input[type="email"]', 'admin@jupsoft.com');
  await page.type('input[type="password"]', 'Admin@12345');
  
  console.log('Clicking Submit button...');
  await page.click('button[type="submit"]');
  
  await new Promise(r => setTimeout(r, 4000));
  console.log('Final URL after login:', page.url());
  const cookies = await page.cookies();
  console.log('Cookies after login:', cookies.map(c => c.name + '=' + c.value.substring(0, 15) + '...'));
  
  await browser.close();
}

test().catch(console.error);
