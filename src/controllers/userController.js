const supabase = require('../config/supabase');

// 获取当前用户信息
const getCurrentUser = async (req, res) => {
  try {
    const token = req.session?.access_token;
    if (!token) {
      return res.json({ user: null });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.json({ user: null });
    }

    // 获取用户资料
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    res.json({ user, profile });
  } catch (error) {
    console.error('Get current user error:', error);
    res.json({ user: null });
  }
};

module.exports = {
  getCurrentUser
};

