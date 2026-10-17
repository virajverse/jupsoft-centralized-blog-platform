const fs = require('fs');
const path = require('path');

/**
 * Universal Zero-Dependency .env parser for PM2 ecosystem
 * Ensures backend and admin services always boot with full environment configuration,
 * even when PM2 is launched directly from CLI without pre-exported shell variables.
 */
function parseEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (match) {
        let val = match[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[match[1]] = val;
      }
    }
  } catch (err) {
    console.warn(`[PM2 ecosystem] Warning reading ${filePath}: ${err.message}`);
  }
  return env;
}

const rootEnv = parseEnvFile(path.join(__dirname, '.env'));
const backendEnv = parseEnvFile(path.join(__dirname, 'backend', '.env'));
const adminEnv = parseEnvFile(path.join(__dirname, 'admin-portal', '.env'));

// Master combined environment variables
const sharedEnv = { ...rootEnv, ...backendEnv, ...adminEnv };

module.exports = {
  apps: [
    {
      name: 'blogary-backend',
      cwd: './backend',
      script: 'dist/src/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      kill_timeout: 6000,
      exp_backoff_restart_delay: 2000,
      env: {
        ...sharedEnv,
        NODE_ENV: 'production',
        PORT: 4010,
      },
    },
    {
      name: 'blogary-admin',
      cwd: './admin-portal',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      kill_timeout: 6000,
      exp_backoff_restart_delay: 2000,
      env: {
        ...sharedEnv,
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
