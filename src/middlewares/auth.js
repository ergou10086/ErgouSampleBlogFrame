const supabase = require('../config/supabase');

// 检查用户是否已登录
const requireAuth = async (req, res, next) => {
  try {
    const token = req.session?.access_token;
    
    if (!token) {
      return res.redirect('/login');
    }

    // 验证 token 并获取用户信息
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      req.session.destroy();
      return res.redirect('/login');
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    req.session.destroy();
    res.redirect('/login');
  }
};

// 可选：如果已登录则重定向到首页
const redirectIfAuthenticated = (req, res, next) => {
  if (req.session?.access_token) {
    return res.redirect('/');
  }
  next();
};

module.exports = {
  requireAuth,
  redirectIfAuthenticated
};

