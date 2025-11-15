require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const errorHandler = require('./src/middlewares/errorHandler');
const supabase = require('./src/config/supabase');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
// 增加请求体大小限制以支持大文章（50MB）
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(methodOverride('_method'));

// Session 配置
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24小时
  }
}));

// 视图引擎配置
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// 使用 express-ejs-layouts
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// 静态文件
app.use(express.static(path.join(__dirname, 'public')));

// 中间件：将用户信息传递给所有视图
app.use(async (req, res, next) => {
  try {
    const token = req.session?.access_token;
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      res.locals.user = user || null;
    } else {
      res.locals.user = null;
    }
  } catch (error) {
    res.locals.user = null;
  }
  next();
});

// 路由
app.use('/', require('./src/routes/index'));
app.use('/auth', require('./src/routes/auth'));
app.use('/posts', require('./src/routes/posts'));

// 404 处理
app.use((req, res) => {
  res.status(404).render('error', {
    message: '页面不存在'
  });
});

// 错误处理
app.use(errorHandler);

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

