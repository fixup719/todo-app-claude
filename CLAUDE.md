# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git 규칙

- 브랜치 통합 시 **rebase 금지**, 반드시 **merge** 사용
- 작업 범위는 이 디렉토리(`src/exercise/fixup719/day02/todo/`) 이하 파일로 한정 — 상위 디렉토리를 탐색하거나 수정하지 않음

## 프로젝트 개요

빌드 도구 없는 순수 HTML/CSS/JS 단일 페이지 앱. 데이터는 Supabase(PostgreSQL)에 저장된다.

**실행:** `index.html`을 브라우저로 열기 (Live Server 또는 로컬 파일 직접 — Supabase JS는 CDN 로드)

## 파일 구조

| 파일 | 역할 |
|------|------|
| `index.html` | 레이아웃 골격 — 좌측 Todo, 우측 상단 Pomodoro, 우측 하단 플래너 |
| `style.css` | CSS 변수 기반 다크/라이트 테마, 2컬럼 그리드 레이아웃 |
| `app.js` | 전체 로직 (Supabase 클라이언트 / 테마 / 타이머 / Todo / 플래너) 단일 파일 |
| `SUPABASE.md` | Supabase 프로젝트 설정 및 테이블 생성 가이드 |
| `GITHUB_PAGES.md` | GitHub Pages 배포 및 소스 동기화 가이드 |

## 아키텍처

### 상태 관리
전역 변수(로컬 캐시) + **Supabase(PostgreSQL)** 저장. 테마만 localStorage 사용.

- `todos` 배열 → Supabase `todos` 테이블 (로컬 캐시로도 유지)
- `plannerData` 객체 → Supabase `planner_slots` 테이블 (로컬 캐시로도 유지)
- `theme` → `localStorage('theme')`

### app.js 섹션 순서
1. **Supabase Client** — `const db = supabase.createClient(URL, KEY)`
2. **Theme Toggle** — `body.light` 클래스 토글, 테마는 localStorage 유지
3. **Pomodoro Timer** — `setInterval` 기반, AudioContext로 완료 알림음
4. **Todo List** — `renderTodos()`가 전체 재렌더, 우선순위별 색상은 `data-priority` CSS 어트리뷰트로 처리
5. **10-Min Planner** — 오늘 날짜 + 시간을 키로 한 슬롯 맵, Todo → 슬롯 드래그 앤 드롭 지원
6. **INIT** — `init()`에서 todos/planner_slots 병렬 로드 후 렌더링

### 우선순위 자동정렬 & 필터
- `PRIORITY_ORDER = { high: 0, normal: 1, low: 2 }` 상수로 정렬 기준 정의
- `renderTodos()` 내부에서 `[...todos].sort(...).filter(...)` 로 표시 전용 배열 생성 (`todos` 원본 배열은 sort_order 순 유지)
- 같은 우선순위 내에서는 `sort_order` 기준 유지 (드래그 순서 반영)
- 우선순위 변경 시 즉시 `renderTodos()` 재호출 → 항목이 올바른 그룹으로 자동 이동
- `#priorityFilter` 콤보박스: 전체 / 높음 / 보통 / 낮음

### 색상 피커
`createColorPicker(initialColor, onChange)` 팩토리 함수로 커스텀 드롭다운 생성. `<select>`가 아닌 DOM 직접 조작 방식 (브라우저별 `<option>` 배경색 미지원 이슈 회피).

### 드래그 앤 드롭
- **Todo 리스트 내 재정렬**: `todoList`에 위임된 `dragover`/`drop` 이벤트로 처리, `todos` 배열 직접 재정렬 후 `saveSortOrders()` → `renderTodos()` 호출
  - `saveSortOrders()`: `todos.map((t, i) => ({id: t.id, sort_order: i}))` 를 일괄 upsert
- **플래너 슬롯 배치**: 각 `slot-box`에 개별 이벤트 리스너, `dataTransfer`로 todoId 전달
  - `assignSlot(key, todoId)`: upsert (unique 제약으로 덮어쓰기)
  - `removeSlot(key)`: 로컬 캐시 즉시 삭제 후 DB delete
  - `parseSlotKey(key)`: `"YYYY-MM-DD_HH:mm"` 문자열 → `{slot_date, slot_hour, slot_minute}` 분해

### 이벤트 핸들러 — id 기반
`renderTodos()` 내부의 이벤트 핸들러(toggleTodo, deleteTodo, 색상/우선순위 변경)는 배열 인덱스 대신 `todo.id`를 클로저로 캡처. 우선순위 정렬 후 표시 순서와 `todos` 배열 순서가 달라지더라도 올바른 항목을 조작할 수 있다.

### CSS 테마
`:root`에 CSS 변수 정의, `body.light` 오버라이드로 라이트 모드 전환. Pomodoro 모드(`work`/`short`/`long`)에 따라 `--accent` 색상이 `data-mode` 어트리뷰트로 변경됨.
