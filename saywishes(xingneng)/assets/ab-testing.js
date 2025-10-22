/**
 * SayWishes A/B Testing System
 * 专为 wishesvideo.com 定制的 A/B 测试系统
 * 
 * 功能特性:
 * - 随机分配用户到不同版本
 * - 本地存储用户版本信息
 * - Google Analytics 事件跟踪
 * - 转化率数据收集
 */

class ABTest {
  constructor() {
    this.storageKey = 'saywishes_ab_test';
    this.version = this.getUserVersion();
    this.init();
  }

  /**
   * 初始化 A/B 测试系统
   */
  init() {
    // 确保用户版本已分配
    if (!this.version) {
      this.version = this.assignVersion();
      this.saveUserVersion(this.version);
    }

    // 设置全局变量供其他脚本使用
    window.ABTest = this;
    
    // 记录页面访问事件
    this.trackEvent('page_view', {
      version: this.version,
      page: window.location.pathname
    });

    // 监听 DOM 加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.onDOMReady());
    } else {
      this.onDOMReady();
    }
  }

  /**
   * DOM 加载完成后的处理
   */
  onDOMReady() {
    // 为所有 A/B 测试按钮添加点击跟踪
    this.setupButtonTracking();
    
    // 设置版本指示器（仅在开发模式下显示）
    if (this.isDevelopmentMode()) {
      this.showVersionIndicator();
    }
  }

  /**
   * 随机分配用户版本
   * @returns {string} 'A' 或 'B'
   */
  assignVersion() {
    return Math.random() < 0.5 ? 'A' : 'B';
  }

  /**
   * 获取用户当前版本
   * @returns {string|null} 用户版本或 null
   */
  getUserVersion() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        // 检查版本是否在24小时内分配（可选的过期机制）
        const now = new Date().getTime();
        const assignedTime = data.timestamp || 0;
        const hoursSinceAssigned = (now - assignedTime) / (1000 * 60 * 60);
        
        // 如果超过24小时，重新分配版本（可根据需要调整）
        if (hoursSinceAssigned > 24) {
          this.clearUserVersion();
          return null;
        }
        
        return data.version;
      }
    } catch (error) {
      console.warn('SayWishes A/B Test: Error reading user version from localStorage', error);
    }
    return null;
  }

  /**
   * 保存用户版本到本地存储
   * @param {string} version 用户版本
   */
  saveUserVersion(version) {
    try {
      const data = {
        version: version,
        timestamp: new Date().getTime(),
        sessionId: this.generateSessionId()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('SayWishes A/B Test: Error saving user version to localStorage', error);
    }
  }

  /**
   * 清除用户版本信息
   */
  clearUserVersion() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn('SayWishes A/B Test: Error clearing user version from localStorage', error);
    }
  }

  /**
   * 生成会话ID
   * @returns {string} 会话ID
   */
  generateSessionId() {
    return 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  /**
   * 跟踪事件到 Google Analytics
   * @param {string} eventName 事件名称
   * @param {object} eventData 事件数据
   */
  trackEvent(eventName, eventData = {}) {
    const data = {
      event_category: 'AB_Test',
      event_label: `Version_${this.version}`,
      version: this.version,
      ...eventData
    };

    // 发送到 Google Analytics (gtag)
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, data);
    }

    // 发送到 Google Analytics (ga)
    if (typeof ga !== 'undefined') {
      ga('send', 'event', 'AB_Test', eventName, `Version_${this.version}`, eventData.value || 1);
    }

    // 发送到 Facebook Pixel
    if (typeof fbq !== 'undefined') {
      fbq('trackCustom', `ABTest_${eventName}`, {
        version: this.version,
        ...eventData
      });
    }

    // 控制台日志（开发模式）
    if (this.isDevelopmentMode()) {
      console.log('SayWishes A/B Test Event:', eventName, data);
    }
  }

  /**
   * 设置按钮点击跟踪
   */
  setupButtonTracking() {
    // 跟踪所有 A/B 测试相关的按钮点击
    const buttons = document.querySelectorAll('.hero-banner__button, .btn--primary, [data-ab-track="button"]');
    
    buttons.forEach(button => {
      button.addEventListener('click', (event) => {
        const buttonText = button.textContent.trim();
        const buttonHref = button.href || button.getAttribute('data-href') || '#';
        
        this.trackEvent('button_click', {
          button_text: buttonText,
          button_href: buttonHref,
          section: 'hero_banner'
        });
      });
    });

    // 跟踪英雄区域的曝光
    const heroSections = document.querySelectorAll('.hero-banner, [data-ab-track="hero"]');
    heroSections.forEach(section => {
      this.trackSectionView(section, 'hero_section');
    });
  }

  /**
   * 跟踪区域曝光
   * @param {Element} element 要跟踪的元素
   * @param {string} sectionName 区域名称
   */
  trackSectionView(element, sectionName) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.trackEvent('section_view', {
            section: sectionName,
            visibility_ratio: entry.intersectionRatio
          });
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.5 // 当50%的元素可见时触发
    });

    observer.observe(element);
  }

  /**
   * 跟踪转化事件
   * @param {string} conversionType 转化类型
   * @param {object} conversionData 转化数据
   */
  trackConversion(conversionType, conversionData = {}) {
    this.trackEvent('conversion', {
      conversion_type: conversionType,
      ...conversionData
    });
  }

  /**
   * 检查是否为开发模式
   * @returns {boolean} 是否为开发模式
   */
  isDevelopmentMode() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname.includes('127.0.0.1') ||
           window.location.search.includes('ab_debug=true') ||
           localStorage.getItem('ab_debug') === 'true';
  }

  /**
   * 显示版本指示器（仅开发模式）
   */
  showVersionIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'ab-version-indicator';
    indicator.innerHTML = `
      <div style="
        position: fixed;
        top: 10px;
        right: 10px;
        background: ${this.version === 'A' ? '#ff6b6b' : '#4ecdc4'};
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-family: Arial, sans-serif;
        font-size: 12px;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      ">
        A/B Test: Version ${this.version}
      </div>
    `;
    document.body.appendChild(indicator);
  }

  /**
   * 获取当前用户版本
   * @returns {string} 当前版本
   */
  getVersion() {
    return this.version;
  }

  /**
   * 强制设置用户版本（仅用于测试）
   * @param {string} version 要设置的版本
   */
  setVersion(version) {
    if (version === 'A' || version === 'B') {
      this.version = version;
      this.saveUserVersion(version);
      
      if (this.isDevelopmentMode()) {
        console.log(`SayWishes A/B Test: Version manually set to ${version}`);
      }
    }
  }

  /**
   * 重置 A/B 测试（清除用户数据并重新分配）
   */
  reset() {
    this.clearUserVersion();
    this.version = this.assignVersion();
    this.saveUserVersion(this.version);
    
    if (this.isDevelopmentMode()) {
      console.log(`SayWishes A/B Test: Reset to version ${this.version}`);
    }
  }
}

// 自动初始化 A/B 测试系统
document.addEventListener('DOMContentLoaded', function() {
  window.sayWishesABTest = new ABTest();
});

// 如果 DOM 已经加载完成，立即初始化
if (document.readyState !== 'loading') {
  window.sayWishesABTest = new ABTest();
}

// 导出供其他脚本使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ABTest;
}