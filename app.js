import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUserEmail = null;
let unsubscribers = [];

// ---------- AUTH ----------
document.getElementById('login-btn').addEventListener('click', async () => {
  const email = document.getElementById('email-input').value.trim();
  const password = document.getElementById('password-input').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    errEl.textContent = '로그인 실패: ' + friendlyError(e.code);
  }
});

document.getElementById('signup-btn').addEventListener('click', async () => {
  const email = document.getElementById('email-input').value.trim();
  const password = document.getElementById('password-input').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  if (password.length < 6) {
    errEl.textContent = '비밀번호는 6자 이상이어야 합니다.';
    return;
  }
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (e) {
    errEl.textContent = '계정 생성 실패: ' + friendlyError(e.code);
  }
});

document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

function friendlyError(code) {
  const map = {
    'auth/email-already-in-use': '이미 가입된 이메일입니다. 로그인해주세요.',
    'auth/invalid-email': '이메일 형식이 올바르지 않습니다.',
    'auth/weak-password': '비밀번호가 너무 약합니다.',
    'auth/wrong-password': '비밀번호가 틀렸습니다.',
    'auth/user-not-found': '등록되지 않은 이메일입니다.',
    'auth/invalid-credential': '이메일 또는 비밀번호가 틀렸습니다.'
  };
  return map[code] || code;
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUserEmail = user.email;
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    document.getElementById('current-user-label').textContent = currentUserEmail;
    startListeners();
  } else {
    currentUserEmail = null;
    document.getElementById('app-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    unsubscribers.forEach(u => u());
    unsubscribers = [];
  }
});

// ---------- TABS ----------
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    document.getElementById('panel-' + btn.dataset.tab).classList.remove('hidden');
  });
});

// ---------- HELPERS ----------
function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}
function timeAgo(ts) {
  if (!ts) return '방금 전';
  const mins = Math.round((Date.now() - ts.toMillis()) / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return mins + '분 전';
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs + '시간 전';
  return Math.round(hrs / 24) + '일 전';
}
function shortEmail(email) {
  return email ? email.split('@')[0] : '익명';
}

// ---------- NOTES ----------
document.getElementById('add-note-btn').addEventListener('click', async () => {
  const title = document.getElementById('note-title').value.trim();
  const content = document.getElementById('note-content').value.trim();
  if (!title) return;
  await addDoc(collection(db, 'notes'), {
    title, content, author: currentUserEmail, ts: serverTimestamp()
  });
  document.getElementById('note-title').value = '';
  document.getElementById('note-content').value = '';
});

function renderNotes(snapshot) {
  const list = document.getElementById('notes-list');
  list.innerHTML = '';
  if (snapshot.empty) {
    list.innerHTML = '<p style="font-size:13px; color:var(--text-muted); text-align:center; padding:1rem 0;">아직 작성된 노트가 없습니다.</p>';
    return;
  }
  snapshot.forEach(docSnap => {
    const n = docSnap.data();
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <p style="font-weight:600; font-size:14px; margin:0;">${escapeHtml(n.title)}</p>
        <button class="del-btn" data-id="${docSnap.id}" data-coll="notes">삭제</button>
      </div>
      <p style="font-size:13px; color:var(--text-secondary); margin:6px 0 0; white-space:pre-wrap;">${escapeHtml(n.content)}</p>
      <p class="entry-meta">${escapeHtml(shortEmail(n.author))} · ${timeAgo(n.ts)}</p>
    `;
    list.appendChild(div);
  });
  attachDeleteHandlers();
}

// ---------- CONTACTS ----------
document.getElementById('add-contact-btn').addEventListener('click', async () => {
  const name = document.getElementById('contact-name').value.trim();
  const org = document.getElementById('contact-org').value.trim();
  const email = document.getElementById('contact-email').value.trim();
  const category = document.getElementById('contact-category').value;
  const notes = document.getElementById('contact-notes').value.trim();
  if (!name) return;
  await addDoc(collection(db, 'contacts'), {
    name, org, email, category, notes, author: currentUserEmail, ts: serverTimestamp()
  });
  ['contact-name','contact-org','contact-email','contact-notes'].forEach(id => document.getElementById(id).value = '');
});

function renderContacts(snapshot) {
  const list = document.getElementById('contacts-list');
  list.innerHTML = '';
  if (snapshot.empty) {
    list.innerHTML = '<p style="font-size:13px; color:var(--text-muted); text-align:center; padding:1rem 0;">아직 등록된 컨택이 없습니다.</p>';
    return;
  }
  const catClass = {'멘토':'badge-mento','클럽':'badge-club','학교':'badge-school','기타':'badge-etc'};
  snapshot.forEach(docSnap => {
    const c = docSnap.data();
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <span class="badge ${catClass[c.category]||'badge-etc'}">${escapeHtml(c.category)}</span>
          <p style="font-weight:600; font-size:14px; margin:6px 0 0;">${escapeHtml(c.name)} ${c.org ? '· ' + escapeHtml(c.org) : ''}</p>
        </div>
        <button class="del-btn" data-id="${docSnap.id}" data-coll="contacts">삭제</button>
      </div>
      ${c.email ? `<p style="font-size:13px; color:var(--accent-text); margin:4px 0 0;">✉️ ${escapeHtml(c.email)}</p>` : ''}
      ${c.notes ? `<p style="font-size:13px; color:var(--text-secondary); margin:4px 0 0;">${escapeHtml(c.notes)}</p>` : ''}
      <p class="entry-meta">${escapeHtml(shortEmail(c.author))} 등록 · ${timeAgo(c.ts)}</p>
    `;
    list.appendChild(div);
  });
  attachDeleteHandlers();
}

// ---------- IDEAS ----------
document.getElementById('add-idea-btn').addEventListener('click', async () => {
  const title = document.getElementById('idea-title').value.trim();
  const status = document.getElementById('idea-status').value;
  const desc = document.getElementById('idea-desc').value.trim();
  if (!title) return;
  await addDoc(collection(db, 'ideas'), {
    title, status, desc, author: currentUserEmail, ts: serverTimestamp()
  });
  document.getElementById('idea-title').value = '';
  document.getElementById('idea-desc').value = '';
});

function renderIdeas(snapshot) {
  const list = document.getElementById('ideas-list');
  list.innerHTML = '';
  if (snapshot.empty) {
    list.innerHTML = '<p style="font-size:13px; color:var(--text-muted); text-align:center; padding:1rem 0;">아직 등록된 아이디어가 없습니다.</p>';
    return;
  }
  const statusClass = {'아이디어':'badge-idea','제작중':'badge-progress','완료':'badge-done'};
  snapshot.forEach(docSnap => {
    const i = docSnap.data();
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <span class="badge ${statusClass[i.status]||'badge-idea'}">${escapeHtml(i.status)}</span>
          <p style="font-weight:600; font-size:14px; margin:6px 0 0;">${escapeHtml(i.title)}</p>
        </div>
        <button class="del-btn" data-id="${docSnap.id}" data-coll="ideas">삭제</button>
      </div>
      ${i.desc ? `<p style="font-size:13px; color:var(--text-secondary); margin:6px 0 0;">${escapeHtml(i.desc)}</p>` : ''}
      <p class="entry-meta">${escapeHtml(shortEmail(i.author))} · ${timeAgo(i.ts)}</p>
    `;
    list.appendChild(div);
  });
  attachDeleteHandlers();
}

function attachDeleteHandlers() {
  document.querySelectorAll('.del-btn').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('삭제하시겠습니까?')) return;
      await deleteDoc(doc(db, btn.dataset.coll, btn.dataset.id));
    };
  });
}

// ---------- REALTIME LISTENERS ----------
function startListeners() {
  const notesQ = query(collection(db, 'notes'), orderBy('ts', 'desc'));
  unsubscribers.push(onSnapshot(notesQ, renderNotes));

  const contactsQ = query(collection(db, 'contacts'), orderBy('ts', 'desc'));
  unsubscribers.push(onSnapshot(contactsQ, renderContacts));

  const ideasQ = query(collection(db, 'ideas'), orderBy('ts', 'desc'));
  unsubscribers.push(onSnapshot(ideasQ, renderIdeas));
}
