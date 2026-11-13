/* หน้าแอดมิน: ผู้ใช้งาน (อนุมัติ Gmail), ข้อมูลหลัก/ตั้งค่า, ประวัติการใช้งาน, รายงาน/ส่งออก */
(function () {
  'use strict';
  const App = window.App, esc = App.esc, $ = App.$, S = App.state;
  const pageHead = (t, s, a) => App.pageHead(t, s, a);

  // ===================================================================== ผู้ใช้งาน
  const USER_TABS = [['pending', 'รออนุมัติ'], ['approved', 'อนุมัติแล้ว'], ['other', 'ปฏิเสธ/ระงับ/ยังไม่ส่งคำขอ'], ['all', 'ทั้งหมด']];
  const isOther = u => u.Status === 'rejected' || u.Status === 'suspended' || u.Status === 'new';
  const ST_LABEL = { new: 'ยังไม่ส่งคำขอ', pending: 'รออนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ปฏิเสธ', suspended: 'ระงับ' };
  const ST_CLASS = { new: 'gray', pending: 'amber', approved: 'green', rejected: 'red', suspended: 'dark' };
  const FE_VERSION = '2.11.3'; // เวอร์ชันหลังบ้าน (Apps Script) ที่หน้าเว็บนี้ต้องใช้คู่กัน
  const verLt = (a, b) => { const x = String(a || '0').split('.').map(Number), y = String(b || '0').split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0); } return false; };
  const ROLE_LABEL = { admin: 'แอดมิน', user: 'เจ้าหน้าที่ (แก้ไขได้)', viewer: 'ผู้ดูข้อมูล (อ่านอย่างเดียว)' };

  App.pages.users = async function (view) {
    view.innerHTML = App.skeleton();
    const [users, ping] = await Promise.all([App.api('users.list'), App.api('ping', {}, { noLogout: true }).catch(() => null)]);
    S.users = users;
    const verWarn = ping && verLt(ping.version, FE_VERSION) ? '<div class="alert info" style="margin-bottom:12px"><i class="fas fa-triangle-exclamation"></i> <b>Apps Script ยังเป็นเวอร์ชัน ' + esc(ping.version) + '</b> (หน้าเว็บนี้ต้องใช้ ' + FE_VERSION + ') — ข้อมูลที่ผู้ขอกรอก (กลุ่มงาน/หน่วยงาน/หน้าที่) อาจไม่ถูกบันทึกหรือแสดงไม่ครบ กรุณาวาง backend/Code.gs ล่าสุด แล้ว Deploy › Manage deployments › New version และรัน setupSheet()</div>' : '';
    const tab = S.userTab || (users.some(u => u.Status === 'pending') ? 'pending' : 'approved');
    const rows = users.filter(u => tab === 'all' || (tab === 'other' ? isOther(u) : u.Status === tab))
      .sort((a, b) => String(b.RequestedAt).localeCompare(String(a.RequestedAt)));
    const count = k => users.filter(u => k === 'all' || (k === 'other' ? isOther(u) : u.Status === k)).length;
    view.innerHTML = pageHead('ผู้ใช้งาน', 'ผู้ใช้ใหม่ล็อกอินด้วย Google แล้วกรอกแบบขออนุญาต (คำนำหน้า ชื่อ-สกุล หน่วยงาน กลุ่มงาน หน้าที่ต่อแผนงาน) จึงเข้าสู่สถานะ "รออนุมัติ" — สิทธิ์เปลี่ยนมีผลทันที', '') + verWarn +
      '<div class="tabs">' + USER_TABS.map(t => '<button class="tab' + (t[0] === tab ? ' on' : '') + '" data-act="userTab" data-id="' + t[0] + '">' + t[1] + ' <span class="count">' + count(t[0]) + '</span></button>').join('') + '</div>' +
      '<div class="card table-card"><div class="table-wrap"><table class="table"><thead><tr><th>ผู้ใช้</th><th>กลุ่มงาน / ผู้รับผิดชอบ</th><th>บทบาท</th><th>สถานะ</th><th>เข้าล่าสุด</th><th></th></tr></thead><tbody>' +
      (rows.length ? rows.map(u => '<tr><td><div class="user-cell">' + (u.Picture ? '<img src="' + esc(u.Picture) + '" alt="" referrerpolicy="no-referrer">' : '<span class="avatar">' + esc((u.Name || u.Email).charAt(0)) + '</span>') + '<div><b>' + esc(u.Name) + '</b><div class="muted small">' + esc(u.Email) + '</div></div></div></td>' +
        '<td>' + esc(u.Department || '-') + reqNote(u) + (deptBad(u) ? '<div class="small" style="color:var(--amber)"><i class="fas fa-triangle-exclamation"></i> กลุ่มงานไม่ตรงทะเบียน — แก้ไขแผนของกลุ่มงานไม่ได้</div>' : '') + (u.Organization ? '<div class="muted small">' + esc(u.Organization) + '</div>' : '') + (u.PlanRole ? '<div class="muted small"><i class="fas fa-user-tag"></i> ' + esc(u.PlanRole) + '</div>' : '') + '<div class="muted small">' + esc(u.PersonName || '') + '</div>' + (u.dupName ? '<div class="small" style="color:var(--amber)"><i class="fas fa-triangle-exclamation"></i> ชื่อซ้ำกับบัญชีอื่น</div>' : '') + (u.RequestNote ? '<div class="muted small" title="' + esc(u.RequestNote) + '">“' + esc(String(u.RequestNote).slice(0, 60)) + '”</div>' : '') + '</td><td>' + esc(ROLE_LABEL[u.Role] || u.Role) + (u.Status !== 'approved' && u.suggestRole && u.suggestRole !== u.Role ? '<div class="muted small">แนะนำสิทธิ์: <b>' + esc(ROLE_LABEL[u.suggestRole] || u.suggestRole) + '</b></div>' : '') + '</td><td>' + App.badge(ST_LABEL[u.Status] || u.Status, ST_CLASS[u.Status]) + '<div class="muted small">' + (u.RequestedAt ? 'ขอเมื่อ ' + App.dateTime(u.RequestedAt) : '') + '</div></td><td class="muted small">' + (u.LastLoginAt ? App.dateTime(u.LastLoginAt) : '—') + '</td><td class="act-cell wrap">' + userButtons(u) + '</td></tr>').join('') :
        '<tr><td colspan="6" class="empty">ไม่มีรายการ</td></tr>') + '</tbody></table></div></div>';
  };
  function userButtons(u) {
    const id = ' data-id="' + esc(u.Email) + '"', self = u.Email.toLowerCase() === S.user.email.toLowerCase();
    if (u.Status === 'new') return '<button class="btn sm ghost" data-act="editUser"' + id + '>แก้ไข</button><button class="icon-btn" title="ลบ" data-act="deleteUser"' + id + '><i class="fas fa-trash"></i></button>';
    if (u.Status === 'pending') return '<button class="btn sm primary" data-act="approveUser"' + id + '>อนุมัติ</button><button class="btn sm danger ghost" data-act="rejectUser"' + id + '>ปฏิเสธ</button>';
    let h = '<button class="btn sm ghost" data-act="editUser"' + id + '>แก้ไข</button>';
    if (u.Status === 'approved' && !self) h += '<button class="btn sm ghost" data-act="suspendUser"' + id + '>ระงับ</button>';
    if ((u.Status === 'rejected' || u.Status === 'suspended')) h += '<button class="btn sm" data-act="approveUser"' + id + '>อนุมัติ/คืนสิทธิ์</button>';
    if (!self) h += '<button class="icon-btn" title="ลบ" data-act="deleteUser"' + id + '><i class="fas fa-trash"></i></button>';
    return h;
  }
  const userOf = email => S.users.find(u => u.Email === email);
  const refreshBadge = async () => { try { const m = await App.api('me', {}, { noLogout: true }); S.pendingUsers = m.pendingUsers || 0; App.updateBadges && App.updateBadges(); } catch (e) { /* ignore */ } };
  App.actions.userTab = el => { S.userTab = el.dataset.id; App.render(); };
  // ---------- เลือกกลุ่มงานของผู้ใช้ (แอดมิน): จับคู่ข้อความที่ผู้ขอพิมพ์กับทะเบียนกลุ่มงาน ----------
  const dNorm = s => String(s || '').replace(/\s+/g, '').toLowerCase();
  const D_SYN = [['อายุกรรม', 'อายุรกรรม']]; // เขียนต่างกันแต่หมายถึงเดียวกัน
  const dStrip = t => t.replace(/^(กลุ่มงานการพยาบาล|กลุ่มงาน|ฝ่ายการพยาบาล|ฝ่าย|งาน|ห้อง|หน่วย)/, '');
  const dCore = s => dStrip(dNorm(s));
  const dCoreSyn = s => { let t = dNorm(s); D_SYN.forEach(x => { t = t.split(x[0]).join(x[1]); }); return dStrip(t); };
  const dBigrams = t => { const a = []; for (let i = 0; i < t.length - 1; i++) a.push(t.substr(i, 2)); return a; };
  const dDice = (a, b) => { const x = dBigrams(a), y = dBigrams(b); if (!x.length || !y.length) return 0; const m = {}; y.forEach(g => { m[g] = (m[g] || 0) + 1; }); let hit = 0; x.forEach(g => { if (m[g] > 0) { hit++; m[g]--; } }); return 2 * hit / (x.length + y.length); };
  const uniq = a => a.filter((n, i) => n && a.indexOf(n) === i);
  /** คืน {name, how: exact|core|contains|similar|ambiguous, alts} หรือ null — name ว่างเมื่อกำกวม (ให้แอดมินเลือกเอง) */
  function suggestDept(text, names) {
    const n = dNorm(text); if (!n) return null;
    const pick = (hit, how) => hit.length === 1 ? { name: hit[0], how: how, alts: [] } : (hit.length > 1 ? { name: '', how: 'ambiguous', alts: hit.slice(0, 5) } : null);
    let r = pick(names.filter(x => dNorm(x) === n), 'exact'); if (r) return r;
    const c = dCore(text), cs = dCoreSyn(text); if (!cs) return null;
    r = pick(names.filter(x => dCore(x) === c), 'core') || pick(names.filter(x => dCore(x) === cs), 'core') || pick(names.filter(x => dCoreSyn(x) === cs), 'core'); if (r) return r;
    r = pick(names.filter(x => { const k = dCoreSyn(x); return k.length >= 3 && cs.length >= 3 && (k.indexOf(cs) >= 0 || cs.indexOf(k) >= 0); }), 'contains'); if (r) return r;
    const sc = names.map(x => ({ x: x, s: dDice(cs, dCoreSyn(x)) })).filter(o => o.s >= 0.7).sort((a, b) => b.s - a.s);
    if (sc.length === 1 || (sc.length > 1 && sc[0].s - sc[1].s >= 0.1)) return { name: sc[0].x, how: 'similar', alts: [] };
    if (sc.length) return { name: '', how: 'ambiguous', alts: sc.slice(0, 5).map(o => o.x) };
    return null;
  }
  const deptNames = () => { const D = (App.masters().data || {}).departments || []; return { active: uniq(D.filter(d => d.Active !== false).map(d => d.Name)), all: uniq(D.map(d => d.Name)) }; };
  /** บัญชีของ รพ. นี้หรือไม่ (หน่วยงานว่าง = บัญชีเดิมก่อนมีแบบขออนุญาต ถือเป็น รพ. — ตรงกับฝั่งเซิร์ฟเวอร์) */
  const isHosp = org => { const o = dNorm(org), h = dNorm(App.masters().org); return !o || !h || o === h; };
  /** แถวผู้ขอ (ยังไม่อนุมัติ): ข้อมูลที่ผู้ขอกรอกไม่ครบ/ไม่ตรงทะเบียน */
  const reqNote = u => {
    if (u.Status !== 'pending' && u.Status !== 'new') return '';
    if (u.profileMissing) return u.Status === 'new' ? '' : '<div class="small" style="color:var(--amber)"><i class="fas fa-triangle-exclamation"></i> ไม่มีข้อมูลแบบขออนุญาต (ผู้ขอยังไม่ได้กรอก หรือ Apps Script ยังเป็นเวอร์ชันเก่า) — ผู้ขอจะถูกให้กรอกใหม่เมื่อเข้าสู่ระบบอีกครั้ง</div>';
    if (u.Department && deptNames().all.indexOf(u.Department) < 0) { const sg = suggestDept(u.Department, deptNames().active); return '<div class="small" style="color:var(--amber)"><i class="fas fa-triangle-exclamation"></i> กลุ่มงานที่ผู้ขอพิมพ์ไม่ตรงทะเบียน' + (sg && sg.name ? ' — น่าจะเป็น “' + esc(sg.name) + '”' : '') + '</div>'; }
    return '';
  };
  /** เจ้าหน้าที่ของ รพ. ที่กลุ่มงานไม่ตรงทะเบียน = แก้ไขแผนของกลุ่มงานไม่ได้ */
  const deptBad = u => u.Status === 'approved' && u.Role === 'user' && isHosp(u.Organization) && deptNames().all.indexOf(u.Department) < 0;

  function userForm(u, approving) {
    const M = App.masters(), D = M.data || {}, allDepts = D.departments || [];
    const ppl = (D.people || []).filter(p => p.Active !== false);
    const dn = deptNames(), names = dn.active, regAll = dn.all;
    // บัญชีที่คีย์มือแล้วข้อมูลเลื่อนช่อง (ชื่อกลุ่มงานไปอยู่ในช่องผู้รับผิดชอบ) -> ใช้เป็นกลุ่มงาน
    const shifted = !u.Department && u.PersonName && regAll.some(n => dNorm(n) === dNorm(u.PersonName)) ? u.PersonName : '';
    const sugRole = u.Role === 'admin' ? 'admin' : (approving && u.suggestRole) || u.Role, sugPerson = shifted ? '' : (u.PersonName || u.matchPerson || '');
    const info = u.FirstName ? '<div class="card" style="padding:10px 14px;margin-bottom:12px;background:var(--brand-soft)"><b>ข้อมูลที่ผู้ขอกรอก</b><div class="small">' + esc(u.Prefix + u.FirstName + ' ' + u.LastName) + ' · ' + esc(u.Organization || '-') + ' / ' + esc(u.Department || '-') + '</div><div class="small">หน้าที่: <b>' + esc(u.PlanRole || '-') + '</b>' + (u.suggestRole ? ' → แนะนำสิทธิ์: ' + esc(ROLE_LABEL[u.suggestRole]) : '') + '</div>' + (u.RequestNote ? '<div class="small muted">หมายเหตุ: ' + esc(u.RequestNote) + '</div>' : '') + (u.matchPerson && !u.PersonName ? '<div class="small">พบชื่อตรงกับทะเบียนผู้รับผิดชอบ: <b>' + esc(u.matchPerson) + '</b> (เลือกให้อัตโนมัติ)</div>' : '') + (u.dupName ? '<div class="small" style="color:var(--amber)"><i class="fas fa-triangle-exclamation"></i> มีบัญชีอื่นใช้ชื่อเดียวกัน ตรวจสอบก่อนอนุมัติ</div>' : '') + '</div>' : '';
    const personDept = nm => { const p = ppl.find(x => x.Name === nm); return p && p.Department ? (names.find(n => dNorm(n) === dNorm(p.Department)) || '') : ''; };
    const typed = String(u.Department || shifted || ''), sg = suggestDept(typed, names), external = !isHosp(u.Organization);
    const inactiveHit = (!sg || !sg.name) ? (regAll.find(n => dNorm(n) === dNorm(typed) && names.indexOf(n) < 0) || '') : '';
    let preset = '', why = '';
    const sure = sg && sg.name && (sg.how === 'exact' || sg.how === 'core');
    if (sg && sg.name && (approving || sure)) { preset = sg.name; why = sg.how === 'exact' ? 'ตรงกับทะเบียน' : sg.how === 'core' ? 'ตรงกับทะเบียน (เขียนต่างกันเล็กน้อย)' : 'ระบบแนะนำจากข้อความที่ผู้ขอพิมพ์ — โปรดตรวจสอบ'; }
    else if (!typed && personDept(sugPerson)) { preset = personDept(sugPerson); why = 'ใช้กลุ่มงานของผู้รับผิดชอบ “' + sugPerson + '” ตามทะเบียน — โปรดตรวจสอบ'; }
    const legacy = typed && !preset && !inactiveHit && regAll.indexOf(typed) < 0 ? typed : ''; // ค่าเดิมที่ไม่ตรงทะเบียน: คงไว้ไม่ให้หายเมื่อบันทึก
    const selected = preset || inactiveHit || ((!approving || external) ? legacy : '');
    const seen = {}, missions = Array.from(new Set(allDepts.filter(d => d.Active !== false).map(d => d.Mission || 'อื่น ๆ')));
    const optGroups = missions.map(m => { const os = allDepts.filter(d => d.Active !== false && (d.Mission || 'อื่น ๆ') === m && !seen[d.Name] && (seen[d.Name] = true)).map(d => '<option value="' + esc(d.Name) + '"' + (d.Name === selected ? ' selected' : '') + '>' + esc(d.Name) + '</option>').join(''); return os ? '<optgroup label="' + esc(m) + '">' + os + '</optgroup>' : ''; }).join('');
    const deptField = '<div class="field full"><label for="f_department">กลุ่มงาน <b class="req" id="dept-req" hidden>*</b></label><select id="f_department" name="department" aria-describedby="dept-note"><option value="">— เลือกกลุ่มงานจากทะเบียน —</option>' +
      (legacy ? '<option value="' + esc(legacy) + '"' + (legacy === selected ? ' selected' : '') + '>ค่าเดิม (ไม่ตรงทะเบียน): ' + esc(legacy) + '</option>' : '') +
      (inactiveHit ? '<option value="' + esc(inactiveHit) + '" selected>' + esc(inactiveHit) + ' (ปิดใช้งานในทะเบียน)</option>' : '') + optGroups + '</select>' +
      '<small id="dept-note" role="status" aria-live="polite"></small><div id="dept-sug" class="small" style="margin-top:4px;display:flex;flex-wrap:wrap;gap:6px;align-items:center"></div></div>';
    const warn = (legacy && !preset && approving) ? '<div class="alert info" style="margin-bottom:12px"><i class="fas fa-triangle-exclamation"></i> กลุ่มงานที่ผู้ขอพิมพ์เอง (“' + esc(legacy) + '”) ไม่ตรงทะเบียน' + (sg && sg.alts.length ? ' — อาจเป็น: ' + sg.alts.map(esc).join(' / ') : '') + ' — ต้องเลือกกลุ่มงานที่ถูกต้องจากรายการก่อนให้สิทธิ์เจ้าหน้าที่ (ถ้ายังไม่มีในทะเบียน ให้เพิ่มที่ ข้อมูลหลัก › กลุ่มงาน ก่อน)</div>' : '';
    const roleHelp = '<p class="muted small" style="margin:0 0 10px"><b>เจ้าหน้าที่</b> = บันทึกความคืบหน้า/เบิกจ่าย/แนบหลักฐาน/ส่งสรุป เฉพาะโครงการของ<u>กลุ่มงานตนเอง</u> (รายละเอียดโครงการ-กิจกรรม-งบ แอดมินเป็นผู้กรอก) · <b>ผู้ดูข้อมูล</b> = ดูอย่างเดียว · <b>แอดมิน</b> = จัดการทั้งหมด</p>';
    const noProfile = !u.FirstName && u.Status !== 'approved' ? '<div class="alert info" style="margin-bottom:12px"><i class="fas fa-triangle-exclamation"></i> บัญชีนี้ไม่มีข้อมูลแบบขออนุญาต (กลุ่มงาน/หน่วยงาน/หน้าที่) — กรอกให้ครบก่อนอนุมัติ หรือให้ผู้ขอเข้าสู่ระบบแล้วกรอกใหม่</div>' : '';
    const html = info + noProfile + warn + roleHelp + '<div class="form-grid">' + App.field({ name: 'name', label: 'ชื่อที่แสดง', value: u.Name, full: true }) +
      App.field({ name: 'role', label: 'บทบาท', type: 'select', noBlank: true, options: [{ v: 'user', l: ROLE_LABEL.user }, { v: 'viewer', l: ROLE_LABEL.viewer }, { v: 'admin', l: ROLE_LABEL.admin }], value: sugRole, full: true }) +
      deptField +
      App.field({ name: 'planRole', label: 'หน้าที่ต่อแผนงาน', type: 'select', options: ['ผู้รับผิดชอบหลัก', 'ผู้รับผิดชอบร่วม', 'ผู้ประสานงาน', 'หัวหน้าหน่วยงาน'], value: u.PlanRole }) +
      App.field({ name: 'organization', label: 'หน่วยงาน', value: u.Organization, full: true }) +
      App.field({ name: 'personName', label: 'ผูกกับผู้รับผิดชอบ (ใช้กับสิทธิ์ "แก้ได้เฉพาะแผนตนเอง")', type: 'select', options: ppl.map(p => ({ v: p.Name, l: p.Name + (p.Department ? ' · ' + p.Department : '') })), value: sugPerson }) +
      App.field({ name: 'note', label: 'หมายเหตุ', value: (approving && u.Status === 'rejected') ? '' : (u.Note || ''), full: true }) + '</div>';
    App.modal({ title: (approving ? 'อนุมัติ: ' : 'แก้ไข: ') + u.Email, html: html,
      onOpen: d => {
        const el = n => d.querySelector('[name=' + n + ']'), note = d.querySelector('#dept-note'), req = d.querySelector('#dept-req'), sug = d.querySelector('#dept-sug');
        let reason = why, auto = !!preset && !typed;
        const setDept = n => { el('department').value = n; auto = false; reason = ''; refresh(); };
        const refresh = () => {
          const role = el('role').value, dept = el('department').value, hosp = isHosp(el('organization').value), need = role === 'user' && hosp, pd = personDept(el('personName').value);
          const inReg = regAll.indexOf(dept) >= 0; req.hidden = !need; let msg = '', bad = false;
          if (need && !dept) { msg = '⚠ ต้องเลือกกลุ่มงานจากทะเบียนก่อนให้สิทธิ์เจ้าหน้าที่'; bad = true; }
          else if (need && !inReg) { msg = '⚠ กลุ่มงานนี้ไม่ตรงทะเบียน — ระบบจะไม่ให้สิทธิ์เจ้าหน้าที่'; bad = true; }
          else if (role === 'user' && !hosp) msg = 'หน่วยงานภายนอก — แก้ไขได้เฉพาะแผนที่ผูกกับผู้รับผิดชอบ (กลุ่มงานไม่ให้สิทธิ์)';
          else if (role !== 'user') msg = 'ไม่บังคับ — ' + (role === 'admin' ? 'แอดมินจัดการได้ทุกแผน' : 'ผู้ดูข้อมูลดูได้อย่างเดียว') + ' (ใช้แสดงผลเท่านั้น)';
          else msg = '✔ ' + (reason || 'เจ้าหน้าที่จะแก้ไขได้เฉพาะแผนของกลุ่มงานนี้ (และแผนที่ตนเองเป็นผู้รับผิดชอบ)');
          if (dept && pd && pd !== dept) msg += ' · ผู้รับผิดชอบที่ผูกอยู่กลุ่มงาน “' + pd + '” ในทะเบียน';
          note.textContent = msg; note.style.color = bad ? 'var(--amber)' : ''; el('department').classList.toggle('invalid', bad && !!dept);
          // ปุ่มทางลัด: ข้อเสนอจากข้อความที่ผู้ขอพิมพ์ (ที่ยังไม่ได้เลือก) / กลุ่มงานของผู้รับผิดชอบที่ผูก
          const cands = uniq((sg ? (sg.name ? [sg.name] : sg.alts) : []).concat(pd ? [pd] : [])).filter(n => n !== dept);
          sug.innerHTML = cands.length ? '<span class="muted">ใช้:</span>' + cands.map(n => '<button type="button" class="btn sm ghost" data-pick="' + esc(n) + '">' + esc(n) + '</button>').join('') : '';
        };
        sug.addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (b) setDept(b.dataset.pick); });
        el('department').addEventListener('change', () => { auto = false; reason = ''; refresh(); });
        el('role').addEventListener('change', refresh); el('organization').addEventListener('input', refresh);
        el('personName').addEventListener('change', () => { const pd = personDept(el('personName').value); if (pd && (!el('department').value || auto)) { el('department').value = pd; auto = true; reason = 'ใช้กลุ่มงานของผู้รับผิดชอบที่ผูก — โปรดตรวจสอบ'; } refresh(); });
        refresh();
      },
      onSubmit: async d => {
      const v = App.values(d);
      if (v.role === 'user' && isHosp(v.organization) && regAll.indexOf(v.department) < 0) throw new Error('กรุณาเลือกกลุ่มงานจากทะเบียนก่อนให้สิทธิ์เจ้าหน้าที่');
      const p = { email: u.Email, name: v.name, role: v.role, department: v.department, planRole: v.planRole, organization: v.organization, personName: v.personName, note: v.note };
      if (approving) p.status = 'approved';
      await App.api('users.update', p); App.toast(approving ? 'อนุมัติแล้ว (ระบบส่งอีเมลแจ้งผู้ใช้)' : 'บันทึกแล้ว', 'success'); await refreshBadge(); App.render(); } });
  }
  App.actions.approveUser = el => userForm(userOf(el.dataset.id), true);
  App.actions.editUser = el => userForm(userOf(el.dataset.id), false);
  const setStatus = async (email, status, msg) => { await App.api('users.update', { email: email, status: status }); App.toast(msg, 'success'); await refreshBadge(); App.render(); };
  App.actions.rejectUser = el => { const email = el.dataset.id;
    App.modal({ title: 'ปฏิเสธคำขอ: ' + email, html: '<p class="muted">ผู้ขอจะเห็นเหตุผลนี้ในหน้าสถานะและในอีเมล และแก้ไขข้อมูลเพื่อยื่นคำขอใหม่ได้</p><div class="form-grid">' + App.field({ name: 'note', label: 'เหตุผลที่ไม่อนุมัติ', type: 'textarea', full: true, required: true, value: '' }) + '</div>',
      onSubmit: async d => { const v = App.values(d); if (String(v.note || '').trim().length < 3) throw new Error('กรุณาระบุเหตุผลที่ไม่อนุมัติ'); await App.api('users.update', { email: email, status: 'rejected', note: String(v.note).trim() }); App.toast('ปฏิเสธแล้ว (ส่งอีเมลแจ้งผู้ขอ)', 'success'); await refreshBadge(); App.render(); } }); };
  App.actions.suspendUser = async el => { if (await App.confirm('ระงับการใช้งานของ ' + el.dataset.id + ' ? (ใช้งานต่อไม่ได้ทันที)', 'ระงับ', true)) await setStatus(el.dataset.id, 'suspended', 'ระงับแล้ว'); };
  App.actions.deleteUser = async el => { if (await App.confirm('ลบผู้ใช้ ' + el.dataset.id + ' ออกจากระบบ ?', 'ลบ', true)) { await App.api('users.delete', { email: el.dataset.id }); App.toast('ลบแล้ว', 'success'); await refreshBadge(); App.render(); } };

  // ===================================================================== ข้อมูลหลัก + ตั้งค่า
  const MASTER_ORDER = ['funds', 'categories', 'planTypes', 'moph', 'moprog', 'mopro', 'mokpi', 'mission', 'prov', 'hosp', 'departments', 'people'];
  App.pages.masters = async function (view) {
    view.innerHTML = App.skeleton();
    const m = await App.api('masters.get'); S.masters = m;
    const tab = S.masterTab || 'people';
    const tabs = MASTER_ORDER.map(k => '<button class="tab' + (k === tab ? ' on' : '') + '" data-act="masterTab" data-id="' + k + '">' + esc(m.schema[k].label) + '</button>').join('') + '<button class="tab' + (tab === 'settings' ? ' on' : '') + '" data-act="masterTab" data-id="settings">ตั้งค่าระบบ</button>';
    view.innerHTML = pageHead('ข้อมูลหลัก / ตั้งค่า', 'แก้ไขแล้วมีผลทันทีกับฟอร์มทุกหน้า (รายการที่ปิด "ใช้งาน" จะไม่แสดงในตัวเลือก แต่ข้อมูลเดิมไม่หาย)', '') + '<div class="tabs scroll">' + tabs + '</div><div id="master-body"></div>';
    if (tab === 'settings') return drawSettings(m);
    drawMasterTable(m, tab);
  };
  App.actions.masterTab = el => { S.masterTab = el.dataset.id; App.render(); };
  function drawMasterTable(m, key) {
    const sc = m.schema[key], rows = m.data[key], q = (S.masterQ || '').toLowerCase();
    const show = rows.filter(r => !q || JSON.stringify(r).toLowerCase().indexOf(q) >= 0);
    const cell = (c, v) => c.type === 'bool' ? (v ? '<span class="badge green">ใช้งาน</span>' : '<span class="badge gray">ปิด</span>') : esc(v);
    $('#master-body').innerHTML = '<div class="card table-card"><div class="table-tools"><input type="search" id="mq" placeholder="ค้นหา…" value="' + esc(S.masterQ || '') + '"><span class="muted">' + show.length + '/' + rows.length + ' รายการ</span><button class="btn primary" data-act="addMaster" data-id="' + key + '"><i class="fas fa-plus"></i> เพิ่ม</button></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr>' + sc.cols.map(c => '<th>' + esc(c.label) + '</th>').join('') + '<th></th></tr></thead><tbody>' +
      show.map(r => '<tr>' + sc.cols.map(c => '<td' + (c.type === 'number' ? ' class="num"' : '') + '>' + cell(c, r[c.name]) + '</td>').join('') + '<td class="act-cell"><button class="icon-btn" title="แก้ไข" data-act="editMaster" data-id="' + key + '" data-key="' + esc(r[sc.key]) + '"><i class="fas fa-pen"></i></button></td></tr>').join('') + '</tbody></table></div></div>';
    $('#mq').addEventListener('input', App.debounce(e => { S.masterQ = e.target.value; drawMasterTable(m, key); const i = $('#mq'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 200));
  }
  function masterForm(key, row) {
    const sc = S.masters.schema[key], isNew = !row, r = row || { Active: true };
    const fields = sc.cols.map(c => {
      const f = { name: c.name, label: c.label, value: r[c.name], required: c.required };
      if (c.type === 'bool') { f.type = 'checkbox'; f.value = r[c.name] !== false; f.full = true; } else if (c.type === 'number') { f.type = 'number'; f.step = 'any'; } else if (c.type === 'select') { f.type = 'select'; f.options = c.options; f.noBlank = true; }
      if (c.name === sc.key && !isNew) f.readonly = true;
      if (c.name === 'MissionCode') { f.type = 'select'; f.options = S.masters.data.mission.map(x => ({ v: x.Code, l: x.Code + '. ' + x.Name })); }
      if (c.name === 'Department' && key === 'people') { f.type = 'select'; f.options = uniq(S.masters.data.departments.filter(x => x.Active !== false).map(x => x.Name)).map(n => ({ v: n, l: n })); const cur = String(r.Department || ''); if (cur && !f.options.some(o => o.v === cur)) f.options.push({ v: cur, l: 'ค่าเดิม (ไม่ตรงทะเบียน): ' + cur }); }
      if (c.name === 'Mission' && key === 'departments') { f.type = 'text'; f.list = 'dl-missions'; }
      if (['Name', 'Mission'].indexOf(c.name) >= 0 && key !== 'funds') f.full = true;
      return f;
    });
    const missions = Array.from(new Set((S.masters.data.departments || []).map(d => d.Mission)));
    App.modal({ title: (isNew ? 'เพิ่ม' : 'แก้ไข') + ' ' + sc.label, html: '<datalist id="dl-missions">' + missions.map(x => '<option value="' + esc(x) + '">').join('') + '</datalist>' + App.formGrid(fields),
      onSubmit: async d => { await App.api('masters.save', { table: key, isNew: isNew, row: App.values(d) }); App.toast('บันทึกแล้ว', 'success'); await reloadMasters(); App.render(); } });
  }
  async function reloadMasters() { S.masters = await App.api('masters.get'); }
  App.actions.addMaster = el => masterForm(el.dataset.id, null);
  App.actions.editMaster = el => { const sc = S.masters.schema[el.dataset.id]; masterForm(el.dataset.id, S.masters.data[el.dataset.id].find(r => String(r[sc.key]) === el.dataset.key)); };
  function drawSettings(m) {
    const desc = { CurrentYear: 'ปีงบประมาณปัจจุบัน (พ.ศ.)', ExcludeCancelledFromRate: 'ร้อยละเบิกจ่าย: ไม่นับงบของกิจกรรมที่ยกเลิก/ไม่เบิก', UserEditScope: 'ขอบเขตการแก้ไขของเจ้าหน้าที่ (dept = เฉพาะแผนของกลุ่มงานตนเอง)', UserEditPlanDetail: 'เจ้าหน้าที่แก้รายละเอียดแผน/กิจกรรม/งบได้หรือไม่ (FALSE = เฉพาะแอดมิน — แนะนำ)', SummaryStartMonth: 'เดือนเริ่มช่วงส่งสรุปโครงการ (1–12) · ค่าตั้งต้น 8 = ส.ค.', SummaryEndMonth: 'เดือนสิ้นสุดช่วงส่งสรุปโครงการ (1–12) เลยสิ้นเดือนนี้ = ค้างส่ง · ค่าตั้งต้น 9 = ก.ย.', FileSharing: 'การแชร์ไฟล์หลักฐานบน Drive', ImportLocked: 'ล็อกการนำเข้าข้อมูลจากชีทเดิม', RequireReasonAfterApproval: 'แผนที่อนุมัติแล้ว: ต้องระบุเหตุผลเมื่อแก้งบ/สถานะ/ลบรายการ', LockClosedPlans: 'แผนสถานะ "ปิด": แก้ไขได้เฉพาะแอดมิน' };
    const sel = { ExcludeCancelledFromRate: ['TRUE', 'FALSE'], UserEditScope: [{ v: 'dept', l: 'dept — เฉพาะแผนของกลุ่มงานตนเอง (แนะนำ)' }, { v: 'own', l: 'own — เฉพาะแผนที่ตนเองรับผิดชอบ' }], UserEditPlanDetail: ['FALSE', 'TRUE'], FileSharing: [{ v: 'link', l: 'link — ใครมีลิงก์เปิดดูได้' }, { v: 'private', l: 'private — ไม่แชร์' }], ImportLocked: ['TRUE', 'FALSE'], RequireReasonAfterApproval: ['TRUE', 'FALSE'], LockClosedPlans: ['TRUE', 'FALSE'] };
    $('#master-body').innerHTML = '<div class="card" style="margin-bottom:12px"><div class="setting"><div><b>ตรวจสิทธิ์และกลุ่มงาน</b><div class="muted small">ดูแผนที่ยังไม่ระบุกลุ่มงาน บัญชีที่สิทธิ์ไม่สมบูรณ์ และเติมกลุ่มงานให้แผนอัตโนมัติจากผู้รับผิดชอบ</div></div><span></span><button class="btn sm" data-act="accessAudit"><i class="fas fa-user-shield"></i> ตรวจสอบ</button></div></div>' + '<div class="card"><div class="settings">' + Object.keys(desc).map(k => {
      const v = m.settings[k] === undefined ? '' : m.settings[k];
      const input = sel[k] ? '<select data-setting="' + k + '">' + sel[k].map(o => { const ov = typeof o === 'object' ? o.v : o, ol = typeof o === 'object' ? o.l : o; return '<option value="' + esc(ov) + '"' + (ov === v ? ' selected' : '') + '>' + esc(ol) + '</option>'; }).join('') + '</select>' : '<input data-setting="' + k + '" value="' + esc(v) + '">';
      return '<div class="setting"><div><b>' + esc(k) + '</b><div class="muted small">' + esc(desc[k]) + '</div></div>' + input + '<button class="btn sm" data-act="saveSetting" data-id="' + k + '">บันทึก</button></div>';
    }).join('') + '</div></div>';
  }
  App.actions.accessAudit = async () => {
    const r = await App.api('access.audit', {}), pl = r.plans, us = r.users;
    const list = (arr, f) => arr.length ? '<ul class="small" style="margin:4px 0 0;padding-left:18px">' + arr.map(x => '<li>' + f(x) + '</li>').join('') + '</ul>' : '';
    const ok = '<span class="badge green">ปกติ</span>';
    const html = '<p>ขอบเขตการแก้ไขของเจ้าหน้าที่: <b>' + (r.scope === 'own' ? 'เฉพาะแผนที่ตนเองรับผิดชอบ' : 'เฉพาะแผนของกลุ่มงานตนเอง (และแผนที่ตนเองรับผิดชอบ)') + '</b></p>' +
      '<h4 style="margin:12px 0 4px">แผนงาน ' + (pl.noDept ? '<span class="badge amber">' + pl.noDept + ' แผนยังไม่ระบุกลุ่มงาน</span>' : ok) + '</h4>' +
      '<p class="small muted" style="margin:0">ทั้งหมด ' + pl.total + ' แผน · เติมอัตโนมัติได้ ' + pl.fixable + ' แผน' + (pl.noDept - pl.fixable > 0 ? ' · เติมไม่ได้ ' + (pl.noDept - pl.fixable) + ' แผน (ผู้รับผิดชอบยังไม่มีกลุ่มงานในทะเบียน)' : '') + '</p>' +
      (pl.unresolvedOwnerCount ? '<div class="small" style="margin-top:6px">ระบุกลุ่มงานของผู้รับผิดชอบเหล่านี้ที่แท็บ “ผู้รับผิดชอบ” แล้วกดตรวจใหม่ หรือเลือกแผนแล้วใช้ “แก้ไขหลายแผน”:' + list(pl.unresolvedOwners, x => esc(x.owner) + ' (' + x.plans + ' แผน)') + (pl.unresolvedOwnerCount > pl.unresolvedOwners.length ? '<div class="muted">…และอีก ' + (pl.unresolvedOwnerCount - pl.unresolvedOwners.length) + ' ราย</div>' : '') + '</div>' : '') +
      '<h4 style="margin:14px 0 4px">บัญชีเจ้าหน้าที่ ' + (us.issueCount ? '<span class="badge amber">' + us.issueCount + ' บัญชีสิทธิ์ไม่สมบูรณ์</span>' : ok) + '</h4>' +
      list(us.issues, x => '<b>' + esc(x.name) + '</b> (' + esc(x.email) + ') — ' + esc(x.issue)) +
      (r.duplicateDepartments.length ? '<h4 style="margin:14px 0 4px">ทะเบียนกลุ่มงาน <span class="badge amber">ชื่อซ้ำ</span></h4>' + list(r.duplicateDepartments, x => esc(x)) + '<div class="small muted">ชื่อซ้ำทำให้เลือกกลุ่มงานผิดได้ แนะนำปิดใช้งานรายการที่ซ้ำ</div>' : '');
    App.modal({ title: 'ตรวจสิทธิ์และกลุ่มงาน', wide: true, html: html, hideSubmit: !pl.fixable, submitLabel: 'เติมกลุ่มงานให้ ' + pl.fixable + ' แผน',
      onSubmit: async () => { const x = await App.api('plans.backfillDept', {}); App.toast('เติมกลุ่มงานให้ ' + x.updated + ' แผนแล้ว' + (x.stillMissing ? ' (ยังเหลือ ' + x.stillMissing + ' แผนที่ต้องระบุเอง)' : ''), 'success'); } });
  };
  App.actions.saveSetting = async el => {
    const k = el.dataset.id, inp = document.querySelector('[data-setting="' + k + '"]');
    await App.api('settings.save', { key: k, value: inp.value }); App.toast('บันทึกการตั้งค่าแล้ว', 'success');
    await reloadMasters(); if (k === 'CurrentYear') S.year = inp.value;
  };

  // ===================================================================== ประวัติการใช้งาน
  App.pages.audit = async function (view) {
    view.innerHTML = App.skeleton();
    const rows = await App.api('audit.list', { limit: 300 });
    view.innerHTML = pageHead('ประวัติการใช้งานระบบ', 'บันทึกทุกการเพิ่ม/แก้ไข/ลบ และการเข้าสู่ระบบ (ล่าสุด ' + rows.length + ' รายการ)', '') +
      '<div class="card table-card"><div class="table-wrap"><table class="table slim"><thead><tr><th>เวลา</th><th>ผู้ใช้</th><th>การกระทำ</th><th>รายการ</th><th>รายละเอียด</th></tr></thead><tbody>' +
      rows.map(r => '<tr><td class="nowrap">' + App.dateTime(r.Time) + '</td><td>' + esc(r.Email) + '</td><td>' + esc(r.Action) + '</td><td class="muted">' + esc(r.Entity) + '</td><td class="muted">' + esc(r.Detail) + '</td></tr>').join('') + '</tbody></table></div></div>';
  };

  // ===================================================================== รายงาน / ส่งออก
  App.pages.reports = async function (view) {
    view.innerHTML = pageHead('รายงาน / ส่งออก', 'สร้างรายงานตามแหล่งเงินในรูปแบบใกล้เคียงชีท "สรุปแผนงาน+โครงการ" เดิม', '<label class="inline-field"><span>ปีงบประมาณ</span><select data-change="year">' + App.years().map(y => '<option' + (y === S.year ? ' selected' : '') + '>' + y + '</option>').join('') + '</select></label>') +
      '<div class="card"><h2>ส่งออกเป็นแท็บในชีตฐานข้อมูล</h2><p class="muted">สร้าง/อัปเดตแท็บ "รายงาน-&lt;แหล่งเงิน&gt;" ในชีตฐานข้อมูล (งบ เบิกจ่าย คงเหลือ ร้อยละ แยกรายหมวด) — แท็บเหล่านี้เป็นรายงานที่ระบบสร้างให้ ไม่ต้องกรอกข้อมูลในแท็บนี้</p>' +
      '<button class="btn primary" data-act="exportSheets">สร้างรายงานลงชีต</button><div id="export-result"></div></div>' +
      '<div class="card"><h2>ส่งออก CSV</h2><p class="muted">ไปที่หน้า "แผนงาน/โครงการ" แล้วกดปุ่ม <i class="fas fa-download"></i> CSV (ส่งออกตามตัวกรองที่เลือก)</p><a class="btn" href="#/plans">ไปหน้าแผนงาน</a></div>';
  };
  App.actions.exportSheets = async el => {
    el.disabled = true; el.textContent = 'กำลังสร้าง…';
    try {
      const r = await App.api('report.export', { year: S.year });
      $('#export-result').innerHTML = '<div class="alert info"><div><b>สร้างแล้ว ' + r.sheets.length + ' แท็บ:</b> ' + r.sheets.map(esc).join(', ') + '<div class="muted small">' + esc(r.note) + '</div></div><a target="_blank" rel="noopener" href="' + esc(r.url) + '">เปิดชีต →</a></div>';
      App.toast('สร้างรายงานแล้ว', 'success');
    } finally { el.disabled = false; el.textContent = 'สร้างรายงานลงชีต'; }
  };
})();
