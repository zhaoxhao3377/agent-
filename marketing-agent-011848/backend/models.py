"""
PostgreSQL数据库模型定义
存储用户画像、营销历史数据、内容排期任务等核心数据
"""

import os
import logging
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

db = SQLAlchemy()


def init_db(app):
    """
    初始化数据库连接
    
    Args:
        app: Flask应用实例
    """
    try:
        # 从环境变量获取数据库连接配置
        db_name = os.environ.get('DB_NAME', 'marketing_agent')
        db_user = os.environ.get('DB_USER', 'postgres')
        db_password = os.environ.get('DB_PASSWORD', 'postgres')
        db_host = os.environ.get('DB_HOST', 'localhost')
        db_port = os.environ.get('DB_PORT', '5432')
        
        # 构建数据库URI
        database_uri = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
        
        app.config['SQLALCHEMY_DATABASE_URI'] = database_uri
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            'pool_pre_ping': True,
            'pool_recycle': 3600,
            'connect_args': {'connect_timeout': 10}
        }
        
        db.init_app(app)
        
        with app.app_context():
            db.create_all()
            logger.info("数据库初始化成功")
            
    except Exception as e:
        logger.error(f"数据库初始化失败: {str(e)}")


class UserProfile(db.Model):
    """用户画像模型"""
    __tablename__ = 'user_profiles'
    
    id = db.Column(db.Integer, primary_key=True)
    audience_type = db.Column(db.String(100), nullable=False, index=True)
    age_range = db.Column(db.String(50))
    gender = db.Column(db.String(20))
    occupation = db.Column(db.String(100))
    income_level = db.Column(db.String(50))
    preferences = db.Column(db.JSON)
    interaction_history = db.Column(db.JSON)
    active_time_slots = db.Column(db.JSON)
    platform_preference = db.Column(db.JSON)
    engagement_rate = db.Column(db.Float, default=0.0)
    conversion_rate = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)
    updated_at = db.Column(db.TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'audience_type': self.audience_type,
            'age_range': self.age_range,
            'gender': self.gender,
            'occupation': self.occupation,
            'income_level': self.income_level,
            'preferences': self.preferences,
            'interaction_history': self.interaction_history,
            'active_time_slots': self.active_time_slots,
            'platform_preference': self.platform_preference,
            'engagement_rate': self.engagement_rate,
            'conversion_rate': self.conversion_rate,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class MarketingCampaign(db.Model):
    """营销历史模型"""
    __tablename__ = 'marketing_campaigns'
    
    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    product_name = db.Column(db.String(200), nullable=False)
    product_category = db.Column(db.String(100))
    theme = db.Column(db.String(200))
    highlights = db.Column(db.Text)
    target_audience = db.Column(db.String(100))
    original_time = db.Column(db.String(50))
    recommended_time = db.Column(db.String(50))
    actual_publish_time = db.Column(db.TIMESTAMP)
    status = db.Column(db.String(50), default='pending')
    performance = db.Column(db.JSON)
    analysis_result = db.Column(db.JSON)
    content_versions = db.Column(db.JSON)
    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)
    updated_at = db.Column(db.TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'campaign_id': self.campaign_id,
            'product_name': self.product_name,
            'product_category': self.product_category,
            'theme': self.theme,
            'highlights': self.highlights,
            'target_audience': self.target_audience,
            'original_time': self.original_time,
            'recommended_time': self.recommended_time,
            'actual_publish_time': self.actual_publish_time.isoformat() if self.actual_publish_time else None,
            'status': self.status,
            'performance': self.performance,
            'analysis_result': self.analysis_result,
            'content_versions': self.content_versions,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class ScheduledTask(db.Model):
    """排期任务模型"""
    __tablename__ = 'scheduled_tasks'
    
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    campaign_id = db.Column(db.String(50), db.ForeignKey('marketing_campaigns.campaign_id'))
    content = db.Column(db.JSON)
    platform = db.Column(db.String(100))
    scheduled_time = db.Column(db.TIMESTAMP)
    status = db.Column(db.String(50), default='pending')
    published_at = db.Column(db.TIMESTAMP)
    ab_test_id = db.Column(db.String(50))
    version_name = db.Column(db.String(100))
    performance_metrics = db.Column(db.JSON)
    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)
    updated_at = db.Column(db.TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    campaign = db.relationship('MarketingCampaign', backref=db.backref('tasks', lazy=True))
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'task_id': self.task_id,
            'campaign_id': self.campaign_id,
            'content': self.content,
            'platform': self.platform,
            'scheduled_time': self.scheduled_time.isoformat() if self.scheduled_time else None,
            'status': self.status,
            'published_at': self.published_at.isoformat() if self.published_at else None,
            'ab_test_id': self.ab_test_id,
            'version_name': self.version_name,
            'performance_metrics': self.performance_metrics,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class ContentGeneration(db.Model):
    """内容生成记录模型"""
    __tablename__ = 'content_generations'
    
    id = db.Column(db.Integer, primary_key=True)
    generation_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    campaign_id = db.Column(db.String(50), db.ForeignKey('marketing_campaigns.campaign_id'))
    content_type = db.Column(db.String(50))
    style = db.Column(db.String(50))
    version_name = db.Column(db.String(100))
    text_content = db.Column(db.Text)
    image_description = db.Column(db.Text)
    video_script = db.Column(db.Text)
    word_count = db.Column(db.Integer)
    review_status = db.Column(db.String(50), default='pending')
    risk_level = db.Column(db.String(20))
    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)
    
    campaign = db.relationship('MarketingCampaign', backref=db.backref('contents', lazy=True))
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'generation_id': self.generation_id,
            'campaign_id': self.campaign_id,
            'content_type': self.content_type,
            'style': self.style,
            'version_name': self.version_name,
            'text_content': self.text_content,
            'image_description': self.image_description,
            'video_script': self.video_script,
            'word_count': self.word_count,
            'review_status': self.review_status,
            'risk_level': self.risk_level,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class AnalysisHistory(db.Model):
    """分析历史记录模型"""
    __tablename__ = 'analysis_history'
    
    id = db.Column(db.Integer, primary_key=True)
    analysis_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    campaign_id = db.Column(db.String(50), db.ForeignKey('marketing_campaigns.campaign_id'))
    analysis_type = db.Column(db.String(50))
    input_data = db.Column(db.JSON)
    output_data = db.Column(db.JSON)
    insights = db.Column(db.JSON)
    recommendations = db.Column(db.JSON)
    confidence_score = db.Column(db.Float)
    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)
    
    campaign = db.relationship('MarketingCampaign', backref=db.backref('analyses', lazy=True))
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'analysis_id': self.analysis_id,
            'campaign_id': self.campaign_id,
            'analysis_type': self.analysis_type,
            'input_data': self.input_data,
            'output_data': self.output_data,
            'insights': self.insights,
            'recommendations': self.recommendations,
            'confidence_score': self.confidence_score,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class InteractionLog(db.Model):
    """互动日志模型"""
    __tablename__ = 'interaction_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    log_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    task_id = db.Column(db.String(50), db.ForeignKey('scheduled_tasks.task_id'))
    interaction_type = db.Column(db.String(50))
    platform = db.Column(db.String(100))
    user_id = db.Column(db.String(100))
    content = db.Column(db.Text)
    sentiment = db.Column(db.String(20))
    handled = db.Column(db.Boolean, default=False)
    response = db.Column(db.Text)
    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)
    
    task = db.relationship('ScheduledTask', backref=db.backref('interactions', lazy=True))
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'log_id': self.log_id,
            'task_id': self.task_id,
            'interaction_type': self.interaction_type,
            'platform': self.platform,
            'user_id': self.user_id,
            'content': self.content,
            'sentiment': self.sentiment,
            'handled': self.handled,
            'response': self.response,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# 数据库操作辅助函数

def save_user_profile(data: dict) -> UserProfile:
    """保存用户画像"""
    try:
        profile = UserProfile(**data)
        db.session.add(profile)
        db.session.commit()
        logger.info(f"保存用户画像: {profile.audience_type}")
        return profile
    except Exception as e:
        db.session.rollback()
        logger.error(f"保存用户画像失败: {str(e)}")
        raise


def save_campaign(data: dict) -> MarketingCampaign:
    """保存营销活动"""
    try:
        campaign = MarketingCampaign(**data)
        db.session.add(campaign)
        db.session.commit()
        logger.info(f"保存营销活动: {campaign.campaign_id}")
        return campaign
    except Exception as e:
        db.session.rollback()
        logger.error(f"保存营销活动失败: {str(e)}")
        raise


def save_task(data: dict) -> ScheduledTask:
    """保存排期任务"""
    try:
        task = ScheduledTask(**data)
        db.session.add(task)
        db.session.commit()
        logger.info(f"保存排期任务: {task.task_id}")
        return task
    except Exception as e:
        db.session.rollback()
        logger.error(f"保存排期任务失败: {str(e)}")
        raise


def get_campaign_by_id(campaign_id: str) -> MarketingCampaign:
    """根据ID获取营销活动"""
    return MarketingCampaign.query.filter_by(campaign_id=campaign_id).first()


def get_recent_campaigns(limit: int = 10) -> list:
    """获取最近的营销活动"""
    campaigns = MarketingCampaign.query.order_by(
        MarketingCampaign.created_at.desc()
    ).limit(limit).all()
    return [c.to_dict() for c in campaigns]


def get_pending_tasks(limit: int = 20) -> list:
    """获取待发布任务"""
    tasks = ScheduledTask.query.filter_by(
        status='pending'
    ).order_by(ScheduledTask.scheduled_time).limit(limit).all()
    return [t.to_dict() for t in tasks]


def update_task_status(task_id: str, status: str) -> bool:
    """更新任务状态"""
    try:
        task = ScheduledTask.query.filter_by(task_id=task_id).first()
        if task:
            task.status = status
            if status == 'published':
                task.published_at = datetime.utcnow()
            db.session.commit()
            logger.info(f"更新任务状态: {task_id} -> {status}")
            return True
        return False
    except Exception as e:
        db.session.rollback()
        logger.error(f"更新任务状态失败: {str(e)}")
        return False