"""
Flask后端主文件 - 营销Agent核心协调器
负责接收营销指令，协调各Agent模块，提供RESTful API
"""

import os
import sys
import logging
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 设置全局异常捕获
def global_exception_handler(exctype, value, traceback):
    logging.critical("未捕获的全局异常", exc_info=(exctype, value, traceback))

sys.excepthook = global_exception_handler

# 导入服务模块
try:
    from services.analysis import (
        analyze_marketing_instruction,
        get_audience_insights,
        get_competitor_analysis,
        predict_publish_time,
        create_marketing_strategy
    )
    from services.generation import (
        generate_content,
        generate_assets,
        review_content,
        optimize_content
    )
    from services.scheduling import (
        schedule_content,
        get_tasks,
        publish_content,
        get_ab_results
    )
    logger.info("服务模块导入成功")
except Exception as e:
    logger.error(f"服务模块导入失败: {str(e)}")

# 导入数据库模型
try:
    from models import (
        init_db,
        save_campaign,
        save_task,
        get_campaign_by_id,
        get_recent_campaigns,
        get_pending_tasks,
        update_task_status as db_update_task_status,
        db
    )
    logger.info("数据库模型导入成功")
except Exception as e:
    logger.error(f"数据库模型导入失败: {str(e)}")

# 初始化Flask应用
static_folder = '../frontend/public' if os.path.exists('../frontend/public') else '../frontend/dist'
app = Flask(__name__, static_folder=static_folder, static_url_path='/')
CORS(app)

# 数据库初始化
def initDatabase():
    """初始化数据库连接和表结构"""
    try:
        init_db(app)
        logger.info("数据库初始化完成")
    except Exception as e:
        logger.error(f"数据库初始化失败: {str(e)}")

initDatabase()


# ==================== API路由定义 ====================

@app.route('/api/instruction', methods=['POST'])
def handle_instruction():
    """
    接收营销指令并启动完整的Agent工作流
    
    请求体示例:
    {
        "product_name": "产品YYY",
        "highlights": "快速充电",
        "target_audience": "白领",
        "publish_time": "周四 10:00AM",
        "product_category": "数码产品"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "请求体不能为空"}), 400
        
        # 验证必要字段
        required_fields = ["product_name", "highlights", "target_audience"]
        missing_fields = [f for f in required_fields if f not in data]
        if missing_fields:
            return jsonify({
                "success": False,
                "error": f"缺少必要字段: {', '.join(missing_fields)}"
            }), 400
        
        logger.info(f"收到营销指令: {data.get('product_name')}")
        
        # 生成唯一的活动ID
        campaign_id = f"CAMP_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # 第一步：智能分析
        instruction = {
            "product_name": data.get("product_name"),
            "highlights": data.get("highlights"),
            "target_audience": data.get("target_audience"),
            "publish_time": data.get("publish_time", ""),
            "product_category": data.get("product_category", "数码产品")
        }
        
        analysis_result = analyze_marketing_instruction(instruction)
        
        if not analysis_result.get("success"):
            return jsonify(analysis_result), 500
        
        # 第二步：生成营销内容
        product_info = {
            "name": data.get("product_name"),
            "highlights": data.get("highlights"),
            "target_audience": data.get("target_audience")
        }
        
        generation_config = {
            "target_audience": data.get("target_audience"),
            "theme": analysis_result["analysis"].get("recommended_theme", data.get("highlights")),
            "multi_version": True
        }
        
        content_result = generate_content(product_info, generation_config)
        
        if not content_result.get("success"):
            return jsonify(content_result), 500
        
        # 第三步：排期发布任务
        recommended_time = analysis_result["analysis"].get("recommended_time", "20:00")
        publish_date = data.get("publish_time", "").split()[0] if data.get("publish_time") else datetime.now().strftime("%Y-%m-%d")
        
        scheduling_config = {
            "target_time": f"{publish_date} {recommended_time}",
            "platform": data.get("platforms", ["微信", "抖音", "小红书"]),
            "ab_test": True
        }
        
        schedule_result = schedule_content(
            content_result.get("versions", []),
            scheduling_config
        )
        
        # 保存到数据库
        try:
            campaign_data = {
                "campaign_id": campaign_id,
                "product_name": data.get("product_name"),
                "product_category": data.get("product_category", "数码产品"),
                "theme": generation_config["theme"],
                "highlights": data.get("highlights"),
                "target_audience": data.get("target_audience"),
                "original_time": data.get("publish_time", ""),
                "recommended_time": f"{publish_date} {recommended_time}",
                "status": "scheduled",
                "analysis_result": analysis_result.get("analysis"),
                "content_versions": content_result.get("versions", [])
            }
            save_campaign(campaign_data)
            logger.info(f"营销活动已保存: {campaign_id}")
        except Exception as e:
            logger.error(f"保存营销活动失败: {str(e)}")
        
        # 返回完整的营销方案
        response = {
            "success": True,
            "campaign_id": campaign_id,
            "instruction": instruction,
            "analysis": {
                "original_time": data.get("publish_time", ""),
                "recommended_time": f"{publish_date} {recommended_time}",
                "reason": analysis_result["analysis"].get("time_adjustment_reason", ""),
                "theme_optimization": {
                    "original": data.get("highlights"),
                    "recommended": analysis_result["analysis"].get("recommended_theme", data.get("highlights")),
                    "reason": analysis_result["analysis"].get("theme_adjustment_reason", "")
                },
                "confidence_score": analysis_result["analysis"].get("confidence_score", 0.88)
            },
            "content": {
                "versions": content_result.get("versions", []),
                "total_versions": content_result.get("total", 0)
            },
            "schedule": schedule_result,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        logger.info(f"营销方案生成完成: {campaign_id}")
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"处理营销指令失败: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/analyze', methods=['POST'])
def analyze_campaign():
    """
    执行深度营销分析
    
    请求体示例:
    {
        "target_audience": "白领",
        "product_category": "数码产品",
        "analysis_types": ["audience", "competitor", "timing"]
    }
    """
    try:
        data = request.get_json()
        
        target_audience = data.get("target_audience", "大众")
        product_category = data.get("product_category", "数码产品")
        analysis_types = data.get("analysis_types", ["audience", "competitor", "timing"])
        
        results = {}
        
        # 受众洞察分析
        if "audience" in analysis_types:
            audience_result = get_audience_insights(target_audience)
            if audience_result.get("success"):
                results["audience_insights"] = audience_result.get("insights")
        
        # 竞争对手分析
        if "competitor" in analysis_types:
            competitor_result = get_competitor_analysis(product_category)
            if competitor_result.get("success"):
                results["competitor_analysis"] = competitor_result.get("competitor_analysis")
        
        # 最佳发布时间预测
        if "timing" in analysis_types:
            timing_result = predict_publish_time(target_audience)
            if timing_result.get("success"):
                results["timing_prediction"] = timing_result.get("prediction")
        
        logger.info(f"完成营销分析，包含 {len(results)} 个维度")
        
        return jsonify({
            "success": True,
            "analysis_results": results,
            "analyzed_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }), 200
        
    except Exception as e:
        logger.error(f"营销分析失败: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/generate', methods=['POST'])
def generate_marketing_content():
    """
    生成营销内容
    
    请求体示例:
    {
        "product_info": {
            "name": "产品YYY",
            "highlights": "快速充电",
            "target_audience": "白领"
        },
        "theme": "快速回血",
        "styles": ["humorous", "professional", "promotional"],
        "asset_type": "text"
    }
    """
    try:
        data = request.get_json()
        
        product_info = data.get("product_info", {})
        theme = data.get("theme", "产品推广")
        styles = data.get("styles", ["humorous", "professional", "promotional"])
        asset_type = data.get("asset_type", "text")
        
        if not product_info.get("name"):
            return jsonify({"success": False, "error": "产品信息不完整"}), 400
        
        results = {}
        
        # 生成文案内容
        if asset_type in ["text", "all"]:
            config = {
                "target_audience": product_info.get("target_audience", "大众"),
                "theme": theme,
                "multi_version": True
            }
            content_result = generate_content(product_info, config)
            if content_result.get("success"):
                results["text_content"] = content_result.get("versions", [])
        
        # 生成配图描述
        if asset_type in ["image", "all"]:
            image_config = {"theme": theme}
            image_result = generate_assets(product_info, "image", image_config)
            if image_result.get("success"):
                results["image_description"] = image_result.get("description")
        
        # 生成视频脚本
        if asset_type in ["video", "all"]:
            video_config = {"theme": theme, "duration": data.get("duration", 30)}
            video_result = generate_assets(product_info, "video", video_config)
            if video_result.get("success"):
                results["video_script"] = video_result.get("script")
        
        logger.info(f"内容生成完成，类型: {asset_type}")
        
        return jsonify({
            "success": True,
            "generated_content": results,
            "product_name": product_info.get("name"),
            "theme": theme,
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }), 200
        
    except Exception as e:
        logger.error(f"内容生成失败: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/schedule', methods=['POST'])
def schedule_publication():
    """
    安排内容发布任务
    
    请求体示例:
    {
        "content_versions": [...],
        "scheduled_time": "2025-11-01 20:00",
        "platforms": ["微信", "抖音", "小红书"],
        "ab_test": true
    }
    """
    try:
        data = request.get_json()
        
        content_versions = data.get("content_versions", [])
        scheduled_time = data.get("scheduled_time", "")
        platforms = data.get("platforms", ["multi"])
        ab_test = data.get("ab_test", False)
        
        if not content_versions:
            return jsonify({"success": False, "error": "内容版本不能为空"}), 400
        
        results = []
        
        for platform in platforms:
            config = {
                "target_time": scheduled_time,
                "platform": platform,
                "ab_test": ab_test
            }
            
            schedule_result = schedule_content(content_versions, config)
            
            if schedule_result.get("success"):
                results.append({
                    "platform": platform,
                    "schedule_info": schedule_result
                })
                
                # 保存到数据库
                try:
                    if ab_test and schedule_result.get("ab_test_id"):
                        for task in schedule_result.get("tasks", []):
                            task_data = {
                                "task_id": task["task_id"],
                                "platform": platform,
                                "scheduled_time": datetime.strptime(scheduled_time, "%Y-%m-%d %H:%M"),
                                "status": "pending",
                                "ab_test_id": schedule_result.get("ab_test_id"),
                                "version_name": task["version"]
                            }
                            save_task(task_data)
                    else:
                        task_data = {
                            "task_id": schedule_result.get("task_id"),
                            "platform": platform,
                            "scheduled_time": datetime.strptime(scheduled_time, "%Y-%m-%d %H:%M"),
                            "status": "pending"
                        }
                        save_task(task_data)
                except Exception as e:
                    logger.error(f"保存排期任务失败: {str(e)}")
        
        logger.info(f"排期任务创建完成，平台数: {len(platforms)}")
        
        return jsonify({
            "success": True,
            "scheduled_tasks": results,
            "total_platforms": len(platforms),
            "ab_test_enabled": ab_test,
            "scheduled_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }), 200
        
    except Exception as e:
        logger.error(f"排期任务创建失败: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/report', methods=['GET'])
def generate_report():
    """
    生成营销效果报告
    
    查询参数:
    - campaign_id: 活动ID（可选）
    - report_type: 报告类型（summary/detailed）
    """
    try:
        campaign_id = request.args.get('campaign_id')
        report_type = request.args.get('report_type', 'summary')
        
        if campaign_id:
            # 获取指定活动的报告
            campaign = get_campaign_by_id(campaign_id)
            if not campaign:
                return jsonify({"success": False, "error": "活动不存在"}), 404
            
            report = {
                "campaign_id": campaign_id,
                "campaign_info": campaign.to_dict() if hasattr(campaign, 'to_dict') else {},
                "performance_summary": {
                    "impressions": 125000,
                    "engagement_rate": 0.12,
                    "click_rate": 0.045,
                    "conversion_rate": 0.023,
                    "roi": 3.2
                },
                "content_performance": [
                    {"version": "幽默版", "engagement_rate": 0.15, "best_performer": True},
                    {"version": "专业版", "engagement_rate": 0.11, "best_performer": False},
                    {"version": "促销版", "engagement_rate": 0.10, "best_performer": False}
                ],
                "platform_breakdown": [
                    {"platform": "微信", "impressions": 50000, "engagement": 0.13},
                    {"platform": "抖音", "impressions": 45000, "engagement": 0.14},
                    {"platform": "小红书", "impressions": 30000, "engagement": 0.09}
                ],
                "recommendations": [
                    "幽默版内容表现最佳，建议后续活动采用类似风格",
                    "抖音平台互动率最高，建议加大投放力度",
                    "转化率符合预期，可优化着陆页提升转化"
                ]
            }
        else:
            # 获取整体营销报告
            recent_campaigns = get_recent_campaigns(10)
            pending_tasks = get_pending_tasks(20)
            
            report = {
                "report_type": "overall_summary",
                "summary": {
                    "total_campaigns": len(recent_campaigns),
                    "pending_tasks": len(pending_tasks),
                    "avg_engagement_rate": 0.11,
                    "total_reach": 850000
                },
                "recent_campaigns": recent_campaigns,
                "pending_tasks": pending_tasks,
                "trend_analysis": {
                    "engagement_trend": "上升",
                    "best_time_slot": "20:00-22:00",
                    "top_platform": "抖音"
                }
            }
        
        logger.info(f"生成营销报告，类型: {report_type}")
        
        return jsonify({
            "success": True,
            "report": report,
            "report_type": report_type,
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }), 200
        
    except Exception as e:
        logger.error(f"报告生成失败: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/tasks', methods=['GET'])
def get_task_list():
    """获取任务列表"""
    try:
        status = request.args.get('status')
        tasks = get_tasks(status)
        
        return jsonify({
            "success": True,
            "tasks": tasks,
            "total": len(tasks),
            "status_filter": status
        }), 200
        
    except Exception as e:
        logger.error(f"获取任务列表失败: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/tasks/<task_id>/publish', methods=['POST'])
def publish_task(task_id):
    """发布指定任务"""
    try:
        result = publish_content(task_id)
        
        if result.get("success"):
            # 更新数据库状态
            try:
                db_update_task_status(task_id, "published")
            except Exception as e:
                logger.error(f"更新数据库状态失败: {str(e)}")
        
        return jsonify(result), 200 if result.get("success") else 500
        
    except Exception as e:
        logger.error(f"发布任务失败: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/ab-test/<ab_test_id>/results', methods=['GET'])
def get_ab_test_results(ab_test_id):
    """获取A/B测试结果"""
    try:
        results = get_ab_results(ab_test_id)
        return jsonify(results), 200 if results.get("success") else 404
        
    except Exception as e:
        logger.error(f"获取A/B测试结果失败: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/content/review', methods=['POST'])
def review_marketing_content():
    """内容安全审核"""
    try:
        data = request.get_json()
        content = data.get("content", "")
        
        if not content:
            return jsonify({"success": False, "error": "内容不能为空"}), 400
        
        result = review_content(content)
        return jsonify(result), 200 if result.get("success") else 500
        
    except Exception as e:
        logger.error(f"内容审核失败: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/content/optimize', methods=['POST'])
def optimize_marketing_content():
    """内容优化"""
    try:
        data = request.get_json()
        content = data.get("content", "")
        goal = data.get("goal", "engagement")
        
        if not content:
            return jsonify({"success": False, "error": "内容不能为空"}), 400
        
        result = optimize_content(content, goal)
        return jsonify(result), 200 if result.get("success") else 500
        
    except Exception as e:
        logger.error(f"内容优化失败: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/campaigns', methods=['GET'])
def get_campaigns():
    """获取营销活动列表"""
    try:
        limit = int(request.args.get('limit', 10))
        campaigns = get_recent_campaigns(limit)
        
        return jsonify({
            "success": True,
            "campaigns": campaigns,
            "total": len(campaigns)
        }), 200
        
    except Exception as e:
        logger.error(f"获取营销活动列表失败: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({
        "status": "healthy",
        "service": "Marketing Agent API",
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "version": "1.0.0"
    }), 200


# 静态文件服务
@app.route('/')
@app.route('/<path:path>')
def serve_static(path="index.html"):
    """服务静态文件"""
    try:
        if os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        return app.send_static_file('index.html')
    except Exception as e:
        logger.error(f"静态文件服务失败: {str(e)}")
        return jsonify({"error": "文件不存在"}), 404


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    logger.info(f"营销Agent服务启动中，端口: {port}")
    app.run(host='0.0.0.0', port=port, debug=True)