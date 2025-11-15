// Netlify Functions 需要能够找到项目根目录的依赖
// 设置 NODE_PATH 以确保可以找到 node_modules
const path = require('path');
const rootPath = path.resolve(__dirname, '../..');

// 将根目录的 node_modules 添加到模块搜索路径
if (!process.env.NODE_PATH) {
  process.env.NODE_PATH = path.join(rootPath, 'node_modules');
} else {
  process.env.NODE_PATH = `${process.env.NODE_PATH}:${path.join(rootPath, 'node_modules')}`;
}

// 重新初始化模块路径
require('module').Module._initPaths();

// 现在可以正常加载依赖了
const serverless = require('serverless-http');
const app = require('../../app');

// 导出 serverless 包装的 Express 应用
exports.handler = serverless(app);

