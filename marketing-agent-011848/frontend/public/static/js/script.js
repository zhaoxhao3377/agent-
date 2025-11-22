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
  },

  // 获取实时数据摘要和成功案例
  async getSummary() {
    return this.request('/summary');
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
  },

  // 渲染滚动展示区域（增强版）
  renderSummaryScroller(data) {
    const container = document.getElementById('summaryScroller');
    if (!container) return;

    const stats = data.real_time_stats || {};
    const cases = data.success_cases || [];

    // 渲染实时统计数据（优化布局和动画）
    const statsHTML = `
      <div class="flex flex-wrap items-center gap-4 px-6 py-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl border border-primary-200 animate-fadeIn">
        <div class="flex items-center space-x-2 min-w-[180px]">
          <div class="p-2 bg-primary-200 rounded-lg">
            <svg class="w-5 h-5 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div>
            <div class="text-xs text-gray-600">本月已发布</div>
            <div class="flex items-baseline space-x-1">
              <span class="text-xl font-bold text-primary-600">${stats.monthly_published || 0}</span>
              <span class="text-xs text-gray-600">篇内容</span>
            </div>
          </div>
        </div>
        
        <div class="h-12 w-px bg-gray-300 hidden md:block"></div>
        
        <div class="flex items-center space-x-2 min-w-[160px]">
          <div class="p-2 bg-accent-200 rounded-lg">
            <svg class="w-5 h-5 text-accent-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
            </svg>
          </div>
          <div>
            <div class="text-xs text-gray-600">活跃活动</div>
            <div class="flex items-baseline space-x-1">
              <span class="text-xl font-bold text-accent-600">${stats.active_campaigns || 0}</span>
              <span class="text-xs text-gray-600">个</span>
            </div>
          </div>
        </div>
        
        <div class="h-12 w-px bg-gray-300 hidden md:block"></div>
        
        <div class="flex items-center space-x-2 min-w-[180px]">
          <div class="p-2 bg-blue-200 rounded-lg">
            <svg class="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
          </div>
          <div>
            <div class="text-xs text-gray-600">总触达</div>
            <div class="flex items-baseline space-x-1">
              <span class="text-xl font-bold text-blue-600">${Utils.formatNumber(stats.total_reach || 0)}</span>
              <span class="text-xs text-gray-600">人次</span>
            </div>
          </div>
        </div>
        
        <div class="h-12 w-px bg-gray-300 hidden md:block"></div>
        
        <div class="flex items-center space-x-2 min-w-[160px]">
          <div class="p-2 bg-green-200 rounded-lg">
            <svg class="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
            </svg>
          </div>
          <div>
            <div class="text-xs text-gray-600">平均互动率</div>
            <div class="text-xl font-bold text-green-600">${Utils.formatPercent(stats.avg_engagement || 0)}</div>
          </div>
        </div>
      </div>
    `;

    // 渲染成功案例轮播（优化交互和视觉效果）
    const casesHTML = cases.length > 0 ? `
      <div class="mt-4 relative overflow-hidden rounded-xl animate-fadeIn" style="animation-delay: 0.2s;">
        <div class="flex items-center justify-between mb-3 px-2">
          <h4 class="text-sm font-bold text-gray-800 flex items-center">
            <div class="p-1.5 bg-accent-100 rounded-lg mr-2">
              <svg class="w-4 h-4 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
              </svg>
            </div>
            成功案例精选
          </h4>
          <div class="flex items-center space-x-2">
            <button id="casePrev" class="p-1.5 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95">
              <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
              </svg>
            </button>
            <span class="text-xs text-gray-500 font-medium" id="carouselCounter">1/${cases.length}</span>
            <button id="caseNext" class="p-1.5 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95">
              <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
          </div>
        </div>
        <div id="casesCarousel" class="flex transition-transform duration-500 ease-in-out">
          ${cases.map(caseItem => `
            <div class="min-w-full px-2">
              <div class="bg-gradient-to-br from-white to-gray-50 rounded-xl p-5 border border-gray-200 hover:border-primary-300 transition-all duration-300 hover:shadow-xl cursor-pointer group">
                <div class="flex justify-between items-start mb-3">
                  <div class="flex-1">
                    <h5 class="font-bold text-gray-800 mb-1 text-base group-hover:text-primary-600 transition-colors">${caseItem.title}</h5>
                    <p class="text-sm text-gray-600 leading-relaxed">${caseItem.description}</p>
                  </div>
                  <span class="px-3 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full ml-3 whitespace-nowrap group-hover:bg-primary-200 transition-colors">
                    ${caseItem.category}
                  </span>
                </div>
                <div class="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-200">
                  ${Object.entries(caseItem.metrics).map(([key, value]) => `
                    <div class="text-center p-2 rounded-lg bg-gradient-to-br from-gray-50 to-white group-hover:from-primary-50 group-hover:to-white transition-all">
                      <div class="text-lg font-bold text-accent-600">${value}</div>
                      <div class="text-xs text-gray-500 mt-0.5">${this.getMetricLabel(key)}</div>
                    </div>
                  `).join('')}
                </div>
                <div class="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
                  <div class="flex items-center space-x-2 text-xs text-gray-500">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <span>${caseItem.timestamp}</span>
                  </div>
                  <div class="flex items-center space-x-1 text-xs text-gray-500">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                    </svg>
                    <span>${caseItem.platform}</span>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="flex justify-center mt-3 space-x-2">
          ${cases.map((_, index) => `
            <div class="case-indicator w-2 h-2 rounded-full bg-gray-300 transition-all duration-300 cursor-pointer hover:bg-gray-400" data-index="${index}"></div>
          `).join('')}
        </div>
      </div>
    ` : '';

    container.innerHTML = statsHTML + casesHTML;

    // 初始化轮播功能
    if (cases.length > 0) {
      this.initCaseCarousel(cases.length);
    }
  },

  // 获取指标标签
  getMetricLabel(key) {
    const labels = {
      'engagement_increase': '互动提升',
      'conversion_rate': '转化率',
      'reach': '触达',
      'click_increase': '点击提升',
      'roi': '投资回报',
      'sales': '销售额',
      'interactions': '互动量',
      'engagement_rate': '互动率',
      'repurchase_increase': '复购提升',
      'member_growth': '会员增长'
    };
    return labels[key] || key;
  },

  // 初始化案例轮播（增强版）
  initCaseCarousel(totalCases) {
    let currentIndex = 0;
    let autoPlayInterval = null;
    const carousel = document.getElementById('casesCarousel');
    const indicators = document.querySelectorAll('.case-indicator');
    const prevBtn = document.getElementById('casePrev');
    const nextBtn = document.getElementById('caseNext');
    const counter = document.getElementById('carouselCounter');

    const updateCarousel = (index) => {
      currentIndex = (index + totalCases) % totalCases;
      
      if (carousel) {
        carousel.style.transform = `translateX(-${currentIndex * 100}%)`;
      }
      
      // 更新计数器
      if (counter) {
        counter.textContent = `${currentIndex + 1}/${totalCases}`;
      }
      
      // 更新指示器
      indicators.forEach((indicator, i) => {
        if (i === currentIndex) {
          indicator.classList.add('bg-primary-600', 'w-6');
          indicator.classList.remove('bg-gray-300', 'w-2');
        } else {
          indicator.classList.remove('bg-primary-600', 'w-6');
          indicator.classList.add('bg-gray-300', 'w-2');
        }
      });
    };

    // 开始自动轮播
    const startAutoPlay = () => {
      stopAutoPlay();
      autoPlayInterval = setInterval(() => {
        updateCarousel(currentIndex + 1);
      }, 8000);
    };

    // 停止自动轮播
    const stopAutoPlay = () => {
      if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
      }
    };

    // 按钮事件
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        stopAutoPlay();
        updateCarousel(currentIndex - 1);
        startAutoPlay();
      });
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        stopAutoPlay();
        updateCarousel(currentIndex + 1);
        startAutoPlay();
      });
    }

    // 指示器点击
    indicators.forEach((indicator, index) => {
      indicator.addEventListener('click', () => {
        stopAutoPlay();
        updateCarousel(index);
        startAutoPlay();
      });
    });

    // 鼠标悬停时暂停自动播放
    if (carousel) {
      carousel.addEventListener('mouseenter', stopAutoPlay);
      carousel.addEventListener('mouseleave', startAutoPlay);
    }

    // 初始化
    updateCarousel(0);
    startAutoPlay();
  }
};

// ==================== 仪表盘控制器 ====================
const Dashboard = {
  // 初始化仪表盘
  async init() {
    console.log('='.repeat(60));
    console.log('Marketing Agent Dashboard 初始化中...');
    console.log('当前时间:', new Date().toLocaleString());
    console.log('='.repeat(60));
    
    // 绑定事件监听器
    console.log('步骤 1/4: 绑定事件监听器...');
    this.bindEvents();
    console.log('✓ 事件绑定完成');
    
    // 加载初始数据
    console.log('步骤 2/4: 加载仪表盘数据...');
    await this.loadDashboardData();
    console.log('✓ 仪表盘数据加载完成');
    
    // 加载滚动展示区域数据
    console.log('步骤 3/4: 加载实时数据看板...');
    await this.loadSummaryData();
    console.log('✓ 实时数据看板加载完成');
    
    // 启动定时刷新
    console.log('步骤 4/4: 启动自动刷新...');
    this.startAutoRefresh();
    console.log('✓ 自动刷新已启动');
    
    console.log('='.repeat(60));
    console.log('✓ 仪表盘初始化完成！');
    console.log('='.repeat(60));
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

    // 分析维度复选框点击反馈
    const dimensionCheckboxes = document.querySelectorAll('#analysisDimensions input[type="checkbox"]');
    dimensionCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', function() {
        const label = this.closest('.analysis-dimension-item');
        if (this.checked) {
          label.classList.add('bg-primary-50', 'border-primary-300', 'shadow-sm');
          label.classList.remove('bg-white');
          // 添加动画效果
          label.style.transform = 'scale(1.02)';
          setTimeout(() => {
            label.style.transform = 'scale(1)';
          }, 200);
        } else {
          label.classList.remove('bg-primary-50', 'border-primary-300', 'shadow-sm');
          label.classList.add('bg-white');
        }
      });
      
      // 初始化已选中项的样式
      if (checkbox.checked) {
        const label = checkbox.closest('.analysis-dimension-item');
        label.classList.add('bg-primary-50', 'border-primary-300', 'shadow-sm');
        label.classList.remove('bg-white');
      }
    });

    // Tab切换 - 增强版：添加更详细的日志和错误处理
    const tabButtons = document.querySelectorAll('[data-tab]');
    console.log(`找到 ${tabButtons.length} 个Tab按钮`);
    
    tabButtons.forEach((btn, index) => {
      const tabName = btn.getAttribute('data-tab');
      console.log(`绑定Tab按钮 #${index + 1}: ${tabName}`);
      
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 使用closest获取最近的带data-tab属性的元素
        const targetBtn = e.target.closest('[data-tab]');
        if (targetBtn) {
          const tab = targetBtn.getAttribute('data-tab');
          console.log(`点击Tab按钮: ${tab}`);
          try {
            this.switchTab(tab);
          } catch (error) {
            console.error(`切换Tab失败: ${tab}`, error);
            Utils.showNotification(`切换标签页失败: ${error.message}`, 'error');
          }
        } else {
          console.warn('未找到Tab按钮元素');
        }
      });
    });

    // 模态框关闭 - 增强版
    const modalClose = document.getElementById('modalClose');
    if (modalClose) {
      console.log('绑定模态框关闭按钮');
      modalClose.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('点击关闭模态框');
        Utils.closeModal();
      });
    } else {
      console.warn('未找到模态框关闭按钮');
    }
    
    // 模态框背景点击关闭
    const modal = document.getElementById('mainModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          console.log('点击背景关闭模态框');
          Utils.closeModal();
        }
      });
    }

    // 刷新按钮 - 添加防抖和反馈
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      console.log('绑定刷新按钮事件');
      refreshBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log('点击刷新按钮');
        
        if (AppState.isLoading) {
          console.log('正在加载中，忽略点击');
          return;
        }
        
        Utils.showNotification('正在刷新数据...', 'info');
        await this.loadDashboardData();
        await this.loadSummaryData();
      });
    } else {
      console.warn('未找到刷新按钮元素');
    }
  },

  // 切换Tab
  switchTab(tab) {
    // 验证tab参数
    if (!tab) {
      console.warn('switchTab: tab参数为空');
      return;
    }
    
    AppState.activeTab = tab;
    console.log(`切换到标签页: ${tab}`);
    
    // 更新按钮状态 - 优化：先移除所有状态，再添加激活状态
    document.querySelectorAll('[data-tab]').forEach(btn => {
      const btnTab = btn.getAttribute('data-tab');
      const isActive = btnTab === tab;
      
      // 移除所有可能的激活状态类
      btn.classList.remove(
        'bg-gradient-to-r', 'from-primary-500', 'to-primary-600', 
        'text-white', 'shadow-lg', 'shadow-primary-500/30'
      );
      
      // 添加默认状态
      btn.classList.add('bg-gray-50', 'text-gray-700');
      
      if (isActive) {
        // 移除默认状态，添加激活状态
        btn.classList.remove('bg-gray-50', 'text-gray-700');
        btn.classList.add(
          'bg-gradient-to-r', 'from-primary-500', 'to-primary-600', 
          'text-white', 'shadow-lg', 'shadow-primary-500/30'
        );
      }
    });
    
    // 显示对应内容
    document.querySelectorAll('[data-content]').forEach(content => {
      const isCurrentContent = content.getAttribute('data-content') === tab;
      if (isCurrentContent) {
        content.classList.remove('hidden');
      } else {
        content.classList.add('hidden');
      }
    });
    
    // 加载对应数据
    switch (tab) {
      case 'dashboard':
        this.loadDashboardData();
        this.loadSummaryData();
        break;
      case 'instruction':
        // 营销指令页面不需要额外加载
        break;
      case 'analysis':
        // 分析页面不需要额外加载
        break;
      case 'campaigns':
        this.loadCampaigns();
        break;
      case 'tasks':
        this.loadTasks();
        break;
      default:
        console.warn(`未知的标签页: ${tab}`);
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
    
    // 收集选中的分析维度
    const selectedDimensions = [];
    const checkboxes = document.querySelectorAll('#analysisDimensions input[type="checkbox"]:checked');
    checkboxes.forEach(cb => {
      selectedDimensions.push(cb.value);
    });
    
    // 至少选择一个维度
    if (selectedDimensions.length === 0) {
      Utils.showNotification('请至少选择一个分析维度', 'warning');
      return;
    }
    
    const data = {
      target_audience: formData.get('analysisAudience'),
      product_category: formData.get('analysisCategory'),
      analysis_types: selectedDimensions
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
            <p class="text-sm text-gray-700">${results.audience_insights.text_analysis || results.audience_insights.analysis_text || '暂无分析数据'}</p>
            <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <span class="text-gray-600">最佳活跃时间:</span>
                <span class="font-semibold ml-2">${results.audience_insights.best_active_time || '-'}</span>
              </div>
              <div>
                <span class="text-gray-600">互动率:</span>
                <span class="font-semibold ml-2">${results.audience_insights.engagement_rate ? Utils.formatPercent(results.audience_insights.engagement_rate) : '-'}</span>
              </div>
            </div>
          </div>
        ` : ''}
        
        ${results.competitor_analysis ? `
          <div class="p-4 bg-blue-50 rounded-lg">
            <h4 class="font-bold mb-2">竞争分析</h4>
            <p class="text-sm text-gray-700">${results.competitor_analysis.analysis_text || results.competitor_analysis.recommendation || '暂无分析数据'}</p>
            ${results.competitor_analysis.market_opportunity ? `
              <div class="mt-3 text-sm">
                <span class="text-gray-600">市场机会:</span>
                <span class="font-semibold ml-2">${results.competitor_analysis.market_opportunity}</span>
              </div>
            ` : ''}
          </div>
        ` : ''}
        
        ${results.timing_prediction ? `
          <div class="p-4 bg-green-50 rounded-lg">
            <h4 class="font-bold mb-2">最佳发布时间</h4>
            <p class="text-sm text-gray-700">${results.timing_prediction.analysis || results.timing_prediction.recommendation || '暂无分析数据'}</p>
            ${results.timing_prediction.best_time ? `
              <div class="mt-3 text-sm">
                <span class="text-gray-600">推荐时间:</span>
                <span class="font-semibold ml-2">${results.timing_prediction.best_time}</span>
              </div>
            ` : ''}
          </div>
        ` : ''}
        
        ${results.sentiment_trend ? `
          <div class="p-4 bg-pink-50 rounded-lg">
            <h4 class="font-bold mb-2">情感趋势分析</h4>
            <p class="text-sm text-gray-700">${results.sentiment_trend.analysis_text || '暂无分析数据'}</p>
            <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <span class="text-gray-600">整体趋势:</span>
                <span class="font-semibold ml-2">${results.sentiment_trend.overall_trend || '-'}</span>
              </div>
              <div>
                <span class="text-gray-600">情感评分:</span>
                <span class="font-semibold ml-2">${results.sentiment_trend.sentiment_score || '-'}</span>
              </div>
            </div>
          </div>
        ` : ''}
        
        ${results.content_evaluation ? `
          <div class="p-4 bg-yellow-50 rounded-lg">
            <h4 class="font-bold mb-2">内容效果评估</h4>
            <p class="text-sm text-gray-700">${results.content_evaluation.analysis_text || results.content_evaluation.recommendation || '暂无分析数据'}</p>
            ${results.content_evaluation.best_performer ? `
              <div class="mt-3 text-sm">
                <span class="text-gray-600">表现最佳内容类型:</span>
                <span class="font-semibold ml-2">${results.content_evaluation.best_performer}</span>
              </div>
            ` : ''}
          </div>
        ` : ''}
        
        ${results.channel_comparison ? `
          <div class="p-4 bg-teal-50 rounded-lg">
            <h4 class="font-bold mb-2">渠道表现对比</h4>
            <p class="text-sm text-gray-700">${results.channel_comparison.analysis_text || results.channel_comparison.recommendation || '暂无分析数据'}</p>
            ${results.channel_comparison.best_channel ? `
              <div class="mt-3 text-sm">
                <span class="text-gray-600">最佳渠道:</span>
                <span class="font-semibold ml-2">${results.channel_comparison.best_channel}</span>
              </div>
            ` : ''}
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
    console.log(`查看活动详情: ${campaignId}`);
    const campaign = AppState.campaigns.find(c => c.campaign_id === campaignId);
    if (!campaign) {
      console.warn(`未找到活动: ${campaignId}`);
      Utils.showNotification('活动不存在', 'warning');
      return;
    }
    
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
    console.log(`准备发布任务: ${taskId}`);
    if (!confirm('确认发布此任务？')) {
      console.log('用户取消发布');
      return;
    }
    
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

  // 加载摘要数据（增强版）
  async loadSummaryData() {
    try {
      const container = document.getElementById('summaryScroller');
      if (!container) return;
      
      // 显示加载状态
      container.innerHTML = `
        <div class="flex items-center justify-center py-8 animate-pulse">
          <div class="text-center">
            <div class="spinner mx-auto mb-3 border-primary-500"></div>
            <p class="text-sm text-gray-500">加载实时数据中...</p>
          </div>
        </div>
      `;
      
      const data = await API.getSummary();
      
      if (data.success) {
        Renderer.renderSummaryScroller(data);
        
        // 添加成功加载动画
        setTimeout(() => {
          const elements = container.querySelectorAll('.animate-fadeIn');
          elements.forEach((el, index) => {
            el.style.animationDelay = `${index * 0.1}s`;
          });
        }, 50);
      } else {
        // 显示错误状态
        container.innerHTML = `
          <div class="flex items-center justify-center py-8">
            <div class="text-center">
              <svg class="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <p class="text-sm text-gray-500">加载数据失败，请稍后重试</p>
              <button onclick="Dashboard.loadSummaryData()" class="mt-3 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition-colors">
                重新加载
              </button>
            </div>
          </div>
        `;
      }
    } catch (error) {
      console.error('加载摘要数据失败:', error);
      
      // 显示错误状态
      const container = document.getElementById('summaryScroller');
      if (container) {
        container.innerHTML = `
          <div class="flex items-center justify-center py-8">
            <div class="text-center">
              <svg class="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <p class="text-sm text-gray-600 mb-1">加载失败</p>
              <p class="text-xs text-gray-500">${error.message}</p>
              <button onclick="Dashboard.loadSummaryData()" class="mt-3 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition-colors">
                重新加载
              </button>
            </div>
          </div>
        `;
      }
    }
  },

  // 启动自动刷新
  startAutoRefresh() {
    setInterval(() => {
      if (AppState.activeTab === 'dashboard' && !AppState.isLoading) {
        this.loadDashboardData();
        this.loadSummaryData();
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