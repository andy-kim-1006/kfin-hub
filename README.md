# KFIN Team Hub

KFIN 운영진 4명이 함께 쓰는 협업 대시보드입니다.
미팅 노트 / 컨택 리스트 / 인스타그램 콘텐츠 아이디어를 실시간으로 공유하고 편집할 수 있습니다.

## 설정 방법

1. `firebase-config.js` 파일을 열고, Firebase Console에서 복사한 본인의 설정값으로 교체하세요.
2. Firebase Console에서 Authentication(이메일/비밀번호) 과 Firestore Database를 활성화하세요.
3. GitHub Pages로 배포하면 실제 웹사이트 링크가 생성됩니다.

자세한 단계별 가이드는 Claude와의 대화를 참고하세요.

## 파일 구성

- `index.html` — 화면 구조 및 디자인
- `app.js` — Firebase 연동 로직 (로그인, 데이터 저장/불러오기)
- `firebase-config.js` — Firebase 프로젝트 설정값 (본인 값으로 교체 필요)
