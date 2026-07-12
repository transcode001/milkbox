// apps/mobile の依存グラフ（直接依存 + 推移的依存 + workspaceパッケージの依存）を辿り、
// バンドルに含まれ得る全サードパーティパッケージのライセンス情報を src/data/licenses.ts に生成する。
// 依存を更新したら `pnpm generate-licenses` を再実行すること。
// EASビルドでは package.json の eas-build-post-install フックにより自動実行される。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// LICENSEファイルをnpmパッケージに同梱しないパッケージ（expo-*等）向けの標準ライセンス文。
// package.json の author から著作権表示行を補って使う。
const FALLBACK_LICENSE_TEXTS = {
  MIT: `Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`,
  ISC: `Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`,
};

const buildFallbackText = (license, author) => {
  const template = FALLBACK_LICENSE_TEXTS[license];
  if (!template) return null;
  const holder = typeof author === "string" ? author : author?.name;
  return holder ? `Copyright (c) ${holder}\n\n${template}` : template;
};

// Node の NODE_MODULES_PATHS 相当: fromDir の祖先の node_modules から depName を探す。
// pnpm では実体が node_modules/.pnpm/<id>/node_modules/<name> にあり、その依存は
// 同じ node_modules に同居するため、realpath 起点の祖先探索で解決できる。
const resolvePackageDir = (fromDir, depName) => {
  let dir = fromDir;
  for (;;) {
    if (path.basename(dir) !== "node_modules") {
      const candidate = path.join(dir, "node_modules", ...depName.split("/"));
      if (fs.existsSync(path.join(candidate, "package.json"))) {
        return fs.realpathSync(candidate);
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
};

const readLicenseFile = (pkgDir) => {
  const dirent = fs
    .readdirSync(pkgDir, { withFileTypes: true })
    .find((entry) => entry.isFile() && /^licen[cs]e([._-]|$)/i.test(entry.name));
  if (!dirent) return null;
  try {
    return fs.readFileSync(path.join(pkgDir, dirent.name), "utf8").trim();
  } catch {
    return null;
  }
};

const visited = new Set();
const entries = new Map();
const missingTexts = [];

const visit = (pkgDir) => {
  const real = fs.realpathSync(pkgDir);
  if (visited.has(real)) return;
  visited.add(real);

  const meta = JSON.parse(fs.readFileSync(path.join(real, "package.json"), "utf8"));
  // workspaceパッケージ（node_modules外の実体）自体は非公開なので一覧に載せず、依存だけ辿る
  const isWorkspacePackage = !real.split(path.sep).includes("node_modules");

  if (!isWorkspacePackage) {
    const license =
      typeof meta.license === "string"
        ? meta.license
        : (meta.license?.type ?? "Unknown");
    let licenseText = readLicenseFile(real);
    if (!licenseText) {
      licenseText = buildFallbackText(license, meta.author);
      if (!licenseText) {
        missingTexts.push(`${meta.name}@${meta.version} (${license})`);
      }
    }
    entries.set(`${meta.name}@${meta.version}`, {
      name: meta.name ?? "unknown",
      version: meta.version ?? "",
      license,
      licenseText,
    });
  }

  // devDependencies はバンドルされないので辿らない。peer/optional は解決できるものだけ辿る。
  const hardDeps = meta.dependencies ?? {};
  const softDeps = { ...meta.peerDependencies, ...meta.optionalDependencies };
  for (const [depName, range] of Object.entries({ ...softDeps, ...hardDeps })) {
    const depDir = resolvePackageDir(real, depName);
    if (depDir) {
      visit(depDir);
    } else if (depName in hardDeps && !String(range).startsWith("workspace:")) {
      console.warn(`warn: ${meta.name} の依存 ${depName} を解決できませんでした`);
    }
  }
};

visit(appDir);

const sorted = [...entries.values()].sort(
  (left, right) =>
    left.name.localeCompare(right.name) || left.version.localeCompare(right.version),
);

// 同一のライセンス全文（同一組織のパッケージ群で共通）は1つにまとめ、インデックス参照にする
const licenseTexts = [];
const textIndexByContent = new Map();
const compactEntries = sorted.map(({ licenseText, ...entry }) => {
  let licenseTextIndex = null;
  if (licenseText) {
    if (!textIndexByContent.has(licenseText)) {
      textIndexByContent.set(licenseText, licenseTexts.length);
      licenseTexts.push(licenseText);
    }
    licenseTextIndex = textIndexByContent.get(licenseText);
  }
  return { ...entry, licenseTextIndex };
});

const output = `// このファイルは scripts/generate-licenses.mjs により自動生成されます。直接編集しないでください。
export type LicenseEntry = {
  name: string;
  version: string;
  license: string;
  // licenseTexts 配列へのインデックス。全文が取得できなかった場合は null。
  licenseTextIndex: number | null;
};

export const licenseTexts: string[] = ${JSON.stringify(licenseTexts, null, 2)};

export const licenses: LicenseEntry[] = ${JSON.stringify(compactEntries, null, 2)};
`;

const outputPath = path.join(appDir, "src", "data", "licenses.ts");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, output);
console.log(
  `${sorted.length} 件のライセンス情報を ${path.relative(appDir, outputPath)} に出力しました`,
);
if (missingTexts.length > 0) {
  console.warn(
    `warn: 以下 ${missingTexts.length} 件はライセンス全文を取得できませんでした（フォールバック文もなし）:\n  ${missingTexts.join("\n  ")}`,
  );
}
