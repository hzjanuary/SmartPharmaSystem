const db = require('../config/db');

const categoryController = {

    // 🔹 GET ALL (login là xem được)
    read: async (req, res) => {
        try {
            const [categories] = await db.query("SELECT * FROM product_category");
            res.status(200).json(categories);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // 🔹 CREATE (Manager only)
    create: async (req, res) => {
        try {
            const { category_name, description } = req.body;

            if (!category_name) {
                return res.status(400).json({ message: "Thiếu tên danh mục!" });
            }

            await db.query(
                "INSERT INTO product_category (category_name, description) VALUES (?, ?)",
                [category_name, description]
            );

            res.status(201).json({ message: "Tạo category thành công!" });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // 🔹 UPDATE (Manager only)
    update: async (req, res) => {
        try {
            const id = req.params.id;
            const { category_name, description } = req.body;

            const [category] = await db.query(
                "SELECT * FROM product_category WHERE category_id = ?",
                [id]
            );

            if (category.length === 0) {
                return res.status(404).json({ message: "Category không tồn tại!" });
            }

            await db.query(
                "UPDATE product_category SET category_name = ?, description = ? WHERE category_id = ?",
                [category_name, description, id]
            );

            res.status(200).json({ message: "Cập nhật thành công!" });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // 🔹 DELETE (Manager only)
    delete: async (req, res) => {
        try {
            const id = req.params.id;

            const [category] = await db.query(
                "SELECT * FROM product_category WHERE category_id = ?",
                [id]
            );

            if (category.length === 0) {
                return res.status(404).json({ message: "Category không tồn tại!" });
            }

            await db.query(
                "DELETE FROM product_category WHERE category_id = ?",
                [id]
            );

            res.status(200).json({ message: "Xóa thành công!" });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = categoryController;