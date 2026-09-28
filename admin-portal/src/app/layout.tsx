import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jupsoft Blog Engine | Centralized Multi-Site CMS",
  description: "Enterprise multi-tenant blog authoring, live SEO auditor, and editorial workflow management portal for Jupsoft Systems",
  icons: {
    icon: [
      { url: "/logomobileapp.png?v=2", type: "image/png" },
      { url: "/favicon.png?v=2", type: "image/png" },
      { url: "/favicon.ico?v=2", type: "image/x-icon" },
    ],
    shortcut: "/logomobileapp.png?v=2",
    apple: "/logomobileapp.png?v=2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/logomobileapp.png?v=2" type="image/png" />
        <link rel="icon" href="/favicon.png?v=2" type="image/png" />
        <link rel="shortcut icon" href="/logomobileapp.png?v=2" />
        <link rel="apple-touch-icon" href="/logomobileapp.png?v=2" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem('blog-storage');
                if (stored) {
                  const parsed = JSON.parse(stored);
                  if (parsed.state?.theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body 
        className="h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 font-sans relative flex flex-col"
        suppressHydrationWarning
      >
        <div className="relative z-10 h-full w-full flex flex-col overflow-hidden">{children}</div>
      </body>
    </html>
  );
}
