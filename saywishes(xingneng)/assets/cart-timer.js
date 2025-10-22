class CartTimer {
  constructor() {
    this.timer = document.querySelector('.cart-timer');
    if (!this.timer) return;
    
    this.countdownElement = document.getElementById('cart-countdown');
    this.minutes = parseInt(this.timer.dataset.timerMinutes) || 15;
    this.storageKey = 'cart_timer_start';
    
    this.init();
  }
  
  init() {
    // 检查是否已有计时器在运行
    const startTime = localStorage.getItem(this.storageKey);
    
    if (startTime) {
      const elapsed = Date.now() - parseInt(startTime);
      const remaining = (this.minutes * 60 * 1000) - elapsed;
      
      if (remaining > 0) {
        this.startCountdown(remaining);
      } else {
        this.onTimerExpired();
      }
    } else {
      // 开始新的计时器
      localStorage.setItem(this.storageKey, Date.now().toString());
      this.startCountdown(this.minutes * 60 * 1000);
    }
    
    // 监听购物车变化
    document.addEventListener('cart:updated', () => {
      this.resetTimer();
    });
  }
  
  startCountdown(duration) {
    let remaining = duration;
    
    this.updateDisplay(remaining);
    
    this.interval = setInterval(() => {
      remaining -= 1000;
      
      if (remaining <= 0) {
        this.onTimerExpired();
        return;
      }
      
      this.updateDisplay(remaining);
      
      // 最后2分钟添加紧急样式
      if (remaining <= 2 * 60 * 1000) {
        this.timer.classList.add('urgent');
      }
    }, 1000);
  }
  
  updateDisplay(remaining) {
    const minutes = Math.floor(remaining / (60 * 1000));
    const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
    
    this.countdownElement.textContent = 
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  onTimerExpired() {
    clearInterval(this.interval);
    this.timer.style.display = 'none';
    localStorage.removeItem(this.storageKey);
    
    // 显示过期提示
    this.showExpiredMessage();
  }
  
  showExpiredMessage() {
    const expiredMessage = document.createElement('div');
    expiredMessage.className = 'cart-timer cart-timer--expired';
    expiredMessage.style.backgroundColor = '#fee2e2';
    expiredMessage.style.color = '#dc2626';
    expiredMessage.innerHTML = `
      <div class="cart-timer__content">
        <div class="cart-timer__text">
          <span class="cart-timer__message">Time's up! Please complete checkout quickly to secure your items.</span>
        </div>
      </div>
    `;
    
    this.timer.parentNode.insertBefore(expiredMessage, this.timer.nextSibling);
    
    // 3秒后自动隐藏
    setTimeout(() => {
      expiredMessage.remove();
    }, 3000);
  }
  
  resetTimer() {
    clearInterval(this.interval);
    localStorage.setItem(this.storageKey, Date.now().toString());
    this.timer.classList.remove('urgent');
    this.startCountdown(this.minutes * 60 * 1000);
  }
}

// 初始化倒计时器
document.addEventListener('DOMContentLoaded', () => {
  new CartTimer();
});

// 处理页面可见性变化
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // 页面重新可见时重新初始化计时器
    new CartTimer();
  }
});