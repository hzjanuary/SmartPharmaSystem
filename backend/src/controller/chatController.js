const axios = require('axios');

const chatController = {
    message: async (req, res) => {
        try {
            const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
            const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

            if (!message) {
                return res.status(400).json({ message: 'Noi dung tin nhan khong hop le.' });
            }

            const response = await axios.post(
                `${aiServiceUrl}/api/v1/chat`,
                { message },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000,
                    validateStatus: () => true
                }
            );

            const payload = response.data || {};

            if (response.status >= 400) {
                return res.status(response.status).json({
                    message: payload.detail || payload.message || 'Khong the ket noi AI Service.'
                });
            }

            return res.status(200).json({
                reply: payload.reply || 'Toi chua co cau tra loi phu hop luc nay.'
            });
        } catch (error) {
            return res.status(500).json({
                message: `Loi khi goi AI Service: ${error.message}`
            });
        }
    }
};

module.exports = chatController;
