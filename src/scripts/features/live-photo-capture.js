import { LIVENESS_CONFIG } from "../config/app-config.js";
import { getElementOrThrow, setTextContent } from "../services/dom-utils.js";
import { setCapturedPhoto } from "../services/comparison-state.js";

export function registerLivePhotoCapture({
  buttonId,
  previewImageId,
  statusId,
}) {
  const button = getElementOrThrow(buttonId);
  const preview = getElementOrThrow(previewImageId);

  const handleCapture = () => {
    const video = document.getElementById(LIVENESS_CONFIG.videoElementId);
    if (!video || !video.videoWidth || !video.videoHeight) {
      setTextContent(statusId, "Start liveness and wait for the camera before capturing.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    preview.src = dataUrl;
    setCapturedPhoto(dataUrl);
    setTextContent(statusId, "Captured photo ready. Analyze the document next.");
  };

  button.addEventListener("click", handleCapture);
  return () => button.removeEventListener("click", handleCapture);
}
