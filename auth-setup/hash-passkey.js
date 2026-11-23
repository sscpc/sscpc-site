/* Turns the shared passkey into the value for the SHARED_PASSKEY_HASH environment variable.
   Usage:  npm run hash-passkey      (you are asked to type the passkey; nothing is saved to disk)
   The passkey itself must never be committed or put in any file of the site. */
const readline = require('readline');
const { hashPasskey } = require('../api/_lib/passkey');

function ask(label) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = s => { if (s.includes(label)) process.stdout.write(s); };
    rl.question(label, a => { rl.close(); process.stdout.write('\n'); resolve(a); });
  });
}
function readPipe() {
  return new Promise(r => { let d = ''; process.stdin.on('data', c => d += c); process.stdin.on('end', () => r(d)); });
}

(async () => {
  let pk;
  if (process.stdin.isTTY) {
    pk = (await ask('Shared passkey: ')).trim();
    if (pk !== (await ask('Type it again: ')).trim()) { console.error('The two entries do not match.'); process.exit(1); }
  } else pk = (await readPipe()).trim();
  if (pk.length < 8) { console.error('Use at least 8 characters. 12 or more (a short phrase) is much safer, because everyone shares it.'); process.exit(1); }
  if (pk.length < 12) console.error('Note: shorter than 12 characters. Consider a longer phrase.');
  console.log('\nSet this in Vercel > Settings > Environment Variables as SHARED_PASSKEY_HASH:\n');
  console.log(await hashPasskey(pk));
  console.log('');
})();
