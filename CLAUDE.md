# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git 규칙

- 브랜치 통합 시 **rebase 금지**, 반드시 **merge** 사용
- 작업 범위는 이 디렉토리(`src/exercise/fixup719/day02/todo/`) 이하 파일로 한정 — 상위 디렉토리를 탐색하거나 수정하지 않음

## 프로젝트 개요

빌드 도구 없는 순수 HTML/CSS/JS 단일 페이지 앱. 서버 없이 브라우저에서 파일을 직접 열면 동작한다.

**실행:** `index.html`을 브라우저로 열기 (Live Server 또는 로컬 파일 직접)

## 파일 구조

| 파일 | 역할 |
|------|------|
| `index.html` | 레이아웃 골격 — 좌측 Todo, 우측 상단 Pomodoro, 우측 하단 플래너 |
| `style.css` | CSS 변수 기반 다크/라이트 테마, 2컬럼 그리드 레이아웃 |
| `app.js` | 전체 로직 (테마 / 타이머 / Todo / 플래너) 단일 파일 |

## 아키텍처

### 상태 관리
전역 변수 + `localStorage` 직접 저장. 별도 상태 라이브러리 없음.

- `todos` 배열 → `localStorage('todos_v1')`
- `plannerData` 객체 → `localStorage('planner_v1')`

### app.js 섹션 순서
1. **Theme Toggle** — `body.light` 클래스 토글
2. **Pomodoro Timer** — `setInterval` 기반, AudioContext로 완료 알림음
3. **Todo List** — `renderTodos()`가 전체 재렌더, 우선순위별 색상은 `data-priority` CSS 어트리뷰트로 처리
4. **10-Min Planner** — 오늘 날짜 + 시간을 키로 한 슬롯 맵, Todo → 슬롯 드래그 앤 드롭 지원

### 색상 피커
`createColorPicker(initialColor, onChange)` 팩토리 함수로 커스텀 드롭다운 생성. `<select>`가 아닌 DOM 직접 조작 방식 (브라우저별 `<option>` 배경색 미지원 이슈 회피).

### 드래그 앤 드롭
- **Todo 리스트 내 재정렬**: `todoList`에 위임된 `dragover`/`drop` 이벤트로 처리, `todos` 배열 직접 재정렬 후 `renderTodos()` 호출
- **플래너 슬롯 배치**: 각 `slot-box`에 개별 이벤트 리스너, `dataTransfer`로 todoId 전달

### CSS 테마
`:root`에 CSS 변수 정의, `body.light` 오버라이드로 라이트 모드 전환. Pomodoro 모드(`work`/`short`/`long`)에 따라 `--accent` 색상이 `data-mode` 어트리뷰트로 변경됨.
