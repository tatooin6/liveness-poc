#### [>> Leer Versión en Español <<](./README_ES.md)

[![Project Status](https://img.shields.io/badge/status-active-success.svg)](#liveness-poc)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18.0.0-339933?logo=node.js&logoColor=white)](#local-development)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#local-development)

# Liveness PoC

This proof of concept demonstrates a browser-based identity verification flow that combines manual face comparison, document analysis, and live liveness capture. The UI is implemented in vanilla JavaScript/HTML/CSS so it can run without a bundler, making it easy to prototype integrations against [face-api.js](https://justadudewhohacks.github.io/face-api.js/docs/index.html) and the [FacePlugin SDK](https://github.com/Faceplugin-ltd/FaceRecognition-LivenessDetection-Javascript).

## Contents

- [Liveness PoC](#liveness-poc)
  - [Contents](#contents)
  - [Features](#features)
  - [Technology Stack](#technology-stack)
  - [Key Libraries \& Dependencies](#key-libraries--dependencies)
    - [Model Weights](#model-weights)
  - [Project Structure](#project-structure)
  - [Local Development](#local-development)
    - [Optional: Rebuild FacePlugin SDK](#optional-rebuild-faceplugin-sdk)
  - [Face Comparison Workflows](#face-comparison-workflows)
    - [Manual Upload (`src/index.html`)](#manual-upload-srcindexhtml)
    - [Proof of Life contrasted with Identity document (`src/basic-liveness.html`)](#proof-of-life-contrasted-with-identity-document-srcbasic-livenesshtml)
    - [Facial Expressions Detection (`src/liveness.html`)](#facial-expressions-detection-srclivenesshtml)
  - [Demos](#demos)
  - [Troubleshooting](#troubleshooting)
  - [Additional Notes](#additional-notes)
    - [To be added](#to-be-added)
    - [⚠️ SECURITY WARNING](#️-security-warning)

## Features

- **Manual face comparison** – Upload two photos, render them onto canvases, and compare descriptors using face-api.js.
- **Document pipeline** – Upload a document photo, run detection + landmarking (via the legacy FacePlugin SDK) and expose the result to other flows.
- **Live photo capture** – Capture a frame from the user’s webcam to compare against the document.
- **Live liveness** – Continuous webcam inference (FacePlugin) that checks for liveness events.
- **Shared state management** – `comparison-state.js` keeps document detections and captured photos synchronized across features.

## Technology Stack

- **Runtime:** Node.js (scripts), modern browsers (app)
- **Language:** Vanilla JavaScript (ES modules), HTML5, CSS3
- **Model Inference:** face-api.js (face detection, landmarks, descriptors) and FacePlugin (existing SDK used by other flows)
- **Serving:** Static HTTP server (no bundler required)

## Key Libraries & Dependencies

| Dependency                       | Purpose                                                                                                                                               |
|----------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| `face-api.js`                    | Browser-focused face detection, landmarking, and descriptor extraction used in the new comparison flows.                                              |
| `faceplugin-face-recognition-js` | Legacy FacePlugin SDK bundle that exposes detection, landmarks, feature extraction, and OpenCV helpers. Still used by document and liveness features. |
| `http-server` (via `npx`)        | Quick static server to host the project locally.                                                                                                      |

### Model Weights

- **face-api.js** models are expected in `/weights`. The loader first tries the local folder and automatically falls back to the official CDN (`https://justadudewhohacks.github.io/face-api.js/models`). Place the `ssd_mobilenetv1`, `face_landmark_68`, and `face_recognition` manifests/shards in `weights/` to run fully offline.
- **FacePlugin** models live under `model/` and are consumed by the existing SDK.

## Project Structure

```
liveness-poc/
├── js/                        # Prebuilt OpenCV assets
├── model/                     # FacePlugin ONNX models
├── public/                    # Extra static libs (empty placeholder)
├── scripts/                   # Node scripts (e.g., FacePlugin SDK builder)
├── src/
│   ├── assets/                # Images, fonts
│   ├── basic-liveness.html    # Demo page with live camera flows
│   ├── index.html             # Manual face comparison landing page
│   ├── scripts/
│   │   ├── config/            # Global configuration constants
│   │   ├── features/          # Feature modules (manual comparison, document processing, etc.)
│   │   └── services/          # Shared utilities: state, DOM helpers, SDK wrappers, face-api service
│   └── styles/                # CSS styling
├── weights/                   # face-api.js model shards (add manifests)
├── package.json
└── README.md
```

## Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Build the liveness SDK**
   ```bash
   npm run build:sdk
   ```
3. **Start the static server**
   ```bash
   npm run start:dev
   ```
   If default port was not modified open: 
    - `http://localhost:4173/src/index.html` manual comparison.
    - `http://localhost:4173/src/basic-liveness.html` for the live demo.
    - `http://localhost:4173/src/liveness.html` for face expression recognition.
4. **Browser requirements**
   - Modern Chromium/Firefox (must support ES modules).
   - Allow camera permissions for live flows.

### Optional: Rebuild FacePlugin SDK

If you modify the official FacePlugin sources inside `scripts/`, rebuild the browser bundle:

```bash
npm run build:sdk
```

## Face Comparison Workflows

### Manual Upload (`src/index.html`)

1. Upload two images.
2. Each upload renders to a `<canvas>` and runs `analyzeFaceFromCanvas` (face-api.js).
3. Once both descriptors are available, click **Compare Faces**.
4. `manual-face-comparison.js` computes Euclidean distance and displays the verdict (`threshold = 0.6`).

### Proof of Life contrasted with Identity document (`src/basic-liveness.html`)

1. Analyze a document in the document-processing panel (basic-liveness page). This stores a snapshot in `comparison-state`.
2. Capture a live photo via the webcam capture module.
3. When both snapshots exist, clicking **Compare**:
   - Ensures face-api.js models are loaded.
   - Builds canvases from the base64 snapshots.
   - Runs detection, landmarks, and descriptors using face-api.js.
   - Calculates Euclidean distance and updates the status message with pass/fail feedback.

### Facial Expressions Detection (`src/liveness.html`)

1. Hold the expression shown in the right-hand panel for 5 seconds, or until the expression's progress bar is full, to mark it as complete.
2. Continue with the next expression shown until all progress bars are full.

> All flows share the `face-api-service` to load models (with fallback between local weights and CDN) and compute descriptor distances.

## Demos

- **Face Comparison Playground (`src/index.html`)**
  - Upload two identity documents in image format that contain a face. face-api.js will detect the presence of faces in the images.
  - Use face-api.js to compare two faces and check if they belong to the same person.

- **Liveness & Live Photo Capture Comparison (`src/basic-liveness.html`)**
  - FacePlugin handles video capture, detection, and liveness inference.
  - It performs face detection and creates a PNG snapshot for further processing.
  - Upload an identity document that contains a face photograph, face-api.js will detect a face recognition on the uploaded file.
  - A comparison is made between the captured face and the recognized face on the identity document to verify that it is the same person.

- **Face Expression Detection (`src/liveness.html`)**
  - The user is presented with a sequence of facial expression prompts.
  - They must maintain the requested expression for a certain amount of time to verify their health.
  - Once all requested expressions have been completed, the user's health is confirmed.

These modules still rely on the FacePlugin SDK because they require OpenCV integration and other proprietary behaviors. They can be refactored to face-api.js in future iterations.

## Troubleshooting

| Issue                             | Resolution                                                                                                                         |
|-----------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
| **Uploaded images never display** | Confirm `face-api.js` script tag loads (check browser console) and that files are valid images.                                    |
| **Model loading errors**          | Make sure `weights/` contains the manifest files. If not available, ensure internet access so the fallback CDN can be reached.     |
| **Compare button disabled**       | Both document snapshot and captured/live photo must exist. If a document was re-uploaded, re-run the analysis to repopulate state. |
| **Camera permission denied**      | Reload the page and allow permissions; some browsers require HTTPS for `getUserMedia`.                                             |

## Additional Notes

- The project intentionally avoids bundlers so that each module can be inspected directly in the browser; ES module paths reference relative files.
- Styling lives in `src/styles/main.css` and is shared between demos.
- Because the FacePlugin SDK and OpenCV assets are heavy, running the project via `http-server` is recommended to avoid CORS issues with file URLs.

This README should serve as the single reference for onboarding, running, and extending the Liveness PoC. **For deeper feature-specific logic, explore the files within `src/scripts/features/` and `src/scripts/services/`**.

### To be added

- Language selection implementation.
- Dialogue detection. Check [whisper](https://github.com/openai/whisper).
- Establish fallback for missing device permissions (webcam).
- OCR (Optical Character Recognition) engine for the extraction of text from presented personal document.
- Add Unit Tests.

---
### ⚠️ SECURITY WARNING

Proof of Concept (PoC) Code - Use At Your Own Risk

This project is a Proof of Concept and has known security vulnerabilities. 
**It is not intended for production use.**
This project is provided "as is" **for demonstration purposes only**.

---