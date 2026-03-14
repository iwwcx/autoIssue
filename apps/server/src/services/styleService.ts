import { db } from "../config/database";
import { parseJson, toJson } from "../shared/json";
import { createId } from "../shared/text";
import type { StyleTemplate } from "../types";

const now = () => new Date().toISOString();

const defaultStyles: Omit<StyleTemplate, "createdAt" | "updatedAt">[] = [
  {
    id: "style_sharp",
    name: "简洁犀利",
    description: "适合科技、评论、行业变化类热点。",
    toneWords: ["直接", "清楚", "有观点"],
    openingTemplate: "先看核心信息：{{title}}。这件事之所以值得关注，不只是因为热度高，更因为它折射出了{{topicType}}领域的新变化。",
    structureTemplate: "总述 -> 平台补充 -> 影响分析 -> 个人观点",
    closingTemplate: "你怎么看这件事？欢迎留言交流。{{signature}}",
    opinionTemplate: "如果只看表面热度，很容易忽略真正的行业信号；从更长周期看，这件事可能会继续发酵。",
    signature: "作者：你的自媒体账号",
    sceneTags: ["科技", "评论"],
    isDefault: 1
  },
  {
    id: "style_detail",
    name: "详细全面",
    description: "适合民生、政策、综合盘点类内容。",
    toneWords: ["完整", "稳妥", "信息量足"],
    openingTemplate: "{{title}}正在多个平台持续发酵。为了避免单一来源信息片面，下面结合不同平台的动态，把这件事的关键内容梳理清楚。",
    structureTemplate: "背景 -> 核心进展 -> 各平台信息 -> 影响与提醒",
    closingTemplate: "后续如果有新进展，我们会继续跟进。{{signature}}",
    opinionTemplate: "从公开讨论来看，大家最关心的不是单点事件本身，而是它对日常生活和决策带来的实际影响。",
    signature: "整理：你的自媒体账号",
    sceneTags: ["民生", "盘点"],
    isDefault: 0
  },
  {
    id: "style_funny",
    name: "幽默接地气",
    description: "适合娱乐、轻热点、年轻化账号。",
    toneWords: ["轻松", "口语化", "有梗"],
    openingTemplate: "{{title}}这波热度，确实让人很难不多看两眼。网友们一边围观，一边疯狂补充细节，信息量比想象中还大。",
    structureTemplate: "轻松开场 -> 事件重点 -> 网友反应 -> 收尾互动",
    closingTemplate: "你觉得这事接下来会怎么发展？评论区聊聊。{{signature}}",
    opinionTemplate: "说到底，大家愿意讨论，不只是因为热闹，更因为每个人都能从中找到自己的关注点。",
    signature: "署名：你的自媒体账号",
    sceneTags: ["娱乐", "轻内容"],
    isDefault: 0
  },
  {
    id: "style_authoritative",
    name: "专业权威",
    description: "适合政策、财经、行业解读类内容。",
    toneWords: ["专业", "稳健", "有依据"],
    openingTemplate: "围绕{{title}}，市场和用户关注点正在快速聚焦。与其只看热度，不如把事件放回{{topicType}}语境里看清楚。",
    structureTemplate: "背景 -> 数据/事实 -> 影响 -> 判断",
    closingTemplate: "对这类趋势，持续关注比情绪表达更重要。{{signature}}",
    opinionTemplate: "真正值得注意的，往往不是单次情绪波动，而是它背后正在形成的长期趋势。",
    signature: "分析：你的自媒体账号",
    sceneTags: ["政策", "财经", "行业"],
    isDefault: 0
  },
  {
    id: "style_warm",
    name: "温和共情",
    description: "适合民生、教育、职场、生活方式类内容。",
    toneWords: ["温和", "共情", "有温度"],
    openingTemplate: "{{title}}之所以让很多人停下来关注，不只是因为它在热搜上，更因为它和很多人的真实生活有关。",
    structureTemplate: "事件 -> 人群感受 -> 影响 -> 温和收束",
    closingTemplate: "如果你也有类似感受，欢迎把真实想法写在评论区。{{signature}}",
    opinionTemplate: "很多热点能被记住，不是因为声音最大，而是因为它说中了普通人的日常处境。",
    signature: "记录：你的自媒体账号",
    sceneTags: ["民生", "教育", "职场"],
    isDefault: 0
  },
  {
    id: "style_data",
    name: "数据拆解",
    description: "适合科技、商业、平台变化类热点。",
    toneWords: ["数据感", "结构化", "理性"],
    openingTemplate: "{{title}}这波讨论里，最值得看的不是情绪，而是几个已经浮出水面的关键信号。",
    structureTemplate: "结论 -> 关键信号 -> 平台差异 -> 趋势判断",
    closingTemplate: "把变量看清楚，往往比站队更有价值。{{signature}}",
    opinionTemplate: "当数据和用户反馈开始同时指向同一个方向时，这件事往往已经不只是短期热点。",
    signature: "拆解：你的自媒体账号",
    sceneTags: ["科技", "商业", "平台"],
    isDefault: 0
  },
  {
    id: "style_story",
    name: "故事化表达",
    description: "适合人物、消费、生活趋势类内容。",
    toneWords: ["画面感", "代入感", "好读"],
    openingTemplate: "如果把{{title}}当成一个切口，你会发现，大家讨论的其实不只是这件事本身，而是一整种正在发生的变化。",
    structureTemplate: "场景开头 -> 事件推进 -> 变化含义 -> 收尾",
    closingTemplate: "热点会过去，但它留下的问题往往会继续存在。{{signature}}",
    opinionTemplate: "真正打动人的内容，不是把信息堆满，而是把变化讲得让人能感受到。",
    signature: "撰稿：你的自媒体账号",
    sceneTags: ["人物", "消费", "生活"],
    isDefault: 0
  }
];

export function seedDefaultStyles(): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO styles (
      id, name, description, toneWordsJson, openingTemplate, structureTemplate,
      closingTemplate, opinionTemplate, signature, sceneTagsJson, isDefault, createdAt, updatedAt
    ) VALUES (
      @id, @name, @description, @toneWordsJson, @openingTemplate, @structureTemplate,
      @closingTemplate, @opinionTemplate, @signature, @sceneTagsJson, @isDefault, @createdAt, @updatedAt
    )
  `);

  const timestamp = now();
  defaultStyles.forEach((style) => {
    insert.run({
      ...style,
      toneWordsJson: toJson(style.toneWords),
      sceneTagsJson: toJson(style.sceneTags),
      createdAt: timestamp,
      updatedAt: timestamp
    });
  });
}

function mapStyle(row: Record<string, unknown>): StyleTemplate {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description),
    toneWords: parseJson<string[]>(String(row.toneWordsJson), []),
    openingTemplate: String(row.openingTemplate),
    structureTemplate: String(row.structureTemplate),
    closingTemplate: String(row.closingTemplate),
    opinionTemplate: String(row.opinionTemplate),
    signature: String(row.signature),
    sceneTags: parseJson<string[]>(String(row.sceneTagsJson), []),
    isDefault: Number(row.isDefault),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt)
  };
}

export function listStyles(): StyleTemplate[] {
  const rows = db.prepare("SELECT * FROM styles ORDER BY isDefault DESC, createdAt ASC").all() as Record<
    string,
    unknown
  >[];
  return rows.map(mapStyle);
}

export function getStyleById(id: string): StyleTemplate | undefined {
  const row = db.prepare("SELECT * FROM styles WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? mapStyle(row) : undefined;
}

export function getDefaultStyle(): StyleTemplate {
  return listStyles()[0];
}

export function createStyle(payload: {
  name: string;
  description: string;
  toneWords: string[];
  openingTemplate: string;
  structureTemplate: string;
  closingTemplate: string;
  opinionTemplate: string;
  signature: string;
  sceneTags: string[];
}): StyleTemplate {
  const style: StyleTemplate = {
    id: createId("style"),
    ...payload,
    isDefault: 0,
    createdAt: now(),
    updatedAt: now()
  };
  db.prepare(`
    INSERT INTO styles (
      id, name, description, toneWordsJson, openingTemplate, structureTemplate,
      closingTemplate, opinionTemplate, signature, sceneTagsJson, isDefault, createdAt, updatedAt
    ) VALUES (
      @id, @name, @description, @toneWordsJson, @openingTemplate, @structureTemplate,
      @closingTemplate, @opinionTemplate, @signature, @sceneTagsJson, @isDefault, @createdAt, @updatedAt
    )
  `).run({
    ...style,
    toneWordsJson: toJson(style.toneWords),
    sceneTagsJson: toJson(style.sceneTags)
  });
  return style;
}

export function updateStyle(
  id: string,
  payload: Partial<Omit<StyleTemplate, "id" | "createdAt" | "updatedAt">>
): StyleTemplate {
  const current = getStyleById(id);
  if (!current) {
    throw new Error("风格模板不存在");
  }

  const next: StyleTemplate = {
    ...current,
    ...payload,
    updatedAt: now()
  };
  db.prepare(`
    UPDATE styles SET
      name = @name,
      description = @description,
      toneWordsJson = @toneWordsJson,
      openingTemplate = @openingTemplate,
      structureTemplate = @structureTemplate,
      closingTemplate = @closingTemplate,
      opinionTemplate = @opinionTemplate,
      signature = @signature,
      sceneTagsJson = @sceneTagsJson,
      isDefault = @isDefault,
      updatedAt = @updatedAt
    WHERE id = @id
  `).run({
    ...next,
    toneWordsJson: toJson(next.toneWords),
    sceneTagsJson: toJson(next.sceneTags)
  });
  return next;
}
