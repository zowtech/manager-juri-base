// scripts/gen-password-hash.js
// Gera hash scrypt compatível com Node crypto (padrão do seu backend)

import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// >>>>>> Troque aqui a senha desejada do admin:
const PASSWORD = "admin123";  // ou outra

async function main() {
  const salt = randomBytes(16); // 16 bytes de salt
  const keyLen = 64;            // 64 bytes
  const derived = await scryptAsync(PASSWORD, salt, keyLen);
  const out = `${salt.toString("hex")}:${Buffer.from(derived).toString("hex")}`;
  console.log(out);
}
main().catch(console.error);
