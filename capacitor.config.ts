import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tabletop.companion',
  appName: 'Tabletop Companion',
  webDir: 'dist/tabletop-companion/browser',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Preferences: {},
  },
};

export default config;
