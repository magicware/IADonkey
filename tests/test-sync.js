import path from 'node:path';
import { AppStore } from '../electron/store.ts';
import { DataSyncManager } from '../electron/dataSync.ts';

// Mock electron app.getPath
globalThis.electronMock = true;

console.log('=== TESTOVÁNÍ SYNCHRONIZACE DAT Z LOKÁLNÍHO JSONU ===\n');

const sampleJsonPath = path.resolve(process.cwd(), 'samples', 'demo-items.json');
console.log('Cesta k testovacímu JSONu:', sampleJsonPath);

const store = new AppStore();
const sync = new DataSyncManager(store);

// Configure test file source
const config = store.getConfig();
config.sources = [
  {
    id: 'demo-source-1',
    name: 'Demo položky',
    type: 'file',
    path: sampleJsonPath,
    enabled: true,
  },
];
store.saveConfig(config);

async function run() {
  const items = await sync.syncAll();
  console.log(`Načteno ${items.length} položek:`);
  for (const it of items) {
    console.log(`- [P:${it.priority}] ${it.name} (${it.location}) [icon: ${it.icon}] [settings: ${it.settings || 'none'}]`);
  }

  const hasMagicGate = items.some(i => i.settings === 'magicgate');
  if (!hasMagicGate) {
    throw new Error('Nenalezena položka se settings: magicgate!');
  }
  console.log('\n[OK] Úspěšně nalezena položka MagicGate!');

  const cached = store.getItems();
  if (cached.length !== items.length) {
    throw new Error('Chyba: Počet položek v mezipaměti nesouhlasí!');
  }
  console.log('[OK] Položky uloženy do mezipaměti.');
  console.log('\n🎉 TEST SYNCHRONIZACE PROBĚHL ÚSPĚŠNĚ!');
}

run().catch((err) => {
  console.error('Chyba testu:', err);
  process.exit(1);
});
