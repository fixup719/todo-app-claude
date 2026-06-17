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

현재 `localStorage('todos_v1')` 배열에 저장되는 항목:

```sql
create table todos (
  id          bigint primary key,          -- Date.now() 기반 기존 ID 유지
  text        text        not null,
  completed   boolean     not null default false,
  priority    text        not null default 'normal'
                check (priority in ('high', 'normal', 'low')),
  color       text        check (color in ('red', 'yellow', 'green', 'purple', 'blue')),
  sort_order  integer     not null default 0, -- 드래그 재정렬 순서 저장
  created_at  timestamptz not null default now()
);
```

> **sort_order**: localStorage는 배열 순서 자체가 정렬이었지만, DB에서는 명시적 컬럼이 필요. 0, 10, 20 … 간격으로 저장하면 삽입 시 전체 재정렬 없이 처리 가능.

### 3-2. `planner_slots` 테이블

현재 `localStorage('planner_v1')` 객체의 키: `"YYYY-MM-DD_HH:mm"`, 값: `todo_id`

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

> **기존 key 형식 `2026-06-17_09:00`** 은 앱 코드에서 date/hour/minute 3개 컬럼으로 분해해서 저장. `slotKey()` 함수를 파싱하거나 별도 헬퍼로 변환.

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

빌드 도구가 없으므로 CDN으로 로드:

```html
<!-- index.html </body> 바로 위에 추가 -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script>
  const SUPABASE_URL = 'https://xxxx.supabase.co';   // Project URL
  const SUPABASE_KEY = 'eyJ...';                      // anon public key
  window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
</script>
<script src="app.js"></script>
```

---

## 7. app.js 변경 포인트 요약

| 현재 함수 | 변경 내용 |
|-----------|-----------|
| `loadTodos()` | `supabase.from('todos').select('*').order('sort_order')` |
| `saveTodos()` | 개별 변경(add/toggle/delete/reorder)으로 분리 — 배열 전체를 한 번에 쓰는 방식 제거 |
| `addTodo()` | `supabase.from('todos').insert({...})` |
| `toggleTodo()` | `supabase.from('todos').update({completed}).eq('id', id)` |
| `deleteTodo()` | `supabase.from('todos').delete().eq('id', id)` |
| `clearCompleted()` | `supabase.from('todos').delete().eq('completed', true)` |
| 드래그 재정렬 | `sort_order` 일괄 upsert |
| `loadPlanner()` | `supabase.from('planner_slots').select('*').eq('slot_date', today)` |
| `savePlanner()` (배치) | `upsert` / `delete` 로 슬롯별 처리 |

모든 Supabase 호출은 `async/await` 로 처리하고, `renderTodos()` / `renderPlanner()` 를 비동기 함수로 전환해야 함.

---

## 8. 마이그레이션 순서 (권장)

1. **Supabase 프로젝트 생성 + 테이블 SQL 실행**
2. **index.html에 CDN 스크립트 추가**
3. **app.js에 `_supabase` 클라이언트 래퍼 함수 작성** (기존 localStorage 함수와 동일한 인터페이스 유지)
4. **Todo 기능부터 전환** → 동작 확인
5. **Planner 기능 전환**
6. **기존 localStorage 데이터 Supabase로 일회성 import** (필요 시)
7. **localStorage 코드 제거**
