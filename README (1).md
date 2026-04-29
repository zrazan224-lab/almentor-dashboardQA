# 📊 Almentor QA Operations Dashboard

> **Live, auto-updating QA dashboard for Almentor** — powered by GitHub Pages + Google Sheets CSV exports.  
> Brand: Red `#E31E24` · White · Black · DM Sans + Space Mono

---

## 🚀 Quick Start (GitHub Pages Deployment)

### Step 1 — Fork or Upload the Repository

Option A — Create a new repository:
1. Go to [github.com/new](https://github.com/new)
2. Name it `almentor-dashboard` (or any name you prefer)
3. Set it to **Public**
4. Click **Create repository**
5. Upload all 4 files: `index.html`, `style.css`, `script.js`, `README.md`

Option B — Clone and push:
```bash
git clone https://github.com/YOUR-USERNAME/almentor-dashboard.git
cd almentor-dashboard
# copy your files here
git add .
git commit -m "Initial dashboard"
git push origin main
```

### Step 2 — Enable GitHub Pages

1. Go to your repository **Settings → Pages**
2. Under **Source**, select **Deploy from a branch**
3. Select **Branch: main** and **/ (root)**
4. Click **Save**
5. Your dashboard will be live at:  
   `https://YOUR-USERNAME.github.io/almentor-dashboard/`

---

## 🔗 Connect Your Google Sheets (Critical Step)

The dashboard reads live data from your Google Sheets via public CSV exports.

### Publish Your Sheet to the Web

1. Open your Google Sheet
2. Go to **File → Share → Publish to web**
3. In the first dropdown, select the **specific tab** (e.g., "Projects")
4. In the second dropdown, select **Comma-separated values (.csv)**
5. Click **Publish** → **OK**
6. Copy the URL — it looks like:
   ```
   https://docs.google.com/spreadsheets/d/SHEET_ID/pub?gid=GID&single=true&output=csv
   ```

### Update `script.js`

Open `script.js` and update the `CONFIG.SHEETS` section at the top:

```javascript
const CONFIG = {
  SHEETS: {
    projects: 'https://docs.google.com/spreadsheets/d/YOUR_REAL_SHEET_ID/pub?gid=0&single=true&output=csv',
    b2c:      'https://docs.google.com/spreadsheets/d/YOUR_REAL_SHEET_ID/pub?gid=1234567&single=true&output=csv',
  },
  REFRESH_INTERVAL: 30000, // 30 seconds — change if needed
  ROWS_PER_PAGE: 20,
};
```

> **Tip:** The `gid` is the tab identifier. Find it in the URL when you have that tab selected:  
> `https://docs.google.com/spreadsheets/d/.../edit#gid=XXXXXXXX`

### Repeat for Each Tab

Publish each Google Sheets tab separately and add its CSV URL to the config.

---

## 📐 Google Sheet Structure Requirements

For the dashboard to parse your data correctly, your sheet tabs must follow this structure:

### Projects Tab
```
Row 1-3:   Title / empty rows (skipped automatically)
Row 4:     Group headers:  [blank] [blank] Content [blank] [blank] [blank] QA ...
Row 5:     Sub-headers:    Country Project TeamMember Crit. Min. Total ...
Row 6+:    Data rows
```

### 460 AI Courses (B2C) Tab
```
Row 1-2:   Title / empty rows (skipped)
Row 3:     Group headers:  Content [blank] [blank] [blank] QA ...
Row 4:     Sub-headers:    Project TeamMember Crit. Min. Total ...
Row 5+:    Data rows
```

> The parser automatically detects header rows by looking for "Crit" and "Total" columns, so minor variations in layout are handled gracefully.

---

## 🎛️ Dashboard Features

| Feature | Description |
|---|---|
| **Overview Cards** | Total Comments, Critical Errors, Minor Errors, Quality Rate |
| **Team Spotlight** | Best Team (fewest errors) vs Needs Attention (most errors) |
| **Bar Chart** | Critical + Minor errors grouped by department |
| **Donut Chart** | Critical vs Minor error proportion |
| **Stacked Bar** | Per-department breakdown side by side |
| **Auto Insights** | AI-generated bullet points based on data thresholds |
| **Recommendations** | Actionable suggestions triggered by data conditions |
| **Sortable Table** | Click any column header to sort ascending/descending |
| **Search + Filter** | Full-text search or filter by specific column |
| **Pagination** | 20 rows per page, handles 5000+ rows |
| **Export CSV** | Download filtered data as CSV |
| **Auto-Refresh** | Pulls fresh data every 30 seconds |
| **Sync Indicator** | Live dot + "Syncing…" animation during fetch |
| **Last Updated** | Shows time since last successful data pull |

---

## ⚙️ Configuration Options

All config is at the top of `script.js`:

```javascript
const CONFIG = {
  SHEETS: {
    projects: 'URL_HERE',  // Projects tab CSV URL
    b2c:      'URL_HERE',  // 460 AI Courses tab CSV URL
  },
  REFRESH_INTERVAL: 30000,  // ms — 30000 = 30 seconds
  ROWS_PER_PAGE:    20,     // rows per table page
};
```

### Adding More Tabs

1. Add a new entry to `CONFIG.SHEETS`:
   ```javascript
   SHEETS: {
     projects: '...',
     b2c:      '...',
     media:    'YOUR_NEW_URL',  // ← add this
   }
   ```

2. Add a new tab button in `index.html`:
   ```html
   <button class="tab-btn" data-tab="media" onclick="switchTab('media')">
     <span class="tab-icon">🎬</span> Media
   </button>
   ```

---

## 🎨 Branding Customization

Colors and fonts are defined as CSS variables in `style.css`:

```css
:root {
  --red:      #E31E24;   /* Almentor primary red */
  --red-dark: #B31519;   /* Hover states */
  --font-ui:  'DM Sans'; /* UI font */
  --font-mono:'Space Mono'; /* Numbers / data */
}
```

---

## 🔒 Error Handling

| Scenario | Behavior |
|---|---|
| No Google Sheet URL configured | Falls back to built-in sample data with "Demo" status |
| Network fetch fails | Falls back to sample data, logs error to console |
| Empty cells / `#DIV/0!` | Treated as 0 or empty, no crash |
| Malformed rows | Filtered out automatically during parsing |
| Invalid quality % strings | Skipped in average calculation |

---

## 🌐 Browser Compatibility

- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅
- Mobile (iOS/Android) ✅

---

## 📁 File Structure

```
almentor-dashboard/
├── index.html    — Structure, tabs, chart canvases
├── style.css     — Almentor branding, animations, responsive layout
├── script.js     — CSV engine, analytics, Chart.js, auto-refresh
└── README.md     — This file
```

---

## 🔧 Local Development

Because this uses `fetch()` to load CSV, you need a local server (browsers block file:// CORS):

```bash
# Python (built-in)
python3 -m http.server 8080

# Node.js (npx)
npx serve .

# VS Code
Install "Live Server" extension → right-click index.html → Open with Live Server
```

Then open: `http://localhost:8080`

---

## 📝 License

Internal tool — Almentor © 2025. Not for public distribution.
