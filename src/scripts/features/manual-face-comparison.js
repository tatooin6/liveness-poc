import { LIVENESS_CONFIG } from "../config/app-config.js";
import { setTextContent } from "../services/dom-utils.js";
import { ensureOpencvReady } from "../services/opencv-service.js";
import { getFacePluginSdk } from "../services/sdk-service.js";
import { cloneFeatureVector, extractFeatureVector } from "../services/feature-utils.js";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function drawImageOnCanvas(canvasId, dataUrl) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    return Promise.resolve();
  }
  const ctx = canvas.getContext("2d");
  const img = new Image();
  return new Promise((resolve, reject) => {
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve();
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export function registerManualFaceComparisonTest({
  slots,
  compareButtonId,
  compareStatusId,
}) {
  const compareButton = document.getElementById(compareButtonId);
  if (!compareButton || !slots?.length) {
    return () => {};
  }
  const sdk = getFacePluginSdk();
  let detectionSessionPromise = null;
  let landmarkSessionPromise = null;
  let featureSessionPromise = null;

  function ensureDetectionSession() {
    if (!detectionSessionPromise) {
      detectionSessionPromise = sdk.loadDetectionModel();
    }
    return detectionSessionPromise;
  }
  function ensureLandmarkSession() {
    if (!landmarkSessionPromise) {
      landmarkSessionPromise = sdk.loadLandmarkModel();
    }
    return landmarkSessionPromise;
  }
  function ensureFeatureSession() {
    if (!featureSessionPromise) {
      featureSessionPromise = sdk.loadFeatureModel();
    }
    return featureSessionPromise;
  }

  const slotState = new Map();
  const inputTeardowns = [];

  function updateCompareState() {
    const ready = slots.every((slot) => slotState.get(slot.key)?.hasFace);
    compareButton.disabled = !ready;
    if (!ready) {
      setTextContent(compareStatusId, "Upload two images with detectable faces to compare.");
    }
  }

  async function analyzeSlot(slot, dataUrl) {
    slotState.set(slot.key, { base64: dataUrl, hasFace: false, vector: null });
    updateCompareState();
    try {
      setTextContent(slot.statusId, "Preparing image...");
      await drawImageOnCanvas(slot.canvasId, dataUrl);
      setTextContent(slot.statusId, "Loading models...");
      await ensureOpencvReady(LIVENESS_CONFIG.opencvLoadTimeoutMs);
      const [featureSession, detectionSession, landmarkSession] = await Promise.all([
        ensureFeatureSession(),
        ensureDetectionSession(),
        ensureLandmarkSession(),
      ]);
      setTextContent(slot.statusId, "Detecting face...");
      const detection = await sdk.detectFaceBase64(detectionSession, dataUrl);
      if (!detection || detection.size === 0) {
        setTextContent(slot.statusId, "No face detected. Try a different image.");
        slotState.set(slot.key, { base64: dataUrl, hasFace: false, vector: null });
        return;
      }
      setTextContent(slot.statusId, "Detecting landmarks...");
      const landmarks = await sdk.predictLandmarkBase64(
        landmarkSession,
        dataUrl,
        detection.bbox,
      );
      const firstLandmark = landmarks?.[0];
      if (!firstLandmark) {
        setTextContent(slot.statusId, "Unable to detect landmarks.");
        slotState.set(slot.key, { base64: dataUrl, hasFace: false, vector: null });
        return;
      }
      setTextContent(slot.statusId, "Extracting features...");
      const features = await sdk.extractFeatureBase64(
        featureSession,
        dataUrl,
        [firstLandmark],
      );
      const vector = extractFeatureVector(features);
      const normalizedVector = cloneFeatureVector(vector);
      if (!normalizedVector) {
        throw new Error("Unable to read feature vector.");
      }
      slotState.set(slot.key, {
        base64: dataUrl,
        hasFace: true,
        vector: normalizedVector,
      });
      setTextContent(slot.statusId, "Face analyzed. Ready for comparison.");
    } catch (error) {
      console.error("[manual-face-comparison] analyze error", error);
      setTextContent(slot.statusId, "Unable to process this image.");
      slotState.set(slot.key, { base64: dataUrl, hasFace: false, vector: null });
    } finally {
      updateCompareState();
    }
  }

  slots.forEach((slot) => {
    const input = document.getElementById(slot.inputId);
    if (!input) {
      return;
    }
    const handler = async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      setTextContent(slot.statusId, `Loading ${file.name}...`);
      try {
        const dataUrl = await readFileAsDataUrl(file);
        await analyzeSlot(slot, dataUrl);
      } catch (error) {
        console.error("[manual-face-comparison] file load error", error);
        setTextContent(slot.statusId, "Unable to load the selected image.");
      }
    };
    input.addEventListener("change", handler);
    inputTeardowns.push(() => input.removeEventListener("change", handler));
  });

  async function handleCompare() {
    const missingSlot = slots.find((slot) => !slotState.get(slot.key)?.hasFace);
    if (missingSlot) {
      setTextContent(
        compareStatusId,
        `Upload a valid face image for ${missingSlot.label} before comparing.`,
      );
      return;
    }
    try {
      compareButton.disabled = true;
      setTextContent(compareStatusId, "Matching feature vectors...");
      const [firstSlot, secondSlot] = slots.map((slot) => slotState.get(slot.key));
      const firstVector = cloneFeatureVector(firstSlot?.vector);
      const secondVector = cloneFeatureVector(secondSlot?.vector);
      if (!firstVector?.length || !secondVector?.length) {
        setTextContent(compareStatusId, "Unable to read feature vectors. Re-upload both images.");
        return;
      }
      if (firstVector.length !== secondVector.length) {
        console.warn(
          "[manual-face-comparison] feature length mismatch",
          firstVector.length,
          secondVector.length,
        );
        setTextContent(compareStatusId, "Feature vectors mismatch. Please try with different images.");
        return;
      }
      const similarityScore = sdk.matchFeature(
        firstVector,
        secondVector,
      );
      if (!Number.isFinite(similarityScore)) {
        setTextContent(compareStatusId, "Received invalid score from SDK. Retry with different photos.");
        return;
      }
      const threshold = 0.4;
      const passed = similarityScore > threshold;
      const message = passed
        ? `Match OK ✔️ score = ${similarityScore.toFixed(3)}`
        : `Faces do not match ❌ score = ${similarityScore.toFixed(3)}`;
      setTextContent(compareStatusId, message);
    } catch (error) {
      console.error("[manual-face-comparison] compare error", error);
      setTextContent(compareStatusId, "Unable to compare the selected faces.");
    } finally {
      updateCompareState();
    }
  }

  compareButton.addEventListener("click", handleCompare);
  updateCompareState();

  return () => {
    compareButton.removeEventListener("click", handleCompare);
    inputTeardowns.forEach((dispose) => dispose());
  };
}
