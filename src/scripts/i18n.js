const translations = {
  en: {
    index: {
      "title-main": "Face Comparison Playground",
      "subtitle-main": "Upload two portraits to run detection, landmarks, feature extraction, and match results through face-api.js.",
      "section-upload-title": "1. Upload the photos you want to compare",
      "image-a-title": "Image A",
      "image-b-title": "Image B",
      "select-image-a": "Select an image",
      "select-image-b": "Select an image",
      compareUploadsButton: "Compare Faces",
    },
    basic: {
      "page-title": "Liveness & Live Photo Capture Comparison (Demo)",
      "page-description": "This PoC hosts a set of vertical slices (document intake, liveness, comparison, inset tooling) built on top of faceplugin-face-recognition-js.",
      "live-section-title": "Live Liveness Detection",
      "live-section-description": "Start the camera, run models on a cadence, and visualize bounding boxes in real time.",
      "live-tip": "Tip: keep your face within ~1m of the webcam and use even lighting.",
      "document-section-title": "Document Intake & Face Comparison",
      "document-section-description": "Upload ID images, detect document faces, then compare them with a live capture.",
      "document-upload-label": "Select document image",
      "document-status": "No document uploaded yet.",
      "document-analyze": "Analyze Document",
      "compare-live-face": "Compare against capture",
      "start-liveness": "Start",
      "stop-liveness": "Stop",
      capture: "Capture",
      "live-status": "Click start to begin. Click Capture to take a picture.",
    },
    expressions: {
      "page-title": "Face Expression Detection (Demo)",
      "start-liveness": "Start Liveness",
      "expression-status": "Expression: click start to begin detection.",
      "expression-checklist-title": "Expression Checklist",
      "expression-tip-prefix": "Hold a",
      "expression-tip-suffix": "expression for 5 seconds to mark it as completed.",
      "label-happy": "Happy",
      "label-sad": "Sad",
      "label-angry": "Angry",
      "label-fearful": "Fearful",
      "label-disgusted": "Disgusted",
      "label-surprised": "Surprised",
    },
  },
  es: {
    index: {
      "title-main": "Comparación de Rostros",
      "subtitle-main": "Sube dos retratos para ejecutar detección, puntos faciales, extracción de características y comparar resultados con face-api.js.",
      "section-upload-title": "1. Sube las fotos que quieres comparar",
      "image-a-title": "Imagen A",
      "image-b-title": "Imagen B",
      "select-image-a": "Selecciona una imagen",
      "select-image-b": "Selecciona una imagen",
      compareUploadsButton: "Comparar rostros",
    },
    basic: {
      "page-title": "Comparación de Prueba de Vida y Captura en Vivo (Demo)",
      "page-description": "Este PoC incluye flujos verticales (Recepción de documento, liveness, comparación, herramientas) construidos sobre faceplugin-face-recognition-js.",
      "live-section-title": "Detección de Liveness en Vivo",
      "live-section-description": "Inicia la cámara, ejecuta los modelos de forma periódica y visualiza las cajas en tiempo real.",
      "live-tip": "Tip: mantén tu rostro a ~1m de la cámara y usa iluminación uniforme.",
      "document-section-title": "Recepción de documentos y comparación de rostros",
      "document-section-description": "Sube imágenes de identificación, detecta rostros en el documento y compáralos con una captura en vivo.",
      "document-upload-label": "Selecciona imagen del documento",
      "document-status": "No se ha cargado un documento aun",
      "document-analyze": "Analizar documento",
      "compare-live-face": "Comparar con la captura",
      "start-liveness": "Iniciar",
      "stop-liveness": "Detener",
      capture: "Capturar",
      "live-status": "Haz clic en iniciar. Haz clic en Capturar para tomar una foto.",
    },
    expressions: {
      "page-title": "Detección de Expresiones Faciales (Demo)",
      "start-liveness": "Iniciar liveness",
      "expression-status": "Expresión: haz clic en iniciar para comenzar la detección.",
      "expression-checklist-title": "Lista de expresiones",
      "expression-tip-prefix": "Mantén una",
      "expression-tip-suffix": "expresión durante 5 segundos para marcarla como completada.",
      "label-happy": "Feliz",
      "label-sad": "Triste",
      "label-angry": "Enojado",
      "label-fearful": "Asustado",
      "label-disgusted": "Disgustado",
      "label-surprised": "Sorprendido",
    },
  },
};

function normalizeLang(langCode) {
  if (!langCode) return "es";
  return langCode.toLowerCase().startsWith("es") ? "es" : "en";
}

function updateElements(pageTranslations) {
  Object.entries(pageTranslations || {}).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value;
    }
  });
}

export function applyTranslations(langCode, pageKey) {
  const lang = normalizeLang(langCode);
  const pageTranslations = translations[lang]?.[pageKey];
  updateElements(pageTranslations);
  document.documentElement.lang = lang;
  try {
    localStorage.setItem("preferredLang", lang);
  } catch (error) {
    console.warn("Unable to persist language preference", error);
  }
  return lang;
}

export function initI18n({ pageKey, controlId }) {
  const storedLang = (() => {
    try {
      return localStorage.getItem("preferredLang");
    } catch {
      return null;
    }
  })();
  const initialLang = applyTranslations(storedLang || navigator.language || "es", pageKey);
  const select = document.getElementById(controlId);
  if (select) {
    select.value = initialLang;
    select.addEventListener("change", (event) => {
      const selected = event.target.value;
      const lang = applyTranslations(selected, pageKey);
      select.value = lang;
    });
  }
  return initialLang;
}

export { translations };
