#!/usr/bin/env python3
"""
Script to extract game files from combined_game.html back to individual files.
"""

import re
import os

def extract_game_files(combined_file='combined_game.html'):
    """
    Extracts index.html, src/style.css, and src/main.js from combined HTML file.
    """
    
    # Read the combined file
    print(f"Reading {combined_file}...")
    with open(combined_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find markers
    index_marker = '<!-- ======= index.html ======= -->'
    css_marker = '<!-- ======= src/style.css ======= -->'
    js_marker = '<!-- ======= src/main.js ======= -->'
    
    index_start = content.find(index_marker) + len(index_marker)
    css_start = content.find(css_marker)
    js_start = content.find(js_marker)
    
    # Extract index.html - everything from index marker to CSS marker (HTML part)
    html_part = content[index_start:css_start].strip()
    
    # Find where </style> and </head> are in the content
    style_close = content.find('</style>')
    head_close = content.find('</head>')
    body_close = content.find('</body>')
    script_close = content.find('</script>')
    
    # Build proper HTML: head + style reference + body + script reference
    head_end = content.find('</head>', css_start)
    body_start = content.find('<body', css_start)
    body_start = content.find('>', body_start) + 1
    
    # Get the head content (up to </head>)
    head_content = content[css_start:head_close].strip()
    # Remove the inline style and add link tag instead
    style_open = '<style>'
    style_close = '</style>'
    head_content = head_content.replace(style_open, '').replace(style_close, '')
    head_content = head_content.replace(css_marker, '').strip()
    head_content = '<link rel="stylesheet" href="./src/style.css">\n' + head_content
    
    # Get body content
    body_content = content[body_start:body_close].strip()
    
    # Get script reference
    js_part = content[js_start:script_close].strip()
    js_part = js_part.replace(js_marker, '').replace('<script>', '').replace('</script>', '').strip()
    script_ref = '<script type="module" src="./src/main.js"></script>'
    
    # Assemble index.html
    index_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Neon Drive: Midnight City</title>
    {head_content}
</head>
<body>
    {body_content}
    {script_ref}
</body>
</html>"""
    
    # Write index.html
    print("Writing index.html...")
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(index_html)
    
    # Extract CSS
    style_open = content.find('<style>', css_start) + len('<style>')
    style_close = content.find('</style>')
    css_content = content[style_open:style_close].strip()
    
    # Write src/style.css
    print("Writing src/style.css...")
    if not os.path.exists('src'):
        os.makedirs('src')
    with open('src/style.css', 'w', encoding='utf-8') as f:
        f.write(css_content)
    
    # Extract JS
    script_open = content.find('<script>', js_start) + len('<script>')
    js_content = content[script_open:script_close].strip()
    
    # Write src/main.js
    print("Writing src/main.js...")
    with open('src/main.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print("Done! Extracted files:")
    print("  - index.html")
    print("  - src/style.css")
    print("  - src/main.js")

if __name__ == '__main__':
    extract_game_files()
