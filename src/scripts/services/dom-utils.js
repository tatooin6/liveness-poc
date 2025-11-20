export function getElementOrThrow(id) {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing required element: #${id}`);
  }
  return el;
}

export function setTextContent(id, text) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = text;
  }
}

export function createFileInputObserver(inputId, onFile) {
  const input = document.getElementById(inputId);
  if (!input) {
    console.warn(`[dom-utils] No input with id ${inputId}`);
    return () => {};
  }
  const handler = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      onFile(file);
    }
  };
  input.addEventListener("change", handler);
  return () => input.removeEventListener("change", handler);
}
