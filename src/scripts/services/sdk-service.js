const REQUIRED_EXPORTS = [
  "loadDetectionModel",
  "detectFace",
  "detectFaceBase64",
  "loadLivenessModel",
  "predictLiveness",
  "load_opencv",
];

let cachedSdk = null;

function resolveSdkSource() {
  if (window.faceplugin) {
    return window.faceplugin;
  }
  return window;
}

export function getFacePluginSdk() {
  if (!cachedSdk) {
    const source = resolveSdkSource();
    cachedSdk = Object.fromEntries(
      REQUIRED_EXPORTS.map((key) => [key, source[key]]),
    );
  }
  const missing = REQUIRED_EXPORTS.filter((key) => typeof cachedSdk[key] !== "function");
  if (missing.length) {
    throw new Error(
      `FacePlugin SDK is not ready. Run "npm run build:sdk" and ensure dist/facerecognition-sdk.js is loaded before the app. Missing: ${missing.join(", ")}`,
    );
  }
  return cachedSdk;
}
