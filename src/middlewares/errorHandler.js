// 错误处理中间件
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // 处理请求体过大错误
  if (err.type === 'entity.too.large' || err.message?.includes('too large')) {
    return res.status(413).render('error', {
      message: '文章内容太大，请减少内容或分段发布。最大支持 50MB。'
    });
  }
  
  // 处理其他错误
  let statusCode = err.status || 500;
  let message = err.message || '服务器内部错误';
  
  // 将英文错误信息转换为中文（如果需要）
  if (message === 'request entity too large') {
    message = '请求内容太大，请减少内容大小。';
    statusCode = 413;
  }
  
  res.status(statusCode);
  res.render('error', {
    message: message,
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
};

module.exports = errorHandler;

