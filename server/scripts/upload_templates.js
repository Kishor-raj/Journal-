import cloudinary from '../src/config/cloudinary.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const templatesFolder = path.resolve(__dirname, '../../client/public/templates')

const templateMap = [
  { key: 'manuscript-template', filename: '1.Manuscript Template.docx', publicId: 'manuscript-template' },
  { key: 'author-checklist', filename: '2.Author Submission Checklist.docx', publicId: 'author-checklist' },
  { key: 'copyright-form', filename: '3.Copyright Agreement Form.docx', publicId: 'copyright-form' },
  { key: 'reference-style-guide', filename: '4.Reference Style Guide.docx', publicId: 'reference-style-guide' },
]

async function uploadAll() {
  console.log('Uploading templates from:', templatesFolder)
  const results = {}

  for (const t of templateMap) {
    const filePath = path.join(templatesFolder, t.filename)
    if (!fs.existsSync(filePath)) {
      console.error(`File does not exist: ${filePath}`)
      continue
    }

    console.log(`Uploading ${t.filename}...`)
    try {
      const res = await cloudinary.uploader.upload(filePath, {
        resource_type: 'raw',
        folder: 'journal/author-templates',
        public_id: t.publicId,
        overwrite: true,
      })
      results[t.key] = res.secure_url
      console.log(`Uploaded ${t.key} -> ${res.secure_url}`)
    } catch (err) {
      console.error(`Failed to upload ${t.filename}:`, err.message)
    }
  }

  console.log('\n--- UPLOAD SUMMARY ---')
  console.log(JSON.stringify(results, null, 2))
}

uploadAll()
