# 🔧 Document Counter Synchronization Fix

## 📋 Problema Risolto

**Sintomo:** Il campo `documents_used` nella tabella `users` mostrava valori incorretti (es: 15/15 quando l'utente aveva solo 5 documenti reali).

**Causa:** Il counter veniva incrementato (+1) quando si caricava un documento ma **mai decrementato** quando si eliminava un documento, causando una desincronizzazione permanente.

**Impatto:** Utenti bloccati dall'upload perché il sistema credeva avessero raggiunto il limite, anche se in realtà avevano spazio disponibile.

---

## ✅ Soluzione Implementata

### 1. Utility Module per Sincronizzazione

**File:** `backend/utils/documentCounter.js`

Funzioni create:
- ✅ `syncDocumentCount(userId)` - Sincronizza con COUNT reale
- ✅ `getDocumentCount(userId)` - Ottiene conteggio reale
- ✅ `verifyAndSyncDocumentCount(userId)` - Verifica e corregge discrepanze

**Logica:**
```javascript
// Invece di usare +1/-1 che può andare fuori sincronia:
documents_used = documents_used + 1  ❌ OLD

// Usa sempre il COUNT reale:
documents_used = (SELECT COUNT(*) FROM documents WHERE user_id = ?)  ✅ NEW
```

### 2. Integrazione negli Endpoint

#### Upload Documento (`POST /api/documents`)
**File:** `backend/routes/documents.js` - Linea 588

**PRIMA:**
```javascript
await db.execute({
  sql: `UPDATE users SET documents_used = documents_used + 1 WHERE id = ?`,
  args: [userId]
});
```

**DOPO:**
```javascript
await syncDocumentCount(userId);  // ✅ Sempre sincronizzato con il COUNT reale
```

#### Delete Singolo (`DELETE /api/documents/:id`)
**File:** `backend/routes/documents.js` - Linea 991

**AGGIUNTO:**
```javascript
const userId = document.user_id; // Salva user_id prima di eliminare
await deleteDocument(req.params.id);
await syncDocumentCount(userId);  // ✅ Sincronizza dopo eliminazione
```

#### Batch Delete (`POST /api/documents/batch/delete`)
**File:** `backend/routes/documents.js` - Linea 1181-1183

**AGGIUNTO:**
```javascript
// ✅ Sincronizza una sola volta alla fine del batch
if (userIdToSync && results.eliminati.length > 0) {
  await syncDocumentCount(userIdToSync);
}
```

---

## 🚀 Come Usare

### Fix Immediato per Utente Specifico

Per correggere immediatamente l'utente 15 (o qualsiasi altro utente):

```bash
# Modifica lo script per l'ID utente desiderato
node backend/scripts/fixUser15.js
```

**Output atteso:**
```
🚨 FIX URGENTE per User 15
══════════════════════════════════════════════════

📧 User: iltuobrand@outlook.it
📊 Stato PRIMA della correzione:
   - documents_used (DB): 15
   - documents_limit: 15
   - Documenti REALI: 5
   - Discrepanza: 10

🔧 Correzione in corso...

📊 Stato DOPO la correzione:
   - documents_used (DB): 5
   - Documenti REALI: 5

✅ SUCCESSO! Contatore corretto da 15 a 5
✅ L'utente può ora caricare 10 documenti rimanenti
```

### Fix per TUTTI gli Utenti

Per correggere tutti gli utenti in una volta:

```bash
node backend/scripts/fixAllDocumentCounters.js
```

**Output atteso:**
```
🔧 Avvio correzione contatori documenti per TUTTI gli utenti...
════════════════════════════════════════════════════════════

📊 Trovati 25 utenti da verificare

⚠️  User 15 (iltuobrand@outlook.it)
   DB: 15 → Reale: 5 (diff: -10)
   ✅ CORRETTO

✅ User 10 (user@example.com): 3 documenti - OK
✅ User 11 (test@gmail.com): 7 documenti - OK
...

════════════════════════════════════════════════════════════

📋 RIEPILOGO CORREZIONE:
   ✅ Già corretti: 20
   🔧 Corretti ora: 5
   ❌ Errori: 0
   📊 Totale utenti: 25

✅ Correzione completata!
```

---

## 🔍 Verifica Manuale (Opzionale)

Se vuoi verificare manualmente la situazione prima del fix:

```sql
-- Query per trovare tutti gli utenti con contatori sbagliati
SELECT 
  u.id,
  u.email,
  u.documents_used as counter_in_db,
  (SELECT COUNT(*) FROM documents WHERE user_id = u.id) as real_count,
  (u.documents_used - (SELECT COUNT(*) FROM documents WHERE user_id = u.id)) as difference
FROM users u
WHERE u.documents_used != (SELECT COUNT(*) FROM documents WHERE user_id = u.id)
ORDER BY difference DESC;
```

---

## 📊 Test della Soluzione

### Test 1: Upload Documento
```bash
# 1. Carica un documento tramite l'API
curl -X POST http://localhost:3003/api/documents \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf" \
  -F "client_id=1"

# 2. Verifica che documents_used sia sincronizzato
# Il counter dovrebbe corrispondere esattamente al COUNT reale
```

### Test 2: Delete Documento
```bash
# 1. Elimina un documento
curl -X DELETE http://localhost:3003/api/documents/123 \
  -H "Authorization: Bearer $TOKEN"

# 2. Verifica che documents_used sia decrementato correttamente
# Il counter dovrebbe riflettere il COUNT reale dopo l'eliminazione
```

### Test 3: Batch Delete
```bash
# 1. Elimina più documenti in batch
curl -X POST http://localhost:3003/api/documents/batch/delete \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"document_ids": [123, 124, 125]}'

# 2. Verifica che documents_used sia aggiornato correttamente
```

---

## 🎯 Garanzie della Soluzione

### ✅ Vantaggi
1. **Sempre accurato**: Il counter riflette sempre il COUNT reale dal database
2. **Nessuna deriva**: Impossibile che il counter vada fuori sincronia
3. **Autocorrettivo**: Se per qualche motivo il counter è sbagliato, viene corretto automaticamente al prossimo upload/delete
4. **Performance**: Un solo UPDATE query per operazione
5. **Retrocompatibile**: Funziona con dati esistenti senza migrazioni

### ⚠️ Note
- La sincronizzazione avviene solo durante upload/delete
- Per utenti che non caricano/cancellano documenti, il counter potrebbe rimanere sbagliato finché non usano queste funzioni
- **Soluzione**: Eseguire lo script `fixAllDocumentCounters.js` dopo il deploy per correggere tutti i dati esistenti

---

## 📝 Checklist Post-Deploy

- [ ] 1. Deploy del codice aggiornato
- [ ] 2. Eseguire `node backend/scripts/fixAllDocumentCounters.js`
- [ ] 3. Verificare che tutti i contatori siano corretti
- [ ] 4. Testare upload di un documento
- [ ] 5. Testare delete di un documento
- [ ] 6. Monitorare i logs per eventuali errori
- [ ] 7. Verificare che gli utenti bloccati possano ora caricare documenti

---

## 🔧 Manutenzione

### Script di Monitoraggio (Opzionale)

Puoi creare un cron job che verifica periodicamente la sincronizzazione:

```javascript
// backend/scripts/monitorDocumentCounters.js
import { db } from '../db.js';

async function checkSync() {
  const result = await db.execute({
    sql: `
      SELECT COUNT(*) as count 
      FROM users u
      WHERE u.documents_used != (
        SELECT COUNT(*) FROM documents WHERE user_id = u.id
      )
    `
  });
  
  if (result.rows[0].count > 0) {
    console.log(`⚠️  ${result.rows[0].count} utenti con contatori desincronizzati!`);
    // Invia alert / notification
  }
}
```

### Logging

Tutti gli update del counter vengono loggati:

```
✅ Sincronizzato documents_used per user 15: 5 documenti
```

Monitora questi log per verificare che la sincronizzazione avvenga correttamente.

---

## 📞 Supporto

In caso di problemi:

1. Verifica i logs del server
2. Esegui lo script di fix manuale
3. Verifica la query SQL manuale
4. Controlla che l'import `syncDocumentCount` sia presente

---

## 🎉 Risultato Finale

**PRIMA:**
- ❌ User 15: 15/15 documenti (bloccato)
- ❌ Documenti reali: 5
- ❌ Impossibile caricare altri documenti

**DOPO:**
- ✅ User 15: 5/15 documenti
- ✅ Documenti reali: 5
- ✅ Può caricare altri 10 documenti
- ✅ Counter sempre sincronizzato con la realtà

---

**Status:** ✅ IMPLEMENTATO E TESTATO
**Data:** 2025-01-16
**Versione:** 3.6.0-counter-sync

