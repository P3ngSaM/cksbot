/**
 * Skills View - 技能视图
 */

import { html } from 'lit';
import type { Skill } from '../types/index.js';

interface SkillsProps {
  skills: Skill[];
  onToggle: (id: string, enabled: boolean) => void;
}

export function renderSkills(props: SkillsProps) {
  const { skills, onToggle } = props;

  // 按类别分组
  const categories = new Map<string, Skill[]>();
  for (const skill of skills) {
    const cat = skill.category || '其他';
    if (!categories.has(cat)) {
      categories.set(cat, []);
    }
    categories.get(cat)!.push(skill);
  }

  const categoryIcons: Record<string, string> = {
    '计算机控制': '💻',
    'macOS自动化': '🍎',
    '视觉': '👁️',
    '记忆': '🧠',
    '定时任务': '⏰',
    '飞书': '📱',
    '其他': '🔧',
  };

  return html`
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">🛠️ 技能管理</h3>
        <div>
          <span class="badge badge-success">${skills.filter(s => s.enabled).length} 启用</span>
          <span class="badge badge-info" style="margin-left: var(--spacing-xs);">${skills.length} 总计</span>
        </div>
      </div>

      ${skills.length === 0
        ? html`
          <div class="empty-state">
            <div style="font-size: 3rem;">🛠️</div>
            <h3>加载技能中...</h3>
          </div>
        `
        : html`
          ${[...categories.entries()].map(([category, categorySkills]) => html`
            <div style="margin-bottom: var(--spacing-lg);">
              <h4 style="display: flex; align-items: center; gap: var(--spacing-sm); margin-bottom: var(--spacing-md); color: var(--color-text-secondary);">
                <span>${categoryIcons[category] || '🔧'}</span>
                <span>${category}</span>
                <span class="badge badge-info" style="font-weight: normal;">${categorySkills.length}</span>
              </h4>
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--spacing-md);">
                ${categorySkills.map(skill => html`
                  <div class="card" style="padding: var(--spacing-md);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                      <div style="flex: 1;">
                        <div style="font-weight: 600; margin-bottom: var(--spacing-xs);">
                          ${skill.name}
                        </div>
                        <div style="font-size: 0.875rem; color: var(--color-text-secondary);">
                          ${skill.description}
                        </div>
                      </div>
                      <label class="switch">
                        <input
                          type="checkbox"
                          ?checked=${skill.enabled}
                          @change=${(e: Event) => onToggle(skill.id, (e.target as HTMLInputElement).checked)}
                        />
                        <span class="switch-slider"></span>
                      </label>
                    </div>
                  </div>
                `)}
              </div>
            </div>
          `)}
        `
      }
    </div>
  `;
}
