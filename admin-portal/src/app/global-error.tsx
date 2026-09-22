'use client';

import React from 'react';

export default function GlobalRootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#090d16', color: '#f8fafc' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ maxWidth: '420px', width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '1rem', padding: '2rem', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem', background: '#f59e0b20', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', fontSize: '24px' }}>
              ⚠️
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem' }}>System Initialization Shield</h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5, margin: '0 0 1.5rem' }}>
              A system root event was intercepted. Click below to re-initialize your workspace.
            </p>
            <button
              onClick={() => reset()}
              style={{
                background: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.5rem',
                padding: '0.65rem 1.25rem',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Reload &amp; Re-initialize
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
