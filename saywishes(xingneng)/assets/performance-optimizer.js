/**
 * 性能优化脚本 - 基于TOP竞争对手分析的最佳实践
 * 目标：达到95+性能得分
 * 包含：懒加载、预加载、字体优化、第三方脚本延迟等
 * 基于Shopify官方最佳实践和Web性能标准
 * 
 * 功能：
 * 1. 关键资源预加载
 * 2. 懒加载优化
 * 3. Core Web Vitals优化
 * 4. 代码分割和异步加载
 */

(function() {
  'use strict';
  
  // Performance timing marks
  const PerformanceManager = {
    marks: new Map(),
    
    mark(name) {
      if (window.performance && window.performance.mark) {
        window.performance.mark(name);
        this.marks.set(name, Date.now());
      }
    },
    
    measure(name, startMark, endMark) {
      if (window.performance && window.performance.measure) {
        try {
          window.performance.measure(name, startMark, endMark);
        } catch (e) {
          console.warn('Performance measure failed:', e);
        }
      }
    }
  };
  
  // 1. 关键资源预加载管理器
  const ResourcePreloader = {
    preloadedResources: new Set(),
    
    preload(href, as, type = null, crossorigin = false) {
      if (this.preloadedResources.has(href)) return;
      
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = as;
      
      if (type) link.type = type;
      if (crossorigin) link.crossOrigin = 'anonymous';
      
      link.onload = () => {
        PerformanceManager.mark(`preload-${as}-complete`);
      };
      
      link.onerror = () => {
        console.warn(`Failed to preload ${as}:`, href);
      };
      
      document.head.appendChild(link);
      this.preloadedResources.add(href);
    },
    
    preloadCriticalImages() {
      PerformanceManager.mark('preload-images-start');
      
      // 预加载首屏图像
      const criticalSelectors = [
        '.hero img',
        '.banner img',
        '.featured-product img',
        '[data-priority="high"]'
      ];
      
      criticalSelectors.forEach(selector => {
        const images = document.querySelectorAll(selector);
        images.forEach((img, index) => {
          if (index < 3) { // 只预加载前3张关键图像
            const src = img.src || img.dataset.src;
            if (src) {
              this.preload(src, 'image');
            }
          }
        });
      });
      
      PerformanceManager.mark('preload-images-end');
    },
    
    preloadCriticalCSS() {
      // 预加载关键CSS文件
      const criticalCSS = [
        '/assets/component-cart-drawer.css',
        '/assets/component-product-form.css',
        '/assets/section-header.css'
      ];
      
      criticalCSS.forEach(href => {
        this.preload(href, 'style', 'text/css');
      });
    },
    
    preloadJavaScript() {
      // 预加载关键JavaScript文件
      const criticalJS = [
        '/assets/cart.js',
        '/assets/product-form.js'
      ];
      
      criticalJS.forEach(href => {
        this.preload(href, 'script', 'application/javascript');
      });
    }
  };
  
  // 2. 增强懒加载管理器
  const LazyLoadManager = {
    imageObserver: null,
    sectionObserver: null,
    
    init() {
      this.initImageLazyLoading();
      this.initSectionLazyLoading();
    },
    
    initImageLazyLoading() {
      if (!('IntersectionObserver' in window)) {
        // Fallback for older browsers
        this.loadAllImages();
        return;
      }
      
      this.imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadImage(entry.target);
            this.imageObserver.unobserve(entry.target);
          }
        });
      }, {
        rootMargin: '50px 0px',
        threshold: 0.01
      });
      
      // 观察所有懒加载图像
      document.querySelectorAll('img[data-src], img[loading="lazy"]').forEach(img => {
        this.imageObserver.observe(img);
      });
    },
    
    loadImage(img) {
      return new Promise((resolve, reject) => {
        const src = img.dataset.src || img.src;
        if (!src) {
          resolve();
          return;
        }
        
        const newImg = new Image();
        newImg.onload = () => {
          img.src = src;
          img.classList.add('loaded');
          img.removeAttribute('data-src');
          PerformanceManager.mark(`image-loaded-${src.split('/').pop()}`);
          resolve();
        };
        
        newImg.onerror = reject;
        newImg.src = src;
      });
    },
    
    initSectionLazyLoading() {
      this.sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadSection(entry.target);
            this.sectionObserver.unobserve(entry.target);
          }
        });
      }, {
        rootMargin: '100px 0px'
      });
      
      // 观察延迟加载的section
      document.querySelectorAll('[data-lazy-section]').forEach(section => {
        this.sectionObserver.observe(section);
      });
    },
    
    loadSection(section) {
      const sectionId = section.dataset.sectionId;
      if (sectionId) {
        // 动态加载section特定的CSS和JS
        this.loadSectionAssets(sectionId);
      }
    },
    
    loadSectionAssets(sectionId) {
      const cssPath = `/assets/section-${sectionId}.css`;
      const jsPath = `/assets/section-${sectionId}.js`;
      
      // 检查CSS是否已加载
      if (!document.querySelector(`link[href="${cssPath}"]`)) {
        ResourcePreloader.preload(cssPath, 'style', 'text/css');
      }
      
      // 检查JS是否已加载
      if (!document.querySelector(`script[src="${jsPath}"]`)) {
        const script = document.createElement('script');
        script.src = jsPath;
        script.defer = true;
        document.head.appendChild(script);
      }
    },
    
    loadAllImages() {
      // Fallback for browsers without IntersectionObserver
      document.querySelectorAll('img[data-src]').forEach(img => {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      });
    }
  };
  
  // 3. Core Web Vitals优化
  const CoreWebVitalsOptimizer = {
    init() {
      this.optimizeLCP();
      this.optimizeFID();
      this.optimizeCLS();
    },
    
    optimizeLCP() {
      // Largest Contentful Paint优化
      PerformanceManager.mark('lcp-optimization-start');
      
      // 预加载LCP元素
      const lcpCandidates = document.querySelectorAll('.hero img, .banner img, h1');
      lcpCandidates.forEach(element => {
        if (element.tagName === 'IMG') {
          element.style.priority = 'high';
          ResourcePreloader.preload(element.src || element.dataset.src, 'image');
        }
      });
      
      // 优化字体加载
      this.optimizeFontLoading();
    },
    
    optimizeFID() {
      // First Input Delay优化
      // 延迟非关键JavaScript执行
      this.deferNonCriticalScripts();
      
      // 分解长任务
      this.breakUpLongTasks();
    },
    
    optimizeCLS() {
      // Cumulative Layout Shift优化
      // 为图像设置尺寸
      this.setImageDimensions();
      
      // 预留广告空间
      this.reserveAdSpace();
    },
    
    optimizeFontLoading() {
      // 使用font-display: swap优化字体加载
      const style = document.createElement('style');
      style.textContent = `
        @font-face {
          font-display: swap;
        }
      `;
      document.head.appendChild(style);
      
      // 预加载关键字体
      document.fonts.ready.then(() => {
        PerformanceManager.mark('fonts-loaded');
      });
    },
    
    deferNonCriticalScripts() {
      // 识别并延迟非关键脚本
      const nonCriticalSelectors = [
        'script[src*="analytics"]',
        'script[src*="tracking"]',
        'script[src*="social"]'
      ];
      
      nonCriticalSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(script => {
          if (!script.defer && !script.async) {
            script.defer = true;
          }
        });
      });
    },
    
    breakUpLongTasks() {
      // 使用MessageChannel分解长任务
      if ('MessageChannel' in window) {
        const channel = new MessageChannel();
        const { port1, port2 } = channel;
        
        window.yieldToMain = function(fn) {
          return new Promise(resolve => {
            port2.onmessage = () => {
              resolve(fn());
            };
            port1.postMessage(null);
          });
        };
      }
    },
    
    setImageDimensions() {
      // 为没有尺寸的图像设置默认尺寸
      document.querySelectorAll('img:not([width]):not([height])').forEach(img => {
        // 基于图像的aspect-ratio或默认值设置尺寸
        const aspectRatio = img.dataset.aspectRatio || '1';
        if (aspectRatio) {
          img.style.aspectRatio = aspectRatio;
        }
      });
    },
    
    reserveAdSpace() {
      // 为动态内容预留空间
      document.querySelectorAll('[data-dynamic-content]').forEach(element => {
        const minHeight = element.dataset.minHeight || '200px';
        element.style.minHeight = minHeight;
      });
    }
  };
  
  // 4. 代码分割和模块加载管理器
  const ModuleManager = {
    loadedModules: new Set(),
    
    async loadModule(moduleName, condition = true) {
      if (!condition || this.loadedModules.has(moduleName)) {
        return;
      }
      
      try {
        PerformanceManager.mark(`module-${moduleName}-start`);
        
        const module = await import(`/assets/${moduleName}.js`);
        this.loadedModules.add(moduleName);
        
        PerformanceManager.mark(`module-${moduleName}-end`);
        PerformanceManager.measure(`module-${moduleName}-load`, `module-${moduleName}-start`, `module-${moduleName}-end`);
        
        return module;
      } catch (error) {
        console.warn(`Failed to load module ${moduleName}:`, error);
      }
    },
    
    // 条件性加载模块
    loadCartModule() {
      const hasCart = document.querySelector('cart-drawer, cart-notification');
      return this.loadModule('cart-enhanced', !!hasCart);
    },
    
    loadProductModule() {
      const hasProductForm = document.querySelector('product-form');
      return this.loadModule('product-enhanced', !!hasProductForm);
    },
    
    loadSearchModule() {
      const hasSearch = document.querySelector('[data-predictive-search]');
      return this.loadModule('search-enhanced', !!hasSearch);
    }
  };
  
  // 5. 性能监控和报告
  const PerformanceMonitor = {
    metrics: {},
    
    init() {
      this.collectWebVitals();
      this.monitorResourceLoading();
      this.reportMetrics();
    },
    
    collectWebVitals() {
      // 收集Core Web Vitals
      if ('PerformanceObserver' in window) {
        // LCP
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.lcp = lastEntry.startTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // FID
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            this.metrics.fid = entry.processingStart - entry.startTime;
          });
        }).observe({ entryTypes: ['first-input'] });
        
        // CLS
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          this.metrics.cls = clsValue;
        }).observe({ entryTypes: ['layout-shift'] });
      }
    },
    
    monitorResourceLoading() {
      if ('PerformanceObserver' in window) {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.initiatorType === 'img') {
              const loadTime = entry.responseEnd - entry.startTime;
              this.metrics.avgImageLoadTime = (this.metrics.avgImageLoadTime || 0 + loadTime) / 2;
            }
          });
        }).observe({ entryTypes: ['resource'] });
      }
    },
    
    reportMetrics() {
      // 延迟报告以确保准确性
      setTimeout(() => {
        if (window.gtag) {
          // 发送到Google Analytics
          gtag('event', 'web_vitals', {
            event_category: 'Performance',
            lcp: this.metrics.lcp,
            fid: this.metrics.fid,
            cls: this.metrics.cls
          });
        }
        
        // 发送到console用于调试
        console.log('Performance Metrics:', this.metrics);
      }, 3000);
    }
  };
  
  // 初始化所有优化模块
  function initializePerformanceOptimizations() {
    PerformanceManager.mark('performance-optimization-start');
    
    // 立即执行关键优化
    ResourcePreloader.preloadCriticalImages();
    ResourcePreloader.preloadCriticalCSS();
    
    // DOM Ready后执行
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        LazyLoadManager.init();
        CoreWebVitalsOptimizer.init();
        PerformanceMonitor.init();
        
        // 条件性加载模块
        ModuleManager.loadCartModule();
        ModuleManager.loadProductModule();
        ModuleManager.loadSearchModule();
      });
    } else {
      LazyLoadManager.init();
      CoreWebVitalsOptimizer.init();
      PerformanceMonitor.init();
      
      ModuleManager.loadCartModule();
      ModuleManager.loadProductModule();
      ModuleManager.loadSearchModule();
    }
    
    // Window Load后执行非关键优化
    window.addEventListener('load', () => {
      PerformanceManager.mark('performance-optimization-complete');
      ResourcePreloader.preloadJavaScript();
    });
  }
  
  // 启动性能优化
  initializePerformanceOptimizations();
  
  // 暴露给全局作为调试接口
  window.PerformanceOptimizer = {
    ResourcePreloader,
    LazyLoadManager,
    CoreWebVitalsOptimizer,
    ModuleManager,
    PerformanceMonitor,
    PerformanceManager
  };
  
})();