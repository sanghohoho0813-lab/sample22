# SETUP.md

## 요구사항
- Node 20+ (검증: Node 22) · npm 10+

## 로컬
```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit
npm run build && npm start
```

## 배포 (Vercel)
- Framework: Next.js · Build: `npm run build` · 환경변수 불필요
- `/ax/*`는 `robots: noindex`

## 사진 자산
`public/assets/README.md` 규칙대로 jpg 파일을 넣으면 코드 수정 없이 placeholder → 실사진으로 전환됩니다.

## 데이터 초기화
브라우저 localStorage 키 `nexmart-demo-v1` — AX 하단 "Demo Reset" 또는 설정 > Demo에서 초기화.
