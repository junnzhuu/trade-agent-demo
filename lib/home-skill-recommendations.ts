import { expertCatalog, type ExpertSkill } from "./expert-catalog";

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
];

export function getHomeSkills(categoryId: HomeSkillCategoryId): ExpertSkill[] {
  const expert = expertCatalog.find((item) =>
    categoryId === "recommended" ? item.id === "merchant" : item.id === categoryId,
  );

  if (!expert) return [];

  if (categoryId === "recommended") {
    return recommendedMerchantSkillIds.flatMap((skillId) => {
      const skill = expert.skills.find((item) => item.id === skillId);
      return skill ? [skill] : [];
    });
  }

  return expert.skills.slice(0, 3);
}
