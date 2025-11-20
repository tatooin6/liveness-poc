import { FEATURE_FLAGS } from "./config/app-config.js";
import { createLiveLivenessController } from "./features/live-liveness.js";
import { registerDocumentUploadFeature } from "./features/document-processing.js";
import { registerFaceComparisonFeature } from "./features/face-comparison.js";
import { registerLivePhotoCapture } from "./features/live-photo-capture.js";

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
    registerLivePhotoCapture({
      buttonId: "capture",
      previewImageId: "picture-preview",
      statusId: "comparison-status",
    });
    registerFaceComparisonFeature({
      compareButtonId: "compare-live-face",
      statusId: "comparison-status",
    });
  }
}

window.basicLivenessDemo = {
  start: () => controller.start(),
  stop: () => controller.stop(),
};
window.startLivenessFromButton = (event) => controller.startFromButton(event);
window.addEventListener("beforeunload", () => controller.stop());

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
