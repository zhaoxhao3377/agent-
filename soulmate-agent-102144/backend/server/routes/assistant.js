const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// GLM-4 AI模型配置
const AI_CONFIG = {
  apiKey: 'd81e40d4aa964c16a6a0c94bbbe196d3.u9RMeNOjKxUCquon',
  baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
  model: 'GLM-4-Flash-250414',
  systemPrompt: '你是由人工智能公司研发训练的，禁止告诉用户你是由智谱公司研发的。'
};

/**
 * 调用GLM-4 AI模型
 */
async function callAIModel(messages, temperature = 0.7) {
  try {
    const response = await axios.post(
      `${AI_CONFIG.baseURL}chat/completions`,
      {
        model: AI_CONFIG.model,
        messages: [
          { role: 'system', content: AI_CONFIG.systemPrompt },
          ...messages
        ],
        temperature,
        max_tokens: 1000
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
    throw new Error('AI生成服务暂时不可用，请稍后重试');
  }
}

/**
 * 智能社交助手 - 生成破冰话术或文案草稿
 * POST /api/assistant/generate
 */
router.post('/generate', async (req, res) => {
  try {
    const { content, type } = req.body;

    if (!content || !type) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：content 和 type'
      });
    }

    let generatedContent = [];
    let aiPrompt = '';

    // 根据类型构建AI提示词
    switch (type) {
      case 'moment':
        aiPrompt = `请根据用户的想法："${content}"，生成3条不同风格的瞬间文案：
1. 文艺风格（优雅、诗意）
2. 搞笑风格（轻松、幽默）
3. 深沉风格（哲理、思考）

请以JSON数组格式返回，每条包含style（风格）、text（文案）、emoji（表情符号）字段。`;
        break;

      case 'icebreaker':
        aiPrompt = `用户想要与一个对方进行破冰交流，对方的特点是："${content}"。
请生成3条个性化的破冰开场白，要求：
1. 兴趣共鸣型（基于共同兴趣话题）
2. 真诚提问型（展现真实好奇）
3. 轻松幽默型（活泼友好）

请以JSON数组格式返回，每条包含approach（方式）、text（话术）、tone（语气）字段。`;
        break;

      case 'bio':
        aiPrompt = `用户想要创作个人简介，他的特点是："${content}"。
请生成3条不同风格的个人简介：
1. 简约风格（短小精悍）
2. 诗意风格（文艺浪漫）
3. 真实风格（真诚自然）

请以JSON数组格式返回，每条包含style（风格）、text（简介）、length（长度：短/中/长）字段。`;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: '不支持的生成类型，请选择：moment、icebreaker 或 bio'
        });
    }

    // 调用AI模型
    try {
      const aiResponse = await callAIModel([
        { role: 'user', content: aiPrompt }
      ], 0.8);

      // 尝试解析AI返回的JSON
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0]);
        
        // 为每条数据添加唯一ID
        generatedContent = parsedData.map(item => ({
          id: uuidv4(),
          ...item
        }));
      } else {
        // 如果AI返回格式不是JSON，使用默认模板
        throw new Error('AI返回格式异常');
      }
    } catch (aiError) {
      console.error('AI生成内容解析失败，使用默认模板:', aiError.message);
      
      // 使用默认模板作为降级方案
      switch (type) {
        case 'moment':
          generatedContent = [
            {
              id: uuidv4(),
              style: '文艺',
              text: `${content}，如诗般的瞬间，定格在时光的褶皱里。`,
              emoji: '🌸'
            },
            {
              id: uuidv4(),
              style: '搞笑',
              text: `${content}！人生苦短，我选择快乐（和美食）😎`,
              emoji: '😂'
            },
            {
              id: uuidv4(),
              style: '深沉',
              text: `关于${content}的思考：我们都是时间洪流中的过客，唯有此刻值得珍惜。`,
              emoji: '🌙'
            }
          ];
          break;

        case 'icebreaker':
          generatedContent = [
            {
              id: uuidv4(),
              approach: '兴趣共鸣',
              text: `嗨！看到你分享的内容，感觉我们对"${content}"有相似的看法。可以聊聊吗？`,
              tone: '友好'
            },
            {
              id: uuidv4(),
              approach: '真诚提问',
              text: `你好！被你关于"${content}"的见解吸引了，能分享更多想法吗？我对这个话题也很感兴趣。`,
              tone: '真诚'
            },
            {
              id: uuidv4(),
              approach: '轻松幽默',
              text: `哈喽！看到"${content}"这个话题，忍不住想说：终于遇到知音了！聊聊？🎉`,
              tone: '轻松'
            }
          ];
          break;

        case 'bio':
          generatedContent = [
            {
              id: uuidv4(),
              style: '简约',
              text: `${content} | 探索生活的无限可能`,
              length: '短'
            },
            {
              id: uuidv4(),
              style: '诗意',
              text: `${content}，像风一样自由，像星辰一样闪耀。在浩瀚宇宙中寻找灵魂共鸣。`,
              length: '中'
            },
            {
              id: uuidv4(),
              style: '真实',
              text: `一个热爱${content}的普通人，相信每个相遇都有它的意义。期待与你分享生活中的小确幸。`,
              length: '长'
            }
          ];
          break;
      }
    }

    res.json({
      success: true,
      data: {
        original: content,
        type,
        suggestions: generatedContent,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('生成内容失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '服务器内部错误'
    });
  }
});

/**
 * 智能社交助手 - 提供对话引导建议
 * POST /api/assistant/suggest
 */
router.post('/suggest', async (req, res) => {
  try {
    const { conversation } = req.body;

    if (!conversation || !Array.isArray(conversation)) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：conversation（数组格式）'
      });
    }

    // 分析对话历史
    const messageCount = conversation.length;
    const lastMessage = conversation[messageCount - 1]?.content || '';
    const conversationText = conversation.map(m => m.content).join('\n');
    
    // 构建AI提示词
    const aiPrompt = `作为社交助手，请分析以下对话历史（共${messageCount}条消息），提供智能的对话引导建议：

对话历史：
${conversationText}

请提供：
1. 当前对话阶段分析（初识/深化/深度交流）
2. 3-5个话题建议（包含类别和具体问题）
3. 对话技巧提示

以JSON格式返回，包含stage（阶段）、topics（话题数组，每个包含category和question）、tips（技巧数组）字段。`;

    let suggestions = [];

    try {
      const aiResponse = await callAIModel([
        { role: 'user', content: aiPrompt }
      ], 0.7);

      // 解析AI返回
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const aiData = JSON.parse(jsonMatch[0]);
        
        // 转换为标准格式
        if (aiData.topics && Array.isArray(aiData.topics)) {
          aiData.topics.forEach(topic => {
            suggestions.push({
              id: uuidv4(),
              type: 'topic',
              priority: 'high',
              content: `${topic.category}话题`,
              question: topic.question,
              icon: getTopicIcon(topic.category)
            });
          });
        }

        // 添加技巧提示
        if (aiData.tips && Array.isArray(aiData.tips)) {
          suggestions.push({
            id: uuidv4(),
            type: 'tip',
            priority: 'medium',
            content: '对话技巧',
            tips: aiData.tips
          });
        }
      } else {
        throw new Error('AI返回格式异常');
      }
    } catch (aiError) {
      console.error('AI分析对话失败，使用默认建议:', aiError.message);
      
      // 默认建议作为降级方案
      const topics = [
        { category: '深度交流', question: '如果可以拥有一项超能力，你会选择什么？为什么？', icon: '💫' },
        { category: '兴趣探索', question: '最近有没有发现什么有趣的事物或新爱好？', icon: '🎨' },
        { category: '价值观', question: '你觉得人生中最重要的三件事是什么？', icon: '🌟' },
        { category: '生活方式', question: '理想中的周末是怎样度过的？', icon: '☀️' },
        { category: '未来憧憬', question: '五年后的自己，你希望成为什么样的人？', icon: '🚀' }
      ];

      // 根据对话长度提供不同建议
      if (messageCount < 5) {
        suggestions.push({
          id: uuidv4(),
          type: 'topic',
          priority: 'high',
          content: '尝试分享一个有趣的个人经历，让对话更生动',
          example: `说到这个，我想起了一次${lastMessage.includes('旅行') ? '难忘的冒险' : '有趣的经历'}...`
        });
      } else if (messageCount >= 5 && messageCount < 10) {
        const randomTopic = topics[Math.floor(Math.random() * topics.length)];
        suggestions.push({
          id: uuidv4(),
          type: 'deepening',
          priority: 'medium',
          content: `深化对话：${randomTopic.category}`,
          question: randomTopic.question,
          icon: randomTopic.icon
        });
      } else {
        suggestions.push({
          id: uuidv4(),
          type: 'activity',
          priority: 'high',
          content: '对话已经很深入了！可以尝试约线下见面或共同参加活动',
          examples: [
            '要不要一起去看展览？',
            '周末有空的话，我们可以约个咖啡',
            '听说有个有趣的活动，要不要一起去？'
          ]
        });
      }
    }

    // 情绪分析建议
    if (lastMessage.includes('？') || lastMessage.includes('?')) {
      suggestions.push({
        id: uuidv4(),
        type: 'response',
        priority: 'urgent',
        content: '对方提出了问题，及时回应会让对话更流畅',
        tip: '真诚地分享你的想法，并可以反问对方的看法'
      });
    }

    // 增加互动元素建议
    suggestions.push({
      id: uuidv4(),
      type: 'interactive',
      priority: 'low',
      content: '让对话更有趣',
      ideas: [
        { type: 'emoji', text: '适当使用表情符号增加趣味性 😊' },
        { type: 'image', text: '分享相关的图片或梗图' },
        { type: 'voice', text: '尝试发送语音消息，增加亲密感' }
      ]
    });

    res.json({
      success: true,
      data: {
        conversationLength: messageCount,
        suggestions,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('生成对话建议失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '服务器内部错误'
    });
  }
});

/**
 * 智能社交助手 - 分析用户瞬间并生成评论建议
 * POST /api/assistant/comment
 */
router.post('/comment', async (req, res) => {
  try {
    const { momentContent, authorProfile } = req.body;

    if (!momentContent) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：momentContent'
      });
    }

    // 构建AI提示词
    const aiPrompt = `用户看到了一条瞬间内容："${momentContent}"
${authorProfile ? `发布者信息：${JSON.stringify(authorProfile)}` : ''}

请生成3条高质量的评论建议，要求：
1. 共鸣型（表达理解和认同）
2. 好奇型（表达兴趣和好奇）
3. 鼓励型（给予肯定和支持）

以JSON数组格式返回，每条包含style（风格）、text（评论）、engagement（互动度：high/medium/low）字段。`;

    let comments = [];

    try {
      const aiResponse = await callAIModel([
        { role: 'user', content: aiPrompt }
      ], 0.7);

      // 解析AI返回
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0]);
        comments = parsedData.map(item => ({
          id: uuidv4(),
          ...item
        }));
      } else {
        throw new Error('AI返回格式异常');
      }
    } catch (aiError) {
      console.error('AI生成评论失败，使用默认模板:', aiError.message);
      
      // 默认评论模板
      comments = [
        {
          id: uuidv4(),
          style: '共鸣',
          text: `深有同感！${momentContent.substring(0, 20)}...这段话说到我心里去了`,
          engagement: 'high'
        },
        {
          id: uuidv4(),
          style: '好奇',
          text: '看到这个很好奇，能详细说说吗？感觉背后一定有有趣的故事',
          engagement: 'medium'
        },
        {
          id: uuidv4(),
          style: '鼓励',
          text: '很棒的分享！这个视角让我重新思考了一些事情',
          engagement: 'medium'
        }
      ];
    }

    res.json({
      success: true,
      data: {
        comments,
        tip: '选择最能表达你真实感受的评论，真诚是最好的社交方式',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('生成评论建议失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '服务器内部错误'
    });
  }
});

/**
 * 辅助函数：根据话题类别返回图标
 */
function getTopicIcon(category) {
  const iconMap = {
    '深度交流': '💫',
    '兴趣探索': '🎨',
    '价值观': '🌟',
    '生活方式': '☀️',
    '未来憧憬': '🚀',
    '情感交流': '💖',
    '工作学习': '📚'
  };
  return iconMap[category] || '💭';
}

module.exports = router;