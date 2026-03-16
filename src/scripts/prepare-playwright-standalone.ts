import fs from "node:fs";
import path from "node:path";

function copyIntoStandalone(sourceRelativePath: string, targetRelativePath: string) {
  const sourcePath = path.resolve(process.cwd(), sourceRelativePath);
  if (!fs.existsSync(sourcePath)) {
    return;
  }

  const targetPath = path.resolve(process.cwd(), ".next/standalone", targetRelativePath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.cpSync(sourcePath, targetPath, { recursive: true, force: true });
}

copyIntoStandalone(".next/static", ".next/static");
copyIntoStandalone("public", "public");
