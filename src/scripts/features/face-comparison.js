import { setTextContent } from "../services/dom-utils.js";

export function registerFaceComparisonFeature({
  referenceInputId,
  liveCaptureButtonId,
  statusId,
}) {
  let referenceImage = null;

  const refInput = document.getElementById(referenceInputId);
  if (refInput) {
    refInput.addEventListener("change", (event) => {
      referenceImage = event.target.files?.[0] ?? null;
      if (referenceImage) {
        setTextContent(statusId, `Reference face ready (${referenceImage.name}).`);
      }
    });
  }

  const button = document.getElementById(liveCaptureButtonId);
  if (button) {
    button.addEventListener("click", () => {
      if (!referenceImage) {
        setTextContent(statusId, "Upload a reference face first.");
        return;
      }
      setTextContent(statusId, "Face comparison placeholder running...");
      // Future: capture face from live feed and compare embeddings.
    });
  }
}
