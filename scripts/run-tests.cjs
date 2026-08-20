const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, '.tmp-tests');
const tscBin = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');

fs.rmSync(outDir, { recursive: true, force: true });
execFileSync(process.execPath, [tscBin, '-p', 'tsconfig.test.json'], { cwd: root, stdio: 'inherit' });
fs.writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'commonjs' }));

// 逻辑测试不创建 Phaser 场景，仅需让包含渲染类型的模块可在 Node 中加载。
const phaserStub = {
  Math: {
    Between(min, max) {
      return Math.floor(min + Math.random() * (max - min + 1));
    },
    Clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    },
  },
  Geom: {
    Point: class Point {
      constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
      }
    },
    Rectangle: class Rectangle {
      static Contains() {
        return false;
      }

      constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
      }
    },
  },
};

const originalLoad = Module._load;
Module._load = function loadForTests(request, parent, isMain) {
  if (request === 'phaser') return phaserStub;
  return originalLoad.call(this, request, parent, isMain);
};
globalThis.Phaser = phaserStub;

require(path.join(outDir, 'tests', 'run-tests.js'));
