import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pg from 'pg';

const JWT_SECRET = process.env.JWT_SECRET || 'voicecrm_jwt_secret_2026_x9kQz';
const JWT_EXPIRES = '30d';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
}

export const authService = {
  async login(email: string, password: string): Promise<{ token: string; user: AuthUser } | null> {
    const { rows } = await pool.query(
      `SELECT id, name, email, role, password_hash FROM public.crm_employees WHERE LOWER(email) = $1`,
      [email.toLowerCase().trim()]
    );
    if (!rows.length || !rows[0].password_hash) return null;
    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) return null;
    const user: AuthUser = { id: rows[0].id, name: rows[0].name, email: rows[0].email, role: rows[0].role };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES } as any);
    return { token, user };
  },

  async createUser(data: { name: string; email: string; password: string; role?: string }): Promise<AuthUser> {
    const hash = await bcrypt.hash(data.password, 10);
    const role = data.role === 'admin' ? 'admin' : 'employee';
    const { rows } = await pool.query(
      `INSERT INTO public.crm_employees (name, email, role, password_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, role=EXCLUDED.role, password_hash=EXCLUDED.password_hash
       RETURNING id, name, email, role`,
      [data.name.trim(), data.email.toLowerCase().trim(), role, hash]
    );
    return rows[0];
  },

  async listUsers(): Promise<(AuthUser & { phone?: string; department?: string; created_at?: string })[]> {
    const { rows } = await pool.query(
      `SELECT id, name, email, role, phone, department, created_at FROM public.crm_employees ORDER BY created_at ASC`
    );
    return rows;
  },

  async deleteUser(id: string): Promise<boolean> {
    const { rowCount } = await pool.query(`DELETE FROM public.crm_employees WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  },

  verifyToken(authHeader?: string): AuthUser | null {
    if (!authHeader?.startsWith('Bearer ')) return null;
    try {
      const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET) as AuthUser;
      return decoded;
    } catch {
      return null;
    }
  },
};
