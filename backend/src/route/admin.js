const router = require('express').Router();
const adminController = require('../controller/adminController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth.verifyLogin, auth.verifyManager, adminController.getAllUsers);

router.put('/role', auth.verifyLogin, auth.verifyManager, adminController.updateRole);

module.exports = router;