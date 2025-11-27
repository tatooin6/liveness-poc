import { FEATURE_FLAGS } from "./config/app-config.js";
import { createLiveLivenessController } from "./features/live-liveness.js";
import { registerDocumentUploadFeature } from "./features/document-processing.js";
import { registerFaceComparisonFeature } from "./features/face-comparison.js";
import { registerLivePhotoCapture } from "./features/live-photo-capture.js";

const controller = createLiveLivenessController();
let startButtonRef = null;
let stopButtonRef = null;
let captureButtonRef = null;

function getStartButton() {
  if (!startButtonRef) {
    startButtonRef = document.getElementById("start-liveness");
  }
  return startButtonRef;
}

function getStopButton() {
  if (!stopButtonRef) {
    stopButtonRef = document.getElementById("stop-liveness");
  }
  return stopButtonRef;
}

function getCaptureButton() {
  if (!captureButtonRef) {
    captureButtonRef = document.getElementById("capture");
  }
  return captureButtonRef;
}

function setRunningUiState() {
  const startButton = getStartButton();
  const stopButton = getStopButton();
  if (startButton) {
    startButton.textContent = "Liveness Running";
    startButton.disabled = true;
  }
  if (stopButton) {
    stopButton.disabled = false;
    stopButton.textContent = "Stop";
  }
}

function setIdleUiState() {
  const startButton = getStartButton();
  const stopButton = getStopButton();
  const captureButton = getCaptureButton();
  if (startButton) {
    startButton.disabled = false;
    startButton.textContent = "Start";
  }
  if (stopButton) {
    stopButton.disabled = true;
    stopButton.textContent = "Stop";
  }
  if (captureButton) {
    captureButton.disabled = true;
  }
}

async function startLivenessFromButton(event) {
  const startButton = event?.currentTarget ?? getStartButton();
  const stopButton = getStopButton();
  const captureButton = getCaptureButton();

  if (startButton) {
    startButton.disabled = true;
    startButton.textContent = "Starting...";
  }
  if (stopButton) {
    stopButton.disabled = true;
  }
  if (captureButton) {
    captureButton.disabled = false;
  }
  try {
    await controller.start();
    setRunningUiState();
  } catch (error) {
    console.error("Unable to start liveness demo:", error);
    if (startButton) {
      startButton.textContent = "Retry Liveness Detection";
      startButton.disabled = false;
    }
  }
}

function stopLiveness() {
  controller.stop();
  setIdleUiState();
}

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
      onCapture: stopLiveness,
    });
    registerFaceComparisonFeature({
      compareButtonId: "compare-live-face",
      statusId: "comparison-status",
    });
  }
}

window.basicLivenessDemo = {
  start: async () => {
    await controller.start();
    setRunningUiState();
  },
  stop: () => stopLiveness(),
};
window.startLivenessFromButton = startLivenessFromButton;
window.stopLivenessFromButton = stopLiveness;
window.addEventListener("beforeunload", () => controller.stop());

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
