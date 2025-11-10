const { Pool } = require('pg');

// 从环境变量获取数据库配置
const pool = new Pool({
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// 连接错误处理
pool.on('error', (err) => {
  console.error('PostgreSQL连接池错误:', err.message);
});

/**
 * 初始化数据库表结构
 */
const initDatabase = async () => {
  const client = await pool.connect();
  
  try {
    // 用户表
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        avatar TEXT,
        bio TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 灵魂画像表
    await client.query(`
      CREATE TABLE IF NOT EXISTS soul_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        interests JSONB DEFAULT '[]',
        values JSONB DEFAULT '[]',
        communication_style TEXT,
        emotion_tendency TEXT,
        personality_vector JSONB DEFAULT '[]',
        match_score INTEGER DEFAULT 0,
        ai_summary TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id)
      )
    `);

    // 用户瞬间表
    await client.query(`
      CREATE TABLE IF NOT EXISTS moments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        content_type TEXT DEFAULT 'text',
        sentiment TEXT,
        keywords JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 互动记录表
    await client.query(`
      CREATE TABLE IF NOT EXISTS interactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        interaction_type TEXT NOT NULL,
        content TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 匹配推荐表
    await client.query(`
      CREATE TABLE IF NOT EXISTS match_recommendations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        recommended_user_id TEXT NOT NULL,
        match_score INTEGER DEFAULT 0,
        match_reason TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Agent对话记录表
    await client.query(`
      CREATE TABLE IF NOT EXISTS agent_conversations (
        id TEXT PRIMARY KEY,
        agent_user_id TEXT NOT NULL,
        target_agent_id TEXT NOT NULL,
        message TEXT NOT NULL,
        sender TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        FOREIGN KEY (agent_user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 创建索引优化查询性能
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_moments_user_id ON moments(user_id);
      CREATE INDEX IF NOT EXISTS idx_moments_created_at ON moments(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON interactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON interactions(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_soul_profiles_user_id ON soul_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_match_recommendations_user_id ON match_recommendations(user_id);
      CREATE INDEX IF NOT EXISTS idx_match_recommendations_status ON match_recommendations(status);
    `);

    console.log('PostgreSQL数据库表初始化成功');
  } catch (error) {
    console.error('PostgreSQL数据库表初始化失败:', error.message);
  } finally {
    client.release();
  }
};

/**
 * 通用查询方法
 */
const query = async (text, params = []) => {
  try {
    const result = await pool.query(text, params);
    return result.rows;
  } catch (error) {
    console.error('数据库查询失败:', error.message);
    throw error;
  }
};

/**
 * 获取单条记录
 */
const get = async (text, params = []) => {
  try {
    const result = await pool.query(text, params);
    return result.rows[0] || null;
  } catch (error) {
    console.error('数据库查询失败:', error.message);
    throw error;
  }
};

/**
 * 执行插入/更新/删除操作
 */
const run = async (text, params = []) => {
  try {
    const result = await pool.query(text, params);
    return { rowCount: result.rowCount, rows: result.rows };
  } catch (error) {
    console.error('数据库执行失败:', error.message);
    throw error;
  }
};

// 用户操作
const userOperations = {
  create: async (user) => {
    const sql = `INSERT INTO users (id, username, password, avatar, bio) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const result = await run(sql, [user.id, user.username, user.password, user.avatar || '', user.bio || '']);
    return result.rows[0];
  },
  
  findById: async (id) => {
    const sql = `SELECT * FROM users WHERE id = $1`;
    return await get(sql, [id]);
  },
  
  findByUsername: async (username) => {
    const sql = `SELECT * FROM users WHERE username = $1`;
    return await get(sql, [username]);
  },
  
  update: async (id, updates) => {
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    Object.entries(updates).forEach(([key, value]) => {
      fields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    });
    
    values.push(id);
    const sql = `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;
    const result = await run(sql, values);
    return result.rows[0];
  }
};

// 灵魂画像操作
const soulProfileOperations = {
  create: async (profile) => {
    const sql = `INSERT INTO soul_profiles (id, user_id, interests, values, communication_style, emotion_tendency, personality_vector, match_score, ai_summary) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`;
    const result = await run(sql, [
      profile.id,
      profile.user_id,
      JSON.stringify(profile.interests || []),
      JSON.stringify(profile.values || []),
      profile.communication_style || '',
      profile.emotion_tendency || '',
      JSON.stringify(profile.personality_vector || []),
      profile.match_score || 0,
      profile.ai_summary || ''
    ]);
    return result.rows[0];
  },
  
  findByUserId: async (userId) => {
    const sql = `SELECT * FROM soul_profiles WHERE user_id = $1`;
    return await get(sql, [userId]);
  },
  
  update: async (userId, updates) => {
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    Object.entries(updates).forEach(([key, value]) => {
      if (['interests', 'values', 'personality_vector'].includes(key)) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    });
    
    values.push(userId);
    const sql = `UPDATE soul_profiles SET ${fields.join(', ')}, updated_at = NOW() WHERE user_id = $${paramIndex} RETURNING *`;
    const result = await run(sql, values);
    return result.rows[0];
  }
};

// 瞬间操作
const momentOperations = {
  create: async (moment) => {
    const sql = `INSERT INTO moments (id, user_id, content, content_type, sentiment, keywords) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
    const result = await run(sql, [
      moment.id,
      moment.user_id,
      moment.content,
      moment.content_type || 'text',
      moment.sentiment || '',
      JSON.stringify(moment.keywords || [])
    ]);
    return result.rows[0];
  },
  
  findByUserId: async (userId, limit = 20) => {
    const sql = `SELECT * FROM moments WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`;
    return await query(sql, [userId, limit]);
  }
};

// 互动记录操作
const interactionOperations = {
  create: async (interaction) => {
    const sql = `INSERT INTO interactions (id, user_id, target_id, interaction_type, content) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const result = await run(sql, [
      interaction.id,
      interaction.user_id,
      interaction.target_id,
      interaction.interaction_type,
      interaction.content || ''
    ]);
    return result.rows[0];
  },
  
  findByUserId: async (userId, limit = 50) => {
    const sql = `SELECT * FROM interactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`;
    return await query(sql, [userId, limit]);
  }
};

// 匹配推荐操作
const matchOperations = {
  create: async (match) => {
    const sql = `INSERT INTO match_recommendations (id, user_id, recommended_user_id, match_score, match_reason) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const result = await run(sql, [
      match.id,
      match.user_id,
      match.recommended_user_id,
      match.match_score || 0,
      match.match_reason || ''
    ]);
    return result.rows[0];
  },
  
  findByUserId: async (userId, status = 'pending') => {
    const sql = `SELECT * FROM match_recommendations WHERE user_id = $1 AND status = $2 ORDER BY match_score DESC`;
    return await query(sql, [userId, status]);
  }
};

// Agent对话操作
const agentConversationOperations = {
  create: async (conversation) => {
    const sql = `INSERT INTO agent_conversations (id, agent_user_id, target_agent_id, message, sender) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const result = await run(sql, [
      conversation.id,
      conversation.agent_user_id,
      conversation.target_agent_id,
      conversation.message,
      conversation.sender
    ]);
    return result.rows[0];
  },
  
  findByAgentPair: async (userId1, userId2, limit = 50) => {
    const sql = `SELECT * FROM agent_conversations WHERE (agent_user_id = $1 AND target_agent_id = $2) OR (agent_user_id = $2 AND target_agent_id = $1) ORDER BY created_at ASC LIMIT $3`;
    return await query(sql, [userId1, userId2, limit]);
  }
};

module.exports = {
  pool,
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