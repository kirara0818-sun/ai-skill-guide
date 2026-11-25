# 프로젝트 상태

- 마지막 갱신일은 **2026-11-25 (한국 시간)**이다.
- 작업 브랜치는 [`codex/skill-guide-v2-preview`](https://github.com/kirara0818-sun/ai-skill-guide/tree/codex/skill-guide-v2-preview)다. 인계 점검 시 마지막 앱 커밋은 [`7426132`](https://github.com/kirara0818-sun/ai-skill-guide/commit/7426132d1128fd3057f25cfba4a7d74b94e3aac9)로, 이메일 인증 화면 직접 진입을 추가했다. 문서 커밋을 포함한 최신 HEAD는 `git log -1`로 확인한다.
- 공개 브랜치 `main`의 점검 시 HEAD는 [`269be2b`](https://github.com/kirara0818-sun/ai-skill-guide/commit/269be2b38120429fe323838af79e1df38915d4a8)였다. 정적 HTML, CSS, JavaScript 및 JSON으로 구성되며 [GitHub Pages](https://kirara0818-sun.github.io/ai-skill-guide/)에 제공된다.
- 2.0은 Next.js 16 및 React 19 기반이다. Vercel의 `/`는 `public/index.html`을 사용한다. `preview/index.html`은 저장소에 남은 정적 시안이다. 인증은 Neon Auth, 작업실 API는 Neon PostgreSQL을 사용하도록 작성돼 있다. Neon에서 `ai-skill-guide` 프로젝트와 기본 `main` 브랜치가 준비 상태임을 확인했다. Preview의 DB 연결 대상과 회원 데이터 조회, Vercel Blob 연결은 미확인이다.

## Vercel 배포 상태

| 환경 | 상태 | 확인한 내용 |
| --- | --- | --- |
| [최신 Preview](https://ai-skill-guide-3joqnzssp-pado9.vercel.app/) | `READY`, 11월 25일 15:23 | PADO 팀 `ai-skill-guide` 프로젝트. 인증된 도구로 첫 화면 HTML 응답 200 확인. 배포 상세에 Git ref와 SHA가 없어 앱 커밋과의 직접 연결은 미확인. |
| [기존 Preview](https://ai-skill-guide-em8yuk0gc-pado9.vercel.app/) | `READY`, 11월 25일 14:30 | 첫 화면 HTML이 최신 Preview 응답과 동일했다. |
| 이전 Vercel 운영 배포 시도 | `CANCELED`, 11월 25일 14:28 | 배포 이력에서 확인했다. 이번 인계 작업은 배포 점검 범위다. |

Vercel 설정에서 `NEON_AUTH_BASE_URL`, `DATABASE_URL`, `NEON_AUTH_COOKIE_SECRET` 세 이름의 적용 대상이 모두 Preview임을 확인했다. 최신 Preview의 `/login?mode=verify`는 200을 반환했고, 앱에 로그인하지 않은 상태의 `GET /api/workspace`는 401을 반환했다. 이메일 수신, 인증 완료, 회원 세션에서의 DB 연결과 저장은 미검수다.

## 검수한 항목

- 공개 사이트를 브라우저에서 열어 8개 카테고리와 48개 카드를 확인했다. `?cat=video&only=1`은 영상 카드 13개를 표시했다.
- 공개 브랜치 원본 JSON과 2.0의 카테고리별 JSON을 대조했다. 기존 48개 카드와 명령어 114개가 유지됐다. 정적 2.0 시안과 Vercel 화면 소스에는 블로그 이미지, 인테리어 사진, FFmpeg 확인 카드가 추가돼 각각 총 51개다.
- 검색 사전 JSON에 이미지 프롬프트 100개가 10개 그룹에 10개씩 있다. pado-image와 OpenMontage 사전 항목, 기존 영상 카드의 HyperFrames 명령을 확인했다.
- 두 배포의 첫 화면 HTML에 프롬프트 작성 화면과 메뉴가 있다. 브라우저에서 최신 Preview에 직접 접속하면 Vercel 로그인 화면으로 이동했다. Preview에서 폼을 클릭하는 검수는 대기 중이다.

## 확인된 누락과 미검수

| 항목 | 상태 |
| --- | --- |
| 프롬프트 작성 예제 갤러리 | 개발 브랜치와 두 Preview 첫 화면 HTML에 갤러리, 필터, 예제 확대·불러오기와 분위기 입력이 없다. 최신 Preview에서 대표 이미지 요청도 404였다. |
| 갤러리 복원 자료 | 인계 작업 폴더의 `restore-examples`에 코드와 메타데이터가 있다. 독립 테스트에서 10개 필터와 40개 예제 확대 화면 생성·설정 불러오기를 확인했다. 해당 테스트는 이미지 표시, 실제 사전 연동, Preview 조작을 검증하지 않는다. 이 폴더와 저장소에 원본 이미지 40장을 찾지 못했다. |
| 원본 자료 | `AI-Skill-Guide-Web-Plan.md`, `AI-Skill-Guide-Design.html`, 이미지 프롬프트 100선 최초 원문, PDF 명령어 10개 원문은 미확보다. Notion 사용 설명서는 접근했고 이 원본들은 해당 페이지에서 확인하지 못했다. 디자인 비교에는 저장소의 정적 2.0 시안을 사용했다. |
| Google 및 이메일 인증 | 로그인, 가입, 인증 코드 입력·재발송, Google 요청 코드가 있다. `account_not_linked`는 인계된 오류로 재현 및 원인 확인 대기다. 콜백과 연결 정책, 실제 인증 메일 수신 및 완료는 미검수다. |
| 계정 분리 | 코드에서 이메일 인증 세션과 소유자 ID를 검사한다. 비로그인 401은 확인했다. 두 계정의 저장·조회·파일 접근, 로그아웃·재로그인 후의 데이터 유지는 미검수다. |
| 예제 게시 | 코드에 이미지·MP4·PDF 비공개 초안 저장 기능과 브라우저 내 게시 표시·취소 시안이 있다. 관리자 권한으로 공개 자료를 저장·배포하는 서버 경로는 현재 소스에 없으며 실제 업로드 동작은 미검수다. |
| 기존 기능 회귀 | Preview의 검색과 복사, 카드 상세, 예제 재생·열기, 카테고리·용도별 링크, 모바일 조작은 실제 브라우저 검수 대기다. |

다음 작업은 원본 예제 이미지 확보와 기존 복원 코드 검토다. 진행 순서와 검수 기준은 [TASKS.md](TASKS.md)를 따른다.
