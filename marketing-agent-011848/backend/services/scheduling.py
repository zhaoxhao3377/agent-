"""
排期发布Agent - 管理内容发布任务和A/B测试
负责接收已生成的内容，结合洞察引擎的建议，自动安排发布日程
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SchedulingAgent:
    """内容排期与发布Agent"""
    
    def __init__(self):
        """初始化排期Agent"""
        self.scheduled_tasks = []
        self.ab_tests = []
        
    def create_schedule(
        self,
        content_versions: List[Dict],
        target_time: str,
        platform: str = "multi",
        ab_test: bool = False
    ) -> Dict:
        """
        创建内容发布排期
        
        Args:
            content_versions: 内容版本列表
            target_time: 目标发布时间
            platform: 目标平台
            ab_test: 是否启用A/B测试
            
        Returns:
            排期结果
        """
        try:
            scheduled_time = self._parse_time(target_time)
            
            if ab_test and len(content_versions) > 1:
                return self._create_ab_test(content_versions, scheduled_time, platform)
            else:
                return self._create_single_schedule(content_versions[0], scheduled_time, platform)
                
        except Exception as e:
            logger.error(f"创建排期失败: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _parse_time(self, time_str: str) -> datetime:
        """解析时间字符串"""
        try:
            return datetime.strptime(time_str, "%Y-%m-%d %H:%M")
        except ValueError:
            return datetime.now() + timedelta(hours=2)
    
    def _create_single_schedule(
        self,
        content: Dict,
        scheduled_time: datetime,
        platform: str
    ) -> Dict:
        """创建单个排期任务"""
        task = {
            "task_id": f"TASK_{len(self.scheduled_tasks) + 1:04d}",
            "content": content,
            "platform": platform,
            "scheduled_time": scheduled_time.strftime("%Y-%m-%d %H:%M:%S"),
            "status": "pending",
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        self.scheduled_tasks.append(task)
        logger.info(f"创建排期任务: {task['task_id']}")
        
        return {
            "success": True,
            "task_id": task["task_id"],
            "scheduled_time": task["scheduled_time"],
            "platform": platform
        }
    
    def _create_ab_test(
        self,
        content_versions: List[Dict],
        scheduled_time: datetime,
        platform: str
    ) -> Dict:
        """创建A/B测试排期"""
        ab_test_id = f"AB_{len(self.ab_tests) + 1:04d}"
        
        tasks = []
        for idx, content in enumerate(content_versions[:3]):
            task = {
                "task_id": f"{ab_test_id}_V{idx + 1}",
                "content": content,
                "platform": platform,
                "scheduled_time": scheduled_time.strftime("%Y-%m-%d %H:%M:%S"),
                "status": "pending",
                "ab_test_id": ab_test_id,
                "version": f"版本{idx + 1}",
                "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            tasks.append(task)
            self.scheduled_tasks.append(task)
        
        ab_test = {
            "ab_test_id": ab_test_id,
            "tasks": tasks,
            "scheduled_time": scheduled_time.strftime("%Y-%m-%d %H:%M:%S"),
            "status": "pending",
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        self.ab_tests.append(ab_test)
        logger.info(f"创建A/B测试: {ab_test_id}, 版本数: {len(tasks)}")
        
        return {
            "success": True,
            "ab_test_id": ab_test_id,
            "tasks": [{"task_id": t["task_id"], "version": t["version"]} for t in tasks],
            "scheduled_time": scheduled_time.strftime("%Y-%m-%d %H:%M:%S"),
            "platform": platform
        }
    
    def optimize_schedule(self, insights: Dict) -> Dict:
        """
        基于洞察优化发布时间
        
        Args:
            insights: 数据洞察结果
            
        Returns:
            优化建议
        """
        try:
            best_time = insights.get("best_time", "20:00")
            engagement_rate = insights.get("engagement_rate", 0.85)
            
            recommendation = {
                "recommended_time": best_time,
                "reason": f"该时段互动率高达{engagement_rate * 100:.1f}%",
                "alternative_times": ["18:00", "21:00", "12:00"],
                "avoid_times": ["03:00-06:00", "工作日上午"]
            }
            
            logger.info(f"生成排期优化建议: {best_time}")
            return {"success": True, "recommendation": recommendation}
            
        except Exception as e:
            logger.error(f"优化排期失败: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def get_scheduled_tasks(self, status: Optional[str] = None) -> List[Dict]:
        """
        获取排期任务列表
        
        Args:
            status: 任务状态筛选
            
        Returns:
            任务列表
        """
        if status:
            return [t for t in self.scheduled_tasks if t["status"] == status]
        return self.scheduled_tasks
    
    def update_task_status(self, task_id: str, status: str) -> Dict:
        """
        更新任务状态
        
        Args:
            task_id: 任务ID
            status: 新状态
            
        Returns:
            更新结果
        """
        for task in self.scheduled_tasks:
            if task["task_id"] == task_id:
                task["status"] = status
                task["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                logger.info(f"任务 {task_id} 状态更新为: {status}")
                return {"success": True, "task_id": task_id, "status": status}
        
        return {"success": False, "error": "任务不存在"}
    
    def publish_task(self, task_id: str) -> Dict:
        """
        执行发布任务（模拟）
        
        Args:
            task_id: 任务ID
            
        Returns:
            发布结果
        """
        for task in self.scheduled_tasks:
            if task["task_id"] == task_id:
                task["status"] = "published"
                task["published_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                
                logger.info(f"任务 {task_id} 已发布到 {task['platform']}")
                
                return {
                    "success": True,
                    "task_id": task_id,
                    "platform": task["platform"],
                    "published_at": task["published_at"],
                    "content_preview": task["content"].get("text", "")[:50]
                }
        
        return {"success": False, "error": "任务不存在"}
    
    def get_ab_test_results(self, ab_test_id: str) -> Dict:
        """
        获取A/B测试结果（模拟数据）
        
        Args:
            ab_test_id: A/B测试ID
            
        Returns:
            测试结果
        """
        import random
        
        for ab_test in self.ab_tests:
            if ab_test["ab_test_id"] == ab_test_id:
                results = []
                for task in ab_test["tasks"]:
                    results.append({
                        "version": task["version"],
                        "task_id": task["task_id"],
                        "impressions": random.randint(5000, 15000),
                        "engagement_rate": round(random.uniform(0.05, 0.15), 3),
                        "click_rate": round(random.uniform(0.02, 0.08), 3),
                        "conversion_rate": round(random.uniform(0.01, 0.05), 3)
                    })
                
                winner = max(results, key=lambda x: x["engagement_rate"])
                
                return {
                    "success": True,
                    "ab_test_id": ab_test_id,
                    "results": results,
                    "winner": winner["version"],
                    "recommendation": f"{winner['version']}表现最佳，互动率{winner['engagement_rate'] * 100:.1f}%"
                }
        
        return {"success": False, "error": "A/B测试不存在"}


# 全局实例
scheduling_agent = SchedulingAgent()


def schedule_content(content_versions: List[Dict], config: Dict) -> Dict:
    """
    排期内容发布（对外接口）
    
    Args:
        content_versions: 内容版本列表
        config: 排期配置
        
    Returns:
        排期结果
    """
    return scheduling_agent.create_schedule(
        content_versions=content_versions,
        target_time=config.get("target_time", ""),
        platform=config.get("platform", "multi"),
        ab_test=config.get("ab_test", False)
    )


def get_tasks(status: Optional[str] = None) -> List[Dict]:
    """获取任务列表"""
    return scheduling_agent.get_scheduled_tasks(status)


def publish_content(task_id: str) -> Dict:
    """发布内容"""
    return scheduling_agent.publish_task(task_id)


def get_ab_results(ab_test_id: str) -> Dict:
    """获取A/B测试结果"""
    return scheduling_agent.get_ab_test_results(ab_test_id)