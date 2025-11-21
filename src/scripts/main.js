import { registerManualFaceComparisonTest } from "./features/manual-face-comparison.js";

try {
  registerManualFaceComparisonTest({
    slots: [
      {
        key: "reference",
        label: "Image A",
        inputId: "referenceUpload",
        canvasId: "referenceCanvas",
        statusId: "referenceStatus",
      },
      {
        key: "comparison",
        label: "Image B",
        inputId: "comparisonUpload",
        canvasId: "comparisonCanvas",
        statusId: "comparisonStatus",
      },
    ],
    compareButtonId: "compareUploadsButton",
    compareStatusId: "compareUploadsStatus",
  });
} catch (error) {
  console.error("[manual-face-comparison] init error", error);
  const status = document.getElementById("compareUploadsStatus");
  if (status) {
    status.textContent = "FacePlugin SDK failed to load. Check build instructions and reload.";
  }
}
