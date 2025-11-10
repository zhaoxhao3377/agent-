const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const winston = require('winston');

const app = express();

// 配置日志
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`)
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// 全局异常捕获
process.on('uncaughtException', (err) => {
  logger.error(`未捕获的异常: ${err.message}`);
  logger.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`未处理的Promise拒绝: ${reason}`);
});

// 允许跨域访问
app.use(helmet({
  contentSecurityPolicy: false,
  frameguard: false
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求日志中间件
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// 静态资源目录
const publicDir = path.resolve(__dirname, '../frontend/public');
const distDir = path.resolve(__dirname, '../frontend/dist');
const publicPath = fs.existsSync(publicDir) ? publicDir : distDir;
app.use(express.static(publicPath));

// 数据库初始化
const { initDatabase } = require('./server/database/postgres');
initDatabase().then(() => {
  logger.info('PostgreSQL数据库初始化完成');
}).catch((error) => {
  logger.error(`PostgreSQL数据库初始化失败: ${error.message}`);
});

// API路由 - 灵魂画像引擎
const profileRoutes = require('./server/routes/profile');
app.use('/api/profile', profileRoutes);

// API路由 - 智能社交助手
const assistantRoutes = require('./server/routes/assistant');
app.use('/api/assistant', assistantRoutes);

// 用户管理路由（基础功能）
app.post('/api/users/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const { v4: uuidv4 } = require('uuid');
    const bcrypt = require('bcrypt');
    const { userOperations } = require('./server/database/postgres');

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    // 检查用户是否已存在
    const existingUser = await userOperations.findByUsername(username);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: '用户名已存在'
      });
    }

    // 创建新用户
    const hashedPassword = bcrypt.hashSync(password, 10);
    const userId = uuidv4();
    
    await userOperations.create({
      id: userId,
      username,
      password: hashedPassword,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
      bio: '这个人很神秘，还没有填写简介...'
    });

    res.json({
      success: true,
      message: '注册成功',
      data: {
        userId,
        username
      }
    });

  } catch (error) {
    logger.error(`用户注册失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const bcrypt = require('bcrypt');
    const { userOperations } = require('./server/database/postgres');

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    const user = await userOperations.findByUsername(username);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '密码错误'
      });
    }

    res.json({
      success: true,
      message: '登录成功',
      data: {
        userId: user.id,
        username: user.username,
        avatar: user.avatar,
        bio: user.bio
      }
    });

  } catch (error) {
    logger.error(`用户登录失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

// 用户瞬间发布
app.post('/api/moments/create', async (req, res) => {
  try {
    const { userId, content, contentType } = req.body;
    const { v4: uuidv4 } = require('uuid');
    const { momentOperations } = require('./server/database/postgres');

    if (!userId || !content) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：userId 和 content'
      });
    }

    const momentId = uuidv4();
    await momentOperations.create({
      id: momentId,
      user_id: userId,
      content,
      content_type: contentType || 'text',
      sentiment: analyzeSentiment(content),
      keywords: extractKeywords(content)
    });

    res.json({
      success: true,
      message: '瞬间发布成功',
      data: { momentId }
    });

  } catch (error) {
    logger.error(`发布瞬间失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

// 获取用户瞬间
app.get('/api/moments/list', async (req, res) => {
  try {
    const { userId } = req.query;
    const { momentOperations } = require('./server/database/postgres');

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：userId'
      });
    }

    const moments = await momentOperations.findByUserId(userId);

    res.json({
      success: true,
      data: moments.map(m => ({
        id: m.id,
        content: m.content,
        contentType: m.content_type,
        sentiment: m.sentiment,
        keywords: JSON.parse(m.keywords || '[]'),
        createdAt: m.created_at
      }))
    });

  } catch (error) {
    logger.error(`获取瞬间失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

// 处理前端路由
app.get('*', (req, res) => {
  const filePath = path.join(publicPath, req.path);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.sendFile(filePath);
  } else {
    res.sendFile(path.join(publicPath, 'index.html'));
  }
});

// 404错误处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '请求的资源不存在'
  });
});

// 服务器错误处理
app.use((err, req, res, next) => {
  logger.error(`服务器错误: ${err.message}`);
  logger.error(err.stack);
  
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 辅助函数：情感分析
function analyzeSentiment(text) {
  const positiveWords = ['开心', '快乐', '美好', '幸福', '喜欢', '爱', '棒', '好'];
  const negativeWords = ['难过', '伤心', '孤独', '失落', '遗憾', '痛', '累'];
  
  let score = 0;
  positiveWords.forEach(word => {
    if (text.includes(word)) score += 1;
  });
  negativeWords.forEach(word => {
    if (text.includes(word)) score -= 1;
  });
  
  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}

// 辅助函数：关键词提取
function extractKeywords(text) {
  const keywords = [];
  const interestWords = ['音乐', '电影', '书', '旅行', '美食', '运动', '科技', '艺术', '哲学', '摄影'];
  
  interestWords.forEach(word => {
    if (text.includes(word)) {
      keywords.push(word);
    }
  });
  
  return keywords.slice(0, 5);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Soulmate Agent 服务器运行在端口 ${PORT}`);
  logger.info(`访问地址: http://localhost:${PORT}`);
  logger.info(`环境: ${process.env.NODE_ENV || 'development'}`);
});