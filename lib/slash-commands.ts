export interface SlashCommand {
  name: string           // typed after "/"
  label: string          // display name
  description: string
  prefix: string         // text to prepend to user input when command selected
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: 'summarize',
    label: '/summarize',
    description: 'Summarize the following content into key points',
    prefix: 'Summarize the following into clear key bullet points:\n\n',
  },
  {
    name: 'explain',
    label: '/explain',
    description: 'Explain a concept in simple terms',
    prefix: 'Explain the following in simple terms a beginner could understand:\n\n',
  },
  {
    name: 'translate',
    label: '/translate',
    description: 'Translate text to English',
    prefix: 'Translate the following to English:\n\n',
  },
  {
    name: 'code',
    label: '/code',
    description: 'Generate code from a description',
    prefix: 'Write clean, well-commented code for the following task. Include example usage:\n\n',
  },
  {
    name: 'rewrite',
    label: '/rewrite',
    description: 'Rewrite for clarity and flow',
    prefix: 'Rewrite the following for clarity, flow, and correctness while preserving meaning:\n\n',
  },
  {
    name: 'expand',
    label: '/expand',
    description: 'Expand on an idea with more detail',
    prefix: 'Expand on the following with more detail, examples, and nuance:\n\n',
  },
  {
    name: 'debug',
    label: '/debug',
    description: 'Debug code or explain an error',
    prefix: 'Debug the following. Explain what\'s wrong, why, and show a fix:\n\n',
  },
  {
    name: 'brainstorm',
    label: '/brainstorm',
    description: 'Generate ideas on a topic',
    prefix: 'Brainstorm 10 creative and varied ideas for the following:\n\n',
  },
]

export function matchSlashCommands(input: string): SlashCommand[] {
  if (!input.startsWith('/')) return []
  const query = input.slice(1).split(/\s/)[0].toLowerCase()
  if (query.length === 0) return SLASH_COMMANDS
  return SLASH_COMMANDS.filter(cmd => cmd.name.startsWith(query))
}

export function extractSlashCommand(input: string): { command: SlashCommand; rest: string } | null {
  if (!input.startsWith('/')) return null
  const match = input.match(/^\/(\w+)\s*(.*)$/s)
  if (!match) return null
  const [, name, rest] = match
  const command = SLASH_COMMANDS.find(c => c.name === name.toLowerCase())
  if (!command) return null
  return { command, rest }
}
