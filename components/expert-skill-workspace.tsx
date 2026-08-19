"use client";

import { Bot, Check } from "lucide-react";
import { useMemo, useState } from "react";
import {
  getSceneStats,
  sceneCatalog,
  type AgentSkillDefinition,
  type SubAgentDefinition,
} from "@/lib/agent-skill-catalog";

type AgentSelection = "all" | string;
type SkillSort = "hot" | "latest";

export function ExpertSkillWorkspace({
  onSummonAgent,
  onUseSkill,
}: {
  onSummonAgent: (agent: SubAgentDefinition) => void;
  onUseSkill: (
    agent: SubAgentDefinition,
    skill: AgentSkillDefinition,
  ) => void;
}) {
  const [selectedSceneId, setSelectedSceneId] = useState(sceneCatalog[0].id);
  const [selectedAgentId, setSelectedAgentId] =
    useState<AgentSelection>("all");
  const [skillSort, setSkillSort] = useState<SkillSort>("hot");

  const selectedScene = useMemo(
    () =>
      sceneCatalog.find((scene) => scene.id === selectedSceneId) ??
      sceneCatalog[0],
    [selectedSceneId],
  );
  const selectedAgent = useMemo(
    () =>
      selectedAgentId === "all"
        ? null
        : (selectedScene.agents.find(
            (agent) => agent.id === selectedAgentId,
          ) ?? null),
    [selectedAgentId, selectedScene],
  );
  const visibleSkills = selectedAgent
    ? selectedAgent.skills.map((skill) => ({ agent: selectedAgent, skill }))
    : selectedScene.agents.flatMap((agent) =>
        agent.skills.map((skill) => ({ agent, skill })),
      );
  const selectedSceneStats = getSceneStats(selectedScene);
  const selectedSkillCount = selectedAgent
    ? selectedAgent.skills.length
    : selectedSceneStats.skillCount;
  const orderedSkills =
    skillSort === "hot" ? visibleSkills : [...visibleSkills].reverse();

  const selectScene = (sceneId: (typeof sceneCatalog)[number]["id"]) => {
    setSelectedSceneId(sceneId);
    setSelectedAgentId("all");
    setSkillSort("hot");
  };

  return (
    <div className="expert-workspace">
      <h1>场景</h1>

      <ul
        aria-label="业务场景"
        className="scene-grid"
        data-tour-id="experts-and-skills"
      >
        {sceneCatalog.map((scene) => {
          const selected = scene.id === selectedScene.id;
          const stats = getSceneStats(scene);
          return (
            <li key={scene.id}>
              <button
                aria-pressed={selected}
                className={`scene-card ${selected ? "selected" : ""}`}
                data-testid={`scene-card-${scene.id}`}
                onClick={() => selectScene(scene.id)}
                type="button"
              >
                <span className="scene-card-heading">
                  <strong>{scene.name}</strong>
                </span>
                <span className="scene-stat-line">
                  {stats.expertCount} 个专家 · {stats.skillCount} 项技能
                </span>
                {selected ? (
                  <span className="selection-check" aria-hidden="true">
                    <Check size={12} strokeWidth={2.4} />
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="expert-directory-heading">
        <h2>专家</h2>
        <span>{selectedSceneStats.expertCount} 个</span>
      </div>
      {selectedScene.status === "coming-soon" ? (
        <section className="scene-coming-soon" aria-live="polite">
          <span aria-hidden="true">
            <Bot size={24} strokeWidth={1.7} />
          </span>
          <h3>{selectedScene.name}能力建设中</h3>
          <p>该场景的专家与技能将在后续版本中接入。</p>
        </section>
      ) : (
        <section className="agent-skill-directory" aria-live="polite">
          <div
            aria-label={`${selectedScene.name}专家筛选`}
            className="agent-filter-tabs"
            role="tablist"
          >
            <button
              aria-selected={selectedAgentId === "all"}
              className={selectedAgentId === "all" ? "selected" : ""}
              onClick={() => setSelectedAgentId("all")}
              role="tab"
              type="button"
            >
              全部
            </button>
            {selectedScene.agents.map((agent) => (
              <button
                aria-selected={selectedAgentId === agent.id}
                className={selectedAgentId === agent.id ? "selected" : ""}
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                role="tab"
                type="button"
              >
                {agent.name}
              </button>
            ))}
          </div>

          <div
            className={`agent-introduction ${selectedAgent ? "summonable" : ""}`}
          >
            <div className="agent-introduction-copy">
              <strong>{selectedAgent?.name ?? "商家运营场景"}</strong>
              <p>
                {selectedAgent?.description ??
                  "覆盖商品经营分析、AB 实验、寄存、交易查询、订单、逆向等专业能力。"}
              </p>
            </div>
            {selectedAgent ? (
              <button
                aria-label={`召唤专家：${selectedAgent.name}`}
                className="summon-agent-button"
                onClick={() => onSummonAgent(selectedAgent)}
                type="button"
              >
                <Bot aria-hidden="true" size={15} strokeWidth={1.8} />
                召唤
              </button>
            ) : null}
          </div>

          <div className="skill-directory-heading">
            <h3>技能</h3>
            <span>{selectedSkillCount} 项</span>
            <div
              aria-label="技能排序"
              className="skill-sort-tabs"
              role="tablist"
            >
              <button
                aria-selected={skillSort === "hot"}
                className={skillSort === "hot" ? "selected" : ""}
                onClick={() => setSkillSort("hot")}
                role="tab"
                type="button"
              >
                最热
              </button>
              <button
                aria-selected={skillSort === "latest"}
                className={skillSort === "latest" ? "selected" : ""}
                onClick={() => setSkillSort("latest")}
                role="tab"
                type="button"
              >
                最新
              </button>
            </div>
          </div>

          {selectedAgent && selectedAgent.skills.length === 0 ? (
            <div className="agent-empty-state">
              <strong>该专家暂无挂载技能</strong>
              <span>可直接召唤专家处理相关问题</span>
            </div>
          ) : (
            <ul
              aria-label={
                selectedAgent
                  ? `${selectedAgent.name}技能`
                  : `${selectedScene.name}全部技能`
              }
              className={`skill-grid ${selectedAgent ? "" : "all-skills-grid"}`}
            >
              {orderedSkills.map(({ agent, skill }) => (
                <li key={skill.mountKey}>
                  <article className="skill-card">
                    <div className="skill-card-title-row">
                      <strong>{skill.name}</strong>
                      <span
                        aria-label={`所属专家：${agent.name}`}
                        className="skill-agent-tag"
                        title={agent.name}
                      >
                        {agent.name}
                      </span>
                    </div>
                    <span className="skill-description">
                      {skill.description}
                    </span>
                    <div className="skill-use-overlay">
                      <p>{skill.standardQuestion}</p>
                      <button
                        aria-label={`使用技能：${skill.name}`}
                        onClick={() => onUseSkill(agent, skill)}
                        type="button"
                      >
                        使用该技能
                      </button>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
