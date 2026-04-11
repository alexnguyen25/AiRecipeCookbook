import db from '../config/db.js';
import bcrypt from 'bcryptjs';

class User {
    static async create( {email, password, name}) {

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await db.query(
            'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
            [email, hashedPassword, name]
        );

        return result.rows[0];
    }

    static async findByEmail(email) {
        const result = await db.query('SELECT id, email, password_hash, name, created_at FROM users WHERE email = $1', [email]);
        return result.rows[0];
    }

    static async findById(id) {
        const result = await db.query('SELECT id, email, password_hash, name, created_at FROM users WHERE id = $1', [id]);
        return result.rows[0];
    }

    static async update(id, { email, name }) {
        const result = await db.query(
            `UPDATE users
            SET name = COALESCE($1, name),
            email = COALESCE($2, email)
            WHERE id = $3
            RETURNING id, email, name, created_at`,
            [name, email, id]
        );

        return result.rows[0];
    }

    static async updatePassword(id, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [hashedPassword, id]
        );
    }

    static async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    static async delete(id) {
        await db.query('DELETE FROM users WHERE id = $1', [id]);
    }
}

export default User;