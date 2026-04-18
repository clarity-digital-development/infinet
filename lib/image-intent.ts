// Detects messages asking for image or video generation.
// Returns the user's message (or a cleaned version) if it's a generation request,
// or null if it's not.

const GENERATION_VERBS = [
  'generate', 'create', 'draw', 'make', 'produce', 'design',
  'render', 'paint', 'illustrate', 'show me', 'give me',
]

const VISUAL_NOUNS = [
  'image', 'images', 'picture', 'pictures', 'photo', 'photos',
  'pic', 'pics', 'artwork', 'illustration', 'illustrations',
  'drawing', 'drawings', 'painting', 'paintings',
  'video', 'videos', 'clip', 'clips', 'gif', 'animation',
  'portrait', 'scene', 'logo', 'icon', 'banner', 'thumbnail',
]

// False-positive guard — these phrases use visual words metaphorically
const METAPHORICAL_PATTERNS = [
  /big picture/i,
  /in the picture/i,
  /(paint|painting) a picture of (the|what|how|why)/i, // "paint a picture of the situation"
  /mental image/i,
  /get the picture/i,
  /picture this/i,
]

export function detectImageIntent(message: string): boolean {
  if (!message || message.length < 4) return false

  const lower = message.toLowerCase()

  // Reject metaphorical usage
  if (METAPHORICAL_PATTERNS.some(p => p.test(lower))) return false

  // Build a regex of "verb ... noun" patterns
  const verbPattern = GENERATION_VERBS.map(v => v.replace(/\s+/g, '\\s+')).join('|')
  const nounPattern = VISUAL_NOUNS.join('|')

  // Allow up to 8 words between verb and noun, e.g. "generate me a high-quality image"
  const regex = new RegExp(
    `\\b(${verbPattern})\\b[\\w\\s,'"-]{0,50}\\b(${nounPattern})\\b`,
    'i'
  )

  return regex.test(lower)
}
