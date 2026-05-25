import React, { useState } from 'react';

const APK_PATH = '/downloads/masala-madness.apk';
const APK_FILENAME = 'masala-madness.apk';
const WEBSITE_URL = 'https://masala-madness.vercel.app';

export default function ApkDownloadCard() {
  const [copied, setCopied] = useState(false);

  const copyWebsiteLink = async () => {
    try {
      await navigator.clipboard.writeText(WEBSITE_URL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch (error) {
      console.error('Failed to copy website link:', error);
    }
  };

  return (
    <div className="mb-6 w-full space-y-3">
      <a
        id="apk-download"
        href={APK_PATH}
        download={APK_FILENAME}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-3.5 text-base font-bold text-white shadow-md transition-colors hover:bg-orange-700 active:bg-orange-800"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
        </svg>
        Download APK
      </a>

      <div className="flex items-center gap-2 px-1 pt-1">
        <a
          href={WEBSITE_URL}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 inline-flex max-w-full items-center gap-2 text-sm font-semibold text-sky-700 transition-colors hover:text-sky-800"
          aria-label="Open the Masala Madness website"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 0c2.5 2.67 4 6.18 4 10s-1.5 7.33-4 10m0-20c-2.5 2.67-4 6.18-4 10s1.5 7.33 4 10M2 12h20" />
          </svg>
          <span className="truncate underline decoration-sky-300 decoration-2 underline-offset-4">
            {WEBSITE_URL.replace('https://', '')}
          </span>
        </a>

        <button
          type="button"
          onClick={copyWebsiteLink}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition-colors hover:border-sky-300 hover:bg-sky-100 hover:text-sky-800 active:bg-sky-200"
          title={copied ? 'Copied' : 'Copy website link'}
          aria-label={copied ? 'Copied website link' : 'Copy website link'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            {copied ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 8h10a2 2 0 012 2v10M6 6h10a2 2 0 012 2v10H8a2 2 0 01-2-2V6z" />
            )}
          </svg>
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
    </div>
  );
}
