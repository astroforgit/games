#!/usr/bin/env python3
"""
Script to combine game files (HTML, CSS, JS) into a single file.
Each file is prefixed with a comment indicating its original filename.
"""

import os
import re

def combine_game_files(output_file='combined_game.html'):
    """
    Combines index.html, src/style.css, and src/main.js into a single HTML file.
    """
    
    # Read index.html
    print("Reading index.html...")
    with open('index.html', 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # Read CSS
    print("Reading src/style.css...")
    with open('src/style.css', 'r', encoding='utf-8') as f:
        css_content = f.read()
    
    # Read JS
    print("Reading src/main.js...")
    with open('src/main.js', 'r', encoding='utf-8') as f:
        js_content = f.read()
    
    # Replace the CSS link tag with inline styles
    css_pattern = r'<link rel="stylesheet" href="./src/style.css">'
    html_content = re.sub(css_pattern, 
        f'<!-- ======= src/style.css ======= -->\n<style>\n{css_content}\n</style>', 
        html_content)
    
    # Replace the JS script tag with inline script
    js_pattern = r'<script type="module" src="./src/main.js"></script>'
    html_content = re.sub(js_pattern,
        f'<!-- ======= src/main.js ======= -->\n<script>\n{js_content}\n</script>',
        html_content)
    
    # Add comment at the top for index.html
    final_content = f"<!-- ======= index.html ======= -->\n{html_content}"
    
    # Write the combined output
    print(f"Writing combined file to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(final_content)
    
    line_count = final_content.count('\n') + 1
    print(f"Done! Combined file created: {output_file}")
    print(f"Total lines: {line_count}")

if __name__ == '__main__':
    combine_game_files()
