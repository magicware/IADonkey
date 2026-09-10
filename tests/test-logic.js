import { evaluateExpression } from '../src/utils/calculator.ts';
import { detectUrl } from '../src/utils/urlHelper.ts';

console.log('=== TESTOVÁNÍ KALKULAČKY A DETEKCE URL ===\n');

const mathTests = [
  { expr: '12 * 8', expected: '96' },
  { expr: '(100 - 20) / 4', expected: '20' },
  { expr: 'sqrt(144)', expected: '12' },
  { expr: '2 ^ 8', expected: '256' },
  { expr: '10 > 5', expected: 'Pravda (true)' },
  { expr: '2 + 2 == 5', expected: 'Nepravda (false)' },
  { expr: 'ahoj svete', expected: null },
  { expr: 'wox', expected: null },
];

let mathPassed = 0;
for (const t of mathTests) {
  const result = evaluateExpression(t.expr);
  const actual = result ? result.name : null;
  const ok = actual === t.expected;
  if (ok) {
    mathPassed++;
    console.log(`[OK] Math: "${t.expr}" => ${actual}`);
  } else {
    console.error(`[FAIL] Math: "${t.expr}" => Expected "${t.expected}", got "${actual}"`);
  }
}

console.log(`\nKalkulačka testy: ${mathPassed}/${mathTests.length} úspěšné\n`);

const urlTests = [
  { input: 'brenna.istour.cz', shouldMatch: true, expectedLoc: 'https://brenna.istour.cz' },
  { input: 'www.brenna.cz', shouldMatch: true, expectedLoc: 'https://www.brenna.cz' },
  { input: 'https://google.com', shouldMatch: true, expectedLoc: 'https://google.com' },
  { input: 'localhost:3000', shouldMatch: true, expectedLoc: 'http://localhost:3000' },
  { input: 'obycejny text', shouldMatch: false },
  { input: 'a', shouldMatch: false },
];

let urlPassed = 0;
for (const t of urlTests) {
  const result = detectUrl(t.input);
  if (t.shouldMatch) {
    const ok = result !== null && result.location === t.expectedLoc && result.priority === 999;
    if (ok) {
      urlPassed++;
      console.log(`[OK] URL: "${t.input}" => ${result?.location} (priority ${result?.priority})`);
    } else {
      console.error(`[FAIL] URL: "${t.input}" => Expected ${t.expectedLoc}, got ${result?.location}`);
    }
  } else {
    const ok = result === null;
    if (ok) {
      urlPassed++;
      console.log(`[OK] Non-URL: "${t.input}" => null`);
    } else {
      console.error(`[FAIL] Non-URL: "${t.input}" => Unexpected match ${result?.location}`);
    }
  }
}

console.log(`\nURL testy: ${urlPassed}/${urlTests.length} úspěšné\n`);

if (mathPassed === mathTests.length && urlPassed === urlTests.length) {
  console.log('🎉 VŠECHNY TESTY PROŠLY ÚSPĚŠNĚ!');
  process.exit(0);
} else {
  console.error('❌ NĚKTERÉ TESTY SELHALY');
  process.exit(1);
}
