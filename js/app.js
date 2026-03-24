// Markdown 파일 로드 함수
async function loadMarkdown(filePath, elementId) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const markdown = await response.text();
        const html = marked.parse(markdown);
        document.getElementById(elementId).innerHTML = html;
    } catch (error) {
        console.error('Error loading markdown:', error);
        document.getElementById(elementId).innerHTML = 
            `<p class="error">콘텐츠를 로드할 수 없습니다: ${filePath}</p>`;
    }
}

// 탭 전환 함수
function setupTabs(containerId, contentId, basePath) {
    const container = document.querySelector(`#${containerId} .resource-tabs`);
    if (!container) return;

    const buttons = container.querySelectorAll('.tab-btn');
    
    buttons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons in this container
            buttons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            // Load markdown file
            const mdFile = this.getAttribute('data-md');
            loadMarkdown(`${basePath}${mdFile}.md`, contentId);
        });
    });

    // Load first tab content by default
    const firstBtn = buttons[0];
    if (firstBtn) {
        const mdFile = firstBtn.getAttribute('data-md');
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
