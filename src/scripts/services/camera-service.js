import { getElementOrThrow } from "./dom-utils.js";

export async function startCamera(videoElementId, constraints) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("Camera API is not available in this browser.");
  }
  const video = getElementOrThrow(videoElementId);
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  video.srcObject = stream;
  await video.play();
  return { video, stream };
}

export function stopCamera(stream) {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}
