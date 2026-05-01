(function () {
  'use strict';

  /* ---- Constants ---- */
  const MONTHS = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
                  'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  const MAX_PER_DAY = 9;
  const IMP_TIMEOUT = 40 * 60 * 1000; // 40 min

  const SC = { HACER:'#6B2737', PROCESANDO:'#C0392B', HECHO:'#27AE60', POR_DEFINIR:'#a0a4b8' };
  const SL = { HACER:'HACER', PROCESANDO:'PROCESANDO', HECHO:'HECHO', POR_DEFINIR:'POR DEFINIR' };

  const TODAY = new Date();
  TODAY.setHours(0,0,0,0);

  /* ---- State ---- */
  let uid = 0;
  let workItems = [];
  let impItems  = [];
  let calYear   = TODAY.getFullYear();
  let calMonth  = TODAY.getMonth();

  /* =========================================
     WORK LIST
  ========================================= */
  function mkItem(nota, desc, fecha, status) {
    return { id: uid++, nota: nota||'', desc: desc||'', fecha: fecha||'', status: status||'POR_DEFINIR' };
  }

  function initWork() {
    for (let i = 0; i < 15; i++) workItems.push(mkItem());
    renderWork();
  }

  function renderWork() {
    const el = document.getElementById('workList');
    el.innerHTML = '';
    workItems.forEach(item => el.appendChild(buildRow(item)));
    updateSeg();
    renderCal();
  }

  function buildRow(item) {
    const empty = !item.nota && !item.desc && !item.fecha;
    const div = document.createElement('div');
    div.className = 'work-row' + (empty ? ' is-empty' : '');
    div.id = 'wr-' + item.id;

    div.innerHTML = `
      <div class="w-cell c-nota">
        <input type="text" maxlength="6" placeholder="NOTA"
          value="${esc(item.nota)}"
          data-id="${item.id}" data-f="nota" oninput="cellIn(this)">
      </div>
      <div class="w-cell c-desc">
        <textarea maxlength="90" placeholder="DESCRIPCION CORTA"
          data-id="${item.id}" data-f="desc" oninput="cellIn(this)">${esc(item.desc)}</textarea>
      </div>
      <div class="w-cell c-fecha">
        <input type="text" maxlength="5" placeholder="DD/MM"
          value="${esc(item.fecha)}"
          data-id="${item.id}" data-f="fecha" oninput="cellIn(this)">
      </div>
      <div class="w-cell c-status">
        <button class="s-btn st-${item.status}" id="sbtn-${item.id}"
          style="background:${SC[item.status]}"
          onclick="toggleDD(${item.id})">${SL[item.status]} <span>▾</span></button>
        <div class="s-dropdown" id="sdd-${item.id}">
          <div class="s-opt" style="background:#6B2737" onclick="setStatus(${item.id},'HACER')">HACER</div>
          <div class="s-opt" style="background:#C0392B" onclick="setStatus(${item.id},'PROCESANDO')">PROCESANDO</div>
          <div class="s-opt" style="background:#27AE60" onclick="setStatus(${item.id},'HECHO')">HECHO</div>
        </div>
      </div>`;
    return div;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  window.cellIn = function(el) {
    const id = +el.dataset.id, f = el.dataset.f;
    const item = workItems.find(i => i.id === id);
    if (!item) return;
    item[f] = el.value;
    const row = document.getElementById('wr-' + id);
    if (row) {
      row.classList.toggle('is-empty', !item.nota && !item.desc && !item.fecha);
    }
    updateSeg();
    renderCal();
  };

  window.toggleDD = function(id) {
    closeAllDD(id);
    const dd = document.getElementById('sdd-' + id);
    if (dd) dd.classList.toggle('open');
  };

  function closeAllDD(except) {
    document.querySelectorAll('.s-dropdown.open').forEach(d => {
      if (d.id !== 'sdd-' + except) d.classList.remove('open');
    });
  }

  document.addEventListener('click', e => {
    if (!e.target.closest('.c-status')) closeAllDD();
  });

  window.setStatus = function(id, status) {
    closeAllDD();
    const item = workItems.find(i => i.id === id);
    if (!item) return;
    item.status = status;

    if (status === 'HECHO') {
      const row = document.getElementById('wr-' + id);
      if (row) {
        row.classList.add('row-fading');
        setTimeout(() => {
          const idx = workItems.findIndex(i => i.id === id);
          if (idx >= 0) {
            const [gone] = workItems.splice(idx, 1);
            // Reset and push to bottom
            gone.id = uid++;
            gone.nota = ''; gone.desc = ''; gone.fecha = '';
            gone.status = 'POR_DEFINIR';
            workItems.push(gone);
          }
          renderWork();
        }, 660);
      }
    } else {
      const btn = document.getElementById('sbtn-' + id);
      if (btn) {
        btn.style.background = SC[status];
        btn.className = `s-btn st-${status}`;
        btn.innerHTML = SL[status] + ' <span>▾</span>';
      }
      updateSeg();
    }
  };

  /* =========================================
     SEGUIMIENTO
  ========================================= */
  function updateSeg() {
    const filled = workItems.filter(i => i.nota || i.desc);
    const proc  = filled.filter(i => i.status === 'PROCESANDO').length;
    const hacer = filled.filter(i => i.status === 'HACER').length;

    document.getElementById('cntProc').textContent  = proc;
    document.getElementById('cntHacer').textContent = hacer;

    const active = filled.filter(i => i.status === 'HACER' || i.status === 'PROCESANDO');
    for (let n = 1; n <= 3; n++) {
      const el = document.getElementById('prox' + n);
      const t  = active[n - 1];
      el.textContent = t ? (t.nota || t.desc.slice(0, 20) || 'TAREA').toUpperCase() : `PROXIMA TAREA ${n}`;
    }
  }

  /* =========================================
     IMPORTANTE
  ========================================= */
  function renderImp() {
    const ul = document.getElementById('impList');
    ul.innerHTML = '';
    impItems.forEach((item, i) => {
      if (item.hidden) return;
      const li = document.createElement('li');
      li.className = 'imp-item' + (item.done ? ' done' : '');
      li.innerHTML = `<div class="imp-circle">${item.done ? '✓' : ''}</div>
                      <span class="imp-label">${esc(item.text)}</span>`;
      li.onclick = () => toggleImp(i);
      ul.appendChild(li);
    });
  }

  function toggleImp(i) {
    const item = impItems[i];
    if (!item) return;
    item.done = !item.done;
    if (item.done) {
      clearTimeout(item.timer);
      item.timer = setTimeout(() => { item.hidden = true; renderImp(); }, IMP_TIMEOUT);
    } else {
      clearTimeout(item.timer);
    }
    renderImp();
  }

  /* =========================================
     CALENDAR
  ========================================= */
  function renderCal() {
    const monthLbl = document.getElementById('calMonthLbl');
    const yearLbl  = document.getElementById('calYearLbl');
    monthLbl.textContent = MONTHS[calMonth];

    const showYear = calYear !== TODAY.getFullYear();
    yearLbl.style.display = showYear ? 'block' : 'none';
    yearLbl.textContent = calYear;

    // Task count by date key dd/mm
    const byDate = {};
    workItems.forEach(it => {
      if (it.fecha && it.status !== 'HECHO' && it.status !== 'POR_DEFINIR') {
        byDate[it.fecha] = (byDate[it.fecha] || 0) + 1;
      }
    });

    const grid = document.getElementById('calGrid');
    grid.innerHTML = '';

    // Headers
    ['LU','MA','MI','JU','VI','SA','DO'].forEach((h, i) => {
      const d = document.createElement('div');
      d.className = 'cal-hdr' + (i === 5 ? ' sa' : i === 6 ? ' do' : '');
      d.textContent = h;
      grid.appendChild(d);
    });

    // First day offset (Mon = 0)
    const firstDow = new Date(calYear, calMonth, 1).getDay();
    const offset   = (firstDow + 6) % 7;
    for (let i = 0; i < offset; i++) {
      const e = document.createElement('button');
      e.className = 'cal-day cal-empty';
      e.disabled = true;
      grid.appendChild(e);
    }

    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const tY = TODAY.getFullYear(), tM = TODAY.getMonth(), tD = TODAY.getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const dow  = (new Date(calYear, calMonth, d).getDay() + 6) % 7; // 0=Mon,6=Sun
      const isSun = dow === 6;
      const isSat = dow === 5;
      const isToday = d === tD && calMonth === tM && calYear === tY;
      const isPast  = new Date(calYear, calMonth, d) < TODAY;

      const mm  = String(calMonth + 1).padStart(2,'0');
      const dd  = String(d).padStart(2,'0');
      const key = `${dd}/${mm}`;
      const cnt = byDate[key] || 0;

      const btn = document.createElement('button');
      btn.textContent = d;

      let cls = 'cal-day';
      if (isSun) cls += ' cal-sun';
      else if (isSat) cls += ' cal-sat';
      if (isToday) cls += ' cal-today';
      if (isPast && !isToday) cls += ' cal-past';
      if (!isSun && cnt > 0) {
        if      (cnt <= 3) cls += ' g1-3';
        else if (cnt <= 6) cls += ' g4-6';
        else               cls += ' g7-9';
      }

      btn.className = cls;
      if (isSun) { btn.disabled = true; }
      else        { btn.onclick = () => onDayClick(d, cnt); }

      grid.appendChild(btn);
    }

    // Nav limits
    const minY = TODAY.getFullYear(), minM = TODAY.getMonth();
    const maxY = Math.max(TODAY.getFullYear(), 2026);

    document.getElementById('btnPrev').disabled = (calYear === minY && calMonth === minM);
    document.getElementById('btnNext').disabled = (calYear === maxY && calMonth === 11);
  }

  function onDayClick(d, cnt) {
    if (cnt >= MAX_PER_DAY) showNotif('AGENDA LLENA — PASA AL SIGUIENTE DÍA');
  }

  window.calNav = function(dir) {
    let m = calMonth + dir, y = calYear;
    if (m > 11) { m = 0; y++; }
    if (m <  0) { m = 11; y--; }

    const minY = TODAY.getFullYear(), minM = TODAY.getMonth();
    const maxY = Math.max(TODAY.getFullYear(), 2026);

    if (y < minY || (y === minY && m < minM)) return;
    if (y > maxY || (y === maxY && m > 11))   return;

    calYear = y; calMonth = m;
    renderCal();
  };

  /* =========================================
     NOTIFICATION
  ========================================= */
  let notifTimer = null;
  function showNotif(msg) {
    const n = document.getElementById('notifBar');
    n.textContent = msg;
    n.classList.add('show');
    clearTimeout(notifTimer);
    notifTimer = setTimeout(() => n.classList.remove('show'), 3200);
  }

  /* =========================================
     PUBLIC API — Claude usa esto para llenar datos
     Desde la consola del navegador:
       framar.addTask('015', 'Lona de taller', '12/05', 'HACER')
       framar.addImportante('Llamar a proveedor')
       framar.setData([...tasks], [...importantes])
  ========================================= */
  window.framar = {

    addTask(nota, desc, fecha, status) {
      const empty = workItems.find(i => !i.nota && !i.desc && !i.fecha);
      if (empty) {
        empty.nota = nota || '';
        empty.desc = desc || '';
        empty.fecha = fecha || '';
        empty.status = (status || 'POR_DEFINIR').toUpperCase().replace(' ', '_');
      } else {
        workItems.push(mkItem(nota, desc, fecha, (status||'POR_DEFINIR').toUpperCase().replace(' ','_')));
      }
      renderWork();
    },

    addImportante(text) {
      impItems.push({ text, done: false, hidden: false, timer: null });
      renderImp();
    },

    clearAll() {
      workItems = [];
      impItems  = [];
      for (let i = 0; i < 15; i++) workItems.push(mkItem());
      renderWork();
      renderImp();
    },

    /**
     * Carga datos completos de una sola vez.
     * tasks: [{ nota, desc, fecha, status }, ...]
     * importantes: ['texto 1', 'texto 2', ...]
     */
    setData(tasks, importantes) {
      workItems = [];
      impItems  = [];
      for (let i = 0; i < 15; i++) workItems.push(mkItem());
      if (tasks) tasks.forEach(t => this.addTask(t.nota, t.desc, t.fecha, t.status));
      if (importantes) importantes.forEach(t => this.addImportante(t));
    }
  };

  /* ---- Boot ---- */
  initWork();
  renderCal();
  renderImp();

})();
