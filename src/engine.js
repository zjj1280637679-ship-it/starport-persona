/**
 * 暮灯星栈：原创娱乐问卷。轴分数只来自选项，开放文字永不参与计分。
 * 随机性由 seed 与已答路径决定，浏览器、Node 和服务器使用相同规则。
 */
export const AXES = Object.freeze([
  { id: 'power', left: '共治', right: '集权', description: '共同协商与集中决策之间的偏好' },
  { id: 'frontier', left: '守望', right: '扩张', description: '稳固现有家园与探索外部空间之间的偏好' },
  { id: 'identity', left: '开放', right: '内聚', description: '接纳差异与维系共同体边界之间的偏好' },
  { id: 'meaning', left: '实证', right: '信念', description: '可检验依据与共同意义之间的偏好' },
]);

const TOTAL = 14;
const ROUTE = ['power', 'frontier', 'flavor', 'identity', 'meaning', 'branch', 'power', 'frontier', 'flavor', 'identity', 'meaning', 'branch', 'branch', 'open'];
const alphabet = ['a', 'b', 'c', 'd', 'e'];
const q = (id, axis, scene, speaker, prompt, choices, followupOn = []) => ({
  id, type: 'choice', axis, scene, speaker, prompt, allowText: true,
  role: id.startsWith('branch-') ? 'branch' : 'base', followupOn,
  options: choices.map(([label, value, tags = [], detail], index) => ({ id: alphabet[index], label, value, tags, ...(detail ? { detail } : {}) })),
});
const f = (id, scene, prompt, choices) => ({
  id, type: 'flavor', role: 'flavor', scene, speaker: '酒保 · 柚灯', prompt, allowText: false,
  options: choices.map((label, index) => ({ id: alphabet[index], label, value: 0, tags: [] })),
});
const o = (id, prompt) => ({
  id, type: 'open', role: 'open', scene: '最后一杯', speaker: '酒保 · 柚灯', prompt, allowText: true, options: [],
});

export const QUESTION_BANK = Object.freeze([
  q('power-captain', 'power', '舰桥来电', '值班舰长', '一道来历不明的信号要求全港停航。只有十分钟，你希望谁作出决定？', [
    ['临时集合各船代表，公开信息后投票。', -2, ['assembly']],
    ['让受影响的船员先谈，舰长协调出一个方案。', -1, ['assembly']],
    ['由熟悉航道的舰长拍板，事后完整说明。', 1, ['command']],
    ['统一停航，授权指挥部处理所有例外。', 2, ['command']],
  ]),
  q('power-budget', 'power', '港务预算', '会计机器人', '星港只剩一笔维修资金。居民提出了四套方案，争论开始绕圈。', [
    ['把账目和方案公开，交给居民共同决定。', -2, ['assembly']],
    ['由抽签选出的居民小组协商。', -1, ['assembly']],
    ['请专业部门选出方案，居民保留申诉渠道。', 1, ['command']],
    ['交给一个负责人，并给他足够的调度权。', 2, ['command']],
  ]),
  q('power-charter', 'power', '新殖民地宪章', '拓荒书记员', '一座新城准备起草规则。最先写进宪章的应当是什么？', [
    ['每个人都能参与修改公共规则。', -2, ['assembly']],
    ['任何重大决定都需要多方同意。', -1, ['assembly']],
    ['关键岗位职责清晰，决策能及时执行。', 1, ['command']],
    ['长期目标由稳定的领导核心负责。', 2, ['command']],
  ]),
  q('power-dissent', 'power', '公共频道', '频道管理员', '港务长的方案遭到公开质疑。你希望频道怎样处理这场争论？', [
    ['保留完整争论，让所有人直接提出替代方案。', -2, ['assembly']],
    ['组织限时听证，再共同修订方案。', -1, ['assembly']],
    ['先按计划执行，由专门窗口收集意见。', 1, ['command']],
    ['负责人对结果负责，先保证命令得到执行。', 2, ['command']],
  ]),
  q('power-crisis', 'power', '氧气警报', '维修队长', '氧气系统出了故障。危机时的临时权力该如何安排？', [
    ['救援组也由居民代表共同监督。', -2, ['assembly']],
    ['授权小组行动，但短时间内必须重新取得同意。', -1, ['assembly']],
    ['由救援指挥官集中调配资源，危机后审查。', 1, ['command']],
    ['给指挥官完整权限，直到他宣布危机结束。', 2, ['command']],
  ]),
  q('power-promise', 'power', '候选人之夜', '退休导航员', '两位港务候选人都很能干。你更在意他们许下哪一种承诺？', [
    ['把议程交还居民，让更多人参与决策。', -2, ['assembly']],
    ['建立能约束管理者的协商与轮换制度。', -1, ['assembly']],
    ['减少部门扯皮，形成明确的责任链。', 1, ['command']],
    ['统一方向，推动多年无人敢碰的改革。', 2, ['command']],
  ]),

  q('frontier-map', 'frontier', '未标记航道', '制图师', '星图边缘出现了一条新航道。探索它会消耗一整年的备用燃料。', [
    ['先升级现有航道的安全设施。', -2, ['home']],
    ['派一艘小船探测，主要资源留在星港。', -1, ['home']],
    ['组织一支有撤回计划的探索舰队。', 1, ['explore']],
    ['抓住窗口，让探索成为下一年的重点。', 2, ['explore']],
  ]),
  q('frontier-garden', 'frontier', '温室与远航', '植物学家', '一笔新投资足够修复星港温室，也足够启动远行计划。你偏向哪边？', [
    ['修复温室，让现有居民生活得更安稳。', -2, ['home']],
    ['先完成基础修复，剩余资金做小型探测。', -1, ['home']],
    ['先建立远行补给点，逐步扩展生活空间。', 1, ['explore']],
    ['启动远行计划，新的空间值得优先投入。', 2, ['explore']],
  ]),
  q('frontier-border', 'frontier', '边界浮标', '边境巡逻员', '星港的航行边界已有多年没有变化。你会支持怎样的下一步？', [
    ['维护已有边界，减少长期消耗。', -2, ['home']],
    ['让外围地区更稳定，再讨论新航线。', -1, ['home']],
    ['逐步建立新的贸易与科研航点。', 1, ['explore']],
    ['主动开辟新区域，让星港更有行动空间。', 2, ['explore']],
  ]),
  q('frontier-risk', 'frontier', '远行保险', '保险经纪人', '一支远征队申请公共担保：回报很大，失败也会让星港背上债务。', [
    ['公共资源先保护现有居民的基本生活。', -2, ['home']],
    ['只给有限担保，风险由探索者承担大部分。', -1, ['home']],
    ['分阶段担保，用阶段成果决定后续投入。', 1, ['explore']],
    ['为有潜力的远征提供充分保障。', 2, ['explore']],
  ]),
  q('frontier-generation', 'frontier', '百年星图', '历史学徒', '百年之后，你希望星港后人记住今天的哪一种选择？', [
    ['我们守住了家园，让日常生活延续。', -2, ['home']],
    ['我们让一座旧港口重新繁荣。', -1, ['home']],
    ['我们为后人留下了更多可选择的航道。', 1, ['explore']],
    ['我们主动跨出已知世界的边界。', 2, ['explore']],
  ]),
  q('frontier-comet', 'frontier', '彗星窗口', '观测员', '一颗罕见彗星可以帮助飞船远行，窗口只有三天。你怎么看这个机会？', [
    ['机会常有，家园的可靠运行更重要。', -2, ['home']],
    ['先验证风险，只派小规模观测队。', -1, ['home']],
    ['迅速准备试航，安全阈值以内尽量尝试。', 1, ['explore']],
    ['调动资源抓住它，让这次远行成为转折。', 2, ['explore']],
  ]),

  q('identity-arrivals', 'identity', '新客靠港', '入港登记员', '一群习俗陌生的旅人请求长期居留。他们愿意遵守公共安全规则。', [
    ['欢迎他们加入，并允许保留不同生活方式。', -2, ['welcome']],
    ['安排交流与适应支持，逐步参与社区。', -1, ['welcome']],
    ['先完成共同语言和本港习俗的学习。', 1, ['tradition']],
    ['优先保证现有共同体的稳定与文化延续。', 2, ['tradition']],
  ]),
  q('identity-festival', 'identity', '节庆筹备会', '剧场策展人', '新居民希望把自己的节日加入星港的公共庆典。', [
    ['把庆典变成多种文化共同展示的舞台。', -2, ['welcome']],
    ['给新节日留位置，也保留原有仪式。', -1, ['welcome']],
    ['先围绕本港共同故事设计，再加入新元素。', 1, ['tradition']],
    ['公共庆典主要承担传承本港文化的任务。', 2, ['tradition']],
  ]),
  q('identity-language', 'identity', '多语告示牌', '翻译员', '星港里说着七种语言。公共告示怎样安排最合适？', [
    ['尽可能覆盖各社群语言，让差异可见。', -2, ['welcome']],
    ['通用语加多语支持，帮助大家交流。', -1, ['welcome']],
    ['主要使用本港通用语，另设翻译服务。', 1, ['tradition']],
    ['共同语言是基础，应优先推广统一使用。', 2, ['tradition']],
  ]),
  q('identity-partner', 'identity', '异乡合作社', '货舱管理员', '一个外来合作社愿意提供新技术，也希望参与星港的公共项目。', [
    ['开放参与，合作会带来新的经验。', -2, ['welcome']],
    ['按相同规则参与，让居民与他们一起工作。', -1, ['welcome']],
    ['先选择熟悉本港方式的伙伴，小步合作。', 1, ['tradition']],
    ['核心公共项目优先由本港共同体承担。', 2, ['tradition']],
  ]),
  q('identity-memory', 'identity', '记忆档案馆', '档案馆长', '档案馆想重写星港的历史展览。哪些故事最该放在入口？', [
    ['来自不同社群的故事，展示彼此如何相遇。', -2, ['welcome']],
    ['旧居民与新居民共同写下的生活片段。', -1, ['welcome']],
    ['奠定本港共同传统的重要事件。', 1, ['tradition']],
    ['让每代人都记住的起源、承诺与身份。', 2, ['tradition']],
  ]),
  q('identity-neighbors', 'identity', '邻座的请求', '社区联络员', '一个外来家庭有不同的作息和习俗。邻居觉得不习惯，但他们没有违反规则。', [
    ['尊重差异，公共规则以外各自选择。', -2, ['welcome']],
    ['组织交流，寻找双方舒服的相处方式。', -1, ['welcome']],
    ['鼓励他们逐步适应社区的共同习惯。', 1, ['tradition']],
    ['社区长期形成的生活方式应受到优先维护。', 2, ['tradition']],
  ]),

  q('meaning-beacon', 'meaning', '古老灯塔', '信标看守人', '一座传承百年的信标被认为能保佑航行，但工程师还没有找到它的作用机制。', [
    ['先做对照测试，依据结果安排资源。', -2, ['evidence']],
    ['保留仪式，维护预算仍由可靠数据决定。', -1, ['evidence']],
    ['它让船员心安，共同信念也有实际价值。', 1, ['belief']],
    ['传承的意义足够重要，应优先守护它。', 2, ['belief']],
  ]),
  q('meaning-plan', 'meaning', '未来航线', '年轻领航员', '两条航线都能到达新港：一条有充分试航记录，另一条契合大家相信的使命。', [
    ['以可重复的试航记录决定。', -2, ['evidence']],
    ['先走可靠航线，再验证另一条。', -1, ['evidence']],
    ['安全可接受时，让共同使命参与决定。', 1, ['belief']],
    ['愿意为共同相信的方向承担额外风险。', 2, ['belief']],
  ]),
  q('meaning-school', 'meaning', '学堂开课', '学堂教师', '新学堂只能先开一门公共课程。你希望居民先学会什么？', [
    ['观察、验证，以及怎样修正错误结论。', -2, ['evidence']],
    ['依据证据解决日常问题的方法。', -1, ['evidence']],
    ['理解共同体为什么值得彼此承诺。', 1, ['belief']],
    ['寻找使命与意义，并把它们传给下一代。', 2, ['belief']],
  ]),
  q('meaning-discovery', 'meaning', '实验室消息', '研究员', '一项新发现与星港沿用很久的解释相冲突，但实验已被多次重复。', [
    ['公开改正旧解释，更新教材与规则。', -2, ['evidence']],
    ['请独立团队复核后，按证据修订。', -1, ['evidence']],
    ['接受新发现，也重新诠释传统的意义。', 1, ['belief']],
    ['保留共同信念的核心，让发现补充它。', 2, ['belief']],
  ]),
  q('meaning-morale', 'meaning', '漫长黑夜', '夜班医师', '连月没有补给消息，居民的士气越来越低。你希望先做什么？', [
    ['公布库存与预测，让计划可以被核查。', -2, ['evidence']],
    ['把困难拆成可完成的小任务与具体进展。', -1, ['evidence']],
    ['用共同仪式提醒大家彼此的承诺。', 1, ['belief']],
    ['重申星港的使命，让人知道为何坚持。', 2, ['belief']],
  ]),
  q('meaning-archive', 'meaning', '失落的日志', '遗迹调查员', '古船日志只剩零散数据与一段动人的誓词。你会怎样讲述这段历史？', [
    ['区分已知与未知，缺失部分保持空白。', -2, ['evidence']],
    ['提出可检验的解释，明确标出推测。', -1, ['evidence']],
    ['在说明不确定性的同时，保留誓词的启发。', 1, ['belief']],
    ['用这份誓词连接今天的人与先人的使命。', 2, ['belief']],
  ]),

  q('branch-assembly', 'power', '协商的代价', '候船旅人', '你刚才倾向让更多人参与。若协商已经延误一次补给，你会怎样调整？', [
    ['保留共同决定，改善协商方式。', -2, ['assembly']],
    ['缩小议题，给居民代表明确时限。', -1, ['assembly']],
    ['设一个可撤销授权的临时负责人。', 1, ['command']],
    ['让固定负责人直接决定后续补给。', 2, ['command']],
  ], ['assembly']),
  q('branch-command', 'power', '命令之后', '修船学徒', '你刚才接受了集中决策。负责人完成目标，却忽略了部分居民的意见，你怎么看？', [
    ['重新分配决策权，让居民能直接改变方案。', -2, ['assembly']],
    ['增加共同审查和定期续任机制。', -1, ['assembly']],
    ['保留权限，同时强化反馈与问责。', 1, ['command']],
    ['先看长期结果，支持他继续推进。', 2, ['command']],
  ], ['command']),
  q('branch-home', 'frontier', '门外的星图', '返航船长', '你刚才更重视眼前家园。如果一条新航线可能解决长期资源短缺呢？', [
    ['先用现有资源改善效率，保持储备。', -2, ['home']],
    ['只投入能承受损失的一小部分。', -1, ['home']],
    ['把它列为下一阶段重点，分步验证。', 1, ['explore']],
    ['主动调整资源分配，尽快打开新航线。', 2, ['explore']],
  ], ['home']),
  q('branch-explore', 'frontier', '远行账单', '补给采购员', '你刚才倾向远行。现在远征需要减少本港一年的非必需设施更新。', [
    ['推迟远征，让本港先完成更新。', -2, ['home']],
    ['缩小远征，让两边都保持基本投入。', -1, ['home']],
    ['接受部分延后，但设定远征退出条件。', 1, ['explore']],
    ['优先远征，新的空间值得这次取舍。', 2, ['explore']],
  ], ['explore']),
  q('branch-welcome', 'identity', '共同规则', '新居民代表', '你刚才愿意接纳差异。新社群提出一种与你熟悉的传统冲突、却不伤害他人的习俗。', [
    ['允许它，公共空间也应容纳不同习俗。', -2, ['welcome']],
    ['共同商量时间与场合，让彼此舒服。', -1, ['welcome']],
    ['私人保留习俗，公共场合遵循本港传统。', 1, ['tradition']],
    ['优先维护共同习俗，避免公共身份分散。', 2, ['tradition']],
  ], ['welcome']),
  q('branch-tradition', 'identity', '传承与来客', '老居民', '你刚才看重共同传统。如果愿意长期参与的新居民想一起修订传统呢？', [
    ['让他们平等参与，传统可以共同重写。', -2, ['welcome']],
    ['一起讨论，保留记忆也给新经验留位置。', -1, ['welcome']],
    ['可以补充内容，核心习俗暂时保留。', 1, ['tradition']],
    ['先理解和继承传统，再讨论变化。', 2, ['tradition']],
  ], ['tradition']),
  q('branch-evidence', 'meaning', '没有数据的时刻', '航行心理师', '你刚才更信任可检验的依据。这次必须行动，证据却暂时不足。', [
    ['选最容易验证和撤回的方案。', -2, ['evidence']],
    ['公开不确定性，按已有证据作有限尝试。', -1, ['evidence']],
    ['让共同价值帮助决定，再补充验证。', 1, ['belief']],
    ['先依照相信的使命前进。', 2, ['belief']],
  ], ['evidence']),
  q('branch-belief', 'meaning', '信念的边界', '旧灯塔守夜人', '你刚才重视共同意义。如果新的可靠数据表明旧仪式没有预期效果呢？', [
    ['停止相关投入，以可靠方案替代。', -2, ['evidence']],
    ['保留个人选择，公共资源按数据调整。', -1, ['evidence']],
    ['改变实际做法，但保留凝聚人心的仪式。', 1, ['belief']],
    ['继续守护传统，同时寻找新的理解方式。', 2, ['belief']],
  ], ['belief']),
  q('branch-assembly-delegate', 'power', '下一张圆桌', '工会联络员', '你刚才为共同参与留了位置。居民可以亲自投票，也可以长期委托代表，你会优先安排哪种方式？', [
    ['重大议题尽量由居民直接讨论和投票。', -2, ['assembly']],
    ['由可随时更换的代表协商，过程公开。', -1, ['assembly']],
    ['由稳定的专业代表处理多数事务。', 1, ['command']],
    ['委托固定管理团队，避免频繁改变方向。', 2, ['command']],
  ], ['assembly']),
  q('branch-command-successor', 'power', '交接时刻', '港务秘书', '你刚才重视明确的决策者。能干的负责人即将离任，继任安排应如何确定？', [
    ['居民共同讨论岗位要求，再公开选出继任者。', -2, ['assembly']],
    ['由多方组成的委员会选择，并接受居民确认。', -1, ['assembly']],
    ['依据专业表现选择，交由现有机构任命。', 1, ['command']],
    ['由现任负责人培养和指定，保持方向连续。', 2, ['command']],
  ], ['command']),
  q('branch-home-signal', 'frontier', '远方的回声', '通讯技师', '你刚才先照看家园。一座遥远研究站愿意分享技术，但需要本港建设新的联络航道。', [
    ['先完成本港维护，合作可以稍后进行。', -2, ['home']],
    ['先用远程通讯合作，暂缓新航道。', -1, ['home']],
    ['分步建设，给长期合作打开空间。', 1, ['explore']],
    ['优先建立航道，把星港连向新的网络。', 2, ['explore']],
  ], ['home']),
  q('branch-explore-return', 'frontier', '返航的消息', '远征队领航员', '你刚才愿意向外探索。先遣队找到了两个新航点，同时也发现本港的基础设施有些老化。', [
    ['让先遣队返航，集中修复本港。', -2, ['home']],
    ['保留一个航点，把大部分资源调回。', -1, ['home']],
    ['维持探索，分批补上本港维护。', 1, ['explore']],
    ['继续拓展航点，争取未来反哺本港。', 2, ['explore']],
  ], ['explore']),
  q('branch-welcome-membership', 'identity', '新的名字', '登记处学徒', '你刚才愿意为来客留出空间。怎样才算成为星港共同体的一员？', [
    ['愿意参与并遵守公共规则，就可以加入。', -2, ['welcome']],
    ['共同生活、建立关系，让归属逐渐形成。', -1, ['welcome']],
    ['理解共同传统，并对长期承诺作出回应。', 1, ['tradition']],
    ['继承核心习俗，形成明确一致的身份。', 2, ['tradition']],
  ], ['welcome']),
  q('branch-tradition-change', 'identity', '年轻人的改编', '剧团演员', '你刚才重视共同记忆。年轻居民把一段老故事改成了陌生风格，他们也很喜欢星港。', [
    ['欢迎新的诠释，让故事有更多声音。', -2, ['welcome']],
    ['新旧版本并存，给不同观众各自的选择。', -1, ['welcome']],
    ['支持改编，但保留关键象征和传统版本。', 1, ['tradition']],
    ['公共演出优先延续大家熟悉的表达方式。', 2, ['tradition']],
  ], ['tradition']),
  q('branch-evidence-method', 'meaning', '两种可靠', '统计员', '你刚才重视证据。两种方案的效果相近，但一种更容易被复核，另一种更让居民觉得有意义。', [
    ['优先选能够清楚复核的方案。', -2, ['evidence']],
    ['用复核性作主要依据，也听取居民经验。', -1, ['evidence']],
    ['效果接近时，共同意义应有更大权重。', 1, ['belief']],
    ['选择能让大家相信并愿意持续投入的方案。', 2, ['belief']],
  ], ['evidence']),
  q('branch-belief-purpose', 'meaning', '使命的新解释', '航海诗人', '你刚才看重行动背后的意义。两代居民对同一句星港誓词有不同理解。', [
    ['先明确实际目标与可观察结果，再讨论誓词。', -2, ['evidence']],
    ['把不同解释落到具体行动上，比较它们的效果。', -1, ['evidence']],
    ['允许不同解释，寻找共同愿意承担的承诺。', 1, ['belief']],
    ['组织共同仪式，重新确立大家相信的核心使命。', 2, ['belief']],
  ], ['belief']),

  f('flavor-drink', '吧台菜单', '酒保推来一张菜单。今晚，你的第一杯是什么？', ['一杯会发光、但声称自己很普通的苏打。', '老船长推荐的无酒精黑咖啡。', '名字很长、杯子很小的星云特调。', '温水。赶路的人也需要温水。']),
  f('flavor-cat', '货舱访客', '一只穿着小制服的猫坐在你的座位上。它似乎比你更有通行权限。', ['向它敬礼，申请使用座位。', '掏出零食，进行友好交涉。', '坐到旁边，假装这本来就是计划。', '问酒保：猫也需要回答问卷吗？']),
  f('flavor-song', '点唱机', '点唱机卡住了。屏幕只剩四个看起来不太可靠的按钮。', ['《请系好安全带，这是情歌》', '《小行星也想早点下班》', '《一位舰长的三十七次叹气》', '静音。听冰块在杯子里航行。']),
  f('flavor-seat', '空位选择', '酒馆还剩四个座位。你想坐在哪里？', ['窗边，看缓缓旋转的行星。', '吧台，听酒保收集的故事。', '角落，与一盆不知真假的植物作伴。', '点唱机旁，承担全场最艰巨的音量管理。']),
  f('flavor-mascot', '船徽征集', '你的临时船队急需一个吉祥物。预算只有一支笔。', ['一只认真记航线的章鱼。', '一颗戴安全帽的小行星。', '一只永远把地图拿反的鸟。', '一个写着“经费待批”的纸箱。']),
  f('flavor-snack', '深夜加餐', '自动厨房递来最后一份夜宵。包装上写着“口味由宇宙决定”。', ['打开看看，未知也许很好吃。', '先闻一下，再决定要不要交给猫。', '请厨房认真解释“宇宙”的配料表。', '收藏包装，点一份熟悉的面。']),
  o('open-letter', '离开酒馆前，给未来的星港写一句话：你最希望它守住什么，或改变什么？'),
  o('open-rule', '如果能为这座星港留下一条不会强迫任何人的建议，你会写什么？'),
  o('open-home', '请用自己的话说说：什么样的共同体，会让你愿意把它称为家？'),
]);

const byId = new Map(QUESTION_BANK.map(question => [question.id, question]));
const axisIds = new Set(AXES.map(axis => axis.id));

function hash(text) {
  let n = 2166136261;
  for (let i = 0; i < text.length; i += 1) n = Math.imul(n ^ text.charCodeAt(i), 16777619);
  return n >>> 0;
}

function randomIndex(seed, path, length) {
  return hash(`${seed}|${JSON.stringify(path)}`) % length;
}

function makeSeed() {
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint32Array(2);
    globalThis.crypto.getRandomValues(bytes);
    return [...bytes].map(value => value.toString(36)).join('-');
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function nextId(session) {
  const slot = session.answers.length;
  if (slot >= TOTAL) return null;
  const role = ROUTE[slot];
  const used = new Set(session.answers.map(answer => answer.questionId));
  let candidates = QUESTION_BANK.filter(question => !used.has(question.id) && (
    axisIds.has(role) ? question.role === 'base' && question.axis === role : question.role === role
  ));
  if (role === 'branch') {
    // Prefer the most recent still-unfollowed answer's tags. A random choice
    // decides ties; a balanced axis fallback preserves variety.
    let matched = [];
    for (let i = session.answers.length - 1; i >= 0; i -= 1) {
      const answer = session.answers[i];
      const question = byId.get(answer.questionId);
      const tags = question?.options.find(option => option.id === answer.optionId)?.tags ?? [];
      matched = candidates.filter(candidate => candidate.followupOn.some(tag => tags.includes(tag)));
      if (matched.length) break;
    }
    if (matched.length) candidates = matched;
    else {
      const counts = Object.fromEntries(AXES.map(axis => [axis.id, 0]));
      for (const answer of session.answers) {
        const axis = byId.get(answer.questionId)?.axis;
        if (axis) counts[axis] += 1;
      }
      const least = Math.min(...Object.values(counts));
      const balanced = candidates.filter(question => counts[question.axis] === least);
      if (balanced.length) candidates = balanced;
    }
  }
  if (!candidates.length) throw new Error('题库无法生成下一题。');
  return candidates[randomIndex(session.seed, [...session.answers, { slot }], candidates.length)].id;
}

export function createSession(seed = makeSeed()) {
  const session = { seed: String(seed), answers: [], questionIds: [], total: TOTAL, complete: false };
  return { ...session, questionIds: [nextId(session)] };
}

export function currentQuestion(session) {
  if (!session || session.complete || session.answers.length >= TOTAL) return null;
  return byId.get(session.questionIds[session.answers.length]) ?? null;
}

function normalizeAnswer(question, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('答案格式无效。');
  if (input.text != null && typeof input.text !== 'string') throw new Error('补充回答必须是文字。');
  if ((input.text ?? '').length > 800) throw new Error('补充回答最多 800 字符。');
  const text = (input.text ?? '').trim();
  if (text && !question.allowText) throw new Error('这道题不接受补充文字。');
  if (question.type === 'open') {
    if (input.optionId != null && input.optionId !== '') throw new Error('开放题不接受选项编号。');
    return { questionId: question.id, optionId: null, text };
  }
  if (typeof input.optionId !== 'string' || !question.options.some(option => option.id === input.optionId)) {
    throw new Error('请选择这道题提供的选项。');
  }
  return { questionId: question.id, optionId: input.optionId, text };
}

export function answerQuestion(session, input) {
  const question = currentQuestion(session);
  if (!question) throw new Error('当前旅程已结束，请开始新的旅程。');
  const answer = normalizeAnswer(question, input);
  const answers = [...session.answers, answer];
  const updated = {
    seed: session.seed, answers,
    questionIds: session.questionIds.slice(0, session.answers.length + 1),
    total: TOTAL, complete: answers.length === TOTAL,
  };
  if (!updated.complete) updated.questionIds.push(nextId(updated));
  return updated;
}

export function previousQuestion(session) {
  if (!session?.answers?.length) return session;
  const answers = session.answers.slice(0, -1);
  return {
    seed: session.seed, answers,
    questionIds: session.questionIds.slice(0, answers.length + 1),
    total: TOTAL, complete: false,
  };
}

const civicBank = {
  power: {
    left: { name: '圆桌议事', description: '重要决定留出参与、协商与监督的空间。' },
    right: { name: '统一航令', description: '明确负责人，让长期目标与紧急行动顺利衔接。' },
  },
  frontier: {
    left: { name: '家园守望', description: '先照料已有的居民、设施和来之不易的日常。' },
    right: { name: '远航计划', description: '为未知保留资源，把新航道变成未来的选择。' },
  },
  identity: {
    left: { name: '多声港湾', description: '让不同经验共同参与星港的生活与规则。' },
    right: { name: '共同记忆', description: '用熟悉的习俗与故事维系共同体的认同。' },
  },
  meaning: {
    left: { name: '观测协议', description: '让公共判断能够被检验、复核和修正。' },
    right: { name: '星火誓约', description: '以共同的意义和承诺连接行动与未来。' },
  },
};

export function scoreSession(session) {
  const sums = Object.fromEntries(AXES.map(axis => [axis.id, { value: 0, count: 0 }]));
  for (const answer of session?.answers ?? []) {
    const question = byId.get(answer.questionId);
    if (!question?.axis) continue;
    const option = question.options.find(choice => choice.id === answer.optionId);
    if (!option) continue;
    sums[question.axis].value += option.value ?? 0;
    sums[question.axis].count += 1;
  }
  const axes = AXES.map(axis => {
    const evidenceCount = sums[axis.id].count;
    const value = evidenceCount ? Math.round(sums[axis.id].value / (evidenceCount * 2) * 100) : 0;
    const rightPercent = Math.round((100 + value) / 2);
    return { ...axis, value, leftPercent: 100 - rightPercent, rightPercent, evidenceCount };
  });
  const dominant = axes.filter(axis => axis.evidenceCount >= 2 && Math.abs(axis.value) >= 20)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value) || AXES.findIndex(x => x.id === a.id) - AXES.findIndex(x => x.id === b.id))
    .map(axis => ({ axisId: axis.id, name: axis.value > 0 ? axis.right : axis.left, strength: Math.abs(axis.value) }));
  const leading = dominant.slice(0, 2);
  const civics = leading.length ? leading.map(item => civicBank[item.axisId][axes.find(axis => axis.id === item.axisId).value > 0 ? 'right' : 'left']) : [
    { name: '留白公约', description: '在不同情境间保留弹性，让新的经验继续修订答案。' },
    { name: '慢航观察', description: '不急着给自己定型，先听完另一张桌子的故事。' },
  ];
  if (civics.length === 1) civics.push({
    name: '留白公约', description: '其他维度仍保留弹性，让新的经验继续修订答案。',
  });
  const title = leading.length > 1 ? `${leading[0].name}的${leading[1].name}航行者` : leading.length ? `${leading[0].name}航行者` : '留白航行者';
  const subtitle = leading.length ? `这一程，你更靠近「${leading.map(item => item.name).join('」与「')}」。` : '你的选择保留着张力，星图仍有许多可能。';
  const code = axes.map(axis => `${axis.id.slice(0, 1).toUpperCase()}${axis.evidenceCount < 2 ? '?' : axis.value === 0 ? '0' : axis.value > 0 ? '+' : '-'}`).join(' / ');
  return { axes, dominant, civics, title, subtitle, code, answered: session?.answers?.length ?? 0, total: TOTAL, complete: Boolean(session?.complete), confidence: '娱乐性倾向，无科学诊断意义' };
}

export function buildLocalCommentary(result, session) {
  const leading = result.dominant.slice(0, 2);
  const first = leading[0];
  const firstAxis = first && result.axes.find(axis => axis.id === first.axisId);
  const evidence = firstAxis && session.answers.filter(answer => byId.get(answer.questionId)?.axis === firstAxis.id);
  const concrete = evidence?.find(answer => {
    const item = byId.get(answer.questionId)?.options.find(choice => choice.id === answer.optionId);
    return item && Math.sign(item.value) === Math.sign(firstAxis.value);
  });
  const question = concrete && byId.get(concrete.questionId);
  const option = question?.options.find(choice => choice.id === concrete.optionId);
  const descriptions = {
    共治: '你愿意让更多人出现在决策桌旁，也愿意为协商留出时间。对你而言，参与本身就是共同体的一部分。',
    集权: '你在意方向清楚、责任明确的行动方式。面对不确定性时，你倾向让有能力的负责人把计划真正推进。',
    守望: '你容易看见家园中需要被照料的具体事物。可靠的日常、足够的储备与已经建立的关系，是你愿意先守住的东西。',
    扩张: '你会把目光投向星图边缘，愿意为新的空间与机会安排资源。未知对你而言，也意味着下一步可以选择的道路。',
    开放: '你倾向让不同的生活经验进入共同体。你更愿意通过相遇和协商，逐步写出大家能够共享的规则。',
    内聚: '你重视共同记忆、熟悉习俗与归属感。你希望变化发生时，仍有人记得这座星港从哪里来。',
    实证: '你偏爱能够观察、检验和修正的判断。即使故事动人，你仍会为证据、边界和不确定性留一个位置。',
    信念: '你看重人们为何愿意一起行动。共享的使命、仪式与承诺，能让漫长航行中的日常获得意义。',
  };
  const paragraphs = [
    first ? descriptions[first.name] : '你的选项在不同方向之间相互平衡。它更像是一组随情境变化的取舍：有些时刻需要共同讨论，有些时刻需要迅速行动。',
    leading[1] ? `同时，你也偏向「${leading[1].name}」。${descriptions[leading[1].name]} 两种倾向组合起来，构成了你在这次旅程里的优先次序。` : '其他轴上的选择更接近中间位置，或还不足以形成鲜明倾向。留白也是结果的一部分，你无需为每一种情境选定同一个方向。',
    option ? `在「${question.scene}」里，你选择了「${option.label}」——这是本次判断的一条具体依据。每个轴只采样了少量情境，图上的比例表达选项倾向，并不代表你拥有某种人格的概率。` : '这张星图来自少量虚构情境里的选项。图上的比例表达选项倾向，并不代表你拥有某种人格的概率。',
    '开放回答会作为理解你语境的补充；它与酒馆的小插曲都不会改变轴分数。把这张卡当作继续聊天的起点，真实生活中的你远比它丰富。',
  ];
  return {
    headline: result.title,
    paragraphs,
    quote: first ? '星图记录这一次选择，下一段航程仍由你书写。' : '有时，最好的航线是给自己留一点空白。',
    source: 'local',
  };
}

/** Server accepts complete transcripts and recomputes all scores itself. */
export function validateTranscript(answers) {
  if (!Array.isArray(answers) || answers.length !== TOTAL) throw new Error(`请提交完整的 ${TOTAL} 道题答案。`);
  const seen = new Set();
  const counts = Object.fromEntries(AXES.map(axis => [axis.id, 0]));
  const normalized = answers.map((answer, index) => {
    if (!answer || typeof answer !== 'object' || Array.isArray(answer) || typeof answer.questionId !== 'string') throw new Error('题目编号无效。');
    const question = byId.get(answer.questionId);
    if (!question || seen.has(question.id)) throw new Error('题目不存在或出现重复。');
    const slot = ROUTE[index];
    const roleMatches = axisIds.has(slot) ? question.role === 'base' && question.axis === slot : question.role === slot;
    if (!roleMatches) throw new Error('答题顺序与问卷结构不符。');
    seen.add(question.id);
    if (question.axis) counts[question.axis] += 1;
    return normalizeAnswer(question, answer);
  });
  if (Object.values(counts).some(count => count < 2)) throw new Error('每个轴至少需要两道题。');
  return { seed: 'validated', answers: normalized, questionIds: normalized.map(answer => answer.questionId), total: TOTAL, complete: true };
}
