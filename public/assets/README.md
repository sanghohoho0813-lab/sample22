# NEXMART Visual Asset Slots

사진 자산은 추후 적용 예정입니다. 아래 파일명으로 이 폴더에 넣으면 코드 수정 없이 반영됩니다.
(빌드 시 `scripts/gen-assets.mjs`가 이 폴더를 스캔해 목록을 만들고, 목록에 있는 슬롯만 이미지를 불러옵니다. jpg/jpeg/png/webp 지원. 개발 중에는 `npm run assets`로 갱신.)

| Key | 파일명 | 사용 위치 |
|---|---|---|
| NEXMART-HERO-01 | hero-01.jpg | Customer Home Hero |
| NEXMART-PHOTO-01 | photo-01.jpg | Brand Story / Why AX 01 |
| NEXMART-PHOTO-02 | photo-02.jpg | Trust 섹션 / Why AX 운영문맥 |
| NEXMART-FLOW-01 | flow-01.jpg | Why AX Data Bridge / Presentation |
| product/<productId>.jpg | 예: product/p-001.jpg | 상품 카드·상세 |
| category/<slug>.jpg | 예: category/living.jpg | 카테고리 타일 |
