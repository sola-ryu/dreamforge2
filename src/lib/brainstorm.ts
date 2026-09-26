import { ENTITY_FIELDS } from '$lib/entityFields';
import type { EntityType } from '$lib/types';

export interface BrainstormPrompt {
  id: string;
  category: string;
  question: string;
  field?: string;
  suggestions?: string[];
}

const VIRTUES = [
  'loyal',
  'brave',
  'patient',
  'honest',
  'generous',
  'curious',
  'disciplined',
  'compassionate',
  'resourceful',
  'witty',
  'humble',
  'protective'
];

const FLAWS = [
  'arrogant',
  'reckless',
  'jealous',
  'stubborn',
  'cowardly',
  'vain',
  'impulsive',
  'secretive',
  'cynical',
  'greedy',
  'self-righteous',
  'distrustful'
];

const QUIRKS = [
  'hums when nervous',
  'collects trinkets',
  'never sits with back to a door',
  'talks to animals',
  'counts steps',
  'terrible at lying',
  'always hungry',
  'quotes old proverbs',
  'overly formal',
  'fidgets with a ring',
  'sleeps very little',
  'laughs at the wrong moments'
];

const SPECIES_TRAITS = [
  'nocturnal',
  'long-lived',
  'telepathic',
  'amphibious',
  'hive-minded',
  'shapeshifting',
  'cold-blooded',
  'winged',
  'venomous',
  'photosynthetic',
  'nomadic',
  'solitary'
];

const ITEM_PROPERTIES = [
  'cursed',
  'sentient',
  'unbreakable',
  'glows in darkness',
  'bound to a bloodline',
  'forged from meteorite',
  'hums near danger',
  'cannot be sold',
  'slowly corrupting',
  'key to something',
  'counterfeit',
  'one of a pair'
];

export const BRAINSTORM_PROMPTS: Record<EntityType, BrainstormPrompt[]> = {
  character: [
    {
      id: 'virtues',
      category: 'Traits',
      question: 'What are their best qualities?',
      field: 'traits',
      suggestions: VIRTUES
    },
    {
      id: 'flaws',
      category: 'Traits',
      question: 'What flaws get them into trouble?',
      field: 'traits',
      suggestions: FLAWS
    },
    {
      id: 'quirks',
      category: 'Traits',
      question: 'What quirks or habits make them memorable?',
      field: 'traits',
      suggestions: QUIRKS
    },
    {
      id: 'want',
      category: 'Drive',
      question: 'What do they want more than anything?',
      field: 'motivations'
    },
    {
      id: 'need',
      category: 'Drive',
      question: 'What do they actually need, even if they do not realize it?',
      field: 'motivations'
    },
    { id: 'fear', category: 'Drive', question: 'What are they most afraid of?' },
    {
      id: 'lie',
      category: 'Drive',
      question: 'What false belief about themselves or the world do they hold?'
    },
    {
      id: 'wound',
      category: 'Past',
      question: 'What event from their past still hurts?',
      field: 'backstory'
    },
    {
      id: 'childhood',
      category: 'Past',
      question: 'Describe a formative moment from their childhood.',
      field: 'backstory'
    },
    { id: 'secret', category: 'Past', question: 'What secret are they keeping, and from whom?' },
    {
      id: 'first-impression',
      category: 'Surface',
      question: 'What do people notice first when they walk into a room?'
    },
    { id: 'voice', category: 'Surface', question: 'How do they talk? Any phrases they overuse?' },
    {
      id: 'possession',
      category: 'Surface',
      question: 'What object would they run back into a burning building for?'
    },
    {
      id: 'betrayal',
      category: 'Relationships',
      question: 'Who would they betray, and what would it take?'
    },
    {
      id: 'trust',
      category: 'Relationships',
      question: 'Who do they trust completely? Are they right to?'
    },
    {
      id: 'bad-day',
      category: 'Scenarios',
      question: 'What does a truly bad day look like for them?'
    },
    {
      id: 'line',
      category: 'Scenarios',
      question: 'What line will they never cross? What would push them over it?'
    }
  ],
  organization: [
    { id: 'purpose', category: 'Identity', question: 'What does this group claim to exist for?' },
    {
      id: 'true-goal',
      category: 'Identity',
      question: 'What does it actually pursue behind closed doors?'
    },
    { id: 'founding', category: 'History', question: 'How and why was it founded?' },
    {
      id: 'recruit',
      category: 'Membership',
      question: 'How do people join, and what does initiation look like?'
    },
    {
      id: 'leave',
      category: 'Membership',
      question: 'What happens to someone who tries to leave?'
    },
    {
      id: 'resources',
      category: 'Power',
      question: 'What does it own or control?',
      field: 'ownership'
    },
    { id: 'enemies', category: 'Power', question: 'Who opposes it, and why?' },
    { id: 'reputation', category: 'Perception', question: 'What do ordinary people say about it?' },
    {
      id: 'symbols',
      category: 'Perception',
      question: 'What symbols, colors, or uniforms identify its members?'
    },
    {
      id: 'rift',
      category: 'Conflict',
      question: 'What internal disagreement could split it apart?'
    }
  ],
  location: [
    { id: 'senses', category: 'Atmosphere', question: 'What does it look, sound, and smell like?' },
    { id: 'mood', category: 'Atmosphere', question: 'How does a stranger feel on arrival?' },
    {
      id: 'landscape',
      category: 'Geography',
      question: 'What is the terrain and what lies beneath it?',
      field: 'geology'
    },
    {
      id: 'life',
      category: 'Geography',
      question: 'What plants and animals thrive here?',
      field: 'ecosystem'
    },
    {
      id: 'weather',
      category: 'Geography',
      question: 'What is the weather like, and how do seasons change it?'
    },
    { id: 'who-lives', category: 'People', question: 'Who lives here, and who is unwelcome?' },
    { id: 'economy', category: 'People', question: 'How do people here make a living?' },
    { id: 'landmark', category: 'Features', question: 'What landmark would appear on a postcard?' },
    {
      id: 'hidden',
      category: 'Features',
      question: 'What is hidden here that few people know about?'
    },
    { id: 'danger', category: 'Features', question: 'What makes this place dangerous?' },
    {
      id: 'past',
      category: 'History',
      question: 'What happened here that people still talk about?'
    }
  ],
  culture: [
    {
      id: 'values',
      category: 'Beliefs',
      question: 'What does this culture value above all else?',
      field: 'values'
    },
    {
      id: 'taboo',
      category: 'Beliefs',
      question: 'What is taboo, and what happens to those who break it?'
    },
    {
      id: 'afterlife',
      category: 'Beliefs',
      question: 'What do they believe happens after death?',
      field: 'mythos'
    },
    {
      id: 'creation',
      category: 'Beliefs',
      question: 'How do they explain the origin of the world?',
      field: 'mythos'
    },
    {
      id: 'coming-of-age',
      category: 'Rituals',
      question: 'How does someone become an adult?',
      field: 'rituals'
    },
    {
      id: 'celebration',
      category: 'Rituals',
      question: 'What is their most important celebration?',
      field: 'rituals'
    },
    { id: 'greeting', category: 'Daily Life', question: 'How do people greet each other?' },
    { id: 'food', category: 'Daily Life', question: 'What is a typical meal, and who eats first?' },
    {
      id: 'languages',
      category: 'Daily Life',
      question: 'What languages or dialects do they speak?',
      field: 'languages'
    },
    { id: 'outsiders', category: 'Relations', question: 'How do they treat outsiders?' },
    {
      id: 'art',
      category: 'Expression',
      question: 'What art, music, or stories are they known for?'
    }
  ],
  species: [
    {
      id: 'traits',
      category: 'Nature',
      question: 'What sets this species apart?',
      field: 'traits',
      suggestions: SPECIES_TRAITS
    },
    {
      id: 'body',
      category: 'Biology',
      question: 'Describe their body, senses, and lifespan.',
      field: 'biology'
    },
    {
      id: 'reproduce',
      category: 'Biology',
      question: 'How do they reproduce and raise their young?',
      field: 'biology'
    },
    { id: 'diet', category: 'Biology', question: 'What do they eat, and what eats them?' },
    { id: 'weakness', category: 'Biology', question: 'What is their greatest physical weakness?' },
    {
      id: 'variants',
      category: 'Variation',
      question: 'What subtypes, breeds, or castes exist?',
      field: 'subtypes'
    },
    { id: 'society', category: 'Society', question: 'How do they organize themselves?' },
    { id: 'others', category: 'Society', question: 'How do other species see them?' },
    {
      id: 'impact',
      category: 'World',
      question: 'How has the world changed because they exist?',
      field: 'influence'
    },
    { id: 'origin', category: 'World', question: 'Where did they come from?' }
  ],
  item: [
    {
      id: 'properties',
      category: 'Nature',
      question: 'What is unusual about it?',
      field: 'properties',
      suggestions: ITEM_PROPERTIES
    },
    { id: 'appearance', category: 'Nature', question: 'What does it look and feel like to hold?' },
    { id: 'maker', category: 'History', question: 'Who made it, and why?' },
    { id: 'journey', category: 'History', question: 'Whose hands has it passed through?' },
    {
      id: 'matters',
      category: 'Significance',
      question: 'Why does it matter to the story?',
      field: 'significance'
    },
    {
      id: 'want',
      category: 'Significance',
      question: 'Who wants it, and what would they do to get it?'
    },
    { id: 'cost', category: 'Significance', question: 'What does using it cost?' },
    { id: 'destroy', category: 'Significance', question: 'What would happen if it were destroyed?' }
  ],
  note: [
    { id: 'core', category: 'Idea', question: 'Sum up this idea in one sentence.' },
    {
      id: 'why',
      category: 'Idea',
      question: 'Why is this interesting? What excites you about it?'
    },
    { id: 'what-if', category: 'Idea', question: 'What if the opposite were true?' },
    {
      id: 'consequence',
      category: 'Impact',
      question: 'What is the most surprising consequence of this?'
    },
    { id: 'who', category: 'Impact', question: 'Who is most affected by this?' },
    { id: 'conflict', category: 'Impact', question: 'What conflict could this create?' },
    { id: 'open', category: 'Open Questions', question: 'What do you still not know about this?' }
  ]
};

export function getPrompts(type: EntityType): BrainstormPrompt[] {
  return BRAINSTORM_PROMPTS[type] ?? [];
}

export function getPrompt(type: EntityType, id: string): BrainstormPrompt | undefined {
  return getPrompts(type).find((p) => p.id === id);
}

export function isTagPrompt(type: EntityType, prompt: BrainstormPrompt): boolean {
  if (!prompt.field) return false;
  return ENTITY_FIELDS[type].some((f) => f.key === prompt.field && f.type === 'tags');
}

export function splitTags(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface PromptTarget {
  body: string;
  frontmatter: Record<string, unknown>;
}

export function applyPromptAnswer(
  type: EntityType,
  target: PromptTarget,
  prompt: BrainstormPrompt,
  answer: string
): Record<string, unknown> {
  const text = answer.trim();
  const answered = Array.isArray(target.frontmatter.answeredPrompts)
    ? (target.frontmatter.answeredPrompts as string[])
    : [];
  const data: Record<string, unknown> = {
    answeredPrompts: answered.includes(prompt.id) ? answered : [...answered, prompt.id]
  };

  const fieldDef = prompt.field
    ? ENTITY_FIELDS[type].find((f) => f.key === prompt.field)
    : undefined;

  if (fieldDef?.type === 'tags') {
    const existing = target.frontmatter[fieldDef.key];
    const current = Array.isArray(existing) ? (existing as string[]) : [];
    const seen = new Set(current.map((t) => t.toLowerCase()));
    const added = splitTags(text).filter((t) => {
      const key = t.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    data[fieldDef.key] = [...current, ...added];
  } else if (fieldDef?.type === 'text') {
    data[fieldDef.key] = text;
  } else if (fieldDef) {
    const existing = target.frontmatter[fieldDef.key];
    const current = typeof existing === 'string' ? existing.trim() : '';
    data[fieldDef.key] = current ? `${current}\n\n${text}` : text;
  } else {
    const current = target.body.trimEnd();
    const section = `### ${prompt.question}\n\n${text}\n`;
    data.body = current ? `${current}\n\n${section}` : section;
  }

  return data;
}
