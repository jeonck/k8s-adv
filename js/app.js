// Mermaid 초기화 설정
mermaid.initialize({ startOnLoad: false, theme: 'default' });

// Markdown 파일 로드 함수
async function loadMarkdown(filePath, elementId) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`파일을 찾을 수 없거나 로드할 수 없습니다. (HTTP ${response.status}: ${response.statusText})`);
        }
        const markdown = await response.text();
        const html = marked.parse(markdown);
        const contentElement = document.getElementById(elementId);
        contentElement.innerHTML = html;
        
        // Mermaid 다이어그램 렌더링
        if (window.mermaid) {
            try {
                await mermaid.run({
                    querySelector: '.mermaid'
                });
            } catch (mermaidError) {
                console.error('Mermaid rendering failed:', mermaidError);
            }
        }
        
    } catch (error) {
        console.error('Error loading markdown:', error);
        document.getElementById(elementId).innerHTML = 
            `<div class="error-box">
                <h3>콘텐츠 로드 실패</h3>
                <p>경로: ${filePath}</p>
                <p>에러: ${error.message}</p>
                <button onclick="location.reload()">새로고침</button>
            </div>`;
    }
}

// 탭 전환 함수
function setupTabs(containerId, contentId, basePath) {
    const section = document.getElementById(containerId);
    if (!section) return;

    const buttons = section.querySelectorAll('.tab-btn');
    
    buttons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons in this section
            buttons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            // Load markdown file
            const mdFile = this.getAttribute('data-md');
            loadMarkdown(`${basePath}${mdFile}.md`, contentId);
        });
    });

    // Load first tab content by default if no active tab exists
    const activeBtn = section.querySelector('.tab-btn.active') || buttons[0];
    if (activeBtn) {
        const mdFile = activeBtn.getAttribute('data-md');
        loadMarkdown(`${basePath}${mdFile}.md`, contentId);
    }
}

// 네비게이션 처리
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            // Remove active class from all links and sections
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            // Add active class to clicked link
            this.classList.add('active');

            // Show corresponding section
            const targetId = this.getAttribute('href').substring(1);
            document.getElementById(targetId).classList.add('active');
        });
    });

    // 탭 기능 초기화 (새로운 섹션 구조)
    setupTabs('environment', 'environment-content', 'docs/');
    setupTabs('basics', 'basics-content', 'docs/');
    setupTabs('security', 'security-content', 'docs/');
    setupTabs('operator', 'operator-content', 'docs/');
    setupTabs('labs', 'labs-content', 'docs/');
});
