import fs from 'fs';
import path from 'path';

// 参数解析：所有非 -- 开头的参数作为 URL 列表
const argv = process.argv.slice(2).filter(Boolean);
const URLS = argv.filter(a => !a.startsWith('--'));
const DEFAULT_URLS = ['https://wishesvideo.com/'];

const API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

function getFlag(name, fallback) {
  const idx = argv.findIndex(a => a === `--${name}`);
  if (idx !== -1 && idx + 1 < argv.length && !argv[idx + 1].startsWith('--')) {
    return argv[idx + 1];
  }
  const kv = argv.find(a => a.startsWith(`--${name}=`));
  if (kv) return kv.split('=').slice(1).join('=');
  return fallback;
}

const LOCALE = getFlag('locale', 'zh_CN');
// 默认输出到交付物目录，便于归档
const MD_OUT = getFlag('output', path.join('交付物', '性能报告.md'));
const JSON_OUT = getFlag('json', path.join('交付物', 'psi-results.json'));
const SUGGEST_OUT = getFlag('suggest', path.join('交付物', '优化建议.md'));
const STRATEGY = getFlag('strategy', 'both').toLowerCase(); // mobile | desktop | both
const TIMEOUT_MS = parseInt(getFlag('timeout', '30000'), 10);
const RETRIES = parseInt(getFlag('retries', '2'), 10);
const MAX_OPPS = parseInt(getFlag('max-opps', '10'), 10);
const API_KEY = getFlag('key', '');

function printUsage() {
  console.log(`\n用法: node fetch-psi-report.js <URL...?> [--locale zh_CN] [--output 交付物\\性能报告.md] [--json 交付物\\psi-results.json] [--suggest 交付物\\优化建议.md] [--strategy both|mobile|desktop] [--timeout 30000] [--retries 2] [--max-opps 10] [--key <Google API Key>]\n`);
  console.log(`示例: node fetch-psi-report.js https://wishesvideo.com/ https://wishesvideo.com/collections/all https://wishesvideo.com/products/example`);
}

if (argv.includes('--help')) {
  printUsage();
  process.exit(0);
}

async function safeFetch(url, { timeout = TIMEOUT_MS, retries = RETRIES } = {}) {
  let attempt = 0;
  while (attempt <= retries) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort('timeout'), timeout);
    try {
      const res = await fetch(url, { signal: ac.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      clearTimeout(t);
      if (attempt === retries) throw err;
      const backoff = Math.min(1000 * Math.pow(2, attempt), 5000);
      await new Promise(r => setTimeout(r, backoff));
      attempt++;
    }
  }
}

async function runForUrl(url, strategy) {
  const qs = new URLSearchParams({
    url,
    category: 'PERFORMANCE',
    strategy,
    locale: LOCALE,
  });
  if (API_KEY) qs.append('key', API_KEY);
  const endpoint = `${API}?${qs.toString()}`;
  const res = await safeFetch(endpoint).catch(err => ({ ok: false, statusText: String(err) }));
  if (!res || !res.ok) {
    throw new Error(`PSI ${strategy} 请求失败(${url}): ${res && res.statusText || 'unknown error'}`);
  }
  const json = await res.json();
  return json;
}

function getScore(json) {
  try {
    const score = json.lighthouseResult.categories.performance.score;
    return typeof score === 'number' ? Math.round(score * 100) : '待确认';
  } catch { return '待确认'; }
}

function pickMetrics(json) {
  const a = k => json?.lighthouseResult?.audits?.[k]?.displayValue ?? '待确认';
  return {
    FCP: a('first-contentful-paint'),
    LCP: a('largest-contentful-paint'),
    TBT: a('total-blocking-time'),
    CLS: a('cumulative-layout-shift'),
    SpeedIndex: a('speed-index'),
  };
}

function pickOpportunities(json, limit = MAX_OPPS) {
  const opp = json?.lighthouseResult?.audits || {};
  const keys = Object.keys(opp).filter(k => opp[k]?.details?.type === 'opportunity');
  return keys.map(k => ({
    id: k,
    title: opp[k]?.title || k,
    description: opp[k]?.description || '',
    overallSavingsMs: opp[k]?.details?.overallSavingsMs ?? 0,
  }))
  .sort((x, y) => (y.overallSavingsMs - x.overallSavingsMs))
  .slice(0, limit);
}

function formatMd(tag, score, metrics, opps) {
  const lines = [];
  lines.push(`#### ${tag} 分数: ${score}`);
  lines.push('核心指标:');
  lines.push(`- FCP: ${metrics.FCP}`);
  lines.push(`- LCP: ${metrics.LCP}`);
  lines.push(`- TBT: ${metrics.TBT}`);
  lines.push(`- CLS: ${metrics.CLS}`);
  lines.push(`- Speed Index: ${metrics.SpeedIndex}`);
  lines.push(`主要机会（按潜在节省排序，Top ${MAX_OPPS}）:`);
  opps.forEach(o => {
    lines.push(`- ${o.title} | 预计可节省: ${Math.round(o.overallSavingsMs)} ms`);
  });
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const targets = URLS.length ? URLS : DEFAULT_URLS;
  console.log(`开始抓取 PSI 数据，共 ${targets.length} 个 URL...`);
  const strategies = STRATEGY === 'both' ? ['MOBILE', 'DESKTOP'] : [STRATEGY.toUpperCase()];

  const allResults = {};
  for (const url of targets) {
    allResults[url] = {};
    for (const s of strategies) {
      allResults[url][s.toLowerCase()] = await runForUrl(url, s);
    }
  }

  // 写入 JSON
  fs.writeFileSync(JSON_OUT, JSON.stringify(allResults, null, 2));

  // 组装 Markdown
  const sections = [];
  const now = new Date().toISOString().replace('T', ' ').replace(/\..+/, '');
  sections.push(`\n\n## PSI 实时抓取（${now}）`);

  for (const url of targets) {
    sections.push(`\n### 页面: ${url}`);
    const r = allResults[url];
    if (r.mobile) {
      const score = getScore(r.mobile);
      const metrics = pickMetrics(r.mobile);
      const opps = pickOpportunities(r.mobile, MAX_OPPS);
      sections.push(formatMd('移动端', score, metrics, opps));
    }
    if (r.desktop) {
      const score = getScore(r.desktop);
      const metrics = pickMetrics(r.desktop);
      const opps = pickOpportunities(r.desktop, MAX_OPPS);
      sections.push(formatMd('桌面端', score, metrics, opps));
    }
  }

  const md = sections.join('\n');

  try {
    const prev = fs.existsSync(MD_OUT) ? fs.readFileSync(MD_OUT, 'utf-8') : '';
    fs.writeFileSync(MD_OUT, prev + md);
    console.log(`已写入 ${MD_OUT}`);
  } catch (e) {
    console.error(`写入 ${MD_OUT} 失败:`, e);
  }

  const advice = [
    `\n\n> 若需要原始 JSON，请查看 ${JSON_OUT}。`,
    `> 若需中文界面文案，请保持 locale=${LOCALE}；可改为 zh_TW/en。`,
    `> 可传多个 URL，同步抓取集合页/产品页/首页等。`,
    API_KEY ? `> 已使用提供的 API Key（提高配额稳定性）。` : `> 未提供 API Key（使用匿名配额）。`
  ].filter(Boolean).join('\n');
  fs.appendFileSync(SUGGEST_OUT, md + advice, { flag: 'a' });
}

main().catch(e => {
  console.error('抓取失败:', e.message);
  printUsage();
  process.exit(1);
});