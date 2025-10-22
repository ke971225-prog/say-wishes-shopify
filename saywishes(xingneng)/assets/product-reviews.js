class ProductReviews {
  constructor() {
    this.init();
  }

  init() {
    this.setupStarRating();
    this.setupFormSubmission();
    this.setupAverageRating();
    this.setupImagePreview();
  }

  // Setup star rating functionality
  setupStarRating() {
    const starRating = document.getElementById('star-rating');
    const ratingText = document.getElementById('rating-text');
    
    if (!starRating) return;

    const labels = starRating.querySelectorAll('label');
    const inputs = starRating.querySelectorAll('input');
    
    const ratingTexts = {
      1: 'Poor',
      2: 'Fair',
      3: 'Good',
      4: 'Very Good',
      5: 'Excellent'
    };

    // Mouse hover effects
    labels.forEach(label => {
      label.addEventListener('mouseenter', (e) => {
        const value = e.target.dataset.value;
        this.highlightStars(starRating, value);
        if (ratingText) {
          ratingText.textContent = ratingTexts[value] || 'Please select a rating';
        }
      });
    });

    // Mouse leave reset
    starRating.addEventListener('mouseleave', () => {
      const checkedInput = starRating.querySelector('input:checked');
      const value = checkedInput ? checkedInput.value : 0;
      this.highlightStars(starRating, value);
      if (ratingText) {
        ratingText.textContent = value > 0 ? ratingTexts[value] : 'Please select a rating';
      }
    });

    // Click selection
    inputs.forEach(input => {
      input.addEventListener('change', (e) => {
        const value = e.target.value;
        this.highlightStars(starRating, value);
        if (ratingText) {
          ratingText.textContent = ratingTexts[value];
        }
      });
    });
  }

  // Highlight stars
  highlightStars(container, rating) {
    const labels = container.querySelectorAll('label');
    labels.forEach(label => {
      const value = parseInt(label.dataset.value);
      if (value <= rating) {
        label.style.color = '#ffd700';
      } else {
        label.style.color = '#ddd';
      }
    });
  }

  // Setup average rating display
  setupAverageRating() {
    const starsContainers = document.querySelectorAll('.stars[data-rating]');
    
    starsContainers.forEach(container => {
      const rating = parseFloat(container.dataset.rating);
      const stars = container.querySelectorAll('.star');
      
      stars.forEach((star, index) => {
        const starValue = index + 1;
        if (starValue <= Math.floor(rating)) {
          star.classList.add('filled');
        } else if (starValue === Math.ceil(rating) && rating % 1 !== 0) {
          // Half star effect
          star.style.background = `linear-gradient(90deg, #ffd700 ${(rating % 1) * 100}%, #ddd ${(rating % 1) * 100}%)`;
          star.style.webkitBackgroundClip = 'text';
          star.style.webkitTextFillColor = 'transparent';
        }
      });
    });
  }

  // Setup form submission
  setupFormSubmission() {
    const form = document.getElementById('review-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submitReview(form);
    });
  }

  // Submit review
  async submitReview(form) {
    const submitBtn = document.getElementById('submit-review');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    const messageDiv = document.getElementById('form-message');

    // Get form data
    const formData = new FormData(form);
    const reviewData = {
      rating: formData.get('rating'),
      name: formData.get('name'),
      email: formData.get('email'),
      review: formData.get('review'),
      product_id: this.getProductId(),
      timestamp: new Date().toISOString()
    };

    // Validate data
    if (!this.validateReviewData(reviewData)) {
      this.showMessage('Please fill in all required fields and select a rating', 'error');
      return;
    }

    // Show loading state
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'flex';

    try {
      // Simulate server submission
      await this.saveReview(reviewData);
      
      // Success message
      this.showMessage('Review submitted successfully! Thank you for your feedback.', 'success');
      form.reset();
      this.resetStarRating();
      
      // Optional: refresh review list
      setTimeout(() => {
        this.addReviewToList(reviewData);
      }, 1000);
      
    } catch (error) {
      console.error('Failed to submit review:', error);
      this.showMessage('Submission failed, please try again later.', 'error');
    } finally {
      // Restore button state
      submitBtn.disabled = false;
      btnText.style.display = 'inline';
      btnLoading.style.display = 'none';
    }
  }

  // Validate review data
  validateReviewData(data) {
    return data.rating && data.name && data.email && data.review;
  }

  // Save review (can integrate with actual API)
  async saveReview(reviewData) {
    // Simulate API call
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Save to localStorage for demo
        const reviews = JSON.parse(localStorage.getItem('product_reviews') || '[]');
        reviews.push({
          ...reviewData,
          id: Date.now(),
          date: new Date().toLocaleDateString('en-US')
        });
        localStorage.setItem('product_reviews', JSON.stringify(reviews));
        resolve();
      }, 1500);
    });
  }

  // Get product ID
  getProductId() {
    // Get product ID from URL or page data
    const productData = document.querySelector('[data-product-id]');
    return productData ? productData.dataset.productId : window.location.pathname.split('/').pop();
  }

  // Show message
  showMessage(message, type) {
    const messageDiv = document.getElementById('form-message');
    if (!messageDiv) return;

    messageDiv.textContent = message;
    messageDiv.className = `form-message ${type}`;
    messageDiv.style.display = 'block';

    // Auto hide after 3 seconds
    setTimeout(() => {
      messageDiv.style.display = 'none';
    }, 3000);
  }

  // Reset star rating
  resetStarRating() {
    const starRating = document.getElementById('star-rating');
    const ratingText = document.getElementById('rating-text');
    
    if (starRating) {
      const inputs = starRating.querySelectorAll('input');
      inputs.forEach(input => input.checked = false);
      this.highlightStars(starRating, 0);
    }
    
    if (ratingText) {
      ratingText.textContent = 'Please select a rating';
    }
  }

  // Add review to list
  addReviewToList(reviewData) {
    const reviewsList = document.querySelector('.reviews-list');
    if (!reviewsList) return;

    const reviewHTML = `
      <div class="review-item" style="animation: fadeInUp 0.6s ease forwards;">
        <div class="review-header">
          <div class="reviewer-info">
            <span class="reviewer-name">${reviewData.name}</span>
            <div class="review-rating">
              ${this.generateStarHTML(reviewData.rating)}
            </div>
          </div>
          <span class="review-date">${new Date().toLocaleDateString('en-US')}</span>
        </div>
        <div class="review-content">
          <p>${reviewData.review}</p>
        </div>
      </div>
    `;

    // Insert at the beginning of the list
    reviewsList.insertAdjacentHTML('afterbegin', reviewHTML);
    
    // Update review count
    this.updateReviewCount();
  }

  // Generate star HTML
  generateStarHTML(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      const filled = i <= rating ? ' filled' : '';
      html += `<span class="star${filled}">★</span>`;
    }
    return html;
  }

  // Update review count
  updateReviewCount() {
    const countElement = document.querySelector('.review-count');
    if (countElement) {
      const currentText = countElement.textContent;
      const currentCount = parseInt(currentText.match(/\d+/) || [0])[0];
      countElement.textContent = `Based on ${currentCount + 1} reviews`;
    }
  }

  // Setup image preview
  setupImagePreview() {
    const imageInput = document.getElementById('review-image');
    if (!imageInput) return;

    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          this.showMessage('Please select an image file', 'error');
          e.target.value = '';
          return;
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          this.showMessage('Image size cannot exceed 5MB', 'error');
          e.target.value = '';
          return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
          this.showImagePreview(e.target.result);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Show image preview
  showImagePreview(src) {
    const imageInput = document.getElementById('review-image');
    let preview = document.getElementById('image-preview');
    
    if (!preview) {
      preview = document.createElement('div');
      preview.id = 'image-preview';
      preview.style.marginTop = '0.5rem';
      imageInput.parentNode.appendChild(preview);
    }

    preview.innerHTML = `
      <img src="${src}" alt="Preview" loading="lazy" style="max-width: 200px; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      <button type="button" onclick="this.parentNode.remove(); document.getElementById('review-image').value = '';" style="margin-left: 0.5rem; padding: 0.25rem 0.5rem; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Remove</button>
    `;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new ProductReviews();
});

// Export class for use by other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProductReviews;
}