import React from 'react';

const APK_PATH = '/downloads/masala-madness.apk';
const APK_FILENAME = 'masala-madness.apk';

export default function ApkDownloadCard() {
  return (
    <a
      id="apk-download"
      href={APK_PATH}
      download={APK_FILENAME}
      className="mb-6 w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-lg text-base font-bold text-white bg-orange-600 hover:bg-orange-700 active:bg-orange-800 shadow-md transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
      </svg>
      Download APK
    </a>
  );
}
