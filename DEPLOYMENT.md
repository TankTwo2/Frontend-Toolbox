# 🚀 Frontend Toolbox 배포 가이드

이 문서는 Frontend Toolbox Chrome 확장프로그램을 Chrome 웹스토어에 자동 배포하는 방법을 설명합니다.

## 📋 사전 준비

### 1. Google Chrome 웹스토어 개발자 계정
- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)에서 계정 생성
- $5 일회성 등록 수수료 결제

### 2. Google Cloud Console API 설정

#### 2.1 프로젝트 생성 및 API 활성화
1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. **API 및 서비스 > 라이브러리**에서 "Chrome Web Store API" 검색 후 활성화

#### 2.2 OAuth2 클라이언트 생성
1. **API 및 서비스 > 사용자 인증 정보** 이동
2. **+ 사용자 인증 정보 만들기 > OAuth 클라이언트 ID** 선택
3. 애플리케이션 유형: **데스크톱 애플리케이션** 선택
4. 이름 입력 후 생성
5. **클라이언트 ID**와 **클라이언트 보안 비밀** 복사해서 저장

#### 2.3 리프레시 토큰 획득
터미널에서 다음 스크립트 실행:

```bash
# 임시 토큰 획득 스크립트 실행
node -e "
const CLIENT_ID = 'YOUR_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

console.log('1. 다음 URL을 브라우저에서 열어주세요:');
console.log(\`https://accounts.google.com/o/oauth2/auth?client_id=\${CLIENT_ID}&redirect_uri=\${REDIRECT_URI}&scope=https://www.googleapis.com/auth/chromewebstore&response_type=code\`);
console.log('2. 권한 승인 후 나타나는 코드를 복사하세요.');
console.log('3. 다음 명령어로 리프레시 토큰을 획득하세요:');
console.log(\`curl -d client_id=\${CLIENT_ID} -d client_secret=\${CLIENT_SECRET} -d code=AUTHORIZATION_CODE -d grant_type=authorization_code -d redirect_uri=\${REDIRECT_URI} https://accounts.google.com/o/oauth2/token\`);
"
```

### 3. 확장프로그램 등록
1. Chrome 웹스토어 개발자 대시보드에서 **새 항목 추가**
2. 임시 zip 파일 업로드 (처음에는 수동으로 업로드)
3. **확장프로그램 ID** 복사해서 저장

## ⚙️ GitHub Secrets 설정

GitHub 저장소의 **Settings > Secrets and variables > Actions**에서 다음 secrets 추가:

| Secret Name | 설명 | 예시 |
|-------------|------|------|
| `EXTENSION_ID` | Chrome 웹스토어 확장프로그램 ID | `abcdefghijklmnopqrstuvwxyz123456` |
| `CLIENT_ID` | Google OAuth2 클라이언트 ID | `123456789-abc.apps.googleusercontent.com` |
| `CLIENT_SECRET` | Google OAuth2 클라이언트 비밀 | `GOCSPX-aBcDeFgHiJkLmNoPqRsTuVwXyZ` |
| `REFRESH_TOKEN` | OAuth2 리프레시 토큰 | `1//abc123def456...` |

## 🚀 배포 방법

### 자동 배포 (추천)

#### 방법 1: GitHub 웹사이트에서 수동 트리거
1. GitHub 저장소의 **Actions** 탭 이동
2. **Deploy to Chrome Web Store** 워크플로우 선택
3. **Run workflow** 클릭
4. 버전 업 타입 선택 (patch/minor/major)
5. **Run workflow** 실행

#### 방법 2: Git 태그로 자동 트리거
```bash
# 버전 업 후 태그 생성
npm run version:patch  # 또는 minor, major
git push

# 태그 푸시로 자동 배포 트리거
git push --tags
```

### 수동 배포

```bash
# 1. 빌드 및 패키징
npm run release

# 2. Chrome 웹스토어 업로드 (환경변수 필요)
npm run deploy
```

## 📦 배포 프로세스

1. **빌드**: TypeScript 컴파일 및 webpack 번들링
2. **패키징**: dist 폴더를 zip 파일로 압축
3. **업로드**: Chrome Web Store API를 통해 자동 업로드
4. **릴리즈**: GitHub에 자동으로 릴리즈 생성
5. **검토**: Google의 확장프로그램 검토 (1-3일 소요)

## 🔧 로컬 개발

```bash
# 개발 모드 (자동 리로드)
npm run dev

# 타입 체크
npm run typecheck

# 프로덕션 빌드
npm run build:production

# 패키지 생성
npm run package
```

## 📝 버전 관리

- `npm run version:patch`: 버그 수정 (1.0.0 → 1.0.1)
- `npm run version:minor`: 새 기능 (1.0.0 → 1.1.0)  
- `npm run version:major`: 주요 변경 (1.0.0 → 2.0.0)

## 🔍 트러블슈팅

### 업로드 실패 시

#### "Invalid credentials" 오류
- GitHub Secrets의 OAuth2 정보 확인
- 리프레시 토큰이 만료되었을 가능성 → 재발급 필요

#### "Extension not found" 오류
- `EXTENSION_ID`가 올바른지 확인
- Chrome 웹스토어에서 확장프로그램이 정상 등록되었는지 확인

#### "Insufficient permissions" 오류
- Chrome Web Store API가 활성화되었는지 확인
- OAuth2 스코프에 `https://www.googleapis.com/auth/chromewebstore` 포함 확인

### 빌드 실패 시

#### TypeScript 오류
```bash
npm run typecheck
```

#### 종속성 문제
```bash
npm ci
npm audit fix
```

## 📚 추가 자료

- [Chrome Web Store API 문서](https://developer.chrome.com/docs/webstore/api/)
- [Chrome 확장프로그램 개발 가이드](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 마이그레이션 가이드](https://developer.chrome.com/docs/extensions/migrating/)

## 🎯 배포 체크리스트

배포 전 다음 사항을 확인하세요:

- [ ] 모든 기능이 정상 작동하는지 테스트
- [ ] 타입 에러가 없는지 확인 (`npm run typecheck`)
- [ ] manifest.json의 권한이 적절한지 검토
- [ ] 개인정보 보호 정책이 필요한 권한들을 설명하는지 확인
- [ ] 스크린샷과 설명이 최신 버전을 반영하는지 확인
- [ ] GitHub Secrets가 올바르게 설정되었는지 확인

## ⚡ 빠른 시작

```bash
# 1. 종속성 설치
npm install

# 2. 개발 모드 시작
npm run dev

# 3. 첫 배포 (GitHub Actions 트리거)
git tag v1.0.0
git push --tags
```

배포 후 1-3일 내에 Google의 검토가 완료되면 Chrome 웹스토어에서 확장프로그램을 사용할 수 있습니다! 🎉