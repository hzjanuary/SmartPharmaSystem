const db = require('../config/db');

const adminController = {

    // 🔹 GET ALL USERS (Manager only)
    getAllUsers: async (req, res) => {
        try {
            const [users] = await db.query(
                "SELECT user_id, username, full_name, role, created_at FROM user"
            );

            res.status(200).json(users);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // 🔹 UPDATE ROLE Chỉ thay đổi role ! (Manager only)
    updateRole: async (req, res) => {
        try {
            const { user_id, role } = req.body;

            if (!user_id || !role) {
                return res.status(400).json({ message: "Thiếu dữ liệu!" });
            }

            if (!['manager', 'staff'].includes(role)) {
                return res.status(400).json({ message: "Role không hợp lệ!" });
            }

            // Check user tồn tại
            const [user] = await db.query(
                "SELECT * FROM user WHERE user_id = ?",
                [user_id]
            );

            if (user.length === 0) {
                return res.status(404).json({ message: "User không tồn tại!" });
            }

            await db.query(
                "UPDATE user SET role = ? WHERE user_id = ?",
                [role, user_id]
            );

            res.status(200).json({ message: "Cập nhật role thành công!" });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = adminController 