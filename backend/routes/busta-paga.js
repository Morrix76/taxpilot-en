import express from 'express';
import multer from 'multer';
import path from 'path';
import contractComparer from '../services/contractComparer.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype === 'application/json') {
      cb(null, true);
    } else {
      cb(new Error('Solo file PDF e JSON supportati'), false);
    }
  }
});

// POST /api/busta-paga/confronta-contratto
    router.post('/confronta-contratto', authMiddleware, upload.fields([
  { name: 'contratto', maxCount: 1 },
  { name: 'busta_paga', maxCount: 1 }
]), async (req, res) => {
  try {
    const contrattoFile = req.files.contratto?.[0];
    const bustaPagaFile = req.files.busta_paga?.[0];

    if (!contrattoFile || !bustaPagaFile) {
      return res.status(400).json({ 
        error: 'Servono entrambi i file: contratto e busta_paga' 
      });
    }

    const result = await contractComparer.confrontaDocumenti(
      contrattoFile.path,
      bustaPagaFile.path,
      1
    );

    res.json(result);

  } catch (error) {
    console.error('Errore confronto:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;