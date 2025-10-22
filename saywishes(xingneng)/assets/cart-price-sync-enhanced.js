/**
 * Enhanced Cart Price Synchronization
 * Based on Shopify best practices for custom pricing and addon products
 * Ensures proper handling of custom pricing while maintaining cart functionality
 */

class EnhancedCartPriceSync {
  constructor() {
    this.isInitialized = false;
    this.customPriceItems = new Map();
    this.originalCartUpdate = null;
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  initialize() {
    if (this.isInitialized) return;
    
    try {
      // Set up event listeners
      this.setupEventListeners();
      
      // Initialize price tracking
      this.trackCustomPrices();
      
      // Set up cart update interception
      this.setupCartInterception();
      
      this.isInitialized = true;
      console.log('Enhanced Cart Price Sync initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Enhanced Cart Price Sync:', error);
    }
  }

  setupEventListeners() {
    // Listen for cart updates
    document.addEventListener('cart:updated', () => {
      this.handleCartUpdate();
    });

    // Listen for custom price changes
    document.addEventListener('custom:price:updated', (event) => {
      this.handleCustomPriceUpdate(event.detail);
    });

    // Listen for addon product additions
    document.addEventListener('addon:product:added', (event) => {
      this.handleAddonProductAdded(event.detail);
    });
  }

  async trackCustomPrices() {
    try {
      const cart = await this.getCart();
      
      cart.items.forEach(item => {
        const customPrice = this.extractCustomPrice(item.properties);
        if (customPrice) {
          this.customPriceItems.set(item.key, {
            originalPrice: item.price,
            customPrice: customPrice,
            properties: item.properties
          });
        }
      });
    } catch (error) {
      console.error('Error tracking custom prices:', error);
    }
  }

  extractCustomPrice(properties) {
    if (!properties) return null;
    
    // Check for various custom price property names
    const priceKeys = ['Total Price', 'Custom Price', 'Final Price', 'Calculated Price'];
    
    for (const key of priceKeys) {
      if (properties[key]) {
        return this.parsePriceString(properties[key]);
      }
    }
    
    return null;
  }

  parsePriceString(priceString) {
    if (typeof priceString === 'number') return priceString;
    
    // Remove currency symbols and convert to cents
    const cleanPrice = String(priceString).replace(/[^0-9.]/g, '');
    const price = parseFloat(cleanPrice);
    
    return isNaN(price) ? null : Math.round(price * 100);
  }

  async getCart() {
    try {
      const response = await fetch('/cart.js', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Cart fetch failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching cart:', error);
      throw error;
    }
  }

  async handleCartUpdate() {
    try {
      await this.trackCustomPrices();
      this.updatePriceDisplay();
      this.validateAddonProducts();
    } catch (error) {
      console.error('Error handling cart update:', error);
    }
  }

  handleCustomPriceUpdate(detail) {
    if (detail && detail.itemKey && detail.customPrice) {
      this.customPriceItems.set(detail.itemKey, {
        ...this.customPriceItems.get(detail.itemKey),
        customPrice: detail.customPrice
      });
      
      this.updatePriceDisplay();
    }
  }

  handleAddonProductAdded(detail) {
    console.log('Addon product added:', detail);
    // Ensure addon products are properly tracked
    this.validateAddonProducts();
  }

  updatePriceDisplay() {
    // Update individual item prices in the cart display
    this.customPriceItems.forEach((priceData, itemKey) => {
      const cartItem = document.querySelector(`[data-cart-item-key="${itemKey}"]`);
      if (cartItem && priceData.customPrice) {
        this.updateItemPriceDisplay(cartItem, priceData.customPrice);
      }
    });

    // Update cart totals
    this.updateCartTotals();
  }

  updateItemPriceDisplay(cartItem, customPrice) {
    const priceElements = cartItem.querySelectorAll('.cart-item__price, .price, [data-cart-item-price]');
    const formattedPrice = this.formatPrice(customPrice);
    
    priceElements.forEach(element => {
      if (element.textContent !== formattedPrice) {
        element.textContent = formattedPrice;
        element.setAttribute('data-custom-price', 'true');
      }
    });
  }

  async updateCartTotals() {
    try {
      const cart = await this.getCart();
      let customTotal = 0;
      
      cart.items.forEach(item => {
        const customPriceData = this.customPriceItems.get(item.key);
        if (customPriceData && customPriceData.customPrice) {
          customTotal += customPriceData.customPrice * item.quantity;
        } else {
          customTotal += item.line_price;
        }
      });

      // Update total display elements
      const totalElements = document.querySelectorAll('.cart__total, .cart-subtotal, [data-cart-total]');
      const formattedTotal = this.formatPrice(customTotal);
      
      totalElements.forEach(element => {
        if (element.textContent !== formattedTotal) {
          element.textContent = formattedTotal;
          element.setAttribute('data-custom-total', 'true');
        }
      });

      // Store custom total for checkout
      sessionStorage.setItem('customCartTotal', customTotal.toString());
      
    } catch (error) {
      console.error('Error updating cart totals:', error);
    }
  }

  validateAddonProducts() {
    // Ensure addon products are properly linked to main products
    const addonItems = document.querySelectorAll('[data-addon-product="true"]');
    
    addonItems.forEach(addon => {
      const relatedTo = addon.getAttribute('data-related-to');
      if (relatedTo) {
        const mainProduct = document.querySelector(`[data-cart-item-key="${relatedTo}"]`);
        if (!mainProduct) {
          console.warn('Addon product found without main product:', addon);
          this.handleOrphanedAddon(addon);
        }
      }
    });
  }

  handleOrphanedAddon(addonElement) {
    // Handle addon products that lost their main product
    const itemKey = addonElement.getAttribute('data-cart-item-key');
    if (itemKey) {
      console.log('Handling orphaned addon product:', itemKey);
      // Could implement logic to remove orphaned addons or link them properly
    }
  }

  formatPrice(priceInCents) {
    const price = priceInCents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: window.Shopify?.currency?.active || 'USD'
    }).format(price);
  }

  setupCartInterception() {
    // Intercept cart operations to maintain custom pricing
    const originalFetch = window.fetch;
    
    window.fetch = async (url, options) => {
      const response = await originalFetch.call(window, url, options);
      
      // Handle cart-related API calls
      if (url.includes('/cart/') && (url.includes('add.js') || url.includes('update.js') || url.includes('change.js'))) {
        // Delay to allow cart to update
        setTimeout(() => {
          this.handleCartUpdate();
        }, 100);
      }
      
      return response;
    };
  }

  // Public method to manually sync prices
  async syncPrices() {
    try {
      await this.trackCustomPrices();
      this.updatePriceDisplay();
      console.log('Prices synced successfully');
    } catch (error) {
      console.error('Error syncing prices:', error);
    }
  }

  // Public method to add custom price for an item
  setCustomPrice(itemKey, customPrice) {
    this.customPriceItems.set(itemKey, {
      ...this.customPriceItems.get(itemKey),
      customPrice: this.parsePriceString(customPrice)
    });
    
    this.updatePriceDisplay();
    
    // Dispatch custom event
    document.dispatchEvent(new CustomEvent('custom:price:updated', {
      detail: { itemKey, customPrice }
    }));
  }

  // Public method to get custom total
  async getCustomTotal() {
    try {
      const cart = await this.getCart();
      let customTotal = 0;
      
      cart.items.forEach(item => {
        const customPriceData = this.customPriceItems.get(item.key);
        if (customPriceData && customPriceData.customPrice) {
          customTotal += customPriceData.customPrice * item.quantity;
        } else {
          customTotal += item.line_price;
        }
      });
      
      return customTotal;
    } catch (error) {
      console.error('Error calculating custom total:', error);
      return null;
    }
  }
}

// Initialize the enhanced cart price sync
if (typeof window !== 'undefined') {
  window.enhancedCartPriceSync = new EnhancedCartPriceSync();
  
  // Expose public methods globally
  window.syncCartPrices = () => window.enhancedCartPriceSync.syncPrices();
  window.setCustomPrice = (itemKey, price) => window.enhancedCartPriceSync.setCustomPrice(itemKey, price);
  window.getCustomCartTotal = () => window.enhancedCartPriceSync.getCustomTotal();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnhancedCartPriceSync;
}