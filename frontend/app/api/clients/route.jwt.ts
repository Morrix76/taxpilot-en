import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = ' + process.env.NEXT_PUBLIC_API_URL + '/api/clients';

/**
 * Gestisce GET /api/clients
 * Inoltra la richiesta per ottenere tutti i clienti al backend Express.
 */
export async function GET(request: NextRequest) {
  try {
    const backendResponse = await fetch(BACKEND_URL);

    // Controlla se la risposta dal backend Ã¨ valida
    if (!backendResponse.ok) {
      // Inoltra la risposta di errore del backend al frontend
      const errorData = await backendResponse.json();
      return NextResponse.json(errorData, { status: backendResponse.status });
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Errore di connessione al backend:', error);
    return NextResponse.json(
      { error: 'Impossibile connettersi al servizio backend.' },
      { status: 503 } // Service Unavailable
    );
  }
}

/**
 * Gestisce POST /api/clients
 * Inoltra la richiesta per creare un nuovo cliente al backend Express.
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

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      return NextResponse.json(errorData, { status: backendResponse.status });
    }

    const data = await backendResponse.json();
    return NextResponse.json(data, { status: 201 });

  } catch (error) {
    console.error('Errore di connessione al backend:', error);
    return NextResponse.json(
      { error: 'Impossibile connettersi al servizio backend.' },
      { status: 503 }
    );
  }
}

