import { createRequire } from 'node:module'
import mammoth from 'mammoth'
import { parseResume } from './matching.js'

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')

const MAX_CHARS = 40_000

export function clipText(text) {
  return String(text || '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, MAX_CHARS)
}

export async function extractFromUpload(file) {
  if (!file) {
    const err = new Error('Choose a resume file or paste the text')
    err.status = 400
    throw err
  }
  const name = (file.originalname || 'resume').toLowerCase()
  const mime = file.mimetype || ''
  if (name.endsWith('.txt') || mime.startsWith('text/')) {
    return clipText(file.buffer.toString('utf8'))
  }
  if (name.endsWith('.docx') || mime.includes('wordprocessingml')) {
    const result = await mammoth.extractRawText({ buffer: file.buffer })
    return clipText(result.value)
  }
  if (name.endsWith('.pdf') || mime === 'application/pdf') {
    const result = await pdfParse(file.buffer)
    return clipText(result.text)
  }
  const err = new Error('Upload a PDF, Word (.docx), or .txt resume')
  err.status = 400
  throw err
}

export function parsedOrThrow(text) {
  const raw = clipText(text)
  if (raw.length < 40) {
    const err = new Error('Resume text is too short to match jobs. Paste more of your experience.')
    err.status = 400
    throw err
  }
  return { raw, parsed: parseResume(raw) }
}
