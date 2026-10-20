const pool = require('../db');

module.exports = {
    list: async function (req, res) {
        try {
            const result = await pool.query(`
                SELECT id, name, is_active, created_at
                FROM categories
                ORDER BY lower(name), id
            `);
            res.json({ categories: result.rows });
        } catch (error) {
            console.error('Error listing categories:', error);
            res.status(500).json({ error: 'Failed to list categories' });
        }
    },

    create: async function (req, res) {
        const name = normalizeName(req.body && req.body.name);
        if (!name) {
            return res.status(400).json({ error: 'Category name is required (maximum 50 characters)' });
        }

        try {
            const result = await pool.query(
                'INSERT INTO categories (name) VALUES ($1) RETURNING id, name, is_active, created_at',
                [name]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            if (error.code === '23505') {
                return res.status(409).json({ error: 'A category with this name already exists' });
            }
            console.error('Error creating category:', error);
            res.status(500).json({ error: 'Failed to create category' });
        }
    },

    update: async function (req, res) {
        const name = normalizeName(req.body && req.body.name);
        const id = Number.parseInt(req.params.categoryId, 10);
        if (!name || !Number.isInteger(id) || id < 1) {
            return res.status(400).json({ error: 'A valid category ID and name are required' });
        }

        let client;
        try {
            client = await pool.connect();
            await client.query('BEGIN');
            const updated = await client.query(
                'UPDATE categories SET name = $1 WHERE id = $2 RETURNING id, name, is_active, created_at',
                [name, id]
            );
            if (updated.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Category not found' });
            }
            await client.query('COMMIT');
            res.json(updated.rows[0]);
        } catch (error) {
            if (client) {
                await client.query('ROLLBACK');
            }
            if (error.code === '23505') {
                return res.status(409).json({ error: 'A category with this name already exists' });
            }
            console.error('Error updating category:', error);
            res.status(500).json({ error: 'Failed to update category' });
        } finally {
            if (client) {
                client.release();
            }
        }
    },

    softDelete: async function (req, res) {
        const id = Number.parseInt(req.params.categoryId, 10);
        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({ error: 'A valid category ID is required' });
        }

        try {
            const result = await pool.query(
                'UPDATE categories SET is_active = FALSE WHERE id = $1 RETURNING id, name, is_active',
                [id]
            );
            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Category not found' });
            }
            res.json({ message: 'Category deactivated successfully', category: result.rows[0] });
        } catch (error) {
            console.error('Error deactivating category:', error);
            res.status(500).json({ error: 'Failed to deactivate category' });
        }
    }
};

function normalizeName(value) {
    if (typeof value !== 'string') {
        return '';
    }
    const name = value.trim();
    return name.length > 0 && name.length <= 50 ? name : '';
}
