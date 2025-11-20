import { LIVENESS_CONFIG } from "../config/app-config.js";
import { createFileInputObserver, getElementOrThrow, setTextContent } from "../services/dom-utils.js";
import { ensureOpencvReady } from "../services/opencv-service.js";
import { getFacePluginSdk } from "../services/sdk-service.js";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

export function registerDocumentUploadFeature({
  inputId,
  previewImageId,
  statusId,
  canvasId,
  analyzeButtonId,
}) {
  const sdk = getFacePluginSdk();
  const preview = getElementOrThrow(previewImageId);
  const analyzeButton = getElementOrThrow(analyzeButtonId);

  const state = {
    previewReady: false,
    detectionSessionPromise: null,
  };

  function ensureDetectionSession() {
    if (!state.detectionSessionPromise) {
      state.detectionSessionPromise = sdk.loadDetectionModel();
    }
    return state.detectionSessionPromise;
  }

  async function analyzeDocument() {
    if (!state.previewReady || !preview.naturalWidth || !preview.naturalHeight) {
      setTextContent(statusId, "Select a document before analyzing.");
      return;
    }
    analyzeButton.disabled = true;
    try {
      setTextContent(statusId, "Preparing document...");
      const canvas = getElementOrThrow(canvasId);
      const ctx = canvas.getContext("2d");
      canvas.width = preview.naturalWidth;
      canvas.height = preview.naturalHeight;
      ctx.drawImage(preview, 0, 0);

      setTextContent(statusId, "Loading OpenCV...");
      await ensureOpencvReady(LIVENESS_CONFIG.opencvLoadTimeoutMs);

      setTextContent(statusId, "Loading detection model...");
      const session = await ensureDetectionSession();

      setTextContent(statusId, "Analyzing document...");
      const snapshot = canvas.toDataURL("image/png");
      const detection = await sdk.detectFaceBase64(session, snapshot);
      if (!detection || detection.size === 0) {
        setTextContent(statusId, "No face detected in document.");
        return;
      }
      setTextContent(statusId, `Detected ${detection.size} face(s) in document.`);
    } catch (error) {
      console.error("[document-flow] detection error", error);
      setTextContent(statusId, "Unable to analyze document.");
    } finally {
      if (state.previewReady) {
        analyzeButton.disabled = false;
      }
    }
  }

  analyzeButton.disabled = true;
  const teardownInputObserver = createFileInputObserver(inputId, async (file) => {
    state.previewReady = false;
    analyzeButton.disabled = true;
    setTextContent(statusId, `Loading ${file.name}...`);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      preview.onload = () => {
        state.previewReady = true;
        analyzeButton.disabled = false;
        setTextContent(statusId, "Document ready. Click Analyze Document.");
      };
      preview.onerror = () => {
        state.previewReady = false;
        analyzeButton.disabled = true;
        setTextContent(statusId, "Unable to load document preview.");
      };
      preview.src = dataUrl;
    } catch (error) {
      console.error("[document-flow] file read error", error);
      setTextContent(statusId, "Unable to load selected document.");
    }
  });

  analyzeButton.addEventListener("click", analyzeDocument);

  return () => {
    teardownInputObserver();
    analyzeButton.removeEventListener("click", analyzeDocument);
  };
}
