# Frontend Toolbox

## 프로젝트 개요
Chrome 확장 프로그램 - 프론트엔드 개발자를 위한 도구 모음

## 기술 스택
- **Frontend**: React 18 + TypeScript
- **빌드**: Webpack 5
- **스타일**: CSS Modules
- **확장**: Chrome Extension Manifest V3

## 프로젝트 구조
```
src/
├── components/          # 공통 컴포넌트 (Button, Modal, Panel)
├── features/           # 기능별 모듈
│   ├── imageDownloader/ # 이미지 다운로더
│   ├── styleInspector/  # 스타일 인스펙터
│   └── videoRecorder/   # 비디오 녹화기
├── content/            # Content Script
├── popup/              # 팝업 UI
└── background/         # Background Script
```

## 주요 기능
1. **Image Downloader**: 웹페이지 이미지 수집/다운로드
2. **Style Inspector**: CSS 스타일 추출/분석
3. **Video Recorder**: 화면 녹화 (현재탭/전체화면/화면지정)

## 개발 명령어
- `npm run build`: 프로덕션 빌드
- `npm run dev`: 개발 모드 (watch)
- `npm run lint`: ESLint 검사
- `npm run typecheck`: TypeScript 타입 검사

## 코딩 컨벤션
- React 함수형 컴포넌트 사용
- TypeScript strict 모드
- CSS 클래스명: kebab-case
- 파일명: PascalCase (컴포넌트), camelCase (유틸)

## 빌드 결과물
- `dist/manifest.json`: 확장 프로그램 매니페스트
- `dist/popup.js`: 팝업 스크립트
- `dist/content.js`: 컨텐츠 스크립트
- `dist/background.js`: 백그라운드 스크립트

## 확장 프로그램 로드
1. Chrome에서 `chrome://extensions/` 접속
2. 개발자 모드 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. `dist` 폴더 선택