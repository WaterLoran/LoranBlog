import os


def find_first_markdown_file(directory):
    """找到目录中的第一个Markdown文件"""
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.md'):
                relative_path = os.path.relpath(os.path.join(root, file), directory)
                return relative_path.replace("\\", "/")[:-3]
    return None


def generate_nav_sidebar(base_path):
    nav = []
    sidebar = {}

    nav.append({
        "text": "首页",
        "link": "/",
    }, )

    for root, dirs, files in os.walk(base_path):
        # 排除 .vuepress 目录
        dirs[:] = [d for d in dirs if d != '.vuepress']

        if not files:
            continue

        relative_path = os.path.relpath(root, base_path)
        relative_path = relative_path.replace("\\", "/")  # 将反斜杠替换为正斜杠
        sections = relative_path.split("/")

        if len(sections) == 1:
            first_file = find_first_markdown_file(root)
            if first_file and sections[0] != '.':
                nav.append({
                    "text": sections[0],
                    "link": f"/{sections[0]}/{first_file}",
                    "items": []
                })
                sidebar[f'/{sections[0]}/'] = []
        else:
            # Handle nav creation
            section_path = '/'.join(sections[:-1])
            nav_item = next((item for item in nav if item['text'] == sections[0]), None)
            if nav_item is None:
                nav_item = {
                    "text": sections[0],
                    "items": []
                }
                nav.append(nav_item)

            first_file = find_first_markdown_file(root)
            if first_file and sections[-1] != '.':
                nav_item["items"].append({
                    "text": sections[-1],
                    "link": f'/{relative_path}/{first_file}'
                })

            # Handle sidebar creation
            sidebar_key = f'/{sections[0]}/'
            if sidebar_key not in sidebar:
                sidebar[sidebar_key] = []

            if sections[-1] != '.':
                sidebar[sidebar_key].append({
                    "title": sections[-1],
                    "path": f'/{relative_path}/{first_file}',
                    "collapsable": False,
                    "children": [
                        {"title": os.path.splitext(file)[0], "path": f'/{relative_path}/{file}'.replace("\\", "/")[:-3]} # 最后要去掉.md
                        for file in files if file.endswith('.md')
                    ]
                })

    # Fixed part of the sidebar
    fixed_sidebar = {
        "/": [
            {
                "title": "欢迎交流",
                "path": "/",
                "collapsable": False,
                "children": [{"title": "博客简介", "path": "/"}],
            },
        ]
    }

    # Merge fixed part at the end of the sidebar
    sidebar.update(fixed_sidebar)

    # 追加上优秀博客信息
    nav.append({
        "text": "优质博客",
        "items": [
            {"text": "美团技术团队", "link": "https://tech.meituan.com/"},
            {"text": "Java全栈知识体系", "link": "https://pdai.tech/"},
            {"text": "BY林子", "link": "https://www.bylinzi.com/"},
            {"text": "code2life", "link": "https://code2life.top/archives/"},
            {"text": "技术圆桌", "link": "https://v2think.com/what-is-leadership"},
        ]
    },)

    return nav, sidebar

def main():
    base_path = "docs"  # 设定你的文档目录路径
    nav, sidebar = generate_nav_sidebar(base_path)

    config_content = f"""
module.exports = {{
    title: '罗兰测试',
    description: '各类测试理论, 技能, 经验, 故事, 职业发展的博客文档',
    theme: 'reco',
    themeConfig: {{
        nav: {nav},
        sidebar: {sidebar},
    }},
    plugins: [
        '@vuepress/plugin-back-to-top', // 返回顶部插件
        '@vuepress/plugin-medium-zoom', // 图片放大插件
    ]
}}
"""
    config_content = config_content.replace("False", 'false').replace('False', 'false')

    current_directory = os.getcwd()
    with open(current_directory + "\docs\.vuepress\config.js", 'w', encoding='utf-8') as f:
        f.write(config_content)
    print("config.js has been generated.")


if __name__ == "__main__":
    main()