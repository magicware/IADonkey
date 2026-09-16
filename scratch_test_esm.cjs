const { createRequire } = require('node:module');
const req = createRequire(process.cwd() + '/dummy.js');
try {
  const ofs = req('original-fs');
  console.log('original-fs loaded successfully via createRequire:', typeof ofs.copyFileSync);
} catch (e) {
  console.log('Error:', e.message);
}
