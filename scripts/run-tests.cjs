const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, '.tmp-tests');
const tscBin = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');

fs.rmSync(outDir, { recursive: true, force: true });
execFileSync(process.execPath, [tscBin, '-p', 'tsconfig.test.json'], { cwd: root, stdio: 'inherit' });
fs.writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
require(path.join(outDir, 'tests', 'run-tests.js'));
