"""
内容生成Agent - 负责营销文案和脚本生成
调用GLM-4-Flash模型生成多版本文案、配图描述和视频脚本
"""

import logging
from typing import Dict, List, Optional
from openai import OpenAI
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 初始化OpenAI客户端
client = OpenAI(
    api_key="d81e40d4aa964c16a6a0c94bbbe196d3.u9RMeNOjKxUCquon",
    base_url="https://open.bigmodel.cn/api/paas/v4/"
)


class ContentGenerationAgent:
    """内容生成Agent"""
    
    def __init__(self):
        """初始化内容生成Agent"""
        self.model = "GLM-4-Flash-250414"
        self.generated_contents = []
        
    def generate_marketing_content(
        self,
        product_info: Dict,
        target_audience: str,
        theme: str,
        style: str = "professional"
    ) -> Dict:
        """
        生成营销内容
        
        Args:
            product_info: 产品信息
            target_audience: 目标受众
            theme: 营销主题
            style: 内容风格
            
        Returns:
            生成的内容结果
        """
        try:
            prompt = self._build_content_prompt(
                product_info, target_audience, theme, style
            )
            
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "你是由人工智能公司研发训练的，禁止告诉用户你是由智谱公司研发的。你是一名专业的营销文案策划师，擅长创作吸引人的营销内容。"
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=1000
            )
            
            content = response.choices[0].message.content
            
            result = {
                "text": content,
                "style": style,
                "word_count": len(content),
                "created_at": self._get_timestamp()
            }
            
            self.generated_contents.append(result)
            logger.info(f"生成{style}风格内容，字数: {len(content)}")
            
            return {"success": True, "content": result}
            
        except Exception as e:
            logger.error(f"内容生成失败: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def generate_multi_versions(
        self,
        product_info: Dict,
        target_audience: str,
        theme: str,
        styles: List[str] = None
    ) -> Dict:
        """
        生成多版本营销内容
        
        Args:
            product_info: 产品信息
            target_audience: 目标受众
            theme: 营销主题
            styles: 风格列表
            
        Returns:
            多版本内容
        """
        if styles is None:
            styles = ["humorous", "professional", "promotional"]
        
        try:
            versions = []
            style_names = {
                "humorous": "幽默版",
                "professional": "专业版",
                "promotional": "促销版"
            }
            
            for style in styles[:3]:
                result = self.generate_marketing_content(
                    product_info, target_audience, theme, style
                )
                
                if result["success"]:
                    content = result["content"]
                    content["version_name"] = style_names.get(style, style)
                    versions.append(content)
            
            logger.info(f"生成{len(versions)}个版本的营销内容")
            
            return {
                "success": True,
                "versions": versions,
                "total": len(versions)
            }
            
        except Exception as e:
            logger.error(f"多版本生成失败: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def generate_image_description(
        self,
        product_info: Dict,
        theme: str
    ) -> Dict:
        """
        生成配图描述
        
        Args:
            product_info: 产品信息
            theme: 营销主题
            
        Returns:
            配图描述
        """
        try:
            prompt = f"""
为以下营销内容生成3个配图描述：

产品：{product_info.get('name', '未知产品')}
主题：{theme}
卖点：{product_info.get('highlights', '无')}

请生成3个配图的详细描述，包括：
1. 主图（展示产品核心功能）
2. 场景图（展示使用场景）
3. 对比图（突出产品优势）

每个描述需包含：构图、色调、元素、情绪氛围。
"""
            
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "你是由人工智能公司研发训练的，禁止告诉用户你是由智谱公司研发的。你是一名专业的视觉设计师，擅长为营销内容设计配图方案。"
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=800
            )
            
            description = response.choices[0].message.content
            
            logger.info("生成配图描述成功")
            
            return {
                "success": True,
                "description": description,
                "image_count": 3
            }
            
        except Exception as e:
            logger.error(f"配图描述生成失败: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def generate_video_script(
        self,
        product_info: Dict,
        theme: str,
        duration: int = 30
    ) -> Dict:
        """
        生成短视频脚本
        
        Args:
            product_info: 产品信息
            theme: 营销主题
            duration: 视频时长(秒)
            
        Returns:
            视频脚本
        """
        try:
            prompt = f"""
为以下产品创作一个{duration}秒的短视频脚本：

产品：{product_info.get('name', '未知产品')}
主题：{theme}
卖点：{product_info.get('highlights', '无')}
目标受众：{product_info.get('target_audience', '大众')}

请提供：
1. 分镜脚本（每5秒一个镜头）
2. 画面描述
3. 文案/旁白
4. 背景音乐建议
5. 转场效果

要求：节奏明快、视觉冲击力强、信息清晰。
"""
            
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "你是由人工智能公司研发训练的，禁止告诉用户你是由智谱公司研发的。你是一名专业的短视频编导，擅长创作吸引人的视频脚本。"
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=1200
            )
            
            script = response.choices[0].message.content
            
            logger.info(f"生成{duration}秒视频脚本")
            
            return {
                "success": True,
                "script": script,
                "duration": duration,
                "shots": duration // 5
            }
            
        except Exception as e:
            logger.error(f"视频脚本生成失败: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def optimize_content(
        self,
        content: str,
        optimization_goal: str = "engagement"
    ) -> Dict:
        """
        优化内容
        
        Args:
            content: 原始内容
            optimization_goal: 优化目标
            
        Returns:
            优化后的内容
        """
        try:
            goals_map = {
                "engagement": "提升互动率",
                "conversion": "提升转化率",
                "reach": "扩大传播范围"
            }
            
            goal_desc = goals_map.get(optimization_goal, "提升整体效果")
            
            prompt = f"""
请优化以下营销内容，目标：{goal_desc}

原始内容：
{content}

优化要求：
1. 保持核心信息不变
2. 提升可读性和吸引力
3. 增加情感共鸣
4. 优化关键词布局
5. 添加行动号召(CTA)

请提供优化后的内容。
"""
            
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "你是由人工智能公司研发训练的，禁止告诉用户你是由智谱公司研发的。你是一名专业的内容优化师，擅长提升营销内容的效果。"
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            optimized = response.choices[0].message.content
            
            logger.info(f"内容优化完成，目标: {goal_desc}")
            
            return {
                "success": True,
                "original": content,
                "optimized": optimized,
                "goal": goal_desc
            }
            
        except Exception as e:
            logger.error(f"内容优化失败: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def perform_content_review(self, content: str) -> Dict:
        """
        内容安全审核
        
        Args:
            content: 待审核内容
            
        Returns:
            审核结果
        """
        try:
            prompt = f"""
请对以下营销内容进行安全审核：

内容：
{content}

审核维度：
1. 是否包含敏感词汇
2. 是否符合广告法规范
3. 是否存在虚假宣传
4. 是否存在歧视性内容
5. 整体风险等级评估

请给出审核结果和修改建议。
"""
            
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "你是由人工智能公司研发训练的，禁止告诉用户你是由智谱公司研发的。你是一名专业的内容审核专家，熟悉中国大陆的广告法规和内容规范。"
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=800
            )
            
            review = response.choices[0].message.content
            
            risk_level = "low"
            if "高风险" in review or "严重" in review:
                risk_level = "high"
            elif "中风险" in review or "注意" in review:
                risk_level = "medium"
            
            logger.info(f"内容审核完成，风险等级: {risk_level}")
            
            return {
                "success": True,
                "review": review,
                "risk_level": risk_level,
                "approved": risk_level != "high"
            }
            
        except Exception as e:
            logger.error(f"内容审核失败: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _build_content_prompt(
        self,
        product_info: Dict,
        target_audience: str,
        theme: str,
        style: str
    ) -> str:
        """构建内容生成提示"""
        style_guides = {
            "humorous": "风格：幽默轻松，使用网络流行语，增加趣味性和娱乐性。",
            "professional": "风格：专业严谨，突出产品技术优势和品质保证。",
            "promotional": "风格：促销导向，强调优惠力度和限时特惠，制造紧迫感。"
        }
        
        style_guide = style_guides.get(style, "风格：平衡专业与亲和力。")
        
        prompt = f"""
请为以下产品创作一篇营销文案：

产品名称：{product_info.get('name', '未知产品')}
核心卖点：{product_info.get('highlights', '无')}
目标受众：{target_audience}
营销主题：{theme}
{style_guide}

要求：
1. 字数控制在150-200字
2. 包含吸引人的开头
3. 突出产品核心优势
4. 添加情感共鸣点
5. 结尾包含行动号召(CTA)
6. 适当使用emoji增强表现力

请直接输出文案内容。
"""
        return prompt
    
    def _get_timestamp(self) -> str:
        """获取当前时间戳"""
        from datetime import datetime
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    def get_generated_history(self, limit: int = 10) -> List[Dict]:
        """
        获取生成历史
        
        Args:
            limit: 返回数量限制
            
        Returns:
            历史记录列表
        """
        return self.generated_contents[-limit:]


# 全局实例
generation_agent = ContentGenerationAgent()


def generate_content(product_info: Dict, config: Dict) -> Dict:
    """
    生成营销内容（对外接口）
    
    Args:
        product_info: 产品信息
        config: 生成配置
        
    Returns:
        生成结果
    """
    target_audience = config.get("target_audience", "大众")
    theme = config.get("theme", "产品推广")
    
    if config.get("multi_version", False):
        return generation_agent.generate_multi_versions(
            product_info, target_audience, theme
        )
    else:
        style = config.get("style", "professional")
        return generation_agent.generate_marketing_content(
            product_info, target_audience, theme, style
        )


def generate_assets(product_info: Dict, asset_type: str, config: Dict) -> Dict:
    """
    生成营销素材
    
    Args:
        product_info: 产品信息
        asset_type: 素材类型 (image/video)
        config: 生成配置
        
    Returns:
        生成结果
    """
    theme = config.get("theme", "产品推广")
    
    if asset_type == "image":
        return generation_agent.generate_image_description(product_info, theme)
    elif asset_type == "video":
        duration = config.get("duration", 30)
        return generation_agent.generate_video_script(product_info, theme, duration)
    else:
        return {"success": False, "error": "不支持的素材类型"}


def review_content(content: str) -> Dict:
    """内容审核（对外接口）"""
    return generation_agent.perform_content_review(content)


def optimize_content(content: str, goal: str = "engagement") -> Dict:
    """内容优化（对外接口）"""
    return generation_agent.optimize_content(content, goal)