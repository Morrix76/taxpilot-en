import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../lib/auth'; // percorso corretto

// Mock database di clienti in memoria
let clients = [
  { id: 1, name: 'Mario Rossi', company: 'Rossi Srl', email: 'mario@rossi.it', phone: '3331234567', status: 'attivo' },
  { id: 2, name: 'Anna Bianchi', company: 'Bianchi Spa', email: 'anna@bianchi.it', phone: '3339876543', status: 'sospeso' }
];

// GET: lista clienti (protetta con JWT)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  console.log('Authorization header:', authHeader); // 👈 LOG AGGIUNTO
  if (!authHeader) {
    return NextResponse.json({ error: 'Token mancante' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];
  if (!verifyToken(token)) {
    return NextResponse.json({ error: 'Token non valido' }, { status: 401 });
  }
  return NextResponse.json(clients);
}

// POST: crea nuovo cliente (protetta con JWT)
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  console.log('Authorization header:', authHeader); // 👈 LOG AGGIUNTO
  if (!authHeader) {
    return NextResponse.json({ error: 'Token mancante' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];
  if (!verifyToken(token)) {
    return NextResponse.json({ error: 'Token non valido' }, { status: 401 });
  }

  const data = await req.json();
  const newClient = {
    id: clients.length + 1,
    ...data,
  };
  clients.push(newClient);
  return NextResponse.json({ success: true, cliente: newClient });
}
