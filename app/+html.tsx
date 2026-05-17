import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * This file is web-only and used to configure the root HTML for every web page during static rendering.
 * The contents of this function only run in Node.js environments and do not have access to the DOM or browser APIs.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: `
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@400;500;700;900&display=swap');
          body {
            background-color: #0F172A;
            font-family: "Google Sans", "Noto Sans Hebrew", system-ui, -apple-system, sans-serif;
            color: #FFFFFF;
          }
          /* Hide scrollbar for a cleaner look but keep functionality */
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          ::-webkit-scrollbar-track {
            background: #0F172A;
          }
          ::-webkit-scrollbar-thumb {
            background: #0056DB;
            border-radius: 4px;
          }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
