# Mermaid Diagram Rendering Guide

## Overview

이 문서는 Kubernetes 문서화 프로젝트에서 Mermaid 다이어그램 렌더링을 구현하고 개선한 내용을 기록합니다. 향후 유사한 프로젝트에서 참고하여 사용할 수 있습니다.

---

## Problem Statement

### 초기 문제점

1. **Markdown 의 Mermaid 코드 블록이 HTML 에서 렌더링되지 않음**
   - `marked` 라이브러리는 mermaid 코드 블록을 `<pre><code class="language-mermaid">`로 변환
   - Mermaid JS 는 `<div class="mermaid">` 태그만 인식
   - 결과: 다이어그램이 코드 블록으로만 표시됨

2. **동적 콘텐츠 로딩 시 Mermaid 미렌더링**
   - 페이지 로드 시에는 Mermaid 가 정상 작동
   - 탭 클릭으로 동적 로딩 시 렌더링 안 됨

3. **HTML 변환 시 `<br>` 태그 삽입 문제**
   - Markdown → HTML 변환 시 mermaid 코드 내부에도 `<br>` 태그가 삽입됨
   - Mermaid 문법이 깨져서 렌더링 실패

---

## Solution Architecture

### 1. Mermaid Script Loading (index.html)

```html
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
    
    // Mermaid 초기화
    mermaid.initialize({
        startOnLoad: false,  // 자동 로드 비활성화 (수동 제어)
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    });
    
    // 전역 객체에 노출 (app.js 에서 사용)
    window.mermaid = mermaid;
</script>
<script src="js/app.js"></script>
```

**Key Points:**
- ES Module 로 Mermaid 로드
- `startOnLoad: false`로 설정하여 수동 렌더링
- `window.mermaid` 에 할당하여 전역 접근 가능하게 함

### 2. Markdown Loading & Rendering (js/app.js)

```javascript
// Markdown 파일 로드 함수
async function loadMarkdown(filePath, elementId) {
    try {
        const response = await fetch(filePath);
        const markdown = await response.text();
        const html = marked.parse(markdown);
        const contentElement = document.getElementById(elementId);
        contentElement.innerHTML = html;

        // Mermaid 다이어그램 렌더링
        await renderMermaidDiagrams(contentElement);
    } catch (error) {
        // 에러 처리
    }
}

// Mermaid 다이어그램 렌더링 함수
async function renderMermaidDiagrams(container) {
    if (!window.mermaid) {
        console.warn('Mermaid not loaded');
        return;
    }

    // marked 는 mermaid 코드 블록을 <pre><code class="language-mermaid">로 변환
    const codeElements = container.querySelectorAll('pre code.language-mermaid');
    
    if (codeElements.length === 0) {
        console.log('No mermaid diagrams found');
        return;
    }

    console.log(`Found ${codeElements.length} mermaid diagram(s), converting...`);

    try {
        // 각 code 블록을 mermaid div 로 변환
        codeElements.forEach((codeEl) => {
            const mermaidCode = codeEl.textContent;
            const preEl = codeEl.parentElement;
            const mermaidDiv = document.createElement('div');
            mermaidDiv.className = 'mermaid';
            mermaidDiv.textContent = mermaidCode;
            preEl.parentNode.replaceChild(mermaidDiv, preEl);
        });

        // Mermaid 렌더링
        await mermaid.run({
            querySelector: '.mermaid'
        });

        console.log('Mermaid diagrams rendered successfully');
    } catch (error) {
        console.error('Mermaid rendering failed:', error);
        
        // 에러 발생 시 원본 코드 표시
        const mermaidElements = container.querySelectorAll('.mermaid');
        mermaidElements.forEach((el) => {
            if (!el.querySelector('svg')) {
                const originalCode = el.textContent.trim();
                el.innerHTML = `
                    <div class="error-box">
                        <strong>⚠️ Diagram rendering failed</strong>
                        <pre>${originalCode}</pre>
                        <small>Error: ${error.message}</small>
                    </div>
                `;
            }
        });
    }
}
```

**Key Points:**
1. `marked.parse()`로 Markdown 을 HTML 로 변환
2. `<pre><code class="language-mermaid">`를 찾아 `<div class="mermaid">`로 변환
3. `mermaid.run()`으로 렌더링
4. 에러 발생 시 원본 코드 표시 (디버깅 용이)

### 3. Static HTML Conversion (convert-to-html.js)

Markdown 파일을 HTML 로 직접 변환하는 스크립트:

```javascript
function markdownToHtml(markdown) {
    let html = markdown;

    // 1. Mermaid 코드 블록 추출 (가장 먼저)
    const mermaidBlocks = [];
    html = html.replace(/```mermaid\s*\n([\s\S]*?)```/g, (match, code) => {
        const index = mermaidBlocks.length;
        mermaidBlocks.push(code.trim());
        return `___MERMAID_BLOCK_${index}___`;
    });

    // 2. 일반 코드 블록 추출
    const codeBlocks = [];
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        const index = codeBlocks.length;
        codeBlocks.push({ lang: lang || '', code: code.trim() });
        return `___CODE_BLOCK_${index}___`;
    });

    // 3. HTML 이스케이프 및 Markdown 변환
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // ... headers, bold, italic, links 등 변환 ...

    // 4. 코드 블록 복원
    codeBlocks.forEach((block, index) => {
        const escapedCode = block.code
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
        // ... 코드 블록 HTML 로 변환 ...
    });

    // 5. 줄바꿈 처리
    html = html.replace(/\n(?!\s*<\/?(?:pre|code|div|h[1-6]|p|ul|ol|li|table|tr|td|th|blockquote))/gim, '<br>');

    // 6. Mermaid 블록 복원 (가장 마지막)
    mermaidBlocks.forEach((code, index) => {
        const decodedCode = code
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
        html = html.replace(`___MERMAID_BLOCK_${index}___`, `<div class="mermaid">${decodedCode}</div>`);
    });

    return html;
}
```

**Key Points:**
- Mermaid 블록을 **가장 먼저 추출**하고 **가장 마지막에 복원**
- 다른 Markdown 처리 (줄바꿈, 이스케이프 등) 의 영향을 받지 않음
- 원본 mermaid 코드 보존

---

## Implementation Checklist

### 필수 항목

- [ ] Mermaid JS 를 ES Module 로 로드
- [ ] `startOnLoad: false`로 설정
- [ ] `window.mermaid` 에 전역 객체 할당
- [ ] Markdown 파싱 후 Mermaid 코드 변환
- [ ] `mermaid.run()`으로 렌더링
- [ ] 에러 핸들링 구현

### 권장 항목

- [ ] 콘솔 로깅으로 디버깅 지원
- [ ] 에러 발생 시 원본 코드 표시
- [ ] Static HTML 변환 스크립트 분리
- [ ] 테스트 페이지 작성

---

## File Structure

```
project/
├── index.html              # 메인 HTML (Mermaid 스크립트 로드)
├── js/
│   └── app.js              # Markdown 로딩 및 Mermaid 렌더링
├── docs/
│   ├── *.md                # Markdown 소스 파일
│   └── *.html              # 변환된 HTML (선택사항)
├── convert-to-html.js      # Markdown → HTML 변환 스크립트
└── mermaid-test.html       # 테스트 페이지
```

---

## Usage Examples

### 1. Dynamic Loading (SPA 방식)

```html
<!-- index.html -->
<script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
    mermaid.initialize({ startOnLoad: false });
    window.mermaid = mermaid;
</script>
<script src="js/app.js"></script>
```

```javascript
// app.js
async function loadContent() {
    const md = await fetch('doc.md').then(r => r.text());
    const html = marked.parse(md);
    container.innerHTML = html;
    await renderMermaidDiagrams(container);
}
```

### 2. Static HTML Generation

```bash
# 모든 Markdown 파일을 HTML 로 변환
node convert-to-html.js
```

변환된 HTML 파일은 Mermaid JS 를 포함하며, 페이지 로드 시 자동으로 렌더링됩니다.

---

## Troubleshooting

### Issue 1: Diagrams not rendering

**Symptom:** Mermaid 코드가 그대로 표시됨

**Solution:**
```javascript
// 브라우저 콘솔에서 확인
typeof window.mermaid  // undefined 인지 확인
document.querySelectorAll('code.language-mermaid').length  // 0 인지 확인
```

### Issue 2: `<br>` tags in mermaid code

**Symptom:** 다이어그램 내부에 `<br>` 태그가 보임

**Solution:**
- `convert-to-html.js` 에서 Mermaid 블록을 가장 마지막에 복원하는지 확인
- 줄바꿈 처리 전에 Mermaid 블록이 보호되는지 확인

### Issue 3: Dynamic content not rendering

**Symptom:** 페이지 로드는 정상, 탭 클릭 시 렌더링 안 됨

**Solution:**
- `loadMarkdown()` 함수에서 `renderMermaidDiagrams()`를 호출하는지 확인
- Mermaid 가 전역 객체에 할당되었는지 확인

---

## Testing

### Test Page (mermaid-test.html)

```html
<!DOCTYPE html>
<html>
<head>
    <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
        mermaid.initialize({ startOnLoad: false });
        window.mermaid = mermaid;
        
        document.addEventListener('DOMContentLoaded', async () => {
            await mermaid.run({ querySelector: '.mermaid' });
        });
    </script>
</head>
<body>
    <div class="mermaid">
        graph TD
            A[Start] --> B[End]
    </div>
</body>
</html>
```

### Console Commands

```javascript
// Mermaid 버전 확인
mermaid.version()

// 수동 렌더링
mermaid.run({ querySelector: '.mermaid' })

// Mermaid 요소 확인
document.querySelectorAll('.mermaid').length
document.querySelectorAll('code.language-mermaid').length
```

---

## Configuration Options

### Mermaid Initialize

```javascript
mermaid.initialize({
    startOnLoad: false,      // 수동 렌더링
    theme: 'default',        // 'default', 'dark', 'forest', 'neutral'
    securityLevel: 'loose',  // 'strict', 'loose', 'sandbox'
    fontFamily: 'Arial',
    flowchart: {
        useMaxWidth: true,
        htmlLabels: true
    },
    sequence: {
        useMaxWidth: true,
        wrap: true
    }
});
```

### CDN URLs

```
# Latest v10
https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs

# Specific version
https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.esm.min.mjs

# UMD version (legacy)
https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js
```

---

## Performance Considerations

1. **Lazy Loading**: 탭 클릭 시 콘텐츠 로드 (초기 로딩 시간 단축)
2. **Selective Rendering`: 컨테이너 내의 Mermaid 만 렌더링 (전체 페이지 스캔 방지)
3. **Caching**: 브라우저 캐시 활용 (CDN)
4. **Bundle Size**: Mermaid JS 는 약 500KB (gzip)

---

## Browser Compatibility

- Chrome 61+
- Firefox 60+
- Safari 11+
- Edge 79+

ES Modules 를 지원하는 모든 브라우저에서 작동합니다.

---

## References

- [Mermaid Official Docs](https://mermaid.js.org/)
- [Marked.js](https://marked.js.org/)
- [jsDelivr CDN](https://www.jsdelivr.com/package/npm/mermaid)

---

## Version History

- **v1.0** (2024): Initial implementation
  - ES Module loading
  - Dynamic rendering
  - Error handling
  - Static HTML conversion

---

## License

This guide can be freely used and modified for any project.
