#!/usr/bin/env node

/**
 * Simple test to verify Mermaid diagram conversion
 */

const fs = require('fs');
const path = require('path');

// Read the test markdown file
const testMd = path.join(__dirname, 'mermaid-test.md');
const content = fs.readFileSync(testMd, 'utf8');

console.log('📄 Original Markdown:\n');
console.log(content);
console.log('\n---\n');

// Simple markdown to HTML converter with mermaid support
function markdownToHtml(markdown) {
    let html = markdown;

    // Extract and protect mermaid code blocks
    const mermaidBlocks = [];
    html = html.replace(/```mermaid\s*\n([\s\S]*?)```/g, (match, code) => {
        const index = mermaidBlocks.length;
        mermaidBlocks.push(code.trim());
        return `___MERMAID_BLOCK_${index}___`;
    });

    // Extract all other code blocks
    const codeBlocks = [];
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        const index = codeBlocks.length;
        codeBlocks.push({ lang: lang || '', code: code.trim() });
        return `___CODE_BLOCK_${index}___`;
    });

    // Escape HTML
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

    // Inline code
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

    // Paragraphs
    html = html.replace(/^(?!<[a-z]|<br|<hr|<ul|<ol|<li|<div|<pre|<code|<h[1-6]|<table|<tr|<td|<th|<blockquote)(.*$)/gim, '<p>$1</p>');

    // Clean up multiple br tags
    html = html.replace(/(<br>){3,}/g, '<br><br>');

    // Restore code blocks
    codeBlocks.forEach((block, index) => {
        const escapedCode = block.code
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
        if (block.lang) {
            html = html.replace(`___CODE_BLOCK_${index}___`, `<pre><code class="language-${block.lang}">${escapedCode}</code></pre>`);
        } else {
            html = html.replace(`___CODE_BLOCK_${index}___`, `<pre><code>${escapedCode}</code></pre>`);
        }
    });

    // Line breaks
    html = html.replace(/\n(?!\s*<\/?(?:pre|code|div|h[1-6]|p|ul|ol|li|table|tr|td|th|blockquote))/gim, '<br>');

    // Restore mermaid blocks (AFTER all other processing)
    mermaidBlocks.forEach((code, index) => {
        const decodedCode = code
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
        html = html.replace(`___MERMAID_BLOCK_${index}___`, `<div class="mermaid">${decodedCode}</div>`);
    });

    return html;
}

const html = markdownToHtml(content);

console.log('📝 Converted HTML:\n');
console.log(html);
console.log('\n---\n');

// Check if mermaid block is preserved correctly
if (html.includes('<div class="mermaid">')) {
    console.log('✅ Mermaid block found in HTML');
    
    // Check for br tags inside mermaid
    const mermaidMatch = html.match(/<div class="mermaid">([\s\S]*?)<\/div>/);
    if (mermaidMatch) {
        const mermaidContent = mermaidMatch[1];
        if (mermaidContent.includes('<br>')) {
            console.log('❌ ERROR: Found <br> tags inside mermaid block!');
            console.log('Mermaid content:', mermaidContent);
        } else {
            console.log('✅ No <br> tags inside mermaid block');
            console.log('Mermaid content:', mermaidContent);
        }
    }
} else {
    console.log('❌ Mermaid block NOT found in HTML');
}
