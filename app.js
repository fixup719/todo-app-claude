/* =====================================================================
   SUPABASE CLIENT
   ===================================================================== */

const SUPABASE_URL = 'https://sitahrrjitwfsnwfjfme.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpdGFocnJqaXR3ZnNud2ZqZm1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2Njg1NjgsImV4cCI6MjA5NzI0NDU2OH0.i4CDHLSSA_BTUkVyi7sQtMtlcGAkJlKrTIxI48bsUBk';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


/* =====================================================================
   AUTH
   ===================================================================== */

let currentUser = null;

document.getElementById('githubLoginBtn').addEventListener('click', () => {
    db.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: window.location.href },
    });
});

function showAuthScreen() {
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('appContent').style.display = 'none';
}

function showApp(user) {
    currentUser = user;
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('appContent').style.display = 'block';

    const avatarUrl = user.user_metadata?.avatar_url;
    const userName  = user.user_metadata?.user_name || user.email;
    const userInfo  = document.getElementById('userInfo');
    userInfo.innerHTML = `
        ${avatarUrl ? `<img src="${avatarUrl}" class="user-avatar" alt="">` : ''}
        <span class="user-name">${userName}</span>
        <button class="sign-out-btn" id="signOutBtn">로그아웃</button>
    `;
    document.getElementById('signOutBtn').addEventListener('click', () => db.auth.signOut());
}

db.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
        showApp(session.user);
        init();
    } else {
        currentUser = null;
        todos = [];
        plannerData = {};
        showAuthScreen();
    }
});


/* =====================================================================
   THEME TOGGLE
   ===================================================================== */

const themeToggle = document.getElementById('themeToggle');

function applyTheme(isLight) {
    document.body.classList.toggle('light', isLight);
    themeToggle.textContent = isLight ? '☀️' : '🌙';
}

themeToggle.addEventListener('click', () => {
    const isLight = !document.body.classList.contains('light');
    applyTheme(isLight);
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
});

applyTheme(localStorage.getItem('theme') === 'light');


/* =====================================================================
   POMODORO TIMER
   ===================================================================== */

const MODES = {
    work:  { time: 25 * 60 },
    short: { time:  5 * 60 },
    long:  { time: 15 * 60 },
};

const CIRCUMFERENCE = 2 * Math.PI * 88;

let currentMode   = 'work';
let timeLeft      = MODES.work.time;
let timerInterval = null;
let isRunning     = false;

const timerDisplay = document.getElementById('timerDisplay');
const progressRing = document.getElementById('progressRing');
const startBtn     = document.getElementById('startBtn');
const resetBtn     = document.getElementById('resetBtn');
const modeBtns     = document.querySelectorAll('.mode-btn');

progressRing.style.strokeDasharray  = CIRCUMFERENCE;
progressRing.style.strokeDashoffset = 0;

function formatTime(seconds) {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
}

function updateRingAndDisplay() {
    timerDisplay.textContent = formatTime(timeLeft);
    const progress = timeLeft / MODES[currentMode].time;
    progressRing.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);
}

function startTimer() {
    if (isRunning) {
        clearInterval(timerInterval);
        isRunning = false;
        startBtn.textContent = '시작';
        return;
    }
    isRunning = true;
    startBtn.textContent = '일시정지';
    timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateRingAndDisplay();
        } else {
            clearInterval(timerInterval);
            isRunning = false;
            startBtn.textContent = '시작';
            playBeep();
            alert(`${currentMode === 'work' ? '집중' : '휴식'} 시간이 끝났습니다!`);
        }
    }, 1000);
}

function resetTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    startBtn.textContent = '시작';
    timeLeft = MODES[currentMode].time;
    updateRingAndDisplay();
}

function setMode(mode) {
    if (isRunning) resetTimer();
    currentMode = mode;
    timeLeft = MODES[mode].time;
    updateRingAndDisplay();
    modeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
    document.body.setAttribute('data-mode', mode);
}

function playBeep() {
    try {
        const ctx  = new (window.AudioContext || window.webkitAudioContext)();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.2);
    } catch (_) {}
}

startBtn.addEventListener('click', startTimer);
resetBtn.addEventListener('click', resetTimer);
modeBtns.forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));

updateRingAndDisplay();


/* =====================================================================
   TODO LIST
   ===================================================================== */

const COLORS = [
    { id: 'red',    bg: '#FFB3B3', label: '빨강' },
    { id: 'yellow', bg: '#FFE082', label: '노랑' },
    { id: 'green',  bg: '#A5D6A7', label: '초록' },
    { id: 'purple', bg: '#CE93D8', label: '보라' },
    { id: 'blue',   bg: '#90CAF9', label: '파랑' },
];

const PRIORITY_META = {
    high:   { label: '높음' },
    normal: { label: '보통' },
    low:    { label: '낮음' },
};

const PRIORITY_ORDER = { high: 0, normal: 1, low: 2 };

let todos          = [];
let addFormColor   = null;
let priorityFilter = 'all';

const todoInput         = document.getElementById('todoInput');
const addBtn            = document.getElementById('addBtn');
const todoList          = document.getElementById('todoList');
const todoCount         = document.getElementById('todoCount');
const todoFooter        = document.getElementById('todoFooter');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const prioritySelectEl  = document.getElementById('prioritySelect');

document.addEventListener('click', () => {
    document.querySelectorAll('.color-picker.open').forEach(p => p.classList.remove('open'));
});

prioritySelectEl.addEventListener('change', () => {
    prioritySelectEl.dataset.priority = prioritySelectEl.value;
});

const priorityFilterEl = document.getElementById('priorityFilter');
priorityFilterEl.addEventListener('change', () => {
    priorityFilter = priorityFilterEl.value;
    priorityFilterEl.dataset.priority = priorityFilter === 'all' ? '' : priorityFilter;
    renderTodos();
});

/* ── Color Picker factory ── */
function createColorPicker(initialColor, onChange) {
    let current = initialColor || null;

    const picker = document.createElement('div');
    picker.className = 'color-picker';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'color-picker-trigger' + (current ? '' : ' no-color');
    if (current) {
        const meta = COLORS.find(c => c.id === current);
        if (meta) trigger.style.background = meta.bg;
    }

    const panel = document.createElement('div');
    panel.className = 'color-picker-panel';

    const noOpt = document.createElement('button');
    noOpt.type = 'button';
    noOpt.className = 'color-opt' + (!current ? ' active' : '');
    noOpt.dataset.color = '';
    noOpt.title = '색상 없음';
    panel.appendChild(noOpt);

    COLORS.forEach(c => {
        const opt = document.createElement('button');
        opt.type = 'button';
        opt.className = 'color-opt' + (current === c.id ? ' active' : '');
        opt.dataset.color = c.id;
        opt.style.background = c.bg;
        opt.title = c.label;
        panel.appendChild(opt);
    });

    function select(colorId) {
        current = colorId || null;
        const meta = current ? COLORS.find(c => c.id === current) : null;
        if (meta) {
            trigger.style.background = meta.bg;
            trigger.classList.remove('no-color');
        } else {
            trigger.style.background = '';
            trigger.classList.add('no-color');
        }
        panel.querySelectorAll('.color-opt').forEach(btn =>
            btn.classList.toggle('active', btn.dataset.color === (colorId || ''))
        );
        onChange(current);
    }

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = picker.classList.contains('open');
        document.querySelectorAll('.color-picker.open').forEach(p => p.classList.remove('open'));
        if (!isOpen) picker.classList.add('open');
    });

    panel.addEventListener('click', (e) => {
        e.stopPropagation();
        const opt = e.target.closest('.color-opt');
        if (!opt) return;
        select(opt.dataset.color);
        picker.classList.remove('open');
    });

    picker.appendChild(trigger);
    picker.appendChild(panel);
    return picker;
}

const addOptionsEl   = document.querySelector('.add-options');
const addColorPicker = createColorPicker(null, (colorId) => { addFormColor = colorId; });
addOptionsEl.appendChild(addColorPicker);

/* todos 배열 순서를 DB에 반영 */
async function saveSortOrders() {
    const updates = todos.map((t, i) => ({ id: t.id, sort_order: i }));
    await db.from('todos').upsert(updates, { onConflict: 'id' });
}

function buildPriorityOptions(selected) {
    return Object.entries(PRIORITY_META).map(([val, { label }]) =>
        `<option value="${val}" ${selected === val ? 'selected' : ''}>${label}</option>`
    ).join('');
}

function renderTodos() {
    todoList.innerHTML = '';

    const display = [...todos]
        .sort((a, b) => {
            const p = PRIORITY_ORDER[a.priority ?? 'normal'] - PRIORITY_ORDER[b.priority ?? 'normal'];
            return p !== 0 ? p : (a.sort_order ?? 0) - (b.sort_order ?? 0);
        })
        .filter(t => priorityFilter === 'all' || t.priority === priorityFilter);

    if (display.length === 0) {
        const msg = todos.length === 0
            ? '할 일을 추가해보세요 ✏️'
            : '해당 우선순위의 할 일이 없습니다';
        todoList.innerHTML = `<li class="empty-msg">${msg}</li>`;
        todoFooter.style.display = 'none';
        return;
    }

    display.forEach((todo) => {
        const { priority = 'normal', completed, text, color, id } = todo;

        const li = document.createElement('li');
        li.className        = 'todo-item' + (completed ? ' completed' : '');
        li.dataset.priority = priority;
        li.dataset.todoId   = id;
        if (color) li.dataset.color = color;
        li.draggable = true;

        const checkBtn = document.createElement('button');
        checkBtn.className = 'check-btn' + (completed ? ' checked' : '');
        checkBtn.setAttribute('aria-label', '완료 체크');
        checkBtn.textContent = completed ? '✓' : '';
        checkBtn.addEventListener('click', () => toggleTodo(id));

        const textSpan = document.createElement('span');
        textSpan.className   = 'todo-text';
        textSpan.textContent = text;

        const colorPicker = createColorPicker(color || null, async (colorId) => {
            const t = todos.find(t => t.id === id);
            if (t) t.color = colorId;
            if (colorId) li.dataset.color = colorId;
            else         delete li.dataset.color;
            await db.from('todos').update({ color: colorId || null }).eq('id', id);
            renderPlanner();
        });

        const prioritySel = document.createElement('select');
        prioritySel.className        = 'priority-select';
        prioritySel.dataset.priority = priority;
        prioritySel.innerHTML        = buildPriorityOptions(priority);
        prioritySel.addEventListener('change', async () => {
            const t = todos.find(t => t.id === id);
            if (t) t.priority = prioritySel.value;
            await db.from('todos').update({ priority: prioritySel.value }).eq('id', id);
            renderTodos();
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.setAttribute('aria-label', '삭제');
        deleteBtn.textContent = '✕';
        deleteBtn.addEventListener('click', () => deleteTodo(id));

        li.append(checkBtn, textSpan, colorPicker, prioritySel, deleteBtn);
        todoList.appendChild(li);
    });

    const remaining = todos.filter(t => !t.completed).length;
    todoCount.textContent    = `${remaining}개 남음 / 전체 ${todos.length}개`;
    todoFooter.style.display = 'flex';
}

async function addTodo() {
    const text = todoInput.value.trim();
    if (!text) { todoInput.focus(); return; }
    const newTodo = {
        id:         Date.now(),
        text,
        completed:  false,
        priority:   prioritySelectEl.value,
        color:      addFormColor || null,
        sort_order: -1,
        user_id:    currentUser.id,
    };
    const { data, error } = await db.from('todos').insert(newTodo).select().single();
    if (error) { console.error(error); return; }
    todos.unshift(data);
    await saveSortOrders();
    renderTodos();
    todoInput.value = '';
    todoInput.focus();
}

async function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    const next = !todo.completed;
    const { error } = await db.from('todos').update({ completed: next }).eq('id', id);
    if (!error) {
        todo.completed = next;
        renderTodos();
    }
}

async function deleteTodo(id) {
    const { error } = await db.from('todos').delete().eq('id', id);
    if (!error) {
        todos = todos.filter(t => t.id !== id);
        renderTodos();
        renderPlanner();
    }
}

async function clearCompleted() {
    const { error } = await db.from('todos').delete().eq('completed', true);
    if (!error) {
        todos = todos.filter(t => !t.completed);
        renderTodos();
        renderPlanner();
    }
}

/* ── Drag & drop — reorder within list ── */

function clearDropIndicators() {
    todoList.querySelectorAll('.todo-item').forEach(el =>
        el.classList.remove('drag-over-top', 'drag-over-bottom')
    );
}

todoList.addEventListener('dragstart', (e) => {
    const li = e.target.closest('.todo-item');
    if (!li) return;
    document.querySelectorAll('.color-picker.open').forEach(p => p.classList.remove('open'));
    e.dataTransfer.setData('text/plain', li.dataset.todoId);
    e.dataTransfer.effectAllowed = 'all';
    setTimeout(() => li.classList.add('dragging'), 0);
});

todoList.addEventListener('dragend', () => {
    todoList.querySelectorAll('.todo-item').forEach(el => el.classList.remove('dragging'));
    clearDropIndicators();
});

todoList.addEventListener('dragover', (e) => {
    const li = e.target.closest('.todo-item');
    if (!li) return;
    e.preventDefault();
    clearDropIndicators();
    const rect = li.getBoundingClientRect();
    li.classList.add(e.clientY < rect.top + rect.height / 2 ? 'drag-over-top' : 'drag-over-bottom');
});

todoList.addEventListener('dragleave', (e) => {
    if (!todoList.contains(e.relatedTarget)) clearDropIndicators();
});

todoList.addEventListener('drop', async (e) => {
    e.preventDefault();
    clearDropIndicators();
    const targetLi = e.target.closest('.todo-item');
    if (!targetLi) return;

    const fromId = Number(e.dataTransfer.getData('text/plain'));
    const toId   = Number(targetLi.dataset.todoId);
    if (!fromId || fromId === toId) return;

    const fromIdx = todos.findIndex(t => t.id === fromId);
    const toIdx   = todos.findIndex(t => t.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;

    const rect   = targetLi.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    const [item] = todos.splice(fromIdx, 1);
    const newTo  = todos.findIndex(t => t.id === toId);
    todos.splice(before ? newTo : newTo + 1, 0, item);

    await saveSortOrders();
    renderTodos();
});

addBtn.addEventListener('click', addTodo);
todoInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });
clearCompletedBtn.addEventListener('click', clearCompleted);


/* =====================================================================
   10-MIN PLANNER
   ===================================================================== */

const SLOT_MINUTES = ['00', '10', '20', '30', '40', '50'];

let plannerData  = {};
let selectedHour = new Date().getHours();

function getTodayStr() {
    return new Date().toLocaleDateString('en-CA');
}

function slotKey(hour, min) {
    return `${getTodayStr()}_${String(hour).padStart(2, '0')}:${min}`;
}

function parseSlotKey(key) {
    const [datePart, timePart] = key.split('_');
    const [hourStr, minStr]    = timePart.split(':');
    return { slot_date: datePart, slot_hour: parseInt(hourStr), slot_minute: parseInt(minStr) };
}

function getTodoById(id) {
    return todos.find(t => t.id === id) || null;
}

function getColorMeta(colorId) {
    return COLORS.find(c => c.id === colorId) || null;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

async function assignSlot(key, todoId) {
    const { slot_date, slot_hour, slot_minute } = parseSlotKey(key);
    const { error } = await db.from('planner_slots').upsert(
        { slot_date, slot_hour, slot_minute, todo_id: todoId, user_id: currentUser.id },
        { onConflict: 'user_id,slot_date,slot_hour,slot_minute' }
    );
    if (!error) {
        plannerData[key] = todoId;
        renderPlanner();
    }
}

async function removeSlot(key) {
    const { slot_date, slot_hour, slot_minute } = parseSlotKey(key);
    delete plannerData[key];
    renderPlanner();
    await db.from('planner_slots')
        .delete()
        .eq('slot_date', slot_date)
        .eq('slot_hour', slot_hour)
        .eq('slot_minute', slot_minute);
}

function renderPlanner() {
    const container = document.getElementById('plannerSlots');
    const label     = document.getElementById('currentHourLabel');
    const hStr      = String(selectedHour).padStart(2, '0');
    label.textContent = `${hStr}:00 ~ ${hStr}:50`;
    container.innerHTML = '';

    SLOT_MINUTES.forEach(min => {
        const key          = slotKey(selectedHour, min);
        const assignedId   = plannerData[key];
        const assignedTodo = assignedId != null ? getTodoById(assignedId) : null;

        if (assignedId != null && !assignedTodo) {
            /* 삭제된 todo가 배치된 슬롯 — 로컬 즉시 정리, DB는 비동기 */
            delete plannerData[key];
            const p = parseSlotKey(key);
            db.from('planner_slots')
                .delete()
                .eq('slot_date', p.slot_date)
                .eq('slot_hour', p.slot_hour)
                .eq('slot_minute', p.slot_minute)
                .then();
            return;
        }

        const colorMeta = assignedTodo?.color ? getColorMeta(assignedTodo.color) : null;

        const row = document.createElement('div');
        row.className = 'planner-slot';

        const timeEl = document.createElement('span');
        timeEl.className   = 'slot-time';
        timeEl.textContent = `${hStr}:${min}`;

        const box = document.createElement('div');
        box.className       = 'slot-box' + (assignedTodo ? ' filled' : '');
        box.dataset.slotKey = key;
        if (colorMeta) box.dataset.color = colorMeta.id;

        if (assignedTodo) {
            const pri = assignedTodo.priority ?? 'normal';
            box.innerHTML = `
                ${colorMeta ? `<span class="slot-color-dot" style="background:${colorMeta.bg}"></span>` : ''}
                <span class="slot-todo-text">${escapeHtml(assignedTodo.text)}</span>
                <span class="slot-priority" style="color:${pri === 'high' ? '#e74c3c' : pri === 'normal' ? '#f39c12' : '#3498db'}">
                    ${PRIORITY_META[pri].label}
                </span>
                <button class="slot-remove" title="제거">✕</button>
            `;
            box.querySelector('.slot-remove').addEventListener('click', () => removeSlot(key));
        } else {
            box.innerHTML = `<span class="slot-empty-hint">드래그하여 할 일 배치</span>`;
        }

        box.addEventListener('dragover', (e) => {
            e.preventDefault();
            box.classList.add('drag-over');
        });
        box.addEventListener('dragleave', () => box.classList.remove('drag-over'));
        box.addEventListener('drop', (e) => {
            e.preventDefault();
            box.classList.remove('drag-over');
            const id = Number(e.dataTransfer.getData('text/plain'));
            if (id && getTodoById(id)) assignSlot(key, id);
        });

        row.appendChild(timeEl);
        row.appendChild(box);
        container.appendChild(row);
    });
}

document.getElementById('prevHour').addEventListener('click', () => {
    selectedHour = (selectedHour - 1 + 24) % 24;
    renderPlanner();
});
document.getElementById('nextHour').addEventListener('click', () => {
    selectedHour = (selectedHour + 1) % 24;
    renderPlanner();
});


/* =====================================================================
   INIT — Supabase에서 데이터 로드 후 렌더링
   ===================================================================== */

async function init() {
    const today = getTodayStr();

    const [{ data: todosData }, { data: slotsData }] = await Promise.all([
        db.from('todos').select('*').order('sort_order', { ascending: true }),
        db.from('planner_slots').select('*').eq('slot_date', today),
    ]);

    todos = todosData || [];

    plannerData = {};
    (slotsData || []).forEach(row => {
        const key = `${row.slot_date}_${String(row.slot_hour).padStart(2, '0')}:${String(row.slot_minute).padStart(2, '0')}`;
        plannerData[key] = row.todo_id;
    });

    renderTodos();
    renderPlanner();
}

/* init()은 onAuthStateChange에서 로그인 확인 후 호출됨 */
