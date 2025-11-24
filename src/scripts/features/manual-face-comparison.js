import { setTextContent } from "../services/dom-utils.js";
import {
  analyzeFaceFromCanvas,
  computeFaceDistance,
  ensureFaceApiReady,
} from "../services/face-api-service.js";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function drawImageOnCanvas(canvasId, dataUrl) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    return Promise.resolve();
  }
  const ctx = canvas.getContext("2d");
  const img = new Image();
  return new Promise((resolve, reject) => {
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve();
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export function registerManualFaceComparisonTest({
  slots,
  compareButtonId,
  compareStatusId,
}) {
  const compareButton = document.getElementById(compareButtonId);
  if (!compareButton || !slots?.length) {
    return () => {};
  }

  const slotState = new Map();
  const inputTeardowns = [];

  function updateCompareState() {
    const ready = slots.every((slot) => slotState.get(slot.key)?.hasFace);
    compareButton.disabled = !ready;
    if (!ready) {
      setTextContent(compareStatusId, "Upload two images with detectable faces to compare.");
    }
  }

  async function analyzeSlot(slot, dataUrl) {
    slotState.set(slot.key, { base64: dataUrl, hasFace: false, descriptor: null });
    updateCompareState();
    try {
      setTextContent(slot.statusId, "Preparing image...");
      await drawImageOnCanvas(slot.canvasId, dataUrl);
      setTextContent(slot.statusId, "Loading face-api models...");
      await ensureFaceApiReady();
      const canvas = document.getElementById(slot.canvasId);
      if (!canvas) {
        throw new Error(`Canvas ${slot.canvasId} not found.`);
      }
      setTextContent(slot.statusId, "Detecting face...");
      const { descriptor } = await analyzeFaceFromCanvas(canvas);
      if (!descriptor) {
        setTextContent(slot.statusId, "No face detected. Try a different image.");
        slotState.set(slot.key, { base64: dataUrl, hasFace: false, descriptor: null });
        return;
      }
      slotState.set(slot.key, {
        base64: dataUrl,
        hasFace: true,
        descriptor,
      });
      setTextContent(slot.statusId, "Face analyzed. Ready for comparison.");
    } catch (error) {
      console.error("[manual-face-comparison] analyze error", error);
      setTextContent(slot.statusId, "Unable to process this image.");
      slotState.set(slot.key, { base64: dataUrl, hasFace: false, descriptor: null });
    } finally {
      updateCompareState();
    }
  }

  slots.forEach((slot) => {
    const input = document.getElementById(slot.inputId);
    if (!input) {
      return;
    }
    const handler = async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      setTextContent(slot.statusId, `Loading ${file.name}...`);
      try {
        const dataUrl = await readFileAsDataUrl(file);
        await analyzeSlot(slot, dataUrl);
      } catch (error) {
        console.error("[manual-face-comparison] file load error", error);
        setTextContent(slot.statusId, "Unable to load the selected image.");
      }
    };
    input.addEventListener("change", handler);
    inputTeardowns.push(() => input.removeEventListener("change", handler));
  });

  async function handleCompare() {
    const missingSlot = slots.find((slot) => !slotState.get(slot.key)?.hasFace);
    if (missingSlot) {
      setTextContent(
        compareStatusId,
        `Upload a valid face image for ${missingSlot.label} before comparing.`,
      );
      return;
    }
    try {
      compareButton.disabled = true;
      setTextContent(compareStatusId, "Computing face descriptors...");
      const [firstSlot, secondSlot] = slots.map((slot) => slotState.get(slot.key));
      const firstDescriptor = firstSlot?.descriptor;
      const secondDescriptor = secondSlot?.descriptor;
      if (!firstDescriptor?.length || !secondDescriptor?.length) {
        setTextContent(compareStatusId, "Unable to read face descriptors. Re-upload both images.");
        return;
      }
      const distance = computeFaceDistance(firstDescriptor, secondDescriptor);
      if (!Number.isFinite(distance)) {
        setTextContent(compareStatusId, "Received invalid distance from face-api. Retry with different photos.");
        return;
      }
      const threshold = 0.6;
      const passed = distance < threshold;
      const message = passed
        ? `Match OK ✔️ distance = ${distance.toFixed(3)}`
        : `Faces do not match ❌ distance = ${distance.toFixed(3)}`;
      setTextContent(compareStatusId, message);
    } catch (error) {
      console.error("[manual-face-comparison] compare error", error);
      setTextContent(compareStatusId, "Unable to compare the selected faces.");
    } finally {
      updateCompareState();
    }
  }

  compareButton.addEventListener("click", handleCompare);
  updateCompareState();

  return () => {
    compareButton.removeEventListener("click", handleCompare);
    inputTeardowns.forEach((dispose) => dispose());
  };
}
