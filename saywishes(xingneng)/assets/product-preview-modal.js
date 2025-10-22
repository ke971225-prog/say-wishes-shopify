class ProductPreviewModal extends HTMLElement {
  constructor() {
    super();

    this.modal = this.querySelector('#product-preview-modal');
    this.header = document.querySelector('sticky-header');
    this.onBodyClick = this.handleBodyClick.bind(this);

    this.modal.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.querySelectorAll('button[type="button"]').forEach((closeButton) =>
      closeButton.addEventListener('click', this.close.bind(this))
    );
    
    // 绑定继续购物按钮
    this.querySelector('.product-preview-continue')?.addEventListener('click', this.close.bind(this));
  }

  open() {
    this.modal.classList.add('animate', 'active');

    this.modal.addEventListener(
      'transitionend',
      () => {
        this.modal.focus();
        if (typeof trapFocus === 'function') {
          trapFocus(this.modal);
        }
      },
      { once: true }
    );

    document.body.addEventListener('click', this.onBodyClick);
    document.body.classList.add('overflow-hidden');
  }

  close() {
    this.modal.classList.remove('active');
    document.body.removeEventListener('click', this.onBodyClick);
    document.body.classList.remove('overflow-hidden');

    if (typeof removeTrapFocus === 'function') {
      removeTrapFocus(this.activeElement);
    }
  }

  async renderContents(cartResponse) {
    try {
      console.log('Rendering product preview modal with cart response:', cartResponse);
      
      // 获取相关的购物车项目组（主产品 + 附加服务）
      const relatedItems = this.getRelatedCartItems(cartResponse);
      if (!relatedItems || relatedItems.length === 0) {
        console.error('No cart items found');
        return;
      }

      console.log('Related cart items:', relatedItems);

      // 获取主产品（第一个项目通常是主产品）
      const mainItem = relatedItems[0];
      const productData = await this.fetchProductData(mainItem);
      
      console.log('Product data fetched:', productData);
      
      // 渲染产品预览内容（包括所有相关项目）
      this.renderProductPreview(productData, mainItem, relatedItems);
      
      // 渲染购物车总计
      this.renderCartSummary(cartResponse);
      
      // 更新购物车图标
      this.updateCartIcon(cartResponse);
      
      if (this.header) this.header.reveal();
      
      // 确保模态框打开
      this.open();
      
      console.log('Product preview modal opened successfully');
    } catch (error) {
      console.error('Error rendering product preview:', error);
      // 如果出错，仍然显示模态框但不显示产品信息
      this.open();
      // 可选：显示错误信息
      const contentContainer = this.querySelector('#product-preview-content');
      if (contentContainer) {
        contentContainer.innerHTML = '<p>Unable to load product information</p>';
      }
    }
  }

  getLatestCartItem(cartResponse) {
    // 从购物车响应中获取最新添加的商品
    if (cartResponse.items && cartResponse.items.length > 0) {
      // 按照添加时间排序，获取最新的商品
      const sortedItems = cartResponse.items.sort((a, b) => {
        // 如果有id，按id排序（通常id越大越新）
        if (a.id && b.id) {
          return b.id - a.id;
        }
        // 否则返回最后一个
        return 0;
      });
      return sortedItems[0];
    }
    return null;
  }

  getRelatedCartItems(cartResponse) {
    // 获取相关的购物车项目组（主产品 + 附加服务）
    if (!cartResponse.items || cartResponse.items.length === 0) {
      return [];
    }

    // 按照ID排序，获取最新添加的项目
    const sortedItems = cartResponse.items.sort((a, b) => {
      if (a.id && b.id) {
        return b.id - a.id;
      }
      return 0;
    });

    // 获取最新的项目
    const latestItem = sortedItems[0];
    const relatedItems = [latestItem];

    // 查找相关的附加服务项目
    // 通过 'Related to' 属性或者相近的添加时间来识别相关项目
    if (latestItem.properties && latestItem.properties['Team'] && latestItem.properties['Message']) {
      const teamName = latestItem.properties['Team'];
      const messagePrefix = latestItem.properties['Message'].substring(0, 20);
      const relatedToPattern = `${teamName} - ${messagePrefix}`;

      // 查找具有相同 'Related to' 属性的其他项目
      for (let i = 1; i < sortedItems.length; i++) {
        const item = sortedItems[i];
        if (item.properties && item.properties['Related to'] && 
            item.properties['Related to'].includes(teamName) &&
            item.properties['Related to'].includes(messagePrefix.substring(0, 10))) {
          relatedItems.push(item);
        }
      }
    }

    // 如果没有找到通过属性关联的项目，检查最近添加的项目
    // 假设在同一次操作中添加的项目ID是连续的或者非常接近的
    if (relatedItems.length === 1) {
      const latestId = latestItem.id;
      const threshold = 10; // ID差异阈值

      for (let i = 1; i < Math.min(sortedItems.length, 5); i++) {
        const item = sortedItems[i];
        if (Math.abs(item.id - latestId) <= threshold) {
          // 检查是否是附加服务（通过产品标题或属性判断）
          if (item.product_title && (
            item.product_title.includes('Additional Photo') ||
            item.product_title.includes('Express Delivery') ||
            item.product_title.includes('Birthday Song') ||
            item.product_title.includes('Video Editing') ||
            (item.properties && (item.properties['Service'] || item.properties['Additional Photo']))
          )) {
            relatedItems.push(item);
          }
        }
      }
    }

    console.log('Found related items:', relatedItems);
    return relatedItems;
  }

  async fetchProductData(cartItem) {
    try {
      // 尝试多种方式获取产品handle
      let productHandle = null;
      
      // 方法1: 直接使用handle字段
      if (cartItem.handle) {
        productHandle = cartItem.handle;
      }
      
      // 方法2: 使用product_handle字段
      if (!productHandle && cartItem.product_handle) {
        productHandle = cartItem.product_handle;
      }
      
      // 方法3: 从URL中提取handle
      if (!productHandle && cartItem.url) {
        const urlParts = cartItem.url.split('/');
        productHandle = urlParts[urlParts.length - 1];
      }
      
      // 方法4: 从product_url中提取handle
      if (!productHandle && cartItem.product_url) {
        const urlParts = cartItem.product_url.split('/');
        productHandle = urlParts[urlParts.length - 1];
      }
      
      // 方法5: 使用产品标题生成handle（最后的备用方案）
      if (!productHandle && cartItem.product_title) {
        productHandle = cartItem.product_title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }
      
      if (!productHandle) {
        throw new Error('Unable to get product handle');
      }
      
      const response = await fetch(`/products/${productHandle}.js`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const productData = await response.json();
      
      // 找到对应的变体
      const variant = productData.variants.find(v => v.id === cartItem.variant_id);
      
      return {
        product: productData,
        variant: variant || productData.variants[0]
      };
    } catch (error) {
      console.error('Error fetching product data:', error);
      throw error;
    }
  }

  renderProductPreview(productData, mainCartItem, relatedItems = null) {
    const contentContainer = this.querySelector('#product-preview-content');
    if (!contentContainer) return;

    const { product, variant } = productData;
    
    // 构建主产品预览HTML
    let previewHTML = this.buildProductPreviewHTML(product, variant, mainCartItem);
    
    // 如果有相关项目（附加服务），添加它们的显示
    if (relatedItems && relatedItems.length > 1) {
      const additionalItems = relatedItems.slice(1); // 除了主产品的其他项目
      
      if (additionalItems.length > 0) {
        previewHTML += `
          <div class="additional-items-section">
            <h4 class="additional-items-title">Included additional services:</h4>
            <div class="additional-items-list">
        `;
        
        additionalItems.forEach(item => {
          previewHTML += this.buildAdditionalItemHTML(item);
        });
        
        previewHTML += `
            </div>
          </div>
        `;
      }
    }
    
    contentContainer.innerHTML = previewHTML;
  }

  renderCartSummary(cartResponse) {
    const summaryContainer = this.querySelector('#cart-summary');
    if (!summaryContainer) return;

    const cart = cartResponse;
    const itemCount = cart.item_count || 0;
    const totalPrice = cart.total_price || 0;
    
    const summaryHTML = `
      <div class="cart-summary-item">
        <span class="cart-summary-label">Item count:</span>
        <span class="cart-summary-value">${itemCount} items</span>
      </div>
      <div class="cart-summary-item">
        <span class="cart-summary-label">Subtotal:</span>
        <span class="cart-summary-value">${this.formatMoney(totalPrice)}</span>
      </div>
    `;
    
    summaryContainer.innerHTML = summaryHTML;
    
    // 更新View cart按钮显示
    this.updateViewCartButton(itemCount);
  }
  
  updateViewCartButton(itemCount) {
    const viewCartText = this.querySelector('#view-cart-text');
    const cartCountDisplay = this.querySelector('#cart-count-display');
    
    if (viewCartText && cartCountDisplay) {
      if (itemCount > 0) {
        viewCartText.textContent = 'View cart';
        cartCountDisplay.textContent = ` (${itemCount})`;
        cartCountDisplay.style.display = 'inline';
      } else {
        viewCartText.textContent = 'View cart';
        cartCountDisplay.style.display = 'none';
      }
    }
  }

  buildProductPreviewHTML(product, variant, cartItem) {
    // 根据Shopify API正确获取产品图片
    let imageUrl = null;
    let imageAlt = product.title;
    
    // 优先使用变体图片
    if (variant && variant.featured_image) {
      imageUrl = variant.featured_image;
      imageAlt = product.title;
    } else if (variant && variant.image) {
      imageUrl = variant.image;
      imageAlt = product.title;
    } else if (product.featured_image) {
      // 使用产品特色图片
      imageUrl = product.featured_image;
      imageAlt = product.title;
    } else if (product.images && product.images.length > 0) {
      // 使用第一张产品图片
      imageUrl = product.images[0];
      imageAlt = product.title;
    }
    
    // 如果获取到图片URL，确保它是完整的URL
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = `https:${imageUrl}`;
    }
    
    // 构建变体选项
    let variantOptionsHTML = '';
    if (product.options && product.options.length > 1) {
      variantOptionsHTML = product.options.map((option, index) => {
        const optionValue = variant.options[index];
        return `
          <div class="product-option">
            <dt>${option}:</dt>
            <dd>${optionValue}</dd>
          </div>
        `;
      }).join('');
    }
    
    // 构建价格HTML
    let priceHTML = '';
    if (variant.compare_at_price && variant.compare_at_price > variant.price) {
      priceHTML = `
        <dl class="product-preview-item__discounted-prices">
          <dt class="visually-hidden">Sale price</dt>
          <dd class="price price--on-sale">${this.formatMoney(variant.price)}</dd>
          <dt class="visually-hidden">Regular price</dt>
          <dd><s class="price price--compare">${this.formatMoney(variant.compare_at_price)}</s></dd>
        </dl>
      `;
    } else {
      priceHTML = `<span class="price">${this.formatMoney(variant.price)}</span>`;
    }
    
    return `
      <div class="product-preview-item" data-product-id="${product.id}" data-variant-id="${variant.id}">
        <div class="product-preview-item__media">
          ${imageUrl ? `
            <div class="product-preview-item__image global-media-settings">
              <img
                src="${imageUrl}"
                alt="${imageAlt}"
                width="150"
                loading="lazy"
              >
            </div>
          ` : ''}
        </div>
        
        <div class="product-preview-item__details">
          ${product.vendor ? `<p class="product-preview-item__vendor caption-with-letter-spacing light">${product.vendor}</p>` : ''}
          
          <h3 class="product-preview-item__title h4">${product.title}</h3>
          
          <div class="product-preview-item__variant-info">
            ${variantOptionsHTML}
          </div>
          
          <div class="product-preview-item__price">
            ${priceHTML}
          </div>
          
          <div class="product-preview-item__quantity">
            <span class="product-preview-item__quantity-label">Quantity:</span>
            <span class="product-preview-item__quantity-value">${cartItem.quantity || 1}</span>
          </div>
          
          <div class="product-preview-item__actions">
            <a href="/cart" class="button button--tertiary">
              View full details
            </a>
          </div>
        </div>
      </div>
    `;
  }

  buildAdditionalItemHTML(cartItem) {
    // 构建附加项目的HTML（附加服务、额外照片等）
    let itemTitle = cartItem.product_title || 'Additional service';
    let itemDescription = '';
    let itemPrice = cartItem.price || 0;
    
    // 根据属性确定服务类型和描述
    if (cartItem.properties) {
      if (cartItem.properties['Service']) {
        itemDescription = cartItem.properties['Service'];
      } else if (cartItem.properties['Additional Photo']) {
        itemDescription = cartItem.properties['Additional Photo'];
      } else if (cartItem.properties['Related to']) {
        itemDescription = `Related to: ${cartItem.properties['Related to']}`;
      }
    }
    
    // 如果没有描述，尝试从产品标题推断
    if (!itemDescription) {
      if (itemTitle.includes('Additional Photo')) {
        itemDescription = 'Additional photo service';
      } else if (itemTitle.includes('Express Delivery')) {
        itemDescription = 'Express delivery service (24 hours)';
      } else if (itemTitle.includes('Birthday Song')) {
        itemDescription = 'Birthday song service';
      } else if (itemTitle.includes('Video Editing')) {
        itemDescription = 'Party video editing service';
      }
    }
    
    return `
      <div class="additional-item">
        <div class="additional-item__icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 0L10.472 5.528L16 8L10.472 10.472L8 16L5.528 10.472L0 8L5.528 5.528L8 0Z" fill="currentColor"/>
          </svg>
        </div>
        <div class="additional-item__details">
          <div class="additional-item__title">${itemTitle}</div>
          ${itemDescription ? `<div class="additional-item__description">${itemDescription}</div>` : ''}
          <div class="additional-item__price">${this.formatMoney(itemPrice)}</div>
        </div>
        <div class="additional-item__quantity">
          <span class="quantity-badge">${cartItem.quantity || 1}</span>
        </div>
      </div>
    `;
  }

  updateCartIcon(cartResponse) {
    // 更新购物车图标数量
    const cartIconBubble = document.querySelector('#cart-icon-bubble');
    if (cartIconBubble && cartResponse.item_count !== undefined) {
      cartIconBubble.textContent = cartResponse.item_count;
      cartIconBubble.classList.toggle('cart-count-bubble--visible', cartResponse.item_count > 0);
    }
  }

  fallbackToCartNotification(cartResponse) {
    // 回退到原始的购物车通知
    const cartNotification = document.querySelector('cart-notification');
    if (cartNotification && typeof cartNotification.renderContents === 'function') {
      cartNotification.renderContents(cartResponse);
    }
  }

  formatMoney(cents) {
    // 简单的金额格式化函数
    if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
      return Shopify.formatMoney(cents);
    }
    return `$${(cents / 100).toFixed(2)}`;
  }

  stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  truncateText(text, length) {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  }

  handleBodyClick(evt) {
    const target = evt.target;
    if (target !== this.modal && !target.closest('product-preview-modal')) {
      const disclosure = target.closest('details-disclosure, header-menu');
      this.activeElement = disclosure ? disclosure.querySelector('summary') : null;
      this.close();
    }
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define('product-preview-modal', ProductPreviewModal);