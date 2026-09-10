import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  console.log('\n\x1b[36m=== IADonkey Release Tool ===\x1b[0m');

  // 1. Zjistime stavajici verzi
  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const currentVer = pkg.version || '0.1.0';

  console.log(`\x1b[33mAktualni verze: ${currentVer}\x1b[0m`);

  // Navrhnout dalsi patch verzi (napr. 0.1.1 -> 0.1.2)
  const parts = currentVer.split('.');
  const nextPatch = parts.length === 3 
    ? `${parts[0]}.${parts[1]}.${parseInt(parts[2], 10) + 1}`
    : `${currentVer}.1`;

  const inputVer = await rl.question(`Zadejte novou verzi pro release [${nextPatch}]: `);
  const version = inputVer.trim() || nextPatch;

  console.log(`\n\x1b[32mPripravuji release verze ${version}...\x1b[0m`);

  // 2. Aktualizace package.json
  pkg.version = version;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`✓ Aktualizovan package.json na verzi ${version}`);

  // 3. Aktualizace src/changelog.ts
  const changelogPath = path.join(rootDir, 'src', 'changelog.ts');
  if (fs.existsSync(changelogPath)) {
    let changelogCode = fs.readFileSync(changelogPath, 'utf8');
    changelogCode = changelogCode.replace(
      /export const CURRENT_APP_VERSION = '.*?';/,
      `export const CURRENT_APP_VERSION = '${version}';`
    );
    fs.writeFileSync(changelogPath, changelogCode, 'utf8');
    console.log(`✓ Aktualizovan src/changelog.ts (CURRENT_APP_VERSION = '${version}')`);
  }

  // 4. Aktualizace version.json
  const versionJsonPath = path.join(rootDir, 'version.json');
  const versionData = {
    version: version,
    releaseNotes: `• Vydana nova verze ${version} aplikace IADonkey.\n• Prehled vsech zmen naleznete v aplikaci v zalozce Nastaveni -> Kompletni changelog.`,
    downloadUrl: `https://github.com/magicware/IADonkey/releases/download/v${version}/IADonkey-${version}.exe`,
  };
  fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2) + '\n', 'utf8');
  console.log(`✓ Aktualizovan version.json pro update system`);

  // 5. Build aplikace
  console.log('\n\x1b[36mSestavuji aplikaci (npm run build:exe)...\x1b[0m');
  const buildResult = spawnSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['run', 'build:exe'],
    { cwd: rootDir, stdio: 'inherit' }
  );

  if (buildResult.status !== 0) {
    console.error('\x1b[31mChyba pri kompilaci nebo baleni aplikace.\x1b[0m');
    rl.close();
    process.exit(1);
  }

  // Hledani vytvoreneho exe ve slozce release
  const releaseDir = path.join(rootDir, 'release');
  let builtExePath = null;
  let builtExeName = `IADonkey-${version}.exe`;

  if (fs.existsSync(releaseDir)) {
    const files = fs.readdirSync(releaseDir);
    const matched = files.find(f => f.includes(version) && f.endsWith('.exe')) ||
                    files.find(f => f.endsWith('.exe'));
    if (matched) {
      builtExeName = matched;
      builtExePath = path.join(releaseDir, matched);
    }
  }

  if (builtExePath && fs.existsSync(builtExePath)) {
    console.log(`\n\x1b[32m✓ Spustitelny soubor uspesne vytvoren:\x1b[0m`);
    console.log(`  ${builtExePath}`);
  } else {
    console.log(`\n\x1b[33mUpozorneni: Soubor ${builtExeName} nebyl nalezen v release slozce.\x1b[0m`);
  }

  // 6. Git commit a tag
  console.log('\n\x1b[36m=== Git verzovani ===\x1b[0m');
  const doGit = await rl.question(`Chcete provest git commit a vytvorit tag v${version}? (A/n): `);
  if (!doGit || doGit.toLowerCase() === 'a' || doGit.toLowerCase() === 'y') {
    try {
      execSync('git add package.json src/changelog.ts version.json CHANGELOG.md', { cwd: rootDir, stdio: 'inherit' });
      execSync(`git commit -m "chore: Release v${version}"`, { cwd: rootDir, stdio: 'inherit' });
      execSync(`git tag -a "v${version}" -m "Release v${version}"`, { cwd: rootDir, stdio: 'inherit' });
      console.log(`\x1b[32m✓ Git commit a tag v${version} vytvoreny.\x1b[0m`);

      const doPush = await rl.question(`Chcete odeslat zmeny do vzdaleneho repozitare (git push origin main && git push origin v${version})? (A/n): `);
      if (!doPush || doPush.toLowerCase() === 'a' || doPush.toLowerCase() === 'y') {
        execSync('git push origin main', { cwd: rootDir, stdio: 'inherit' });
        execSync(`git push origin "v${version}"`, { cwd: rootDir, stdio: 'inherit' });
        console.log(`\x1b[32m✓ Zmeny a tag odeslany na GitHub.\x1b[0m`);
      }
    } catch (err) {
      console.error(`\x1b[31mUpozorneni pri praci s Gitem:\x1b[0m`, err.message);
    }
  }

  // 7. GitHub CLI release
  let ghLoggedIn = false;
  try {
    execSync('gh auth status', { stdio: 'ignore' });
    ghLoggedIn = true;
  } catch {}

  if (ghLoggedIn && builtExePath && fs.existsSync(builtExePath)) {
    console.log('\n\x1b[36m=== Publikace na GitHub Releases ===\x1b[0m');
    const doGh = await rl.question(`Detekovan prihlaseny GitHub CLI. Chcete automaticky vytvorit Release v${version} a nahrat tam ${builtExeName}? (A/n): `);
    if (!doGh || doGh.toLowerCase() === 'a' || doGh.toLowerCase() === 'y') {
      try {
        execSync(`gh release create "v${version}" "${builtExePath}" --title "v${version}" --notes "Release v${version}"`, {
          cwd: rootDir,
          stdio: 'inherit',
        });
        console.log(`\x1b[32m✓ GitHub Release v${version} byl uspesne publikovan i se souborem ${builtExeName}!\x1b[0m`);
      } catch (err) {
        console.error(`\x1b[31mChyba pri nahravani na GitHub: ${err.message}\x1b[0m`);
      }
    }
  } else {
    console.log('\n\x1b[32m=== Dalsi kroky ===\x1b[0m');
    console.log(`1. Pokud mate GitHub CLI, muzete se prihlasit prikazem 'gh auth login' a priste probehne nahrani automaticky.`);
    console.log(`2. Nebo na webu GitHubu v sekci Releases vytvorte release pro tag 'v${version}'.`);
    console.log(`3. Pretahnete do nej vygenerovany soubor: ${builtExePath || builtExeName}`);
    console.log(`4. Aplikace uzivatelu pri dalsim spusteni automaticky detekuje novou verzi ${version} pres version.json!\n`);
  }

  rl.close();
}

main().catch(err => {
  console.error(err);
  rl.close();
  process.exit(1);
});
