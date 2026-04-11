import db from '../config/db.js';

class Recipe {
    /** Minutes as integer; Gemini often returns strings like "15" or "15 minutes". */
    static _parseTimeMinutes(value) {
        if (value == null || value === '') return null;
        if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
        const m = String(value).match(/\d+/);
        return m ? parseInt(m[0], 10) : null;
    }

    static _toNumber(value) {
        if (value == null || value === '') return null;
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
    }

    /** Strip characters that can break JSON / Postgres json parsers */
    static _sanitizeText(s) {
        return String(s ?? '').replace(/\u0000/g, '');
    }

    /** Turn one step (string | object) into a single display string */
    static _instructionStepToString(step) {
        if (step == null) return '';
        if (typeof step === 'string') return Recipe._sanitizeText(step);
        if (typeof step === 'object') {
            const o = step;
            const text =
                o.text ?? o.instruction ?? o.description ?? o.detail ?? (typeof o.step === 'string' ? o.step : null);
            if (text != null) return Recipe._sanitizeText(String(text));
            try {
                return Recipe._sanitizeText(JSON.stringify(o));
            } catch {
                return '';
            }
        }
        return Recipe._sanitizeText(String(step));
    }

    /**
     * Gemini may return string[], objects, or a JSON string. We always persist a JSON array of strings.
     */
    static _flattenInstructionsToStrings(raw) {
        if (raw == null) return [];

        let v = raw;
        if (typeof v === 'string') {
            const t = v.trim();
            if (t.startsWith('[')) {
                try {
                    v = JSON.parse(t);
                } catch {
                    return [Recipe._sanitizeText(t)];
                }
            } else {
                return [Recipe._sanitizeText(t)];
            }
        }

        if (!Array.isArray(v)) {
            if (typeof v === 'object') {
                const keys = Object.keys(v);
                const numericKeys = keys.length > 0 && keys.every((k) => /^\d+$/.test(k));
                if (numericKeys) {
                    v = keys
                        .sort((a, b) => Number(a) - Number(b))
                        .map((k) => v[k]);
                } else {
                    return [Recipe._instructionStepToString(v)];
                }
            } else {
                return [Recipe._instructionStepToString(v)];
            }
        }

        return v.map((step) => Recipe._instructionStepToString(step));
    }

    /** Valid JSON text for Postgres jsonb (array of strings only) */
    static _instructionsJsonText(raw) {
        return JSON.stringify(Recipe._flattenInstructionsToStrings(raw));
    }

    /**
     * Create a new recipe with ingredients and nutrition
     */
    static async create(userId, recipeData) {
        const {
            name,
            description,
            cuisine_type,
            difficulty,
            prep_time,
            cook_time,
            servings,
            instructions,
            dietary_tags = [],
            user_notes,
            image_url,
            ingredients = [],
            nutrition = {},
        } = recipeData;

        if (!name || String(name).trim() === '') {
            throw new Error('Recipe name is required');
        }

        const prepTimeInt = Recipe._parseTimeMinutes(prep_time);
        const cookTimeInt = Recipe._parseTimeMinutes(cook_time);
        const servingsInt = Math.max(1, parseInt(String(servings), 10) || 4);
        const tags = Array.isArray(dietary_tags) ? dietary_tags : [];

        const client = await db.pool.connect();
        let recipeId;
        try {
            await client.query('BEGIN');

            const instructionsJson = Recipe._instructionsJsonText(instructions);

            const recipeResult = await client.query(
                `INSERT INTO recipes
                (user_id, name, description, cuisine_type, difficulty, prep_time, cook_time, servings, instructions, dietary_tags, user_notes, image_url)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12)
                RETURNING *`,
                [
                    userId,
                    name,
                    description ?? null,
                    cuisine_type ?? null,
                    difficulty ?? 'medium',
                    prepTimeInt,
                    cookTimeInt,
                    servingsInt,
                    instructionsJson,
                    tags,
                    user_notes ?? null,
                    image_url ?? null,
                ]
            );

            const recipe = recipeResult.rows[0];
            recipeId = recipe.id;

            if (ingredients.length > 0) {
                const ingreValues = ingredients
                    .map((ing, idx) => `($1, $${idx * 3 + 2}, $${idx * 3 + 3}, $${idx * 3 + 4})`)
                    .join(', ');
                const ingredientParams = [recipe.id];
                ingredients.forEach((ing) => {
                    const qty = Recipe._toNumber(ing.quantity);
                    ingredientParams.push(ing?.name ?? 'Unknown', qty != null ? qty : 0, ing?.unit ?? 'pieces');
                });

                await client.query(
                    `INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit)
                    VALUES ${ingreValues}`,
                    ingredientParams
                );
            }

            const nut = nutrition && typeof nutrition === 'object' ? nutrition : {};
            const cal = Recipe._toNumber(nut.calories);
            const prot = Recipe._toNumber(nut.protein);
            const carbs = Recipe._toNumber(nut.carbs);
            const fats = Recipe._toNumber(nut.fats);
            const fiber = Recipe._toNumber(nut.fiber);
            if ([cal, prot, carbs, fats, fiber].some((v) => v != null)) {
                await client.query(
                    `INSERT INTO recipe_nutrition (recipe_id, calories, protein, carbs, fats, fiber)
                    VALUES ($1, $2, $3, $4, $5, $6)`,
                    [recipe.id, cal, prot, carbs, fats, fiber]
                );
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

        return await this.findById(recipeId, userId);
    }

    /**
     * Find a recipe by ID with ingredients and nutrition
     */
    static async findById(id, userId) {
        const recipeResult = await db.query(`SELECT * FROM recipes WHERE id = $1 AND user_id = $2`, [id, userId]);

        if (recipeResult.rows.length === 0) {
            return null;
        }

        const recipe = recipeResult.rows[0];

        const ingredientsResult = await db.query(
            `SELECT ingredient_name as name, quantity, unit FROM recipe_ingredients WHERE recipe_id = $1`,
            [id]
        );

        const nutritionResult = await db.query(
            `SELECT calories, protein, carbs, fats, fiber FROM recipe_nutrition WHERE recipe_id = $1`,
            [id]
        );

        const nutrition = nutritionResult.rows[0] || null;

        return { ...recipe, ingredients: ingredientsResult.rows, nutrition };
    }

    /**
     * Get all recipes for a user with filters
     */

    static async findByUserId(userId, filters = {}) {
        let query = `SELECT r.*, rn.calories FROM recipes r LEFT JOIN recipe_nutrition rn ON r.id = rn.recipe_id
        WHERE r.user_id = $1`;

        const params = [userId];
        let paramCount = 1;

        if (filters.search) {
            paramCount++;
            query += ` AND (r.name ILIKE $${paramCount} OR r.description ILIKE $${paramCount})`;
            params.push(`%${filters.search}%`);
        }

        if(filters.cuisine_type) {
            paramCount++;
            query += ` AND r.cuisine_type = $${paramCount}`;
            params.push(filters.cuisine_type);
        }

        if(filters.difficulty) {
            paramCount++;
            query += ` AND r.difficulty = $${paramCount}`;
            params.push(filters.difficulty);
        }

        if (filters.dietary_tags) {
            paramCount++;
            query += ` AND $${paramCount} = ANY(r.dietary_tags)`;
            params.push(filters.dietary_tags);
        }

        if (filters.max_cook_time) {
            paramCount++;
            query += ` AND r.cook_time <= $${paramCount}`;
            params.push(filters.max_cook_time);
        }

        // Sorting
        const sortBy = filters.sort_by || 'created_at';
        const sortOrder = filters.sort_order || 'desc';
        query += ` ORDER BY r.${sortBy} ${sortOrder}`;

        // Pagination
        const limit = filters.limit || 20;
        const offset = filters.offset || 10;
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(limit);

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get recipe stats for a users
     */

    static async getRecent(userId, limit = 5) {
        const result = await db.query(
            `SELECT r.*, rn.calories FROM recipes r LEFT JOIN recipe_nutrition rn ON r.id = rn.recipe_id
            WHERE r.user_id = $1 ORDER BY r.created_at DESC LIMIT $2`,
            [userId, limit]
        );
        return result.rows;
    }
    
    /**
     * Update a recipe by ID
     */
    static async update(id, userId, updates) {
        const{
            name,
            description,
            cuisine_type,
            difficulty,
            prep_time,
            cook_time,
            servings,
            instructions,
            dietary_tags,
            user_notes,
            image_url,
        } = updates;

        const result = await db.query(
            `UPDATE recipes
            SET name = COALESCE($1, name),
            description = COALESCE($2, description),
            cuisine_type = COALESCE($3, cuisine_type),
            difficulty = COALESCE($4, difficulty),
            prep_time = COALESCE($5, prep_time),
            cook_time = COALESCE($6, cook_time),
            servings = COALESCE($7, servings),
            instructions = COALESCE($8::jsonb, instructions),
            dietary_tags = COALESCE($9, dietary_tags),
            user_notes = COALESCE($10, user_notes),
            image_url = COALESCE($11, image_url)
            WHERE id = $12 AND user_id = $13
            RETURNING *`,
            [
                name,
                description,
                cuisine_type,
                difficulty,
                prep_time,
                cook_time,
                servings,
                instructions != null ? Recipe._instructionsJsonText(instructions) : null,
                dietary_tags,
                user_notes,
                image_url,
                id,
                userId,
            ]
        );

        return result.rows[0];
    }

    /**
     * Delete a recipe by ID
     */
    static async delete(id, userId) {
        await db.query(
            `DELETE FROM recipes WHERE id = $1 AND user_id = $2`,
            [id, userId]
        );
    }

    /**
     * Get recipe stats for a users
     */
    static async getStats(userId) {
        const result = await db.query(
            `SELECT COUNT(*) AS total_recipes, COUNT(DISTINCT cuisine_type) AS total_cuisines, AVG(cook_time) AS avg_cook_time FROM recipes WHERE user_id = $1`,
            [userId]
        );
        return result.rows[0];
    }
}


export default Recipe;