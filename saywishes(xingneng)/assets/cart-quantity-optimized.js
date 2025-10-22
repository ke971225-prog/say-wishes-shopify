/**
 * 购物车数量控制优化脚本
 * 基于Shopify官方最佳实践和响应式设计原则
 * 解决移动端和桌面端数量控制的兼容性问题
 */

class CartQuantityOptimizer {
  constructor() {
    this.isMobile = window.innerWidth < 750;
    this.init();
    this.setupResizeListener();
  }

  init() {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupQuantityControls());
    } else {
      this.setupQuantityControls();
    }

    // 监听购物车更新事件
    this.setupCartUpdateListener();
  }

  setupResizeListener() {
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth < 750;
        
        // 如果设备类型发生变化，重新初始化
        if (wasMobile !== this.isMobile) {
          this.setupQuantityControls();
        }
      }, 250);
    });
  }

  setupQuantityControls() {
    // 查找所有购物车项目
    const cartItems = document.querySelectorAll('.cart-item');
    
    cartItems.forEach(item => {
      this.optimizeQuantityInput(item);
    });

    // 使用MutationObserver监听DOM变化
    this.observeCartChanges();
  }

  optimizeQuantityInput(cartItem) {
    const quantityInput = cartItem.querySelector('quantity-input');
    if (!quantityInput) return;

    const minusButton = quantityInput.querySelector('.quantity__button[name="minus"]');
    const plusButton = quantityInput.querySelector('.quantity__button[name="plus"]');
    const input = quantityInput.querySelector('.quantity__input');

    if (!input) return;

    // 确保按钮可见性（不干扰现有功能）
    this.ensureButtonVisibility(quantityInput, minusButton, plusButton, input);

    // 优化输入框行为
    this.optimizeInputBehavior(input);
  }

  ensureButtonVisibility(quantityInput, minusButton, plusButton, input) {
    // 确保所有设备上按钮都可见
    if (minusButton) {
      minusButton.style.display = 'flex';
      minusButton.style.visibility = 'visible';
      minusButton.style.opacity = '1';
    }
    if (plusButton) {
      plusButton.style.display = 'flex';
      plusButton.style.visibility = 'visible';
      plusButton.style.opacity = '1';
    }
    
    // 移动端输入框优化
    const isMobile = window.innerWidth <= 768;
    if (isMobile && input) {
      input.style.textAlign = 'center';
      input.style.fontSize = '16px'; // 防止iOS缩放
    }
  }



  optimizeInputBehavior(input) {
    // 确保输入框只接受数字
    input.addEventListener('input', (e) => {
      let value = e.target.value.replace(/[^0-9]/g, '');
      if (value === '') value = '0';
      
      const numValue = parseInt(value);
      const min = parseInt(input.getAttribute('min')) || 0;
      const max = parseInt(input.getAttribute('max')) || 999;
      
      if (numValue < min) value = min.toString();
      if (numValue > max) value = max.toString();
      
      if (e.target.value !== value) {
        e.target.value = value;
      }
    });

    // 防止输入非数字字符
    input.addEventListener('keypress', (e) => {
      if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
    });

    // 失去焦点时验证值
    input.addEventListener('blur', (e) => {
      let value = parseInt(e.target.value) || 0;
      const min = parseInt(input.getAttribute('min')) || 0;
      const max = parseInt(input.getAttribute('max')) || 999;
      
      value = Math.max(min, Math.min(max, value));
      e.target.value = value;
      
      // 触发change事件
      const changeEvent = new Event('change', { bubbles: true });
      e.target.dispatchEvent(changeEvent);
    });
  }







  setupCartUpdateListener() {
    // 监听购物车更新事件
    if (typeof window.PUB_SUB_EVENTS !== 'undefined' && typeof window.subscribe === 'function') {
      window.subscribe(window.PUB_SUB_EVENTS.cartUpdate, () => {
        // 延迟重新初始化，确保DOM更新完成
        setTimeout(() => {
          this.setupQuantityControls();
        }, 100);
      });
    }

    // 监听自定义购物车更新事件
    document.addEventListener('cart:updated', () => {
      setTimeout(() => {
        this.setupQuantityControls();
      }, 100);
    });
  }

  observeCartChanges() {
    // 使用MutationObserver监听购物车DOM变化
    const cartContainer = document.querySelector('.cart__items') || 
                         document.querySelector('#main-cart-items') ||
                         document.querySelector('.cart-items');
    
    if (!cartContainer) return;

    const observer = new MutationObserver((mutations) => {
      let shouldReinit = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE && 
                (node.classList.contains('cart-item') || 
                 node.querySelector('.cart-item'))) {
              shouldReinit = true;
            }
          });
        }
      });

      if (shouldReinit) {
        setTimeout(() => {
          this.setupQuantityControls();
        }, 50);
      }
    });

    observer.observe(cartContainer, {
      childList: true,
      subtree: true
    });
  }
}

// 初始化优化器
if (typeof window !== 'undefined') {
  // 确保在页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new CartQuantityOptimizer();
    });
  } else {
    new CartQuantityOptimizer();
  }

  // 也在window load事件后再次初始化，确保所有资源加载完成
  window.addEventListener('load', () => {
    setTimeout(() => {
      new CartQuantityOptimizer();
    }, 200);
  });

  // 导出到全局作用域以便调试
  window.CartQuantityOptimizer = CartQuantityOptimizer;
}