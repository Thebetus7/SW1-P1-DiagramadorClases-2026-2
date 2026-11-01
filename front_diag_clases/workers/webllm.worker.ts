import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

// Handler oficial de WebLLM para procesamiento asíncrono en Web Worker con WebGPU
const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};
