module.exports = {
    title: '罗兰测试',
    description: '各类测试理论, 技能, 经验, 故事, 职业发展的博客文档',
    theme: 'reco',
    themeConfig: {
        nav: [{'text': '首页', 'link': '/'}, {
            'text': '体系思维',
            'items': [{'text': '测试基础', 'link': '/体系思维/测试基础/RACI责任分配矩阵'}, {
                'text': '质量内建',
                'link': '/体系思维/质量内建/客户验收'
            }, {'text': '质量赋能', 'link': '/体系思维/质量赋能/整体概览'}]
        }, {
            'text': '功能测试',
            'items': [{'text': '理论', 'link': '/功能测试/理论/UI类BUG特点分析'}, {
                'text': '经验',
                'link': '/功能测试/经验/Devops过程中的各种迭代交付问题'
            }, {'text': '软件测试经验与教训', 'link': '/功能测试/软件测试经验与教训/如何制定语境驱动的测试计划'}]
        }, {
            'text': '性能测试',
            'items': [{
                'text': 'Litemall性能测试实战',
                'link': '/性能测试/Litemall性能测试实战/Litemall性能测试实战_00前言'
            }, {'text': '企业性能测试', 'link': '/性能测试/企业性能测试/9.2.3 性能瓶颈定位思路'}, {
                'text': '理论',
                'link': '/性能测试/理论/各类性能测试的概念与区别'
            }, {'text': '经验', 'link': '/性能测试/经验/一次性能交付测试经历'}]
        }, {
            'text': '测试开发',
            'items': [{'text': 'kafka', 'link': '/测试开发/kafka/kafka失效场景'}, {
                'text': 'mysql',
                'link': '/测试开发/mysql/Mysql常用操作'
            }, {'text': 'redis', 'link': '/测试开发/redis/redis中的失效场景'}, {
                'text': '专项',
                'link': '/测试开发/专项/B端BPM类软件的升级测试'
            }, {'text': '兼容测试', 'link': '/测试开发/兼容测试/数据库兼容性测试'}, {
                'text': '分布式系统',
                'link': '/测试开发/分布式系统/分布式系统常用组件'
            }, {'text': '故事', 'link': '/测试开发/故事/初次用java写工具时引入BUG的思考体会'}, {
                'text': '测试平台',
                'link': '/测试开发/测试平台/简易测试平台Demo'
            }, {'text': '负载均衡', 'link': '/测试开发/负载均衡/微服务间的负载均衡算法'}]
        }, {
            'text': '自动化框架',
            'items': [{'text': '1.1 快速开始', 'link': '/自动化框架/1.1 快速开始/1.1.1 通过拉取github项目快速开始'}]
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
            '/体系思维/': [{
                'title': '测试基础',
                'path': '/体系思维/测试基础/RACI责任分配矩阵',
                'collapsable': false,
                'children': [{
                    'title': 'RACI责任分配矩阵',
                    'path': '/体系思维/测试基础/RACI责任分配矩阵'
                }, {
                    'title': '测试经理的职责',
                    'path': '/体系思维/测试基础/测试经理的职责'
                }, {
                    'title': '测试经理管理外包团队时的职责',
                    'path': '/体系思维/测试基础/测试经理管理外包团队时的职责'
                }, {'title': '质量维度', 'path': '/体系思维/测试基础/质量维度'}]
            }, {
                'title': '质量内建',
                'path': '/体系思维/质量内建/客户验收',
                'collapsable': false,
                'children': [{'title': '客户验收', 'path': '/体系思维/质量内建/客户验收'}, {
                    'title': '开卡',
                    'path': '/体系思维/质量内建/开卡'
                }, {'title': '技术债管理', 'path': '/体系思维/质量内建/技术债管理'}, {
                    'title': '整体概览',
                    'path': '/体系思维/质量内建/整体概览'
                }]
            }, {
                'title': '质量赋能',
                'path': '/体系思维/质量赋能/整体概览',
                'collapsable': false,
                'children': [{'title': '整体概览', 'path': '/体系思维/质量赋能/整体概览'}, {
                    'title': '测试团队拓扑',
                    'path': '/体系思维/质量赋能/测试团队拓扑'
                }, {'title': '测试沟通协作', 'path': '/体系思维/质量赋能/测试沟通协作'}, {
                    'title': '测试组织架构',
                    'path': '/体系思维/质量赋能/测试组织架构'
                }, {'title': '高效率协同因素的关系分析', 'path': '/体系思维/质量赋能/高效率协同因素的关系分析'}]
            }],
            '/功能测试/': [{
                'title': '理论',
                'path': '/功能测试/理论/UI类BUG特点分析',
                'collapsable': false,
                'children': [{
                    'title': 'UI类BUG特点分析',
                    'path': '/功能测试/理论/UI类BUG特点分析'
                }, {
                    'title': '基于风险和质量的测试策略',
                    'path': '/功能测试/理论/基于风险和质量的测试策略'
                }, {
                    'title': '如何通过深入分析提升测试质量',
                    'path': '/功能测试/理论/如何通过深入分析提升测试质量'
                }, {'title': '数据一致性的概念与测试', 'path': '/功能测试/理论/数据一致性的概念与测试'}]
            }, {
                'title': '经验',
                'path': '/功能测试/经验/Devops过程中的各种迭代交付问题',
                'collapsable': false,
                'children': [{
                    'title': 'Devops过程中的各种迭代交付问题',
                    'path': '/功能测试/经验/Devops过程中的各种迭代交付问题'
                }, {
                    'title': '一天发现20个bug的思考',
                    'path': '/功能测试/经验/一天发现20个bug的思考'
                }, {
                    'title': '一次短而快的验收交付经验',
                    'path': '/功能测试/经验/一次短而快的验收交付经验'
                }, {'title': '最近外包项目的测试的思考', 'path': '/功能测试/经验/最近外包项目的测试的思考'}]
            }, {
                'title': '软件测试经验与教训',
                'path': '/功能测试/软件测试经验与教训/如何制定语境驱动的测试计划',
                'collapsable': false,
                'children': [{
                    'title': '如何制定语境驱动的测试计划',
                    'path': '/功能测试/软件测试经验与教训/如何制定语境驱动的测试计划'
                }, {
                    'title': '程序错误分析-1',
                    'path': '/功能测试/软件测试经验与教训/程序错误分析-1'
                }, {
                    'title': '经验108-不要把手工测试与自动化等同起',
                    'path': '/功能测试/软件测试经验与教训/经验108-不要把手工测试与自动化等同起'
                }, {
                    'title': '经验41-如果遗漏一个问题那就检查这种遗漏是意外还是策略的必然结果',
                    'path': '/功能测试/软件测试经验与教训/经验41-如果遗漏一个问题那就检查这种遗漏是意外还是策略的必然结果'
                }, {
                    'title': '经验42-困惑是一种测试工具',
                    'path': '/功能测试/软件测试经验与教训/经验42-困惑是一种测试工具'
                }, {'title': '计划测试策略', 'path': '/功能测试/软件测试经验与教训/计划测试策略'}]
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
                'title': '企业性能测试',
                'path': '/性能测试/企业性能测试/9.2.3 性能瓶颈定位思路',
                'collapsable': false,
                'children': [{
                    'title': '9.2.3 性能瓶颈定位思路',
                    'path': '/性能测试/企业性能测试/9.2.3 性能瓶颈定位思路'
                }]
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
                'title': 'kafka',
                'path': '/测试开发/kafka/kafka失效场景',
                'collapsable': false,
                'children': [{'title': 'kafka失效场景', 'path': '/测试开发/kafka/kafka失效场景'}]
            }, {
                'title': 'mysql',
                'path': '/测试开发/mysql/Mysql常用操作',
                'collapsable': false,
                'children': [{'title': 'Mysql常用操作', 'path': '/测试开发/mysql/Mysql常用操作'}]
            }, {
                'title': 'redis',
                'path': '/测试开发/redis/redis中的失效场景',
                'collapsable': false,
                'children': [{
                    'title': 'redis中的失效场景',
                    'path': '/测试开发/redis/redis中的失效场景'
                }, {
                    'title': 'redis在单体系统和分布式系统中使用的差别',
                    'path': '/测试开发/redis/redis在单体系统和分布式系统中使用的差别'
                }, {'title': 'redis的基本概念', 'path': '/测试开发/redis/redis的基本概念'}, {
                    'title': 'redis的读写过程',
                    'path': '/测试开发/redis/redis的读写过程'
                }, {
                    'title': 'redis读写的性能消耗',
                    'path': '/测试开发/redis/redis读写的性能消耗'
                }, {
                    'title': '如何针对redis的失效场景做测试',
                    'path': '/测试开发/redis/如何针对redis的失效场景做测试'
                }, {'title': '实际业务中如何使用redis', 'path': '/测试开发/redis/实际业务中如何使用redis'}]
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
                'title': '分布式系统',
                'path': '/测试开发/分布式系统/分布式系统常用组件',
                'collapsable': false,
                'children': [{'title': '分布式系统常用组件', 'path': '/测试开发/分布式系统/分布式系统常用组件'}]
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
                }, {'title': '测试工具推行的困难', 'path': '/测试开发/故事/测试工具推行的困难'}]
            }, {
                'title': '测试平台',
                'path': '/测试开发/测试平台/简易测试平台Demo',
                'collapsable': false,
                'children': [{'title': '简易测试平台Demo', 'path': '/测试开发/测试平台/简易测试平台Demo'}]
            }, {
                'title': '负载均衡',
                'path': '/测试开发/负载均衡/微服务间的负载均衡算法',
                'collapsable': false,
                'children': [{
                    'title': '微服务间的负载均衡算法',
                    'path': '/测试开发/负载均衡/微服务间的负载均衡算法'
                }, {
                    'title': '微服务间的负载均衡通过什么来实现',
                    'path': '/测试开发/负载均衡/微服务间的负载均衡通过什么来实现'
                }, {
                    'title': '硬件负载均衡的应用场景',
                    'path': '/测试开发/负载均衡/硬件负载均衡的应用场景'
                }, {
                    'title': '负载均衡的常见测试',
                    'path': '/测试开发/负载均衡/负载均衡的常见测试'
                }, {
                    'title': '负载均衡算法的失效场景',
                    'path': '/测试开发/负载均衡/负载均衡算法的失效场景'
                }, {
                    'title': '针对负载均衡失效场景的测试方法工具和验证',
                    'path': '/测试开发/负载均衡/针对负载均衡失效场景的测试方法工具和验证'
                }]
            }],
            '/自动化框架/': [{
                'title': '1.1 快速开始',
                'path': '/自动化框架/1.1 快速开始/1.1.1 通过拉取github项目快速开始',
                'collapsable': false,
                'children': [{
                    'title': '1.1.1 通过拉取github项目快速开始',
                    'path': '/自动化框架/1.1 快速开始/1.1.1 通过拉取github项目快速开始'
                }, {
                    'title': '1.1.2 通过在本地配置快速开始',
                    'path': '/自动化框架/1.1 快速开始/1.1.2 通过在本地配置快速开始'
                }, {'title': '1.1.3 熟悉并修改工程配置', 'path': '/自动化框架/1.1 快速开始/1.1.3 熟悉并修改工程配置'}]
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
                }, {'title': '罗兰自动化测试框架_大纲章节', 'path': '/自动化测试/理论/罗兰自动化测试框架_大纲章节'}]
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
    enhanceAppFiles: [
        {
            name: 'custom-footer',
            content: `
            export default ({
                router
            }) => {
                router.afterEach((to, from) => {
                    if (typeof window !== 'undefined') {
                        // 检查是否已经存在页脚，避免重复添加
                        if (!document.querySelector('.custom-footer')) {
                            const footer = document.createElement('footer');
                            footer.className = 'custom-footer'; // 给页脚加一个类名
                            footer.innerHTML = \`
                            <footer style="text-align: center; margin-top: 0px; padding: 0px;">
                            <p>粤ICP备2024288002号 | copyright © 2024-present</p>
                            </footer>
                            \`;
                            document.body.appendChild(footer);
                        }
                    }
                });
            };
        `
        }
    ],
    plugins: [
        '@vuepress/plugin-back-to-top', // 返回顶部插件
        '@vuepress/plugin-medium-zoom', // 图片放大插件
    ]
}
