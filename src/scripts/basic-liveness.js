const sdkHandles = {
  loadDetectionModel: window.loadDetectionModel,
  detectFace: window.detectFace,
  loadLivenessModel: window.loadLivenessModel,
  predictLiveness: window.predictLiveness,
  load_opencv: window.load_opencv,
};

const missing = Object.entries(sdkHandles)
  .filter(([, value]) => typeof value !== "function");

if (missing.length) {
  console.error(
    "Face recognition SDK is not loaded. Run `npm run build:sdk` and include node_modules/faceplugin-face-recognition-js/dist/facerecognition-sdk.js before basic-liveness.js.",
    missing.map(([key]) => key),
  );
} else {
  const { loadDetectionModel, detectFace, loadLivenessModel, predictLiveness, load_opencv } = sdkHandles;

  const CONFIG = {
    videoElementId: "live-video",
    canvasElementId: "live-canvas",
    statusElementId: "live-status",
    liveScoreThreshold: 0.5,
    inferenceIntervalMs: 1500,
    opencvLoadTimeoutMs: 20000,
  };

  const state = {
    detectionSession: null,
    livenessSession: null,
    cameraStream: null,
    running: false,
  };

  let opencvReadyPromise = null;

  function getElementOrThrow(id) {
    const el = document.getElementById(id);
    if (!el) {
      throw new Error(`Missing required element: #${id}`);
    }
    return el;
  }

  function updateStatus(message) {
    const el = document.getElementById(CONFIG.statusElementId);
    if (el) {
      el.textContent = message;
    }
    console.log(`[liveness-demo] ${message}`);
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function ensureMediaDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Camera API is not available in this browser.");
    }
  }

  function ensureOpencvReady() {
    if (window.cv && typeof window.cv.imread === "function") {
      return Promise.resolve();
    }
    if (!opencvReadyPromise) {
      load_opencv();
      opencvReadyPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Timed out waiting for OpenCV.js to load."));
        }, CONFIG.opencvLoadTimeoutMs);
        const check = () => {
          if (window.cv && typeof window.cv.imread === "function") {
            clearTimeout(timeout);
            resolve();
            return;
          }
          requestAnimationFrame(check);
        };
        check();
      });
    }
    return opencvReadyPromise;
  }

  async function startCamera() {
    ensureMediaDevices();
    const video = getElementOrThrow(CONFIG.videoElementId);
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: "user" },
    });
    state.cameraStream = stream;
    video.srcObject = stream;
    await video.play();
    return video;
  }

  function stopCamera() {
    if (!state.cameraStream) return;
    state.cameraStream.getTracks().forEach((track) => track.stop());
    state.cameraStream = null;
  }

  function drawFrame(video, canvas) {
    const ctx = canvas.getContext("2d");
    if (!video.videoWidth || !video.videoHeight) {
      return null;
    }
    if (canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return ctx;
  }

  function drawLivenessBoxes(ctx, livenessResults) {
    livenessResults.forEach(([x1, y1, x2, y2, score]) => {
      const color = score >= CONFIG.liveScoreThreshold ? "#2ecc71" : "#e74c3c";
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      const label = `${(score * 100).toFixed(1)}% live`;
      ctx.font = "16px sans-serif";
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = color;
      const padding = 4;
      ctx.fillRect(x1, Math.max(y1 - 20, 0), textWidth + padding * 2, 20);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, x1 + padding, Math.max(y1 - 5, 15));
    });
  }

  async function runSingleLivenessCheck() {
    const video = getElementOrThrow(CONFIG.videoElementId);
    const canvas = getElementOrThrow(CONFIG.canvasElementId);
    const ctx = drawFrame(video, canvas);
    if (!ctx) {
      updateStatus("Waiting for video feed...");
      return;
    }

    const detectionOutput = await detectFace(state.detectionSession, CONFIG.canvasElementId);
    if (!detectionOutput || detectionOutput.size === 0) {
      updateStatus("No face detected.");
      return;
    }

    const livenessOutput = await predictLiveness(
      state.livenessSession,
      CONFIG.canvasElementId,
      detectionOutput.bbox,
    );

    if (!livenessOutput.length) {
      updateStatus("Unable to compute liveness.");
      return;
    }

    ctx.save();
    drawLivenessBoxes(ctx, livenessOutput);
    ctx.restore();

    const bestScore = livenessOutput.reduce((max, entry) => Math.max(max, entry[4]), 0);
    const label = bestScore >= CONFIG.liveScoreThreshold ? "Live" : "Spoof";
    updateStatus(`${label} face detected (score: ${bestScore.toFixed(2)})`);
  }

  async function runInferenceLoop() {
    while (state.running) {
      try {
        await runSingleLivenessCheck();
      } catch (error) {
        console.error("Liveness loop error:", error);
        updateStatus(error.message);
      }
      await delay(CONFIG.inferenceIntervalMs);
    }
  }

  async function startBasicLivenessDemo() {
    if (state.running) {
      return;
    }
    updateStatus("Loading OpenCV.js...");
    await ensureOpencvReady();
    updateStatus("Loading detection and liveness models...");
    const [detectionSession, livenessSession] = await Promise.all([
      loadDetectionModel(),
      loadLivenessModel(),
    ]);
    state.detectionSession = detectionSession;
    state.livenessSession = livenessSession;
    updateStatus("Starting camera...");
    await startCamera();
    state.running = true;
    updateStatus("Running liveness detection.");
    runInferenceLoop();
  }

  function stopBasicLivenessDemo() {
    state.running = false;
    stopCamera();
    updateStatus("Liveness demo stopped.");
  }

  async function startLivenessFromButton(event) {
    const button = event?.currentTarget || document.getElementById("start-liveness");
    if (!button) {
      console.warn("[liveness-demo] Start button not found!");
      return;
    }
    button.disabled = true;
    button.textContent = "Starting...";
    try {
      await startBasicLivenessDemo();
      button.textContent = "Liveness Running";
    } catch (error) {
      console.error("Unable to start liveness demo:", error);
      button.textContent = "Retry Liveness Detection";
      button.disabled = false;
    }
  }

  function logTestClick() {
    console.log("[liveness-demo] Test button clicked at", new Date().toISOString());
  }

  window.basicLivenessDemo = {
    start: startBasicLivenessDemo,
    stop: stopBasicLivenessDemo,
  };
  window.startLivenessFromButton = startLivenessFromButton;
  window.logTestClick = logTestClick;
  window.addEventListener("beforeunload", stopBasicLivenessDemo);
}
