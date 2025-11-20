const photoListeners = new Set();
const documentListeners = new Set();

const state = {
  capturedPhoto: null,
  documentDetection: null,
};

function notify(listeners, value) {
  listeners.forEach((listener) => {
    try {
      listener(value);
    } catch (error) {
      console.error("[comparison-state] listener error", error);
    }
  });
}

export function setCapturedPhoto(dataUrl) {
  state.capturedPhoto = dataUrl;
  notify(photoListeners, dataUrl);
}

export function clearCapturedPhoto() {
  setCapturedPhoto(null);
}

export function onCapturedPhotoChange(listener) {
  photoListeners.add(listener);
  return () => photoListeners.delete(listener);
}

export function setDocumentDetection(payload) {
  state.documentDetection = payload;
  notify(documentListeners, payload);
}

export function clearDocumentDetection() {
  setDocumentDetection(null);
}

export function onDocumentDetectionChange(listener) {
  documentListeners.add(listener);
  return () => documentListeners.delete(listener);
}

export function getComparisonState() {
  return {
    capturedPhoto: state.capturedPhoto,
    documentDetection: state.documentDetection,
  };
}
