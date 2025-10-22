// SEO Enhancement Script

// Lazy loading implementation
function initLazyLoading() {
  const images = document.querySelectorAll('img[loading="lazy"]');
  
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.classList.add('loaded');
          observer.unobserve(img);
        }
      });
    });
    
    images.forEach(img => imageObserver.observe(img));
  }
}

// Add structured data for user interactions
function trackUserEngagement() {
  // Track scroll depth for SEO analytics
  let maxScroll = 0;
  
  window.addEventListener('scroll', () => {
    const scrollPercent = Math.round(
      (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
    );
    
    if (scrollPercent > maxScroll) {
      maxScroll = scrollPercent;
      
      // Send to analytics (Google Analytics 4)
      if (typeof gtag !== 'undefined') {
        gtag('event', 'scroll', {
          'scroll_depth': scrollPercent
        });
      }
    }
  });
}

// Optimize Core Web Vitals
function optimizeCoreWebVitals() {
  // Preload critical resources
  const criticalImages = document.querySelectorAll('.hero img, .featured-product img');
  criticalImages.forEach(img => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = img.src;
    document.head.appendChild(link);
  });
  
  // Optimize font loading
  document.fonts.ready.then(() => {
    document.body.classList.add('fonts-loaded');
  });
}

// Initialize SEO enhancements
document.addEventListener('DOMContentLoaded', () => {
  initLazyLoading();
  trackUserEngagement();
  optimizeCoreWebVitals();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initLazyLoading,
    trackUserEngagement,
    optimizeCoreWebVitals
  };
}