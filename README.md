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
├── themes/hextra/            # Hextra 테마 (git submodule)
└── .github/workflows/hugo.yml   # GitHub Pages 배포
```

## 다국어 (Languages)

| 언어 | 경로 | 파일 규칙 |
|------|------|-----------|
| 한국어 (기본) | `/` | `foo.md` |
| English | `/en/` | `foo.en.md` |

- 번역 문서는 원본과 같은 폴더에 `.en.md` 로 둡니다. (`_index.md` → `_index.en.md`)
- front matter 의 `weight`, `slug` 는 원본과 동일하게 유지하고 `title` 만 번역합니다. 같은 경로의 두 파일이 자동으로 번역본으로 연결되어 상단 언어 전환 버튼으로 이동할 수 있습니다.
- 메뉴 이름은 `hugo.toml` 의 `[languages.ko]` / `[languages.en]` 아래 `menus.main` 에서 관리합니다.
- 새 문서를 추가할 때는 `.md` 와 `.en.md` 를 함께 작성하세요. `.en.md` 가 없으면 영어 사이트에는 해당 문서가 표시되지 않습니다.

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

## 테마

[Hextra](https://github.com/imfing/hextra) 테마를 git submodule 로 사용합니다. 처음 clone 할 때:

```bash
git clone --recurse-submodules <repo>
# 이미 clone 했다면
git submodule update --init --recursive
```
