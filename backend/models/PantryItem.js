import db from '../config/db.js';

class PantryItem {
    /**
     * Create a new pantry item
     */
    static async create(userId, itemData) {
        const { name, quantity, unit, category, expiry_date, is_running_low = false } = itemData;

        const result = await db.query(
            `INSERT INTO pantry_items (user_id, name, quantity, unit, category, expiry_date, is_running_low)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [userId, name, quantity, unit, category, expiry_date, is_running_low]
        );

        return result.rows[0];
    }

    /**
     * Find all pantry items for a user (optional filters)
     */
    static async findByUserId(userId, filters = {}) {
        let query = `SELECT * FROM pantry_items WHERE user_id = $1`;
        const params = [userId];
        let paramCount = 1;

        if (filters.category) {
            paramCount++;
            query += ` AND category = $${paramCount}`;
            params.push(filters.category);
        }

        if (filters.is_running_low !== undefined) {
            paramCount++;
            query += ` AND is_running_low = $${paramCount}`;
            params.push(filters.is_running_low);
        }

        if (filters.search) {
            paramCount++;
            query += ` AND name ILIKE $${paramCount}`;
            params.push(`%${filters.search}%`);
        }

        query += ` ORDER BY expiry_date ASC NULLS LAST`;

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get items expiring within the next `days` days (inclusive)
     */
    static async getExpiringSoon(userId, days = 7) {
        const result = await db.query(
            `SELECT * FROM pantry_items
            WHERE user_id = $1
            AND expiry_date IS NOT NULL
            AND expiry_date >= CURRENT_DATE
            AND expiry_date <= CURRENT_DATE + ($2::integer * INTERVAL '1 day')
            ORDER BY expiry_date ASC`,
            [userId, days]
        );

        return result.rows;
    }

    static async findById(id, userId) {
        const result = await db.query(
            `SELECT * FROM pantry_items WHERE id = $1 AND user_id = $2`,
            [id, userId]
        );

        return result.rows[0];
    }

    static async update(id, userId, itemData) {
        const { name, unit, category, expiry_date, is_running_low } = itemData;

        const result = await db.query(
            `UPDATE pantry_items
            SET name = COALESCE($1, name),
            unit = COALESCE($2, unit),
            category = COALESCE($3, category),
            expiry_date = COALESCE($4, expiry_date),
            is_running_low = COALESCE($5, is_running_low)
            WHERE id = $6 AND user_id = $7
            RETURNING *`,
            [name, unit, category, expiry_date, is_running_low, id, userId]
        );

        return result.rows[0];
    }

    static async delete(id, userId) {
        const result = await db.query(
            `DELETE FROM pantry_items WHERE id = $1 AND user_id = $2 RETURNING *`,
            [id, userId]
        );
        return result.rows[0];
    }

    static async getStats(userId) {
        const result = await db.query(
            `SELECT COUNT(*) AS total_items,
            COUNT(DISTINCT category) AS total_categories,
            COUNT(*) FILTER (WHERE is_running_low) AS running_low_count,
            COUNT(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date > CURRENT_DATE AND expiry_date <= CURRENT_DATE + INTERVAL '7 days') AS expiring_soon_count
            FROM pantry_items WHERE user_id = $1`,
            [userId]
        );

        return result.rows[0];
    }
}

export default PantryItem;
