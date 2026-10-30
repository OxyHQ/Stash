// Stash's Expo config. The icon is Stash's own (assets/images, from the icon
// set the owner gave); a development build sits next to the production app on
// the same device with APP_VARIANT=development.
const IS_DEV = process.env.APP_VARIANT === 'development';

module.exports = {
  expo: {
    name: IS_DEV ? 'Stash (Dev)' : 'Stash',
    slug: 'stash',
    scheme: 'stash',
    version: '0.1.0',
    orientation: 'default',
    icon: './assets/images/icon.png',
    userInterfaceStyle: 'automatic',
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_DEV ? 'so.oxy.stash.dev' : 'so.oxy.stash',
      icon: './assets/images/icon.png',
    },
    android: {
      package: IS_DEV ? 'so.oxy.stash.dev' : 'so.oxy.stash',
      adaptiveIcon: {
        foregroundImage: './assets/images/icon_foreground.png',
        backgroundImage: './assets/images/icon_background.png',
        monochromeImage: './assets/images/icon_monochrome.png',
      },
    },
    web: {
      bundler: 'metro',
      output: 'single',
      favicon: './public/favicon.ico',
    },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-secure-store',
      'expo-sharing',
      'expo-web-browser',
      ['@oxy.so/app-preset', {}],
    ],
    extra: {
      router: {},
    },
  },
};
