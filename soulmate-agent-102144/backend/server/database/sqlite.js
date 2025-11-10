const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 数据库文件路径
const dbDir = path.resolve(__dirname, '../../../data');
const dbPath = path.join(dbDir, 'soulmate_agent.db');

// 确保数据目录存在
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 创建数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('SQLite数据库连接成功');
  }
});

// 初始化数据库表结构
const initDatabase = () => {
  // 用户表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      avatar TEXT,
      bio TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 灵魂画像表
  db.run(`
    CREATE TABLE IF NOT EXISTS soul_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      interests TEXT,
      values TEXT,
      communication_style TEXT,
      emotion_tendency TEXT,
      personality_vector TEXT,
      match_score INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 用户瞬间表
  db.run(`
    CREATE TABLE IF NOT EXISTS moments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      content_type TEXT DEFAULT 'text',
      sentiment TEXT,
      keywords TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 互动记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS interactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      interaction_type TEXT NOT NULL,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 匹配推荐表
  db.run(`
    CREATE TABLE IF NOT EXISTS match_recommendations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      recommended_user_id TEXT NOT NULL,
      match_score INTEGER DEFAULT 0,
      match_reason TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Agent对话记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS agent_conversations (
      id TEXT PRIMARY KEY,
      agent_user_id TEXT NOT NULL,
      target_agent_id TEXT NOT NULL,
      message TEXT NOT NULL,
      sender TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('数据库表初始化完成');
};

// 通用查询方法
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// 通用插入/更新/删除方法
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

// 获取单条记录
const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// 用户操作
const userOperations = {
  create: (user) => {
    const sql = `INSERT INTO users (id, username, password, avatar, bio) VALUES (?, ?, ?, ?, ?)`;
    return run(sql, [user.id, user.username, user.password, user.avatar || '', user.bio || '']);
  },
  
  findById: (id) => {
    const sql = `SELECT * FROM users WHERE id = ?`;
    return get(sql, [id]);
  },
  
  findByUsername: (username) => {
    const sql = `SELECT * FROM users WHERE username = ?`;
    return get(sql, [username]);
  },
  
  update: (id, updates) => {
    const sql = `UPDATE users SET ${Object.keys(updates).map(k => `${k} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    return run(sql, [...Object.values(updates), id]);
  }
};

// 灵魂画像操作
const soulProfileOperations = {
  create: (profile) => {
    const sql = `INSERT INTO soul_profiles (id, user_id, interests, values, communication_style, emotion_tendency, personality_vector) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    return run(sql, [
      profile.id,
      profile.user_id,
      JSON.stringify(profile.interests || []),
      JSON.stringify(profile.values || []),
      profile.communication_style || '',
      profile.emotion_tendency || '',
      JSON.stringify(profile.personality_vector || [])
    ]);
  },
  
  findByUserId: (userId) => {
    const sql = `SELECT * FROM soul_profiles WHERE user_id = ?`;
    return get(sql, [userId]);
  },
  
  update: (userId, updates) => {
    const fields = [];
    const values = [];
    
    Object.keys(updates).forEach(key => {
      if (['interests', 'values', 'personality_vector'].includes(key)) {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(updates[key]));
      } else {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });
    
    const sql = `UPDATE soul_profiles SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`;
    return run(sql, [...values, userId]);
  }
};

// 瞬间操作
const momentOperations = {
  create: (moment) => {
    const sql = `INSERT INTO moments (id, user_id, content, content_type, sentiment, keywords) VALUES (?, ?, ?, ?, ?, ?)`;
    return run(sql, [
      moment.id,
      moment.user_id,
      moment.content,
      moment.content_type || 'text',
      moment.sentiment || '',
      JSON.stringify(moment.keywords || [])
    ]);
  },
  
  findByUserId: (userId, limit = 20) => {
    const sql = `SELECT * FROM moments WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`;
    return query(sql, [userId, limit]);
  }
};

// 互动记录操作
const interactionOperations = {
  create: (interaction) => {
    const sql = `INSERT INTO interactions (id, user_id, target_id, interaction_type, content) VALUES (?, ?, ?, ?, ?)`;
    return run(sql, [
      interaction.id,
      interaction.user_id,
      interaction.target_id,
      interaction.interaction_type,
      interaction.content || ''
    ]);
  },
  
  findByUserId: (userId, limit = 50) => {
    const sql = `SELECT * FROM interactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`;
    return query(sql, [userId, limit]);
  }
};

// 匹配推荐操作
const matchOperations = {
  create: (match) => {
    const sql = `INSERT INTO match_recommendations (id, user_id, recommended_user_id, match_score, match_reason) VALUES (?, ?, ?, ?, ?)`;
    return run(sql, [
      match.id,
      match.user_id,
      match.recommended_user_id,
      match.match_score || 0,
      match.match_reason || ''
    ]);
  },
  
  findByUserId: (userId, status = 'pending') => {
    const sql = `SELECT * FROM match_recommendations WHERE user_id = ? AND status = ? ORDER BY match_score DESC`;
    return query(sql, [userId, status]);
  }
};

// Agent对话操作
const agentConversationOperations = {
  create: (conversation) => {
    const sql = `INSERT INTO agent_conversations (id, agent_user_id, target_agent_id, message, sender) VALUES (?, ?, ?, ?, ?)`;
    return run(sql, [
      conversation.id,
      conversation.agent_user_id,
      conversation.target_agent_id,
      conversation.message,
      conversation.sender
    ]);
  },
  
  findByAgentPair: (userId1, userId2, limit = 50) => {
    const sql = `SELECT * FROM agent_conversations WHERE (agent_user_id = ? AND target_agent_id = ?) OR (agent_user_id = ? AND target_agent_id = ?) ORDER BY created_at ASC LIMIT ?`;
    return query(sql, [userId1, userId2, userId2, userId1, limit]);
  }
};

module.exports = {
  db,
  initDatabase,
  query,
  run,
  get,
  userOperations,
  soulProfileOperations,
  momentOperations,
  interactionOperations,
  matchOperations,
  agentConversationOperations
};