import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const rootDir = process.cwd();

console.log("======================================");
console.log("  Komari Theme Package Builder");
console.log("======================================");

// 1. Build project
console.log("\nBuilding project...");
execSync("npm run build", { stdio: "inherit" });

// 2. Verify files
console.log("\nVerifying required files...");
const requiredFiles = ["preview.webp", "komari-theme.json", "dist"];
for (const file of requiredFiles) {
  if (!existsSync(path.join(rootDir, file))) {
    console.error(`[ERROR] Required file or directory missing: ${file}`);
    process.exit(1);
  }
}

// 3. Read theme metadata
let themeShort = "theme";
try {
  const themeJson = JSON.parse(readFileSync(path.join(rootDir, "komari-theme.json"), "utf-8"));
  if (themeJson.short) {
    themeShort = themeJson.short;
  }
} catch (e) {
  console.warn("Could not parse komari-theme.json, using default name.");
}

// 4. Output zip name
const now = new Date();
const dateStr = `${String(now.getFullYear()).slice(-2)}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
let commitHash = "dev";
try {
  commitHash = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
} catch {
  // ignore
}

const zipFileName = `${themeShort}-v${dateStr}-${commitHash}.zip`;
const outputZip = path.join(rootDir, zipFileName);

// 5. Create zip package
console.log(`\nPackaging theme into ${zipFileName}...`);

const isWindows = process.platform === "win32";
if (isWindows) {
  // Use PowerShell Compress-Archive
  const psCommand = `powershell -NoProfile -Command "Compress-Archive -Path 'preview.webp', 'komari-theme.json', 'dist' -DestinationPath '${zipFileName}' -Force"`;
  execSync(psCommand, { stdio: "inherit" });
} else {
  // Use Unix zip
  execSync(`zip -r "${zipFileName}" preview.webp komari-theme.json dist/`, { stdio: "inherit" });
}

console.log(`\nTheme package created successfully: ${outputZip} 🎉`);
console.log("You can upload this ZIP file directly in Komari's Theme Management settings.");
