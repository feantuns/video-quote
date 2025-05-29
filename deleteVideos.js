const fs = require("fs");
const path = require("path");

const baseDir = path.join(__dirname, "output");

function deleteMP4Files(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      deleteMP4Files(fullPath); // Recurse into subfolders
    } else if (item.isFile() && path.extname(item.name) === ".mp4") {
      fs.unlinkSync(fullPath);
      console.log(`Deleted: ${fullPath}`);
    }
  }
}

deleteMP4Files(baseDir);
console.log("All .mp4 files deleted.");
