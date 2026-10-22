// Copies MediaPipe's WebAssembly files into /public so the browser loads them from our own server.
import { cpSync, mkdirSync, existsSync } from "node:fs";
const src = "node_modules/@mediapipe/tasks-vision/wasm";
if (existsSync(src)) {
  mkdirSync("public/mediapipe", { recursive: true });
  cpSync(src, "public/mediapipe", { recursive: true });
}
