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
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: `
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@400;500;700;900&display=swap');
          *, *::before, *::after {
            box-sizing: border-box;
          }
          html, body {
            height: 100%;
            width: 100%;
            margin: 0;
            padding: 0;
            background-color: #0F172A;
            font-family: "Google Sans", "Noto Sans Hebrew", system-ui, -apple-system, sans-serif;
            color: #FFFFFF;
            -webkit-text-size-adjust: 100%;
            text-size-adjust: 100%;
            touch-action: manipulation;
            overflow-x: hidden;
          }
          img, video {
            max-width: 100%;
            height: auto;
          }
          button, a {
            touch-action: manipulation;
          }
          @media (max-width: 767px) {
            html { font-size: 15px; }
          }
          /* Ensure Expo Router wrapper divs stretch to full width/height */
          #root {
            display: flex;
            flex-direction: column;
            width: 100%;
            min-height: 100%;
          }
          #root > div {
            display: flex;
            flex-direction: column;
            flex: 1;
            width: 100%;
          }
          #root > div > div {
            display: flex;
            flex-direction: column;
            flex: 1;
            width: 100%;
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
          /* Premium Range Slider styles */
          input[type=range].custom-slider {
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            height: 8px;
            background: #1f2937;
            border-radius: 4px;
            outline: none;
            margin: 15px 0;
            cursor: pointer;
          }
          input[type=range].custom-slider::-webkit-slider-runnable-track {
            width: 100%;
            height: 8px;
            background: #1e293b;
            border-radius: 4px;
            border: 1px solid #334155;
          }
          input[type=range].custom-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 24px;
            height: 24px;
            border-radius: 12px;
            background: #3b82f6;
            border: 2px solid #ffffff;
            cursor: pointer;
            margin-top: -8px;
            box-shadow: 0 0 10px rgba(59, 130, 246, 0.6);
            transition: transform 0.15s ease, background-color 0.15s ease;
          }
          input[type=range].custom-slider::-webkit-slider-thumb:hover {
            transform: scale(1.2);
            background: #2563eb;
          }
          /* Redesigned Web Dashboard Range Slider */
          input[type=range].dashboard-range-slider {
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            height: 18px;
            border-radius: 9px;
            outline: none;
            margin: 10px 0;
            cursor: pointer;
            position: relative;
            z-index: 2;
          }
          input[type=range].dashboard-range-slider::-webkit-slider-runnable-track {
            width: 100%;
            height: 18px;
            background: transparent;
            border-radius: 9px;
          }
          input[type=range].dashboard-range-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 44px;
            height: 18px;
            border-radius: 9px;
            background: #ffffff;
            border: none;
            cursor: pointer;
            box-shadow: 0 0 12px rgba(255, 255, 255, 0.9);
            transition: transform 0.15s ease, box-shadow 0.15s ease;
          }
          input[type=range].dashboard-range-slider::-webkit-slider-thumb:hover {
            transform: scale(1.15);
            box-shadow: 0 0 16px rgba(255, 255, 255, 1);
          }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
