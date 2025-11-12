# 🔧 Fix: Errore 500 sulla Visualizzazione Documenti

**Data:** 2025-01-27  
**Problema:** ENOENT: no such file or directory  
**Stato:** ✅ RISOLTO

## 📋 Descrizione Problema

Quando gli utenti cliccavano "View" sui documenti, il backend restituiva errore 500:

```
ENOENT: no such file or directory, open '/app/uploads/clienti/4/fatture/1762799567644-stx4ww.xml'
```

Il file esisteva ma veniva cercato nel percorso sbagliato.

## 🔍 Analisi Root Cause

### Discrepanza nei Percorsi Base

**1. Salvataggio (documentClassifier.js):**
```javascript
// Riga 99: Usa process.cwd()
const fullPath = path.join(process.cwd(), 'uploads', finalPath);
// Risultato: /app/uploads/clienti/4/fatture/1762799567644-stx4ww.xml
```

**2. Lettura (documents.js - PRIMA del fix):**
```javascript
// Riga 39: Usava __dirname
const UPLOADS_DIR = path.join(__dirname, '../uploads');
// Risultato: /app/backend/uploads  ← SBAGLIATO!

// Riga 150: Cercava nel percorso sbagliato
const legacyPath = path.join(UPLOADS_DIR, document.file_path);
// Risultato: /app/backend/uploads/clienti/4/fatture/1762799567644-stx4ww.xml
//                    ^^^^^^^^ Directory extra!
```

### Flusso Completo

```
UPLOAD:
1. Multer salva in: /app/uploads/1762799567644-stx4ww.xml (temporaneo)
2. documentClassifier sposta in: /app/uploads/clienti/4/fatture/1762799567644-stx4ww.xml
3. Nel DB viene salvato: "clienti/4/fatture/1762799567644-stx4ww.xml" (percorso relativo)

VIEW (PRIMA):
1. Backend cerca in: /app/backend/uploads/clienti/4/fatture/1762799567644-stx4ww.xml
2. File non trovato → Errore 500

VIEW (DOPO):
1. Backend cerca in: /app/uploads/clienti/4/fatture/1762799567644-stx4ww.xml
2. File trovato → ✅ Funziona!
```

## ✅ Soluzione Implementata

### File Modificati

#### 1. `backend/routes/documents.js`

**Riga 39-40:**
```javascript
// PRIMA:
const UPLOADS_DIR = path.join(__dirname, '../uploads');

// DOPO:
// ✅ FIX: Usa process.cwd() come documentClassifier per evitare discrepanze
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
```

**Righe 140-173:** Aggiunta documentazione dettagliata alla funzione `getDocumentBuffer()`

#### 2. `backend/routes/files.js`

**Riga 33-34:**
```javascript
// PRIMA:
const uploadsDir = path.join(__dirname, '../uploads');

// DOPO:
// ✅ FIX: Usa process.cwd() per allinearsi con documentClassifier
const uploadsDir = path.join(process.cwd(), 'uploads');
```

**Riga 288-289:** Stesso fix per endpoint info

## 🧪 Test di Verifica

### Test Manuale

1. ✅ Upload documento con classificazione automatica
2. ✅ Click su "View" → documento visualizzato correttamente
3. ✅ Download documento → file scaricato correttamente
4. ✅ Endpoint `/api/documents/:id/content` → funziona
5. ✅ Endpoint `/api/files/*` → funziona

### Percorsi Verificati

```bash
# File fisico
ls -la /app/uploads/clienti/4/fatture/1762799567644-stx4ww.xml
# ✅ Esiste

# Percorso costruito dal codice
# process.cwd() = /app
# UPLOADS_DIR = /app/uploads
# file_path = clienti/4/fatture/1762799567644-stx4ww.xml
# fullPath = /app/uploads/clienti/4/fatture/1762799567644-stx4ww.xml
# ✅ Corrisponde!
```

## 📚 Contesto Tecnico

### Differenza tra `__dirname` e `process.cwd()`

- **`__dirname`**: Directory del file JavaScript corrente
  - In `backend/routes/documents.js` → `/app/backend/routes`
  - Relativo: `../uploads` → `/app/backend/uploads`

- **`process.cwd()`**: Directory di lavoro del processo Node.js
  - Sempre `/app` quando l'app viene eseguita
  - Relativo: `uploads` → `/app/uploads`

### Perché il Problema si è Verificato

Il codice aveva **due strategie diverse**:
1. `documentClassifier.js` usava `process.cwd()` (corretto)
2. `documents.js` usava `__dirname` (sbagliato per questo caso)

Entrambi funzionano, ma devono essere **coerenti** in tutta l'applicazione.

## 🚀 Deployment

### Nessuna Migrazione Necessaria

✅ I file esistenti continueranno a funzionare perché:
- I percorsi nel DB sono già relativi: `clienti/X/categoria/file.ext`
- Il fix corregge solo come vengono costruiti i percorsi assoluti
- Nessun dato del database deve essere modificato

### Compatibilità

✅ Retrocompatibile con:
- File legacy salvati direttamente in `/uploads`
- File nuovi salvati in `/uploads/clienti/X/categoria/`
- File salvati come base64 nel database (campo `file_content`)

## 📊 Impatto

- **Prima:** ❌ Tutti i documenti classificati non visualizzabili
- **Dopo:** ✅ Tutti i documenti visualizzabili correttamente
- **Breaking Changes:** Nessuno
- **Migrazione Richiesta:** Nessuna

## 🔗 File Correlati

- `backend/services/documentClassifier.js` - Salva i file
- `backend/routes/documents.js` - Legge i file (MODIFICATO)
- `backend/routes/files.js` - Serve i file (MODIFICATO)
- `backend/db.js` - Operazioni database (nessuna modifica)

## 📝 Note Aggiuntive

### Log Aggiunti

La funzione `getDocumentBuffer()` ora include log diagnostici:
```javascript
console.log(`📂 Leggo file da: ${fullPath}`);
console.warn(`⚠️ File non trovato per documento ${document.id}:`, error.message);
console.warn(`   Percorso tentato: ${path.join(UPLOADS_DIR, document.file_path)}`);
```

Questi aiuteranno a debuggare futuri problemi di percorsi.

### Prevenzione Futura

Per evitare problemi simili in futuro:
1. ✅ Usare sempre `process.cwd()` per percorsi relativi alla root del progetto
2. ✅ Usare `__dirname` solo per risorse relative al file corrente
3. ✅ Documentare chiaramente la struttura dei percorsi
4. ✅ Aggiungere log quando si costruiscono percorsi file

---

**Risolto da:** AI Assistant  
**Data Fix:** 2025-01-27  
**Versione:** Backend v3.7.0-turso

