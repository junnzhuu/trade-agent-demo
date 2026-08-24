import { expertCatalog, type ExpertSkill } from "./expert-catalog";
import {
  merchantOperationAgents,
  quickComposerExperts,
  type SubAgentDefinition,
} from "./agent-skill-catalog";
import type { ComposerSkillOption } from "./composer-skills";

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

export function getHomeSuggestedQuestions(): ExpertSkill[] {
  return (
    expertCatalog.find((expert) => expert.id === "merchant")?.skills.slice(0, 6) ??
    []
  );
}

export function getHomeExpertById(
  expertId: string | undefined,
): SubAgentDefinition | undefined {
  if (!expertId) return undefined;
  return allHomeExperts.find((agent) => agent.id === expertId);
}
