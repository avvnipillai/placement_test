(() => {
  const $ = (sel) => document.querySelector(sel);

  const viewIntake = $('#view-intake');
  const viewLoading = $('#view-loading');
  const viewResults = $('#view-results');
  const modeChip = $('#modeChip');

  /* ---------------- CGPA gauge ---------------- */
  const cgpaInput = $('#cgpa');
  const cgpaVal = $('#cgpaVal');
  const gaugeFill = $('#gaugeFill');
  const gaugeNeedle = $('#gaugeNeedle');
  const GAUGE_LEN = 283;

  function paintGauge(v){
    const frac = v / 10;
    gaugeFill.style.strokeDashoffset = String(GAUGE_LEN - frac * GAUGE_LEN);
    const angle = frac * 180 - 90;
    gaugeNeedle.style.transform = `rotate(${angle}deg)`;
    const color = v < 6 ? '#ff7a7a' : v < 8 ? '#ffab5e' : '#4ee8b0';
    gaugeFill.style.stroke = color;
    cgpaVal.textContent = v.toFixed(1);
  }
  cgpaInput.addEventListener('input', () => paintGauge(parseFloat(cgpaInput.value)));
  paintGauge(parseFloat(cgpaInput.value));

  /* ---------------- Weeks calendar ---------------- */
  const weeksInput = $('#weeks');
  const weeksVal = $('#weeksVal');
  const calendarStrip = $('#calendarStrip');
  const MAX_WEEKS = 12;

  function buildCalendar(){
    calendarStrip.innerHTML = '';
    for (let i = 1; i <= MAX_WEEKS; i++){
      const d = document.createElement('div');
      d.className = 'cal-day';
      d.dataset.i = i;
      calendarStrip.appendChild(d);
    }
  }
  function paintCalendar(v){
    weeksVal.textContent = v;
    [...calendarStrip.children].forEach((el) => {
      el.classList.toggle('lit', parseInt(el.dataset.i, 10) <= v);
    });
  }
  buildCalendar();
  weeksInput.addEventListener('input', () => paintCalendar(parseInt(weeksInput.value, 10)));
  paintCalendar(parseInt(weeksInput.value, 10));

  /* ---------------- Company chips + skyline ---------------- */
  const companyInput = $('#companyInput');
  const chipInputBox = $('#chipInput');
  const skyline = $('#skyline');
  const skylineEmpty = $('#skylineEmpty');
  let companies = [];

  function hashSeed(str){
    let h = 0;
    for (let i = 0; i < str.length; i++){ h = (h * 31 + str.charCodeAt(i)) >>> 0; }
    return h;
  }

  function renderChips(){
    chipInputBox.querySelectorAll('.chip').forEach((c) => c.remove());
    companies.forEach((name, idx) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.innerHTML = `${name} <button type="button" aria-label="remove">&times;</button>`;
      chip.querySelector('button').addEventListener('click', () => {
        companies.splice(idx, 1);
        renderChips();
        renderSkyline();
      });
      chipInputBox.insertBefore(chip, companyInput);
    });
  }

  function renderSkyline(){
    while (skyline.children.length > 1) skyline.removeChild(skyline.lastChild);
    skylineEmpty.style.display = companies.length ? 'none' : 'flex';
    const n = companies.length;
    if (!n) return;
    const slot = 600 / n;
    companies.forEach((name, idx) => {
      const seed = hashSeed(name);
      const h = 46 + (seed % 62);
      const w = Math.min(70, slot * 0.55);
      const x = idx * slot + (slot - w) / 2;
      const y = 122 - h;
      const ns = 'http://www.w3.org/2000/svg';

      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', x); rect.setAttribute('y', 122);
      rect.setAttribute('width', w); rect.setAttribute('height', 0);
      rect.setAttribute('rx', 3);
      rect.setAttribute('class', 'bldg');
      rect.setAttribute('fill', idx % 2 === 0 ? 'rgba(124,108,246,0.35)' : 'rgba(255,171,94,0.3)');
      rect.setAttribute('stroke', 'rgba(255,255,255,0.12)');
      skyline.appendChild(rect);
      requestAnimationFrame(() => {
        rect.setAttribute('y', y);
        rect.setAttribute('height', h);
      });

      const cols = Math.max(1, Math.floor(w / 14));
      const rows = Math.max(1, Math.floor(h / 14));
      for (let r = 0; r < rows; r++){
        for (let c = 0; c < cols; c++){
          if ((seed + r * 7 + c * 3) % 3 === 0) continue;
          const win = document.createElementNS(ns, 'rect');
          win.setAttribute('x', x + 4 + c * 12);
          win.setAttribute('y', y + 6 + r * 12);
          win.setAttribute('width', 5); win.setAttribute('height', 6);
          win.setAttribute('class', 'bldg-window');
          win.style.animationDelay = `${0.3 + (r + c) * 0.06}s`;
          skyline.appendChild(win);
        }
      }

      const label = document.createElementNS(ns, 'text');
      label.setAttribute('x', x + w / 2);
      label.setAttribute('y', 122 + 14);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('fill', '#8b8fa3');
      label.setAttribute('font-size', '9');
      label.setAttribute('font-family', 'JetBrains Mono, monospace');
      label.textContent = name.length > 10 ? name.slice(0, 9) + '…' : name;
      skyline.appendChild(label);
    });
  }

  function addCompany(raw){
    raw.split(',').forEach((piece) => {
      const name = piece.trim();
      if (name && !companies.includes(name)) companies.push(name);
    });
    renderChips();
    renderSkyline();
  }

  companyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ','){
      e.preventDefault();
      if (companyInput.value.trim()){
        addCompany(companyInput.value);
        companyInput.value = '';
      }
    } else if (e.key === 'Backspace' && !companyInput.value && companies.length){
      companies.pop();
      renderChips();
      renderSkyline();
    }
  });
  companyInput.addEventListener('blur', () => {
    if (companyInput.value.trim()){
      addCompany(companyInput.value);
      companyInput.value = '';
    }
  });

  /* ---------------- Form submit -> pipeline -> results ---------------- */
  const form = $('#intakeForm');
  const formError = $('#formError');
  const generateBtn = $('#generateBtn');

  function showView(view){
    [viewIntake, viewLoading, viewResults].forEach((v) => v.classList.add('hidden'));
    view.classList.remove('hidden');
  }

  async function runLoadingSequence(){
    showView(viewLoading);
    const nodes = [$('#node1'), $('#node2'), $('#node3')];
    const lines = [$('#line1'), $('#line2')];
    const caption = $('#pipelineCaption');
    const steps = [
      'Scanning live listings…',
      'Cross-referencing interview data…',
      'Synthesizing your 7-day plan…',
    ];
    nodes.forEach((n) => n.classList.remove('active', 'done'));
    lines.forEach((l) => l.classList.remove('flow'));

    for (let i = 0; i < nodes.length; i++){
      caption.textContent = steps[i];
      nodes[i].classList.add('active');
      if (lines[i]) lines[i].classList.add('flow');
      await new Promise((r) => setTimeout(r, 700));
      nodes[i].classList.remove('active');
      nodes[i].classList.add('done');
      if (lines[i]) lines[i].classList.remove('flow');
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.textContent = '';

    if (!companyInput.value && companies.length === 0){
      formError.textContent = 'Add at least one target company.';
      return;
    }
    if (companyInput.value.trim()){
      addCompany(companyInput.value);
      companyInput.value = '';
    }

    const payload = {
      branch: $('#branch').value.trim(),
      target_role: $('#role').value.trim(),
      cgpa: parseFloat(cgpaInput.value),
      weeks: parseInt(weeksInput.value, 10),
      companies,
    };

    if (!payload.branch || !payload.target_role){
      formError.textContent = 'Fill in your branch and target role.';
      return;
    }

    generateBtn.disabled = true;
    const loadingPromise = runLoadingSequence();

    try {
      const [res] = await Promise.all([
        fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
        loadingPromise,
      ]);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      renderResults(data);
      modeChip.textContent = data.live_mode ? 'live agent pipeline' : 'demo signal mode';
      showView(viewResults);
    } catch (err){
      showView(viewIntake);
      formError.textContent = err.message || 'Could not generate your plan. Try again.';
    } finally {
      generateBtn.disabled = false;
    }
  });

  /* ---------------- Results rendering ---------------- */
  function renderResults(data){
    const { student, brief } = data;
    const bento = $('#bento');
    bento.innerHTML = '';

    const gaugeColor = student.cgpa < 6 ? '#ff7a7a' : student.cgpa < 8 ? '#ffab5e' : '#4ee8b0';

    bento.innerHTML = `
      <div class="card card--summary">
        <div>
          <h2 class="summary-title">${student.branch} · ${student.target_role}</h2>
          <p class="summary-sub">${student.weeks_to_placement} week${student.weeks_to_placement === 1 ? '' : 's'} on the clock — here's where to spend them.</p>
        </div>
        <div style="display:flex; gap:10px; align-items:center;">
          <span class="summary-pill">${brief.eligible_companies.length} of ${data.companies.length} companies eligible</span>
          <button class="btn-restart" id="restartBtn">Start over</button>
        </div>
      </div>

      <div class="card card--skyline">
        <div class="card-head">
          <h3 class="card-title">Companies you're eligible for</h3>
          <span class="card-tag">skyline</span>
        </div>
        <svg id="resultSkyline" viewBox="0 0 600 130" preserveAspectRatio="xMidYMax meet"></svg>
      </div>

      <div class="card card--gauge">
        <svg viewBox="0 0 200 110" style="width:200px;height:110px;overflow:visible;">
          <path d="M10 100 A90 90 0 0 1 190 100" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="10" stroke-linecap="round"/>
          <path d="M10 100 A90 90 0 0 1 190 100" fill="none" stroke="${gaugeColor}" stroke-width="10" stroke-linecap="round"
            stroke-dasharray="283" stroke-dashoffset="${283 - (student.cgpa / 10) * 283}"/>
          <line x1="100" y1="100" x2="100" y2="28" stroke="#fff" stroke-width="3" stroke-linecap="round"
            transform="rotate(${(student.cgpa / 10) * 180 - 90} 100 100)"/>
          <circle cx="100" cy="100" r="6" fill="#a78bfa"/>
        </svg>
        <p class="result-gauge-val">${student.cgpa.toFixed(1)}</p>
        <p class="result-gauge-label">your CGPA</p>
      </div>

      <div class="card card--priority">
        <div class="card-head">
          <h3 class="card-title">Prepare for this</h3>
          <span class="card-tag">high priority</span>
        </div>
        <div class="tagcloud">
          ${brief.high_priority_topics.map((t, i) => `<span class="tag-pill" style="animation-delay:${i * 0.06}s"><span class="dot"></span>${t}</span>`).join('')}
        </div>
      </div>

      <div class="card card--skip">
        <div class="card-head">
          <h3 class="card-title">Skip for now</h3>
          <span class="card-tag">low ROI</span>
        </div>
        <ul class="skip-list">
          ${brief.topics_to_skip_for_now.map((t) => `<li>${t}</li>`).join('')}
        </ul>
      </div>

      <div class="card card--plan">
        <div class="card-head">
          <h3 class="card-title">Your 7-day action plan</h3>
          <span class="card-tag">tap a day to check it off</span>
        </div>
        <div class="timeline" id="timeline">
          ${brief.action_plan.map((step, i) => `
            <div class="day-card" data-i="${i}">
              <span class="day-num">DAY ${i + 1}</span>
              <span class="day-text">${step.replace(/^Day\s*\d+:\s*/i, '')}</span>
              <span class="day-check"></span>
            </div>`).join('')}
        </div>
        <div class="progress-track"><div class="progress-fill" id="progressFill"></div></div>
      </div>
    `;

    drawResultSkyline(brief.eligible_companies);

    $('#restartBtn').addEventListener('click', () => {
      showView(viewIntake);
    });

    const dayCards = bento.querySelectorAll('.day-card');
    const progressFill = $('#progressFill');
    dayCards.forEach((card) => {
      card.addEventListener('click', () => {
        card.classList.toggle('checked');
        const done = bento.querySelectorAll('.day-card.checked').length;
        progressFill.style.width = `${(done / dayCards.length) * 100}%`;
      });
    });
  }

  function drawResultSkyline(names){
    const ns = 'http://www.w3.org/2000/svg';
    const svg = $('#resultSkyline');
    const ground = document.createElementNS(ns, 'line');
    ground.setAttribute('x1', 0); ground.setAttribute('y1', 122);
    ground.setAttribute('x2', 600); ground.setAttribute('y2', 122);
    ground.setAttribute('stroke', 'rgba(255,255,255,0.12)');
    svg.appendChild(ground);

    if (!names.length) return;
    const slot = 600 / names.length;
    names.forEach((name, idx) => {
      const seed = Array.from(name).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0);
      const h = 50 + (seed % 60);
      const w = Math.min(80, slot * 0.55);
      const x = idx * slot + (slot - w) / 2;
      const y = 122 - h;
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', x); rect.setAttribute('y', y);
      rect.setAttribute('width', w); rect.setAttribute('height', h);
      rect.setAttribute('rx', 3);
      rect.setAttribute('fill', idx % 2 === 0 ? 'rgba(124,108,246,0.4)' : 'rgba(255,171,94,0.35)');
      rect.setAttribute('stroke', 'rgba(255,255,255,0.14)');
      svg.appendChild(rect);

      const label = document.createElementNS(ns, 'text');
      label.setAttribute('x', x + w / 2);
      label.setAttribute('y', 122 + 14);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('fill', '#a9adc2');
      label.setAttribute('font-size', '10');
      label.setAttribute('font-family', 'JetBrains Mono, monospace');
      label.textContent = name.length > 12 ? name.slice(0, 11) + '…' : name;
      svg.appendChild(label);
    });
  }

  /* initial mode chip ping */
  fetch('/healthz').then((r) => r.json()).then((d) => {
    modeChip.textContent = d.live_mode ? 'live agent pipeline ready' : 'demo signal mode';
  }).catch(() => { modeChip.textContent = 'demo signal mode'; });
})();
