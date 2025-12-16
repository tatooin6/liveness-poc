#### [>> Read English Version <<](./README_ES.md)

[![Estado del Proyecto](https://img.shields.io/badge/status-activo-success.svg)](#sistema-de-prueba-de-vida)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18.0.0-339933?logo=node.js&logoColor=white)](#desarrollo-local)
[![Licencia MIT](https://img.shields.io/badge/licencia-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Contribuciones Bienvenidas](https://img.shields.io/badge/contribuciones-bienvenidas-brightgreen.svg)](#desarrollo-local)

# Sistema de Prueba de Vida
## Prueba de Concepto 

Esta prueba de concepto demuestra un flujo de verificación de identidad basado en navegador que combina la comparación manual de rostros, el análisis de documentos y la captura de vida en vivo. La interfaz de usuario está implementada en JavaScript/HTML/CSS estándar, por lo que puede ejecutarse sin un empaquetador, lo que facilita la creación de prototipos de integraciones con [face-api.js](https://justadudewhohacks.github.io/face-api.js/docs/index.html) y [SDK de FacePlugin](https://github.com/Faceplugin-ltd/FaceRecognition-LivenessDetection-Javascript).

## Contenido

- [Sistema de Prueba de Vida](#sistema-de-prueba-de-vida)
  - [Prueba de Concepto](#prueba-de-concepto)
  - [Contenido](#contenido)
  - [Características](#características)
  - [Stack Tecnológico](#stack-tecnológico)
  - [Bibliotecas y Dependencias](#bibliotecas-y-dependencias)
  - [Model Weights](#model-weights)
  - [Estructura del Proyecto](#estructura-del-proyecto)
  - [Desarrollo Local](#desarrollo-local)
  - [Opcional: Reconstruir el SDK de FacePlugin](#opcional-reconstruir-el-sdk-de-faceplugin)
  - [Flujos de Trabajo de Comparación Facial](#flujos-de-trabajo-de-comparación-facial)
    - [Carga manual (`src/index.html`)](#carga-manual-srcindexhtml)
    - [Prueba de Vida contrastado con documento de Identidad (`src/basic-liveness.html`)](#prueba-de-vida-contrastado-con-documento-de-identidad-srcbasic-livenesshtml)
    - [Detección de Expresiones Faciales (`src/liveness.html`)](#detección-de-expresiones-faciales-srclivenesshtml)
  - [Demos](#demos)
  - [Solución de problemas](#solución-de-problemas)
  - [Notas adicionales](#notas-adicionales)
    - [Por Agregar](#por-agregar)
    - [⚠️ ADVERTENCIA DE SEGURIDAD](#️-advertencia-de-seguridad)

## Características

- **Comparación manual de rostros**: Sube dos fotos, renderízalas en lienzos y compara descriptores con face-api.js.
- **Procesamiento de documentos**: Sube una foto de un documento, ejecuta la detección y el marcado de puntos de referencia (mediante el SDK heredado de FacePlugin) y expone el resultado a otros flujos.
- **Captura de fotos en vivo**: Captura un fotograma de la cámara web del usuario para compararlo con el documento.
- **Vivacidad en vivo**: Inferencia continua de la cámara web (FacePlugin) que verifica eventos de vitalidad.
- **Gestión de estados compartidos**: `comparison-state.js` mantiene sincronizadas las detecciones de documentos y las fotos capturadas en todas las funciones.

## Stack Tecnológico


- **Entorno de Ejecución (runtime):** Node.js (scripts), navegadores modernos (app)
- **Lenguajes de Programación:** Vanilla JavaScript (módulos ES), HTML5, CSS3
- **Inferencia del Modelo:** face-api.js (detección facial, puntos de referencia, descriptores) y FacePlugin (SDK existente utilizado por otros flujos)
- **Servidor:** Servidor HTTP estático (no requiere empaquetador/bundler)

## Bibliotecas y Dependencias

| Dependencia                      | Propósito                                                                                                                                                                                                  |
|----------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `face-api.js`                    | Detección facial, puntos de referencia y extracción de descriptores centrados en el navegador, utilizados en los nuevos flujos de comparación.                                                             |
| `faceplugin-face-recognition-js` | Paquete SDK de FacePlugin heredado que expone la detección, los puntos de referencia, la extracción de características y los ayudantes de OpenCV. Aún se utiliza en las funciones de documentos y de vida. |
| `http-server` (vía `npx`)        | Servidor estático rápido para alojar el proyecto localmente.                                                                                                                                               |


## Model Weights

- **face-api.js** se esperan en `/weights`. El cargador primero prueba la carpeta local y automáticamente recurre a la CDN oficial (`https://justadudewhohacks.github.io/face-api.js/models`). Debe revisarse que existan los manifests/shards `ssd_mobilenetv1`, `face_landmark_68` y `face_recognition` en `weights/` para ejecutar la comparación de rostros.
- **FacePlugin** se encuentran en `model/` y son utilizados por el SDK existente.

## Estructura del Proyecto

```
liveness-poc/
├── js/                         # Recursos OpenCV prediseñados
├── model/                      # Modelos ONNX de FacePlugin
├── public/                     # Bibliotecas estáticas adicionales (marcador vacío)
├── scripts/                    # Scripts de Node (p. ej., compilador del SDK de FacePlugin)
├── src/
│   ├── assets/                 # Imágenes, fuentes, etc.
│   ├── basic-liveness.html     # Página de demostración con flujos de cámara en vivo
│   ├── index.html              # Página de inicio para la comparación manual de rostros
│   ├── scripts/
│   │   ├── config/             # Configuración global Constantes
│   │   ├── features/           # Módulos de funciones (comparación manual, procesamiento de documentos, etc.)
│   │   └── services/           # Utilidades compartidas: estado, ayudantes DOM, envoltorios del SDK, servicio face-api
│   └── styles/                 # Estilos CSS
├── weights/                    # Fragmentos del modelo face-api.js (añadir manifiestos)
├── package.json
└── README.md
```

## Desarrollo Local


1. **Instalar dependencias**
    ```bash
    npm install
    ```
2. **Construir el SDK de Liveness**
    ```bash
    npm run build:sdk
    ```
3. **Iniciar el servidor estático**
    ```bash
    npm run start:dev
    ```
    Si no se modificó el puerto predeterminado, abra:
      - `http://localhost:4173/src/index.html` para realizar comparación manual.
      - `http://localhost:4173/src/basic-liveness.html` para la demostración en vivo.
      - `http://localhost:4173/src/liveness.html` para el reconocimiento de expresiones faciales.
4. **Requisitos del navegador**
   - Chromium/Firefox moderno (debe ser compatible con los módulos ES).
   - Permitir permisos de cámara para transmisiones en vivo.

## Opcional: Reconstruir el SDK de FacePlugin

Si se modifica el código fuente oficial de FacePlugin dentro de `scripts/`, se debe reconstruir el paquete del navegador con:

```bash
npm run build:sdk
```

## Flujos de Trabajo de Comparación Facial

### Carga manual (`src/index.html`)

1. Suba dos imágenes.
2. Cada carga se renderiza en un `<canvas>` y ejecuta `analyzeFaceFromCanvas` (face-api.js).
3. Una vez que ambos descriptores estén disponibles, haga clic en **Comparar rostros**.
4. `manual-face-comparison.js` calcula la distancia euclidiana y muestra el veredicto (`threshold = 0.6`).

### Prueba de Vida contrastado con documento de Identidad (`src/basic-liveness.html`)

1. Analice un documento en el panel de procesamiento de documentos (página basic-liveness). Esto almacena una instantánea en `comparison-state`.
2. Capture una foto en vivo mediante el módulo de captura de cámara web.
3. Cuando ambas instantáneas existen, al hacer clic en **Comparar**:
   - Se asegura la carga de los modelos de face-api.js.
   - Se crean lienzos a partir de las instantáneas base64.
   - Se ejecuta la detección, los puntos de referencia y los descriptores con face-api.js.
   - Se calcula la distancia euclidiana y se actualiza el mensaje de estado con la respuesta de aprobado/reprobado.

### Detección de Expresiones Faciales (`src/liveness.html`)

1. Mantenga la expresión indicada en el panel de la derecha durante 5 segundos o hasta que se complete la barra de progreso de la expresión para marcarla como completada.
2. Continue con la siguiente expresión indicada hasta completar todas las barras de progreso.

Todos los flujos comparten el servicio `face-api-service` para cargar modelos (con respaldo entre ponderaciones locales y CDN) y calcular las distancias de los descriptores.

## Demos

- **Face Comparison Playground (`/src/index.html`)**
  - Sube dos documentos de identidad en formato de imagen que contengan un rostro face-api.js va a detectar la presencia de rostros en las imágenes.
  - Utiliza face-api.js para comparar dos rostros y comprobar si pertenecen a la misma persona.
- **Liveness & Live Photo Capture Comparison (`/src/basic-liveness.html`)**
  - FacePlugin gestiona la captura de vídeo, la detección y la inferencia de vida.
  - Realiza la detección facial y crea una instantánea PNG para su posterior procesamiento.
  - Sube un documento de identidad que contenga una fotografía facial; face-api.js detectará el reconocimiento facial en el archivo subido.
  - Se realiza una comparación entre el rostro capturado y el rostro reconocido en el documento de identidad para verificar que se trata de la misma persona.
- **Face Expression Detection (`/src/liveness.html`)**
  - Se presenta al usuario una secuencia de indicaciones de expresión facial.
  - Deben mantener la expresión solicitada durante un tiempo determinado para verificar su estado de salud.
  - Una vez completadas todas las expresiones solicitadas, se confirma el estado de salud del usuario.

Estos módulos aún dependen del SDK de FacePlugin porque requieren la integración con OpenCV y otros comportamientos propietarios. Se pueden refactorizar a face-api.js en futuras iteraciones.

## Solución de problemas

| Problema                                   | Resolución                                                                                                                                                                      |
|--------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Las imágenes subidas nunca se muestran** | Confirme que la etiqueta del script `face-api.js` se cargue (verifique la consola del navegador) y que los archivos sean imágenes válidas.                                      |
| **Errores al cargar el modelo**            | Asegúrese de que `weights/` contenga los archivos de manifiesto. Si no está disponible, asegúrese de tener acceso a internet para poder acceder a la CDN de respaldo.           |
| **Botón de comparación deshabilitado**     | Deben existir tanto el archivo del documento como la foto capturada/en vivo. Si se volvió a subir un documento, vuelva a ejecutar el análisis para volver a rellenar el estado. |
| **Permiso de cámara denegado**             | Vuelva a cargar la página y permita los permisos; algunos navegadores requieren HTTPS para `getUserMedia`.                                                                      |


## Notas adicionales

- El proyecto evita intencionalmente los empaquetadores para que cada módulo pueda inspeccionarse directamente en el navegador; las rutas de los módulos ES hacen referencia a archivos relativos.
- Los estilos se encuentran en `src/styles/main.css` y se comparten entre las demostraciones.
- Dado que el SDK de FacePlugin y los recursos de OpenCV son pesados, se recomienda ejecutar el proyecto mediante `http-server` para evitar problemas de CORS con las URL de los archivos.

Este archivo README debe servir como referencia única para la integración, ejecución y extensión de la PoC de Liveness. **Para una lógica más detallada de las características, explore los archivos `src/scripts/features/` y `src/scripts/services/`**.

### Por Agregar

- Implementación de seleccion de idiomas.
- Detección de dialogo. Revisar [whisper](https://github.com/openai/whisper).
- Establecer un respaldo para los permisos faltantes del dispositivo (cámara web).
- Motor OCR (Reconocimiento óptico de caracteres) para la extracción de texto de un documento personal presentado.
- Agregar pruebas unitarias.

---
### ⚠️ ADVERTENCIA DE SEGURIDAD

Código de prueba de concepto (PoC): úselo bajo su propio riesgo

Este proyecto es una prueba de concepto y tiene vulnerabilidades de seguridad conocidas.
**No está diseñado para uso en producción.**
Este proyecto se proporciona "tal cual" **solo con fines de demostración**.

---