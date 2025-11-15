const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { requireAuth } = require('../middlewares/auth');

// 需要认证的路由（必须在参数路由之前）
router.get('/create/new', requireAuth, postController.showCreatePost);
router.post('/create/new', requireAuth, postController.createPost);
router.get('/:slug/edit', requireAuth, postController.showEditPost);
router.post('/:slug/edit', requireAuth, postController.updatePost);
router.post('/:slug/delete', requireAuth, postController.deletePost);

// 公开路由（放在最后，避免匹配到上面的路由）
router.get('/:slug', postController.getPost);

module.exports = router;

