// Loads environment files for standalone scripts (like Next.js does).
// Default: .env.local and .env. With ENV_FILE=… only that file is used, e.g. to run
// the setup against production without mixing in local development values:
//   ENV_FILE=.env.vercel npm run db:setup
const files = process.env.ENV_FILE ? [process.env.ENV_FILE] : [".env.local", ".env"];
for (const file of files) {
  try {
    process.loadEnvFile(file);
  } catch {
    if (process.env.ENV_FILE) throw new Error(`Kan ${file} niet lezen.`);
  }
}
