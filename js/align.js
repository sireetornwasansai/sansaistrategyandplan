/* v2.10 · ความสอดคล้องกับยุทธศาสตร์กระทรวง สธ. (ยุทธศาสตร์ → แผนงาน → โครงการ → ตัวชี้วัด)
   ทุกคนเปิดดูได้ · งบ/ผู้รับผิดชอบเห็นเฉพาะเจ้าหน้าที่และแอดมิน · เจ้าหน้าที่/แอดมินเชื่อมโยงและแก้ย้อนหลังได้ (ลงประวัติทุกครั้ง) */
(function () {
  'use strict';
  const App = window.App, esc = App.esc, S = App.state;
  const memo = { year: '', tab: 'tree', sel: {} };
  const LV = { high: ['มั่นใจสูง', 'green'], mid: ['มั่นใจปานกลาง', 'amber'], low: ['มั่นใจต่ำ', 'gray'] };
  const act = r => r.Active !== false;
  const baht = n => '฿' + App.money(n, 0);
  let cache = null;

  const yearOpts = () => ['all'].concat(App.years()).map(y => '<option value="' + y + '"' + (String(y) === String(memo.year) ? ' selected' : '') + '>' + (y === 'all' ? 'ทุกปี (ย้อนหลัง)' : y) + '</option>').join('');
  const stat = (l, v, sub, cls) => '<div class="xstat ' + (cls || '') + '"><div class="xstat-label">' + l + '</div><div class="xstat-value">' + v + '</div><div class="xstat-sub">' + sub + '</div></div>';
  const planRow = (e, money) => '<li class="al-plan"><a href="#/plan/' + esc(e.planId) + '">' + esc(e.name) + '</a> <span class="muted small">ปี ' + esc(e.year) + '</span> ' + App.badge(e.status) +
    (money ? '<span class="muted small al-meta">' + esc(e.owner || '') + ' · ' + baht(e.budget) + '</span>' : '') + '</li>';

  // ---- ตัวเลือกโครงการ สธ. จัดกลุ่มตามแผนงาน (ใช้ทั้งหน้านี้และฟอร์มแผน)
  App.alignProjectOptions = (selected, strategy) => {
    const D = App.masters().data, pg = (D.moprog || []).filter(act).filter(g => !strategy || String(g.StrategyCode) === String(strategy));
    return pg.map(g => '<optgroup label="ยุทธศาสตร์ ' + esc(g.StrategyCode) + ' · ' + esc(g.Name) + '">' + (D.mopro || []).filter(j => act(j) && String(j.ProgramCode) === String(g.Code)).map(j =>
      '<option value="' + esc(j.Code) + '"' + (j.Code === selected ? ' selected' : '') + '>' + esc(j.Code + ' ' + j.Name) + '</option>').join('') + '</optgroup>').join('');
  };

  App.pages.align = async function (view) {
    memo.year = memo.year || String(S.year);
    view.innerHTML = App.skeleton();
    const d = cache = await App.api('align.summary', { year: memo.year }), st = d.stats, can = App.can(), pct = st.plans ? Math.round(st.linked / st.plans * 100) : 0;
    const tabs = [['tree', 'ภาพรวมตามยุทธศาสตร์', 0], ['unlinked', 'ยังไม่เชื่อมโยง', st.unlinked], ['mismatch', 'ข้อมูลไม่ตรงกัน', st.mismatch], ['gaps', 'โครงการ สธ. ที่ยังไม่มีแผนรองรับ', st.gaps]];
    if (!tabs.some(t => t[0] === memo.tab)) memo.tab = 'tree';
    view.innerHTML = App.pageHead('ความสอดคล้องยุทธศาสตร์ สธ.', 'ยุทธศาสตร์กระทรวงสาธารณสุข' + (d.frameworkYear ? ' ปี ' + esc(d.frameworkYear) : '') + ' · เชื่อมแผนของ รพ. กับแผนงาน โครงการ และตัวชี้วัด — ไม่นับแผนที่ยกเลิกและแหล่งเงินระดับเขต',
        '<label class="inline-field"><span>ปีงบประมาณ</span><select id="al-year">' + yearOpts() + '</select></label>') +
      '<div class="xstats xstats4">' + stat('แผนที่เชื่อมโยงแล้ว', pct + '%', st.linked + ' จาก ' + st.plans + ' แผน', 'c') +
        stat('ยังไม่เชื่อมโยง', st.unlinked, st.mismatch ? 'และข้อมูลไม่ตรงกัน ' + st.mismatch + ' แผน' : 'ต้องระบุโครงการ สธ.', st.unlinked ? 'warn' : 'c') +
        stat('ตัวชี้วัดที่มีแผนรองรับ', st.kpiCovered + '/' + st.kpis, 'แผนที่เชื่อมโครงการแต่ยังไม่ระบุตัวชี้วัด ' + st.noKpi + ' แผน', 'b') +
        stat('โครงการ สธ. ที่ยังว่าง', st.gaps + '/' + st.projects, 'ยังไม่มีแผนของ รพ. รองรับ', st.gaps ? 'warn' : 'c') + '</div>' +
      '<div class="tabs scroll" role="tablist">' + tabs.map(t => '<button class="tab' + (t[0] === memo.tab ? ' on' : '') + '" role="tab" aria-selected="' + (t[0] === memo.tab) + '" data-act="alignTab" data-id="' + t[0] + '">' + t[1] + (t[2] ? ' <span class="count">' + t[2] + '</span>' : '') + '</button>').join('') + '</div>' +
      '<div id="al-body"></div>' +
      (memo.year === 'all' || +memo.year < +(S.masters.settings.CurrentYear) ? '<p class="muted small">แผนปีก่อนหน้าเชื่อมโยงกับกรอบ ' + esc(d.frameworkYear) + ' ได้เช่นกัน ทุกการเปลี่ยนแปลงบันทึกใน “ประวัติการทำรายการ” และย้อนแก้ได้' + (can ? '' : ' (เฉพาะเจ้าหน้าที่/แอดมิน)') + '</p>' : '');
    document.getElementById('al-year').addEventListener('change', e => { memo.year = e.target.value; memo.sel = {}; App.render(); });
    draw(d);
  };

  function draw(d) {
    const host = document.getElementById('al-body'); if (!host) return;
    host.innerHTML = { tree: tree, unlinked: unlinked, mismatch: mismatch, gaps: gaps }[memo.tab](d);
    const sel = host.querySelectorAll('select[data-plan]');
    sel.forEach(s => s.addEventListener('change', () => { const r = s.closest('tr'), cb = r.querySelector('input[type=checkbox]'); if (cb) cb.checked = !!s.value; }));
  }
  App.actions.alignTab = el => { memo.tab = el.dataset.id; App.render(); };

  function tree(d) {
    return d.tree.map(s => '<details class="card act al-st"' + (s.plans ? ' open' : '') + '><summary><span><b>ยุทธศาสตร์ที่ ' + esc(s.code) + '</b> ' + esc(s.name) + '</span><span>' + App.badge(s.plans + ' แผน', s.plans ? 'blue' : 'gray') + '</span></summary><div class="al-in">' +
      s.programs.map(g => '<section class="al-prog"><h3>แผนงานที่ ' + esc(g.code.replace('P', '')) + ' · ' + esc(g.name) + ' <small class="muted">' + g.planCount + ' แผน</small></h3>' +
        g.projects.map(j => '<details class="al-pj' + (j.planCount ? '' : ' empty') + '"' + (j.planCount ? '' : '') + '><summary><span><code>' + esc(j.code) + '</code> ' + esc(j.name) + '</span><span>' + (j.planCount ? App.badge(j.planCount + ' แผน', 'green') + (j.budget !== undefined ? ' <span class="muted small">' + baht(j.budget) + '</span>' : '') : App.badge('ยังไม่มีแผนรองรับ', 'amber')) + '</span></summary>' +
          '<div class="al-kpis">' + j.kpis.map(k => '<div class="al-kpi"><i class="fas ' + (k.planCount ? 'fa-circle-check ok' : 'fa-circle-dot') + '"></i><span>' + esc(k.name) + '</span><b>' + (k.planCount ? k.planCount + ' แผน' : '—') + '</b></div>').join('') + '</div>' +
          (j.plans.length ? '<ul class="al-plans">' + j.plans.map(e => planRow(e, d.canMoney)).join('') + '</ul>' : '') + '</details>').join('') + '</section>').join('') + '</div></details>').join('');
  }

  function projectSelect(planId, cur) { return '<select data-plan="' + esc(planId) + '" class="compact"' + (App.can() ? '' : ' disabled') + '><option value="">— เลือกโครงการ สธ. —</option>' + App.alignProjectOptions(cur) + '</select>'; }

  function unlinked(d) {
    if (!d.unlinked.length) return '<div class="card empty">ทุกแผนในขอบเขตนี้เชื่อมโยงกับโครงการ สธ. แล้ว</div>';
    const can = App.can();
    return '<p class="muted small">ระบบแนะนำโครงการจากคำในชื่อแผนเป็นเพียงข้อเสนอเบื้องต้น — ตรวจและยืนยันก่อนบันทึกทุกครั้ง แผนที่ไม่มีโครงการตรง (เช่น งานสนับสนุนทั่วไป) ให้เลือกโครงการที่ใกล้เคียงที่สุดหรือปล่อยว่างไว้</p>' +
      (can ? '<div class="xbar"><button class="btn" data-act="alignSuggest"><i class="fas fa-wand-magic-sparkles"></i> เติมคำแนะนำ (มั่นใจปานกลางขึ้นไป)</button><button class="btn primary" data-act="alignSave"><i class="fas fa-link"></i> บันทึกที่เลือก</button></div>' : '') +
      '<div class="card table-card"><div class="table-wrap"><table class="table"><thead><tr>' + (can ? '<th></th>' : '') + '<th>แผนงาน</th><th>ปี</th>' + (d.canMoney ? '<th>ผู้รับผิดชอบ</th>' : '') + '<th>โครงการ สธ.</th></tr></thead><tbody>' +
      d.unlinked.map(e => { const sg = e.suggest, lv = sg && LV[sg.level]; return '<tr data-id="' + esc(e.planId) + '">' + (can ? '<td><input type="checkbox" aria-label="เลือกแผน"></td>' : '') +
        '<td><a href="#/plan/' + esc(e.planId) + '">' + esc(e.name) + '</a><div class="muted small">' + esc(e.fund) + ' · ' + App.badge(e.status) + (e.strategy ? ' · ยุทธศาสตร์กระทรวงข้อ ' + esc(e.strategy) : '') + '</div></td><td>' + esc(e.year) + '</td>' + (d.canMoney ? '<td>' + esc(e.owner || '') + '</td>' : '') +
        '<td>' + projectSelect(e.planId, '') + (sg ? '<div class="small al-sg">แนะนำ <code>' + esc(sg.code) + '</code> ' + App.badge(lv[0], lv[1]) + ' <span class="muted">จากคำ: ' + esc(sg.hits.join(', ')) + '</span> ' + (can ? '<button class="linkbtn" data-act="alignUse" data-id="' + esc(e.planId) + '" data-code="' + esc(sg.code) + '">ใช้คำแนะนำ</button>' : '') + '</div>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
  }
  App.actions.alignUse = el => { const tr = el.closest('tr'), s = tr.querySelector('select[data-plan]'); s.value = el.dataset.code; tr.querySelector('input[type=checkbox]').checked = true; };
  App.actions.alignSuggest = () => {
    const by = {}; cache.unlinked.forEach(e => { by[e.planId] = e; });
    document.querySelectorAll('#al-body tbody tr').forEach(tr => { const e = by[tr.dataset.id], sg = e && e.suggest; if (sg && sg.level !== 'low') { tr.querySelector('select[data-plan]').value = sg.code; tr.querySelector('input[type=checkbox]').checked = true; } });
    App.toast('เติมคำแนะนำแล้ว — ตรวจแต่ละแถวก่อนกด “บันทึกที่เลือก”', 'success');
  };
  async function bulk(groups) {   // groups: { projectCode: [planIds] }
    let ok = 0, bad = [];
    for (const code of Object.keys(groups)) {
      const r = await App.apiReason('plans.bulk', { planIds: groups[code], changes: { MophProject: code }, reason: 'เชื่อมโยงความสอดคล้องกับยุทธศาสตร์กระทรวง' });
      ok += r.updated; bad = bad.concat(r.errors || []);
    }
    App.toast('บันทึกแล้ว ' + ok + ' แผน' + (bad.length ? ' · ไม่สำเร็จ ' + bad.length + ' แผน (' + bad[0].error + ')' : ''), bad.length ? 'error' : 'success');
    await App.render();
  }
  App.actions.alignSave = async () => {
    const g = {}; document.querySelectorAll('#al-body tbody tr').forEach(tr => { const cb = tr.querySelector('input[type=checkbox]'), s = tr.querySelector('select[data-plan]'); if (cb && cb.checked && s.value) (g[s.value] = g[s.value] || []).push(tr.dataset.id); });
    if (!Object.keys(g).length) return App.toast('ยังไม่ได้เลือกแผนและโครงการ สธ.', 'error');
    await bulk(g);
  };

  function mismatch(d) {
    if (!d.mismatch.length) return '<div class="card empty">ยุทธศาสตร์กระทรวงของทุกแผนตรงกับโครงการ สธ. ที่เชื่อมไว้</div>';
    const can = App.can();
    return '<p class="muted small">แผนเหล่านี้ระบุยุทธศาสตร์กระทรวงไม่ตรงกับยุทธศาสตร์ของโครงการ สธ. ที่เชื่อมไว้ — “ปรับตามโครงการ” จะแก้ยุทธศาสตร์ให้ตรง</p><div class="card table-card"><div class="table-wrap"><table class="table"><thead><tr><th>แผนงาน</th><th>ที่ระบุไว้</th><th>ตามโครงการ</th><th></th></tr></thead><tbody>' +
      d.mismatch.map(e => '<tr><td><a href="#/plan/' + esc(e.planId) + '">' + esc(e.name) + '</a><div class="muted small">ปี ' + esc(e.year) + ' · โครงการ ' + esc(e.project) + '</div></td><td>ข้อ ' + esc(e.strategy) + '</td><td>ข้อ ' + esc(e.expected) + '</td><td>' +
        (can ? '<button class="btn sm" data-act="alignFix" data-id="' + esc(e.planId) + '" data-code="' + esc(e.project) + '">ปรับตามโครงการ</button>' : '') + '</td></tr>').join('') + '</tbody></table></div></div>';
  }
  App.actions.alignFix = async el => { await bulk({ [el.dataset.code]: [el.dataset.id] }); };

  function gaps(d) {
    const rows = []; d.tree.forEach(s => s.programs.forEach(g => g.projects.forEach(j => { if (!j.planCount) rows.push([s, g, j]); })));
    if (!rows.length) return '<div class="card empty">ทุกโครงการของกระทรวงมีแผนของ รพ. รองรับแล้ว</div>';
    return '<p class="muted small">ข้อมูลประกอบการตัดสินใจ: โครงการของกระทรวงที่ รพ. ยังไม่มีแผนรองรับ ไม่จำเป็นต้องมีครบทุกข้อ ควรพิจารณาตามบริบทและขนาดบริการของ รพ.</p><div class="card table-card"><div class="table-wrap"><table class="table"><thead><tr><th>ยุทธศาสตร์</th><th>แผนงาน</th><th>โครงการ สธ.</th><th>ตัวชี้วัด</th></tr></thead><tbody>' +
      rows.map(r => '<tr><td>ข้อ ' + esc(r[0].code) + '</td><td>' + esc(r[1].name) + '</td><td><code>' + esc(r[2].code) + '</code> ' + esc(r[2].name) + '</td><td class="small">' + r[2].kpis.map(k => esc(k.name)).join('<br>') + '</td></tr>').join('') + '</tbody></table></div></div>';
  }
})();
