export const properties = {
  IFRAME_SECURE_SITE:
    process.env.IFRAME_SECURE_SITE || "http://localhost:3040/iframe.html",
  VERSION: process.env.npm_package_version || "0.1.1",
  CLIENT_URL:
    process.env.CLIENT_URL || "https://flogo.studio.skyflow.dev/getcreditscore",
  APP_ID: process.env.APP_ID || "bfa831cab06e11ea81abc6d2cc16794f",
};
