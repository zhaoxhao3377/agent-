/**
 * Marketing Agent Dashboard - 前端交互逻辑
 * 处理API调用、动态内容更新和用户交互
 * By HAISNAP
 */

// ==================== 全局配置 ====================
const CONFIG = {
  API_BASE_URL: '/api',
  REFRESH_INTERVAL: 30000, // 30秒刷新间隔
  ANIMATION_DURATION: 300,
  MAX_RETRY: 3
};

// ==================== 状态管理 ====================
const AppState = {
  currentCampaign: null,
  tasks: [],
  campaigns: [],
  isLoading: false,
  activeTab: 'dashboard',
  notifications: []
};

// ==================== 工具函数 ====================
const Utils = {
  // 格式化时间
  formatTime(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // 格式化百分比
  formatPercent(value) {
    return `${(value * 100).toFixed(1)}%`;
  },

  // 格式化数字
  formatNumber(num) {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`;
    }
    return num.toLocaleString();
  },

  // 显示加载状态
  showLoading(show = true) {
    AppState.isLoading = show;
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
      spinner.classList.toggle('hidden', !show);
    }
  },

  // 显示通知
  showNotification(message, type = 'info') {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    
    AppState.notifications.push(notification);
    this.renderNotification(notification);
    
    // 5秒后自动移除
    setTimeout(() => {
      this.removeNotification(notification.id);
    }, 5000);
  },

  // 渲染通知
  renderNotification(notification) {
    const container = document.getElementById('notificationContainer') || this.createNotificationContainer();
    
    const colors = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500'
    };
    
    const toast = document.createElement('div');
    toast.id = `toast-${notification.id}`;
    toast.className = `toast ${colors[notification.type]} text-white px-6 py-4 rounded-lg shadow-lg mb-3 flex items-center justify-between animate-slideIn`;
    toast.innerHTML = `
      <span class="flex-1">${notification.message}</span>
      <button onclick="Utils.removeNotification(${notification.id})" class="ml-4 text-white hover:text-gray-200">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    `;
    
    container.appendChild(toast);
  },

  // 移除通知
  removeNotification(id) {
    const toast = document.getElementById(`toast-${id}`);
    if (toast) {
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }
    AppState.notifications = AppState.notifications.filter(n => n.id !== id);
  },

  // 创建通知容器
  createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notificationContainer';
    container.className = 'fixed top-4 right-4 z-50 max-w-md';
    document.body.appendChild(container);
    return container;
  },

  // 显示模态框
  showModal(title, content) {
    const modal = document.getElementById('mainModal');
    if (!modal) return;
    
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalContent').innerHTML = content;
    modal.classList.remove('hidden');
  },

  // 关闭模态框
  closeModal() {
    const modal = document.getElementById('mainModal');
    if (modal) {
      modal.classList.add('hidden');
    }
  },

  // 复制到剪贴板
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showNotification('已复制到剪贴板', 'success');
    } catch (err) {
      this.showNotification('复制失败', 'error');
    }
  }
};

// ==================== API 请求封装 ====================
const API = {
  // 通用请求方法
  async request(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options
    };

    try {
      const response = await fetch(url, defaultOptions);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `请求失败: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('API请求失败:', error);
      Utils.showNotification(error.message, 'error');
      throw error;
    }
  },

  // 提交营销指令
  async submitInstruction(instruction) {
    return this.request('/instruction', {
      method: 'POST',
      body: JSON.stringify(instruction)
    });
  },

  // 执行分析
  async analyze(data) {
    return this.request('/analyze', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // 生成内容
  async generateContent(data) {
    return this.request('/generate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // 排期任务
  async scheduleTask(data) {
    return this.request('/schedule', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // 获取任务列表
  async getTasks(status = null) {
    const params = status ? `?status=${status}` : '';
    return this.request(`/tasks${params}`);
  },

  // 发布任务
  async publishTask(taskId) {
    return this.request(`/tasks/${taskId}/publish`, {
      method: 'POST'
    });
  },

  // 获取A/B测试结果
  async getABTestResults(abTestId) {
    return this.request(`/ab-test/${abTestId}/results`);
  },

  // 获取营销活动列表
  async getCampaigns(limit = 10) {
    return this.request(`/campaigns?limit=${limit}`);
  },

  // 生成报告
  async generateReport(campaignId = null) {
    const params = campaignId ? `?campaign_id=${campaignId}` : '';
    return this.request(`/report${params}`);
  },

  // 内容审核
  async reviewContent(content) {
    return this.request('/content/review', {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  },

  // 内容优化
  async optimizeContent(content, goal = 'engagement') {
    return this.request('/content/optimize', {
      method: 'POST',
      body: JSON.stringify({ content, goal })
    });
  }
};

// ==================== UI 渲染函数 ====================
const Renderer = {
  // 渲染仪表盘概览
  renderDashboard(data) {
    const container = document.getElementById('dashboardContent');
    if (!container) return;

    const stats = data.summary || {
      total_campaigns: 0,
      pending_tasks: 0,
      avg_engagement_rate: 0,
      total_reach: 0
    };

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="metric-card">
          <div class="relative z-10">
            <div class="metric-value">${stats.total_campaigns}</div>
            <div class="metric-label">营销活动</div>
          </div>
        </div>
        <div class="metric-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
          <div class="relative z-10">
            <div class="metric-value">${stats.pending_tasks}</div>
            <div class="metric-label">待发布任务</div>
          </div>
        </div>
        <div class="metric-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
          <div class="relative z-10">
            <div class="metric-value">${Utils.formatPercent(stats.avg_engagement_rate)}</div>
            <div class="metric-label">平均互动率</div>
          </div>
        </div>
        <div class="metric-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
          <div class="relative z-10">
            <div class="metric-value">${Utils.formatNumber(stats.total_reach)}</div>
            <div class="metric-label">总触达人数</div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div class="dashboard-card">
          <h3 class="text-xl font-bold mb-4 text-gray-800">最近活动</h3>
          <div id="recentCampaigns" class="space-y-3">
            ${this.renderCampaignList(data.recent_campaigns || [])}
          </div>
        </div>
        
        <div class="dashboard-card">
          <h3 class="text-xl font-bold mb-4 text-gray-800">待发布任务</h3>
          <div id="pendingTasks" class="space-y-3">
            ${this.renderTaskList(data.pending_tasks || [])}
          </div>
        </div>
      </div>

      ${data.trend_analysis ? `
      <div class="dashboard-card">
        <h3 class="text-xl font-bold mb-4 text-gray-800">趋势分析</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
            <div class="text-sm text-gray-600 mb-1">互动率趋势</div>
            <div class="text-2xl font-bold text-purple-600">${data.trend_analysis.engagement_trend}</div>
          </div>
          <div class="text-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
            <div class="text-sm text-gray-600 mb-1">最佳发布时段</div>
            <div class="text-2xl font-bold text-blue-600">${data.trend_analysis.best_time_slot}</div>
          </div>
          <div class="text-center p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg">
            <div class="text-sm text-gray-600 mb-1">表现最佳平台</div>
            <div class="text-2xl font-bold text-green-600">${data.trend_analysis.top_platform}</div>
          </div>
        </div>
      </div>
      ` : ''}
    `;
  },

  // 渲染活动列表
  renderCampaignList(campaigns) {
    if (!campaigns || campaigns.length === 0) {
      return '<div class="text-gray-400 text-center py-8">暂无活动数据</div>';
    }

    return campaigns.map(campaign => `
      <div class="p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors cursor-pointer"
           onclick="Dashboard.viewCampaignDetail('${campaign.campaign_id}')">
        <div class="flex justify-between items-start mb-2">
          <h4 class="font-semibold text-gray-800">${campaign.product_name}</h4>
          <span class="badge ${this.getStatusBadgeClass(campaign.status)}">${this.getStatusText(campaign.status)}</span>
        </div>
        <p class="text-sm text-gray-600 mb-2">${campaign.theme || '-'}</p>
        <div class="flex justify-between text-xs text-gray-500">
          <span>受众: ${campaign.target_audience}</span>
          <span>${Utils.formatTime(campaign.created_at)}</span>
        </div>
      </div>
    `).join('');
  },

  // 渲染任务列表
  renderTaskList(tasks) {
    if (!tasks || tasks.length === 0) {
      return '<div class="text-gray-400 text-center py-8">暂无待发布任务</div>';
    }

    return tasks.map(task => `
      <div class="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
        <div class="flex justify-between items-start mb-2">
          <div class="flex-1">
            <h4 class="font-semibold text-gray-800 mb-1">${task.task_id}</h4>
            <p class="text-sm text-gray-600">${task.platform || '多平台'}</p>
          </div>
          <button onclick="Dashboard.publishTask('${task.task_id}')" 
                  class="btn-primary text-sm py-1 px-3">
            发布
          </button>
        </div>
        <div class="text-xs text-gray-500">
          <span>排期时间: ${Utils.formatTime(task.scheduled_time)}</span>
        </div>
      </div>
    `).join('');
  },

  // 渲染营销方案结果
  renderCampaignResult(result) {
    const modalContent = `
      <div class="space-y-6">
        <!-- 分析结果 -->
        <div class="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
          <h4 class="font-bold text-gray-800 mb-3">🎯 智能分析</h4>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">原定时间:</span>
              <span class="font-semibold">${result.analysis.original_time}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">推荐时间:</span>
              <span class="font-semibold text-purple-600">${result.analysis.recommended_time}</span>
            </div>
            <div class="mt-2 p-3 bg-white rounded">
              <p class="text-gray-700">${result.analysis.reason}</p>
            </div>
          </div>
        </div>

        <!-- 主题优化 -->
        <div class="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg">
          <h4 class="font-bold text-gray-800 mb-3">💡 主题优化</h4>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">原始主题:</span>
              <span class="font-semibold">${result.analysis.theme_optimization.original}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">优化主题:</span>
              <span class="font-semibold text-blue-600">${result.analysis.theme_optimization.recommended}</span>
            </div>
            <div class="mt-2 p-3 bg-white rounded">
              <p class="text-gray-700">${result.analysis.theme_optimization.reason}</p>
            </div>
          </div>
        </div>

        <!-- 内容版本 -->
        <div class="bg-gradient-to-r from-green-50 to-teal-50 p-4 rounded-lg">
          <h4 class="font-bold text-gray-800 mb-3">📝 生成内容 (${result.content.total_versions}个版本)</h4>
          <div class="space-y-3">
            ${result.content.versions.map((version, index) => `
              <div class="bg-white p-3 rounded shadow-sm">
                <div class="flex justify-between items-center mb-2">
                  <span class="font-semibold text-gray-800">${version.version_name || `版本${index + 1}`}</span>
                  <button onclick="Utils.copyToClipboard(\`${version.text.replace(/`/g, '\\`')}\`)" 
                          class="text-sm text-blue-600 hover:text-blue-700">
                    复制
                  </button>
                </div>
                <p class="text-sm text-gray-700 leading-relaxed">${version.text}</p>
                <div class="mt-2 text-xs text-gray-500">
                  字数: ${version.word_count} | 风格: ${version.style}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 排期信息 -->
        ${result.schedule && result.schedule.success ? `
        <div class="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg">
          <h4 class="font-bold text-gray-800 mb-3">📅 排期信息</h4>
          <div class="space-y-2 text-sm">
            ${result.schedule.ab_test_id ? `
              <div>
                <span class="badge badge-info">A/B测试</span>
                <span class="ml-2 text-gray-600">测试ID: ${result.schedule.ab_test_id}</span>
              </div>
              <div class="mt-2">
                ${result.schedule.tasks.map(task => `
                  <div class="flex justify-between py-1">
                    <span class="text-gray-700">${task.version}</span>
                    <span class="text-gray-500">${task.task_id}</span>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="flex justify-between">
                <span class="text-gray-600">任务ID:</span>
                <span class="font-semibold">${result.schedule.task_id}</span>
              </div>
            `}
            <div class="flex justify-between">
              <span class="text-gray-600">发布时间:</span>
              <span class="font-semibold">${result.schedule.scheduled_time}</span>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- 置信度 -->
        <div class="text-center py-3">
          <div class="text-sm text-gray-600 mb-2">方案置信度</div>
          <div class="text-3xl font-bold text-purple-600">${Utils.formatPercent(result.analysis.confidence_score)}</div>
        </div>
      </div>
    `;

    Utils.showModal('营销方案生成成功 ✨', modalContent);
  },

  // 获取状态徽章样式
  getStatusBadgeClass(status) {
    const classMap = {
      'pending': 'badge-warning',
      'scheduled': 'badge-info',
      'published': 'badge-success',
      'failed': 'badge-error'
    };
    return classMap[status] || 'badge-info';
  },

  // 获取状态文本
  getStatusText(status) {
    const textMap = {
      'pending': '待处理',
      'scheduled': '已排期',
      'published': '已发布',
      'failed': '失败'
    };
    return textMap[status] || status;
  }
};

// ==================== 仪表盘控制器 ====================
const Dashboard = {
  // 初始化仪表盘
  async init() {
    console.log('Marketing Agent Dashboard 初始化中...');
    
    // 绑定事件监听器
    this.bindEvents();
    
    // 加载初始数据
    await this.loadDashboardData();
    
    // 启动定时刷新
    this.startAutoRefresh();
    
    Utils.showNotification('仪表盘加载完成', 'success');
  },

  // 绑定事件
  bindEvents() {
    // 营销指令表单提交
    const instructionForm = document.getElementById('instructionForm');
    if (instructionForm) {
      instructionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitMarketingInstruction();
      });
    }

    // 分析表单提交
    const analysisForm = document.getElementById('analysisForm');
    if (analysisForm) {
      analysisForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.performAnalysis();
      });
    }

    // Tab切换
    const tabButtons = document.querySelectorAll('[data-tab]');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.target.dataset.tab;
        this.switchTab(tab);
      });
    });

    // 模态框关闭
    const modalClose = document.getElementById('modalClose');
    if (modalClose) {
      modalClose.addEventListener('click', () => Utils.closeModal());
    }

    // 刷新按钮
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadDashboardData());
    }
  },

  // 切换Tab
  switchTab(tab) {
    AppState.activeTab = tab;
    
    // 更新按钮状态
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.classList.toggle('bg-purple-600', btn.dataset.tab === tab);
      btn.classList.toggle('text-white', btn.dataset.tab === tab);
      btn.classList.toggle('bg-gray-100', btn.dataset.tab !== tab);
      btn.classList.toggle('text-gray-700', btn.dataset.tab !== tab);
    });
    
    // 显示对应内容
    document.querySelectorAll('[data-content]').forEach(content => {
      content.classList.toggle('hidden', content.dataset.content !== tab);
    });
    
    // 加载对应数据
    switch (tab) {
      case 'dashboard':
        this.loadDashboardData();
        break;
      case 'campaigns':
        this.loadCampaigns();
        break;
      case 'tasks':
        this.loadTasks();
        break;
    }
  },

  // 加载仪表盘数据
  async loadDashboardData() {
    try {
      Utils.showLoading(true);
      const data = await API.generateReport();
      
      if (data.success) {
        Renderer.renderDashboard(data.report);
      }
    } catch (error) {
      console.error('加载仪表盘数据失败:', error);
    } finally {
      Utils.showLoading(false);
    }
  },

  // 提交营销指令
  async submitMarketingInstruction() {
    const form = document.getElementById('instructionForm');
    const formData = new FormData(form);
    
    const instruction = {
      product_name: formData.get('productName'),
      highlights: formData.get('highlights'),
      target_audience: formData.get('targetAudience'),
      publish_time: formData.get('publishTime'),
      product_category: formData.get('productCategory') || '数码产品'
    };

    // 验证必填字段
    if (!instruction.product_name || !instruction.highlights || !instruction.target_audience) {
      Utils.showNotification('请填写完整的产品信息', 'warning');
      return;
    }

    try {
      Utils.showLoading(true);
      Utils.showNotification('正在生成营销方案...', 'info');
      
      const result = await API.submitInstruction(instruction);
      
      if (result.success) {
        Utils.showNotification('营销方案生成成功！', 'success');
        AppState.currentCampaign = result;
        
        // 显示结果
        Renderer.renderCampaignResult(result);
        
        // 重置表单
        form.reset();
        
        // 刷新数据
        await this.loadDashboardData();
      }
    } catch (error) {
      console.error('提交营销指令失败:', error);
    } finally {
      Utils.showLoading(false);
    }
  },

  // 执行分析
  async performAnalysis() {
    const form = document.getElementById('analysisForm');
    const formData = new FormData(form);
    
    const data = {
      target_audience: formData.get('analysisAudience'),
      product_category: formData.get('analysisCategory'),
      analysis_types: ['audience', 'competitor', 'timing']
    };

    try {
      Utils.showLoading(true);
      const result = await API.analyze(data);
      
      if (result.success) {
        Utils.showNotification('分析完成！', 'success');
        this.displayAnalysisResults(result.analysis_results);
      }
    } catch (error) {
      console.error('分析失败:', error);
    } finally {
      Utils.showLoading(false);
    }
  },

  // 显示分析结果
  displayAnalysisResults(results) {
    const content = `
      <div class="space-y-4">
        ${results.audience_insights ? `
          <div class="p-4 bg-purple-50 rounded-lg">
            <h4 class="font-bold mb-2">受众洞察</h4>
            <p class="text-sm text-gray-700">${results.audience_insights.text_analysis}</p>
            <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <span class="text-gray-600">最佳活跃时间:</span>
                <span class="font-semibold ml-2">${results.audience_insights.best_active_time}</span>
              </div>
              <div>
                <span class="text-gray-600">互动率:</span>
                <span class="font-semibold ml-2">${Utils.formatPercent(results.audience_insights.engagement_rate)}</span>
              </div>
            </div>
          </div>
        ` : ''}
        
        ${results.competitor_analysis ? `
          <div class="p-4 bg-blue-50 rounded-lg">
            <h4 class="font-bold mb-2">竞争分析</h4>
            <p class="text-sm text-gray-700">${results.competitor_analysis.recommendation}</p>
          </div>
        ` : ''}
        
        ${results.timing_prediction ? `
          <div class="p-4 bg-green-50 rounded-lg">
            <h4 class="font-bold mb-2">最佳发布时间</h4>
            <p class="text-sm text-gray-700">${results.timing_prediction.recommendation}</p>
          </div>
        ` : ''}
      </div>
    `;
    
    Utils.showModal('分析结果', content);
  },

  // 加载营销活动列表
  async loadCampaigns() {
    try {
      Utils.showLoading(true);
      const data = await API.getCampaigns(20);
      
      if (data.success) {
        AppState.campaigns = data.campaigns;
        const container = document.getElementById('campaignsContent');
        if (container) {
          container.innerHTML = Renderer.renderCampaignList(data.campaigns);
        }
      }
    } catch (error) {
      console.error('加载营销活动失败:', error);
    } finally {
      Utils.showLoading(false);
    }
  },

  // 加载任务列表
  async loadTasks() {
    try {
      Utils.showLoading(true);
      const data = await API.getTasks();
      
      if (data.success) {
        AppState.tasks = data.tasks;
        const container = document.getElementById('tasksContent');
        if (container) {
          container.innerHTML = Renderer.renderTaskList(data.tasks);
        }
      }
    } catch (error) {
      console.error('加载任务列表失败:', error);
    } finally {
      Utils.showLoading(false);
    }
  },

  // 查看活动详情
  viewCampaignDetail(campaignId) {
    const campaign = AppState.campaigns.find(c => c.campaign_id === campaignId);
    if (!campaign) return;
    
    const content = `
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span class="text-gray-600">产品名称:</span>
            <span class="font-semibold ml-2">${campaign.product_name}</span>
          </div>
          <div>
            <span class="text-gray-600">目标受众:</span>
            <span class="font-semibold ml-2">${campaign.target_audience}</span>
          </div>
          <div>
            <span class="text-gray-600">营销主题:</span>
            <span class="font-semibold ml-2">${campaign.theme || '-'}</span>
          </div>
          <div>
            <span class="text-gray-600">状态:</span>
            <span class="badge ${Renderer.getStatusBadgeClass(campaign.status)} ml-2">
              ${Renderer.getStatusText(campaign.status)}
            </span>
          </div>
        </div>
        <div>
          <h4 class="font-semibold mb-2">核心卖点</h4>
          <p class="text-sm text-gray-700">${campaign.highlights}</p>
        </div>
        <div>
          <h4 class="font-semibold mb-2">创建时间</h4>
          <p class="text-sm text-gray-700">${Utils.formatTime(campaign.created_at)}</p>
        </div>
      </div>
    `;
    
    Utils.showModal('活动详情', content);
  },

  // 发布任务
  async publishTask(taskId) {
    if (!confirm('确认发布此任务？')) return;
    
    try {
      Utils.showLoading(true);
      const result = await API.publishTask(taskId);
      
      if (result.success) {
        Utils.showNotification('任务发布成功！', 'success');
        await this.loadTasks();
        await this.loadDashboardData();
      }
    } catch (error) {
      console.error('发布任务失败:', error);
    } finally {
      Utils.showLoading(false);
    }
  },

  // 启动自动刷新
  startAutoRefresh() {
    setInterval(() => {
      if (AppState.activeTab === 'dashboard' && !AppState.isLoading) {
        this.loadDashboardData();
      }
    }, CONFIG.REFRESH_INTERVAL);
  }
};

// ==================== 页面加载完成后初始化 ====================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Dashboard.init());
} else {
  Dashboard.init();
}

// ==================== 导出全局对象 ====================
window.Dashboard = Dashboard;
window.Utils = Utils;
window.API = API;