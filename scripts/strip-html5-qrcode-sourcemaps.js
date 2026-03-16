// Strip sourceMappingURL comments from html5-qrcode ESM files to silence
// noisy source-map-loader warnings in CRA.

const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', 'node_modules', 'html5-qrcode', 'esm');

function stripSourceMap(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const cleaned = content.replace(/\/\/# sourceMappingURL=.*\n?/g, '');
  fs.writeFileSync(filePath, cleaned, 'utf8');
}

function run() {
  if (!fs.existsSync(baseDir)) return;

  const files = fs.readdirSync(baseDir).filter((f) => f.endsWith('.js'));
  files.forEach((file) => {
    stripSourceMap(path.join(baseDir, file));
  });

  // eslint-disable-next-line no-console
  console.log('Stripped sourceMappingURL comments from html5-qrcode ESM files.');
}

run();

