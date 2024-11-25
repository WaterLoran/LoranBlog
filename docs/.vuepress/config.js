module.exports = {
    title: '罗兰测试',
    logo: '/images/logo/猞猁.png',
    description: '各类测试理论, 技能, 经验, 故事, 职业发展的博客文档',
    theme: 'reco',
    themeConfig: {
        nav: [{'text': '首页', 'link': '/'}, {
            'text': 'App测试',
            'items': [{'text': 'APP专项', 'link': '/App测试/APP专项/App启动性能分析'}, {
                'text': 'APP自动化',
                'link': '/App测试/APP自动化/App自动化测试'
            }, {'text': '业务和技术驱动', 'link': '/App测试/业务和技术驱动/用商业分析来推进测试'}, {
                'text': '测试类型',
                'link': '/App测试/测试类型/交互-测试通知信息'
            }]
        }, {
            'text': '体系思维',
            'items': [{'text': 'UI测试', 'link': '/体系思维/UI测试/UI类BUG特点分析'}, {
                'text': '测试基础',
                'link': '/体系思维/测试基础/APP测试比web测试多出的工作内容'
            }, {'text': '质量内建', 'link': '/体系思维/质量内建/DeskCheck结卡'}, {
                'text': '质量赋能',
                'link': '/体系思维/质量赋能/整体概览'
            }]
        }, {
            'text': '功能测试',
            'items': [{'text': '理论', 'link': '/功能测试/理论/为啥开发常常忽略一些交互细节的问题'}, {
                'text': '经验',
                'link': '/功能测试/经验/Devops过程中的各种迭代交付问题'
            }, {'text': '软件测试经验与教训', 'link': '/功能测试/软件测试经验与教训/如何制定语境驱动的测试计划'}]
        }, {
            'text': '大模型',
            'items': [{'text': 'GraphRAG', 'link': '/大模型/GraphRAG/GraphRAG学习资源'}, {
                'text': 'langchain',
                'link': '/大模型/langchain/langchain介绍'
            }, {'text': '向量数据库', 'link': '/大模型/向量数据库/FAISS和大模型的关系'}, {
                'text': '实践经验',
                'link': '/大模型/实践经验/第一个使用openai的demo'
            }, {'text': '深度学习', 'link': '/大模型/深度学习/MIMIC-III学习资料'}]
        }, {
            'text': '性能测试',
            'items': [{
                'text': 'JVM',
                'link': '/性能测试/JVM/java中线程池是如何配置的'
            }, {
                'text': 'Litemall性能测试实战',
                'link': '/性能测试/Litemall性能测试实战/Litemall性能测试实战_00前言'
            }, {'text': '企业性能测试', 'link': '/性能测试/企业性能测试/9.2.3 性能瓶颈定位思路'}, {
                'text': '全链路压测',
                'link': '/性能测试/全链路压测/为什么全链路压测建议在真实环境去做'
            }, {'text': '性能诊断', 'link': '/性能测试/性能诊断/CPU和负载综合比较分析'}, {
                'text': '性能调优',
                'link': '/性能测试/性能调优/JVM调优大约能有多少性能改善'
            }, {'text': '杂谈', 'link': '/性能测试/杂谈/为啥性能测试工程师成长那么难'}, {
                'text': '理论',
                'link': '/性能测试/理论/mysql8的性能'
            }, {'text': '相关工具', 'link': '/性能测试/相关工具/arthas基本功能使用'}, {
                'text': '经验',
                'link': '/性能测试/经验/一次性能交付测试经历'
            }]
        }, {
            'text': '测试开发',
            'items': [{'text': 'kafka', 'link': '/测试开发/kafka/java使用kafka的简单demo'}, {
                'text': 'LInux运维',
                'link': '/测试开发/LInux运维/centos更新yum源'
            }, {'text': 'redis', 'link': '/测试开发/redis/redis中的失效场景'}, {
                'text': 'tomcat',
                'link': '/测试开发/tomcat/Linux后台查看tomcat线程的方法'
            }, {'text': '专项', 'link': '/测试开发/专项/B端BPM类软件的升级测试'}, {
                'text': '云原生',
                'link': '/测试开发/云原生/docker基本使用命令'
            }, {
                'text': '优秀实践',
                'link': '/测试开发/优秀实践/记录coding平台用例迁移到Metersphere'
            }, {
                'text': '分布式系统',
                'link': '/测试开发/分布式系统/python比对两个不同虚拟机数据库的数据一致性'
            }, {'text': '可测试性', 'link': '/测试开发/可测试性/从迭代周期看可测试性'}, {
                'text': '可靠性测试',
                'link': '/测试开发/可靠性测试/双活测试'
            }, {'text': '基础硬件', 'link': '/测试开发/基础硬件/各类raid的优缺点'}, {
                'text': '基础设施',
                'link': '/测试开发/基础设施/iaas基本介绍'
            }, {'text': '工具或平台', 'link': '/测试开发/工具或平台/简易测试平台Demo'}, {
                'text': '抓包',
                'link': '/测试开发/抓包/burpsuit工具抓包'
            }, {'text': '故事', 'link': '/测试开发/故事/初次用java写工具时引入BUG的思考体会'}, {
                'text': '数据库',
                'link': '/测试开发/数据库/Mysql常用操作'
            }, {'text': '杂谈', 'link': '/测试开发/杂谈/互联网软件的生命周期'}, {
                'text': '等保测评',
                'link': '/测试开发/等保测评/如何学习等保测评'
            }, {'text': '负载均衡', 'link': '/测试开发/负载均衡/微服务间的负载均衡算法'}, {
                'text': '资损防控',
                'link': '/测试开发/资损防控/基本概念'
            }, {'text': '资源下载', 'link': '/测试开发/资源下载/测试资源'}]
        }, {
            'text': '测试管理',
            'items': [{'text': 'devops', 'link': '/测试管理/devops/devops的发展历史'}, {
                'text': '代码管理',
                'link': '/测试管理/代码管理/好的代码分支应该有什么效果'
            }, {'text': '团队管理', 'link': '/测试管理/团队管理/10人的测试团队的梯度建设'}, {
                'text': '外包管理',
                'link': '/测试管理/外包管理/测试经理管理外包团队时的职责'
            }, {'text': '工具选型', 'link': '/测试管理/工具选型/腾讯coding平台'}, {
                'text': '技术管理',
                'link': '/测试管理/技术管理/用例管理'
            }, {'text': '研发效能', 'link': '/测试管理/研发效能/研发效能的工作内容'}, {
                'text': '管理杂谈',
                'link': '/测试管理/管理杂谈/我经历的第一家公司的管理'
            }]
        }, {
            'text': '自动化测试',
            'items': [{'text': '测试工具', 'link': '/自动化测试/测试工具/Allure使用指南'}, {
                'text': '理论',
                'link': '/自动化测试/理论/UI自动化的核心'
            }, {'text': '经验', 'link': '/自动化测试/经验/一次失败的自动化经历'}, {
                'text': '自动化框架',
                'link': '/自动化测试/自动化框架/1.1.1 通过拉取github项目快速开始'
            }]
        }, {
            'text': '优质博客',
            'items': [{'text': '美团技术团队', 'link': 'https://tech.meituan.com/'}, {
                'text': 'Java全栈知识体系',
                'link': 'https://pdai.tech/'
            }, {'text': 'BY林子', 'link': 'https://www.bylinzi.com/'}, {
                'text': 'code2life',
                'link': 'https://code2life.top/archives/'
            }, {'text': '技术圆桌', 'link': 'https://v2think.com/what-is-leadership'}, {
                'text': 'istqb',
                'link': 'https://www.tsting.cn/download/istqb/core'
            }]
        }],
        sidebar: {
            '/App测试/': [{
                'title': 'APP专项',
                'path': '/App测试/APP专项/App启动性能分析',
                'collapsable': false,
                'children': [{
                    'title': 'App启动性能分析',
                    'path': '/App测试/APP专项/App启动性能分析'
                }, {'title': 'App弱网测试', 'path': '/App测试/APP专项/App弱网测试'}]
            }, {
                'title': 'APP自动化',
                'path': '/App测试/APP自动化/App自动化测试',
                'collapsable': false,
                'children': [{'title': 'App自动化测试', 'path': '/App测试/APP自动化/App自动化测试'}]
            }, {
                'title': '业务和技术驱动',
                'path': '/App测试/业务和技术驱动/用商业分析来推进测试',
                'collapsable': false,
                'children': [{
                    'title': '用商业分析来推进测试',
                    'path': '/App测试/业务和技术驱动/用商业分析来推进测试'
                }, {
                    'title': '移动应用架构',
                    'path': '/App测试/业务和技术驱动/移动应用架构'
                }, {
                    'title': '移动应用测试的挑战',
                    'path': '/App测试/业务和技术驱动/移动应用测试的挑战'
                }, {
                    'title': '移动应用测试的风险',
                    'path': '/App测试/业务和技术驱动/移动应用测试的风险'
                }, {
                    'title': '移动应用测试策略',
                    'path': '/App测试/业务和技术驱动/移动应用测试策略'
                }, {
                    'title': '移动应用的盈利模式',
                    'path': '/App测试/业务和技术驱动/移动应用的盈利模式'
                }, {
                    'title': '移动应用类型',
                    'path': '/App测试/业务和技术驱动/移动应用类型'
                }, {'title': '移动设备的类型', 'path': '/App测试/业务和技术驱动/移动设备的类型'}]
            }, {
                'title': '测试类型',
                'path': '/App测试/测试类型/交互-测试通知信息',
                'collapsable': false,
                'children': [{
                    'title': '交互-测试通知信息',
                    'path': '/App测试/测试类型/交互-测试通知信息'
                }, {
                    'title': '交互-用户偏好测试',
                    'path': '/App测试/测试类型/交互-用户偏好测试'
                }, {
                    'title': '兼容-典型中断测试',
                    'path': '/App测试/测试类型/兼容-典型中断测试'
                }, {
                    'title': '兼容-各种输入方法测试',
                    'path': '/App测试/测试类型/兼容-各种输入方法测试'
                }, {
                    'title': '兼容-屏幕方向变化测试',
                    'path': '/App测试/测试类型/兼容-屏幕方向变化测试'
                }, {
                    'title': '兼容-测试不同的显示器',
                    'path': '/App测试/测试类型/兼容-测试不同的显示器'
                }, {
                    'title': '兼容-电量消耗及电量测试',
                    'path': '/App测试/测试类型/兼容-电量消耗及电量测试'
                }, {
                    'title': '兼容-设备功能测试',
                    'path': '/App测试/测试类型/兼容-设备功能测试'
                }, {
                    'title': '兼容-设备功能访问权限测试',
                    'path': '/App测试/测试类型/兼容-设备功能访问权限测试'
                }, {
                    'title': '兼容-设备温度测试',
                    'path': '/App测试/测试类型/兼容-设备温度测试'
                }, {
                    'title': '兼容-设备输入传感器测试',
                    'path': '/App测试/测试类型/兼容-设备输入传感器测试'
                }, {
                    'title': '各类连接方法的测试',
                    'path': '/App测试/测试类型/各类连接方法的测试'
                }, {
                    'title': '多个平台和操作系统版本的互操作性测试',
                    'path': '/App测试/测试类型/多个平台和操作系统版本的互操作性测试'
                }, {
                    'title': '设备上与其他应用程序的互操作性和共存性测试',
                    'path': '/App测试/测试类型/设备上与其他应用程序的互操作性和共存性测试'
                }]
            }],
            '/体系思维/': [{
                'title': 'UI测试',
                'path': '/体系思维/UI测试/UI类BUG特点分析',
                'collapsable': false,
                'children': [{
                    'title': 'UI类BUG特点分析',
                    'path': '/体系思维/UI测试/UI类BUG特点分析'
                }, {
                    'title': '如何快速判断UI类BUG',
                    'path': '/体系思维/UI测试/如何快速判断UI类BUG'
                }, {'title': '如何提高对UI类BUG的敏感性', 'path': '/体系思维/UI测试/如何提高对UI类BUG的敏感性'}]
            }, {
                'title': '测试基础',
                'path': '/体系思维/测试基础/APP测试比web测试多出的工作内容',
                'collapsable': false,
                'children': [{
                    'title': 'APP测试比web测试多出的工作内容',
                    'path': '/体系思维/测试基础/APP测试比web测试多出的工作内容'
                }, {
                    'title': '功能测试用例的执行',
                    'path': '/体系思维/测试基础/功能测试用例的执行'
                }, {
                    'title': '可用性测试用例的执行',
                    'path': '/体系思维/测试基础/可用性测试用例的执行'
                }, {
                    'title': '可靠性测试用例的执行',
                    'path': '/体系思维/测试基础/可靠性测试用例的执行'
                }, {'title': '因果图分析', 'path': '/体系思维/测试基础/因果图分析'}, {
                    'title': '如何定位所发现的问题',
                    'path': '/体系思维/测试基础/如何定位所发现的问题'
                }, {
                    'title': '如何拆分大系统成多个小模块',
                    'path': '/体系思维/测试基础/如何拆分大系统成多个小模块'
                }, {
                    'title': '如何提交高质量的BUG',
                    'path': '/体系思维/测试基础/如何提交高质量的BUG'
                }, {
                    'title': '如何高质量的回归BUG',
                    'path': '/体系思维/测试基础/如何高质量的回归BUG'
                }, {
                    'title': '性能测试用例的执行',
                    'path': '/体系思维/测试基础/性能测试用例的执行'
                }, {
                    'title': '测试方案-测试策略-测试计划',
                    'path': '/体系思维/测试基础/测试方案-测试策略-测试计划'
                }, {'title': '测试用例评审', 'path': '/体系思维/测试基础/测试用例评审'}, {
                    'title': '测试设计方法概览',
                    'path': '/体系思维/测试基础/测试设计方法概览'
                }, {'title': '质量维度', 'path': '/体系思维/测试基础/质量维度'}, {
                    'title': '软件中性能和可靠性的联系',
                    'path': '/体系思维/测试基础/软件中性能和可靠性的联系'
                }]
            }, {
                'title': '质量内建',
                'path': '/体系思维/质量内建/DeskCheck结卡',
                'collapsable': false,
                'children': [{
                    'title': 'DeskCheck结卡',
                    'path': '/体系思维/质量内建/DeskCheck结卡'
                }, {'title': '客户验收', 'path': '/体系思维/质量内建/客户验收'}, {
                    'title': '开卡',
                    'path': '/体系思维/质量内建/开卡'
                }, {'title': '技术债管理', 'path': '/体系思维/质量内建/技术债管理'}, {
                    'title': '持续集成',
                    'path': '/体系思维/质量内建/持续集成'
                }, {
                    'title': '持续集成的相关工具',
                    'path': '/体系思维/质量内建/持续集成的相关工具'
                }, {'title': '整体概览', 'path': '/体系思维/质量内建/整体概览'}, {
                    'title': '日志评审',
                    'path': '/体系思维/质量内建/日志评审'
                }, {
                    'title': '生产故障分析与复盘',
                    'path': '/体系思维/质量内建/生产故障分析与复盘'
                }, {'title': '生产环境支持', 'path': '/体系思维/质量内建/生产环境支持'}, {
                    'title': '生产质量状态报告',
                    'path': '/体系思维/质量内建/生产质量状态报告'
                }, {
                    'title': '用户行为分析',
                    'path': '/体系思维/质量内建/用户行为分析'
                }, {
                    'title': '用户行为分析相关工作内容与技术栈',
                    'path': '/体系思维/质量内建/用户行为分析相关工作内容与技术栈'
                }, {'title': '需求澄清', 'path': '/体系思维/质量内建/需求澄清'}]
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
                'path': '/功能测试/理论/为啥开发常常忽略一些交互细节的问题',
                'collapsable': false,
                'children': [{
                    'title': '为啥开发常常忽略一些交互细节的问题',
                    'path': '/功能测试/理论/为啥开发常常忽略一些交互细节的问题'
                }, {
                    'title': '前后端数据状态不一致的原因',
                    'path': '/功能测试/理论/前后端数据状态不一致的原因'
                }, {
                    'title': '前端数据加载与同步问题',
                    'path': '/功能测试/理论/前端数据加载与同步问题'
                }, {
                    'title': '基于风险和质量的测试策略',
                    'path': '/功能测试/理论/基于风险和质量的测试策略'
                }, {
                    'title': '如何让测试新手快速具备高质量UI测试的能力',
                    'path': '/功能测试/理论/如何让测试新手快速具备高质量UI测试的能力'
                }, {
                    'title': '如何通过深入分析提升测试质量',
                    'path': '/功能测试/理论/如何通过深入分析提升测试质量'
                }, {'title': '如何预防BUG', 'path': '/功能测试/理论/如何预防BUG'}, {
                    'title': '存量BUG对测试执行的影响',
                    'path': '/功能测试/理论/存量BUG对测试执行的影响'
                }, {
                    'title': '测试准入准出标准的失效及预防',
                    'path': '/功能测试/理论/测试准入准出标准的失效及预防'
                }, {
                    'title': '测试设计与执行的分离',
                    'path': '/功能测试/理论/测试设计与执行的分离'
                }, {
                    'title': '营造和谐的沟通环境的话术模板',
                    'path': '/功能测试/理论/营造和谐的沟通环境的话术模板'
                }, {
                    'title': '调任新部门时如何调研软件存在的问题',
                    'path': '/功能测试/理论/调任新部门时如何调研软件存在的问题'
                }]
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
                }, {
                    'title': '最近外包项目的测试的思考',
                    'path': '/功能测试/经验/最近外包项目的测试的思考'
                }, {'title': '登陆显示无相关权限问题定位', 'path': '/功能测试/经验/登陆显示无相关权限问题定位'}]
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
            '/大模型/': [{
                'title': 'GraphRAG',
                'path': '/大模型/GraphRAG/GraphRAG学习资源',
                'collapsable': false,
                'children': [{
                    'title': 'GraphRAG学习资源',
                    'path': '/大模型/GraphRAG/GraphRAG学习资源'
                }, {
                    'title': 'GraphRAG是什么',
                    'path': '/大模型/GraphRAG/GraphRAG是什么'
                }, {
                    'title': '使用GraphRAG根据知识图谱进行检索和内容生成',
                    'path': '/大模型/GraphRAG/使用GraphRAG根据知识图谱进行检索和内容生成'
                }, {'title': '根据pdf来生成知识图谱的DEMO', 'path': '/大模型/GraphRAG/根据pdf来生成知识图谱的DEMO'}]
            }, {
                'title': 'langchain',
                'path': '/大模型/langchain/langchain介绍',
                'collapsable': false,
                'children': [{
                    'title': 'langchain介绍',
                    'path': '/大模型/langchain/langchain介绍'
                }, {
                    'title': 'langchain和prompt的联系',
                    'path': '/大模型/langchain/langchain和prompt的联系'
                }, {
                    'title': 'langchain学习资源',
                    'path': '/大模型/langchain/langchain学习资源'
                }, {
                    'title': 'langchain的功能介绍',
                    'path': '/大模型/langchain/langchain的功能介绍'
                }, {
                    'title': 'LLM Chains的详细使用',
                    'path': '/大模型/langchain/LLM Chains的详细使用'
                }, {'title': 'Memory功能的详细使用', 'path': '/大模型/langchain/Memory功能的详细使用'}]
            }, {
                'title': '向量数据库',
                'path': '/大模型/向量数据库/FAISS和大模型的关系',
                'collapsable': false,
                'children': [{
                    'title': 'FAISS和大模型的关系',
                    'path': '/大模型/向量数据库/FAISS和大模型的关系'
                }, {
                    'title': 'GraphRAG和向量数据库的区别',
                    'path': '/大模型/向量数据库/GraphRAG和向量数据库的区别'
                }, {'title': '向量嵌入简介', 'path': '/大模型/向量数据库/向量嵌入简介'}, {
                    'title': '向量数据库概览',
                    'path': '/大模型/向量数据库/向量数据库概览'
                }]
            }, {
                'title': '实践经验',
                'path': '/大模型/实践经验/第一个使用openai的demo',
                'collapsable': false,
                'children': [{'title': '第一个使用openai的demo', 'path': '/大模型/实践经验/第一个使用openai的demo'}]
            }, {
                'title': '深度学习',
                'path': '/大模型/深度学习/MIMIC-III学习资料',
                'collapsable': false,
                'children': [{'title': 'MIMIC-III学习资料', 'path': '/大模型/深度学习/MIMIC-III学习资料'}]
            }],
            '/性能测试/': [{
                'title': 'JVM',
                'path': '/性能测试/JVM/java中线程池是如何配置的',
                'collapsable': false,
                'children': [{
                    'title': 'java中线程池是如何配置的',
                    'path': '/性能测试/JVM/java中线程池是如何配置的'
                }, {
                    'title': '如何判断性能问题是不是GC引起的及参考标准',
                    'path': '/性能测试/JVM/如何判断性能问题是不是GC引起的及参考标准'
                }]
            }, {
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
                'title': '全链路压测',
                'path': '/性能测试/全链路压测/为什么全链路压测建议在真实环境去做',
                'collapsable': false,
                'children': [{
                    'title': '为什么全链路压测建议在真实环境去做',
                    'path': '/性能测试/全链路压测/为什么全链路压测建议在真实环境去做'
                }, {
                    'title': '什么系统不需要做全链路压测',
                    'path': '/性能测试/全链路压测/什么系统不需要做全链路压测'
                }, {
                    'title': '使用全链路压测的软件系统',
                    'path': '/性能测试/全链路压测/使用全链路压测的软件系统'
                }, {
                    'title': '全链路压测的发展历史',
                    'path': '/性能测试/全链路压测/全链路压测的发展历史'
                }, {
                    'title': '全链路压测的场景',
                    'path': '/性能测试/全链路压测/全链路压测的场景'
                }, {
                    'title': '全链路测试的场景',
                    'path': '/性能测试/全链路压测/全链路测试的场景'
                }, {'title': '各大厂全链路压测实践', 'path': '/性能测试/全链路压测/各大厂全链路压测实践'}]
            }, {
                'title': '性能诊断',
                'path': '/性能测试/性能诊断/CPU和负载综合比较分析',
                'collapsable': false,
                'children': [{
                    'title': 'CPU和负载综合比较分析',
                    'path': '/性能测试/性能诊断/CPU和负载综合比较分析'
                }, {
                    'title': 'InnoDB存储当前性能和运行状态分析',
                    'path': '/性能测试/性能诊断/InnoDB存储当前性能和运行状态分析'
                }, {
                    'title': 'mysql8内存逐渐增加问题诊断',
                    'path': '/性能测试/性能诊断/mysql8内存逐渐增加问题诊断'
                }, {
                    'title': 'mysql8慢日志排查',
                    'path': '/性能测试/性能诊断/mysql8慢日志排查'
                }, {
                    'title': 'mysql8数据库索引排查',
                    'path': '/性能测试/性能诊断/mysql8数据库索引排查'
                }, {
                    'title': 'mysql8锁争用排查',
                    'path': '/性能测试/性能诊断/mysql8锁争用排查'
                }, {
                    'title': 'Windows对JMeter的性能约束',
                    'path': '/性能测试/性能诊断/Windows对JMeter的性能约束'
                }, {
                    'title': '一个前端事务操作性能体验慢排查思路',
                    'path': '/性能测试/性能诊断/一个前端事务操作性能体验慢排查思路'
                }, {
                    'title': '分离接口逐个压测的优势',
                    'path': '/性能测试/性能诊断/分离接口逐个压测的优势'
                }, {
                    'title': '如何确认HTTP层的网络延迟',
                    'path': '/性能测试/性能诊断/如何确认HTTP层的网络延迟'
                }, {
                    'title': '用户性能体验问题及排查方向',
                    'path': '/性能测试/性能诊断/用户性能体验问题及排查方向'
                }, {'title': '网络问题排查', 'path': '/性能测试/性能诊断/网络问题排查'}]
            }, {
                'title': '性能调优',
                'path': '/性能测试/性能调优/JVM调优大约能有多少性能改善',
                'collapsable': false,
                'children': [{
                    'title': 'JVM调优大约能有多少性能改善',
                    'path': '/性能测试/性能调优/JVM调优大约能有多少性能改善'
                }, {'title': 'mysql配置调优', 'path': '/性能测试/性能调优/mysql配置调优'}, {
                    'title': '性能分析调优',
                    'path': '/性能测试/性能调优/性能分析调优'
                }]
            }, {
                'title': '杂谈',
                'path': '/性能测试/杂谈/为啥性能测试工程师成长那么难',
                'collapsable': false,
                'children': [{
                    'title': '为啥性能测试工程师成长那么难',
                    'path': '/性能测试/杂谈/为啥性能测试工程师成长那么难'
                }, {'title': '搭建个性能测试环境有啥难的', 'path': '/性能测试/杂谈/搭建个性能测试环境有啥难的'}]
            }, {
                'title': '理论',
                'path': '/性能测试/理论/mysql8的性能',
                'collapsable': false,
                'children': [{'title': 'mysql8的性能', 'path': '/性能测试/理论/mysql8的性能'}, {
                    'title': 'nginx的性能',
                    'path': '/性能测试/理论/nginx的性能'
                }, {
                    'title': '各类性能指标',
                    'path': '/性能测试/理论/各类性能指标'
                }, {
                    'title': '各类性能测试的概念与区别',
                    'path': '/性能测试/理论/各类性能测试的概念与区别'
                }, {
                    'title': '并发数对使用高峰期的模拟',
                    'path': '/性能测试/理论/并发数对使用高峰期的模拟'
                }, {
                    'title': '性能测试工具如何模拟真实场景',
                    'path': '/性能测试/理论/性能测试工具如何模拟真实场景'
                }, {
                    'title': '性能测试工具如何模拟真实性能容量',
                    'path': '/性能测试/理论/性能测试工具如何模拟真实性能容量'
                }, {
                    'title': '服务副本数量增加后性能提升趋于平缓问题',
                    'path': '/性能测试/理论/服务副本数量增加后性能提升趋于平缓问题'
                }, {
                    'title': '系统负载的相关概念',
                    'path': '/性能测试/理论/系统负载的相关概念'
                }, {'title': '软件的首次性能测试', 'path': '/性能测试/理论/软件的首次性能测试'}]
            }, {
                'title': '相关工具',
                'path': '/性能测试/相关工具/arthas基本功能使用',
                'collapsable': false,
                'children': [{
                    'title': 'arthas基本功能使用',
                    'path': '/性能测试/相关工具/arthas基本功能使用'
                }, {
                    'title': 'htop使用及指标解读',
                    'path': '/性能测试/相关工具/htop使用及指标解读'
                }, {
                    'title': 'iftop使用及指标解读',
                    'path': '/性能测试/相关工具/iftop使用及指标解读'
                }, {
                    'title': 'iostat使用及指标解读',
                    'path': '/性能测试/相关工具/iostat使用及指标解读'
                }, {
                    'title': 'jmeter聚合报告指标解读',
                    'path': '/性能测试/相关工具/jmeter聚合报告指标解读'
                }, {
                    'title': 'JMeter集群搭建',
                    'path': '/性能测试/相关工具/JMeter集群搭建'
                }, {
                    'title': 'jstat使用及指标解读',
                    'path': '/性能测试/相关工具/jstat使用及指标解读'
                }, {
                    'title': 'vmstat使用及指标解读',
                    'path': '/性能测试/相关工具/vmstat使用及指标解读'
                }, {
                    'title': 'yum安装htop',
                    'path': '/性能测试/相关工具/yum安装htop'
                }, {
                    'title': '使用arthas获取容器中的java应用的火焰图',
                    'path': '/性能测试/相关工具/使用arthas获取容器中的java应用的火焰图'
                }]
            }, {
                'title': '经验',
                'path': '/性能测试/经验/一次性能交付测试经历',
                'collapsable': false,
                'children': [{'title': '一次性能交付测试经历', 'path': '/性能测试/经验/一次性能交付测试经历'}]
            }],
            '/测试开发/': [{
                'title': 'kafka',
                'path': '/测试开发/kafka/java使用kafka的简单demo',
                'collapsable': false,
                'children': [{
                    'title': 'java使用kafka的简单demo',
                    'path': '/测试开发/kafka/java使用kafka的简单demo'
                }, {'title': 'kafka失效场景', 'path': '/测试开发/kafka/kafka失效场景'}, {
                    'title': 'kafka应用场景',
                    'path': '/测试开发/kafka/kafka应用场景'
                }, {
                    'title': 'python使用kafka的简单demo',
                    'path': '/测试开发/kafka/python使用kafka的简单demo'
                }, {'title': '如何针对kafka的失效场景做测试', 'path': '/测试开发/kafka/如何针对kafka的失效场景做测试'}]
            }, {
                'title': 'LInux运维',
                'path': '/测试开发/LInux运维/centos更新yum源',
                'collapsable': false,
                'children': [{
                    'title': 'centos更新yum源',
                    'path': '/测试开发/LInux运维/centos更新yum源'
                }, {'title': 'frp基本使用', 'path': '/测试开发/LInux运维/frp基本使用'}, {
                    'title': 'frp基本使用_toml',
                    'path': '/测试开发/LInux运维/frp基本使用_toml'
                }, {
                    'title': 'Linux安装nodejs',
                    'path': '/测试开发/LInux运维/Linux安装nodejs'
                }, {
                    'title': 'node安装yarn',
                    'path': '/测试开发/LInux运维/node安装yarn'
                }, {'title': '局域网内提供DNS服务的方案', 'path': '/测试开发/LInux运维/局域网内提供DNS服务的方案'}]
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
                'title': 'tomcat',
                'path': '/测试开发/tomcat/Linux后台查看tomcat线程的方法',
                'collapsable': false,
                'children': [{
                    'title': 'Linux后台查看tomcat线程的方法',
                    'path': '/测试开发/tomcat/Linux后台查看tomcat线程的方法'
                }, {'title': 'tomcat工作原理', 'path': '/测试开发/tomcat/tomcat工作原理'}, {
                    'title': 'tomcat调优',
                    'path': '/测试开发/tomcat/tomcat调优'
                }]
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
                }, {'title': '数据库兼容性测试', 'path': '/测试开发/专项/数据库兼容性测试'}]
            }, {
                'title': '云原生',
                'path': '/测试开发/云原生/docker基本使用命令',
                'collapsable': false,
                'children': [{
                    'title': 'docker基本使用命令',
                    'path': '/测试开发/云原生/docker基本使用命令'
                }, {'title': 'k8s基本使用命令', 'path': '/测试开发/云原生/k8s基本使用命令'}]
            }, {
                'title': '优秀实践',
                'path': '/测试开发/优秀实践/记录coding平台用例迁移到Metersphere',
                'collapsable': false,
                'children': [{
                    'title': '记录coding平台用例迁移到Metersphere',
                    'path': '/测试开发/优秀实践/记录coding平台用例迁移到Metersphere'
                }]
            }, {
                'title': '分布式系统',
                'path': '/测试开发/分布式系统/python比对两个不同虚拟机数据库的数据一致性',
                'collapsable': false,
                'children': [{
                    'title': 'python比对两个不同虚拟机数据库的数据一致性',
                    'path': '/测试开发/分布式系统/python比对两个不同虚拟机数据库的数据一致性'
                }, {
                    'title': 'sql命令查看同数据库软件2个数据库的一致性',
                    'path': '/测试开发/分布式系统/sql命令查看同数据库软件2个数据库的一致性'
                }, {
                    'title': '主从数据库同步引入时延',
                    'path': '/测试开发/分布式系统/主从数据库同步引入时延'
                }, {
                    'title': '分布式系统常用组件',
                    'path': '/测试开发/分布式系统/分布式系统常用组件'
                }, {
                    'title': '数据一致性的概念与测试',
                    'path': '/测试开发/分布式系统/数据一致性的概念与测试'
                }, {
                    'title': '测试如何处理数据不一致的问题',
                    'path': '/测试开发/分布式系统/测试如何处理数据不一致的问题'
                }]
            }, {
                'title': '可测试性',
                'path': '/测试开发/可测试性/从迭代周期看可测试性',
                'collapsable': false,
                'children': [{
                    'title': '从迭代周期看可测试性',
                    'path': '/测试开发/可测试性/从迭代周期看可测试性'
                }, {'title': '各视角看可测试性', 'path': '/测试开发/可测试性/各视角看可测试性'}]
            }, {
                'title': '可靠性测试',
                'path': '/测试开发/可靠性测试/双活测试',
                'collapsable': false,
                'children': [{'title': '双活测试', 'path': '/测试开发/可靠性测试/双活测试'}, {
                    'title': '双活软件架构',
                    'path': '/测试开发/可靠性测试/双活软件架构'
                }]
            }, {
                'title': '基础硬件',
                'path': '/测试开发/基础硬件/各类raid的优缺点',
                'collapsable': false,
                'children': [{'title': '各类raid的优缺点', 'path': '/测试开发/基础硬件/各类raid的优缺点'}]
            }, {
                'title': '基础设施',
                'path': '/测试开发/基础设施/iaas基本介绍',
                'collapsable': false,
                'children': [{
                    'title': 'iaas基本介绍',
                    'path': '/测试开发/基础设施/iaas基本介绍'
                }, {'title': 'paas基本介绍', 'path': '/测试开发/基础设施/paas基本介绍'}, {
                    'title': 'saas基本介绍',
                    'path': '/测试开发/基础设施/saas基本介绍'
                }, {
                    'title': '云平台功能及使用场景',
                    'path': '/测试开发/基础设施/云平台功能及使用场景'
                }, {'title': '虚拟存储', 'path': '/测试开发/基础设施/虚拟存储'}]
            }, {
                'title': '工具或平台',
                'path': '/测试开发/工具或平台/简易测试平台Demo',
                'collapsable': false,
                'children': [{'title': '简易测试平台Demo', 'path': '/测试开发/工具或平台/简易测试平台Demo'}]
            }, {
                'title': '抓包',
                'path': '/测试开发/抓包/burpsuit工具抓包',
                'collapsable': false,
                'children': [{
                    'title': 'burpsuit工具抓包',
                    'path': '/测试开发/抓包/burpsuit工具抓包'
                }, {'title': 'charles工具抓包', 'path': '/测试开发/抓包/charles工具抓包'}, {
                    'title': 'fiddler工具抓包',
                    'path': '/测试开发/抓包/fiddler工具抓包'
                }, {
                    'title': 'mitmproxy工具抓包',
                    'path': '/测试开发/抓包/mitmproxy工具抓包'
                }, {
                    'title': 'tcpdump工具抓包',
                    'path': '/测试开发/抓包/tcpdump工具抓包'
                }, {
                    'title': 'wireshark工具抓包',
                    'path': '/测试开发/抓包/wireshark工具抓包'
                }, {'title': '抓包工具抓不到包定位方法', 'path': '/测试开发/抓包/抓包工具抓不到包定位方法'}]
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
                'title': '数据库',
                'path': '/测试开发/数据库/Mysql常用操作',
                'collapsable': false,
                'children': [{
                    'title': 'Mysql常用操作',
                    'path': '/测试开发/数据库/Mysql常用操作'
                }, {
                    'title': '物理数据库和分布式数据库的差异',
                    'path': '/测试开发/数据库/物理数据库和分布式数据库的差异'
                }]
            }, {
                'title': '杂谈',
                'path': '/测试开发/杂谈/互联网软件的生命周期',
                'collapsable': false,
                'children': [{
                    'title': '互联网软件的生命周期',
                    'path': '/测试开发/杂谈/互联网软件的生命周期'
                }, {
                    'title': '我如何转的测开工程师',
                    'path': '/测试开发/杂谈/我如何转的测开工程师'
                }, {
                    'title': '某件事情思考的不足',
                    'path': '/测试开发/杂谈/某件事情思考的不足'
                }, {
                    'title': '测开工程师的工作内容',
                    'path': '/测试开发/杂谈/测开工程师的工作内容'
                }, {
                    'title': '测开工程师的工作内容在软件生命周期中的价值',
                    'path': '/测试开发/杂谈/测开工程师的工作内容在软件生命周期中的价值'
                }, {
                    'title': '测开工程师需要理解多少业务',
                    'path': '/测试开发/杂谈/测开工程师需要理解多少业务'
                }, {'title': '软件测试中的不可能三角', 'path': '/测试开发/杂谈/软件测试中的不可能三角'}]
            }, {
                'title': '等保测评',
                'path': '/测试开发/等保测评/如何学习等保测评',
                'collapsable': false,
                'children': [{
                    'title': '如何学习等保测评',
                    'path': '/测试开发/等保测评/如何学习等保测评'
                }, {'title': '安全控制体系', 'path': '/测试开发/等保测评/安全控制体系'}, {
                    'title': '定级标准',
                    'path': '/测试开发/等保测评/定级标准'
                }, {'title': '等保测评具体流程', 'path': '/测试开发/等保测评/等保测评具体流程'}]
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
            }, {
                'title': '资损防控',
                'path': '/测试开发/资损防控/基本概念',
                'collapsable': false,
                'children': [{'title': '基本概念', 'path': '/测试开发/资损防控/基本概念'}]
            }, {
                'title': '资源下载',
                'path': '/测试开发/资源下载/测试资源',
                'collapsable': false,
                'children': [{'title': '测试资源', 'path': '/测试开发/资源下载/测试资源'}]
            }],
            '/测试管理/': [{
                'title': 'devops',
                'path': '/测试管理/devops/devops的发展历史',
                'collapsable': false,
                'children': [{
                    'title': 'devops的发展历史',
                    'path': '/测试管理/devops/devops的发展历史'
                }, {
                    'title': 'devops落地方法论',
                    'path': '/测试管理/devops/devops落地方法论'
                }, {
                    'title': 'devops落地难点',
                    'path': '/测试管理/devops/devops落地难点'
                }, {'title': 'devops迭代模式故事', 'path': '/测试管理/devops/devops迭代模式故事'}]
            }, {
                'title': '代码管理',
                'path': '/测试管理/代码管理/好的代码分支应该有什么效果',
                'collapsable': false,
                'children': [{
                    'title': '好的代码分支应该有什么效果',
                    'path': '/测试管理/代码管理/好的代码分支应该有什么效果'
                }]
            }, {
                'title': '团队管理',
                'path': '/测试管理/团队管理/10人的测试团队的梯度建设',
                'collapsable': false,
                'children': [{
                    'title': '10人的测试团队的梯度建设',
                    'path': '/测试管理/团队管理/10人的测试团队的梯度建设'
                }, {
                    'title': 'RACI责任分配矩阵',
                    'path': '/测试管理/团队管理/RACI责任分配矩阵'
                }, {'title': '测试经理的职责', 'path': '/测试管理/团队管理/测试经理的职责'}]
            }, {
                'title': '外包管理',
                'path': '/测试管理/外包管理/测试经理管理外包团队时的职责',
                'collapsable': false,
                'children': [{
                    'title': '测试经理管理外包团队时的职责',
                    'path': '/测试管理/外包管理/测试经理管理外包团队时的职责'
                }]
            }, {
                'title': '工具选型',
                'path': '/测试管理/工具选型/腾讯coding平台',
                'collapsable': false,
                'children': [{'title': '腾讯coding平台', 'path': '/测试管理/工具选型/腾讯coding平台'}]
            }, {
                'title': '技术管理',
                'path': '/测试管理/技术管理/用例管理',
                'collapsable': false,
                'children': [{'title': '用例管理', 'path': '/测试管理/技术管理/用例管理'}]
            }, {
                'title': '研发效能',
                'path': '/测试管理/研发效能/研发效能的工作内容',
                'collapsable': false,
                'children': [{'title': '研发效能的工作内容', 'path': '/测试管理/研发效能/研发效能的工作内容'}]
            }, {
                'title': '管理杂谈',
                'path': '/测试管理/管理杂谈/我经历的第一家公司的管理',
                'collapsable': false,
                'children': [{
                    'title': '我经历的第一家公司的管理',
                    'path': '/测试管理/管理杂谈/我经历的第一家公司的管理'
                }, {'title': '我经历的第二家公司的管理', 'path': '/测试管理/管理杂谈/我经历的第二家公司的管理'}]
            }],
            '/自动化测试/': [{
                'title': '测试工具',
                'path': '/自动化测试/测试工具/Allure使用指南',
                'collapsable': false,
                'children': [{
                    'title': 'Allure使用指南',
                    'path': '/自动化测试/测试工具/Allure使用指南'
                }, {
                    'title': 'jsonpath库的基本使用',
                    'path': '/自动化测试/测试工具/jsonpath库的基本使用'
                }, {
                    'title': 'pytest-check库的基本使用',
                    'path': '/自动化测试/测试工具/pytest-check库的基本使用'
                }, {
                    'title': 'Pytest常用摘要',
                    'path': '/自动化测试/测试工具/Pytest常用摘要'
                }, {'title': 'request库的基本使用', 'path': '/自动化测试/测试工具/request库的基本使用'}]
            }, {
                'title': '理论',
                'path': '/自动化测试/理论/UI自动化的核心',
                'collapsable': false,
                'children': [{
                    'title': 'UI自动化的核心',
                    'path': '/自动化测试/理论/UI自动化的核心'
                }, {'title': '物联网产品自动化测试的难点', 'path': '/自动化测试/理论/物联网产品自动化测试的难点'}]
            }, {
                'title': '经验',
                'path': '/自动化测试/经验/一次失败的自动化经历',
                'collapsable': false,
                'children': [{
                    'title': '一次失败的自动化经历',
                    'path': '/自动化测试/经验/一次失败的自动化经历'
                }, {
                    'title': '低效自动化的例子原因',
                    'path': '/自动化测试/经验/低效自动化的例子原因'
                }, {
                    'title': '吐槽一下那些自动化框架',
                    'path': '/自动化测试/经验/吐槽一下那些自动化框架'
                }, {
                    'title': '如何编写可靠的UI定位表达式',
                    'path': '/自动化测试/经验/如何编写可靠的UI定位表达式'
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
            }, {
                'title': '自动化框架',
                'path': '/自动化测试/自动化框架/1.1.1 通过拉取github项目快速开始',
                'collapsable': false,
                'children': [{
                    'title': '1.1.1 通过拉取github项目快速开始',
                    'path': '/自动化测试/自动化框架/1.1.1 通过拉取github项目快速开始'
                }, {
                    'title': '1.1.2 通过在本地配置快速开始',
                    'path': '/自动化测试/自动化框架/1.1.2 通过在本地配置快速开始'
                }, {
                    'title': '1.1.3 熟悉并修改工程配置',
                    'path': '/自动化测试/自动化框架/1.1.3 熟悉并修改工程配置'
                }, {
                    'title': '框架自学视频',
                    'path': '/自动化测试/自动化框架/框架自学视频'
                }, {
                    'title': '罗兰自动化测试框架_大纲章节',
                    'path': '/自动化测试/自动化框架/罗兰自动化测试框架_大纲章节'
                }]
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
