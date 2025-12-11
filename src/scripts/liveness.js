import { CAMERA_CONSTRAINTS } from "./config/app-config.js";
import { startCamera, stopCamera } from "./services/camera-service.js";
import { ensureFaceApiReady } from "./services/face-api-service.js";
import { getElementOrThrow, setTextContent } from "./services/dom-utils.js";

const VIDEO_ELEMENT_ID = "live-video";
const START_BUTTON = "start-liveness";
const EXPRESSION_ELEMENT_ID = "expression-status";
const DETECTION_INTERVAL_MS = 600;
const EXPRESSION_CONFIDENCE_THRESHOLD = 0.6;
const TARGET_EXPRESSION_DURATION_MS = 5000;
const EXPRESSIONS = [
  { key: "happy", label: "Happy" },
  { key: "sad", label: "Sad" },
  { key: "angry", label: "Angry" },
  { key: "fearful", label: "Fearful" },
  { key: "disgusted", label: "Disgusted" },
  { key: "surprised", label: "Surprised" },
];

const state = {
  stream: null,
  running: false,
  detectionOptions: null,
  expressionStats: createInitialExpressionStats(),
};

const expressionElements = new Map();

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

function createInitialExpressionStats() {
  return EXPRESSIONS.reduce((acc, expression) => {
    acc[expression.key] = {
      durationMs: 0,
      percent: 0,
      completed: false,
    };
    return acc;
  }, {});
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

function initExpressionElements() {
  EXPRESSIONS.forEach(({ key }) => {
    const checkbox = getElementOrThrow(`expr-${key}-checkbox`);
    const progress = getElementOrThrow(`expr-${key}-progress`);
    const percentLabel = document.getElementById(`expr-${key}-percent`);
    expressionElements.set(key, { checkbox, progress, percentLabel });
  });
  renderAllExpressions();
}

/**
  * Update the progress bar given its expression
  */
function renderExpressionState(key) {
  console.log(`Render ${key} expression.`);
  const entry = state.expressionStats[key];
  const ui = expressionElements.get(key);
  if (!entry || !ui) {
    return;
  }
  const percentValue = Math.min(Math.round(entry.percent), 100);
  ui.progress.value = percentValue;
  if (ui.percentLabel) {
    ui.percentLabel.textContent = `${percentValue}%`;
  }
  ui.checkbox.checked = entry.completed;
  ui.checkbox.disabled = entry.completed;
  filterNotCompleted();
}

function filterNotCompleted() {
  // check the ones that are not completed and show the closest to be completed
  const nextExpression = EXPRESSIONS.find(({ key }) => {
    const stats = state.expressionStats[key];
    return stats && !stats.completed;
  });

  if (nextExpression) {
    setTextContent("currentExpression", nextExpression.label);
    return;
  }

  setTextContent("currentExpression", "Face expression verification completed.");
}

function renderAllExpressions() {
  EXPRESSIONS.forEach(({ key }) => renderExpressionState(key));
}

function resetExpressionProgress() {
  state.expressionStats = createInitialExpressionStats();
  renderAllExpressions();
}

/*
 * Update expression percent value.
 */
function trackExpressionDuration(label, deltaMs, score) {
  if (!label || score < EXPRESSION_CONFIDENCE_THRESHOLD) {
    return;
  }
  const entry = state.expressionStats[label];
  if (!entry || entry.completed) {
    return;
  }
  entry.durationMs = Math.min(entry.durationMs + deltaMs, TARGET_EXPRESSION_DURATION_MS);
  entry.percent = (entry.durationMs / TARGET_EXPRESSION_DURATION_MS) * 100;
  if (entry.durationMs >= TARGET_EXPRESSION_DURATION_MS) {
    entry.completed = true;
    entry.percent = 100;
  }
  renderExpressionState(label);
}

/*
 * Function to detect face expression
 * */
async function detectExpression() {
  console.log("detecting expression");
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
  console.log("Running detection Loop");
  let lastUpdateTime = performance.now();
  while (state.running) {
    try {
      const { label, score } = await detectExpression();
      const now = performance.now();
      const deltaMs = Math.max(now - lastUpdateTime, 0);
      lastUpdateTime = now;
      trackExpressionDuration(label, deltaMs, score);
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
  const startButton = getElementOrThrow(START_BUTTON);
  startButton.disabled = true;
  startButton.textContent = "Starting...";
  setTextContent(EXPRESSION_ELEMENT_ID, "Expression: loading models...");
  try {
    await ensureFaceApiReady();
    const { stream } = await startCamera(VIDEO_ELEMENT_ID, CAMERA_CONSTRAINTS);
    state.stream = stream;
    state.running = true;
    resetExpressionProgress();
    startButton.textContent = "Stop Liveness";
    startButton.disabled = false;
    setTextContent(EXPRESSION_ELEMENT_ID, "Expression: searching for a face...");
    runDetectionLoop();
  } catch (error) {
    console.error("[expression-liveness] start error", error);
    setTextContent(EXPRESSION_ELEMENT_ID, `Expression: ${error.message}`);
    startButton.textContent = "Start Liveness";
    startButton.disabled = false;
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
  const button = document.getElementById(START_BUTTON);
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
  initExpressionElements();
  const button = getElementOrThrow(START_BUTTON);
  button.addEventListener("click", handleButtonClick);
  setTextContent(EXPRESSION_ELEMENT_ID, "Expression: click start to begin detection.");
}

window.addEventListener("beforeunload", () => stopDetection());

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
