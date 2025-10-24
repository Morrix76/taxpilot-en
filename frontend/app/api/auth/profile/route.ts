import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'http://localhost:3003/api/auth/profile';

/**
 * Gestisce GET /api/auth/profile
 * Inoltra la richiesta per ottenere il profilo utente al backend,
 * passando l'header di autorizzazione.
 */
export async function GET(request: NextRequest) {
  try {
    // Estrai l'header Authorization dalla richiesta in arrivo
    const authorizationHeader = request.headers.get('Authorization');

    if (!authorizationHeader) {
        return NextResponse.json({ error: 'Header di autorizzazione mancante.' }, { status: 401 });
    }

    const backendResponse = await fetch(BACKEND_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorizationHeader, // Inoltra l'header al backend
      },
    });

    const data = await backendResponse.json();

    return NextResponse.json(data, { status: backendResponse.status });

  } catch (error) {
    console.error(`❌ Errore di connessione al backend per /profile:`, error);
    return NextResponse.json(
      { error: 'Impossibile connettersi al servizio di autenticazione.' },
      { status: 503 }
    );
  }
}
