// frontend/pages/api/clients.ts
import type { NextApiRequest, NextApiResponse } from 'next';

// mock in memoria – sostituisci con DB quando vuoi
let clients: any[] = [];


export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json(clients);
  }

  if (req.method === 'POST') {
    const data = req.body;
    const newClient = { id: clients.length + 1, ...data };
    clients.push(newClient);
    return res.status(201).json({ success: true, cliente: newClient });
  }

  return res.status(405).json({ error: 'Metodo non supportato' });
}
