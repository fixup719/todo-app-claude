# Supabase 마이그레이션 가이드

이 앱의 데이터 저장을 `localStorage` → Supabase(PostgreSQL)로 전환하기 위한 설정 가이드.

---

## 1. Supabase 프로젝트 생성

1. [https://supabase.com](https://supabase.com) 접속 → **Start your project** (GitHub 계정으로 가입 권장)
2. 대시보드에서 **New project** 클릭
3. 설정 입력:
   - **Organization**: 개인 계정 선택
   - **Name**: `todo-planner` (원하는 이름)
   - **Database Password**: 안전한 패스워드 설정 후 메모
   - **Region**: `Northeast Asia (Seoul)` — 레이턴시 최소화
4. **Create new project** 클릭 (DB 초기화 약 1~2분 소요)

---

## 2. API 키 확인

프로젝트 대시보드 → **Project Settings** → **API**

| 항목 | 용도 |
|------|------|
| `Project URL` | Supabase 엔드포인트 (`https://xxxx.supabase.co`) |
| `anon public` key | 브라우저에서 사용할 공개 키 (Row Level Security로 보호) |
| `service_role` key | 서버 전용 — 브라우저 코드에 **절대 노출 금지** |

---

## 3. 테이블 구조

### 3-1. `todos` 테이블

```sql
create table todos (
  id          bigint primary key,          -- Date.now() 기반 ID
  text        text        not null,
  completed   boolean     not null default false,
  priority    text        not null default 'normal'
                check (priority in ('high', 'normal', 'low')),
  color       text        check (color in ('red', 'yellow', 'green', 'purple', 'blue')),
  sort_order  integer     not null default 0, -- 드래그 재정렬 순서 저장
  created_at  timestamptz not null default now()
);
```

> **sort_order**: 앱은 `todos.map((t, i) => ({id: t.id, sort_order: i}))` 를 일괄 upsert해 순서를 보존한다. 우선순위 자동정렬은 클라이언트에서 처리하므로 DB의 sort_order는 같은 우선순위 내 순서에만 영향.

### 3-2. `planner_slots` 테이블

앱 내부 키 형식 `"YYYY-MM-DD_HH:mm"` 을 date/hour/minute 3컬럼으로 분해해 저장.

```sql
create table planner_slots (
  id          bigserial   primary key,
  slot_date   date        not null,        -- 예: '2026-06-17'
  slot_hour   smallint    not null check (slot_hour between 0 and 23),
  slot_minute smallint    not null check (slot_minute in (0, 10, 20, 30, 40, 50)),
  todo_id     bigint      references todos(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (slot_date, slot_hour, slot_minute)  -- 슬롯당 1개 todo만
);
```

> `parseSlotKey("2026-06-17_09:00")` → `{slot_date: "2026-06-17", slot_hour: 9, slot_minute: 0}` 으로 분해해 저장. `unique` 제약 덕분에 같은 슬롯에 다른 todo를 드롭하면 upsert로 덮어쓴다.

---

## 4. Supabase SQL Editor에서 테이블 생성

대시보드 → **SQL Editor** → **New query** → 위 SQL을 붙여넣고 **Run** 클릭.

---

## 5. Row Level Security (RLS) 설정

이 앱은 현재 단일 사용자이므로 가장 간단한 방식: **모든 접근 허용** (개인용)

```sql
-- todos
alter table todos enable row level security;
create policy "allow all" on todos for all using (true) with check (true);

-- planner_slots
alter table planner_slots enable row level security;
create policy "allow all" on planner_slots for all using (true) with check (true);
```

> 나중에 Supabase Auth 로그인을 붙인다면 `using (auth.uid() = user_id)` 방식으로 교체.

---

## 6. 앱에 Supabase 클라이언트 추가

빌드 도구가 없으므로 CDN으로 로드. `index.html`에서 `app.js` 바로 위에 추가:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script src="app.js"></script>
```

`app.js` 최상단에서 클라이언트 초기화:

```js
const SUPABASE_URL = 'https://xxxx.supabase.co';  // Project URL
const SUPABASE_KEY = 'eyJ...';                     // anon public key
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
```

---

## 7. 실제 구현된 함수 목록

| 함수 | DB 조작 |
|------|---------|
| `init()` | todos + planner_slots 병렬 로드 (`Promise.all`) 후 `renderTodos()` / `renderPlanner()` |
| `addTodo()` | `db.from('todos').insert(newTodo).select().single()` → `saveSortOrders()` |
| `toggleTodo(id)` | `db.from('todos').update({completed}).eq('id', id)` |
| `deleteTodo(id)` | `db.from('todos').delete().eq('id', id)` |
| `clearCompleted()` | `db.from('todos').delete().eq('completed', true)` |
| `saveSortOrders()` | `db.from('todos').upsert([{id, sort_order}…], {onConflict:'id'})` — 드래그 후 전체 순서 저장 |
| 색상 변경 (인라인) | `db.from('todos').update({color}).eq('id', id)` |
| 우선순위 변경 (인라인) | `db.from('todos').update({priority}).eq('id', id)` → `renderTodos()` |
| `assignSlot(key, todoId)` | `db.from('planner_slots').upsert({slot_date,slot_hour,slot_minute,todo_id}, {onConflict:'slot_date,slot_hour,slot_minute'})` |
| `removeSlot(key)` | 로컬 즉시 삭제 후 `db.from('planner_slots').delete().eq(…)` |
| `parseSlotKey(key)` | `"YYYY-MM-DD_HH:mm"` → `{slot_date, slot_hour, slot_minute}` 분해 (헬퍼) |

> `renderTodos()` / `renderPlanner()` 는 로컬 캐시(`todos`, `plannerData`)를 읽는 **동기 함수**로 유지. DB 호출은 각 CRUD 함수 내 `async/await` 로만 처리.

---

## 8. GitHub OAuth 인증 설정

### 8-1. GitHub OAuth App 생성

1. [https://github.com/settings/developers](https://github.com/settings/developers) 접속
2. **OAuth Apps** → **New OAuth App** 클릭
3. 다음 값 입력:
   - **Application name**: `todo-app-claude` (원하는 이름)
   - **Homepage URL**: `https://fixup719.github.io/todo-app-claude/`
   - **Authorization callback URL**: Supabase 대시보드에서 복사 (아래 참고)
4. **Register application** 클릭
5. **Client ID** 복사, **Generate a new client secret** 클릭 후 **Client Secret** 복사

### 8-2. Supabase에서 GitHub Provider 활성화

1. Supabase 대시보드 → **Authentication** → **Providers**
2. **GitHub** 클릭 → **Enable** 토글 켜기
3. **Callback URL (for OAuth)** 값을 복사 → GitHub OAuth App의 **Authorization callback URL**에 붙여넣기
4. GitHub에서 복사한 **Client ID** / **Client Secret** 입력
5. **Save** 클릭

### 8-3. DB 마이그레이션 — user_id 컬럼 추가

인증 적용 후 각 사용자가 자신의 데이터만 보도록 테이블에 `user_id` 컬럼과 RLS 정책을 업데이트한다.

**Supabase SQL Editor에서 실행:**

```sql
-- 기존 익명 데이터 삭제 (user_id 없는 데이터)
delete from planner_slots;
delete from todos;

-- todos에 user_id 추가
alter table todos
  add column user_id uuid references auth.users(id) default auth.uid();

-- RLS 정책 교체 (todos)
drop policy "allow all" on todos;
create policy "users own todos" on todos
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- planner_slots에 user_id 추가
alter table planner_slots
  add column user_id uuid references auth.users(id) default auth.uid();

-- unique 제약 user_id 포함으로 재생성 (upsert 충돌 감지용)
alter table planner_slots
  drop constraint planner_slots_slot_date_slot_hour_slot_minute_key;
alter table planner_slots
  add constraint planner_slots_user_slot_unique
  unique (user_id, slot_date, slot_hour, slot_minute);

-- RLS 정책 교체 (planner_slots)
drop policy "allow all" on planner_slots;
create policy "users own slots" on planner_slots
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

> `default auth.uid()` 덕분에 앱 코드에서 `user_id`를 매번 명시하지 않아도 Supabase가 로그인한 사용자의 UUID를 자동으로 설정한다. RLS가 SELECT/UPDATE/DELETE도 자동으로 필터링한다.

---

## 9. 추가 기능 — 우선순위 자동정렬 & 필터 (구현 완료)

- `PRIORITY_ORDER = { high: 0, normal: 1, low: 2 }` 상수로 정렬 기준 정의
- `renderTodos()` 내부에서 `[...todos].sort().filter()` 로 표시 전용 배열 생성
- `#priorityFilter` 콤보박스(전체 / 높음 / 보통 / 낮음)로 필터링
- 이벤트 핸들러는 배열 인덱스 대신 `todo.id` 클로저 캡처 방식 사용 (정렬 후 인덱스 오류 방지)
