module.exports = {
    title: '罗兰测试',
    description: '各类测试理论, 技能, 经验, 故事, 职业发展的博客文档',
    theme: 'reco',
    themeConfig: {
        nav: [
            { 
                text: "首页", 
                link: "/",
            },
            {
                text: '功能测试',
                items:[
                    {text:'测试理论', link: '/functional_testing/theory/基于风险和质量的测试策略'},
                ]
            },
            {
                text: '自动化测试',
                items:[
                    // 仅用于编写一些常用的或者目录级别的跳转, 或者关键节点的跳转
                    {text:'自动化测试经验', link: '/autotest/总览'},
                    {text:'工具库', link: '/autotest/tools/Pytest常用摘要'},
                    {text:'App测试', link: '/autotest/App测试/App自动化测试'}   
                ]
            },
            {
                text: '性能测试',
                items:[
                    {text:'性能测试理论', link: "/performance/theory/各类性能测试的概念与区别"},
                    {text:'Litemall性能测试实战', link: '/performance/Litemall性能测试实战/Litemall性能测试实战_00前言'},
                ]
            },
            {
                text: '测试开发',
                items:[
                    {text:'Mysql', link: '/test_development/mysql/Mysql常用操作'},
                    {text:'测试平台', link: '/test_development/platform/简易测试平台Demo'},
                ]
            },            
            {
                text: '兼容测试',
                items:[
                    {text:'数据库兼容性测试', link: '/compatibility_test/数据库兼容性测试'}
                ]
            },
            {
                text: "优质博客",
                items: [
                    { text: "美团技术团队", link: "https://tech.meituan.com/" },
                    { text: "Java全栈知识体系", link: "https://pdai.tech/" },
                    { text: "BY林子", link: "https://www.bylinzi.com/" },
                    { text: "code2life", link: "https://code2life.top/archives/" },
                    { text: "技术圆桌", link: "https://v2think.com/what-is-leadership" },
                ]
            },
        ],
        sidebar: {//左侧列表
            '/functional_testing/': [
                {
                    title: "测试理论",
                    path: "/functional_testing/theory/基于风险和质量的测试策略", 
                    collapsable: false,
                    children: [
                        { title: "基于风险和质量的测试策略", path: "/functional_testing/theory/基于风险和质量的测试策略" },
                    ]
                }
            ],  
            '/autotest/': [
                {
                    title: "自动化测试经验",
                    path: "/autotest/总览", //  这个路径是 title为"自动化测试经验" 博客 文本路径
                    collapsable: false,
                    children: [
                        { title: "小公司做自动化的困境", path: "/autotest/小公司做自动化的困境" },
                    ]
                },
                {
                    title: "工具库",
                    path: "/autotest/tools/Pytest常用摘要", //  这个路径是 title为"自动化测试经验" 博客 文本路径
                    collapsable: false,
                    children: [
                        { title: "Pytest常用摘要", path: "/autotest/tools/Pytest常用摘要" },
                        { title: "Allure使用指南", path: "/autotest/tools/Allure使用指南" },
                    ]
                },
                {
                    title: "App测试",
                    path: "/autotest/App测试/App自动化测试", //  这个路径是 title为"自动化测试经验" 博客 文本路径
                    collapsable: false,
                    children: [
                        { title: "App启动性能分析", path: "/autotest/App测试/App启动性能分析" },
                        { title: "App弱网测试", path: "/autotest/App测试/App弱网测试" },
                        { title: "App自动化测试", path: "/autotest/App测试/App自动化测试" },
                    ]
                }
                // 这里可以新建, 将会和自动化测试属于同级
            ],
            '/performance/': [
                {
                    title: "性能测试理论",
                    path: "/performance/theory/各类性能测试的概念与区别", 
                    collapsable: false,
                    children: [
                        { title: "各类性能测试的概念与区别", path: "/performance/theory/各类性能测试的概念与区别" },
                        { title: "性能分析调优", path: "/performance/theory/性能分析调优" },
                    ]
                },
                {
                    title: "Litemall性能测试实战",
                    path: "/performance/Litemall性能测试实战/Litemall性能测试实战_00前言", //  这个路径是 title为"自动化测试经验" 博客 文本路径
                    collapsable: false,
                    children: [
                        { title: "Litemall性能测试实战_00前言", path: "/performance/Litemall性能测试实战/Litemall性能测试实战_00前言" },
                        { title: "Litemall性能测试实战_01搭建环境", path: "/performance/Litemall性能测试实战/Litemall性能测试实战_01搭建环境" },
                        { title: "Litemall性能测试实战_02需求分析", path: "/performance/Litemall性能测试实战/Litemall性能测试实战_02需求分析" },
                        { title: "Litemall性能测试实战_03测试模型", path: "/performance/Litemall性能测试实战/Litemall性能测试实战_03测试模型" },
                        { title: "Litemall性能测试实战_04测试计划", path: "/performance/Litemall性能测试实战/Litemall性能测试实战_04测试计划" },
                        { title: "Litemall性能测试实战_05搭建监控", path: "/performance/Litemall性能测试实战/Litemall性能测试实战_05搭建监控" },
                        { title: "Litemall性能测试实战_06开发脚本", path: "/performance/Litemall性能测试实战/Litemall性能测试实战_06开发脚本" },
                        { title: "Litemall性能测试实战_07准备数据", path: "/performance/Litemall性能测试实战/Litemall性能测试实战_07准备数据" },
                        { title: "Litemall性能测试实战_08场景设计", path: "/performance/Litemall性能测试实战/Litemall性能测试实战_08场景设计" },
                        { title: "Litemall性能测试实战_09测试执行", path: "/performance/Litemall性能测试实战/Litemall性能测试实战_09测试执行" },
                        { title: "Litemall性能测试实战_10结果分析", path: "/performance/Litemall性能测试实战/Litemall性能测试实战_10结果分析" },
                        { title: "Litemall性能测试实战_11测试报告", path: "/performance/Litemall性能测试实战/Litemall性能测试实战_11测试报告" },
                    ]
                }
                
            ],
            '/test_development/': [
                {
                    title: "Mysql",
                    path: "/test_development/mysql/Mysql常用操作", //  这个路径是 title为"自动化测试经验" 博客 文本路径
                    collapsable: false,
                    children: [
                        { title: "Mysql常用操作", path: "/test_development/mysql/Mysql常用操作" },
                    ]
                },
                {
                    title: "测试平台",
                    path: "/test_development/platform/简易测试平台Demo", //  这个路径是 title为"自动化测试经验" 博客 文本路径
                    collapsable: false,
                    children: [
                        { title: "简易测试平台Demo", path: "/test_development/platform/简易测试平台Demo" },
                    ]
                },
            ],            
            '/compatibility_test/': [
                {
                    title: "兼容性测试",
                    path: "/compatibility_test/数据库兼容性测试",
                    collapsable: false,
                    children: [
                        { title: "数据库兼容性测试", path: "/compatibility_test/数据库兼容性测试" },
                    ]
                }
            ],
            '/': [
                {
                    title: "欢迎交流",
                    path: "/",
                    collapsable: false,  // 是否折叠
                    children: [{ title: "博客简介", path: "/" }],
                },
            ],
        },

        plugins: [
            '@vuepress/plugin-back-to-top', // 返回顶部插件
            '@vuepress/plugin-medium-zoom', // 图片放大插件
          ]
    }
}

