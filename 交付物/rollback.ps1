#requires -Version 5.1
<#!
  Shopify 主题性能优化回滚脚本
  - 恢复 layout/theme.liquid 的 CSS 异步加载为原始 stylesheet_tag 模式
  - 恢复 sections/hero-section.liquid 的预加载段落为隐藏占位 <img> 模式
  使用方法：
    1) 以管理员或有权限用户在 PowerShell 运行：
       Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
       & "d:\独立站\网站网速\性能\交付物\rollback.ps1"
    2) 脚本会在同目录生成 .bak 备份文件。
!#>

$ErrorActionPreference = 'Stop'

Function Replace-BlockExact {
  param(
    [Parameter(Mandatory=$true)][string]$File,
    [Parameter(Mandatory=$true)][string]$From,
    [Parameter(Mandatory=$true)][string]$To
  )
  if (-not (Test-Path $File)) { throw "File not found: $File" }
  $raw = Get-Content -Path $File -Raw
  $escFrom = [Regex]::Escape($From)
  $new = [Regex]::Replace($raw, $escFrom, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $To })
  if ($new -eq $raw) { Write-Warning "No match found to replace in $File" } else {
    Copy-Item -LiteralPath $File -Destination ($File + '.bak') -Force
    Set-Content -Path $File -Value $new -Encoding UTF8
    Write-Host "Replaced exact block in $File" -ForegroundColor Green
  }
}

Function Replace-HeroPreload-WithHiddenImgs {
  param(
    [Parameter(Mandatory=$true)][string]$File
  )
  if (-not (Test-Path $File)) { throw "File not found: $File" }
  $raw = Get-Content -Path $File -Raw
  $startAnchor = '{% comment %} Preload hero background images to improve LCP discovery and avoid duplicate requests {% endcomment %}'
  $endAnchor = '<div class="hero-content">'
  $startIdx = $raw.IndexOf($startAnchor)
  if ($startIdx -lt 0) { Write-Warning "Hero preload start anchor not found"; return }
  $endIdx = $raw.IndexOf($endAnchor, $startIdx)
  if ($endIdx -lt 0) { Write-Warning "Hero preload end anchor not found"; return }

  $before = $raw.Substring(0, $startIdx)
  $after = $raw.Substring($endIdx)

  $replacement = @"
  {% if section.settings.hero_image != blank %}
    <img class="visually-hidden-bg-image visually-hidden-bg-image--desktop" src="{{ section.settings.hero_image | image_url: width: 2400 }}" alt="{{ section.settings.hero_image_alt | default: 'Hero image' }}" loading="lazy" decoding="async" width="2400" height="1200">
  {% endif %}
  {% if section.settings.hero_image_mobile != blank %}
    <img class="visually-hidden-bg-image visually-hidden-bg-image--mobile" src="{{ section.settings.hero_image_mobile | image_url: width: 1400 }}" alt="{{ section.settings.hero_image_alt | default: 'Hero image' }}" loading="lazy" decoding="async" width="1400" height="700">
  {% elsif section.settings.hero_image != blank %}
    <img class="visually-hidden-bg-image visually-hidden-bg-image--mobile" src="{{ section.settings.hero_image | image_url: width: 1400 }}" alt="{{ section.settings.hero_image_alt | default: 'Hero image' }}" loading="lazy" decoding="async" width="1400" height="700">
  {% endif %}
  <div class="hero-content">
"@

  $new = $before + $replacement + $after
  Copy-Item -LiteralPath $File -Destination ($File + '.bak') -Force
  Set-Content -Path $File -Value $new -Encoding UTF8
  Write-Host "Replaced hero preload with hidden <img> block in $File" -ForegroundColor Green
}

# Paths
$theme = 'd:\独立站\网站网速\性能\saywishes(xingneng)\layout\theme.liquid'
$hero  = 'd:\独立站\网站网速\性能\saywishes(xingneng)\sections\hero-section.liquid'
$related = 'd:\独立站\网站网速\性能\saywishes(xingneng)\sections\related-products.liquid'
$collectionBanner = 'd:\独立站\网站网速\性能\saywishes(xingneng)\sections\main-collection-banner.liquid'

# 1) Revert main async CSS block
$from1 = @"
    <link rel="stylesheet" href="{{ 'base.min.css' | asset_url }}" media="print" onload="this.media='all'">
    <link rel="stylesheet" href="{{ 'seo-performance.css' | asset_url }}" media="print" onload="this.media='all'">
    <link rel="stylesheet" href="{{ 'component-list-payment.css' | asset_url }}" media="print" onload="this.media='all'">
    <!-- Load critical CSS async; above-the-fold critical styles are already inline -->
    <link rel="stylesheet" href="{{ 'critical.css' | asset_url }}" media="print" onload="this.media='all'">
    <link rel="stylesheet" href="{{ 'component-cart-items.css' | asset_url }}" media="print" onload="this.media='all'">
"@
$to1 = @"
    {{ 'base.min.css' | asset_url | stylesheet_tag }}
    {{ 'seo-performance.css' | asset_url | stylesheet_tag }}
    {{ 'component-list-payment.css' | asset_url | stylesheet_tag }}
    <!-- Load critical CSS inline for faster rendering -->
    <link rel="stylesheet" href="{{ 'critical.css' | asset_url }}" media="all">
    <link rel="stylesheet" href="{{ 'component-cart-items.css' | asset_url }}" media="print" onload="this.media='all'">
"@
Replace-BlockExact -File $theme -From $from1 -To $to1

# 2) Revert cart drawer CSS block
$from2 = @"
    {%- if settings.cart_type == 'drawer' -%}
      <link rel="stylesheet" href="{{ 'component-cart-drawer.css' | asset_url }}" media="print" onload="this.media='all'">
      <link rel="stylesheet" href="{{ 'component-cart.css' | asset_url }}" media="print" onload="this.media='all'">
      <link rel="stylesheet" href="{{ 'component-totals.css' | asset_url }}" media="print" onload="this.media='all'">
      <link rel="stylesheet" href="{{ 'component-price.css' | asset_url }}" media="print" onload="this.media='all'">
      <link rel="stylesheet" href="{{ 'component-discounts.css' | asset_url }}" media="print" onload="this.media='all'">
      <link rel="stylesheet" href="{{ 'custom-cart-pricing.css' | asset_url }}" media="print" onload="this.media='all'">
      <script src="{{ 'cart-price-sync-enhanced.js' | asset_url }}" defer></script>
    {%- elsif settings.cart_type == 'notification' -%}
      <link rel="stylesheet" href="{{ 'component-cart-notification.css' | asset_url }}" media="print" onload="this.media='all'">
      <link rel="stylesheet" href="{{ 'component-product-preview-modal.css' | asset_url }}" media="print" onload="this.media='all'">
    {%- endif -%}
"@
$to2 = @"
    {%- if settings.cart_type == 'drawer' -%}
      {{ 'component-cart-drawer.css' | asset_url | stylesheet_tag }}
      {{ 'component-cart.css' | asset_url | stylesheet_tag }}
      {{ 'component-totals.css' | asset_url | stylesheet_tag }}
      {{ 'component-price.css' | asset_url | stylesheet_tag }}
      {{ 'component-discounts.css' | asset_url | stylesheet_tag }}
      {{ 'custom-cart-pricing.css' | asset_url | stylesheet_tag }}
      <script src="{{ 'cart-price-sync-enhanced.js' | asset_url }}" defer></script>
    {%- elsif settings.cart_type == 'notification' -%}
      <link rel="stylesheet" href="{{ 'component-cart-notification.css' | asset_url }}" media="print" onload="this.media='all'">
      <link rel="stylesheet" href="{{ 'component-product-preview-modal.css' | asset_url }}" media="print" onload="this.media='all'">
    {%- endif -%}
"@
Replace-BlockExact -File $theme -From $from2 -To $to2

# 3) Revert hero-section preload to hidden images
Replace-HeroPreload-WithHiddenImgs -File $hero

Write-Host "Rollback completed. Please redeploy/reload theme and validate." -ForegroundColor Cyan