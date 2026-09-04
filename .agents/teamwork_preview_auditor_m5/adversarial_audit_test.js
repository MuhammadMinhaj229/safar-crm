const {
  categorizeServiceInterest,
  generateFaqPreview,
  generateWelcomeMessage,
} = require('../../src/lib/safar/agent-knowledge');

function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  console.log(`  ✓ ${msg}`);
}

console.log('--- ADVERSARIAL INTEGRITY STRESS TESTING ---');

// 1. Stress test empty / null / undefined / whitespace inputs
console.log('\n[Stress Group 1: Nullish & Blank Inputs]');
const emptyRes = categorizeServiceInterest('');
assert(emptyRes.category === 'safar_go', 'Empty string defaults to safar_go');
assert(emptyRes.confidence === 0.5, 'Empty string confidence is 0.5');

const nullRes = categorizeServiceInterest(null);
assert(nullRes.category === 'safar_go', 'Null input defaults to safar_go');

const undefRes = categorizeServiceInterest(undefined);
assert(undefRes.category === 'safar_go', 'Undefined input defaults to safar_go');

const spaceRes = categorizeServiceInterest('   \t\n  ');
assert(spaceRes.category === 'safar_go', 'Whitespace input defaults to safar_go');

// 2. Stress test gibberish / out-of-domain inputs
console.log('\n[Stress Group 2: Out-of-Domain & Gibberish Inputs]');
const gibberishRes = categorizeServiceInterest('qwertyuiop asdfghjkl zxcvbnm');
assert(gibberishRes.category === 'safar_go', 'Gibberish text falls back to safar_go');
assert(gibberishRes.matchedKeywords.length === 0, 'No keywords matched for gibberish');

// 3. Stress test mixed competing categories
console.log('\n[Stress Group 3: Competing Domain Keywords]');
// Home-dominant
const mixedHome = categorizeServiceInterest('I live in Dubai, but I urgently need elderly parents hospital care and medicine delivery in India');
assert(mixedHome.category === 'safar_home', 'Home-dominant mixed inquiry correctly resolved to safar_home');
assert(mixedHome.matchedKeywords.some(k => k.startsWith('home:')), 'Matched home keywords found');

// Go-dominant
const mixedGo = categorizeServiceInterest('I love my family at home, but I am travelling to Saudi Arabia and need flight booking and luggage packing assistance');
assert(mixedGo.category === 'safar_go', 'Go-dominant mixed inquiry correctly resolved to safar_go');
assert(mixedGo.matchedKeywords.some(k => k.startsWith('go:')), 'Matched go keywords found');

// 4. Stress test extreme payload sizes
console.log('\n[Stress Group 4: Extreme String Lengths]');
const longGoText = 'Dubai flight baggage packing '.repeat(200);
const longRes = categorizeServiceInterest(longGoText);
assert(longRes.category === 'safar_go', '200-repetition 5,000 char input handled without crash');
assert(longRes.confidence >= 0.6, 'Confidence calculated correctly for long input');

// 5. Stress test FAQ preview generation with special characters
console.log('\n[Stress Group 5: FAQ Preview Special Characters]');
const xssName = '<script>alert("hack")</script>';
const previewGo = generateFaqPreview(xssName, 'safar_go', 'Flight booking');
assert(previewGo.includes(xssName), 'Name interpolated correctly in Safar Go preview');
assert(previewGo.includes('SAFAR N MANZIL (Safar Go)'), 'Go branding present');

const previewHome = generateFaqPreview('Fatima Begum', 'safar_home', 'Elderly parent care');
assert(previewHome.includes('Fatima Begum'), 'Name interpolated correctly in Safar Home preview');
assert(previewHome.includes('SAFAR N MANZIL (Safar Home)'), 'Home branding present');

console.log('\n--- ALL ADVERSARIAL INTEGRITY STRESS TESTS PASSED ---');
