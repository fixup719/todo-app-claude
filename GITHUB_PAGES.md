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
git clone git@github.com:fixup719/todo-app-claude.git
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

## 7단계: GitHub OAuth 인증 설정

앱에 GitHub 로그인 기능이 있으므로 이 단계를 완료해야 로그인이 동작한다.

### 7-1. Supabase에서 콜백 URL 확인

1. [https://supabase.com/dashboard](https://supabase.com/dashboard) → 프로젝트 선택
2. 왼쪽 메뉴 **Authentication** → **Providers** → **GitHub** 클릭
3. 화면에 표시된 **Callback URL (for OAuth)** 값을 복사해 둠
   - 형식: `https://sitahrrjitwfsnwfjfme.supabase.co/auth/v1/callback`

### 7-2. GitHub OAuth App 생성

1. [https://github.com/settings/developers](https://github.com/settings/developers) 접속
2. **OAuth Apps** → **New OAuth App** 클릭
3. 다음 값 입력:
   - **Application name**: `todo-app-claude`
   - **Homepage URL**: `https://fixup719.github.io/todo-app-claude/`
   - **Authorization callback URL**: 7-1에서 복사한 Supabase 콜백 URL
     ```
     https://sitahrrjitwfsnwfjfme.supabase.co/auth/v1/callback
     ```
     > ⚠️ 이 칸에는 반드시 **Supabase 콜백 URL**만 입력. `localhost`가 들어가면 인증 후 연결 거부 오류 발생.
4. **Register application** 클릭
5. **Client ID** 복사
6. **Generate a new client secret** 클릭 → **Client Secret** 복사

### 7-3. Supabase에 GitHub 정보 입력

1. Supabase → **Authentication** → **Providers** → **GitHub**
2. **Enable** 토글 켜기
3. **Client ID** / **Client Secret** 붙여넣기
4. **Save** 클릭

### 7-4. Supabase 리다이렉트 URL 허용 설정

인증 완료 후 Supabase가 앱으로 되돌아올 수 있도록 허용 URL을 등록한다.

1. Supabase → **Authentication** → **URL Configuration**
2. **Site URL**: `https://fixup719.github.io/todo-app-claude/`
3. **Redirect URLs** 에 아래 URL 추가 (로컬 개발용):
   ```
   https://fixup719.github.io/todo-app-claude/
   http://localhost:5500
   http://127.0.0.1:5500
   ```
   > Live Server 포트가 다르면 해당 포트로 맞춰 추가 (예: `:5501`)
4. **Save** 클릭

> 설정 완료 후 "GitHub로 로그인" 버튼이 정상 동작한다. 인증 흐름:
> `앱 → GitHub → Supabase 콜백 URL → 앱(localhost 또는 GitHub Pages)`

### 🔧 트러블슈팅: "localhost에서 연결을 거부했습니다"

GitHub 인증 후 이 오류가 뜨면 아래 두 가지를 확인:

| 확인 항목 | 올바른 값 |
|-----------|-----------|
| GitHub OAuth App → Authorization callback URL | `https://sitahrrjitwfsnwfjfme.supabase.co/auth/v1/callback` |
| Supabase → URL Configuration → Redirect URLs | 앱 URL (localhost 또는 GitHub Pages URL) |

GitHub OAuth App 콜백 URL 수정 방법:
1. [https://github.com/settings/developers](https://github.com/settings/developers) → **OAuth Apps** → `todo-app-claude`
2. **Authorization callback URL** 을 Supabase 콜백 URL로 교체
3. **Update application** 저장

---

## 8단계: Supabase CORS 확인 (필요 시)

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

`kosa-vibecoding-2026-3rd` 쪽 소스를 수정한 뒤 `todo-app-claude`에 반영하고 싶을 때:

### 방법 1: rsync (권장 — 한 줄)

```bash
rsync -av ~/work/kosa-vibecoding-2026-3rd/src/exercise/fixup719/day02/todo/ \
          ~/work/todo-app-claude/
```

> `rsync -av`는 변경된 파일만 덮어쓰고 어떤 파일이 복사됐는지 출력해 준다.  
> CLAUDE.md 등 특정 파일을 제외하려면 `--exclude='CLAUDE.md'` 옵션 추가.

### 방법 2: cp (파일 개별 복사)

```bash
cp ~/work/kosa-vibecoding-2026-3rd/src/exercise/fixup719/day02/todo/index.html ~/work/todo-app-claude/
cp ~/work/kosa-vibecoding-2026-3rd/src/exercise/fixup719/day02/todo/style.css  ~/work/todo-app-claude/
cp ~/work/kosa-vibecoding-2026-3rd/src/exercise/fixup719/day02/todo/app.js     ~/work/todo-app-claude/
```

### 파일 복사 후 배포

```bash
cd ~/work/todo-app-claude
git add .
git commit -m "feat: 앱 업데이트"
git push origin main
```

Push 후 1~2분 내에 자동 재배포됨.
