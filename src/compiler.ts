import { spawn } from 'child_process';
import { writeFileSync, promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export async function compileToPdf(typstSource: string): Promise<Uint8Array> {
  const tmpTyp = join(tmpdir(), `md-to-pdf-${Date.now()}.typ`);
  const tmpPdf = tmpTyp.replace(/\.typ$/, '.pdf');
  writeFileSync(tmpTyp, typstSource, 'utf-8');
  await new Promise<void>((resolve, reject) => {
    const proc = spawn('npx', ['typst', 'compile', tmpTyp, tmpPdf]);
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`typst exited with code ${code}`));
    });
  });
  const pdf = await fs.readFile(tmpPdf);
  await fs.unlink(tmpTyp);
  await fs.unlink(tmpPdf);
  return pdf;
}
