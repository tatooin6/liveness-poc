const MODEL_BASE_URLS = ["/weights", "https://justadudewhohacks.github.io/face-api.js/models"];

let modelLoadPromise = null;
let activeModelBase = null;
let detectionOptions = null;

function getFaceApi() {
  const api = window.faceapi;
  if (!api) {
    throw new Error("face-api.js is not loaded. Ensure the script tag is included before main.js.");
  }
  return api;
}

function getDetectionOptions() {
  if (!detectionOptions) {
    const api = getFaceApi();
    detectionOptions = new api.SsdMobilenetv1Options({ minConfidence: 0.5 });
  }
  return detectionOptions;
}

async function loadModelsFrom(baseUrl) {
  const api = getFaceApi();
  await Promise.all([
    api.nets.ssdMobilenetv1.loadFromUri(baseUrl),
    api.nets.faceLandmark68Net.loadFromUri(baseUrl),
    api.nets.faceRecognitionNet.loadFromUri(baseUrl),
    api.nets.faceExpressionNet.loadFromUri(baseUrl),
  ]);
  activeModelBase = baseUrl;
}

export function ensureFaceApiReady() {
  if (!modelLoadPromise) {
    modelLoadPromise = (async () => {
      let lastError = null;
      for (const baseUrl of MODEL_BASE_URLS) {
        try {
          await loadModelsFrom(baseUrl);
          return;
        } catch (error) {
          console.warn(`[face-api-service] Failed to load models from ${baseUrl}`, error);
          lastError = error;
        }
      }
      throw lastError ?? new Error("Unable to load face-api models.");
    })().catch((error) => {
      modelLoadPromise = null;
      throw error;
    });
  }
  return modelLoadPromise;
}

export function getActiveModelBase() {
  return activeModelBase;
}

export async function analyzeFaceFromCanvas(canvas) {
  if (!canvas) {
    return { descriptor: null, detection: null };
  }
  await ensureFaceApiReady();
  const api = getFaceApi();
  const options = getDetectionOptions();
  const result = await api
    .detectSingleFace(canvas, options)
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!result) {
    return { descriptor: null, detection: null };
  }
  return {
    descriptor: result.descriptor ?? null,
    detection: result.detection ?? null,
  };
}

export function computeFaceDistance(descriptorA, descriptorB) {
  if (!descriptorA?.length || !descriptorB?.length) {
    return null;
  }
  const api = getFaceApi();
  return api.euclideanDistance(descriptorA, descriptorB);
}
