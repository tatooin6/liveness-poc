import { FEATURE_FLAGS } from "./config/app-config.js";
import { createLiveLivenessController } from "./features/live-liveness.js";
import { registerDocumentUploadFeature } from "./features/document-processing.js";
import { registerFaceComparisonFeature } from "./features/face-comparison.js";

const controller = createLiveLivenessController();

function boot() {
  if (FEATURE_FLAGS.enableDocumentFlow) {
    registerDocumentUploadFeature({
      inputId: "document-upload",
      previewImageId: "document-preview",
      statusId: "document-status",
      canvasId: "document-canvas",
      analyzeButtonId: "document-analyze",
    });
  }
  if (FEATURE_FLAGS.enableFaceComparison) {
    registerFaceComparisonFeature({
      referenceInputId: "reference-face-upload",
      liveCaptureButtonId: "compare-live-face",
      statusId: "comparison-status",
    });
  }
}

window.basicLivenessDemo = {
  start: () => controller.start(),
  stop: () => controller.stop(),
};
window.startLivenessFromButton = (event) => controller.startFromButton(event);
window.logTestClick = () => console.log("[liveness-demo] Log button clicked.");
window.addEventListener("beforeunload", () => controller.stop());

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
