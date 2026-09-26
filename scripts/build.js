// Assemble la page autonome : moteur + cerveau pré-entraîné injectés dans le gabarit.
// Usage : node scripts/build.js [sortie.html]
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const out = process.argv[2] || path.join(root, 'dist', 'bascule.html');
const tpl = fs.readFileSync(path.join(root, 'web', 'template.html'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'src', 'engine.js'), 'utf8');
const brain = fs.readFileSync(path.join(root, 'weights', 'brain.json'), 'utf8');
if (engine.includes('</script')) throw new Error('le moteur ne doit pas contenir </script');
const html = tpl.replace('/*__ENGINE__*/', () => engine).replace('/*__BRAIN__*/null', () => brain);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`${out} (${(html.length / 1024).toFixed(0)} Ko)`);
