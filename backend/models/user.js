import bcrypt from 'bcryptjs';
import dbInstance from '../database/db.js';

const { db } = dbInstance;

class User {
  static async create(userData) {
    const { email, password, name, company } = userData;
    
    try {
      const hash = await bcrypt.hash(password, 10);
      
      const stmt = db.prepare(`
        INSERT INTO users (email, password_hash, name, company) 
        VALUES (?, ?, ?, ?)
      `);
      
      const result = stmt.run(email, hash, name, company);
      
      return { 
        id: result.lastInsertRowid, 
        email, 
        name, 
        company 
      };
    } catch (error) {
      throw error;
    }
  }

  static findByEmail(email) {
    const stmt = db.prepare(`SELECT * FROM users WHERE email = ?`);
    return stmt.get(email);
  }

  static findById(id) {
    const stmt = db.prepare(`
      SELECT id, email, name, company, created_at 
      FROM users WHERE id = ?
    `);
    return stmt.get(id);
  }

  static async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }
}

export default User;