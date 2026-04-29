/* ============================================================
   ALMENTOR QA DASHBOARD — script.js
   Version: 2.0 | Dynamic CSV engine + Chart.js + Auto-refresh
   ============================================================ */

// ─── CONFIGURATION ──────────────────────────────────────────
const CONFIG = {
  // Replace these URLs with your published Google Sheets CSV links.
  // Go to: File → Share → Publish to web → Choose sheet → CSV → Copy link
  SHEETS: {
    projects: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv&gid=PROJECTS_GID',
    b2c:      'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv&gid=B2C_GID',
  },
  REFRESH_INTERVAL: 30000, // 30 seconds
  ROWS_PER_PAGE: 20,
};

// ─── STATE ──────────────────────────────────────────────────
const state = {
  activeTab: 'projects',
  allRows: [],
  filteredRows: [],
  headers: [],
  currentPage: 1,
  sortCol: -1,
  sortDir: 1,
  charts: {},
  lastUpdated: null,
  refreshTimer: null,
  useLocalData: false,   // true when running from file:// without live sheets
};

// ─── SAMPLE DATA (fallback when no live Google Sheet is configured) ──
const SAMPLE_DATA = {
  projects: {
    headers: ['Country', 'Project', 'Content Member', 'Content Crit', 'Content Min', 'Content Total',
              'QA Member', 'QA Crit', 'QA Min', 'QA Total',
              'Design Member', 'Design Crit', 'Design Min', 'Design Total',
              'Media Member', 'Media Crit', 'Media Min', 'Media Total',
              'LMS Member', 'LMS Crit', 'LMS Min', 'LMS Total',
              'Grand Total', 'Quality %'],
    rows: [
      ['KSA', 'Alinma Bank', '', '7', '1', '8', '', '5', '0', '5', '', '5', '0', '5', '', '0', '0', '0', '', '18', '0', '18', '36', '95.08%'],
      ['KSA', 'Financial Academy', '', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '0', '100.00%'],
      ['KSA', 'SIRC', '', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '0', '100.00%'],
      ['Egypt', 'GIZ', '', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '0', '100.00%'],
      ['Oman', 'MOJ', '', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '0', '100.00%'],
      ['Oman', 'OmanTel', '', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '0', '100.00%'],
      ['Oman', 'Oman Vision', '', '2', '1', '3', '', '1', '0', '1', '', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '4', '98.20%'],
      ['Oman', 'Sohar Bank', '', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '0', '100.00%'],
      ['UAE', 'SHERAA', '', '1', '0', '1', '', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '1', '99.50%'],
    ]
  },
  b2c: {
    headers: ['Project', 'Content Member', 'Content Crit', 'Content Min', 'Content Total',
              'QA Member', 'QA Crit', 'QA Min', 'QA Total',
              'Media Member', 'Media Crit', 'Media Min', 'Media Total',
              'Grand Total', 'Quality %'],
    rows: [
      ['Version Management', 'Lamis', '1', '1', '2', '', '1', '1', '2', '', '6', '2', '8', '12', '96%'],
      ['Data Integration', 'Lamis', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '0', '100%'],
      ['Outcome Monitoring', 'Lamis', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '0', '100%'],
      ['Budget Planning', 'Lamis', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '0', '100%'],
      ['Intuition-based Decision Making', 'Lamis', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '0', '100%'],
      ['Forecast Development', 'Lamis', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '0', '100%'],
      ['Research Design Development (White)', 'Lamis', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '0', '100%'],
      ['Objection Handling (White)', 'Lamis', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '0', '100%'],
      ['Risk Identification (Gulf)', 'Lamis', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '0', '100%'],
      ['Model Evaluation (Gulf)', 'Lamis', '0', '0', '0', '', '0', '0', '0', '', '0', '0', '0', '0', '100%'],
    ]
  }
};

// ─── COLUMN INDEX HELPERS ────────────────────────────────────
const COL = {
  find: (headers, keywords) => {
    const kw = (Array.isArray(keywords) ? keywords : [keywords]).map(k => k.toLowerCase());
    return headers.findIndex(h => kw.some(k => h.toLowerCase().includes(k)));
  },
  num: (row, idx) => {
    if (idx < 0 || idx >= row.length) return 0;
    const v = String(row[idx]).replace(/[^0-9.\-]/g, '');
    return parseFloat(v) || 0;
  },
  str: (row, idx) => {
    if (idx < 0 || idx >= row.length) return '';
    return String(row[idx]).trim();
  }
};

// ─── CSV PARSING (from Google Sheets or local fallback) ──────
async function fetchSheetData(tab) {
  const url = CONFIG.SHEETS[tab];
  const isConfigured = url && !url.includes('YOUR_SHEET_ID');

  if (!isConfigured) {
    // Use bundled sample data
    state.useLocalData = true;
    return SAMPLE_DATA[tab];
  }

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return parseProjectsCSV(text, tab);
  } catch (err) {
    console.warn('Fetch failed, using sample data:', err.message);
    state.useLocalData = true;
    return SAMPLE_DATA[tab];
  }
}

function parseProjectsCSV(text, tab) {
  // Use PapaParse if available
  const parsed = Papa.parse(text, { skipEmptyLines: false });
  const rawRows = parsed.data;

  // Find the header row: it's the first row with "Crit" or "Project" or "Country"
  let headerRowIdx = -1;
  for (let i = 0; i < rawRows.length; i++) {
    const joined = rawRows[i].join(' ').toLowerCase();
    if (joined.includes('crit') || (joined.includes('project') && joined.includes('total'))) {
      // Check next row for sub-headers
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx < 0) return SAMPLE_DATA[tab];

  // Build merged headers from two header rows (if layout uses merged cells pattern)
  const topRow = rawRows[headerRowIdx] || [];
  const subRow = rawRows[headerRowIdx + 1] || [];

  let headers = [];
  let lastGroup = '';
  for (let c = 0; c < Math.max(topRow.length, subRow.length); c++) {
    const top = String(topRow[c] || '').replace(/[\n\r]/g, ' ').trim();
    const sub = String(subRow[c] || '').replace(/[\n\r]/g, ' ').trim();
    if (top) lastGroup = top;
    const label = sub ? (lastGroup && lastGroup !== sub ? `${lastGroup} ${sub}` : sub) : (top || `Col${c}`);
    headers.push(label);
  }

  // Data rows start after the two header rows
  const dataStartIdx = subRow.some(c => String(c).trim().length > 0) ? headerRowIdx + 2 : headerRowIdx + 1;
  const rows = rawRows
    .slice(dataStartIdx)
    .filter(row => {
      const joined = row.join('').replace(/,/g, '').trim();
      if (!joined) return false;
      const s = row[0] ? String(row[0]).trim() : '';
      const s1 = row[1] ? String(row[1]).trim() : '';
      // Skip totals/divider rows
      if (s.includes('TOTALS') || s1.includes('TOTALS')) return false;
      if (s.startsWith('📊') || s1.startsWith('📊')) return false;
      return true;
    })
    .map(row => row.map(c => String(c || '').trim()));

  return { headers, rows };
}

// ─── ANALYTICS ENGINE ────────────────────────────────────────
function computeAnalytics(headers, rows) {
  const critIdx  = COL.find(headers, ['crit']);
  const minIdx   = COL.find(headers, ['min.', 'minor', 'min']);
  const totalIdx = COL.find(headers, ['grand total', 'total']);
  const qualIdx  = COL.find(headers, ['quality %', 'quality rate', 'quality']);

  let totalComments = 0, totalCrit = 0, totalMin = 0;
  const teamData = {}; // team/department → { crit, min }

  // Identify department groups from headers
  const depts = [];
  const deptKeywords = ['content', 'qa', 'design', 'media', 'lms', 'vo'];
  headers.forEach((h, i) => {
    const lower = h.toLowerCase();
    deptKeywords.forEach(d => {
      if (lower.startsWith(d) && lower.includes('crit')) {
        depts.push({ name: h.replace(/crit.*/i, '').trim() || d, critIdx: i, minIdx: i + 1 });
      }
    });
  });

  rows.forEach(row => {
    if (depts.length > 0) {
      depts.forEach(dept => {
        const c = COL.num(row, dept.critIdx);
        const m = COL.num(row, dept.minIdx);
        if (!teamData[dept.name]) teamData[dept.name] = { crit: 0, min: 0 };
        teamData[dept.name].crit += c;
        teamData[dept.name].min  += m;
        totalCrit += c;
        totalMin  += m;
      });
    } else {
      // Fallback: use single crit/min columns
      const c = COL.num(row, critIdx);
      const m = COL.num(row, minIdx);
      totalCrit += c;
      totalMin  += m;
    }
    totalComments += COL.num(row, totalIdx);
  });

  if (totalComments === 0) totalComments = totalCrit + totalMin;

  // Quality rate
  let qualSum = 0, qualCount = 0;
  if (qualIdx >= 0) {
    rows.forEach(row => {
      const v = String(row[qualIdx] || '').replace('%', '').trim();
      const n = parseFloat(v);
      if (!isNaN(n) && n > 0) { qualSum += n; qualCount++; }
    });
  }
  const avgQuality = qualCount > 0 ? (qualSum / qualCount).toFixed(1) + '%' : '—';

  // Best / worst team
  const teamEntries = Object.entries(teamData)
    .filter(([, v]) => v.crit + v.min > 0)
    .sort((a, b) => (a[1].crit + a[1].min) - (b[1].crit + b[1].min));

  const bestTeam  = teamEntries[0]  || null;
  const worstTeam = teamEntries[teamEntries.length - 1] || null;

  return {
    totalComments, totalCrit, totalMin, avgQuality,
    bestTeam, worstTeam, teamData,
    critIdx, minIdx, totalIdx, qualIdx
  };
}

// ─── INSIGHT GENERATOR ───────────────────────────────────────
function generateInsights(analytics, rows) {
  const { totalCrit, totalMin, totalComments, bestTeam, worstTeam, teamData } = analytics;
  const insights = [];
  const recs     = [];

  if (totalComments === 0) {
    insights.push('✅ No errors recorded — perfect quality score across all projects!');
    recs.push('Keep up the zero-error momentum. Schedule a retrospective to document best practices.');
    return { insights, recs };
  }

  const critPct = totalComments > 0 ? ((totalCrit / totalComments) * 100).toFixed(1) : 0;
  insights.push(`${totalCrit} critical errors found, representing ${critPct}% of all ${totalComments} total errors.`);

  if (totalCrit > totalMin) {
    insights.push('⚠️ Critical errors outnumber minor errors — immediate remediation is required.');
  } else {
    insights.push('ℹ️ Minor errors outpace critical ones — most issues are low-severity.');
  }

  if (bestTeam) {
    const total = bestTeam[1].crit + bestTeam[1].min;
    insights.push(`🏆 "${bestTeam[0]}" leads with the fewest errors (${total} total).`);
  }

  if (worstTeam && bestTeam && worstTeam[0] !== bestTeam[0]) {
    const total = worstTeam[1].crit + worstTeam[1].min;
    insights.push(`⚠️ "${worstTeam[0]}" has the most errors (${total} total) and needs priority attention.`);
  }

  const deptNames = Object.keys(teamData);
  if (deptNames.length > 1) {
    insights.push(`Data spans ${deptNames.length} departments: ${deptNames.join(', ')}.`);
  }

  insights.push(`${rows.filter(r => r.join('').trim()).length} projects are currently being tracked.`);

  // Recommendations
  if (totalCrit > 10) {
    recs.push('🔴 Schedule an urgent review meeting — critical error count exceeds 10.');
  }
  if (worstTeam && (worstTeam[1].crit + worstTeam[1].min) > 5) {
    recs.push(`📋 Assign a dedicated QA lead to the "${worstTeam[0]}" department immediately.`);
  }
  if (parseFloat(critPct) > 50) {
    recs.push('🚨 Over 50% of errors are critical — implement mandatory pre-delivery checklists.');
  }
  if (totalMin > 20) {
    recs.push('📝 High minor error volume — consider running a team training session on common mistakes.');
  }
  if (recs.length === 0) {
    recs.push('✅ Error levels look healthy. Continue current QA processes.');
    recs.push('📈 Consider setting a stretch goal of 99%+ quality rate across all departments.');
  }
  recs.push('🔄 Review data freshness — confirm all team members are updating the sheet daily.');

  return { insights, recs };
}

// ─── CHARTS ──────────────────────────────────────────────────
const CHART_COLORS = {
  red:    '#E31E24',
  redA:   'rgba(227,30,36,0.18)',
  amber:  '#E07B00',
  amberA: 'rgba(224,123,0,0.18)',
  green:  '#18A058',
  blue:   '#1566C0',
  blueA:  'rgba(21,102,192,0.18)',
  gray:   '#CCCCCC',
  palette: ['#E31E24','#1566C0','#18A058','#E07B00','#8B5CF6','#06B6D4','#F59E0B','#EC4899'],
};

function destroyCharts() {
  Object.values(state.charts).forEach(c => { try { c.destroy(); } catch(e){} });
  state.charts = {};
}

function renderCharts(analytics) {
  destroyCharts();
  const { totalCrit, totalMin, teamData } = analytics;
  const teams = Object.keys(teamData);

  // 1. Bar chart — errors per team
  const barCtx = document.getElementById('barChart').getContext('2d');
  state.charts.bar = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: teams.length > 0 ? teams : ['No Data'],
      datasets: [
        {
          label: 'Critical',
          data: teams.map(t => teamData[t].crit),
          backgroundColor: CHART_COLORS.red,
          borderRadius: 5,
        },
        {
          label: 'Minor',
          data: teams.map(t => teamData[t].min),
          backgroundColor: CHART_COLORS.amber,
          borderRadius: 5,
        }
      ]
    },
    options: chartOptions('Errors by Team', true)
  });

  // 2. Donut chart — crit vs minor
  const pieCtx = document.getElementById('pieChart').getContext('2d');
  state.charts.pie = new Chart(pieCtx, {
    type: 'doughnut',
    data: {
      labels: ['Critical', 'Minor'],
      datasets: [{
        data: [totalCrit || 0, totalMin || 0],
        backgroundColor: [CHART_COLORS.red, CHART_COLORS.amber],
        borderWidth: 2,
        borderColor: '#fff',
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'DM Sans', size: 11 }, padding: 14 } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}` } }
      }
    }
  });

  // 3. Stacked bar — breakdown per team
  const sCtx = document.getElementById('stackedChart').getContext('2d');
  state.charts.stacked = new Chart(sCtx, {
    type: 'bar',
    data: {
      labels: teams.length > 0 ? teams : ['No Data'],
      datasets: [
        {
          label: 'Critical',
          data: teams.map(t => teamData[t].crit),
          backgroundColor: CHART_COLORS.red,
          borderRadius: 3,
        },
        {
          label: 'Minor',
          data: teams.map(t => teamData[t].min),
          backgroundColor: CHART_COLORS.amber,
          borderRadius: 3,
        }
      ]
    },
    options: {
      ...chartOptions('Team Breakdown', true),
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { font: { family: 'Space Mono', size: 10 } } },
        y: { stacked: true, beginAtZero: true, grid: { color: '#f0f0f0' }, ticks: { font: { family: 'Space Mono', size: 10 } } },
      }
    }
  });
}

function chartOptions(title, legend = false) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: legend, position: 'top', labels: { font: { family: 'DM Sans', size: 11 }, padding: 12, usePointStyle: true } },
      title: { display: false },
      tooltip: { backgroundColor: '#111', titleFont: { family: 'DM Sans', size: 12 }, bodyFont: { family: 'Space Mono', size: 11 }, padding: 10, cornerRadius: 6 }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: 'Space Mono', size: 10 } } },
      y: { beginAtZero: true, grid: { color: '#f0f0f0' }, ticks: { font: { family: 'Space Mono', size: 10 } } }
    }
  };
}

// ─── TABLE RENDERING ─────────────────────────────────────────
function renderTable(headers, rows) {
  state.headers    = headers;
  state.allRows    = rows;
  state.filteredRows = rows;
  state.currentPage = 1;

  // Populate filter dropdown
  const filterSel = document.getElementById('filterCol');
  filterSel.innerHTML = '<option value="">All columns</option>';
  headers.forEach((h, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = h;
    filterSel.appendChild(opt);
  });

  buildTableHead(headers);
  renderPage();
}

function buildTableHead(headers) {
  const thead = document.getElementById('tableHead');
  thead.innerHTML = '';
  const tr = document.createElement('tr');
  headers.forEach((h, i) => {
    const th = document.createElement('th');
    th.textContent = h;
    th.title = `Sort by ${h}`;
    th.onclick = () => sortTable(i);
    tr.appendChild(th);
  });
  thead.appendChild(tr);
}

function renderPage() {
  const { filteredRows, currentPage } = state;
  const perPage = CONFIG.ROWS_PER_PAGE;
  const start   = (currentPage - 1) * perPage;
  const pageRows = filteredRows.slice(start, start + perPage);
  const tbody   = document.getElementById('tableBody');
  const empty   = document.getElementById('emptyState');

  tbody.innerHTML = '';

  if (filteredRows.length === 0) {
    empty.style.display = 'block';
    renderPagination(0);
    return;
  }
  empty.style.display = 'none';

  const critKeywords = ['crit'];
  const minKeywords  = ['min'];
  const qualKeywords = ['quality', '%'];

  pageRows.forEach(row => {
    const tr = document.createElement('tr');
    state.headers.forEach((h, i) => {
      const td = document.createElement('td');
      const val = row[i] !== undefined ? row[i] : '';
      td.textContent = val;

      const lh = h.toLowerCase();
      const numVal = parseFloat(String(val).replace('%', '')) || 0;

      if (critKeywords.some(k => lh.includes(k)) && numVal > 0) {
        td.className = 'cell-crit';
      } else if (val === '0' || val === '') {
        td.className = 'cell-zero';
      } else if (qualKeywords.some(k => lh.includes(k)) && numVal >= 99) {
        td.className = 'cell-good';
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  renderPagination(filteredRows.length);
}

function renderPagination(total) {
  const perPage = CONFIG.ROWS_PER_PAGE;
  const pages   = Math.ceil(total / perPage);
  const pg      = document.getElementById('pagination');
  pg.innerHTML  = '';

  if (pages <= 1) return;

  const info = document.createElement('span');
  info.className = 'page-info';
  info.textContent = `${total} rows`;
  pg.appendChild(info);

  const maxVisible = 7;
  let start = Math.max(1, state.currentPage - 3);
  let end   = Math.min(pages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

  if (start > 1) addPageBtn(pg, '«', 1);
  for (let p = start; p <= end; p++) addPageBtn(pg, p, p, p === state.currentPage);
  if (end < pages) addPageBtn(pg, '»', pages);
}

function addPageBtn(container, label, page, active = false) {
  const btn = document.createElement('button');
  btn.className = 'page-btn' + (active ? ' active' : '');
  btn.textContent = label;
  btn.onclick = () => { state.currentPage = page; renderPage(); };
  container.appendChild(btn);
}

function sortTable(colIdx) {
  const ths = document.querySelectorAll('.data-table thead th');
  ths.forEach(th => th.classList.remove('sorted-asc', 'sorted-desc'));

  if (state.sortCol === colIdx) {
    state.sortDir *= -1;
  } else {
    state.sortCol = colIdx;
    state.sortDir = 1;
  }

  ths[colIdx].classList.add(state.sortDir === 1 ? 'sorted-asc' : 'sorted-desc');

  state.filteredRows.sort((a, b) => {
    const av = a[colIdx] || '';
    const bv = b[colIdx] || '';
    const an = parseFloat(String(av).replace(/[^0-9.\-]/g, ''));
    const bn = parseFloat(String(bv).replace(/[^0-9.\-]/g, ''));
    if (!isNaN(an) && !isNaN(bn)) return (an - bn) * state.sortDir;
    return String(av).localeCompare(String(bv)) * state.sortDir;
  });

  state.currentPage = 1;
  renderPage();
}

// ─── SEARCH / FILTER ─────────────────────────────────────────
function filterTable() {
  const query   = document.getElementById('searchInput').value.toLowerCase();
  const colIdx  = document.getElementById('filterCol').value;

  state.filteredRows = state.allRows.filter(row => {
    if (colIdx !== '') {
      return String(row[colIdx] || '').toLowerCase().includes(query);
    }
    return row.some(cell => String(cell).toLowerCase().includes(query));
  });

  state.currentPage = 1;
  renderPage();
}

// ─── EXPORT CSV ───────────────────────────────────────────────
function exportCSV() {
  const rows = [state.headers, ...state.filteredRows];
  const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `almentor_qa_${state.activeTab}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── OVERVIEW CARDS ──────────────────────────────────────────
function updateCards(analytics) {
  const { totalComments, totalCrit, totalMin, avgQuality, bestTeam, worstTeam } = analytics;
  setText('valTotal', totalComments.toLocaleString());
  setText('valCrit',  totalCrit.toLocaleString());
  setText('valMin',   totalMin.toLocaleString());
  setText('valQuality', avgQuality);

  const critPct = totalComments > 0 ? ((totalCrit / totalComments) * 100).toFixed(1) : 0;
  const minPct  = totalComments > 0 ? ((totalMin  / totalComments) * 100).toFixed(1) : 0;
  setText('subCrit', `${critPct}% of total`);
  setText('subMin',  `${minPct}% of total`);

  if (bestTeam) {
    setText('bestTeam', bestTeam[0]);
    setText('bestStat', `${bestTeam[1].crit + bestTeam[1].min} total errors`);
  }
  if (worstTeam) {
    setText('worstTeam', worstTeam[0]);
    setText('worstStat', `${worstTeam[1].crit + worstTeam[1].min} total errors`);
  }
}

function updateInsights(analytics, rows) {
  const { insights, recs } = generateInsights(analytics, rows);
  renderList('insightsList', insights);
  renderList('recList', recs);
}

function renderList(id, items) {
  const el = document.getElementById(id);
  el.innerHTML = items.map(i => `<li>${i}</li>`).join('');
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ─── SYNC STATUS ─────────────────────────────────────────────
function setSyncing(active) {
  const ind   = document.getElementById('syncIndicator');
  const label = document.getElementById('syncLabel');
  if (active) {
    ind.classList.add('syncing');
    label.textContent = 'Syncing…';
  } else {
    ind.classList.remove('syncing');
    label.textContent = state.useLocalData ? 'Demo' : 'Live';
  }
}

function updateLastUpdated() {
  state.lastUpdated = new Date();
  const el = document.getElementById('lastUpdated');
  if (el) el.textContent = `Updated: ${state.lastUpdated.toLocaleTimeString()}`;

  // Countdown display
  clearInterval(state._countTimer);
  state._countTimer = setInterval(() => {
    if (!state.lastUpdated) return;
    const secs = Math.round((Date.now() - state.lastUpdated) / 1000);
    if (el) el.textContent = `Updated: ${secs}s ago`;
  }, 5000);
}

// ─── MAIN LOAD ────────────────────────────────────────────────
async function loadData(tab) {
  setSyncing(true);
  try {
    const { headers, rows } = await fetchSheetData(tab);
    const analytics = computeAnalytics(headers, rows);

    updateCards(analytics);
    renderCharts(analytics);
    updateInsights(analytics, rows);
    renderTable(headers, rows);
    updateLastUpdated();
  } catch (err) {
    console.error('Dashboard error:', err);
    renderList('insightsList', ['⚠️ Failed to load data. Check your Google Sheet URL in script.js CONFIG.']);
  } finally {
    setSyncing(false);
  }
}

// ─── TAB SWITCHING ────────────────────────────────────────────
function switchTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.getElementById('searchInput').value = '';
  loadData(tab);
}

// ─── AUTO-REFRESH ────────────────────────────────────────────
function startAutoRefresh() {
  if (state.refreshTimer) clearInterval(state.refreshTimer);
  state.refreshTimer = setInterval(() => {
    loadData(state.activeTab);
  }, CONFIG.REFRESH_INTERVAL);
  document.getElementById('footerRefresh').textContent =
    `Auto-refresh every ${CONFIG.REFRESH_INTERVAL / 1000}s`;
}

// ─── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadData('projects');
  startAutoRefresh();
});
