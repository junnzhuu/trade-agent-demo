import { expertCatalog, type ExpertSkill } from "./expert-catalog";
import {
  merchantOperationAgents,
  quickComposerExperts,
  type SceneDefinition,
  type SubAgentDefinition,
} from "./agent-skill-catalog";
import type { ComposerSkillOption } from "./composer-skills";

export type HomeSkillCategoryId =
  | "recommended"
  | "merchant"
  | "product"
  | "acquisition"
  | "campaign"
  | "project";

export const homeSkillCategories: Array<{
  id: HomeSkillCategoryId;
  label: string;
}> = [
  { id: "recommended", label: "为你推荐" },
  { id: "merchant", label: "商家运营" },
  { id: "product", label: "商品运营" },
  { id: "acquisition", label: "招商" },
  { id: "campaign", label: "营销活动" },
  { id: "project", label: "项目管理" },
];

export function getHomeCategoryTargetScene(
  categoryId: HomeSkillCategoryId,
): SceneDefinition["id"] {
  return categoryId === "recommended" ? "merchant" : categoryId;
}

const frequentExpertIds = [
  "merchant-operation-agent",
  "data-analysis-agent",
  "ab-analysis-agent",
  "deposit-agent",
  "trade-data-query",
] as const;

const frequentSkillMounts = [
  ["data-analysis-agent", "spu_diagnosis"],
  ["ab-analysis-agent", "ab-analysis-assistant"],
  ["deposit-agent", "deposit-bill-basic-query"],
  ["trade-data-query", "dewu-trade-api-invoke"],
  ["trade-data-query", "commodity_data_query_guide"],
] as const;

const allHomeExperts = Array.from(
  new Map(
    [...merchantOperationAgents, ...quickComposerExperts].map((agent) => [
      agent.id,
      agent,
    ]),
  ).values(),
);

function requireExpert(expertId: string): SubAgentDefinition {
  const expert = allHomeExperts.find((agent) => agent.id === expertId);
  if (!expert) throw new Error(`Missing home expert: ${expertId}`);
  return expert;
}

export const frequentHomeExperts = frequentExpertIds.map(requireExpert);

export const frequentHomeSkills: ComposerSkillOption[] = frequentSkillMounts.map(
  ([expertId, skillId]) => {
    const expert = requireExpert(expertId);
    const skill = expert.skills.find((item) => item.id === skillId);
    if (!skill) throw new Error(`Missing home skill: ${expertId}/${skillId}`);
    return {
      id: skill.id,
      key: skill.mountKey,
      name: skill.name,
      description: skill.description,
      standardQuestion: skill.standardQuestion,
      expertId: expert.id,
      expertName: expert.name,
      expertLabel: expert.name,
    };
  },
);

function toComposerSkill(
  expertId: string,
  expertName: string,
  skill: ExpertSkill,
): ComposerSkillOption {
  return {
    id: skill.id,
    key: `${expertId}:${skill.id}`,
    name: skill.name,
    description: skill.description,
    standardQuestion: skill.standardQuestion,
    expertId,
    expertName,
    expertLabel: expertName,
  };
}

export function getHomeCategorySkills(
  categoryId: HomeSkillCategoryId,
): ComposerSkillOption[] {
  if (categoryId === "recommended") return frequentHomeSkills;
  const expert = expertCatalog.find((item) => item.id === categoryId);
  if (!expert) return [];
  return expert.skills
    .slice(0, 5)
    .map((skill) => toComposerSkill(expert.id, expert.name, skill));
}

export function getHomeSuggestedQuestions(
  categoryId: HomeSkillCategoryId = "recommended",
): ExpertSkill[] {
  const expertId = categoryId === "recommended" ? "merchant" : categoryId;
  return (
    expertCatalog.find((expert) => expert.id === expertId)?.skills.slice(0, 6) ??
    []
  );
}

export function getHomeExpertById(
  expertId: string | undefined,
): SubAgentDefinition | undefined {
  if (!expertId) return undefined;
  return allHomeExperts.find((agent) => agent.id === expertId);
}

export type ExpertComposerSelectionAction =
  | "fill_expert_question"
  | "preserve_text"
  | "preserve_compatible_skill"
  | "remove_incompatible_skill";

export function getExpertComposerSelectionAction({
  expertId,
  input,
  selectedSkillExpertId,
}: {
  expertId: string;
  input: string;
  selectedSkillExpertId?: string;
}): ExpertComposerSelectionAction {
  if (selectedSkillExpertId) {
    return selectedSkillExpertId === expertId
      ? "preserve_compatible_skill"
      : "remove_incompatible_skill";
  }
  return input.trim() ? "preserve_text" : "fill_expert_question";
}
