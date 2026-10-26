# K8s 심화 과정 - 학습 관리 사이트

Kubernetes 심화 과정 학습 내용을 [Hugo](https://gohugo.io/) 로 관리하는 정적 사이트입니다.

## 실행

```bash
hugo server        # http://localhost:1313
hugo --minify      # public/ 에 정적 사이트 생성
```

## 디렉토리 구조

```
k8s-adv/
├── hugo.toml              # 사이트 설정
├── content/               # Markdown 콘텐츠 (섹션 = 메뉴)
│   ├── intro/             # 소개, 커리큘럼
│   ├── lab-env/           # 실습 환경 구성
│   ├── basics/            # 기초 이론
│   ├── security/          # 인증 및 보안 (01-foundation ~ 05-advanced)
│   ├── operator/
│   ├── labs/              # 실습 가이드
│   └── usecases/
├── themes/k8s-adv/        # 로컬 테마 (layouts, static/css, Mermaid 렌더 훅)
└── .github/workflows/hugo.yml   # GitHub Pages 배포
```

## 새 문서 추가

`content/<섹션>/` 아래에 파일을 만들고 front matter 를 작성합니다. 메뉴/사이드바는 자동 생성되며 `weight` 로 순서를 정합니다.

```markdown
---
title: "새 주제"
weight: 100
---

본문...
```

Mermaid 다이어그램은 ` ```mermaid ` 코드블록으로 작성하면 자동 렌더링됩니다.
