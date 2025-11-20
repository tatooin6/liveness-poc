import { LIVENESS_CONFIG, CAMERA_CONSTRAINTS } from "../config/app-config.js";
import { createStatusChannel } from "../services/status-service.js";
import { ensureOpencvReady } from "../services/opencv-service.js";
import { startCamera, stopCamera } from "../services/camera-service.js";
import { captureFrame, drawLivenessBoxes } from "../services/canvas-service.js";
import { getFacePluginSdk } from "../services/sdk-service.js";

const status = createStatusChannel(LIVENESS_CONFIG.statusElementId);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createLiveLivenessController() {
  const sdk = getFacePluginSdk();
  const state = {
    detectionSession: null,
    livenessSession: null,
    stream: null,
    running: false,
  };

  async function ensureSessions() {
    if (state.detectionSession && state.livenessSession) {
      return;
    }
    status.update("Loading detection and liveness models...");
    const [detectionSession, livenessSession] = await Promise.all([
      sdk.loadDetectionModel(),
      sdk.loadLivenessModel(),
    ]);
    state.detectionSession = detectionSession;
    state.livenessSession = livenessSession;
  }

  async function runSingleInference() {
    const { context } = captureFrame(
      LIVENESS_CONFIG.videoElementId,
      LIVENESS_CONFIG.canvasElementId,
    );
    if (!context) {
      status.update("Waiting for video feed...");
      return;
    }
    const detectionOutput = await sdk.detectFace(
      state.detectionSession,
      LIVENESS_CONFIG.canvasElementId,
    );
    if (!detectionOutput || detectionOutput.size === 0) {
      status.update("No face detected.");
      return;
    }
    const livenessOutput = await sdk.predictLiveness(
      state.livenessSession,
      LIVENESS_CONFIG.canvasElementId,
      detectionOutput.bbox,
    );
    if (!livenessOutput.length) {
      status.update("Unable to compute liveness.");
      return;
    }
    context.save();
    drawLivenessBoxes(context, livenessOutput, LIVENESS_CONFIG.liveScoreThreshold);
    context.restore();
    const bestScore = livenessOutput.reduce((max, entry) => Math.max(max, entry[4]), 0);
    const label = bestScore >= LIVENESS_CONFIG.liveScoreThreshold ? "Live" : "Spoof";
    status.update(`${label} face detected (score: ${bestScore.toFixed(2)})`);
  }

  async function inferenceLoop() {
    while (state.running) {
      try {
        await runSingleInference();
      } catch (error) {
        console.error("[liveness] inference error", error);
        status.update(error.message);
      }
      await delay(LIVENESS_CONFIG.inferenceIntervalMs);
    }
  }

  async function start() {
    if (state.running) {
      return;
    }
    status.update("Loading OpenCV.js...");
    await ensureOpencvReady(LIVENESS_CONFIG.opencvLoadTimeoutMs);
    await ensureSessions();
    status.update("Starting camera...");
    const { stream } = await startCamera(
      LIVENESS_CONFIG.videoElementId,
      CAMERA_CONSTRAINTS,
    );
    state.stream = stream;
    state.running = true;
    status.update("Running liveness detection.");
    inferenceLoop();
  }

  function stop() {
    state.running = false;
    stopCamera(state.stream);
    state.stream = null;
    status.update("Liveness demo stopped.");
  }

  async function startFromButton(event) {
    const button = event?.currentTarget;
    if (button) {
      button.disabled = true;
      button.textContent = "Starting...";
    }
    try {
      await start();
      if (button) {
        button.textContent = "Liveness Running";
      }
    } catch (error) {
      console.error("Unable to start liveness demo:", error);
      if (button) {
        button.textContent = "Retry Liveness Detection";
        button.disabled = false;
      }
    }
  }

  return {
    start,
    stop,
    startFromButton,
  };
}
