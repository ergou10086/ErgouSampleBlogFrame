const supabase = require('../config/supabase');
const { marked } = require('marked');

// 获取所有已发布的文章（分页）
const getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    // 获取总数
    const { count } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published');

    // 获取文章列表
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // 获取所有文章的作者信息
    if (posts && posts.length > 0) {
      const userIds = [...new Set(posts.map(post => post.user_id))];
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, username, display_name')
        .in('id', userIds);

      // 将用户信息合并到文章中
      const profileMap = {};
      if (profiles) {
        profiles.forEach(profile => {
          profileMap[profile.id] = profile;
        });
      }

      posts.forEach(post => {
        post.user_profiles = profileMap[post.user_id] || null;
        // 为首页摘要生成纯文本（去除 markdown 标记）
        if (post.content) {
          const plainText = post.content
            .replace(/#{1,6}\s+/g, '') // 移除标题标记
            .replace(/\*\*([^*]+)\*\*/g, '$1') // 移除粗体标记
            .replace(/\*([^*]+)\*/g, '$1') // 移除斜体标记
            .replace(/`([^`]+)`/g, '$1') // 移除代码标记
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // 移除链接标记
            .replace(/\n+/g, ' ') // 将换行符替换为空格
            .trim();
          post.excerpt = plainText.substring(0, 200);
        } else {
          post.excerpt = '';
        }
      });
    }

    const totalPages = Math.ceil(count / limit);

    res.render('index', {
      posts: posts || [],
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.render('index', {
      posts: [],
      currentPage: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
      error: '加载文章失败'
    });
  }
};

// 获取单篇文章
const getPost = async (req, res) => {
  try {
    const { slug } = req.params;

    const { data: post, error } = await supabase
      .from('posts')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !post) {
      return res.status(404).render('error', {
        message: '文章不存在'
      });
    }

    // 只有已发布或作者本人可以查看
    const token = req.session?.access_token;
    if (post.status !== 'published') {
      if (!token) {
        return res.status(404).render('error', {
          message: '文章不存在'
        });
      }
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user.id !== post.user_id) {
        return res.status(404).render('error', {
          message: '文章不存在'
        });
      }
    }

    // 获取作者信息
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, username, display_name')
      .eq('id', post.user_id)
      .single();

    post.user_profiles = profile || null;

    // 将 markdown 内容转换为 HTML
    post.contentHtml = marked.parse(post.content || '');

    // 增加浏览量
    await supabase
      .from('posts')
      .update({ view_count: (post.view_count || 0) + 1 })
      .eq('id', post.id);

    res.render('post-detail', { post });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).render('error', {
      message: '加载文章失败'
    });
  }
};

// 显示创建文章页面
const showCreatePost = (req, res) => {
  res.render('post-create', { post: null, error: null });
};

// 创建文章
const createPost = async (req, res) => {
  try {
    const token = req.session?.access_token;
    if (!token) {
      return res.redirect('/login');
    }

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return res.redirect('/login');
    }

    const { title, content, status } = req.body;
    // 生成 slug：处理中文和特殊字符
    let slug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // 移除特殊字符
      .replace(/[\s_-]+/g, '-') // 将空格、下划线、连字符替换为单个连字符
      .replace(/^-+|-+$/g, ''); // 移除开头和结尾的连字符
    
    // 如果 slug 为空（例如全是中文），使用时间戳
    if (!slug) {
      slug = 'post';
    }
    
    slug = slug + '-' + Date.now();

    const postData = {
      user_id: user.id,
      title,
      content,
      slug,
      status: status || 'published',
      published_at: status === 'published' ? new Date().toISOString() : null
    };

    const { data: post, error } = await supabase
      .from('posts')
      .insert(postData)
      .select()
      .single();

    if (error) {
      return res.render('post-create', {
        post: { title, content, status },
        error: error.message
      });
    }

    res.redirect(`/posts/${post.slug}`);
  } catch (error) {
    console.error('Create post error:', error);
    res.render('post-create', {
      post: req.body,
      error: '创建文章失败，请重试'
    });
  }
};

// 显示编辑文章页面
const showEditPost = async (req, res) => {
  try {
    const token = req.session?.access_token;
    if (!token) {
      return res.redirect('/login');
    }

    const { data: { user } } = await supabase.auth.getUser(token);
    const { slug } = req.params;

    const { data: post, error } = await supabase
      .from('posts')
      .eq('slug', slug)
      .single();

    if (error || !post) {
      return res.status(404).render('error', {
        message: '文章不存在'
      });
    }

    // 检查是否是作者
    if (post.user_id !== user.id) {
      return res.status(403).render('error', {
        message: '无权编辑此文章'
      });
    }

    res.render('post-edit', { post, error: null });
  } catch (error) {
    console.error('Show edit post error:', error);
    res.status(500).render('error', {
      message: '加载文章失败'
    });
  }
};

// 更新文章
const updatePost = async (req, res) => {
  try {
    const token = req.session?.access_token;
    if (!token) {
      return res.redirect('/login');
    }

    const { data: { user } } = await supabase.auth.getUser(token);
    const { slug } = req.params;
    const { title, content, status } = req.body;

    // 先获取原文章
    const { data: oldPost, error: fetchError } = await supabase
      .from('posts')
      .eq('slug', slug)
      .single();

    if (fetchError || !oldPost) {
      return res.status(404).render('error', {
        message: '文章不存在'
      });
    }

    if (oldPost.user_id !== user.id) {
      return res.status(403).render('error', {
        message: '无权编辑此文章'
      });
    }

    // 如果标题改变，更新 slug
    let newSlug = oldPost.slug;
    if (title !== oldPost.title) {
      let slug = title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // 移除特殊字符
        .replace(/[\s_-]+/g, '-') // 将空格、下划线、连字符替换为单个连字符
        .replace(/^-+|-+$/g, ''); // 移除开头和结尾的连字符
      
      // 如果 slug 为空（例如全是中文），使用时间戳
      if (!slug) {
        slug = 'post';
      }
      
      newSlug = slug + '-' + Date.now();
    }

    const updateData = {
      title,
      content,
      slug: newSlug,
      status: status || oldPost.status,
      updated_at: new Date().toISOString()
    };

    // 如果从未发布过且现在要发布，设置发布时间
    if (oldPost.status !== 'published' && status === 'published' && !oldPost.published_at) {
      updateData.published_at = new Date().toISOString();
    }

    const { data: post, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', oldPost.id)
      .select()
      .single();

    if (error) {
      return res.render('post-edit', {
        post: { ...oldPost, title, content, status },
        error: error.message
      });
    }

    res.redirect(`/posts/${post.slug}`);
  } catch (error) {
    console.error('Update post error:', error);
    res.render('post-edit', {
      post: req.body,
      error: '更新文章失败，请重试'
    });
  }
};

// 删除文章
const deletePost = async (req, res) => {
  try {
    const token = req.session?.access_token;
    if (!token) {
      return res.redirect('/login');
    }

    const { data: { user } } = await supabase.auth.getUser(token);
    const { slug } = req.params;

    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .eq('slug', slug)
      .single();

    if (fetchError || !post) {
      return res.status(404).render('error', {
        message: '文章不存在'
      });
    }

    if (post.user_id !== user.id) {
      return res.status(403).render('error', {
        message: '无权删除此文章'
      });
    }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', post.id);

    if (error) {
      throw error;
    }

    res.redirect('/');
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).render('error', {
      message: '删除文章失败'
    });
  }
};

module.exports = {
  getPosts,
  getPost,
  showCreatePost,
  createPost,
  showEditPost,
  updatePost,
  deletePost
};

