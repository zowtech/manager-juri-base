#!/usr/bin/env node
// Garante production
process.env.NODE_ENV = process.env.NODE_ENV || "production";

// Mais logs e tolerância a erros não fatais
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
});
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

// Tenta subir a app e loga qualquer erro de boot sem encerrar
(async () => {
  try {
    console.log("▶️  Booting app… NODE_ENV:", process.env.NODE_ENV);
    await import("./dist/index.js");
  } catch (err) {
    console.error("Falha ao iniciar a app:", err);
  }
})();
