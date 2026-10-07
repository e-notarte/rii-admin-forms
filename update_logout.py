import os, re
folder = r'c:\Users\ENota\OneDrive\Desktop\Admin Request Mgt\admin-forms'
for f in os.listdir(folder):
    if not f.endswith('.html'): continue
    path = os.path.join(folder, f)
    with open(path, 'r', encoding='utf-8') as file:
        content = file.read()

    # Admin dashboard header-right
    content = re.sub(
        r'(<button class="icon-btn"><i class="fa-regular fa-bell"></i></button>)\s*<div class="user-profile">',
        r'\1\n            <button class="icon-btn" onclick="sessionStorage.clear(); window.location.href=\'index.html\'" title="Log out"><i class="fa-solid fa-right-from-bracket"></i></button>\n            <div class="user-profile">',
        content
    )

    # Request forms header-right
    content = re.sub(
        r'(<button class="icon-btn" type="button"\s*title="Notifications"><i class="fa-regular fa-bell"></i></button>)\s*<div class="user-badge">',
        r'\1\n        <button class="icon-btn" type="button" title="Log out" onclick="sessionStorage.clear(); window.location.href=\'index.html\'"><i class="fa-solid fa-right-from-bracket"></i></button>\n      <div class="user-badge">',
        content
    )

    # Mobile account menu
    content = re.sub(
        r'(<button type="button" title="Notifications"><i class="fa-regular fa-bell"></i> Notifications</button>)</div>',
        r'\1<button type="button" title="Log out" onclick="sessionStorage.clear(); window.location.href=\'index.html\'"><i class="fa-solid fa-right-from-bracket"></i> Log out</button></div>',
        content
    )

    with open(path, 'w', encoding='utf-8') as file:
        file.write(content)
