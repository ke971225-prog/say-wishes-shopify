/**
 * Enhanced Cart UX JavaScript
 * 基于Shopify官方最佳实践和电商转化率优化
 */

(function() {
  'use strict';
  
  class EnhancedCartUX {
    constructor() {
      this.cartDrawer = document.querySelector('cart-drawer');
      this.checkoutButton = document.querySelector('#CartDrawer-Checkout');
      this.urgencyTimer = null;
      this.init();
    }
    
    init() {
      this.setupEventListeners();
      this.initUrgencyTimer();
      this.addProgressIndicator();
      console.log('Enhanced Cart UX initialized');
    }
    
    setupEventListeners() {
      if (this.checkoutButton) {
        this.checkoutButton.addEventListener('click', () => {
          this.trackCheckoutAttempt();
        });
      }
    }
    
    initUrgencyTimer() {
      const timerContainer = this.createUrgencyTimer();
      if (timerContainer && this.cartDrawer) {
        const cartFooter = this.cartDrawer.querySelector('.drawer__footer');
        if (cartFooter) {
          cartFooter.insertBefore(timerContainer, cartFooter.firstChild);
        }
      }
      this.startUrgencyTimer();
    }
    
    createUrgencyTimer() {
      const timer = document.createElement('div');
      timer.className = 'cart__urgency-timer';
      timer.innerHTML = `
        <div class="urgency-timer__text">
          🔥 Limited Time Offer - Complete your order now!
        </div>
        <div class="urgency-timer__countdown">
          <div class="countdown-unit">
            <span class="countdown-number" data-minutes>15</span>
            <span class="countdown-label">min</span>
          </div>
          <div class="countdown-unit">
            <span class="countdown-number" data-seconds>00</span>
            <span class="countdown-label">sec</span>
          </div>
        </div>
      `;
      return timer;
    }
    
    startUrgencyTimer() {
      let timeLeft = 15 * 60;
      
      const updateTimer = () => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        const minutesEl = document.querySelector('[data-minutes]');
        const secondsEl = document.querySelector('[data-seconds]');
        
        if (minutesEl && secondsEl) {
          minutesEl.textContent = minutes.toString().padStart(2, '0');
          secondsEl.textContent = seconds.toString().padStart(2, '0');
        }
        
        if (timeLeft > 0) {
          timeLeft--;
          this.urgencyTimer = setTimeout(updateTimer, 1000);
        }
      };
      
      updateTimer();
    }
    
    addProgressIndicator() {
      const progressContainer = document.createElement('div');
      progressContainer.className = 'cart-progress-indicator';
      progressContainer.innerHTML = `
        <div class="progress-header">
          <span class="progress-text">You're almost there!</span>
          <span class="progress-amount">$25 away from free shipping</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: 60%"></div>
        </div>
      `;
      
      const cartHeader = this.cartDrawer?.querySelector('.drawer__header');
      if (cartHeader) {
        cartHeader.insertAdjacentElement('afterend', progressContainer);
      }
    }
    
    trackCheckoutAttempt() {
      if (window.gtag) {
        gtag('event', 'begin_checkout', {
          event_category: 'Enhanced Cart'
        });
      }
    }
    
    destroy() {
      if (this.urgencyTimer) {
        clearTimeout(this.urgencyTimer);
      }
    }
  }
  
  // 初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new EnhancedCartUX();
    });
  } else {
    new EnhancedCartUX();
  }
  
})();