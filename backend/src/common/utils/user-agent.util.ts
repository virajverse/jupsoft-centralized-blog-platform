/**
 * User-Agent & Device Detection Utility
 * Zero-dependency, lightweight, high-performance parser for session tracking.
 */

export interface ParsedUserAgent {
  browser: string;
  os: string;
  device: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
}

export function parseUserAgent(uaString: string = ''): ParsedUserAgent {
  const ua = uaString.toLowerCase();

  // 1. OS Detection
  let os = 'Unknown OS';
  if (ua.includes('windows nt 10.0')) os = 'Windows 10/11';
  else if (ua.includes('windows nt 6.3')) os = 'Windows 8.1';
  else if (ua.includes('windows nt 6.1')) os = 'Windows 7';
  else if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('iphone')) os = 'iOS (iPhone)';
  else if (ua.includes('ipad')) os = 'iPadOS';
  else if (ua.includes('macintosh') || ua.includes('mac os x')) os = 'macOS';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('cros')) os = 'ChromeOS';
  else if (ua.includes('linux')) os = 'Linux';

  // 2. Browser Detection (order matters: Edge, Chrome, Safari, Firefox, Opera)
  let browser = 'Unknown Browser';
  if (ua.includes('edg/')) {
    const match = uaString.match(/Edg\/([\d.]+)/);
    browser = `Edge ${match ? match[1].split('.')[0] : ''}`.trim();
  } else if (ua.includes('opr/') || ua.includes('opera')) {
    browser = 'Opera';
  } else if (ua.includes('chrome/') && !ua.includes('edg/')) {
    const match = uaString.match(/Chrome\/([\d.]+)/);
    browser = `Chrome ${match ? match[1].split('.')[0] : ''}`.trim();
  } else if (ua.includes('safari/') && !ua.includes('chrome/')) {
    browser = 'Safari';
  } else if (ua.includes('firefox/')) {
    const match = uaString.match(/Firefox\/([\d.]+)/);
    browser = `Firefox ${match ? match[1].split('.')[0] : ''}`.trim();
  }

  // 3. Device & Device Type
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  let device = 'Desktop PC';

  if (ua.includes('ipad') || (ua.includes('tablet') && !ua.includes('mobile'))) {
    deviceType = 'tablet';
    device = 'Tablet Device';
  } else if (ua.includes('iphone')) {
    deviceType = 'mobile';
    device = 'Apple iPhone';
  } else if (ua.includes('android') && ua.includes('mobile')) {
    deviceType = 'mobile';
    device = 'Android Phone';
  } else if (ua.includes('mobile')) {
    deviceType = 'mobile';
    device = 'Mobile Device';
  } else if (os.includes('macOS')) {
    device = 'Apple Mac';
  } else if (os.includes('Windows')) {
    device = 'Windows PC';
  } else if (os.includes('Linux')) {
    device = 'Linux Workstation';
  }

  return { browser, os, device, deviceType };
}
