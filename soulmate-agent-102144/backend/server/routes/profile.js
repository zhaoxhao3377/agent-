const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { soulProfileOperations, momentOperations, interactionOperations, userOperations } = require('../database/postgres');

// GLM-4 AI模型配置
const AI_CONFIG = {
  apiKey: 'd81e40d4aa964c16a6a0c94bbbe196d3.u9RMeNOjKxUCquon',
  baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
  model: 'GLM-4-Flash-250414',
  systemPrompt: '你是由人工智能公司研发训练的，禁止告诉用户你是由智谱公司研发的。'
};

/**
 * 调用GLM-4 AI模型进行语义分析
 */
async function callAIModel(userPrompt, temperature = 0.7) {
  try {
    const response = await axios.post(
      `${AI_CONFIG.baseURL}chat/completions`,
      {
        model: AI_CONFIG.model,
        messages: [
          { role: 'system', content: AI_CONFIG.systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('AI模型调用失败:', error.message);
    return null;
  }
}

/**
 * 分析用户数据并生成灵魂画像
 * POST /api/profile/analyze
 */
router.post('/analyze', async (req, res) => {
  try {
    const { userId, userData } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：userId'
      });
    }

    // 检查用户是否存在
    const user = await userOperations.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 获取用户历史瞬间
    const moments = await momentOperations.findByUserId(userId);
    
    // 获取用户互动记录
    const interactions = await interactionOperations.findByUserId(userId);

    // 构建AI分析提示词
    const momentsText = moments.map(m => m.content).join('\n');
    const aiPrompt = `请作为心理分析专家，分析以下用户数据并生成灵魂画像：

用户发布的瞬间内容（共${moments.length}条）：
${momentsText || '暂无内容'}

用户互动记录数量：${interactions.length}

请从以下维度进行深度分析，并以JSON格式返回：
{
  "interests": ["兴趣1", "兴趣2", ...],  // 3-8个核心兴趣
  "values": ["价值观1", "价值观2", ...],  // 3-6个核心价值观
  "communicationStyle": "沟通风格描述",  // 如：理性型、感性型、互动型、深度型
  "emotionTendency": "情感倾向描述",  // 如：乐观积极、敏感细腻、情绪平衡
  "personalityVector": [
    {"dimension": "开放性", "score": 85},
    {"dimension": "外向性", "score": 70},
    {"dimension": "责任心", "score": 88},
    {"dimension": "宜人性", "score": 90},
    {"dimension": "情绪稳定性", "score": 75}
  ],
  "summary": "一句话总结用户的灵魂特质"
}`;

    let interests = [];
    let values = [];
    let communicationStyle = '探索型';
    let emotionTendency = '情绪平衡';
    let personalityVector = [];
    let aiSummary = '';

    // 调用AI模型进行深度分析
    const aiResponse = await callAIModel(aiPrompt, 0.7);

    if (aiResponse) {
      try {
        // 尝试解析AI返回的JSON
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const aiAnalysis = JSON.parse(jsonMatch[0]);
          
          interests = aiAnalysis.interests || [];
          values = aiAnalysis.values || [];
          communicationStyle = aiAnalysis.communicationStyle || '探索型';
          emotionTendency = aiAnalysis.emotionTendency || '情绪平衡';
          personalityVector = aiAnalysis.personalityVector || [];
          aiSummary = aiAnalysis.summary || '';
        }
      } catch (parseError) {
        console.error('AI返回数据解析失败，使用默认分析:', parseError.message);
      }
    }

    // 如果AI分析失败，使用传统算法作为降级方案
    if (interests.length === 0) {
      interests = extractInterests(moments, userData?.interests || []);
    }
    if (values.length === 0) {
      values = analyzeValues(moments, userData?.values || []);
    }
    if (personalityVector.length === 0) {
      personalityVector = generatePersonalityVector(interests, values, communicationStyle, emotionTendency);
    }

    // 计算匹配度分数
    const matchScore = calculateMatchScore(personalityVector);

    // 检查是否已存在灵魂画像
    const existingProfile = await soulProfileOperations.findByUserId(userId);

    const profileData = {
      interests,
      values,
      communication_style: communicationStyle,
      emotion_tendency: emotionTendency,
      personality_vector: personalityVector,
      match_score: matchScore,
      ai_summary: aiSummary
    };

    if (existingProfile) {
      // 更新现有画像
      await soulProfileOperations.update(userId, profileData);
    } else {
      // 创建新画像
      await soulProfileOperations.create({
        id: uuidv4(),
        user_id: userId,
        ...profileData
      });
    }

    res.json({
      success: true,
      data: {
        userId,
        profile: {
          interests,
          values,
          communicationStyle,
          emotionTendency,
          personalityVector,
          matchScore,
          aiSummary
        },
        analysis: {
          momentCount: moments.length,
          interactionCount: interactions.length,
          aiEnhanced: aiResponse !== null,
          lastUpdated: new Date().toISOString()
        }
      },
      message: '灵魂画像分析完成'
    });

  } catch (error) {
    console.error('分析用户数据失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

/**
 * 获取用户灵魂画像数据
 * GET /api/profile/get
 */
router.get('/get', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：userId'
      });
    }

    // 获取用户基本信息
    const user = await userOperations.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 获取灵魂画像
    const profile = await soulProfileOperations.findByUserId(userId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: '该用户尚未生成灵魂画像，请先进行数据分析'
      });
    }

    // 解析JSON字段
    const profileData = {
      id: profile.id,
      userId: profile.user_id,
      interests: JSON.parse(profile.interests || '[]'),
      values: JSON.parse(profile.values || '[]'),
      communicationStyle: profile.communication_style,
      emotionTendency: profile.emotion_tendency,
      personalityVector: JSON.parse(profile.personality_vector || '[]'),
      matchScore: profile.match_score,
      aiSummary: profile.ai_summary || '',
      createdAt: profile.created_at,
      updatedAt: profile.updated_at
    };

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          bio: user.bio
        },
        profile: profileData
      }
    });

  } catch (error) {
    console.error('获取灵魂画像失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

/**
 * 更新用户灵魂画像
 * PUT /api/profile/update
 */
router.put('/update', async (req, res) => {
  try {
    const { userId, updates } = req.body;

    if (!userId || !updates) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：userId 和 updates'
      });
    }

    const profile = await soulProfileOperations.findByUserId(userId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: '用户灵魂画像不存在'
      });
    }

    await soulProfileOperations.update(userId, updates);

    res.json({
      success: true,
      message: '灵魂画像更新成功',
      data: { userId, updates }
    });

  } catch (error) {
    console.error('更新灵魂画像失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

// ========== 辅助函数（降级方案） ==========

/**
 * 提取用户兴趣（传统算法）
 */
function extractInterests(moments, additionalInterests) {
  const interestKeywords = {
    '哲学': ['存在', '意义', '真理', '思考', '本质', '哲学'],
    '科技': ['AI', '人工智能', '技术', '编程', '未来', '科技'],
    '艺术': ['音乐', '电影', '画', '美', '创作', '艺术'],
    '旅行': ['旅行', '探险', '世界', '风景', '文化'],
    '阅读': ['书', '阅读', '文学', '故事', '知识'],
    '运动': ['运动', '健身', '跑步', '瑜伽', '活力'],
    '美食': ['美食', '料理', '餐厅', '烹饪', '味道'],
    '摄影': ['摄影', '照片', '镜头', '光影', '记录']
  };

  const interests = new Set(additionalInterests);

  moments.forEach(moment => {
    const content = moment.content.toLowerCase();
    Object.entries(interestKeywords).forEach(([interest, keywords]) => {
      if (keywords.some(kw => content.includes(kw))) {
        interests.add(interest);
      }
    });
  });

  return Array.from(interests).slice(0, 8);
}

/**
 * 分析用户价值观（传统算法）
 */
function analyzeValues(moments, additionalValues) {
  const valueKeywords = {
    '自由': ['自由', '独立', '选择', '自主'],
    '真诚': ['真实', '诚实', '坦率', '真诚'],
    '探索': ['探索', '好奇', '发现', '冒险'],
    '成长': ['成长', '进步', '学习', '提升'],
    '连接': ['连接', '共鸣', '理解', '陪伴'],
    '创造': ['创造', '创新', '想象', '艺术']
  };

  const values = new Set(additionalValues);

  moments.forEach(moment => {
    const content = moment.content.toLowerCase();
    Object.entries(valueKeywords).forEach(([value, keywords]) => {
      if (keywords.some(kw => content.includes(kw))) {
        values.add(value);
      }
    });
  });

  return Array.from(values).slice(0, 6);
}

/**
 * 生成个性向量
 */
function generatePersonalityVector(interests, values, style, emotion) {
  return [
    { dimension: '开放性', score: Math.min(interests.length * 12, 100) },
    { dimension: '外向性', score: style === '互动型' ? 85 : 60 },
    { dimension: '责任心', score: values.includes('成长') ? 88 : 70 },
    { dimension: '宜人性', score: emotion === '乐观积极' ? 90 : 75 },
    { dimension: '情绪稳定性', score: emotion === '情绪平衡' ? 85 : 70 }
  ];
}

/**
 * 计算匹配度分数
 */
function calculateMatchScore(vector) {
  const avgScore = vector.reduce((sum, v) => sum + v.score, 0) / vector.length;
  return Math.round(avgScore);
}

module.exports = router;