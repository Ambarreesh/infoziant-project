const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

mongoose.connect(process.env.MONGO_URI).then(() => console.log('🚀 fCloud Engine: 100% Online'));

// --- SCHEMAS ---
const folderSchema = new mongoose.Schema({
  name: String,
  parentId: { type: String, default: 'root' },
  isTrashed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const Folder = mongoose.model('Folder', folderSchema);

const fileSchema = new mongoose.Schema({
  originalName: String,
  filename: String,
  path: String,
  size: Number,
  mimeType: String,
  folderId: { type: String, default: 'root' },
  isTrashed: { type: Boolean, default: false },
  isStarred: { type: Boolean, default: false },
  uploadDate: { type: Date, default: Date.now }
});
const File = mongoose.model('File', fileSchema);

// --- STORAGE ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

// --- API ROUTES ---

// 1. Unified Content Fetcher (Handles Drive, Recent, Starred, and Trash)
app.get('/api/content/:view/:folderId', async (req, res) => {
  const { view, folderId } = req.params;
  let filter = { isTrashed: false };

  try {
    if (view === 'trash') {
      filter = { isTrashed: true };
    } else if (view === 'starred') {
      filter.isStarred = true;
    } else if (view === 'recent') {
      // Recent only shows latest files, no folders
      const files = await File.find(filter).sort({ uploadDate: -1 }).limit(30);
      return res.json({ folders: [], files });
    } else {
      // Standard My Drive view
      filter.folderId = folderId;
    }

    const folders = await Folder.find(filter).sort({ name: 1 });
    const files = await File.find(filter).sort({ uploadDate: -1 });
    res.json({ folders, files });
  } catch (err) { 
    res.status(500).json(err); 
  }
});

// 2. Folder Creation
app.post('/api/folders', async (req, res) => {
  const folder = new Folder(req.body);
  await folder.save();
  res.json(folder);
});

// 3. File Upload
app.post('/api/upload/:folderId', upload.single('file'), async (req, res) => {
  const file = new File({
    originalName: req.file.originalname,
    filename: req.file.filename,
    path: req.file.path,
    size: req.file.size,
    mimeType: req.file.mimetype,
    folderId: req.params.folderId
  });
  await file.save();
  res.json(file);
});

// 4. Download File
app.get('/api/download/:id', async (req, res) => {
  const file = await File.findById(req.params.id);
  if (!file) return res.status(404).send('File not found');
  res.download(file.path, file.originalName);
});

// 5. Actions (Trash, Restore, Star)
app.put('/api/action/:type/:id/:action', async (req, res) => {
  const { type, id, action } = req.params;
  const model = type === 'folder' ? Folder : File;
  
  let update = {};
  if (action === 'trash') update = { isTrashed: true };
  if (action === 'restore') update = { isTrashed: false };
  if (action === 'star') {
    const item = await model.findById(id);
    update = { isStarred: !item.isStarred };
  }
  
  await model.findByIdAndUpdate(id, update);
  res.json({ success: true });
});

// 6. Permanent Delete (Wipes from DB and Mac Disk)
app.delete('/api/permanent/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  if (type === 'file') {
    const file = await File.findById(id);
    if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    await File.findByIdAndDelete(id);
  } else {
    await Folder.findByIdAndDelete(id);
  }
  res.json({ success: true });
});

app.listen(8080, '0.0.0.0', () => console.log(`🚀 fCloud Server Active on Port 8080`));