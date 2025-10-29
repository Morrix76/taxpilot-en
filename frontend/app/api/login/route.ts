import { NextResponse } from 'next/server'
import { generateToken } from '@/lib/auth'

const FAKE_USER = {
  id: 1,
  email: 'user@example.com',
  password: 'password123',
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e password obbligatorie.' }, { status: 400 })
    }

    if (email === FAKE_USER.email && password === FAKE_USER.password) {
      const token = generateToken(FAKE_USER.id, FAKE_USER.email)
      return NextResponse.json({ token })
    }

    return NextResponse.json({ error: 'Credenziali non valide.' }, { status: 401 })
  } catch (error) {
    return NextResponse.json({ error: 'Formato JSON non valido.' }, { status: 400 })
  }
}
