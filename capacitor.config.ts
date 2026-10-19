import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'app.omnivae.personal',
  appName: 'Omnivae',
  loggingBehavior: 'none',
  webDir: 'apps/web/out',
  // Keep system-bar padding native; CSS injection can run before the document exists.
  plugins: { SystemBars: { insetsHandling: 'native' } },
};
export default config;

