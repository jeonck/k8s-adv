# K8s 심화 과정 - 학습 관리 사이트

Kubernetes 심화 과정 학습 내용을 관리하는 사이트입니다.

## 📢 Mermaid 다이어그램 보기

**Markdown 파일의 Mermaid 다이어그램을 렌더링된 상태로 보려면 HTML 파일을 사용하세요.**

### HTML 파일 열기 (권장)

```bash
# 메인 인덱스 페이지 열기
open index-docs.html

# 또는 특정 문서 열기
open docs/13-crypto-basic-keys.html
```

브라우저에서 Mermaid 다이어그램이 렌더링된 상태로 볼 수 있습니다.

### 모든 문서 변환하기

```bash
# Node.js 로 HTML 변환
node convert-to-html.js
```

### GitHub 에서 보기

이 저장소를 GitHub 에 푸시하면 GitHub 에서 자동으로 Mermaid 다이어그램을 렌더링합니다.

---

## 디렉토리 구조

```
k8s-adv/
├── index.html              # 메인 HTML 파일
├── index-docs.html         # Mermaid 렌더링 인덱스 (새로 추가!)
├── convert-to-html.js      # Markdown → HTML 변환기 (새로 추가!)
├── mermaid-test.md         # Mermaid 테스트 파일
├── css/
│   └── style.css           # 스타일시트
├── js/
│   └── app.js              # JavaScript (Markdown 로드, 탭 기능)
├── docs/                   # Markdown 콘텐츠 파일들
│   ├── 01-kubectl.md
│   ├── 01-kubectl.html     # 렌더링된 HTML (새로 추가!)
│   ├── 02-k8s-resources.md
│   ├── 02-k8s-resources.html
│   ├── ... (52 개 문서)
│   └── 45-prometheus-grafana-operator-install.html
└── README.md
```

## 사용 방법

### 브라우저에서 열기

```bash
# macOS
open index.html

# Linux
xdg-open index.html

# 또는 직접 브라우저에서 파일 열기
```

### 로컬 서버 실행 (권장)

Markdown 파일을 로드하려면 로컬 서버가 필요합니다.

```bash
# Python 3
python -m http.server 8000

# Node.js (npx)
npx serve .

# 그 후 브라우저에서 접속
http://localhost:8000
```

## 콘텐츠 관리

### 새 콘텐츠 추가

1. `docs/` 디렉토리에 새 Markdown 파일 생성
2. 파일명 형식: `XX-주제.md` (XX 는 숫자)
3. HTML 의 해당 섹션에 탭 버튼 추가

### 예시

```html
<!-- resources 섹션에 새 탭 추가 -->
<button class="tab-btn" data-md="08-new-topic">새 주제</button>
```

```markdown
<!-- docs/08-new-topic.md -->
# 새 주제

콘텐츠 내용...
```

## 메뉴 구성

| 메뉴 | 내용 |
|------|------|
| 홈 | 환영 페이지 |
| 커리큘럼 | 학습 커리큘럼 (예정) |
| 실습 환경 | AWS 환경 구성 가이드 |
| 학습 자료 | kubectl, 리소스, 컴포넌트, Add-on, CSI, Helm |
| 실습 | Add-on 설치 실습 |
| Q&A | 질문과 답변 (예정) |

## 기술 스택

- **HTML5** - 구조
- **CSS3** - 스타일링
- **JavaScript** - 동적 기능
- [Marked.js](https://marked.js.org/) - Markdown 파서 (CDN)
- [GitHub Markdown CSS](https://github.com/sindresorhus/github-markdown-css) - Markdown 스타일 (CDN)

## 라이선스

© 2026 K8s 심화 과정
