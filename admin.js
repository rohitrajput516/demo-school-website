/* ============================================================================
   ADMIN ERP CONTROLLER (admin.js)
   Handles Session Security, Enquiries, Photo Uploads, & CRUD Operations
   ============================================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  const alertBox = document.getElementById('dash-alert');
  const userEmailSpan = document.getElementById('current-user-email');
  const logoutBtn = document.getElementById('logout-btn');

  function notify(msg, isError = true) {
    if (!alertBox) return;
    alertBox.textContent = msg;
    alertBox.className = isError ? 'admin-alert admin-alert--error' : 'admin-alert admin-alert--success';
    alertBox.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (!isError) {
      setTimeout(() => { alertBox.hidden = true; }, 4000);
    }
  }

  // 1. Session Guard Check
  if (!window.sbClient) {
    alert('Supabase client initialize nahi ho saka.');
    window.location.replace('admin-login.html');
    return;
  }

  const { data: { session } } = await window.sbClient.auth.getSession();
  if (!session) {
    window.location.replace('admin-login.html');
    return;
  }

  userEmailSpan.textContent = session.user.email || 'Admin';

  logoutBtn.addEventListener('click', async () => {
    await window.sbClient.auth.signOut();
    window.location.replace('admin-login.html');
  });

  // 2. Tab Navigation
  const tabs = document.querySelectorAll('.dash-tab');
  const panels = document.querySelectorAll('.dash-panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('is-active'));
      panels.forEach((p) => (p.hidden = true));

      tab.classList.add('is-active');
      const targetPanel = document.getElementById(`tab-${tab.dataset.tab}`);
      if (targetPanel) targetPanel.hidden = false;
    });
  });

  const attDateInput = document.getElementById('att-date');
  if (attDateInput) {
    attDateInput.value = new Date().toISOString().split('T')[0];
  }

  let cacheClasses = [];
  let cacheStudents = [];

  // ==========================================
  // FETCH & RENDER DATA
  // ==========================================

  async function loadEnquiries() {
    const { data, error } = await window.sbClient
      .from('admission_enquiries')
      .select('*')
      .order('id', { ascending: false });

    const tbody = document.getElementById('table-enquiries-body');
    if (error) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="7">Error: ${error.message}</td></tr>`;
      return;
    }

    const list = data || [];
    const countEl = document.getElementById('count-enquiries');
    if (countEl) countEl.textContent = list.length;

    if (!tbody) return;
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7">Abhi tak koi online admission enquiry nahi aayi hai.</td></tr>';
    } else {
      tbody.innerHTML = list
        .map((eq) => {
          const dateStr = new Date(eq.created_at).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });
          const isContacted = eq.status === 'contacted';
          const fullMsg = eq.message || '—';
          const isLongMsg = fullMsg.length > 50;
          const shortMsg = isLongMsg ? fullMsg.slice(0, 50) + '...' : fullMsg;

          return `
          <tr>
            <td>${dateStr}</td>
            <td>
              <strong style="display:block; font-size:0.9rem; color:#0f2942;">${eq.student_name}</strong>
              <div style="font-size:0.8rem; color:#475569; margin-top:2px;">Parent: <strong>${eq.parent_name || '—'}</strong></div>
            </td>
            <td><span class="status-pill status-pill--excused">${eq.target_class}</span></td>
            <td>
              <div style="margin-bottom:4px;"><a href="tel:${eq.phone}" style="font-weight:700; color:#0284c7; text-decoration:none;">📞 ${eq.phone}</a></div>
              <div><a href="mailto:${eq.email}" style="font-size:0.8rem; color:#4f46e5; text-decoration:underline;">✉️ ${eq.email || 'No Email'}</a></div>
            </td>
            <td>
              <div style="max-width:220px; font-size:0.85rem; color:#334155; line-height:1.4; word-break:break-word;" id="msg-box-${eq.id}">
                <span id="msg-text-${eq.id}">${shortMsg}</span>
                ${isLongMsg ? `<button type="button" onclick="toggleMsg(${eq.id})" id="btn-more-${eq.id}" style="background:none; border:none; color:#2563eb; cursor:pointer; font-size:0.75rem; padding:0; margin-left:4px; font-weight:700;">read more</button>` : ''}
              </div>
              <div id="full-msg-${eq.id}" style="display:none; max-width:220px; font-size:0.85rem; color:#334155; line-height:1.4; word-break:break-word;">
                ${fullMsg} <button type="button" onclick="toggleMsg(${eq.id})" style="background:none; border:none; color:#dc2626; cursor:pointer; font-size:0.75rem; padding:0; margin-left:4px; font-weight:700;">show less</button>
              </div>
            </td>
            <td>
              <span class="status-pill ${isContacted ? 'status-pill--published' : 'status-pill--pending'}">
                ${isContacted ? 'Contacted' : 'New Enquiry'}
              </span>
            </td>
            <td class="table-actions">
              <button class="btn-act btn-act--edit" style="${isContacted ? 'background:#fef3c7;color:#b45309;' : 'background:#dcfce7;color:#15803d;'}" onclick="toggleEnquiryStatus(${eq.id}, '${isContacted ? 'new' : 'contacted'}')">
                ${isContacted ? 'Mark Unread' : 'Mark Contacted'}
              </button>
              <button class="btn-act btn-act--del" onclick="deleteRecord('admission_enquiries', ${eq.id})">Delete</button>
            </td>
          </tr>`;
        })
        .join('');
    }
  }

  async function loadClasses() {
    const { data, error } = await window.sbClient
      .from('classes')
      .select('*')
      .order('id', { ascending: true });

    if (error) return notify(`Classes load error: ${error.message}`);
    cacheClasses = data || [];
    document.getElementById('count-classes').textContent = cacheClasses.length;

    const tbody = document.getElementById('table-classes-body');
    const studClassSelect = document.getElementById('stud-class');

    if (cacheClasses.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">Abhi koi class add nahi ki gayi hai.</td></tr>';
    } else {
      tbody.innerHTML = cacheClasses
        .map(
          (c) => `
        <tr>
          <td>#${c.id}</td>
          <td><strong>${c.name}</strong></td>
          <td>${c.section || '—'}</td>
          <td class="table-actions">
            <button class="btn-act btn-act--del" onclick="deleteRecord('classes', ${c.id})">Delete</button>
          </td>
        </tr>`
        )
        .join('');
    }

    studClassSelect.innerHTML =
      '<option value="">-- Select Class --</option>' +
      cacheClasses
        .map((c) => `<option value="${c.id}">${c.name} ${c.section ? `(${c.section})` : ''}</option>`)
        .join('');
  }

  async function loadStudents() {
    const { data, error } = await window.sbClient
      .from('students')
      .select('*, classes(name, section)')
      .order('id', { ascending: false });

    if (error) return notify(`Students load error: ${error.message}`);
    cacheStudents = data || [];
    document.getElementById('count-students').textContent = cacheStudents.length;

    const tbody = document.getElementById('table-students-body');
    const attStudSelect = document.getElementById('att-student');
    const feeStudSelect = document.getElementById('fee-student');

    if (cacheStudents.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">Abhi koi student record nahi hai.</td></tr>';
    } else {
      tbody.innerHTML = cacheStudents
        .map((s) => {
          const clsLabel = s.classes ? `${s.classes.name} (${s.classes.section || ''})` : 'Unassigned';
          return `
          <tr>
            <td><code>${s.admission_number}</code></td>
            <td><strong>${s.full_name}</strong></td>
            <td>${clsLabel}</td>
            <td>${s.date_of_birth || '—'}</td>
            <td class="table-actions">
              <button class="btn-act btn-act--del" onclick="deleteRecord('students', ${s.id})">Delete</button>
            </td>
          </tr>`;
        })
        .join('');
    }

    const options =
      '<option value="">-- Choose Student --</option>' +
      cacheStudents
        .map((s) => `<option value="${s.id}">${s.full_name} (${s.admission_number})</option>`)
        .join('');
    attStudSelect.innerHTML = options;
    feeStudSelect.innerHTML = options;
  }

  async function loadTeachers() {
    const { data, error } = await window.sbClient
      .from('teachers')
      .select('*')
      .order('id', { ascending: true });

    if (error) return notify(`Teachers load error: ${error.message}`);
    document.getElementById('count-teachers').textContent = data ? data.length : 0;

    const tbody = document.getElementById('table-teachers-body');
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">Abhi koi teacher add nahi kiya gaya hai.</td></tr>';
    } else {
      const fallbackImg = 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80';
      tbody.innerHTML = data
        .map(
          (t) => `
        <tr>
          <td>
            <img src="${t.photo_url || fallbackImg}" alt="${t.full_name}" style="width:42px;height:42px;border-radius:8px;object-fit:cover;">
          </td>
          <td>
            <strong>${t.full_name}</strong>
            <div style="font-size:0.75rem;color:#b45309;font-weight:700;">${t.department || ''}</div>
          </td>
          <td>
            <div>${t.qualification || '—'}</div>
            <div style="font-size:0.75rem;color:#64748b;">${(t.bio || '').slice(0, 50)}...</div>
          </td>
          <td class="table-actions">
            <button class="btn-act btn-act--del" onclick="deleteRecord('teachers', ${t.id})">Delete</button>
          </td>
        </tr>`
        )
        .join('');
    }
  }

  async function loadAttendance() {
    const { data, error } = await window.sbClient
      .from('attendance')
      .select('*, students(full_name, admission_number)')
      .order('attendance_date', { ascending: false })
      .limit(50);

    if (error) return notify(`Attendance load error: ${error.message}`);
    const tbody = document.getElementById('table-attendance-body');

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">Abhi koi attendance record nahi hai.</td></tr>';
    } else {
      tbody.innerHTML = data
        .map((a) => {
          const sName = a.students ? a.students.full_name : `Student #${a.student_id}`;
          return `
          <tr>
            <td>${a.attendance_date}</td>
            <td><strong>${sName}</strong></td>
            <td><span class="status-pill status-pill--${a.status}">${a.status}</span></td>
            <td class="table-actions">
              <button class="btn-act btn-act--del" onclick="deleteRecord('attendance', ${a.id})">Delete</button>
            </td>
          </tr>`;
        })
        .join('');
    }
  }

  async function loadFees() {
    const { data, error } = await window.sbClient
      .from('fees')
      .select('*, students(full_name, admission_number)')
      .order('id', { ascending: false })
      .limit(50);

    if (error) return notify(`Fees load error: ${error.message}`);
    document.getElementById('count-fees').textContent = data ? data.length : 0;

    const tbody = document.getElementById('table-fees-body');
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">Abhi koi fee entry nahi hai.</td></tr>';
    } else {
      tbody.innerHTML = data
        .map((f) => {
          const sName = f.students ? f.students.full_name : `Student #${f.student_id}`;
          return `
          <tr>
            <td><strong>${sName}</strong></td>
            <td>₹${parseFloat(f.amount).toFixed(2)}</td>
            <td>${f.due_date || '—'}</td>
            <td><span class="status-pill status-pill--${f.payment_status}">${f.payment_status}</span></td>
            <td class="table-actions">
              <button class="btn-act btn-act--del" onclick="deleteRecord('fees', ${f.id})">Delete</button>
            </td>
          </tr>`;
        })
        .join('');
    }
  }

  async function loadNotices() {
    const { data, error } = await window.sbClient
      .from('notices')
      .select('*')
      .order('id', { ascending: false });

    if (error) return notify(`Notices load error: ${error.message}`);
    const total = data ? data.length : 0;
    const published = data ? data.filter((n) => n.published).length : 0;
    document.getElementById('count-notices').textContent = `${published} / ${total}`;

    const tbody = document.getElementById('table-notices-body');
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">Abhi koi notice nahi banaya gaya hai.</td></tr>';
    } else {
      tbody.innerHTML = data
        .map((n) => {
          const dateStr = new Date(n.created_at).toLocaleDateString();
          return `
          <tr>
            <td>
              <span class="status-pill status-pill--excused">${n.category || 'academic'}</span>
              <div style="font-weight:700; margin-top: 3px;">${n.title}</div>
              <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">${n.body.slice(0, 70)}...</div>
            </td>
            <td>
              <span class="status-pill ${n.published ? 'status-pill--published' : 'status-pill--draft'}">
                ${n.published ? 'Published' : 'Draft'}
              </span>
            </td>
            <td>${dateStr}</td>
            <td class="table-actions">
              <button class="btn-act btn-act--edit" style="${n.published ? 'background:#fef3c7;color:#b45309;' : 'background:#dcfce7;color:#15803d;'}" onclick="togglePublishNotice(${n.id}, ${!n.published})">
                ${n.published ? 'Unpublish' : 'Publish'}
              </button>
              <button class="btn-act btn-act--del" onclick="deleteRecord('notices', ${n.id})">Delete</button>
            </td>
          </tr>`;
        })
        .join('');
    }
  }

  async function loadEventsAndCalendar() {
    const { data: evData, error: evErr } = await window.sbClient
      .from('events')
      .select('*')
      .order('id', { ascending: true });

    const evTbody = document.getElementById('table-events-body');
    if (!evErr && evTbody) {
      if (!evData || evData.length === 0) {
        evTbody.innerHTML = '<tr><td colspan="3">Abhi koi upcoming event add nahi hai.</td></tr>';
      } else {
        evTbody.innerHTML = evData
          .map(
            (ev) => `
          <tr>
            <td><strong>${ev.event_day} ${ev.event_month}</strong></td>
            <td>
              <span class="status-pill status-pill--excused">${ev.badge_text}</span>
              <div style="font-weight:700;margin-top:2px;">${ev.title}</div>
              <div style="font-size:0.75rem;color:#b45309;">${ev.meta_info}</div>
            </td>
            <td class="table-actions">
              <button class="btn-act btn-act--del" onclick="deleteRecord('events', ${ev.id})">Delete</button>
            </td>
          </tr>`
          )
          .join('');
      }
    }

    const { data: calData, error: calErr } = await window.sbClient
      .from('academic_calendar')
      .select('*')
      .order('id', { ascending: true });

    const calTbody = document.getElementById('table-calendar-body');
    if (!calErr && calTbody) {
      if (!calData || calData.length === 0) {
        calTbody.innerHTML = '<tr><td colspan="3">Abhi calendar me koi row add nahi hai.</td></tr>';
      } else {
        calTbody.innerHTML = calData
          .map(
            (c) => `
          <tr>
            <td><strong>${c.milestone}</strong></td>
            <td>${c.schedule}</td>
            <td class="table-actions">
              <button class="btn-act btn-act--del" onclick="deleteRecord('academic_calendar', ${c.id})">Delete</button>
            </td>
          </tr>`
          )
          .join('');
      }
    }
  }

  async function loadFaqs() {
    const { data, error } = await window.sbClient
      .from('faqs')
      .select('*')
      .order('id', { ascending: true });

    const tbody = document.getElementById('table-faqs-body');
    if (error || !tbody) return;

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2">Abhi koi FAQ add nahi kiya gaya hai.</td></tr>';
    } else {
      tbody.innerHTML = data
        .map(
          (f) => `
        <tr>
          <td>
            <strong>Q: ${f.question}</strong>
            <div style="font-size:0.8rem;color:#475569;margin-top:3px;">Ans: ${f.answer}</div>
          </td>
          <td class="table-actions">
            <button class="btn-act btn-act--del" onclick="deleteRecord('faqs', ${f.id})">Delete</button>
          </td>
        </tr>`
        )
        .join('');
    }
  }

  async function loadAllData() {
    await loadEnquiries();
    await loadClasses();
    await loadStudents();
    await loadTeachers();
    await loadAttendance();
    await loadFees();
    await loadNotices();
    await loadEventsAndCalendar();
    await loadFaqs();
  }

  // ==========================================
  // FORM SUBMISSION HANDLERS (INSERT)
  // ==========================================

  document.getElementById('form-class').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('cls-name').value.trim();
    const section = document.getElementById('cls-section').value.trim();
    const { error } = await window.sbClient.from('classes').insert([{ name, section }]);
    if (error) return notify(error.message);
    e.target.reset();
    notify('Class safalta-purvak add ho gayi!', false);
    loadClasses();
  });

  document.getElementById('form-student').addEventListener('submit', async (e) => {
    e.preventDefault();
    const admission_number = document.getElementById('stud-adm').value.trim();
    const full_name = document.getElementById('stud-name').value.trim();
    const class_id = document.getElementById('stud-class').value || null;
    const date_of_birth = document.getElementById('stud-dob').value || null;

    const { error } = await window.sbClient
      .from('students')
      .insert([{ admission_number, full_name, class_id, date_of_birth }]);
    if (error) return notify(error.message);
    e.target.reset();
    notify('Student safalta-purvak enroll ho gaya!', false);
    loadStudents();
  });

  document.getElementById('form-teacher').addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('btn-save-teacher');
    const full_name = document.getElementById('teach-name').value.trim();
    const department = document.getElementById('teach-dept').value.trim();
    const qualification = document.getElementById('teach-qual').value.trim();
    const bio = document.getElementById('teach-bio').value.trim();
    const email = document.getElementById('teach-email').value.trim() || null;
    const photoInput = document.getElementById('teach-photo');

    saveBtn.disabled = true;
    saveBtn.textContent = 'Uploading & Saving...';

    let photo_url = '';
    try {
      if (photoInput.files && photoInput.files[0]) {
        const file = photoInput.files[0];
        const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const filePath = `teacher_${Date.now()}_${safeName}`;

        const { error: upErr } = await window.sbClient.storage
          .from('faculty-photos')
          .upload(filePath, file);

        if (upErr) throw upErr;

        const { data: pubUrlData } = window.sbClient.storage
          .from('faculty-photos')
          .getPublicUrl(filePath);

        photo_url = pubUrlData.publicUrl;
      }

      const { error } = await window.sbClient
        .from('teachers')
        .insert([{ full_name, department, qualification, bio, email, photo_url }]);

      if (error) throw error;
      e.target.reset();
      notify('Teacher aur unka photo safalta-purvak save ho gaya!', false);
      loadTeachers();
    } catch (err) {
      notify(`Teacher save nahi ho saka: ${err.message}`);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Teacher to Website';
    }
  });

  document.getElementById('form-attendance').addEventListener('submit', async (e) => {
    e.preventDefault();
    const student_id = document.getElementById('att-student').value;
    const attendance_date = document.getElementById('att-date').value;
    const status = document.getElementById('att-status').value;

    const { error } = await window.sbClient
      .from('attendance')
      .upsert([{ student_id, attendance_date, status }], { onConflict: 'student_id,attendance_date' });
    if (error) return notify(error.message);
    notify('Attendance record update ho gaya!', false);
    loadAttendance();
  });

  document.getElementById('form-fees').addEventListener('submit', async (e) => {
    e.preventDefault();
    const student_id = document.getElementById('fee-student').value;
    const amount = parseFloat(document.getElementById('fee-amount').value);
    const due_date = document.getElementById('fee-due-date').value || null;
    const payment_status = document.getElementById('fee-status').value;

    const { error } = await window.sbClient
      .from('fees')
      .insert([{ student_id, amount, due_date, payment_status }]);
    if (error) return notify(error.message);
    e.target.reset();
    notify('Fee entry safalta-purvak save ho gayi!', false);
    loadFees();
  });

  document.getElementById('form-notice').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('not-title').value.trim();
    const category = document.getElementById('not-category').value;
    const body = document.getElementById('not-body').value.trim();
    const published = document.getElementById('not-published').checked;

    const { error } = await window.sbClient
      .from('notices')
      .insert([{ title, category, body, published }]);
    if (error) return notify(error.message);
    e.target.reset();
    document.getElementById('not-published').checked = true;
    notify('Notice safalta-purvak save ho gaya!', false);
    loadNotices();
  });

  document.getElementById('form-event').addEventListener('submit', async (e) => {
    e.preventDefault();
    const event_day = document.getElementById('ev-day').value.trim();
    const event_month = document.getElementById('ev-month').value.trim().toUpperCase();
    const badge_text = document.getElementById('ev-badge').value.trim();
    const title = document.getElementById('ev-title').value.trim();
    const meta_info = document.getElementById('ev-meta').value.trim();
    const description = document.getElementById('ev-desc').value.trim();

    const { error } = await window.sbClient
      .from('events')
      .insert([{ event_day, event_month, badge_text, title, meta_info, description }]);
    if (error) return notify(error.message);
    e.target.reset();
    notify('Upcoming Event website ke liye save ho gaya!', false);
    loadEventsAndCalendar();
  });

  document.getElementById('form-calendar').addEventListener('submit', async (e) => {
    e.preventDefault();
    const milestone = document.getElementById('cal-milestone').value.trim();
    const schedule = document.getElementById('cal-schedule').value.trim();

    const { error } = await window.sbClient
      .from('academic_calendar')
      .insert([{ milestone, schedule }]);
    if (error) return notify(error.message);
    e.target.reset();
    notify('Calendar Milestone table me add ho gaya!', false);
    loadEventsAndCalendar();
  });

  document.getElementById('form-faq').addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = document.getElementById('faq-question').value.trim();
    const answer = document.getElementById('faq-answer').value.trim();

    const { error } = await window.sbClient.from('faqs').insert([{ question, answer }]);
    if (error) return notify(error.message);
    e.target.reset();
    notify('FAQ safalta-purvak Contact page ke liye save ho gaya!', false);
    loadFaqs();
  });

  // Global Delete Function
  window.deleteRecord = async (tableName, id) => {
    if (!confirm('Kya aap sach me is record ko delete karna chahte hain?')) return;
    const { error } = await window.sbClient.from(tableName).delete().eq('id', id);
    if (error) return notify(`Delete fail: ${error.message}`);
    notify('Record delete ho gaya!', false);
    loadAllData();
  };

  // Global Notice Publish Toggle
  window.togglePublishNotice = async (id, newStatus) => {
    const actionText = newStatus ? 'publish' : 'unpublish';
    if (!confirm(`Kya aap sach me is notice ko ${actionText} karna chahte hain?`)) return;

    const { error } = await window.sbClient
      .from('notices')
      .update({ published: newStatus })
      .eq('id', id);

    if (error) return notify(`Update fail: ${error.message}`);
    notify(newStatus ? 'Notice live website par publish ho gaya!' : 'Notice wapas draft me chala gaya!', false);
    loadNotices();
  };

  // Global Enquiry Status Toggle
  window.toggleEnquiryStatus = async (id, newStatus) => {
    const { error } = await window.sbClient
      .from('admission_enquiries')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) return notify(`Status update fail: ${error.message}`);
    notify('Enquiry status update ho gaya!', false);
    loadEnquiries();
  };

  // Read More / Show Less Toggle for Long Messages
  window.toggleMsg = (id) => {
    const shortBox = document.getElementById(`msg-box-${id}`);
    const fullBox = document.getElementById(`full-msg-${id}`);
    if (!shortBox || !fullBox) return;

    if (fullBox.style.display === 'none') {
      shortBox.style.display = 'none';
      fullBox.style.display = 'block';
    } else {
      shortBox.style.display = 'block';
      fullBox.style.display = 'none';
    }
  };

  // Initial Data Load
  loadAllData();
});