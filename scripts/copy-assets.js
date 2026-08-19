import fs from "fs";
import path from "path";

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else if (exists) {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }
}

const clientDir = path.resolve(process.cwd(), "dist/client");
const staticDir = path.resolve(process.cwd(), ".vercel/output/static");

console.log(`[copy-assets] Copying ${clientDir} -> ${staticDir}...`);
if (fs.existsSync(clientDir)) {
  copyRecursiveSync(clientDir, staticDir);
  console.log("[copy-assets] Static assets successfully synchronized to .vercel/output/static!");
} else {
  console.error(`[copy-assets] Source directory ${clientDir} does not exist!`);
  process.exit(1);
}

// Fix Windows symlinks in .vercel/output/functions
const functionsDir = path.resolve(process.cwd(), ".vercel/output/functions");
const serverFuncDir = path.join(functionsDir, "__server.func");
const dotFuncPath = path.join(functionsDir, "[...].func");

if (fs.existsSync(dotFuncPath)) {
  try {
    const lstat = fs.lstatSync(dotFuncPath);
    if (lstat.isSymbolicLink()) {
      fs.unlinkSync(dotFuncPath);
      if (fs.existsSync(serverFuncDir)) {
        copyRecursiveSync(serverFuncDir, dotFuncPath);
        console.log("[copy-assets] Replaced Windows symlink [...].func with real directory copy!");
      }
    }
  } catch (err) {
    console.warn("[copy-assets] Could not fix [...].func symlink:", err);
  }
}
