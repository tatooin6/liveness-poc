import { getElementOrThrow } from "./dom-utils.js";

export function captureFrame(videoElementId, canvasElementId) {
  const video = getElementOrThrow(videoElementId);
  const canvas = getElementOrThrow(canvasElementId);
  if (!video.videoWidth || !video.videoHeight) {
    return { context: null, canvas };
  }
  if (canvas.width !== video.videoWidth) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return { context: ctx, canvas };
}

export function drawLivenessBoxes(ctx, livenessResults, threshold) {
  livenessResults.forEach(([x1, y1, x2, y2, score]) => {
    const color = score >= threshold ? "#2ecc71" : "#e74c3c";
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    const label = `${(score * 100).toFixed(1)}% live`;
    ctx.font = "16px sans-serif";
    const textWidth = ctx.measureText(label).width;
    const padding = 4;
    ctx.fillStyle = color;
    ctx.fillRect(x1, Math.max(y1 - 20, 0), textWidth + padding * 2, 20);
    ctx.fillStyle = "#fff";
    ctx.fillText(label, x1 + padding, Math.max(y1 - 5, 15));
  });
}
