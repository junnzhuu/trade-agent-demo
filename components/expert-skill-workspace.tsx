"use client";

import { Bot, Check } from "lucide-react";
import { useMemo, useState } from "react";
import {
  getSceneStats,
  sceneCatalog,
  type AgentSkillDefinition,
  type SubAgentDefinition,
} from "@/lib/agent-skill-catalog";

export function ExpertSkillWorkspace({
  onUseSkill,
}: {
  onUseSkill: (
    agent: SubAgentDefinition,
    skill: AgentSkillDefinition,
  ) => void;
}) {
  const [selectedSceneId, setSelectedSceneId] = useState(sceneCatalog[0].id);

  const selectedScene = useMemo(
    () =>
      sceneCatalog.find((scene) => scene.id === selectedSceneId) ??
      sceneCatalog[0],
    [selectedSceneId],
  );

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
                onClick={() => setSelectedSceneId(scene.id)}
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

      <h2>专家 · 技能</h2>
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
          <div className="expert-skill-sections">
            {selectedScene.agents.map((agent) => {
              const headingId = `expert-skill-heading-${agent.id.replaceAll(" ", "-")}`;
              return (
                <section
                  aria-labelledby={headingId}
                  className="expert-skill-section"
                  key={agent.id}
                >
                  <header className="expert-skill-section-header">
                    <h3 id={headingId}>{agent.name}</h3>
                    <p>{agent.description}</p>
                  </header>

                  {agent.skills.length === 0 ? (
                    <div className="expert-skill-empty">
                      <strong>暂无可用技能</strong>
                      <span>能力建设中</span>
                    </div>
                  ) : (
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
                  )}
                </section>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
