import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jupsoft Blog Engine | Centralized Multi-Site CMS",
  description: "Enterprise multi-tenant blog authoring, live SEO auditor, and editorial workflow management portal for Jupsoft Systems",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/jupsoft-icon.png",
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
      className={`${jakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
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
