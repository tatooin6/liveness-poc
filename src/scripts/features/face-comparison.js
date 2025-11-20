import { LIVENESS_CONFIG } from "../config/app-config.js";
import { setTextContent } from "../services/dom-utils.js";
import { ensureOpencvReady } from "../services/opencv-service.js";
import {
  getComparisonState,
  onCapturedPhotoChange,
  onDocumentDetectionChange,
} from "../services/comparison-state.js";
import { getFacePluginSdk } from "../services/sdk-service.js";

function extractFeatureVector(result) {
  if (!Array.isArray(result) || !result.length) {
    return null;
  }
  const tensorMap = result[0];
  if (!tensorMap) {
    return null;
  }
  const tensor =
    tensorMap.output ??
    tensorMap[Object.keys(tensorMap)[0] ?? ""] ??
    null;
  if (!tensor) {
    return null;
  }
  if (tensor.data) {
    return Array.from(tensor.data);
  }
  if (typeof tensor.values === "function") {
    const iterator = tensor.values();
    const entry = iterator?.next?.();
    if (entry?.value) {
      return Array.from(entry.value);
    }
  }
  return null;
}

export function registerFaceComparisonFeature({ compareButtonId, statusId }) {
  const compareButton = document.getElementById(compareButtonId);
  if (!compareButton) {
    return () => {};
  }

  const sdk = getFacePluginSdk();
  let isComparing = false;
  let detectionSessionPromise = null;
  let landmarkSessionPromise = null;
  let featureSessionPromise = null;

  const ensureDetectionSession = () => {
    if (!detectionSessionPromise) {
      detectionSessionPromise = sdk.loadDetectionModel();
    }
    return detectionSessionPromise;
  };
  const ensureLandmarkSession = () => {
    if (!landmarkSessionPromise) {
      landmarkSessionPromise = sdk.loadLandmarkModel();
    }
    return landmarkSessionPromise;
  };
  const ensureFeatureSession = () => {
    if (!featureSessionPromise) {
      featureSessionPromise = sdk.loadFeatureModel();
    }
    return featureSessionPromise;
  };

  const updateButtonState = () => {
    const { capturedPhoto, documentDetection } = getComparisonState();
    compareButton.disabled = !(
      capturedPhoto &&
      documentDetection &&
      documentDetection.landmarks?.length
    );
  };

  const updateStatusMessage = () => {
    if (isComparing) {
      return;
    }
    const { capturedPhoto, documentDetection } = getComparisonState();
    if (capturedPhoto && documentDetection?.landmarks?.length) {
      setTextContent(statusId, "Captured photo and document ready. Click compare.");
    } else if (!capturedPhoto && !documentDetection) {
      setTextContent(statusId, "Capture your photo, then analyze a document.");
    } else if (!capturedPhoto) {
      setTextContent(statusId, "Capture a live photo to continue.");
    } else {
      setTextContent(statusId, "Analyze the document to continue.");
    }
  };

  const unsubscribePhoto = onCapturedPhotoChange(() => {
    updateButtonState();
    updateStatusMessage();
  });
  const unsubscribeDocument = onDocumentDetectionChange(() => {
    updateButtonState();
    updateStatusMessage();
  });

  async function handleCompare() {
    const { capturedPhoto, documentDetection } = getComparisonState();
    const docLandmarks = documentDetection?.landmarks?.[0];
    if (!capturedPhoto || !documentDetection || !docLandmarks) {
      updateButtonState();
      updateStatusMessage();
      return;
    }

    isComparing = true;
    setTextContent(statusId, "Comparing captured photo with document face...");

    try {
      await ensureOpencvReady(LIVENESS_CONFIG.opencvLoadTimeoutMs);
      const [featureSession, detectionSession, landmarkSession] = await Promise.all([
        ensureFeatureSession(),
        ensureDetectionSession(),
        ensureLandmarkSession(),
      ]);

      const docFeatures = await sdk.extractFeatureBase64(
        featureSession,
        documentDetection.snapshot,
        [docLandmarks],
      );
      const docVector = extractFeatureVector(docFeatures);
      if (!docVector) {
        throw new Error("Unable to extract document features.");
      }

      const liveDetection = await sdk.detectFaceBase64(
        detectionSession,
        capturedPhoto,
      );
      if (!liveDetection || liveDetection.size === 0) {
        setTextContent(statusId, "No face detected in captured photo.");
        return;
      }

      const liveLandmarks = await sdk.predictLandmarkBase64(
        landmarkSession,
        capturedPhoto,
        liveDetection.bbox,
      );
      const liveLandmark = liveLandmarks?.[0];
      if (!liveLandmark) {
        setTextContent(statusId, "Unable to detect landmarks in captured photo.");
        return;
      }

      const liveFeatures = await sdk.extractFeatureBase64(
        featureSession,
        capturedPhoto,
        [liveLandmark],
      );
      const liveVector = extractFeatureVector(liveFeatures);
      if (!liveVector) {
        throw new Error("Unable to extract captured photo features.");
      }

      const similarityScore = sdk.matchFeature(
        [...docVector],
        [...liveVector],
      );
      const threshold = 0.4;
      const passed = similarityScore > threshold;
      const msg = passed
        ? `Match OK ✔️ Similarity score = ${similarityScore.toFixed(3)}`
        : `Faces do not match ❌ score = ${similarityScore.toFixed(3)}`;
      setTextContent(statusId, msg);
    } catch (error) {
      console.error("[face-comparison] comparison error", error);
      setTextContent(statusId, "Comparison failed. Please retry.");
    } finally {
      isComparing = false;
      updateButtonState();
    }
  }

  compareButton.addEventListener("click", handleCompare);
  updateButtonState();
  updateStatusMessage();

  return () => {
    compareButton.removeEventListener("click", handleCompare);
    unsubscribePhoto();
    unsubscribeDocument();
  };
}
