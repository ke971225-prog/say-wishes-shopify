// Image optimization and lazy loading script
(function() {
  'use strict';
  
  // Check WebP support
  function supportsWebP() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }
  
  // Lazy loading observer
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.dataset.src;
        
        if (src) {
          // Add WebP support if available
          if (supportsWebP() && (src.includes('.jpg') || src.includes('.png'))) {
            const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
            // Try WebP first, fallback to original
            const testImg = new Image();
            testImg.onload = () => {
              img.src = webpSrc;
              img.classList.add('loaded');
            };
            testImg.onerror = () => {
              img.src = src;
              img.classList.add('loaded');
            };
            testImg.src = webpSrc;
          } else {
            img.src = src;
            img.classList.add('loaded');
          }
          
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      }
    });
  }, {
    rootMargin: '50px 0px',
    threshold: 0.01
  });
  
  // Initialize lazy loading
  function initLazyLoading() {
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => {
      img.classList.add('lazy');
      imageObserver.observe(img);
    });
  }
  
  // Preload critical images
  function preloadCriticalImages() {
    const criticalImages = document.querySelectorAll('img[data-priority="high"]');
    criticalImages.forEach(img => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = img.src || img.dataset.src;
      document.head.appendChild(link);
    });
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initLazyLoading();
      preloadCriticalImages();
    });
  } else {
    initLazyLoading();
    preloadCriticalImages();
  }
  
  // Add CSS for smooth loading transitions
  const style = document.createElement('style');
  style.textContent = `
    .lazy {
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
    }
    .lazy.loaded {
      opacity: 1;
    }
  `;
  document.head.appendChild(style);
})();