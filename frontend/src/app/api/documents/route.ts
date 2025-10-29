import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = '${process.env.NEXT_PUBLIC_API_URL}'

// GET /api/documents
export async function GET() {
  console.log('🔄 API Route GET ricevuta')
  try {
    const response = await fetch(`${BACKEND_URL}/api/documents`)
    const data = await response.json()
    console.log('✅ GET risposta backend:', response.status)
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Errore GET documents:', error)
    return NextResponse.json(
      { error: 'Errore connessione backend' }, 
      { status: 500 }
    )
  }
}

// POST /api/documents
export async function POST(request: NextRequest) {
  console.log('🔄 API Route POST ricevuta - iniziando elaborazione...')
  
  try {
    const formData = await request.formData()
    console.log('📁 FormData ricevuto, file presente:', formData.has('document'))
    console.log('🚀 Invio al backend Node.js...')
    
    const response = await fetch(`${BACKEND_URL}/api/documents`, {
      method: 'POST',
      body: formData
    })
    
    console.log('✅ Risposta backend ricevuta:', response.status)
    const data = await response.json()
    console.log('📦 Dati backend:', JSON.stringify(data, null, 2))
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Errore POST API Route:', error)
    return NextResponse.json(
      { error: 'Errore elaborazione documento', details: error.message }, 
      { status: 500 }
    )
  }
}
