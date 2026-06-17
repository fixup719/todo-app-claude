# GitHub Pages 배포 가이드

배포 대상: `https://fixup719.github.io/todo-app-claude/`

---

## 1단계: GitHub에서 새 저장소 생성

1. [https://github.com/new](https://github.com/new) 접속 (fixup719 계정으로 로그인된 상태여야 함)
2. 다음 값 입력:
   - **Repository name**: `todo-app-claude`
   - **Visibility**: Public ← GitHub Pages 무료 플랜은 Public만 지원
   - **Add a README file**: 체크 **해제** (빈 repo로 생성)
3. **Create repository** 클릭

---

## 2단계: 로컬에 Clone

```bash
cd ~/work
git clone https://github.com/fixup719/todo-app-claude.git
cd todo-app-claude
```

---

## 3단계: 앱 파일 복사

현재 저장소(`kosa-vibecoding-2026-3rd`)에서 앱 파일 3개를 복사:

```bash
cp ~/work/kosa-vibecoding-2026-3rd/src/exercise/fixup719/day02/todo/index.html .
cp ~/work/kosa-vibecoding-2026-3rd/src/exercise/fixup719/day02/todo/style.css .
cp ~/work/kosa-vibecoding-2026-3rd/src/exercise/fixup719/day02/todo/app.js .
```

복사 확인:

```bash
ls -1
# 출력 예시:
# app.js
# index.html
# style.css
```

---

## 4단계: 커밋 & Push

```bash
git add index.html style.css app.js
git commit -m "feat: Todo & Pomodoro 앱 초기 배포"
git push origin main
```

---

## 5단계: GitHub Pages 활성화

1. `https://github.com/fixup719/todo-app-claude` 접속
2. **Settings** 탭 클릭
3. 왼쪽 사이드바에서 **Pages** 클릭
4. **Source** 섹션에서:
   - Branch: **main**
   - Folder: **/ (root)**
5. **Save** 클릭

---

## 6단계: 배포 확인

Save 후 약 1~3분 기다린 뒤:

```
https://fixup719.github.io/todo-app-claude/
```

접속해서 앱이 정상 동작하는지 확인.

> Pages 탭 상단에 "Your site is live at …" 메시지가 뜨면 준비 완료.

---

## 7단계: Supabase CORS 확인 (필요 시)

배포 후 브라우저 콘솔에서 CORS 오류가 발생하면:

1. [https://supabase.com/dashboard](https://supabase.com/dashboard) → 프로젝트 선택
2. **Project Settings** → **API** → **Allowed Origins**
3. 아래 URL 추가:

```
https://fixup719.github.io
```

4. **Save** 클릭

> 기본 설정에서는 Supabase가 모든 origin을 허용하므로 대부분 이 단계는 불필요.

---

## 이후 앱 업데이트 방법

앱 코드(`index.html` / `style.css` / `app.js`)를 수정했을 때:

```bash
cd ~/work/todo-app-claude

# 최신 파일 다시 복사
cp ~/work/kosa-vibecoding-2026-3rd/src/exercise/fixup719/day02/todo/index.html .
cp ~/work/kosa-vibecoding-2026-3rd/src/exercise/fixup719/day02/todo/style.css .
cp ~/work/kosa-vibecoding-2026-3rd/src/exercise/fixup719/day02/todo/app.js .

git add index.html style.css app.js
git commit -m "feat: 앱 업데이트"
git push origin main
```

Push 후 1~2분 내에 자동 재배포됨.
