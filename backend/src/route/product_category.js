const router = require('express').Router();
const product_category = require('../controller/product_categoryController');
const auth = require('../middleware/authMiddleware');

// ai login cũng xem được
router.get('/', auth.verifyLogin, product_category.read);

// chỉ manager
router.post('/', auth.verifyLogin, auth.verifyManager, product_category.create);
router.put('/:id', auth.verifyLogin, auth.verifyManager, product_category.update);
router.delete('/:id', auth.verifyLogin, auth.verifyManager, product_category.delete);

module.exports = router;