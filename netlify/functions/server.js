const serverless = require('serverless-http');
const app = require('../../app');

// 导出 serverless 包装的 Express 应用
exports.handler = serverless(app);

