
// Manually define environment types since vite/client is reported missing

interface ImportMetaEnv {
  readonly VITE_APPSCRIPT_URL: string;
  readonly SENDGRID_API_KEY: string;
  readonly API_KEY: string;
  [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    VITE_APPSCRIPT_URL: string;
    SENDGRID_API_KEY: string;
    [key: string]: string | undefined;
  }
}
