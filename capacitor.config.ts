export interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  server: { hostname: string; androidScheme: string; iosScheme: string };
  plugins: {
    PushNotifications: { presentationOptions: Array<'badge' | 'sound' | 'alert'> };
    SplashScreen: { launchShowDuration: number; backgroundColor: string };
  };
}

export const LARI_MOBILE_BUNDLE_ID = 'com.randevulari.app';
export const LARI_MOBILE_SCHEMES = ['randevulari', 'lari'] as const;

const config: CapacitorConfig = {
  appId: LARI_MOBILE_BUNDLE_ID,
  appName: 'LARİ',
  webDir: 'dist',
  server: { hostname: 'app.randevulari.com', androidScheme: 'https', iosScheme: 'capacitor' },
  plugins: {
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
    SplashScreen: { launchShowDuration: 1500, backgroundColor: '#0f172a' }
  }
};

export default config;
