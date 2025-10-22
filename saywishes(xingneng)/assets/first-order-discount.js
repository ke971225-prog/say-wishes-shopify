/* First Order Discount Popup System
 * Global JS injection for Shopify theme.
 * Features:
 *  - Bottom-center fixed main popup bar
 *  - Detail flow: detail -> email -> code reveal, with back navigation
 *  - Persistent storage: permanently close after discount acquisition
 *  - Configurable via window.__FIRST_ORDER_DISCOUNT__ (set in theme.liquid)
 *  - Accessible and responsive; performance-friendly
 */
(function () {
  var start = function () {
    var cfg = window.__FIRST_ORDER_DISCOUNT__ || {};
    var inEditor = !!(window.Shopify && Shopify.designMode);
    if (!cfg.enabled && !inEditor) return;
    var shopKey = cfg.shopPermanentDomain || 'shop';
    var acquiredKey = 'fod_acquired_' + shopKey;
    if (typeof window.localStorage !== 'undefined') {
      try {
        if (!inEditor && localStorage.getItem(acquiredKey) === 'true') return; // already acquired, never show again
      } catch (e) {}
    }

    // Avoid duplicate injection
    if (document.getElementById('fod-main-bar')) return;

    var percent = Number(cfg.discountPercent || 20);
    var code = String(cfg.discountCode || 'WELCOME20');
    var privacyUrl = cfg.privacyPolicyUrl || '/policies/privacy-policy';

    // Colors and typography
    var titleColor = cfg.titleColor || '#121212';
    var titleSize = Number(cfg.titleSize || 28);
    var titleWeight = Number(cfg.titleWeight || 700);
    var bodyColor = cfg.bodyColor || '#121212';
    var bodySize = Number(cfg.bodySize || 16);
    var bodyWeight = Number(cfg.bodyWeight || 400);
    var buttonColor = cfg.buttonColor || '#121212';

    // helper: variable replacement for configured texts
    var replaceVars = function (text) {
      var t = String(text == null ? '' : text);
      return t.replace(/\{\{\s*percent\s*\}\}/gi, String(percent))
              .replace(/\{\{\s*code\s*\}\}/gi, code)
              .replace(/\{\{\s*privacy_url\s*\}\}/gi, String(privacyUrl));
    };

    // Inject minimal CSS for components (scoped)
    var style = document.createElement('style');
    style.id = 'fod-styles';
    style.textContent = `
      .fod-hidden{display:none!important}
      .fod-main{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:9999;background:#fff;color:#121212;box-shadow:0 8px 24px rgba(0,0,0,.12);border-radius:999px;border:1px solid rgba(0,0,0,.08);display:flex;align-items:center;gap:12px;padding:10px 16px;font-size:14px;line-height:1.2;max-width:90vw}
      .fod-main__text{font-weight:600}
      .fod-main__btn{appearance:none;border:none;background:transparent;color:#121212;font-weight:600;cursor:pointer}
      .fod-main__close{cursor:pointer;border:none;background:transparent;font-size:16px;line-height:1;width:28px;height:28px;border-radius:999px;display:flex;align-items:center;justify-content:center}
      .fod-main__close:hover{background:rgba(0,0,0,.06)}

      .fod-modal{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:10000}
      .fod-modal__backdrop{position:absolute;inset:0;background:rgba(0,0,0,.32)}
      .fod-modal__dialog{position:relative;background:#EFEDE3;color:#121212;border-radius:12px;box-shadow:0 16px 48px rgba(0,0,0,.24);width:min(560px,92vw);padding:24px 20px}
      .fod-modal__header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
      .fod-title{color:${titleColor};font-size:${titleSize}px;font-weight:${titleWeight};margin:8px 0 4px}
      .fod-body{color:${bodyColor};font-size:${bodySize}px;font-weight:${bodyWeight};margin:6px 0 18px}
      .fod-actions{display:flex;gap:12px;align-items:center;margin-top:8px;flex-wrap:wrap}
      .fod-btn{appearance:none;border:none;border-radius:8px;padding:12px 18px;font-weight:700;cursor:pointer;background:${buttonColor};color:#fff}
      .fod-btn--secondary{background:transparent;color:#121212;border:1px solid rgba(0,0,0,.15)}
      .fod-close{border:none;background:transparent;cursor:pointer;font-size:18px;line-height:1;width:32px;height:32px;border-radius:999px;display:flex;align-items:center;justify-content:center}
      .fod-close:hover{background:rgba(0,0,0,.06)}
      .fod-back{display:inline-flex;align-items:center;gap:8px;cursor:pointer;color:#121212;font-size:14px;font-weight:600}

      .fod-input{width:100%;padding:12px 14px;border-radius:8px;border:1px solid rgba(0,0,0,.2);font-size:16px}
      .fod-helper{font-size:12px;color:#555;margin-top:8px}
      .fod-code{font-size:28px;font-weight:800;letter-spacing:1px;padding:12px 16px;border-radius:10px;border:1px dashed rgba(0,0,0,.2);background:#fff;display:inline-flex;align-items:center;gap:12px}
      .fod-copy{appearance:none;border:none;border-radius:6px;padding:8px 12px;cursor:pointer;background:${buttonColor};color:#fff}

      @media (max-width:480px){
        .fod-title{font-size:${Math.max(20, Math.round(titleSize*0.8))}px}
        .fod-body{font-size:${Math.max(14, Math.round(bodySize*0.9))}px}
        .fod-btn{padding:10px 14px}
        .fod-code{font-size:22px}
      }
    `;
    document.head.appendChild(style);

    // Build main bar
    var main = document.createElement('div');
    main.id = 'fod-main-bar';
    main.className = 'fod-main';
    main.setAttribute('aria-live', 'polite');
    var mainBarText = replaceVars(cfg.mainBarText || ('Get ' + percent + '% Off'));
    var detailsLabel = replaceVars(cfg.detailsButtonLabel || 'Details');
    var detailsAriaLabel = replaceVars(cfg.detailsAriaLabel || detailsLabel);
    var closeLabel = replaceVars(cfg.closeLabel || 'Close');
    main.innerHTML = `
      <span class="fod-main__text" aria-label="${mainBarText}">${mainBarText}</span>
      <button class="fod-main__btn" type="button" aria-haspopup="dialog" aria-controls="fod-dialog" aria-label="${detailsAriaLabel}">
        ${detailsLabel}
      </button>
      <button class="fod-main__close" type="button" aria-label="${closeLabel}">✕</button>
    `;
    document.body.appendChild(main);

    // Modal elements
    var modal = document.createElement('div');
    modal.className = 'fod-modal fod-hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'fod-title');
    modal.id = 'fod-dialog';
    // derive configurable texts for steps
    var detailTitle = replaceVars(cfg.detailTitle || 'Want {{percent}}% Off Your First Order?');
    var detailBody = replaceVars(cfg.detailBody || 'Enjoy exclusive savings on your first purchase.');
    var yesLabel = replaceVars(cfg.yesBtnLabel || 'Yes, Please');
    var continueLabel = replaceVars(cfg.continueBtnLabel || "No, I'll Continue Shopping");
    var emailTitle = replaceVars(cfg.emailTitle || 'Get {{percent}}% Off Your First Order');
    var emailBody = replaceVars(cfg.emailBody || 'Enter your email to receive your code.');
    var submitLabel = replaceVars(cfg.submitBtnLabel || 'Get My {{percent}}% Off');
    var codeTitle = replaceVars(cfg.codeTitle || 'Your Discount Code');
    var codeBody = replaceVars(cfg.codeBody || 'Use this code at checkout to redeem your discount.');
    var copyLabel = replaceVars(cfg.copyBtnLabel || 'Copy');
    var copyAriaLabel = replaceVars(cfg.copyAriaLabel || (copyLabel + ' discount code'));
    var doneLabel = replaceVars(cfg.doneBtnLabel || 'Got it');
    var backLabel = replaceVars(cfg.backLabel || 'Back');
    var closeLabel2 = closeLabel; // reuse
    var emailPlaceholder = replaceVars(cfg.emailPlaceholder || 'Email address');
    modal.innerHTML = `
      <div class="fod-modal__backdrop" data-fod="backdrop"></div>
      <div class="fod-modal__dialog" role="document">
        <div class="fod-modal__header">
          <button class="fod-back" type="button" data-fod="back" aria-label="${backLabel}">← ${backLabel}</button>
          <button class="fod-close" type="button" data-fod="close" aria-label="${closeLabel2}">✕</button>
        </div>
        <div class="fod-step" data-step="detail">
          <h2 class="fod-title" id="fod-title">${detailTitle}</h2>
          <p class="fod-body">${detailBody}</p>
          <div class="fod-actions">
            <button class="fod-btn" type="button" data-fod="yes">${yesLabel}</button>
            <button class="fod-btn fod-btn--secondary" type="button" data-fod="continue">${continueLabel}</button>
          </div>
        </div>
        <div class="fod-step fod-hidden" data-step="email">
          <h2 class="fod-title">${emailTitle}</h2>
          <p class="fod-body">${emailBody}</p>
          <input class="fod-input" type="email" inputmode="email" autocomplete="email" placeholder="${emailPlaceholder}" aria-label="${emailPlaceholder}" data-fod="email-input" />
          <div class="fod-actions">
            <button class="fod-btn" type="button" data-fod="submit">${submitLabel}</button>
            <button class="fod-btn fod-btn--secondary" type="button" data-fod="cancel">${continueLabel}</button>
          </div>
        </div>
        <div class="fod-step fod-hidden" data-step="code">
          <h2 class="fod-title">${codeTitle}</h2>
          <p class="fod-body">${codeBody}</p>
          <div class="fod-code"><span data-fod="code-text">${code}</span><button class="fod-copy" type="button" data-fod="copy" aria-label="${copyAriaLabel}">${copyLabel}</button></div>
          <div class="fod-actions">
            <button class="fod-btn" type="button" data-fod="done">${doneLabel}</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Helpers
    var qs = function (sel, root) { return (root || document).querySelector(sel); };
    var qsa = function (sel, root) { return (root || document).querySelectorAll(sel); };
    var showModal = function () {
      modal.classList.remove('fod-hidden');
      // focus management
      var firstBtn = qs('[data-fod="yes"]', modal) || qs('[data-fod="submit"]', modal) || qs('[data-fod="done"]', modal);
      if (firstBtn) firstBtn.focus();
    };
    var hideModal = function () { modal.classList.add('fod-hidden'); };
    var goStep = function (name) {
      qsa('.fod-step', modal).forEach(function (el) { el.classList.add('fod-hidden'); });
      var target = qs('.fod-step[data-step="' + name + '"]', modal);
      if (target) target.classList.remove('fod-hidden');
    };
    // helper: mark acquired and remove bottom bar
    var markAcquired = function () {
      try { localStorage.setItem(acquiredKey, 'true'); } catch (e) {}
      try { main && main.remove(); } catch (e) { if (main && main.parentNode) main.parentNode.removeChild(main); }
    };
    var permanentlyClose = function () {
      markAcquired();
      hideModal();
    };
    // helper: show copy success feedback
    var showCopySuccess = function(){
      var btn = qs('[data-fod="copy"]', modal);
      if (!btn) return;
      var original = btn.textContent;
      btn.textContent = 'Copied!';
      btn.disabled = true;
      setTimeout(function(){ btn.textContent = original; btn.disabled = false; }, 1200);
    };
    // helper: robust copy across browsers (Clipboard API -> execCommand fallback)
    var copyToClipboard = function(text){
      return new Promise(function(resolve){
        // Prefer Clipboard API when available
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function(){ resolve(true); }).catch(function(){
            // Fallback below
            fallback();
          });
          return;
        }
        fallback();
        function fallback(){
          var el = document.createElement('textarea');
          el.value = text;
          el.setAttribute('readonly', '');
          el.style.position = 'fixed';
          el.style.top = '0';
          el.style.left = '0';
          el.style.opacity = '0';
          document.body.appendChild(el);
          el.focus();
          el.select();
          try { el.setSelectionRange(0, el.value.length); } catch(e) {}
          var ok = false;
          try { ok = document.execCommand && document.execCommand('copy'); } catch(e) { ok = false; }
          document.body.removeChild(el);
          resolve(!!ok);
        }
      });
    };

    // Integrate native Shopify newsletter submission via hidden form
    var submitNewsletterEmail = function(email){
      var tpl = document.getElementById('fod-newsletter-template');
      if (!tpl) return Promise.resolve(false);
      var form = tpl.querySelector('form');
      if (!form) return Promise.resolve(false);
      var emailField = form.querySelector('input[name="contact[email]"]');
      if (!emailField) return Promise.resolve(false);
      try { emailField.value = email; } catch (e) {}
      // Ensure hCaptcha is wired to the form; if available, submit via protected flow WITHOUT full page navigation
      try {
        if (window.Shopify && window.Shopify.captcha && typeof window.Shopify.captcha.protect === 'function') {
          return new Promise(function(resolve){
            window.Shopify.captcha.protect(form, function(){
              try {
                var fd = new FormData(form);
                var action = form.getAttribute('action') || (window.location.pathname || '/contact');
                fetch(action, {
                  method: 'POST',
                  body: fd,
                  headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
                  credentials: 'same-origin'
                }).then(function(resp){ resolve(resp.ok); }).catch(function(){ resolve(false); });
              } catch (e) { resolve(false); }
            });
          });
        }
      } catch (e) {}
      // Fallback to AJAX submission instead of form.submit to avoid page reload
      var fd = new FormData(form);
      var action = form.getAttribute('action') || (window.location.pathname || '/contact');
      return fetch(action, {
        method: 'POST',
        body: fd,
        headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
        credentials: 'same-origin'
      }).then(function(resp){ return resp.ok; }).catch(function(){ return false; });
    };

    // Events
    qs('.fod-main__btn', main).addEventListener('click', function () { goStep('detail'); showModal(); });
    qs('.fod-main__close', main).addEventListener('click', function () { main.remove(); });

    modal.addEventListener('click', function (e) {
      var t = e.target;
      var attr = t.getAttribute('data-fod');
      if (attr === 'backdrop' || attr === 'close') { hideModal(); }
      if (attr === 'back') {
        // decide previous step
        if (!qs('.fod-step[data-step="detail"]').classList.contains('fod-hidden')) { hideModal(); }
        else if (!qs('.fod-step[data-step="email"]').classList.contains('fod-hidden')) { goStep('detail'); }
        else { goStep('email'); }
      }
      if (attr === 'yes') { goStep('email'); }
      if (attr === 'continue' || attr === 'cancel') { hideModal(); }
      if (attr === 'submit') {
      var emailInput = qs('[data-fod="email-input"]', modal);
      var email = String(emailInput && emailInput.value || '').trim();
      var valid = /.+@.+\..+/.test(email);
      if (!valid) {
        emailInput && (emailInput.style.borderColor = 'red');
        emailInput && emailInput.focus();
        return;
      }
      submitNewsletterEmail(email).then(function(ok){
        goStep('code');
      }).catch(function(){
        goStep('code');
      });
    }
      if (attr === 'copy') {
        var codeText = qs('[data-fod="code-text"]', modal).textContent;
        copyToClipboard(codeText).then(function(success){
          if (success) {
            showCopySuccess();
            permanentlyClose();
          } else {
            var manual = prompt('复制失败，请手动复制并点击确定：', codeText);
            if (manual !== null) {
              permanentlyClose();
            }
          }
        });
      }
      if (attr === 'done') { hideModal(); }
    });

    // Keyboard accessibility
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.classList.contains('fod-hidden')) hideModal();
    });
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(start, { timeout: 2000 });
  } else if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(start, 0);
  } else {
    document.addEventListener('DOMContentLoaded', start);
  }
  // Ensure visibility within Shopify Theme Editor when sections reload
  document.addEventListener('shopify:section:load', function(){
    if (!document.getElementById('fod-main-bar')) start();
  });
})();