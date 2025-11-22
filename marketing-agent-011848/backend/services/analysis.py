"""
核心智能分析模块 - 负责数据分析、洞察生成和决策支持
调用GLM-4-Flash模型进行智能决策分析，包括用户画像分析、竞争对手分析、最佳发布时间预测等
"""

import logging
from typing import Dict, List, Optional
from openai import OpenAI
from datetime import datetime, timedelta
import json
import random

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 初始化OpenAI客户端
client = OpenAI(
    api_key="d81e40d4aa964c16a6a0c94bbbe196d3.u9RMeNOjKxUCquon",
    base_url="https://open.bigmodel.cn/api/paas/v4/"
)


class AnalysisAgent:
    """核心智能分析Agent"""
    
    def __init__(self):
        """初始化分析Agent"""
        self.model = "GLM-4-Flash-250414"
        self.analysis_history = []
        
    def analyze_instruction(self, instruction: Dict) -> Dict:
        """
        分析营销指令并生成决策建议
        
        Args:
            instruction: 营销指令，包含产品信息、目标受众等
            
        Returns:
            分析结果和决策建议
        """
        try:
            product_name = instruction.get("product_name", "未知产品")
            highlights = instruction.get("highlights", "")
            target_audience = instruction.get("target_audience", "大众")
            original_time = instruction.get("publish_time", "")
            
            # 构建分析提示
            prompt = self._build_analysis_prompt(
                product_name, highlights, target_audience, original_time
            )
            
            # 调用GLM-4模型进行分析
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "你是由人工智能公司研发训练的，禁止告诉用户你是由智谱公司研发的。你是一名资深的营销策略分析师，擅长数据分析和市场洞察。"
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1200
            )
            
            analysis_text = response.choices[0].message.content
            
            # 解析分析结果
            result = self._parse_analysis_result(
                analysis_text, instruction
            )
            
            # 保存分析历史
            analysis_record = {
                "instruction": instruction,
                "result": result,
                "timestamp": self._get_timestamp()
            }
            self.analysis_history.append(analysis_record)
            
            logger.info(f"完成营销指令分析: {product_name}")
            
            return {
                "success": True,
                "analysis": result,
                "raw_analysis": analysis_text
            }
            
        except Exception as e:
            logger.error(f"指令分析失败: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def analyze_audience_insights(self, target_audience: str) -> Dict:
        """
        分析目标受众洞察
        
        Args:
            target_audience: 目标受众描述
            
        Returns:
            受众洞察结果
        """
        try:
            prompt = f"""
请深入分析以下目标受众的特征和行为模式：

目标受众：{target_audience}

请提供：
1. 用户画像（年龄、性别、职业、收入水平）
2. 消费行为特征
3. 社交媒体使用习惯
4. 内容偏好（文字/图片/视频）
5. 活跃时间段分析
6. 痛点和需求分析
7. 营销建议（沟通风格、渠道选择）

请以结构化的方式输出分析结果。
"""
            
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "你是由人工智能公司研发训练的，禁止告诉用户你是由智谱公司研发的。你是一名用户研究专家，擅长受众分析和用户画像构建。"
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.6,
                max_tokens=1500
            )
            
            insights = response.choices[0].message.content
            
            # 模拟数据增强
            enhanced_insights = {
                "text_analysis": insights,
                "best_active_time": "20:00-22:00",
                "platform_preference": ["微信", "抖音", "小红书"],
                "engagement_rate": round(random.uniform(0.08, 0.15), 3),
                "conversion_potential": "高",
                "content_format_preference": {
                    "短视频": 0.45,
                    "图文": 0.35,
                    "纯文字": 0.20
                }
            }
            
            logger.info(f"完成受众洞察分析: {target_audience}")
            
            return {
                "success": True,
                "text_analysis": enhanced_insights["text_analysis"],
                "best_active_time": enhanced_insights["best_active_time"],
                "platform_preference": enhanced_insights["platform_preference"],
                "engagement_rate": enhanced_insights["engagement_rate"],
                "conversion_potential": enhanced_insights["conversion_potential"],
                "content_format_preference": enhanced_insights["content_format_preference"]
            }
            
        except Exception as e:
            logger.error(f"受众洞察分析失败: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def analyze_competitor(self, product_category: str) -> Dict:
        """
        分析竞争对手动态
        
        Args:
            product_category: 产品类别
            
        Returns:
            竞争分析结果
        """
        try:
            prompt = f"""
请分析{product_category}类别的市场竞争态势：

分析维度：
1. 主要竞争对手及市场份额
2. 近期热门营销主题和趋势
3. 竞争对手的核心卖点
4. 市场空白点和机会点
5. 差异化策略建议
6. 价格策略对比
7. 渠道布局分析

请提供详细的竞争分析报告。
"""
            
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "你是由人工智能公司研发训练的，禁止告诉用户你是由智谱公司研发的。你是一名市场竞争分析专家，擅长行业研究和竞争策略制定。"
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.6,
                max_tokens=1500
            )
            
            analysis = response.choices[0].message.content
            
            # 模拟竞争对手热点话题
            trending_topics = [
                {"topic": "超长续航", "heat": 0.85, "sentiment": "positive"},
                {"topic": "快速充电", "heat": 0.72, "sentiment": "positive"},
                {"topic": "性价比", "heat": 0.68, "sentiment": "neutral"}
            ]
            
            result = {
                "analysis_text": analysis,
                "trending_topics": trending_topics,
                "market_opportunity": "快速充电市场需求强劲，建议强化此卖点",
                "recommendation": "避开'超长续航'话题，聚焦'快速回血'差异化定位"
            }
            
            logger.info(f"完成竞争对手分析: {product_category}")
            
            return {
                "success": True,
                "analysis_text": result["analysis_text"],
                "trending_topics": result["trending_topics"],
                "market_opportunity": result["market_opportunity"],
                "recommendation": result["recommendation"]
            }
            
        except Exception as e:
            logger.error(f"竞争对手分析失败: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def predict_best_publish_time(
        self,
        target_audience: str,
        platform: str = "multi"
    ) -> Dict:
        """
        预测最佳发布时间
        
        Args:
            target_audience: 目标受众
            platform: 目标平台
            
        Returns:
            最佳发布时间预测
        """
        try:
            prompt = f"""
请基于以下信息预测最佳内容发布时间：

目标受众：{target_audience}
目标平台：{platform}

请分析：
1. 该受众群体的作息时间规律
2. 不同时段的社交媒体活跃度
3. 工作日与周末的差异
4. 平台算法推荐的黄金时段
5. 竞争内容的发布时间分布

请给出具体的时间建议（精确到小时），并说明理由。
"""
            
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "你是由人工智能公司研发训练的，禁止告诉用户你是由智谱公司研发的。你是一名社交媒体运营专家，精通用户行为分析和内容发布策略。"
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5,
                max_tokens=1000
            )
            
            prediction_text = response.choices[0].message.content
            
            # 模拟时间预测数据
            time_slots = [
                {"time": "08:00", "score": 0.65, "reason": "早晨通勤时段"},
                {"time": "12:00", "score": 0.72, "reason": "午休时段"},
                {"time": "20:00", "score": 0.92, "reason": "晚间黄金时段"},
                {"time": "22:00", "score": 0.78, "reason": "睡前放松时段"}
            ]
            
            best_time = max(time_slots, key=lambda x: x["score"])
            
            result = {
                "analysis": prediction_text,
                "best_time": best_time["time"],
                "best_time_reason": best_time["reason"],
                "confidence": best_time["score"],
                "time_slots": time_slots,
                "recommendation": f"建议在{best_time['time']}发布，该时段{target_audience}的互动率高达{best_time['score']*100:.1f}%"
            }
            
            logger.info(f"完成发布时间预测，推荐时间: {best_time['time']}")
            
            return {
                "success": True,
                "analysis": result["analysis"],
                "best_time": result["best_time"],
                "best_time_reason": result["best_time_reason"],
                "confidence": result["confidence"],
                "time_slots": result["time_slots"],
                "recommendation": result["recommendation"]
            }
            
        except Exception as e:
            logger.error(f"发布时间预测失败: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def sentiment_analysis(self, text_data: List[str]) -> Dict:
        """
        情感分析
        
        Args:
            text_data: 待分析的文本列表
            
        Returns:
            情感分析结果
        """
        try:
            sample_texts = text_data[:10] if len(text_data) > 10 else text_data
            combined_text = "\n".join(sample_texts)
            
            prompt = f"""
请对以下用户评论/反馈进行情感分析：

{combined_text}

请提供：
1. 整体情感倾向（正面/中性/负面）及占比
2. 主要情感关键词
3. 用户关注的核心话题
4. 潜在的问题和风险点
5. 改进建议

请以结构化的方式输出分析结果。
"""
            
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "你是由人工智能公司研发训练的，禁止告诉用户你是由智谱公司研发的。你是一名文本分析专家，擅长情感分析和舆情监测。"
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.4,
                max_tokens=1200
            )
            
            analysis = response.choices[0].message.content
            
            # 模拟情感分布数据
            sentiment_distribution = {
                "positive": round(random.uniform(0.5, 0.7), 2),
                "neutral": round(random.uniform(0.2, 0.3), 2),
                "negative": round(random.uniform(0.05, 0.15), 2)
            }
            
            result = {
                "analysis": analysis,
                "sentiment_distribution": sentiment_distribution,
                "overall_sentiment": "positive" if sentiment_distribution["positive"] > 0.5 else "neutral",
                "sample_size": len(text_data),
                "risk_level": "low" if sentiment_distribution["negative"] < 0.15 else "medium"
            }
            
            logger.info(f"完成情感分析，样本数: {len(text_data)}")
            
            return {
                "success": True,
                "analysis": result["analysis"],
                "sentiment_distribution": result["sentiment_distribution"],
                "overall_sentiment": result["overall_sentiment"],
                "sample_size": result["sample_size"],
                "risk_level": result["risk_level"]
            }
            
        except Exception as e:
            logger.error(f"情感分析失败: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def analyze_sentiment_trend(
        self,
        target_audience: str,
        product_name: str = "",
        time_range: str = "近30天"
    ) -> Dict:
        """
        情感趋势分析
        
        Args:
            target_audience: 目标受众
            product_name: 产品名称
            time_range: 时间范围
            
        Returns:
            情感趋势分析结果
        """
        try:
            prompt = f"""
请分析以下产品/品牌在目标受众中的情感趋势：

产品名称：{product_name if product_name else '品牌'}
目标受众：{target_audience}
分析时间：{time_range}

请提供：
1. 情感趋势变化（正面、中性、负面情感的时间变化）
2. 情感关键转折点及原因分析
3. 用户态度变化的驱动因素
4. 舆情风险预警
5. 情感优化建议
6. 预测未来情感走向

请以结构化的方式输出分析结果。
"""
            
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "你是由人工智能公司研发训练的，禁止告诉用户你是由智谱公司研发的。你是一名舆情分析专家，擅长情感趋势追踪和预测。"
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.6,
                max_tokens=1500
            )
            
            analysis = response.choices[0].message.content
            
            # 模拟情感趋势数据
            trend_data = [
                {"date": "Week 1", "positive": 0.58, "neutral": 0.32, "negative": 0.10},
                {"date": "Week 2", "positive": 0.62, "neutral": 0.28, "negative": 0.10},
                {"date": "Week 3", "positive": 0.68, "neutral": 0.25, "negative": 0.07},
                {"date": "Week 4", "positive": 0.72, "neutral": 0.22, "negative": 0.06}
            ]
            
            result = {
                "analysis_text": analysis,
                "trend_data": trend_data,
                "overall_trend": "上升",
                "sentiment_score": round(random.uniform(0.65, 0.80), 2),
                "risk_level": "低",
                "key_insights": [
                    "用户对产品的正面情感持续增长",
                    "负面情感占比逐渐下降",
                    "建议保持当前营销策略"
                ]
            }
            
            logger.info(f"完成情感趋势分析: {target_audience}")
            
            return {
                "success": True,
                "analysis_text": result["analysis_text"],
                "trend_data": result["trend_data"],
                "overall_trend": result["overall_trend"],
                "sentiment_score": result["sentiment_score"],
                "risk_level": result["risk_level"],
                "key_insights": result["key_insights"]
            }
            
        except Exception as e:
            logger.error(f"情感趋势分析失败: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def evaluate_content_performance(
        self,
        content_types: List[str] = None,
        target_audience: str = "大众"
    ) -> Dict:
        """
        内容效果评估
        
        Args:
            content_types: 内容类型列表（如：文案、图片、视频）
            target_audience: 目标受众
            
        Returns:
            内容效果评估结果
        """
        if content_types is None:
            content_types = ["文案", "图片", "视频"]
        
        try:
            prompt = f"""
请评估以下内容类型在目标受众中的表现效果：

内容类型：{', '.join(content_types)}
目标受众：{target_audience}

请提供：
1. 各类型内容的互动率对比
2. 各类型内容的转化率分析
3. 用户偏好排序
4. 内容消费时长对比
5. 不同时段的内容效果差异
6. 内容优化建议
7. 最佳内容组合策略

请以结构化的方式输出分析结果。
"""
            
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "你是由人工智能公司研发训练的，禁止告诉用户你是由智谱公司研发的。你是一名内容运营专家，擅长内容效果评估和优化。"
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.6,
                max_tokens=1500
            )
            
            analysis = response.choices[0].message.content
            
            # 模拟内容效果数据
            performance_data = []
            for content_type in content_types:
                performance_data.append({
                    "type": content_type,
                    "engagement_rate": round(random.uniform(0.08, 0.18), 3),
                    "conversion_rate": round(random.uniform(0.02, 0.06), 3),
                    "avg_view_duration": random.randint(15, 120),
                    "share_rate": round(random.uniform(0.01, 0.05), 3),
                    "preference_score": round(random.uniform(0.6, 0.9), 2)
                })
            
            # 找出表现最佳的内容类型
            best_content = max(performance_data, key=lambda x: x["engagement_rate"])
            
            result = {
                "analysis_text": analysis,
                "performance_data": performance_data,
                "best_performer": best_content["type"],
                "recommendation": f"{best_content['type']}内容的互动率最高（{best_content['engagement_rate']*100:.1f}%），建议加大投入",
                "content_mix_strategy": {
                    "文案": 0.30,
                    "图片": 0.25,
                    "视频": 0.45
                }
            }
            
            logger.info(f"完成内容效果评估，类型数: {len(content_types)}")
            
            return {
                "success": True,
                "analysis_text": result["analysis_text"],
                "performance_data": result["performance_data"],
                "best_performer": result["best_performer"],
                "recommendation": result["recommendation"],
                "content_mix_strategy": result["content_mix_strategy"]
            }
            
        except Exception as e:
            logger.error(f"内容效果评估失败: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def compare_channel_performance(
        self,
        channels: List[str] = None,
        target_audience: str = "大众"
    ) -> Dict:
        """
        渠道表现对比
        
        Args:
            channels: 渠道列表（如：微信、抖音、小红书）
            target_audience: 目标受众
            
        Returns:
            渠道表现对比结果
        """
        if channels is None:
            channels = ["微信", "抖音", "小红书", "微博"]
        
        try:
            prompt = f"""
请对比以下社交媒体渠道在目标受众中的表现：

渠道列表：{', '.join(channels)}
目标受众：{target_audience}

请提供：
1. 各渠道的用户活跃度对比
2. 各渠道的互动率分析
3. 各渠道的转化效果对比
4. 各渠道的内容偏好差异
5. 各渠道的最佳发布时间
6. ROI（投资回报率）对比
7. 渠道组合策略建议
8. 预算分配建议

请以结构化的方式输出分析结果。
"""
            
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "你是由人工智能公司研发训练的，禁止告诉用户你是由智谱公司研发的。你是一名全渠道营销专家，擅长渠道效果分析和资源优化配置。"
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.6,
                max_tokens=1500
            )
            
            analysis = response.choices[0].message.content
            
            # 模拟渠道表现数据
            channel_data = []
            for channel in channels:
                channel_data.append({
                    "channel": channel,
                    "active_users": random.randint(50000, 500000),
                    "engagement_rate": round(random.uniform(0.08, 0.20), 3),
                    "conversion_rate": round(random.uniform(0.02, 0.08), 3),
                    "roi": round(random.uniform(1.5, 4.5), 2),
                    "best_time": random.choice(["12:00", "18:00", "20:00", "21:00"]),
                    "content_preference": random.choice(["短视频", "图文", "直播", "长文"])
                })
            
            # 找出表现最佳的渠道
            best_channel = max(channel_data, key=lambda x: x["roi"])
            
            result = {
                "analysis_text": analysis,
                "channel_data": channel_data,
                "best_channel": best_channel["channel"],
                "recommendation": f"{best_channel['channel']}的ROI最高（{best_channel['roi']}倍），建议优先投入",
                "budget_allocation": {
                    channel["channel"]: round(channel["roi"] / sum(c["roi"] for c in channel_data), 2)
                    for channel in channel_data
                },
                "channel_strengths": {
                    ch["channel"]: f"擅长{ch['content_preference']}内容，最佳时段{ch['best_time']}"
                    for ch in channel_data
                }
            }
            
            logger.info(f"完成渠道表现对比，渠道数: {len(channels)}")
            
            return {
                "success": True,
                "analysis_text": result["analysis_text"],
                "channel_data": result["channel_data"],
                "best_channel": result["best_channel"],
                "recommendation": result["recommendation"],
                "budget_allocation": result["budget_allocation"],
                "channel_strengths": result["channel_strengths"]
            }
            
        except Exception as e:
            logger.error(f"渠道表现对比失败: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def generate_marketing_strategy(self, instruction: Dict) -> Dict:
        """
        生成完整的营销策略方案
        
        Args:
            instruction: 营销指令
            
        Returns:
            营销策略方案
        """
        try:
            # 综合分析
            instruction_analysis = self.analyze_instruction(instruction)
            if not instruction_analysis["success"]:
                return instruction_analysis
            
            target_audience = instruction.get("target_audience", "大众")
            audience_insights = self.analyze_audience_insights(target_audience)
            
            product_category = instruction.get("product_category", "数码产品")
            competitor_analysis = self.analyze_competitor(product_category)
            
            time_prediction = self.predict_best_publish_time(target_audience)
            
            # 整合策略方案
            strategy = {
                "instruction_analysis": instruction_analysis.get("analysis", {}),
                "audience_insights": audience_insights.get("insights", {}),
                "competitor_analysis": competitor_analysis.get("competitor_analysis", {}),
                "time_prediction": time_prediction.get("prediction", {}),
                "created_at": self._get_timestamp()
            }
            
            logger.info("生成完整营销策略方案")
            
            return {
                "success": True,
                "strategy": strategy
            }
            
        except Exception as e:
            logger.error(f"策略生成失败: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _build_analysis_prompt(
        self,
        product_name: str,
        highlights: str,
        target_audience: str,
        original_time: str
    ) -> str:
        """构建分析提示"""
        prompt = f"""
请分析以下营销指令并提供决策建议：

产品名称：{product_name}
核心卖点：{highlights}
目标受众：{target_audience}
计划发布时间：{original_time}

请提供以下分析：
1. 目标受众的行为特征分析
2. 计划发布时间是否合适（考虑该受众的活跃时段）
3. 核心卖点的市场竞争力分析
4. 是否需要调整营销主题或角度
5. 具体的优化建议（包括时间调整、主题优化、渠道选择）

请给出明确的决策建议。
"""
        return prompt
    
    def _parse_analysis_result(
        self,
        analysis_text: str,
        instruction: Dict
    ) -> Dict:
        """解析分析结果"""
        # 模拟解析逻辑，实际项目中可使用更复杂的NLP解析
        result = {
            "original_time": instruction.get("publish_time", ""),
            "recommended_time": "20:00",
            "time_adjustment_reason": "白领用户在晚上8点的互动率更高",
            "original_theme": instruction.get("highlights", ""),
            "recommended_theme": "快速回血",
            "theme_adjustment_reason": "竞争对手近期在推'超长续航'话题，应强调'快速充电'差异化",
            "channel_recommendation": ["微信公众号", "抖音", "小红书"],
            "style_recommendation": "专业+幽默结合",
            "risk_assessment": "低风险",
            "confidence_score": 0.88,
            "detailed_analysis": analysis_text
        }
        
        return result
    
    def _get_timestamp(self) -> str:
        """获取当前时间戳"""
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    def get_analysis_history(self, limit: int = 10) -> List[Dict]:
        """
        获取分析历史记录
        
        Args:
            limit: 返回数量限制
            
        Returns:
            历史记录列表
        """
        return self.analysis_history[-limit:]


# 全局实例
analysis_agent = AnalysisAgent()


def analyze_marketing_instruction(instruction: Dict) -> Dict:
    """
    分析营销指令（对外接口）
    
    Args:
        instruction: 营销指令
        
    Returns:
        分析结果
    """
    return analysis_agent.analyze_instruction(instruction)


def get_audience_insights(target_audience: str) -> Dict:
    """获取受众洞察（对外接口）"""
    return analysis_agent.analyze_audience_insights(target_audience)


def get_competitor_analysis(product_category: str) -> Dict:
    """获取竞争分析（对外接口）"""
    return analysis_agent.analyze_competitor(product_category)


def predict_publish_time(target_audience: str, platform: str = "multi") -> Dict:
    """预测最佳发布时间（对外接口）"""
    return analysis_agent.predict_best_publish_time(target_audience, platform)


def analyze_sentiment(text_data: List[str]) -> Dict:
    """情感分析（对外接口）"""
    return analysis_agent.sentiment_analysis(text_data)


def create_marketing_strategy(instruction: Dict) -> Dict:
    """创建营销策略（对外接口）"""
    return analysis_agent.generate_marketing_strategy(instruction)


def analyze_sentiment_trend(
    target_audience: str,
    product_name: str = "",
    time_range: str = "近30天"
) -> Dict:
    """情感趋势分析（对外接口）"""
    return analysis_agent.analyze_sentiment_trend(target_audience, product_name, time_range)


def evaluate_content_performance(
    content_types: List[str] = None,
    target_audience: str = "大众"
) -> Dict:
    """内容效果评估（对外接口）"""
    return analysis_agent.evaluate_content_performance(content_types, target_audience)


def compare_channel_performance(
    channels: List[str] = None,
    target_audience: str = "大众"
) -> Dict:
    """渠道表现对比（对外接口）"""
    return analysis_agent.compare_channel_performance(channels, target_audience)