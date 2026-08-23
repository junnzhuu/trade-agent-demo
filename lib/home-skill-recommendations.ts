import { expertCatalog, type ExpertSkill } from "./expert-catalog";
import {
  merchantOperationAgents,
  quickComposerExperts,
  type SubAgentDefinition,
} from "./agent-skill-catalog";

export type HomeSkillCategoryId =
  | "merchant"
  | "product"
  | "acquisition"
  | "campaign"
  | "project";

export const homeSkillCategories: Array<{
  id: HomeSkillCategoryId;
  label: string;
}> = [
  { id: "merchant", label: "商家运营" },
  { id: "product", label: "商品运营" },
  { id: "acquisition", label: "招商" },
  { id: "campaign", label: "营销活动" },
  { id: "project", label: "项目管理" },
];

export function getHomeSkills(categoryId: HomeSkillCategoryId): ExpertSkill[] {
  const expert = expertCatalog.find((item) => item.id === categoryId);

  if (!expert) return [];

  return expert.skills.slice(0, 7);
}

export function getHomeSuggestedQuestions(
  categoryId: HomeSkillCategoryId,
): ExpertSkill[] {
  return getHomeSkills(categoryId).slice(0, 6);
}

const allHomeExperts = Array.from(
  new Map(
    [
      ...merchantOperationAgents,
      ...quickComposerExperts,
    ].map((agent) => [
      agent.id,
      agent,
    ]),
  ).values(),
);

export function getHomeExperts(
  categoryId: HomeSkillCategoryId,
): SubAgentDefinition[] {
  if (categoryId === "merchant") return merchantOperationAgents;
  if (categoryId === "product") return quickComposerExperts.slice(3, 4);
  if (categoryId === "project") return quickComposerExperts.slice(2, 3);
  if (categoryId === "acquisition" || categoryId === "campaign") {
    return quickComposerExperts.slice(1, 2);
  }
  return [];
}

export function getHomeExpertById(
  expertId: string | undefined,
): SubAgentDefinition | undefined {
  if (!expertId) return undefined;
  return allHomeExperts.find((agent) => agent.id === expertId);
}
