import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { badRequest } from '../api';
import { env } from '../env';

/** Allowed types, identified by file signature — the client-sent MIME type is never trusted. */
const SIGNATURES: Array<{ mime: string; ext: string; test: (b: Buffer) => boolean }> = [
  { mime: 'application/pdf', ext: 'pdf', test: (b) => b.subarray(0, 5).toString('latin1') === '%PDF-' },
  { mime: 'image/png', ext: 'png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: 'image/jpeg', ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/webp', ext: 'webp', test: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' },
  // Office Open XML (docx/xlsx/pptx) are ZIP containers; the extension decides which.
  { mime: 'application/zip', ext: 'zip', test: (b) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04 },
];

const OFFICE: Record<string, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

export function sniff(buf: Buffer, originalName: string): { mime: string; ext: string } {
  const hit = SIGNATURES.find((s) => s.test(buf));
  if (!hit) throw badRequest('Only PDF, JPG, PNG, WebP and Word/Excel/PowerPoint files are allowed.');
  if (hit.ext === 'zip') {
    const ext = path.extname(originalName).slice(1).toLowerCase();
    if (!OFFICE[ext]) throw badRequest('ZIP archives are not allowed. Upload a PDF or Office document.');
    return { mime: OFFICE[ext], ext };
  }
  return { mime: hit.mime, ext: hit.ext };
}

export function safeName(name: string): string {
  return name.replace(/[^\w.\- ]+/g, '_').slice(0, 120) || 'file';
}

export async function storeBuffer(schoolId: string, buf: Buffer, ext: string): Promise<string> {
  const now = new Date();
  const rel = path.posix.join(schoolId, `${now.getUTCFullYear()}`, `${String(now.getUTCMonth() + 1).padStart(2, '0')}`, `${crypto.randomUUID()}.${ext}`);
  const abs = path.join(env.storageDir(), rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, buf, { flag: 'wx' });
  return rel;
}

export async function readStored(rel: string): Promise<Buffer> {
  const root = path.resolve(env.storageDir());
  const abs = path.resolve(root, rel);
  if (!abs.startsWith(root + path.sep)) throw badRequest('Invalid file path.');
  return fs.readFile(abs);
}
