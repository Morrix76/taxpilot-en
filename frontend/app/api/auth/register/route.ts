import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'https://taxpilot-en-backend-git-main-franks-projects-c85cd5ad.vercel.app/api/auth/login';

/**
 * Gestisce POST /api/auth/register
 * Inoltra la richiesta di registrazione al backend Express.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const backendResponse = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Leggi la risposta JSON dal backend, che sia di successo o di errore
    const data = await backendResponse.json();

    // Inoltra la risposta e lo status code esatto al frontend
    return NextResponse.json(data, { status: backendResponse.status });

  } catch (error) {
    console.error(`❌ Errore di connessione al backend per /register:`, error);
    return NextResponse.json(
      { error: 'Impossibile connettersi al servizio di autenticazione.' },
      { status: 503 } // Service Unavailable
    );
  }
}
