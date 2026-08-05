"use client";

import { Bot, Check, ClipboardList } from "lucide-react";
import { useMemo, useState } from "react";
import { expertCatalog } from "@/lib/expert-catalog";

export function ExpertSkillWorkspace({
  onUseSkill,
}: {
  onUseSkill: (expertId: string, skillId: string) => void;
}) {
  const [selectedExpertId, setSelectedExpertId] = useState(
    expertCatalog[0].id,
  );
  const [selectedSkillId, setSelectedSkillId] = useState(
    expertCatalog[0].skills[0].id,
  );

  const selectedExpert = useMemo(
    () =>
      expertCatalog.find((expert) => expert.id === selectedExpertId) ??
      expertCatalog[0],
    [selectedExpertId],
  );

  const selectExpert = (expertId: string) => {
    const expert =
      expertCatalog.find((item) => item.id === expertId) ??
      expertCatalog[0];
    setSelectedExpertId(expert.id);
    setSelectedSkillId(expert.skills[0].id);
  };

  return (
    <div className="expert-workspace">
      <h1>专家</h1>

      <ul
        aria-label="业务专家"
        className="expert-grid"
        data-tour-id="experts-and-skills"
      >
        {expertCatalog.map((expert) => {
          const selected = expert.id === selectedExpert.id;
          return (
            <li key={expert.id}>
              <button
                aria-pressed={selected}
                className={`expert-card ${selected ? "selected" : ""}`}
                data-testid={`expert-card-${expert.id}`}
                onClick={() => selectExpert(expert.id)}
                type="button"
              >
                <span className="expert-card-heading">
                  <span className="expert-avatar" aria-hidden="true">
                    <Bot size={22} strokeWidth={1.8} />
                  </span>
                  <strong>{expert.name}</strong>
                </span>
                <span className="expert-description">
                  {expert.description}
                </span>
                <span className="expert-ability-count">
                  {expert.abilityCount} 项能力
                </span>
                {selected && (
                  <span className="selection-check" aria-hidden="true">
                    <Check size={12} strokeWidth={2.4} />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <h2>技能</h2>
      <section
        aria-live="polite"
        aria-labelledby="skill-category-title"
        className="skills-panel"
      >
        <header className="skills-panel-header">
          <span className="skill-category-icon" aria-hidden="true">
            <ClipboardList size={18} strokeWidth={1.7} />
          </span>
          <div>
            <h3 id="skill-category-title">{selectedExpert.category}</h3>
            <p>{selectedExpert.categoryDescription}</p>
          </div>
        </header>

        <ul aria-label={`${selectedExpert.name}技能`} className="skill-grid">
          {selectedExpert.skills.map((skill) => {
            const selected = skill.id === selectedSkillId;
            return (
              <li key={skill.id}>
                <button
                  aria-label={`使用技能：${skill.name}`}
                  aria-pressed={selected}
                  className={`skill-card ${selected ? "selected" : ""}`}
                  data-testid={`skill-card-${skill.id}`}
                  onClick={() => {
                    setSelectedSkillId(skill.id);
                    onUseSkill(selectedExpert.id, skill.id);
                  }}
                  type="button"
                >
                  <strong>{skill.name}</strong>
                  <span>{skill.description}</span>
                  <span className="skill-use-overlay" aria-hidden="true">
                    使用该技能
                  </span>
                  {selected && (
                    <span
                      className="selection-check skill-check"
                      aria-hidden="true"
                    >
                      <Check size={11} strokeWidth={2.4} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
