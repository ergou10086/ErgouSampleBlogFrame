const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { redirectIfAuthenticated } = require('../middlewares/auth');

router.get('/login', redirectIfAuthenticated, authController.showLogin);
router.post('/login', redirectIfAuthenticated, authController.login);
router.get('/register', redirectIfAuthenticated, authController.showRegister);
router.post('/register', redirectIfAuthenticated, authController.register);
router.post('/logout', authController.logout);

module.exports = router;

