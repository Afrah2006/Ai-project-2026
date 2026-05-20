const fs = require('fs');
const path = require('path');

const websiteRoot = path.join(__dirname, '..');
const repoRoot = path.join(websiteRoot, '..');

const foldersToCopy = ['core', 'local_search', 'utils'];

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(source)) return;
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  for (const file of files) {
    const curSource = path.join(source, file);
    const curTarget = path.join(target, file);
    if (fs.lstatSync(curSource).isDirectory()) {
      copyFolderRecursiveSync(curSource, curTarget);
    } else {
      fs.copyFileSync(curSource, curTarget);
    }
  }
}

console.log('Copying shared folders for production build...');
foldersToCopy.forEach(folder => {
  const src = path.join(repoRoot, folder);
  const dest = path.join(websiteRoot, folder);
  if (fs.existsSync(src)) {
    console.log(`Copying ${src} to ${dest}...`);
    if (fs.existsSync(dest)) {
      fs.rmSync(dest, { recursive: true, force: true });
    }
    copyFolderRecursiveSync(src, dest);
  } else {
    console.warn(`Warning: Shared folder ${src} does not exist.`);
  }
});
console.log('Shared folders copy complete.');
