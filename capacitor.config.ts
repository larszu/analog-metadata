import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor wraps the built web app (dist/) into native iOS and Android
 * projects. See docs/ARCHITECTURE.md for the full mobile build flow.
 *
 *   npm run build                # produce dist/
 *   npx cap add ios              # once, creates ios/ project
 *   npx cap add android          # once, creates android/ project
 *   npx cap sync                 # copy dist/ + plugins into native shells
 *   npx cap open ios | android   # open Xcode / Android Studio to run & sign
 */
const config: CapacitorConfig = {
  appId: "app.analogmetadata",
  appName: "Analog Metadata",
  webDir: "dist",
  backgroundColor: "#111417",
  ios: {
    contentInset: "always",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
