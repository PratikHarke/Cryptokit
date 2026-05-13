const styles = `
  /* ── Design tokens — dark cyber-noir ────────────────────────────────────── */
  :root {
    --bg-app:       #020a16;
    --bg-side:      #010710;
    --bg-card:      #061222;
    --bg-card-2:    #091a30;
    --bg-input:     #030d1b;
    --bg-output:    #010b15;
    --bg-hover:     #0c1e3c;
    --bg-active:    #072040;
    --bg-code:      #010a14;
    --border:       #162840;
    --border-sub:   #0e1d30;
    --border-glow:  #00d4ff30;

    --text-1:       #e0f0ff;
    --text-2:       #4e80aa;
    --text-3:       #243f58;
    --text-label:   #30567a;

    --accent:       #00ccff;
    --accent-2:     #7c5ef5;
    --accent-dim:   #00ccff0d;
    --accent-glow:  #00ccff22;
    --green:        #00e87a;
    --green-dim:    #00e87a0e;
    --yellow:       #ffd700;
    --red:          #ff3d5a;
    --orange:       #ff7300;
    --output-col:   #00e87a;

    --grid-color:   #0b1c30;
    --radius:       8px;
    --sidebar-w:    228px;
    --font-mono:    'JetBrains Mono', 'Courier New', monospace;
    --font-ui:      'Rajdhani', 'Segoe UI', sans-serif;

    /* ── Semantic WCAG-safe status colors (dark theme) ──────────────────────── */
    --success-text: #86efac;
    --success-bg:   #14532d55;
    --medium-text:  #fde68a;
    --medium-bg:    #78350f44;
    --low-text:     #fca5a5;
    --low-bg:       #7f1d1d44;
    --neutral-text: #94a3b8;
    --neutral-bg:   #1e293b66;
  }

  /* ── Light theme ─────────────────────────────────────────────────────────── */
  .app.theme-light {
    --bg-app:       #f0f5ff;
    --bg-side:      #e4ecf8;
    --bg-card:      #ffffff;
    --bg-card-2:    #f5f8ff;
    --bg-input:     #f8faff;
    --bg-output:    #edf3ff;
    --bg-hover:     #dce8f8;
    --bg-active:    #d0e4ff;
    --bg-code:      #eaf0ff;
    --border:       #c0d4ee;
    --border-sub:   #d8e8f8;
    --border-glow:  #0066cc22;

    --text-1:       #0a1a30;
    --text-2:       #3a6080;
    --text-3:       #8099bb;
    --text-label:   #4a7090;

    --accent:       #0055cc;
    --accent-2:     #6644cc;
    --accent-dim:   #0055cc0d;
    --accent-glow:  #0055cc18;
    --green:        #008844;
    --green-dim:    #00884408;
    --yellow:       #aa7700;
    --red:          #cc1133;
    --orange:       #cc5500;
    --output-col:   #0a3020;   /* dark green — legible on light #edf3ff bg (7:1 contrast) */

    --grid-color:   #d0ddf0;

    /* ── Semantic WCAG-safe status colors (light theme) ─────────────────────── */
    --success-text: #065f46;
    --success-bg:   #d1fae5;
    --medium-text:  #92400e;
    --medium-bg:    #fef3c7;
    --low-text:     #7c2d12;
    --low-bg:       #ffedd5;
    --neutral-text: #374151;
    --neutral-bg:   #f3f4f6;
  }

  /* ── Light-mode hover overrides (ensure readable text on light backgrounds) */
  .app.theme-light .btn-ghost:hover {
    background: #dbeafe;
    color: #0f172a;
    border-color: #93c5fd;
  }
  .app.theme-light .btn-ghost:hover * { color: #0f172a; }

  .app.theme-light .btn-ghost:focus {
    background: #dbeafe;
    color: #0f172a;
  }

  .app.theme-light .btn-sm:hover {
    background: #dbeafe;
    color: #0f172a;
    border-color: #93c5fd;
  }

  .app.theme-light .copy-btn:hover {
    background: #dbeafe;
    color: #0f172a;
    border-color: #93c5fd;
  }

  .app.theme-light .workspace-switcher-btn:hover {
    background: #dbeafe;
    color: #0f172a;
    border-color: #93c5fd;
  }

  .app.theme-light .flag-copy-btn:hover {
    background: #bbf7d0;
    border-color: #16a34a;
    color: #14532d;
  }

  /* Topbar buttons in light mode */
  .app.theme-light .topbar button:hover,
  .app.theme-light .topbar .btn:hover {
    background: #dbeafe !important;
    color: #0f172a !important;
    border-color: #93c5fd !important;
  }
  .app.theme-light .topbar button:hover *,
  .app.theme-light .topbar .btn:hover * {
    color: #0f172a !important;
  }

  /* Icon buttons and toolbar buttons in light mode */
  .app.theme-light button.btn:hover,
  .app.theme-light button.btn-ghost:hover {
    background: #dbeafe;
    color: #0f172a;
    border-color: #93c5fd;
  }

  /* Pipeline buttons, tab buttons in light mode */
  .app.theme-light .pipeline-btn:hover {
    background: #dbeafe;
    color: #0f172a;
    border-color: #93c5fd;
  }

  /* Ensure no dark blocks anywhere in light mode hover */
  .app.theme-light [class*="btn"]:hover:not(.btn-primary):not(.btn-danger) {
    background: #dbeafe;
    color: #0f172a;
  }

  /* ── Reset & base ────────────────────────────────────────────────────────── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--font-mono);
    font-size: 13px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  /* ── App shell ───────────────────────────────────────────────────────────── */
  .app {
    display: flex;
    height: 100vh;
    background: var(--bg-app);
    /* Inherit dark-theme tokens by default; .app.theme-light overrides them */
    color: var(--text-1);
    font-size: 13px;
    font-family: var(--font-mono);
    overflow: hidden;
    transition: background .2s, color .2s;

    /* Dot-grid background */
    background-image:
      radial-gradient(circle, var(--grid-color) 1px, transparent 1px);
    background-size: 28px 28px;
    background-attachment: fixed;
  }

  /* Top-edge accent line */
  .app::before {
    content: '';
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent 0%, var(--accent) 30%, var(--accent-2) 70%, transparent 100%);
    z-index: 9999;
    opacity: 0.6;
    pointer-events: none;
  }

  /* ── Sidebar ─────────────────────────────────────────────────────────────── */
  .sidebar {
    width: var(--sidebar-w);
    background: var(--bg-side);
    background-image: linear-gradient(180deg, rgba(0,204,255,0.03) 0%, transparent 40%);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
    flex-shrink: 0;
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
    transition: background .2s, border-color .2s;
  }
  .sidebar::-webkit-scrollbar { width: 3px; }
  .sidebar::-webkit-scrollbar-track { background: transparent; }
  .sidebar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  /* Logo */
  .sb-logo {
    padding: 14px 13px 12px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    background: linear-gradient(180deg, rgba(0,204,255,0.04) 0%, transparent 100%);
  }
  .sb-logo-inner { display: flex; justify-content: space-between; align-items: center; }
  .sb-logo h1 {
    font-family: var(--font-ui);
    font-size: 18px;
    font-weight: 700;
    color: var(--accent);
    letter-spacing: 3px;
    text-transform: uppercase;
    text-shadow: 0 0 18px var(--accent-glow), 0 0 40px rgba(0,204,255,0.15);
  }
  .sb-logo p {
    font-size: 9px;
    color: var(--text-3);
    margin-top: 2px;
    letter-spacing: 2px;
    text-transform: uppercase;
    font-family: var(--font-mono);
  }

  /* Section headers */
  .sb-section {
    padding: 10px 10px 4px;
    font-size: 9px;
    font-weight: 700;
    color: var(--text-3);
    letter-spacing: 2px;
    text-transform: uppercase;
    font-family: var(--font-ui);
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    user-select: none;
    transition: color .12s;
  }
  .sb-section:hover { color: var(--text-2); }
  .sb-section-icon { font-size: 11px; margin-right: 5px; }
  .sb-section-chevron { font-size: 9px; opacity: 0.5; }

  /* Items */
  .sb-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 9px 6px 12px;
    cursor: pointer;
    border-radius: 5px;
    margin: 1px 5px;
    color: var(--text-2);
    transition: background .1s, color .1s, border-color .1s, box-shadow .15s;
    font-size: 12px;
    font-family: var(--font-mono);
    border-left: 2px solid transparent;
  }
  .sb-item:hover {
    background: var(--bg-hover);
    color: var(--text-1);
    border-left-color: var(--border);
  }
  .sb-item.active {
    background: linear-gradient(90deg, rgba(0,204,255,0.1), var(--bg-active));
    color: var(--accent);
    border-left-color: var(--accent);
    box-shadow: inset 0 0 16px var(--accent-glow), -2px 0 8px rgba(0,204,255,0.08);
  }
  .sb-item-icon { font-size: 12px; flex-shrink: 0; width: 16px; text-align: center; }
  .sb-item-text { flex: 1; min-width: 0; }
  .sb-item-label { font-size: 11.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sb-item-desc { font-size: 9.5px; color: var(--text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; letter-spacing: .3px; }
  .sb-item.active .sb-item-desc { color: var(--accent); opacity: 0.6; }

  /* More button */
  .sb-more {
    padding: 3px 9px 5px 20px;
    font-size: 9.5px;
    color: var(--text-3);
    cursor: pointer;
    font-family: var(--font-mono);
    letter-spacing: .5px;
    transition: color .1s;
  }
  .sb-more:hover { color: var(--accent); }
  .sb-more.active-flag { color: var(--accent); opacity: 0.8; }

  /* Sidebar footer */
  .sb-footer {
    margin-top: auto;
    border-top: 1px solid var(--border);
    padding: 10px 10px;
    display: flex;
    gap: 6px;
    flex-direction: column;
    flex-shrink: 0;
  }
  .sb-footer-row { display: flex; gap: 5px; align-items: center; }
  .sb-stat {
    font-size: 9px;
    color: var(--text-3);
    font-family: var(--font-mono);
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .sb-stat span { color: var(--accent); font-weight: 700; }

  /* ── Main content area ───────────────────────────────────────────────────── */
  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: transparent;
  }

  /* Topbar */
  .topbar {
    padding: 10px 22px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(90deg, var(--bg-side), rgba(6,18,34,0.95));
    flex-shrink: 0;
    transition: background .2s;
  }
  .topbar h2 {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-1);
    font-family: var(--font-ui);
    letter-spacing: 2px;
    text-transform: uppercase;
    text-shadow: 0 0 20px rgba(0,204,255,0.2);
  }
  .topbar p { font-size: 10px; color: var(--text-3); margin-top: 2px; letter-spacing: .5px; }

  /* Breadcrumb */
  .topbar-crumb {
    font-size: 9px;
    color: var(--text-3);
    font-family: var(--font-mono);
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 2px;
  }
  .topbar-crumb span { color: var(--accent); }

  /* Content area */
  .content {
    flex: 1;
    overflow-y: auto;
    padding: 18px 20px 28px;
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
  }
  .content::-webkit-scrollbar { width: 4px; }
  .content::-webkit-scrollbar-track { background: transparent; }
  .content::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  /* ── Cards ───────────────────────────────────────────────────────────────── */
  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 15px;
    transition: background .2s, border-color .2s, box-shadow .2s;
    position: relative;
    overflow: hidden;
  }
  .card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--accent-glow), transparent);
    opacity: 0;
    transition: opacity .2s;
  }
  .card:hover { border-color: rgba(0,204,255,0.25); box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,204,255,0.06); }
  .card:hover::before { opacity: 1; }
  .card-title {
    font-size: 9px;
    font-weight: 700;
    color: var(--text-label);
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 12px;
    font-family: var(--font-ui);
  }

  /* ── Section headers ─────────────────────────────────────────────────────── */
  .section-header { margin-bottom: 16px; }
  .section-header h3 {
    font-size: 17px;
    font-weight: 700;
    color: var(--text-1);
    font-family: var(--font-ui);
    letter-spacing: 2px;
    text-transform: uppercase;
    text-shadow: 0 0 20px rgba(0,204,255,0.15);
  }
  .section-header p {
    font-size: 11px;
    color: var(--text-2);
    margin-top: 4px;
    line-height: 1.6;
    font-family: var(--font-mono);
  }

  /* ── Form elements ───────────────────────────────────────────────────────── */
  label {
    display: block;
    font-size: 9.5px;
    color: var(--text-label);
    margin-bottom: 4px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    font-family: var(--font-ui);
    font-weight: 600;
  }
  input, textarea, select {
    width: 100%;
    background: var(--bg-input);
    border: 1px solid var(--border);
    color: var(--text-1);
    border-radius: 5px;
    padding: 7px 10px;
    font-size: 12px;
    font-family: var(--font-mono);
    outline: none;
    transition: border-color .15s, box-shadow .15s;
    caret-color: var(--accent);
  }
  input:focus, textarea:focus, select:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-glow);
  }
  textarea {
    resize: vertical;
    min-height: 90px;
    line-height: 1.6;
  }
  select option { background: var(--bg-card); color: var(--text-1); }

  /* ── Buttons ─────────────────────────────────────────────────────────────── */
  .btn {
    padding: 8px 16px;
    border-radius: 5px;
    border: none;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    transition: all .15s;
    font-family: var(--font-mono);
    letter-spacing: .5px;
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .btn-primary {
    background: linear-gradient(135deg, var(--accent), #0099cc);
    color: #000;
    box-shadow: 0 0 16px var(--accent-glow), 0 2px 8px rgba(0,0,0,0.4);
    font-weight: 700;
  }
  .btn-primary:hover {
    filter: brightness(1.12);
    box-shadow: 0 0 28px var(--accent-glow), 0 2px 12px rgba(0,0,0,0.5);
    transform: translateY(-1px);
  }
  .btn-primary:active { transform: translateY(0); }
  .btn-primary:disabled { opacity: .35; cursor: not-allowed; box-shadow: none; transform: none; }
  .btn-sm { padding: 4px 10px; font-size: 10px; }
  .btn-ghost {
    background: var(--bg-hover);
    color: var(--text-2);
    border: 1px solid var(--border);
  }
  .btn-ghost:hover { background: var(--bg-active); color: var(--text-1); border-color: var(--accent); }

  /* ── Tab bar ─────────────────────────────────────────────────────────────── */
  .tab-bar {
    display: flex;
    gap: 2px;
    background: var(--bg-output);
    padding: 3px;
    border-radius: 6px;
    border: 1px solid var(--border);
    width: fit-content;
  }
  .tab {
    padding: 5px 14px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    color: var(--text-2);
    transition: .12s;
    border: none;
    background: none;
    font-family: var(--font-mono);
    letter-spacing: .5px;
    font-weight: 500;
  }
  .tab:hover { color: var(--text-1); }
  .tab.active {
    background: var(--bg-card);
    color: var(--accent);
    box-shadow: 0 0 10px var(--accent-glow), inset 0 1px 0 rgba(0,204,255,0.2);
    text-shadow: 0 0 8px var(--accent-glow);
  }

  /* ── Output / code blocks ────────────────────────────────────────────────── */
  .output {
    background: var(--bg-output);
    border: 1px solid var(--border);
    border-radius: 5px;
    padding: 10px 12px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--output-col);
    min-height: 56px;
    word-break: break-all;
    white-space: pre-wrap;
    line-height: 1.65;
    position: relative;
    text-shadow: 0 0 8px rgba(0,232,122,0.25);
  }
  /* Scan-line effect on code output */
  .output::after {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 3px,
      rgba(0,0,0,.06) 3px,
      rgba(0,0,0,.06) 4px
    );
    pointer-events: none;
    border-radius: 5px;
  }
  .output.mono { color: var(--accent); text-shadow: 0 0 8px var(--accent-glow); }

  /* ── Layout helpers ──────────────────────────────────────────────────────── */
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .row { display: flex; gap: 10px; align-items: flex-end; margin-bottom: 10px; }
  .row > * { flex: 1; }

  /* ── Tags / badges ───────────────────────────────────────────────────────── */
  .tag { display: inline-block; padding: 2px 7px; border-radius: 3px; font-size: 9.5px; font-weight: 700; font-family: var(--font-mono); letter-spacing: .5px; }
  .tag-high    { background: var(--success-bg);  color: var(--success-text); border: 1px solid var(--success-text); }
  .tag-med     { background: var(--medium-bg);   color: var(--medium-text);  border: 1px solid var(--medium-text); }
  .tag-low     { background: var(--low-bg);      color: var(--low-text);     border: 1px solid var(--low-text); }
  .tag-none    { background: var(--neutral-bg);  color: var(--neutral-text); border: 1px solid var(--border); }
  .tag-red     { background: var(--low-bg);      color: var(--low-text);     border: 1px solid var(--low-text); }

  /* ── Info boxes ──────────────────────────────────────────────────────────── */
  .info-box {
    background: var(--accent-dim);
    border: 1px solid var(--accent)33;
    border-radius: 5px;
    padding: 10px 12px;
    font-size: 11.5px;
    color: var(--text-1);
    line-height: 1.65;
    font-family: var(--font-mono);
  }
  .warn-box {
    background: #200e0022;
    border: 1px solid var(--yellow)55;
    border-radius: 5px;
    padding: 10px 12px;
    font-size: 11.5px;
    color: var(--yellow);
    line-height: 1.65;
  }
  .success-box {
    background: var(--green-dim);
    border: 1px solid var(--green)44;
    border-radius: 5px;
    padding: 10px 12px;
    font-size: 11.5px;
    color: var(--green);
    line-height: 1.65;
  }

  /* ── Table rows ──────────────────────────────────────────────────────────── */
  .result-row { display: flex; align-items: center; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid var(--border-sub); font-size: 12px; }
  .result-row:last-child { border-bottom: none; }
  .kv { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; border-bottom: 1px solid var(--border-sub); }
  .kv:last-child { border-bottom: none; }
  .kv-k { color: var(--text-label); font-family: var(--font-mono); }
  .kv-v { color: var(--text-1); font-weight: 600; text-align: right; }

  /* ── Progress bars ───────────────────────────────────────────────────────── */
  .score-bar { height: 3px; background: var(--bg-hover); border-radius: 2px; margin-top: 4px; overflow: hidden; }
  .score-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: .3s; }
  .strength-bar { height: 6px; border-radius: 3px; background: var(--bg-hover); overflow: hidden; margin: 8px 0; }
  .strength-fill { height: 100%; border-radius: 3px; transition: .4s; }
  .freq-row { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 11px; }
  .freq-bar { height: 10px; background: var(--bg-hover); border-radius: 2px; overflow: hidden; flex: 1; min-width: 60px; }
  .freq-fill { height: 100%; background: var(--accent); border-radius: 2px; }
  .freq-fill.expected { background: var(--text-3); }

  /* ── Password audit ──────────────────────────────────────────────────────── */
  .issue { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--red); padding: 2px 0; }
  .issue::before { content: "✗"; color: var(--red); font-size: 10px; }
  .ok { color: var(--green); }
  .ok::before { content: "✓"; color: var(--green); font-size: 10px; }

  /* ── Misc ────────────────────────────────────────────────────────────────── */
  .highlight { color: var(--yellow); font-weight: 700; text-shadow: 0 0 8px rgba(255,215,0,0.2); }
  .code-inline {
    background: var(--bg-output);
    border: 1px solid var(--border);
    padding: 1px 5px;
    border-radius: 3px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--yellow);
  }
  .empty {
    color: var(--text-3);
    font-size: 14px;
    text-align: center;
    padding: 48px 32px;
    font-family: var(--font-ui);
    letter-spacing: 1px;
  }
  .empty::before {
    content: '';
    display: block;
    width: 48px;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
    margin: 0 auto 20px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: var(--bg-hover);
    border-radius: 3px;
    padding: 2px 7px;
    font-size: 10px;
    color: var(--text-2);
    border: 1px solid var(--border);
    font-family: var(--font-mono);
  }
  .morse-out { font-family: var(--font-mono); font-size: 13px; letter-spacing: 1.5px; color: var(--yellow); word-break: break-all; white-space: pre-wrap; }

  /* ── Copy button ─────────────────────────────────────────────────────────── */
  .copy-btn {
    float: right;
    cursor: pointer;
    font-size: 9px;
    color: var(--text-3);
    background: var(--bg-hover);
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 2px 6px;
    font-family: var(--font-mono);
    letter-spacing: .5px;
    text-transform: uppercase;
    transition: color .1s, border-color .1s;
  }
  .copy-btn:hover { color: var(--accent); border-color: var(--accent); }

  /* ── Pipeline ────────────────────────────────────────────────────────────── */
  .pipe-step {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--bg-hover); border: 1px solid var(--border);
    border-radius: 5px; padding: 4px 10px; font-size: 11px;
    color: var(--text-1); margin-right: 6px; margin-bottom: 4px; cursor: grab;
    font-family: var(--font-mono);
  }
  .pipe-arrow { color: var(--accent); font-size: 12px; margin-right: 6px; }
  .tabs-wrap { display: flex; gap: 2px; margin-bottom: 16px; background: var(--bg-output); padding: 3px; border-radius: 6px; width: fit-content; border: 1px solid var(--border); }

  /* ── History ─────────────────────────────────────────────────────────────── */
  .history-item { padding: 9px; border-bottom: 1px solid var(--border-sub); font-size: 12px; }
  .history-item:last-child { border-bottom: none; }
  .history-op { font-weight: 600; color: var(--accent-2); margin-bottom: 2px; font-family: var(--font-mono); font-size: 11px; letter-spacing: .5px; text-transform: uppercase; }
  .history-preview { color: var(--text-2); font-family: var(--font-mono); word-break: break-all; font-size: 11.5px; }
  .history-meta { color: var(--text-3); font-size: 10px; margin-top: 2px; font-family: var(--font-mono); }

  /* ── CTF Challenge styles ────────────────────────────────────────────────── */
  .ctf-terminal {
    background: #010e04;
    border: 1px solid #0a2e10;
    border-radius: 6px;
    padding: 14px 16px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: #00dd44;
    line-height: 1.8;
    white-space: pre-wrap;
    word-break: break-all;
  }
  .ctf-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    margin-bottom: 10px;
    cursor: pointer;
    transition: all .15s;
  }
  .ctf-card:hover { border-color: var(--accent)55; transform: translateY(-1px); box-shadow: 0 4px 16px #00d4ff08; }
  .ctf-badge { display: inline-flex; align-items: center; gap: 5px; padding: 2px 9px; border-radius: 20px; font-size: 9.5px; font-weight: 700; font-family: var(--font-mono); text-transform: uppercase; letter-spacing: .5px; }
  .ctf-solved-banner { background: var(--green-dim); border: 1px solid var(--green)33; border-radius: 6px; padding: 14px; }
  .file-chip {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--bg-hover); border: 1px solid var(--border);
    border-radius: 5px; padding: 5px 11px; font-size: 11px;
    color: var(--text-1); cursor: pointer; transition: .12s; text-decoration: none;
    font-family: var(--font-mono);
  }
  .file-chip:hover { border-color: var(--green); color: var(--green); }
  .ctf-pts { font-size: 28px; font-weight: 800; font-variant-numeric: tabular-nums; font-family: var(--font-mono); }
  .ctf-scorebar { height: 5px; border-radius: 3px; background: var(--bg-hover); overflow: hidden; margin-top: 6px; }
  .ctf-scorefill { height: 100%; border-radius: 3px; transition: .5s; background: linear-gradient(90deg, var(--accent), var(--green)); }

  /* ── Beginner guide ──────────────────────────────────────────────────────── */
  .guide-banner {
    border-radius: var(--radius);
    padding: 14px 16px;
    margin-bottom: 16px;
    border: 1px solid var(--accent)33;
    background: var(--accent-dim);
  }
  .guide-step { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 8px; font-size: 11.5px; line-height: 1.6; color: var(--text-1); }
  .guide-step:last-child { margin-bottom: 0; }
  .guide-num {
    background: var(--accent);
    color: #000;
    border-radius: 50%;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    font-weight: 800;
    flex-shrink: 0;
    margin-top: 2px;
    font-family: var(--font-mono);
  }

  /* ── Search modal ────────────────────────────────────────────────────────── */
  .search-overlay {
    position: fixed; inset: 0;
    background: rgba(0,5,15,.82);
    z-index: 9000;
    display: flex; align-items: flex-start; justify-content: center;
    padding-top: 80px;
    backdrop-filter: blur(8px);
  }
  .search-box {
    background: var(--bg-card);
    border: 1px solid rgba(0,204,255,0.3);
    border-radius: 12px;
    width: 100%; max-width: 500px;
    box-shadow: 0 32px 80px rgba(0,0,0,0.85), 0 0 40px rgba(0,204,255,0.08), 0 0 0 1px rgba(0,204,255,0.05);
    overflow: hidden;
  }
  .search-input-row {
    padding: 14px 18px;
    border-bottom: 1px solid var(--border);
    display: flex; gap: 10px; align-items: center;
    background: linear-gradient(90deg, rgba(0,204,255,0.03), transparent);
  }
  .search-input-row input {
    background: none; border: none; outline: none;
    color: var(--text-1); font-size: 15px; padding: 0; flex: 1;
    font-family: var(--font-mono);
    caret-color: var(--accent);
  }
  .search-result {
    padding: 10px 18px;
    cursor: pointer;
    display: flex; align-items: center; gap: 12px;
    border-bottom: 1px solid var(--border-sub);
    font-family: var(--font-mono);
    font-size: 12px;
    transition: background .1s;
  }
  .search-result:hover { background: var(--bg-hover); }
  .search-result:last-child { border-bottom: none; }
  .search-footer {
    padding: 8px 18px;
    border-top: 1px solid var(--border);
    font-size: 10px;
    color: var(--text-3);
    font-family: var(--font-mono);
    letter-spacing: .5px;
  }


  /* ── Terminal cursor blink ────────────────────────────────────────────────── */
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }

  /* ── Hacker progress bar pulse ───────────────────────────────────────────── */
  @keyframes scan {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .progress-scan {
    background: linear-gradient(90deg, #0f2035 25%, #00d4ff33 50%, #0f2035 75%);
    background-size: 200% 100%;
    animation: scan 1.8s linear infinite;
  }

  /* ── Micro-interaction animations ────────────────────────────────────────── */
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes flagPulse {
    0%, 100% { box-shadow: 0 0 12px #22c55e22, 0 0 0 0 #22c55e18; }
    50%       { box-shadow: 0 0 22px #22c55e44, 0 0 0 4px #22c55e0a; }
  }
  @keyframes toastSlide {
    from { opacity: 0; transform: translateX(20px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes resultAppear {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes scanLine {
    0%   { top: -100%; }
    100% { top: 100%; }
  }

  /* ── Spinner ─────────────────────────────────────────────────────────────── */
  .spinner {
    display: inline-block;
    width: 14px; height: 14px;
    border: 2px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin .7s linear infinite;
    flex-shrink: 0;
  }

  /* ── Result card animations ──────────────────────────────────────────────── */
  .result-card-best {
    animation: resultAppear .25s ease forwards;
    border: 2px solid var(--green) !important;
    box-shadow: 0 0 20px rgba(0,232,122,0.12), 0 0 40px rgba(0,232,122,0.06), inset 0 0 30px rgba(0,232,122,0.03) !important;
  }
  .result-card-other {
    animation: resultAppear .25s ease forwards;
    opacity: 0.88;
  }
  .result-card-other:hover { opacity: 1; }

  /* ── Copy button — upgraded ─────────────────────────────────────────────── */
  .copy-btn {
    float: right;
    cursor: pointer;
    font-size: 9px;
    color: var(--text-3);
    background: var(--bg-hover);
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 2px 6px;
    font-family: var(--font-mono);
    letter-spacing: .5px;
    text-transform: uppercase;
    transition: color .15s, border-color .15s, background .15s, transform .15s;
    position: relative;
  }
  .copy-btn:hover {
    color: var(--accent);
    border-color: var(--accent);
    background: var(--accent-dim);
    transform: scale(1.04);
  }
  /* WCAG fix: use semantic success colors — dark text on tinted bg in light mode */
  .copy-btn.copied {
    color: var(--success-text);
    border-color: var(--success-text);
    background: var(--success-bg);
  }

  /* ── Global copy toast ───────────────────────────────────────────────────── */
  .copy-toast {
    position: fixed;
    bottom: 24px; right: 24px;
    z-index: 99999;
    background: var(--success-bg);
    border: 1px solid var(--success-text);
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 12px;
    color: var(--success-text);
    font-family: var(--font-mono);
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    animation: toastSlide .2s ease forwards;
    pointer-events: none;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* ── Session toast ───────────────────────────────────────────────────────── */
  .session-toast {
    position: fixed;
    bottom: 56px; right: 24px;
    z-index: 99998;
    background: #0a1a2e;
    border: 1px solid #3b82f688;
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 12px;
    color: #93c5fd;
    font-family: var(--font-mono);
    box-shadow: 0 4px 20px rgba(0,0,0,0.6);
    animation: toastSlide .2s ease forwards;
    pointer-events: none;
  }

  /* ── Flag banner — upgraded ──────────────────────────────────────────────── */
  .flag-banner {
    background: linear-gradient(135deg, #14532d55, #052e1655, #14532d33);
    border: 2px solid #22c55e;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 12px;
    animation: flagPulse 2.5s ease-in-out infinite;
  }
  .flag-banner-header {
    font-size: 10px;
    color: #22c55e;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .flag-copy-btn {
    background: #22c55e22;
    border: 1px solid #22c55e55;
    color: #86efac;
    border-radius: 5px;
    padding: 4px 12px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 600;
    font-family: var(--font-mono);
    transition: background .15s, transform .15s, border-color .15s;
    white-space: nowrap;
  }
  .flag-copy-btn:hover {
    background: #22c55e44;
    border-color: #22c55e;
    transform: scale(1.03);
  }
  .flag-copy-btn.copied {
    background: #22c55e33;
    color: #fff;
  }

  /* ── Pipeline step connector ─────────────────────────────────────────────── */
  .pipe-connector {
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 24px;
    margin: -2px 0;
    position: relative;
  }
  .pipe-connector::before {
    content: '';
    width: 1px;
    flex: 1;
    background: linear-gradient(180deg, var(--accent)44, var(--accent)88);
  }
  .pipe-connector-arrow {
    font-size: 10px;
    color: var(--accent);
    line-height: 1;
    text-shadow: 0 0 8px var(--accent-glow);
  }

  /* ── Pipeline empty state ────────────────────────────────────────────────── */
  .pipe-empty {
    text-align: center;
    padding: 32px 20px;
    color: var(--text-3);
    font-family: var(--font-mono);
    font-size: 12px;
    border: 1px dashed var(--border);
    border-radius: 8px;
    background: var(--bg-card);
    margin-bottom: 12px;
  }
  .pipe-empty-icon {
    font-size: 28px;
    margin-bottom: 10px;
    opacity: 0.5;
  }
  .pipe-empty-title {
    font-size: 13px;
    color: var(--text-2);
    margin-bottom: 4px;
    font-weight: 600;
  }
  .pipe-empty-sub {
    font-size: 11px;
    color: var(--text-3);
  }

  /* ── Suggest next step card ──────────────────────────────────────────────── */
  .suggest-card {
    background: linear-gradient(135deg, #0a1628, #0d1f3a);
    border: 1px solid #334155;
    border-left: 3px solid var(--accent);
    border-radius: 7px;
    padding: 10px 14px;
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    animation: slideDown .2s ease forwards;
  }
  .suggest-card-label {
    font-size: 9px;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 1.5px;
    font-weight: 700;
    margin-bottom: 3px;
  }
  .suggest-card-title {
    font-size: 13px;
    color: var(--text-1);
    font-weight: 600;
  }
  .suggest-card-sub {
    font-size: 11px;
    color: var(--text-2);
    margin-top: 1px;
  }

  /* ── Pipeline button (Apply to Pipeline) ─────────────────────────────────── */
  .pipeline-btn {
    background: #1e3a5f;
    border: 1px solid #3b82f6;
    color: #93c5fd;
    border-radius: 5px;
    padding: 4px 12px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 600;
    font-family: var(--font-mono);
    transition: background .15s, transform .15s, border-color .15s, box-shadow .15s;
    position: relative;
  }
  .pipeline-btn:hover {
    background: var(--bg-active);
    border-color: var(--accent);
    color: var(--text-1);
    transform: scale(1.02);
    box-shadow: 0 0 12px var(--accent-glow);
  }

  /* ── Tooltip ─────────────────────────────────────────────────────────────── */
  /* JS tooltip (tooltip.js) handles all [data-tooltip] elements via position:fixed.
     The CSS pseudo-element fallback is disabled to prevent double-tooltips and
     clipping issues near the top navbar. */
  [data-tooltip] { position: relative; }
  [data-tooltip]::after {
    display: none !important;
    content: none;
  }
  [data-tooltip]:hover::after { display: none !important; }

  /* ── Topbar separator ────────────────────────────────────────────────────── */
  .topbar-sep {
    width: 1px;
    height: 18px;
    background: var(--border);
    margin: 0 2px;
    flex-shrink: 0;
  }

  /* ── Scan status bar ─────────────────────────────────────────────────────── */
  .scan-status {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px 14px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: var(--text-2);
  }
  .scan-status-text {
    flex: 1;
    color: var(--text-1);
    font-family: var(--font-mono);
  }

  /* ── Card hover lift ─────────────────────────────────────────────────────── */
  .card-lift {
    transition: transform .15s ease, box-shadow .15s ease;
  }
  .card-lift:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,204,255,0.08);
  }

  /* ── File drop zone drag-active glow ─────────────────────────────────────── */
  .drop-active {
    border-color: #00d4ff !important;
    background: #00d4ff06 !important;
    box-shadow: 0 0 20px #00d4ff12;
  }

  /* ── Metric stat box ─────────────────────────────────────────────────────── */
  .metric-box {
    background: #020810;
    border: 1px solid #0f2035;
    border-radius: 6px;
    padding: 10px 14px;
    text-align: center;
    font-family: var(--font-mono);
  }
  .metric-box .metric-label {
    font-size: 9px;
    color: #475569;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .metric-box .metric-value {
    font-size: 22px;
    font-weight: 700;
    margin-top: 3px;
  }

  /* ── Chain badge arrows ───────────────────────────────────────────────────── */
  .chain-step {
    display: inline-flex;
    align-items: center;
    font-size: 10px;
    font-family: var(--font-mono);
    padding: 2px 8px;
    border-radius: 3px;
    background: #0a1628;
    border: 1px solid #1e3a5f;
    color: #94a3b8;
  }
  .chain-arrow {
    font-size: 10px;
    color: #1e3a5f;
    margin: 0 3px;
    user-select: none;
  }

  /* ── Workspace bar ───────────────────────────────────────────────────────── */
  .workspace-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 16px;
    border-bottom: 1px solid var(--border-sub);
    background: var(--bg-app);
    font-size: 11px;
    flex-wrap: wrap;
    position: relative;
    z-index: 10;
  }

  .workspace-privacy-badge {
    font-size: 10px;
    color: var(--text-3);
    display: flex;
    align-items: center;
    gap: 4px;
    border-right: 1px solid var(--border-sub);
    padding-right: 10px;
    margin-right: 2px;
    font-family: var(--font-mono);
  }

  .workspace-switcher-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--bg-hover);
    border: 1px solid var(--border);
    border-radius: 5px;
    padding: 3px 10px;
    cursor: pointer;
    font-size: 11px;
    color: var(--text-1);
    font-weight: 600;
    font-family: var(--font-mono);
    max-width: 200px;
    transition: border-color .15s, background .15s;
  }
  .workspace-switcher-btn:hover {
    border-color: var(--accent);
    background: var(--accent-dim);
  }

  .workspace-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 9999;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    min-width: 220px;
    overflow: hidden;
    animation: fadeInUp .12s ease forwards;
  }

  .workspace-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 10px;
    border-bottom: 1px solid var(--border-sub);
    transition: background .1s;
  }
  .workspace-item:hover { background: var(--bg-hover); }
  .workspace-item.active { background: var(--bg-active); }

  .workspace-confirm-overlay {
    position: fixed;
    inset: 0;
    z-index: 99999;
    background: rgba(0,0,0,0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn .1s ease;
  }

  .workspace-confirm-modal {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 24px 28px;
    max-width: 380px;
    width: 90%;
    box-shadow: 0 8px 40px rgba(0,0,0,0.5);
  }

  /* Result card hover lift */
  .result-card-best,
  .result-card-other {
    transition: transform .15s ease, box-shadow .15s ease;
  }
  .result-card-best:hover,
  .result-card-other:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0,0,0,.15);
  }

  /* Confidence bar — verdict subtitle */
  .conf-bar-verdict {
    font-size: 9px;
    font-family: var(--font-mono);
    color: var(--text-3);
    margin-top: 2px;
    letter-spacing: .3px;
  }

  /* Suggestion card entrance animation */
  .assist-panel { animation: fadeInUp .2s ease forwards; }

  /* Pipeline preview step flow — hover highlight */
  .pipeline-step-chip {
    font-size: 10px;
    font-weight: 600;
    border-radius: 3px;
    padding: 2px 8px;
    transition: transform .1s, box-shadow .1s;
  }
  .pipeline-step-chip:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0,0,0,.2);
  }

  /* Confidence verdict panel entrance */
  .conf-verdict { animation: fadeIn .15s ease forwards; }

  /* Hint banner dismiss button */
  .hint-dismiss {
    position: absolute; top: 6px; right: 8px;
    background: none; border: none;
    color: var(--text-3); cursor: pointer;
    font-size: 14px; line-height: 1;
    transition: color .15s;
  }
  .hint-dismiss:hover { color: var(--text-1); }

  /* Mode toggles in toolbar — active glow */
  .mode-toggle-active {
    animation: fadeIn .15s ease;
    box-shadow: 0 0 8px var(--accent)22;
  }

  /* Explain box */
  .explain-box {
    border-left: 3px solid var(--accent-2);
    animation: slideDown .2s ease forwards;
  }

`;

export default styles;
