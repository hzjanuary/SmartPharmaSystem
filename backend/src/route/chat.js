const express = require('express');
const router = express.Router();
const Middleware = require('../middleware/authMiddleware');
const chatController = require('../controller/chatController');

router.post('/message', Middleware.verifyLogin, chatController.message);

module.exports = router;
