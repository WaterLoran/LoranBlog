module.exports = {
    title: '罗兰测试',
    description: '各类测试理论, 技能, 经验, 故事, 职业发展的博客文档',
    theme: 'reco',
    themeConfig: {
        nav: [{'text': '首页', 'link': '/'}, {
            'text': '功能测试',
            'items': [{
                'text': '实施与交付',
                'link': '/功能测试/实施与交付/对实施和交付的总结分析'
            }, {
                'text': '构建测试的体系化思维',
                'link': '/功能测试/构建测试的体系化思维/构建测试的体系化思维-基础'
            }, {'text': '理论', 'link': '/功能测试/理论/基于风险和质量的测试策略'}]
        }, {
            'text': '性能测试',
            'items': [{
                'text': 'Litemall性能测试实战',
                'link': '/性能测试/Litemall性能测试实战/Litemall性能测试实战_00前言'
            }, {'text': '理论', 'link': '/性能测试/理论/各类性能测试的概念与区别'}, {
                'text': '经验',
                'link': '/性能测试/经验/一次性能交付测试经历'
            }]
        }, {
            'text': '测试开发',
            'items': [{'text': 'mysql', 'link': '/测试开发/mysql/Mysql常用操作'}, {
                'text': '专项',
                'link': '/测试开发/专项/B端BPM类软件的升级测试'
            }, {'text': '兼容测试', 'link': '/测试开发/兼容测试/数据库兼容性测试'}, {
                'text': '故事',
                'link': '/测试开发/故事/初次用java写工具时引入BUG的思考体会'
            }, {'text': '测试平台', 'link': '/测试开发/测试平台/简易测试平台Demo'}]
        }, {
            'text': '自动化测试',
            'items': [{'text': 'App测试', 'link': '/自动化测试/App测试/App启动性能分析'}, {
                'text': '测试工具',
                'link': '/自动化测试/测试工具/Allure使用指南'
            }, {'text': '理论', 'link': '/自动化测试/理论/物联网产品自动化测试的难点'}, {
                'text': '经验',
                'link': '/自动化测试/经验/一次失败的自动化经历'
            }]
        }, {
            'text': '优质博客',
            'items': [{'text': '美团技术团队', 'link': 'https://tech.meituan.com/'}, {
                'text': 'Java全栈知识体系',
                'link': 'https://pdai.tech/'
            }, {'text': 'BY林子', 'link': 'https://www.bylinzi.com/'}, {
                'text': 'code2life',
                'link': 'https://code2life.top/archives/'
            }, {'text': '技术圆桌', 'link': 'https://v2think.com/what-is-leadership'}]
        }],
        sidebar: {
            '/功能测试/': [{
                'title': '实施与交付',
                'path': '/功能测试/实施与交付/对实施和交付的总结分析',
                'collapsable': false,
                'children': [{'title': '对实施和交付的总结分析', 'path': '/功能测试/实施与交付/对实施和交付的总结分析'}]
            }, {
                'title': '构建测试的体系化思维',
                'path': '/功能测试/构建测试的体系化思维/构建测试的体系化思维-基础',
                'collapsable': false,
                'children': [{
                    'title': '构建测试的体系化思维-基础',
                    'path': '/功能测试/构建测试的体系化思维/构建测试的体系化思维-基础'
                }, {
                    'title': '构建测试的体系化思维-进阶',
                    'path': '/功能测试/构建测试的体系化思维/构建测试的体系化思维-进阶'
                }, {
                    'title': '构建测试的体系化思维-高阶',
                    'path': '/功能测试/构建测试的体系化思维/构建测试的体系化思维-高阶'
                }]
            }, {
                'title': '理论',
                'path': '/功能测试/理论/基于风险和质量的测试策略',
                'collapsable': false,
                'children': [{'title': '基于风险和质量的测试策略', 'path': '/功能测试/理论/基于风险和质量的测试策略'}]
            }],
            '/性能测试/': [{
                'title': 'Litemall性能测试实战',
                'path': '/性能测试/Litemall性能测试实战/Litemall性能测试实战_00前言',
                'collapsable': false,
                'children': [{
                    'title': 'Litemall性能测试实战_00前言',
                    'path': '/性能测试/Litemall性能测试实战/Litemall性能测试实战_00前言'
                }, {
                    'title': 'Litemall性能测试实战_01搭建环境',
                    'path': '/性能测试/Litemall性能测试实战/Litemall性能测试实战_01搭建环境'
                }, {
                    'title': 'Litemall性能测试实战_02需求分析',
                    'path': '/性能测试/Litemall性能测试实战/Litemall性能测试实战_02需求分析'
                }, {
                    'title': 'Litemall性能测试实战_03测试模型',
                    'path': '/性能测试/Litemall性能测试实战/Litemall性能测试实战_03测试模型'
                }, {
                    'title': 'Litemall性能测试实战_04测试计划',
                    'path': '/性能测试/Litemall性能测试实战/Litemall性能测试实战_04测试计划'
                }, {
                    'title': 'Litemall性能测试实战_05搭建监控',
                    'path': '/性能测试/Litemall性能测试实战/Litemall性能测试实战_05搭建监控'
                }, {
                    'title': 'Litemall性能测试实战_06开发脚本',
                    'path': '/性能测试/Litemall性能测试实战/Litemall性能测试实战_06开发脚本'
                }, {
                    'title': 'Litemall性能测试实战_07准备数据',
                    'path': '/性能测试/Litemall性能测试实战/Litemall性能测试实战_07准备数据'
                }, {
                    'title': 'Litemall性能测试实战_08场景设计',
                    'path': '/性能测试/Litemall性能测试实战/Litemall性能测试实战_08场景设计'
                }, {
                    'title': 'Litemall性能测试实战_09测试执行',
                    'path': '/性能测试/Litemall性能测试实战/Litemall性能测试实战_09测试执行'
                }, {
                    'title': 'Litemall性能测试实战_10结果分析',
                    'path': '/性能测试/Litemall性能测试实战/Litemall性能测试实战_10结果分析'
                }, {
                    'title': 'Litemall性能测试实战_11测试报告',
                    'path': '/性能测试/Litemall性能测试实战/Litemall性能测试实战_11测试报告'
                }, {'title': 'RuoYi_Vue3搭建', 'path': '/性能测试/Litemall性能测试实战/RuoYi_Vue3搭建'}]
            }, {
                'title': '理论',
                'path': '/性能测试/理论/各类性能测试的概念与区别',
                'collapsable': false,
                'children': [{
                    'title': '各类性能测试的概念与区别',
                    'path': '/性能测试/理论/各类性能测试的概念与区别'
                }, {'title': '性能分析调优', 'path': '/性能测试/理论/性能分析调优'}]
            }, {
                'title': '经验',
                'path': '/性能测试/经验/一次性能交付测试经历',
                'collapsable': false,
                'children': [{'title': '一次性能交付测试经历', 'path': '/性能测试/经验/一次性能交付测试经历'}]
            }],
            '/测试开发/': [{
                'title': 'mysql',
                'path': '/测试开发/mysql/Mysql常用操作',
                'collapsable': false,
                'children': [{'title': 'Mysql常用操作', 'path': '/测试开发/mysql/Mysql常用操作'}]
            }, {
                'title': '专项',
                'path': '/测试开发/专项/B端BPM类软件的升级测试',
                'collapsable': false,
                'children': [{
                    'title': 'B端BPM类软件的升级测试',
                    'path': '/测试开发/专项/B端BPM类软件的升级测试'
                }, {
                    'title': 'B端基础设施产品的升级测试',
                    'path': '/测试开发/专项/B端基础设施产品的升级测试'
                }, {
                    'title': 'devops过程中如何做全面的回归测试',
                    'path': '/测试开发/专项/devops过程中如何做全面的回归测试'
                }]
            }, {
                'title': '兼容测试',
                'path': '/测试开发/兼容测试/数据库兼容性测试',
                'collapsable': false,
                'children': [{'title': '数据库兼容性测试', 'path': '/测试开发/兼容测试/数据库兼容性测试'}]
            }, {
                'title': '故事',
                'path': '/测试开发/故事/初次用java写工具时引入BUG的思考体会',
                'collapsable': false,
                'children': [{
                    'title': '初次用java写工具时引入BUG的思考体会',
                    'path': '/测试开发/故事/初次用java写工具时引入BUG的思考体会'
                }, {
                    'title': '开发某需求焦灼时候的一些心里想法',
                    'path': '/测试开发/故事/开发某需求焦灼时候的一些心里想法'
                }]
            }, {
                'title': '测试平台',
                'path': '/测试开发/测试平台/简易测试平台Demo',
                'collapsable': false,
                'children': [{'title': '简易测试平台Demo', 'path': '/测试开发/测试平台/简易测试平台Demo'}]
            }],
            '/自动化测试/': [{
                'title': 'App测试',
                'path': '/自动化测试/App测试/App启动性能分析',
                'collapsable': false,
                'children': [{
                    'title': 'App启动性能分析',
                    'path': '/自动化测试/App测试/App启动性能分析'
                }, {'title': 'App弱网测试', 'path': '/自动化测试/App测试/App弱网测试'}, {
                    'title': 'App自动化测试',
                    'path': '/自动化测试/App测试/App自动化测试'
                }]
            }, {
                'title': '测试工具',
                'path': '/自动化测试/测试工具/Allure使用指南',
                'collapsable': false,
                'children': [{
                    'title': 'Allure使用指南',
                    'path': '/自动化测试/测试工具/Allure使用指南'
                }, {'title': 'Pytest常用摘要', 'path': '/自动化测试/测试工具/Pytest常用摘要'}]
            }, {
                'title': '理论',
                'path': '/自动化测试/理论/物联网产品自动化测试的难点',
                'collapsable': false,
                'children': [{
                    'title': '物联网产品自动化测试的难点',
                    'path': '/自动化测试/理论/物联网产品自动化测试的难点'
                }]
            }, {
                'title': '经验',
                'path': '/自动化测试/经验/一次失败的自动化经历',
                'collapsable': false,
                'children': [{
                    'title': '一次失败的自动化经历',
                    'path': '/自动化测试/经验/一次失败的自动化经历'
                }, {
                    'title': '吐槽一下那些自动化框架',
                    'path': '/自动化测试/经验/吐槽一下那些自动化框架'
                }, {
                    'title': '小公司做自动化的困境',
                    'path': '/自动化测试/经验/小公司做自动化的困境'
                }, {
                    'title': '我在公司建设自动化框架及体系的经历',
                    'path': '/自动化测试/经验/我在公司建设自动化框架及体系的经历'
                }, {
                    'title': '自动化测试落地方案及要求',
                    'path': '/自动化测试/经验/自动化测试落地方案及要求'
                }, {'title': '自动化都有哪一些工作内容', 'path': '/自动化测试/经验/自动化都有哪一些工作内容'}]
            }],
            '/': [{
                'title': '欢迎交流',
                'path': '/',
                'collapsable': false,
                'children': [{'title': '博客简介', 'path': '/'}]
            }]
        },
    },
    plugins: [
        '@vuepress/plugin-back-to-top', // 返回顶部插件
        '@vuepress/plugin-medium-zoom', // 图片放大插件
    ]
}
