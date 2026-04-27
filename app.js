/* ============================================
   Buddyon 案件一覧 - アプリケーションロジック
   ============================================ */

// ============================================
// ⚠️ 重要：応募送信先の設定
// ============================================
// 既存のapp.jsで使っている応募送信先URL（Make Webhook等）を以下に設定してください。
// 空文字のままだと、応募送信時にコンソールにログ出力するだけになります（テスト用）。
const APPLICATION_WEBHOOK_URL = ''; // 例: 'https://hook.us2.make.com/xxxxxx'

// ============================================
// 状態管理
// ============================================
const state = {
  items: [],
  updated: '',
  filters: {
    keyword: '',
    ankenType: 'all',
    tankaPriceType: 'all',
    area: 'all',
    workstyle: 'all',
    features: { newbie: false, highrate: false, immediate: false },
  },
  selected: null,
};

// ============================================
// データ取得
// ============================================
async function loadData() {
  try {
    const res = await fetch('data.json?t=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    state.items = Array.isArray(data.items) ? data.items : [];
    state.updated = data.updated || '';
    document.getElementById('loadingState').hidden = true;
    updateStats();
    renderUpdate();
    render();
  } catch (err) {
    console.error('データ読み込み失敗:', err);
    document.getElementById('loadingState').hidden = true;
    document.getElementById('emptyState').hidden = false;
    document.querySelector('.empty-title').textContent = '読み込みに失敗しました';
    document.querySelector('.empty-sub').textContent = 'しばらくしてから再度お試しください';
  }
}

// ============================================
// 統計表示（カテゴリ別件数も含む）
// ============================================
function updateStats() {
  const total = state.items.length;
  const spot = state.items.filter(i => i.ankenType === 'スポット').length;
  const fixed = state.items.filter(i => i.ankenType === '固定').length;
  const fullcomm = state.items.filter(i => i.ankenType === 'フルコミッション').length;
  document.getElementById('statTotal').textContent = total;
  document.getElementById('statSpot').textContent = spot;
  document.getElementById('statFixed').textContent = fixed;
  // 種別カウント
  const wtフル = document.getElementById('wtCountフルコミッション');
  const wt固定 = document.getElementById('wtCount固定');
  const wtスポット = document.getElementById('wtCountスポット');
  if (wtフル) wtフル.textContent = fullcomm + '件';
  if (wt固定) wt固定.textContent = fixed + '件';
  if (wtスポット) wtスポット.textContent = spot + '件';
}

function renderUpdate() {
  if (!state.updated) return;
  try {
    const d = new Date(state.updated);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    document.getElementById('resultUpdate').textContent =
      `Last update ${y}.${m}.${day} ${h}:${min}`;
  } catch (e) {
    document.getElementById('resultUpdate').textContent = '';
  }
}

// ============================================
// フィルタ判定ヘルパー
// ============================================
function getArea(item) {
  const text = (item.kinmuChi || '') + ' ' + (item.ankenName || '');
  if (/全国/.test(text)) return '全国';
  if (/東京|品川|秋葉原|板橋|新宿|渋谷|池袋|上野|銀座|赤坂|六本木|虎ノ門|神田|有楽町/.test(text)) return '東京';
  if (/神奈川|横浜|川崎|上大岡|町田|藤沢|湘南/.test(text)) return '神奈川';
  if (/埼玉|川口|大宮|浦和|所沢|川越|越谷|東松山/.test(text)) return '埼玉';
  if (/千葉|船橋|柏|松戸|市川|稲毛/.test(text)) return '千葉';
  return 'その他';
}

function isNewbieOK(item) {
  const text = (item.skillYoken || '') + ' ' + (item.biko || '');
  return /未経験(OK|歓迎|可|相談)|微経験/.test(text);
}

function isHighRate(item) {
  const min = Number(item.tankaPriceMin) || 0;
  const t = item.tankaPriceType;
  if (t === '時給' && min >= 2000) return true;
  if (t === '日給' && min >= 20000) return true;
  if (t === '月給' && min >= 350000) return true;
  return false;
}

function isImmediate(item) {
  return /即日|即\s*〜|即時|今すぐ/.test(item.kaishi || '');
}

function matchWorkstyle(item, style) {
  const days = item.kadoNissu || '';
  const kaishi = item.kaishi || '';
  if (style === 'single') return /単日|^[12]日間?$|単発/.test(days);
  if (style === 'parttime') return /週[1-4]|2〜3日|3〜4日|3日|4日/.test(days);
  if (style === 'long') return /長期|半年|継続/.test(days + ' ' + kaishi + ' ' + (item.biko || ''));
  return true;
}

function matchKeyword(item, kw) {
  if (!kw) return true;
  const haystack = [
    item.ankenName, item.kinmuChi, item.biko, item.skillYoken,
    item.industry, item.kaishi, item.kadoJikan, item.kadoNissu, item.tankaDisplay,
  ].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(kw.toLowerCase());
}

// ============================================
// フィルタ適用
// ============================================
function applyFilters(items) {
  return items.filter(item => {
    const f = state.filters;
    if (f.ankenType !== 'all' && item.ankenType !== f.ankenType) return false;
    if (f.tankaPriceType !== 'all' && item.tankaPriceType !== f.tankaPriceType) return false;
    if (f.area !== 'all' && getArea(item) !== f.area) return false;
    if (f.workstyle !== 'all' && !matchWorkstyle(item, f.workstyle)) return false;
    if (f.features.newbie && !isNewbieOK(item)) return false;
    if (f.features.highrate && !isHighRate(item)) return false;
    if (f.features.immediate && !isImmediate(item)) return false;
    if (!matchKeyword(item, f.keyword)) return false;
    return true;
  });
}

// ============================================
// 案件カード描画
// ============================================
function render() {
  const grid = document.getElementById('cardGrid');
  const empty = document.getElementById('emptyState');
  const filtered = applyFilters(state.items);

  document.getElementById('resultCount').textContent = filtered.length;

  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  grid.innerHTML = filtered.map((item, idx) => {
    return `
      <div class="card" data-index="${idx}" style="animation-delay: ${Math.min(idx * 40, 800)}ms">
        <div class="card-header">
          <span class="card-tag type-${escAttr(item.ankenType)}">
            ${escHtml(item.ankenType || '')}
          </span>
        </div>
        <h3 class="card-title">${escHtml(item.ankenName || '案件名未設定')}</h3>
        <div class="card-price">
          <div class="card-price-label">REWARD</div>
          <div class="card-price-value">${escHtml(item.tankaDisplay || '応相談')}</div>
        </div>
        <div class="card-meta">
          ${metaRow('AREA', item.kinmuChi)}
          ${metaRow('START', item.kaishi)}
          ${metaRow('TIME', item.kadoJikan || item.kadoNissu)}
        </div>
        <div class="card-cta">
          <span>詳細を見る</span>
          <span class="card-cta-arrow">→</span>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
      const idx = Number(card.dataset.index);
      openDetail(filtered[idx]);
    });
  });
}

function metaRow(label, text) {
  if (!text) return '';
  return `
    <div class="meta-row">
      <span class="meta-icon">${label}</span>
      <span class="meta-text">${escHtml(text)}</span>
    </div>
  `;
}

// ============================================
// 詳細モーダル
// ============================================
function openDetail(item) {
  state.selected = item;

  const detailItems = [
    ['勤務地', item.kinmuChi],
    ['開始時期', item.kaishi],
    ['稼働時間', item.kadoJikan],
    ['稼働日数', item.kadoNissu],
    ['スキル要件', item.skillYoken],
    ['備考', item.biko],
    ['面談フロー', item.mentanFlow],
  ].filter(([, v]) => v && v.trim());

  const html = `
    <div class="detail-eyebrow">— DETAIL —</div>
    <div class="detail-header">
      <div class="detail-badges">
        <span class="card-tag type-${escAttr(item.ankenType)}">
          ${escHtml(item.ankenType || '')}
        </span>
      </div>
      <h2 class="detail-title">${escHtml(item.ankenName || '')}</h2>
      <div class="detail-price">
        <div class="detail-price-label">REWARD</div>
        <div class="detail-price-value">${escHtml(item.tankaDisplay || '応相談')}</div>
      </div>
    </div>
    <div class="detail-grid">
      ${detailItems.map(([k, v]) => `
        <div class="detail-item">
          <div class="detail-key">${escHtml(k)}</div>
          <div class="detail-val">${escHtml(v)}</div>
        </div>
      `).join('')}
    </div>
  `;
  document.getElementById('detailContent').innerHTML = html;
  showModal('detailModal');
}

// ============================================
// 応募モーダル
// ============================================
function openApply() {
  if (!state.selected) return;
  document.getElementById('applyAnkenName').textContent = state.selected.ankenName || '';
  hideModal('detailModal');
  ['fldName', 'fldPhone', 'fldEmail', 'fldPR'].forEach(id => {
    document.getElementById(id).value = '';
  });
  showModal('applyModal');
}

async function submitApply() {
  const name = document.getElementById('fldName').value.trim();
  const phone = document.getElementById('fldPhone').value.trim();
  const email = document.getElementById('fldEmail').value.trim();
  const pr = document.getElementById('fldPR').value.trim();

  if (!name) { alert('お名前を入力してください'); return; }
  if (!phone) { alert('電話番号を入力してください'); return; }

  const payload = {
    ankenName: state.selected ? state.selected.ankenName : '',
    industry: state.selected ? state.selected.industry : '',
    ankenType: state.selected ? state.selected.ankenType : '',
    name, phone, email, pr,
    submittedAt: new Date().toISOString(),
  };

  const btn = document.getElementById('submitApplyBtn');
  btn.disabled = true;
  btn.textContent = '送信中...';

  try {
    if (APPLICATION_WEBHOOK_URL) {
      const res = await fetch(APPLICATION_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('送信に失敗しました');
    } else {
      console.log('[応募データ]', payload);
      await new Promise(r => setTimeout(r, 500));
    }
    hideModal('applyModal');
    showToast();
  } catch (err) {
    console.error(err);
    alert('送信に失敗しました。お手数ですが時間をおいて再度お試しください。');
  } finally {
    btn.disabled = false;
    btn.textContent = '応募を送信する';
  }
}

// ============================================
// モーダル制御
// ============================================
function showModal(id) {
  document.getElementById(id).hidden = false;
  document.body.style.overflow = 'hidden';
}
function hideModal(id) {
  document.getElementById(id).hidden = true;
  if (document.querySelectorAll('.modal:not([hidden])').length === 0) {
    document.body.style.overflow = '';
  }
}

// ============================================
// トースト
// ============================================
function showToast() {
  const toast = document.getElementById('toast');
  toast.hidden = false;
  setTimeout(() => { toast.hidden = true; }, 3500);
}

// ============================================
// HTMLエスケープ
// ============================================
function escHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escAttr(s) {
  if (s == null) return '';
  return String(s).replace(/[^a-zA-Z0-9ぁ-んァ-ヶ一-龯_-]/g, '');
}

// ============================================
// 種別カードクリックでフィルタ連動
// ============================================
function setupWorktypeClick() {
  document.querySelectorAll('.worktype-card').forEach(card => {
    card.addEventListener('click', () => {
      const wt = card.dataset.worktype;
      // 同じカードを再クリックなら解除
      if (state.filters.ankenType === wt) {
        clearWorktypeSelection();
      } else {
        state.filters.ankenType = wt;
        updateWorktypeUI();
        render();
      }
      document.getElementById('new').scrollIntoView({ behavior: 'smooth' });
    });
  });
  // 解除ボタン
  const clearBtn = document.getElementById('activeFilterClear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      clearWorktypeSelection();
      render();
    });
  }
}

// 働き方UIの同期（カードハイライト＋選択バー）
function updateWorktypeUI() {
  const wt = state.filters.ankenType;
  // カードハイライト
  document.querySelectorAll('.worktype-card').forEach(card => {
    card.classList.toggle('is-active', card.dataset.worktype === wt);
  });
  // 選択バー
  const bar = document.getElementById('activeFilterBar');
  const tag = document.getElementById('activeFilterTag');
  if (wt && wt !== 'all') {
    const labels = {
      'フルコミッション': 'フルコミッション',
      '固定': '固定案件',
      'スポット': 'スポット案件',
    };
    tag.textContent = labels[wt] || wt;
    bar.hidden = false;
  } else {
    bar.hidden = true;
  }
}

function clearWorktypeSelection() {
  state.filters.ankenType = 'all';
  updateWorktypeUI();
}

// ============================================
// モバイルメニュー
// ============================================
function setupMobileMenu() {
  const btn = document.getElementById('menuBtn');
  const menu = document.getElementById('mobileMenu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => {
    const isOpen = !menu.hidden;
    menu.hidden = isOpen;
    btn.classList.toggle('open', !isOpen);
  });
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menu.hidden = true;
      btn.classList.remove('open');
    });
  });
}

// ============================================
// イベント登録
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  // フィルタチップ
  document.querySelectorAll('.filter-chips').forEach(group => {
    const filterKey = group.dataset.filter;
    group.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        group.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.filters[filterKey] = chip.dataset.value;
        render();
      });
    });
  });

  // 検索ボックス
  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');
  let searchTimer = null;
  searchInput.addEventListener('input', (e) => {
    const v = e.target.value;
    searchClear.hidden = !v;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.filters.keyword = v.trim();
      render();
    }, 200);
  });
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.hidden = true;
    state.filters.keyword = '';
    render();
    searchInput.focus();
  });

  // こだわり条件チェックボックス
  document.querySelectorAll('.filter-checks input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const feature = cb.dataset.feature;
      state.filters.features[feature] = cb.checked;
      render();
    });
  });

  // リセットボタン
  document.getElementById('filterReset').addEventListener('click', resetFilters);

  // モーダル閉じる
  document.querySelectorAll('[data-close]').forEach(el => {
    el.addEventListener('click', () => {
      const target = el.dataset.close;
      if (target === 'detail') hideModal('detailModal');
      if (target === 'apply') hideModal('applyModal');
    });
  });

  document.getElementById('openApplyBtn').addEventListener('click', openApply);
  document.getElementById('submitApplyBtn').addEventListener('click', submitApply);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideModal('detailModal');
      hideModal('applyModal');
    }
  });

  setupWorktypeClick();
  setupMobileMenu();
  loadData();
});

// ============================================
// フィルタリセット
// ============================================
function resetFilters() {
  state.filters = {
    keyword: '',
    ankenType: 'all',
    tankaPriceType: 'all',
    area: 'all',
    workstyle: 'all',
    features: { newbie: false, highrate: false, immediate: false },
  };
  // UI同期
  document.getElementById('searchInput').value = '';
  document.getElementById('searchClear').hidden = true;
  document.querySelectorAll('.filter-chips').forEach(group => {
    group.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    const all = group.querySelector('.chip[data-value="all"]');
    if (all) all.classList.add('active');
  });
  document.querySelectorAll('.filter-checks input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
  });
  // 働き方カードもリセット
  updateWorktypeUI();
  render();
  document.getElementById('worktype').scrollIntoView({ behavior: 'smooth' });
}
