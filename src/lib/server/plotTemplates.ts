export interface PlotTemplate {
  name: string;
  beats: string[];
}

export const PLOT_TEMPLATES: Record<string, PlotTemplate> = {
  heros_journey: {
    name: "Hero's Journey",
    beats: [
      'Ordinary World',
      'Call to Adventure',
      'Refusal of the Call',
      'Meeting the Mentor',
      'Crossing the Threshold',
      'Tests, Allies, Enemies',
      'Approach to the Inmost Cave',
      'Ordeal',
      'Reward',
      'The Road Back',
      'Resurrection',
      'Return with the Elixir'
    ]
  },
  save_the_cat: {
    name: 'Save the Cat',
    beats: [
      'Opening Image',
      'Theme Stated',
      'Set-Up',
      'Catalyst',
      'Debate',
      'Break into Two',
      'B Story',
      'Fun and Games',
      'Midpoint',
      'Bad Guys Close In',
      'All Is Lost',
      'Dark Night of the Soul',
      'Break into Three',
      'Finale',
      'Final Image'
    ]
  },
  snowflake: {
    name: 'Snowflake Method',
    beats: [
      'One-sentence summary',
      'Expand to paragraph',
      'Character summaries',
      'Expand each sentence to paragraph',
      'One-page character descriptions',
      'Expand each paragraph to page',
      'Character charts',
      'Scene list',
      'Scene descriptions',
      'Write first draft'
    ]
  }
};

export function getTemplateBeats(templateId: string | null): string[] | null {
  if (!templateId) return null;
  return PLOT_TEMPLATES[templateId]?.beats ?? null;
}
