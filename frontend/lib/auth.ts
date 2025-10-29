import jwt from 'jsonwebtoken'

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key'

export function generateToken(id: number, email: string): string {
  const payload = { id, email }
  return jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' })
}

export function verifyToken(token: string): { id: string; email: string } | null {
  try {
    return jwt.verify(token, SECRET_KEY) as { id: string; email: string }
  } catch (err) {
    return null
  }
}
