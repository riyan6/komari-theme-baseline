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
  // 必须用 bsdtar 生成标准 zip：Windows 的 Compress-Archive 会把条目写成
  // 反斜杠路径（dist\index.html），Komari 在 Linux 上解压会找不到 dist/index.html，
  // 导致主题加载失败回退默认主题。tar -a 会生成正斜杠路径的标准 zip。
  execSync(`tar -a -c -f "${zipFileName}" preview.webp komari-theme.json dist`, { stdio: "inherit" });
} else {
  // Use Unix zip
  execSync(`zip -r "${zipFileName}" preview.webp komari-theme.json dist/`, { stdio: "inherit" });
}

console.log(`\nTheme package created successfully: ${outputZip} 🎉`);
console.log("You can upload this ZIP file directly in Komari's Theme Management settings.");
