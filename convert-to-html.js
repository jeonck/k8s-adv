#!/usr/bin/env node

/**
 * Markdown to HTML Converter with Mermaid Support
 * Converts all .md files in docs/ folder to HTML with rendered Mermaid diagrams
 */

const fs = require('fs');
const path = require('path');

// Cache buster - change this to force browser refresh
const CACHE_BUSTER = 'v=' + Date.now();

// Simple markdown to HTML converter with improved mermaid support
function markdownToHtml(markdown) {
    let html = markdown;

    // First, extract and protect mermaid code blocks (handle both ```mermaid and ``` mermaid)
    const mermaidBlocks = [];
    html = html.replace(/```mermaid\s*\n([\s\S]*?)```/g, (match, code) => {
        const index = mermaidBlocks.length;
        mermaidBlocks.push(code.trim());
        return `___MERMAID_BLOCK_${index}___`;
    });

    // Extract all other code blocks and protect them from further processing
    const codeBlocks = [];
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        const index = codeBlocks.length;
        codeBlocks.push({ lang: lang || '', code: code.trim() });
        return `___CODE_BLOCK_${index}___`;
    });

    // Escape HTML in regular text (but not in protected blocks)
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Headers
    html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
    html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

    // Inline code (but not inside pre tags)
    html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>');

    // Images
    html = html.replace(/!\[([^\]]+)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1">');

    // Unordered lists
    html = html.replace(/^\s*[-*+]\s+(.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/gim, '<ul>$&</ul>');

    // Ordered lists
    html = html.replace(/^\s*\d+\.\s+(.*$)/gim, '<li>$1</li>');

    // Horizontal rule
    html = html.replace(/^---$/gim, '<hr>');

    // Paragraphs (simple approach - only for lines that don't start with HTML tags)
    html = html.replace(/^(?!<[a-z]|<br|<hr|<ul|<ol|<li|<div|<pre|<code|<h[1-6]|<table|<tr|<td|<th|<blockquote)(.*$)/gim, '<p>$1</p>');

    // Clean up multiple br tags
    html = html.replace(/(<br>){3,}/g, '<br><br>');

    // Restore code blocks with proper formatting (BEFORE line breaks processing)
    codeBlocks.forEach((block, index) => {
        const escapedCode = block.code
            .replace(/&amp;/g, '&')  // Restore & from HTML escaping
            .replace(/&lt;/g, '<')   // Restore < from HTML escaping
            .replace(/&gt;/g, '>');  // Restore > from HTML escaping
        if (block.lang) {
            html = html.replace(`___CODE_BLOCK_${index}___`, `<pre><code class="language-${block.lang}">${escapedCode}</code></pre>`);
        } else {
            html = html.replace(`___CODE_BLOCK_${index}___`, `<pre><code>${escapedCode}</code></pre>`);
        }
    });

    // Line breaks (only for standalone lines, not inside pre/code/div)
    html = html.replace(/\n(?!\s*<\/?(?:pre|code|div|h[1-6]|p|ul|ol|li|table|tr|td|th|blockquote))/gim, '<br>');

    // Restore mermaid blocks with proper formatting (AFTER all other processing)
    mermaidBlocks.forEach((code, index) => {
        // Decode any HTML entities that might have been escaped
        const decodedCode = code
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
        html = html.replace(`___MERMAID_BLOCK_${index}___`, `<div class="mermaid">${decodedCode}</div>`);
    });

    return html;
}

function generateHTML(content, title) {
    return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs?${CACHE_BUSTER}';
        
        // Initialize mermaid with improved configuration
        mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        });
        
        // Render mermaid diagrams when DOM is ready
        document.addEventListener('DOMContentLoaded', async () => {
            try {
                console.log('DOM ready, rendering Mermaid diagrams...');
                await mermaid.run({
                    querySelector: '.mermaid',
                    suppressErrors: false
                });
                console.log('Mermaid diagrams rendered successfully');
            } catch (error) {
                console.error('Mermaid rendering failed:', error);
                // Show error message for debugging
                document.querySelectorAll('.mermaid').forEach((el, i) => {
                    if (!el.querySelector('svg')) {
                        el.innerHTML = '<div style="color:red;padding:20px;">⚠️ Diagram rendering failed: ' + error.message + '</div><pre>' + el.textContent + '</pre>';
                    }
                });
            }
        });
    <\/script>
    <style>
        * {
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #fff;
        }
        h1, h2, h3, h4, h5, h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
        }
        h1 { font-size: 2em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
        h2 { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
        h3 { font-size: 1.25em; }
        h4 { font-size: 1em; }
        a { color: #0366d6; text-decoration: none; }
        a:hover { text-decoration: underline; }
        code {
            background-color: #f6f8fa;
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
            font-size: 85%;
        }
        pre {
            background-color: #f6f8fa;
            padding: 16px;
            border-radius: 6px;
            overflow: auto;
        }
        pre code {
            background: none;
            padding: 0;
            font-size: 100%;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
        }
        th, td {
            border: 1px solid #dfe2e5;
            padding: 8px 12px;
            text-align: left;
        }
        th {
            background-color: #f6f8fa;
            font-weight: 600;
        }
        tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        blockquote {
            border-left: 4px solid #dfe2e5;
            padding-left: 16px;
            margin-left: 0;
            color: #6a737d;
        }
        hr {
            border: 0;
            border-top: 1px solid #eaecef;
            margin: 24px 0;
        }
        ul, ol {
            padding-left: 2em;
        }
        .mermaid {
            background: #fff;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            text-align: center;
            display: flex;
            justify-content: center;
        }
        .mermaid svg {
            max-width: 100%;
            height: auto;
        }
        .navigation {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f6f8fa;
            padding: 10px 15px;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            z-index: 1000;
            max-height: 80vh;
            overflow-y: auto;
        }
        .navigation a {
            display: block;
            margin: 5px 0;
            color: #0366d6;
        }
        .file-info {
            background: #f6f8fa;
            padding: 10px 15px;
            border-radius: 6px;
            margin-bottom: 20px;
            font-size: 0.9em;
            color: #586069;
        }
    </style>
</head>
<body>
    <div class="navigation">
        <strong>📁 Docs</strong>
        ${generateNavigation()}
    </div>
    
    <div class="file-info">
        📄 Source: <code>${title}</code> | 
        <a href="${title}">View Markdown</a>
    </div>
    
    ${content}
</body>
</html>`;
}

function generateNavigation() {
    const docsDir = path.join(__dirname, 'docs');
    const files = fs.readdirSync(docsDir)
        .filter(f => f.endsWith('.md'))
        .sort();
    
    return files.map(file => 
        `<a href="${file.replace('.md', '.html')}">${file.replace('.md', '')}</a>`
    ).join('\n        ');
}

function convertFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    const title = fileName.replace('.md', '');
    
    const htmlContent = markdownToHtml(content);
    const html = generateHTML(htmlContent, fileName);
    
    const outputPath = filePath.replace('.md', '.html');
    fs.writeFileSync(outputPath, html, 'utf8');
    
    console.log(`✓ Converted: ${fileName} → ${title}.html`);
}

function main() {
    const docsDir = path.join(__dirname, 'docs');
    
    console.log('🔄 Converting Markdown files to HTML with Mermaid support...\n');
    
    const files = fs.readdirSync(docsDir)
        .filter(f => f.endsWith('.md'));
    
    console.log(`Found ${files.length} markdown files\n`);
    
    files.forEach(file => {
        const filePath = path.join(docsDir, file);
        convertFile(filePath);
    });
    
    console.log('\n✅ Conversion complete!');
    console.log('\n📂 Output directory: docs/');
    console.log('🌐 Open any .html file in your browser to view with Mermaid diagrams\n');
    console.log('💡 Tip: Press Cmd+Shift+R (Mac) or Ctrl+F5 (Windows) to hard refresh and clear cache\n');
}

main();
