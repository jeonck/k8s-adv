# Mermaid Rendering Improvements

## Summary

Fixed Mermaid diagram rendering issues in markdown files by improving the conversion process and adding better error handling.

## Changes Made

### 1. `convert-to-html.js` - Fixed Markdown to HTML Conversion

**Problem:** Mermaid code blocks were being processed with HTML escaping and line break insertion, which broke the mermaid syntax.

**Solution:**
- Extract mermaid blocks FIRST before any HTML processing
- Process all other markdown elements (headers, code blocks, line breaks, etc.)
- Restore mermaid blocks LAST with original syntax preserved
- Properly decode HTML entities in mermaid code

**Key changes:**
```javascript
// 1. Extract mermaid blocks first
const mermaidBlocks = [];
html = html.replace(/```mermaid\s*\n([\s\S]*?)```/g, (match, code) => {
    mermaidBlocks.push(code.trim());
    return `___MERMAID_BLOCK_${index}___`;
});

// 2. Process all other markdown...

// 3. Restore mermaid blocks AFTER all other processing
mermaidBlocks.forEach((code, index) => {
    const decodedCode = code.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    html = html.replace(`___MERMAID_BLOCK_${index}___`, `<div class="mermaid">${decodedCode}</div>`);
});
```

### 2. `js/app.js` - Improved Dynamic Content Mermaid Rendering

**Problem:** When loading markdown files dynamically, mermaid diagrams weren't being rendered reliably.

**Solution:**
- Created dedicated `renderMermaidDiagrams()` function
- Added proper error handling with user-friendly error messages
- Render only the newly loaded content (not entire page)
- Show original mermaid code if rendering fails (for debugging)

**Key features:**
```javascript
async function renderMermaidDiagrams(container) {
    // Only render diagrams in the specified container
    const mermaidElements = container.querySelectorAll('.mermaid');
    
    try {
        await mermaid.run({
            querySelector: '.mermaid',
            nodes: Array.from(mermaidElements)
        });
    } catch (error) {
        // Show error with original code for debugging
        mermaidElements.forEach((el) => {
            if (!el.querySelector('svg')) {
                el.innerHTML = `
                    <div class="error-box">
                        <strong>⚠️ Diagram rendering failed</strong>
                        <pre>${el.textContent}</pre>
                        <small>Error: ${error.message}</small>
                    </div>
                `;
            }
        });
    }
}
```

### 3. `index.html` - Updated Mermaid Script Loading

**Problem:** Mermaid script was loaded as a regular script instead of ES module.

**Solution:**
```html
<script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
    window.mermaid = mermaid;
</script>
<script src="js/app.js"></script>
```

### 4. `mermaid-test.html` - Enhanced Test Page

Created a comprehensive test page with:
- Multiple diagram types (flowchart, sequence, class, etc.)
- Status indicator showing render success/failure
- Troubleshooting guide
- Console logging for debugging

## How to Use

### Regenerate All HTML Files
```bash
node convert-to-html.js
```

### View Individual Documents
Open any `docs/*.html` file in your browser. Mermaid diagrams will be automatically rendered.

### View Main Application
Open `index.html` in your browser. Navigate through sections and tabs - mermaid diagrams will render as you load content.

### Test Mermaid Rendering
Open `mermaid-test.html` to verify mermaid is working correctly.

## Testing

To verify the fixes:

1. **Check converted HTML files:**
   ```bash
   node test-mermaid-conversion.js
   ```

2. **Open in browser:**
   - `mermaid-test.html` - Should show 5 rendered diagrams
   - `docs/16-csr-and-workflow.html` - Should show CSR sequence diagram
   - Any other doc with mermaid diagrams

3. **Check browser console:**
   - Should see "Mermaid diagrams rendered successfully"
   - No errors related to mermaid

## Browser Console Commands

To debug mermaid issues:
```javascript
// Check if mermaid is loaded
typeof mermaid

// Check mermaid version
mermaid.version()

// Manually trigger render
mermaid.run({ querySelector: '.mermaid' })

// Count mermaid elements
document.querySelectorAll('.mermaid').length
```

## Files Modified

- `convert-to-html.js` - Markdown to HTML conversion logic
- `js/app.js` - Dynamic content loading and mermaid rendering
- `index.html` - Mermaid script loading
- `mermaid-test.html` - Test page (completely rewritten)
- `test-mermaid-conversion.js` - Test script (new)

## Regenerated Files

All 52 HTML files in `docs/` folder have been regenerated with the improved conversion logic.

## Common Issues & Solutions

### Issue: Diagrams not rendering
**Solution:** Hard refresh the browser (Cmd+Shift+R on Mac, Ctrl+F5 on Windows)

### Issue: Seeing mermaid code instead of diagram
**Solution:** Check browser console for errors. The error message will show why rendering failed.

### Issue: Diagrams show with `<br>` tags in code
**Solution:** Re-run `node convert-to-html.js` to regenerate HTML files

## Technical Details

### Mermaid Version
Using Mermaid v10 from jsDelivr CDN:
```
https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs
```

### Configuration
```javascript
mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
});
```

### Rendering Approach
- Static HTML files: `mermaid.run()` on DOMContentLoaded
- Dynamic content: `mermaid.run()` after content is loaded

## Next Steps

If you encounter any issues:
1. Check browser console for error messages
2. Verify CDN accessibility
3. Clear browser cache
4. Re-run the conversion script
5. Test with `mermaid-test.html` first
