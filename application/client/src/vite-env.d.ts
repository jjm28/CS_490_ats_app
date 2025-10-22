// This file was added to help with Vite's TypeScript support for env variables

/// <reference types="vite/client" />

// explicitly type your env vars
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  // add more VITE_ vars here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}