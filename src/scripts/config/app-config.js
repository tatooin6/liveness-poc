export const LIVENESS_CONFIG = {
  videoElementId: "live-video",
  canvasElementId: "live-canvas",
  statusElementId: "live-status",
  liveScoreThreshold: 0.5,
  inferenceIntervalMs: 1500,
  opencvLoadTimeoutMs: 20000,
};

export const CAMERA_CONSTRAINTS = {
  audio: false,
  video: { facingMode: "user" },
};

export const FEATURE_FLAGS = {
  enableDocumentFlow: true,
  enableFaceComparison: true,
};
