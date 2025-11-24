import { setTextContent } from "../services/dom-utils.js";
import {
  getComparisonState,
  onCapturedPhotoChange,
  onDocumentDetectionChange,
} from "../services/comparison-state.js";
import {
  analyzeFaceFromCanvas,
  computeFaceDistance,
  ensureFaceApiReady,
} from "../services/face-api-service.js";

function createCanvasFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export function registerFaceComparisonFeature({ compareButtonId, statusId }) {
  const compareButton = document.getElementById(compareButtonId);
  if (!compareButton) {
    return () => {};
  }

  let isComparing = false;

  const updateButtonState = () => {
    const { capturedPhoto, documentDetection } = getComparisonState();
    compareButton.disabled =
      isComparing ||
      !(
        capturedPhoto &&
        documentDetection &&
        documentDetection.snapshot
      );
  };

  const updateStatusMessage = () => {
    if (isComparing) {
      return;
    }
    const { capturedPhoto, documentDetection } = getComparisonState();
    if (capturedPhoto && documentDetection?.snapshot) {
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
    const docSnapshot = documentDetection?.snapshot;
    if (!capturedPhoto || !docSnapshot) {
      updateButtonState();
      updateStatusMessage();
      return;
    }

    isComparing = true;
    updateButtonState();
    setTextContent(statusId, "Loading face-api.js models...");

    try {
      await ensureFaceApiReady();
      setTextContent(statusId, "Preparing images for comparison...");
      const [docCanvas, liveCanvas] = await Promise.all([
        createCanvasFromDataUrl(docSnapshot),
        createCanvasFromDataUrl(capturedPhoto),
      ]);
      setTextContent(statusId, "Detecting faces in both images...");
      const [docAnalysis, liveAnalysis] = await Promise.all([
        analyzeFaceFromCanvas(docCanvas),
        analyzeFaceFromCanvas(liveCanvas),
      ]);
      if (!docAnalysis.descriptor) {
        setTextContent(statusId, "Unable to detect a face in the document snapshot. Re-analyze the document.");
        return;
      }
      if (!liveAnalysis.descriptor) {
        setTextContent(statusId, "Unable to detect a face in the captured photo. Capture a clearer photo.");
        return;
      }
      setTextContent(statusId, "Computing similarity score...");
      const distance = computeFaceDistance(docAnalysis.descriptor, liveAnalysis.descriptor);
      if (!Number.isFinite(distance)) {
        throw new Error("face-api.js returned an invalid distance.");
      }
      const threshold = 0.6;
      const passed = distance < threshold;
      const msg = passed
        ? `Match OK ✔️ distance = ${distance.toFixed(3)}`
        : `Faces do not match ❌ distance = ${distance.toFixed(3)}`;
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
