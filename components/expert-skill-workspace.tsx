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

export function ExpertSkillWorkspace({
  onUseSkill,
}: {
  onUseSkill: (
    agent: SubAgentDefinition,
    skill: AgentSkillDefinition,
  ) => void;
}) {
  const [selectedSceneId, setSelectedSceneId] = useState(sceneCatalog[0].id);
  const [selectedAgentId, setSelectedAgentId] =
    useState<AgentSelection>("all");

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
  const visibleAgentGroups = selectedAgent
    ? [selectedAgent]
    : selectedScene.agents;
  const selectedSkillCount = selectedAgent
    ? selectedAgent.skills.length
    : getSceneStats(selectedScene).skillCount;

  const selectScene = (sceneId: (typeof sceneCatalog)[number]["id"]) => {
    setSelectedSceneId(sceneId);
    setSelectedAgentId("all");
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
                  <span className="scene-avatar" aria-hidden="true">
                    <Bot size={21} strokeWidth={1.8} />
                  </span>
                  <strong>{scene.name}</strong>
                </span>
                <span className="scene-stat-line">
                  {stats.expertCount} 个专家 · {stats.skillCount} 项技能
                </span>
                <span className="scene-status">
                  {scene.status === "available" ? "能力已接入" : "能力建设中"}
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

      <h2>专家</h2>
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

          <div className="agent-introduction">
            <strong>{selectedAgent?.name ?? "商家运营场景"}</strong>
            <p>
              {selectedAgent?.description ??
                "覆盖商品经营分析、AB 实验、寄存、交易查询、订单、逆向等专业能力。"}
            </p>
          </div>

          <div className="skill-directory-heading">
            <h3>技能</h3>
            <span>{selectedSkillCount} 项</span>
          </div>

          {selectedAgent && selectedAgent.skills.length === 0 ? (
            <div className="agent-empty-state">
              <strong>该专家暂无可用技能</strong>
              <span>能力正在建设中</span>
            </div>
          ) : (
            <div className="agent-skill-groups">
              {visibleAgentGroups.map((agent) =>
                agent.skills.length > 0 ? (
                  <section className="agent-skill-group" key={agent.id}>
                    {selectedAgentId === "all" ? (
                      <header>
                        <h4>{agent.name}</h4>
                        <span>{agent.skills.length} 项技能</span>
                      </header>
                    ) : null}
                    <ul
                      aria-label={`${agent.name}技能`}
                      className="skill-grid"
                    >
                      {agent.skills.map((skill) => (
                        <li key={skill.mountKey}>
                          <article className="skill-card">
                            <strong>{skill.name}</strong>
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
                  </section>
                ) : null,
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
