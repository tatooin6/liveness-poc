import { CAMERA_CONSTRAINTS } from "./config/app-config.js";
import { startCamera, stopCamera } from "./services/camera-service.js";
import { ensureFaceApiReady } from "./services/face-api-service.js";
import { getElementOrThrow, setTextContent } from "./services/dom-utils.js";

const VIDEO_ELEMENT_ID = "live-video";
const BUTTON_ID = "start-liveness";
const EXPRESSION_ELEMENT_ID = "expression-status";
const DETECTION_INTERVAL_MS = 600;

const state = {
  stream: null,
  running: false,
  detectionOptions: null,
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getFaceApi() {
  const api = window.faceapi;
  if (!api) {
    throw new Error("face-api.js failed to load.");
  }
  return api;
}

function getDetectionOptions() {
  if (!state.detectionOptions) {
    const api = getFaceApi();
    state.detectionOptions = new api.SsdMobilenetv1Options({ minConfidence: 0.6 });
  }
  return state.detectionOptions;
}

function cleanupVideoElement() {
  const video = document.getElementById(VIDEO_ELEMENT_ID);
  if (!video) {
    return;
  }
  video.pause?.();
  video.srcObject = null;
}

function formatExpressionLabel(label, score) {
  if (!label) {
    return "Expression: face not detected.";
  }
  const percent = Number.isFinite(score) ? `${(score * 100).toFixed(1)}%` : "";
  return percent ? `Expression: ${label} (${percent})` : `Expression: ${label}`;
}

function extractBestExpression(expressions) {
  if (!expressions) {
    return { label: null, score: 0 };
  }
  if (typeof expressions.asSortedArray === "function") {
    const [best] = expressions.asSortedArray();
    if (best) {
      return { label: best.expression, score: best.probability ?? 0 };
    }
    return { label: null, score: 0 };
  }
  let label = null;
  let score = 0;
  for (const [key, value] of Object.entries(expressions)) {
    if (value > score) {
      label = key;
      score = value;
    }
  }
  return { label, score };
}

async function detectExpression() {
  const video = document.getElementById(VIDEO_ELEMENT_ID);
  if (!video || video.readyState < 2) {
    return { label: null, score: 0 };
  }
  const api = getFaceApi();
  const result = await api
    .detectSingleFace(video, getDetectionOptions())
    .withFaceExpressions();
  if (!result) {
    return { label: null, score: 0 };
  }
  return extractBestExpression(result.expressions);
}

async function runDetectionLoop() {
  while (state.running) {
    try {
      const { label, score } = await detectExpression();
      if (!state.running) {
        break;
      }
      setTextContent(EXPRESSION_ELEMENT_ID, formatExpressionLabel(label, score));
    } catch (error) {
      console.error("[expression-liveness] detection error", error);
      setTextContent(EXPRESSION_ELEMENT_ID, `Expression: ${error.message}`);
    }
    await delay(DETECTION_INTERVAL_MS);
  }
}

async function startDetection() {
  if (state.running) {
    return;
  }
  const button = getElementOrThrow(BUTTON_ID);
  button.disabled = true;
  button.textContent = "Starting...";
  setTextContent(EXPRESSION_ELEMENT_ID, "Expression: loading models...");
  try {
    await ensureFaceApiReady();
    const { stream } = await startCamera(VIDEO_ELEMENT_ID, CAMERA_CONSTRAINTS);
    state.stream = stream;
    state.running = true;
    button.textContent = "Stop Liveness";
    button.disabled = false;
    setTextContent(EXPRESSION_ELEMENT_ID, "Expression: searching for a face...");
    runDetectionLoop();
  } catch (error) {
    console.error("[expression-liveness] start error", error);
    setTextContent(EXPRESSION_ELEMENT_ID, `Expression: ${error.message}`);
    button.textContent = "Start Liveness";
    button.disabled = false;
    stopCamera(state.stream);
    state.stream = null;
  }
}

function stopDetection() {
  if (!state.running && !state.stream) {
    return;
  }
  state.running = false;
  stopCamera(state.stream);
  state.stream = null;
  cleanupVideoElement();
  setTextContent(EXPRESSION_ELEMENT_ID, "Expression: detection stopped.");
  const button = document.getElementById(BUTTON_ID);
  if (button) {
    button.textContent = "Start Liveness";
    button.disabled = false;
  }
}

async function handleButtonClick(event) {
  event?.preventDefault?.();
  if (state.running) {
    stopDetection();
  } else {
    await startDetection();
  }
}

function boot() {
  const button = getElementOrThrow(BUTTON_ID);
  button.addEventListener("click", handleButtonClick);
  setTextContent(EXPRESSION_ELEMENT_ID, "Expression: click start to begin detection.");
}

window.addEventListener("beforeunload", () => stopDetection());

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
