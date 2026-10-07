// Loads .env.local and .env (like Next.js does) for standalone scripts.
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // File is optional.
  }
}
