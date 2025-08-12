import { readFileSync, writeFileSync } from 'fs';
import { mdToTypst } from './md-to-typst';
import { compileToPdf } from './compiler';

async function main() {
  const [, , input, output] = process.argv;
  if (!input || !output) {
    console.error('Usage: md-to-pdf <input.md> <output.pdf>');
    process.exit(1);
  }
  const md = readFileSync(input, 'utf-8');
  const typst = mdToTypst(md);
  const pdfBytes = await compileToPdf(typst);
  writeFileSync(output, Buffer.from(pdfBytes));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
