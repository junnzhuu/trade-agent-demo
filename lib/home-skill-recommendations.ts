import { expertCatalog, type ExpertSkill } from "./expert-catalog";
import {
  merchantOperationAgents,
  quickComposerExperts,
  type SubAgentDefinition,
} from "./agent-skill-catalog";

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

const recommendedMerchantSkillIds = [
  "merchant-qualification",
  "merchant-violation",
  "direct-shipping",
  "product-diagnosis",
  "fee-order",
  "damage-order",
  "bid-permission",
];

const bannerMerchantSkillIds = [
  "merchant-qualification",
  "merchant-violation",
  "direct-shipping",
];

function getMerchantSkillsById(skillIds: string[]) {
  const merchantExpert = expertCatalog.find((expert) => expert.id === "merchant");
  if (!merchantExpert) return [];
  return skillIds.flatMap((skillId) => {
    const skill = merchantExpert.skills.find((item) => item.id === skillId);
    return skill ? [skill] : [];
  });
}

export function getHomeBannerSkills(): ExpertSkill[] {
  return getMerchantSkillsById(bannerMerchantSkillIds);
}

export function getHomeSkills(categoryId: HomeSkillCategoryId): ExpertSkill[] {
  const expert = expertCatalog.find((item) =>
    categoryId === "recommended" ? item.id === "merchant" : item.id === categoryId,
  );

  if (!expert) return [];

  if (categoryId === "recommended") {
    return getMerchantSkillsById(recommendedMerchantSkillIds);
  }

  return expert.skills.slice(0, 7);
}

const recommendedExperts = merchantOperationAgents
  .filter((agent) => agent.skills.length > 0)
  .slice(0, 7);

const allHomeExperts = Array.from(
  new Map(
    [
      ...recommendedExperts,
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
  if (categoryId === "recommended") return recommendedExperts;
  if (categoryId === "merchant") return merchantOperationAgents.slice(0, 7);
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
