import { setTextContent } from "./dom-utils.js";

export function createStatusChannel(elementId) {
  return {
    update(message) {
      setTextContent(elementId, message);
      console.log(`[status] ${message}`);
    },
  };
}
