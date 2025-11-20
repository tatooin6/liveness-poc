import { getFacePluginSdk } from "./sdk-service.js";

let opencvReadyPromise = null;

export function ensureOpencvReady(timeoutMs) {
  if (window.cv && typeof window.cv.imread === "function") {
    return Promise.resolve();
  }
  const { load_opencv } = getFacePluginSdk();
  if (!opencvReadyPromise) {
    opencvReadyPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timed out waiting for OpenCV.js to load."));
      }, timeoutMs);
      load_opencv();
      const checkReady = () => {
        if (window.cv && typeof window.cv.imread === "function") {
          clearTimeout(timeout);
          resolve();
          return;
        }
        requestAnimationFrame(checkReady);
      };
      checkReady();
    });
  }
  return opencvReadyPromise;
}
