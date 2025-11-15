const supabase = require('../config/supabase');

// 显示登录页面
const showLogin = (req, res) => {
  res.render('login', { error: null });
};

// 处理登录
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.render('login', { error: error.message });
    }

    // 保存 session
    req.session.access_token = data.session.access_token;
    req.session.refresh_token = data.session.refresh_token;
    req.session.user = data.user;

    // 检查并创建用户资料（如果不存在）
    try {
      const { createClient } = require('@supabase/supabase-js');
      const userSupabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );
      
      await userSupabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });

      // 检查用户资料是否存在
      const { data: profile, error: profileError } = await userSupabase
        .from('user_profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();

      // 如果不存在，创建它
      if (profileError || !profile) {
        const username = data.user.user_metadata?.username || 
                        data.user.email?.split('@')[0] || 
                        'user';
        
        await userSupabase
          .from('user_profiles')
          .upsert({
            id: data.user.id,
            username: username,
            display_name: data.user.user_metadata?.display_name || username
          }, {
            onConflict: 'id'
          });
      }
    } catch (profileError) {
      console.error('Profile check/creation error (non-critical):', profileError);
      // 忽略错误，继续登录流程
    }

    res.redirect('/');
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', { error: '登录失败，请重试' });
  }
};

// 显示注册页面
const showRegister = (req, res) => {
  res.render('register', { error: null });
};

// 处理注册
const register = async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // 注册用户，传递 username 到 metadata 中
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
          display_name: username
        }
      }
    });

    if (authError) {
      return res.render('register', { error: authError.message });
    }

    // 如果启用了邮箱确认，session 可能为 null
    // 用户资料会通过数据库触发器自动创建
    if (authData.session) {
      // 如果有 session（未启用邮箱确认），保存它
      req.session.access_token = authData.session.access_token;
      req.session.refresh_token = authData.session.refresh_token;
      req.session.user = authData.user;
      
      // 尝试创建或更新用户资料（如果触发器未执行）
      try {
        const { createClient } = require('@supabase/supabase-js');
        const userSupabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_ANON_KEY
        );
        
        await userSupabase.auth.setSession({
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token
        });

        await userSupabase
          .from('user_profiles')
          .upsert({
            id: authData.user.id,
            username: username,
            display_name: username
          }, {
            onConflict: 'id'
          });
      } catch (profileError) {
        console.error('Profile creation error (non-critical):', profileError);
        // 忽略错误，因为触发器应该已经创建了
      }
      
      res.redirect('/');
    } else {
      // 需要邮箱确认
      res.render('register', { 
        success: true,
        message: '注册成功！请检查您的邮箱并点击确认链接以完成注册。' 
      });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.render('register', { error: '注册失败，请重试' });
  }
};

// 登出
const logout = async (req, res) => {
  try {
    const token = req.session?.access_token;
    if (token) {
      await supabase.auth.signOut();
    }
    req.session.destroy();
    res.redirect('/');
  } catch (error) {
    console.error('Logout error:', error);
    req.session.destroy();
    res.redirect('/');
  }
};

module.exports = {
  showLogin,
  login,
  showRegister,
  register,
  logout
};

