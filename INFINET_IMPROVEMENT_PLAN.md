# Infinet Improvement Plan — April 2026

A strategic research document synthesizing three parallel deep-dives: Venice.ai's full API surface, web-search API landscape, and a UI/UX audit of the current Infinet app. The goal: turn Infinet from a functional-but-generic AI chat wrapper into a genuinely differentiated product.

---

## Executive Summary

Infinet today is **functionally complete but strategically underplayed**. The product positions itself as the "unfiltered" alternative to ChatGPT, but the visual design is corporate, the feature set is a strict subset of what competitors offer, and — most critically — **the Premium and Limitless tiers advertise capabilities that don't actually exist in the product** ("All AI models access", "Image generation included"). Users are paying for promises the app doesn't keep.

**Scope clarification:** Image generation, video, and character-based/persona features are **out of scope** for Infinet. Those capabilities belong to the sister product **artifacial.io**. Infinet stays focused on being the best text-first private AI chat. The homepage now cross-promotes artifacial.io for users who need visual generation.

Three strategic moves close the gap:

1. **Activate the text-relevant slice of Venice's API.** Infinet currently uses ~5% of what Venice offers. Web search, voice (TTS/STT), vision-for-analysis, embeddings, tool calling, reasoning control, and E2EE are all available via the same key — and all are text-modality extensions, not visual generation. Most are cheap enough to ship broadly ($0.01/search, $3.50 per 1M TTS characters, $0.36/hour transcription).

2. **Embrace the "unfiltered + private" positioning in design and feature choice.** Venice's E2EE models — where Venice itself can't read the prompts — are a genuine competitive moat. No mainstream competitor can match this. Lean into it visually and in copy.

3. **Restructure pricing around credits, not tokens.** "Tokens" is abstract; users can't predict cost. A credit system (1 message = 1 credit, 1 web search = 1 credit, 1 voice minute = 2 credits) is intuitive, scales across modalities, and matches what new premium features will add.

The three moves together address the customer-facing dishonesty, unlock multi-modal features your competitors don't have at the uncensored tier, and fix the homepage/chat UX weak spots identified in the audit.

**Projected impact:**
- Close the "advertised features vs delivered features" gap (currently customer-facing dishonesty)
- Add voice, vision, image generation, and web search to all paid tiers without breaking cost structure
- Introduce one genuinely differentiating feature (E2EE private chat) that no ChatGPT/Claude/Grok tier offers
- Reduce sidebar/landing page genericness via targeted visual/copy updates

---

## Part 1 — Current State Assessment

### What Actually Exists Today

| Capability | Status | Notes |
|---|---|---|
| Streaming text chat | ✅ Built | Uses Venice `venice-uncensored` + fallback to `glm-4.7-flash-heretic` |
| Markdown rendering | ✅ Built | `react-markdown` + `remark-gfm` |
| Code syntax highlighting | ✅ Built | `react-syntax-highlighter` |
| Image generation (in-product) | ⚠️ Built but being removed | Moved to sister product [artifacial.io](https://artifacial.io); Infinet links out |
| File uploads (text analysis) | ✅ Built | 10MB limit, images + text files — but models currently can't "see" images (see §2.3) |
| Chat organization (folders/projects) | ✅ Built | |
| Share/export chats | ✅ Built | Markdown + JSON export |
| Dark/light theme | ✅ Built | `next-themes` |
| Pricing + Stripe subscriptions | ✅ Built (buggy — see subscription activation work) |
| Clerk auth | ✅ Built | |

### What's Advertised But Not Delivered

This is the highest-priority issue in the entire product. From [lib/subscription-tiers.ts](lib/subscription-tiers.ts):

**Premium tier ($50/mo) promises:**
- "All AI models access" — chat route only has 2 models hardcoded
- "Image generation included" — being removed from Infinet entirely; artifacial.io handles image generation
- "Email support" — no support address or system in place

**Limitless tier ($150/mo) promises:**
- "Priority processing speed" — no routing logic differentiates tiers
- "Advanced analytics" — no analytics dashboard exists
- "API access" — no public API endpoint exists
- "Custom integrations" — no integration surface exists

**Verdict**: Every paid tier sells features that aren't built. This is the single biggest item on the roadmap — not for competitive reasons but because it's currently customer-facing dishonesty that erodes trust once users realize.

### Technical Debt Worth Noting

1. **Two parallel DB access files**: [lib/database.ts](lib/database.ts) and [lib/database/db.ts](lib/database/db.ts) — likely redundant. Consolidate.
2. **`@supabase/supabase-js` still installed** despite migrating off Supabase. Clean up.
3. **`@vercel/postgres` still installed** despite migrating off Vercel. Clean up.
4. **`tiktoken` is installed but not used** — chat route uses rough estimation (`words * 0.75`) instead of real tokenization. Using `tiktoken` would give accurate billing.
5. **`openai-edge` installed** but no OpenAI integration. Probably stale.
6. **No observability** — no Sentry, no PostHog, no logging service. Every bug we've hit would've been caught in minutes with basic tracing.

---

## Part 2 — Venice.ai Platform Capabilities You're Not Using

You already pay for a Venice API key. The key unlocks **a dozen+ endpoints** that your app ignores. Here's the full catalog with pricing and priority.

### 2.1 Web Search (built-in, passive)

Venice's chat endpoint accepts `venice_parameters.enable_web_search`. Three modes: `off` / `on` / `auto`. With `enable_web_citations: true`, responses come back with inline superscript citations and a `web_search_citations` array of `{ title, url, content, date }` objects — ready to render as a source strip.

**Pricing:** $10 per 1,000 searches = **$0.01/search**.

**Why this matters:** This is cheaper than Tavily ($8/1K) and Brave ($5/1K plus integration overhead) AND requires zero additional infrastructure. It works on your existing models.

**Recommendation:** Enable by default with `auto` mode. Add a manual "Search web" toggle in the chat input for when the user wants to force it. Show a sources strip above each AI message that used search results.

### 2.2 Web Scraping (URL ingestion)

`venice_parameters.enable_web_scraping: true` auto-detects up to 5 URLs in the user message and ingests their full content via Firecrawl before responding.

**Pricing:** $10 per 1,000 URLs = $0.01/URL.

**Recommendation:** Enable by default. Game-changing for "summarize this article" and "what does this page say" queries.

### 2.3 Vision (image analysis)

Your current models (`venice-uncensored`, `glm-4.7-flash-heretic`) **do not support vision**. Users can upload images but the model literally cannot see them. This is why your file upload feature feels half-finished.

**Fix:** Route image-containing messages to a vision-capable model:
- **Qwen3-VL 235B** (Venice's default vision router) — free on chat tier pricing
- **Qwen 3.5 9B** (now vision-capable as of March 2026) — cheaper
- **Gemini 3 Flash** — multimodal including audio+video

**Recommendation:** Detect image attachments in the chat route and switch models transparently. Don't expose model picking to users for this case — just make it work.

### 2.4 Image Generation — OUT OF SCOPE

Image generation, editing, and upscaling are being **removed from Infinet** and handled entirely by the sister product [artifacial.io](https://artifacial.io). Infinet's homepage now links users to artifacial.io for visual generation needs. This keeps Infinet focused on text-first private chat and avoids product overlap.

**Action items:**
- Remove the `ImageGenerator.tsx` component and its route handlers (or hide behind a feature flag pointing to artifacial.io)
- Update the Premium tier copy to remove the "Image generation included" claim
- Keep the file upload feature for image-as-input (vision/analysis use cases — see §2.3)

### 2.5 Text-to-Speech (read aloud)

Endpoint: `POST /api/v1/audio/speech`. 9 model families, 100+ voices, multi-language.

**Pricing:** Kokoro (default) is **$3.50 per 1M characters**. A typical 500-character AI response costs **$0.00175**.

**Recommendation:** Add a "Read aloud" button on every AI message. At this cost it's effectively free to ship broadly. For Premium+ tiers, expose ElevenLabs v3 voices (more expensive but dramatically better).

### 2.6 Speech-to-Text (voice input)

Endpoint: `POST /api/v1/audio/transcriptions`. Models: Parakeet (default), Whisper, Wizper, ElevenLabs Scribe v2.

**Pricing:** **$0.0001/audio second = $0.36/hour.**

**Recommendation:** Add a mic button to chat input. Record in-browser, send to transcription, show the text in the input field before auto-sending. This is a core accessibility feature that every competitor has and Infinet doesn't.

### 2.7 Characters / Personas — OUT OF SCOPE

Venice has a 100+ character catalog (`GET /api/v1/characters`), but persona-based interaction is a better fit for artifacial.io's product shape (visual personas with images). Keeping character selection out of Infinet reinforces the text-first focus and avoids splitting attention across products.

If you later decide to use personas inside Infinet, do it as hidden "modes" (Analytical / Creative / Technical) mapped to system prompts — not a browseable character catalog.

### 2.8 Embeddings + RAG

Endpoint: `POST /api/v1/embeddings`. Many models, default BGE-M3 at **$0.15 per 1M tokens**.

**Use cases:**
- Semantic search across the user's chat history ("find the conversation where we talked about the Python bug")
- RAG over user-uploaded documents (they upload a PDF, it gets chunked and embedded, future questions retrieve relevant chunks)
- "Related chats" suggestions in the sidebar

**Recommendation:** Phase 3 work. Requires adding a vector store (pgvector in your Railway Postgres is fine). Doable but substantial.

### 2.9 E2EE Models — The Privacy Moat

`venice_parameters.enable_e2ee: true` on supported models means **Venice literally cannot read the conversation**. This is a genuine competitive differentiator that no ChatGPT/Claude/Grok/Gemini tier offers.

**Recommendation:** Make this a flagship Premium/Limitless feature. Market it hard:
- "Private Mode" toggle in chat
- Lock icon on the chat header when E2EE is on
- Dedicated landing page section: "Your conversations are encrypted end-to-end. Not even we can read them."

This is the single biggest positioning win available.

### 2.10 Tool Calling + Structured Output

Venice supports OpenAI-format function calling and structured output (JSON schema with strict mode). This unlocks:
- Agent-like flows (the AI can call your own APIs)
- Reliable JSON responses for integrations (fulfills the Limitless "API access" promise)
- "Actions" button in chat that triggers backend workflows

Models confirmed with tool calling: Claude Sonnet 4.6, DeepSeek V3.2, Llama Maverick, GPT-5.x, Grok 4.1 Fast.

### 2.11 Reasoning Control

Models with reasoning support (`reasoning.effort: none | low | medium | high | max`) now accept a new `max_reasoning_effort` parameter. Reasoning tokens appear separately in `usage.completion_tokens_details.reasoning_tokens`.

**Recommendation:** Expose a "Depth" slider in chat input — Quick / Balanced / Deep — which maps to reasoning effort. Premium-tier feature.

---

## Part 3 — Web Search Strategy

The user asked specifically about Brave / DuckDuckGo for real-time info. Here's the verdict after comparing 6 providers.

### Decision Matrix

| Provider | Price/1K | Free tier | Privacy | LLM-ready output | Integration effort |
|---|---|---|---|---|---|
| **Venice built-in** | $0.01/q ($10/1K) | Included with Venice | ✅ | ✅ citations | **Zero — toggle a param** |
| Tavily | $8 (basic) | 1K/mo | ✅ | ✅ | Low |
| Brave | $5 | ~1K via credit | ✅ (independent index) | Partial | Low |
| Exa | $5–15 | 1K/mo | ✅ (semantic) | ✅ | Low |
| SerpAPI | $9–25 | 250/mo | ❌ (Google-derived) | ❌ | Medium |
| DuckDuckGo | Free | Unlimited | ✅ | ❌ (not a real search API) | — |

### Recommendation: **Start with Venice built-in search. Wrap it behind an abstraction.**

Rationale:
1. **Same price or cheaper** than Tavily/Brave at $0.01/query.
2. **Zero additional infrastructure** — it's a param on a call you already make.
3. **Citations are automatic** and come back in a clean shape.
4. **Streaming-aware** — citations arrive in the first SSE chunk so the UI can render a source strip before tokens stream in.

**However**, wrap it behind a `searchProvider` interface in code so that:
- If you ever diversify models away from Venice, you swap the provider
- You can A/B test Venice vs Tavily on result quality
- Advanced users on Limitless tier could get Brave or Tavily as an option

Architecture sketch:
```
interface SearchProvider {
  search(query: string, options): Promise<SearchResult[]>
}

class VeniceInlineSearch implements SearchProvider { ... }  // default
class TavilySearch implements SearchProvider { ... }         // optional
class BraveSearch implements SearchProvider { ... }          // optional
```

Caller code stays the same; the provider selection happens based on tier/config.

**Skip:** DuckDuckGo (not a real search API — only instant answers), SerpAPI (defeats the "non-catered" goal because it's just Google results).

---

## Part 4 — Chat UI Modernization

The audit identified 30+ specific UX issues. Here are the highest-impact clusters.

### 4.1 Must-Fix (Basic Usability Gaps)

| Issue | File | Fix |
|---|---|---|
| No message timestamps | `components/chat/MessageList.tsx` | Add subtle timestamp on hover; group by "Today / Yesterday / This week" |
| Mobile tap targets too small (8×8 buttons) | `components/chat/ChatInterface.tsx` | Bump to 44×44 minimum |
| Code block copy button only on hover | `components/chat/CodeBlock.tsx` | Always visible; flash green on success |
| No message actions | `components/chat/MessageList.tsx` | Right-click menu: Copy, Edit (user msgs), Delete, Regenerate |
| Chat title truncated at 4 words | `components/chat/ChatSidebar.tsx` | Show full title on hover; add last-activity time |
| Aggressive `...` truncation | `ChatSidebar.tsx` | Use CSS `text-overflow: ellipsis` instead of JS slicing |
| No typing/generating indicator | `MessageList.tsx` | Animated dots while streaming |
| No retry on failed messages | `ChatInterface.tsx` | "Retry" button on failed AI responses |

### 4.2 High-Impact Feature Adds

1. **Slash commands** (`/summarize`, `/explain`, `/translate`, `/code`, `/image`). Use the Discord/Slack pattern — type `/`, see a command palette. Power users love it; competitors have it.

2. **Voice input button** — mic icon in chat input, record in browser, send to Venice STT, populate input field. $0.36/hour is effectively free.

3. **Read-aloud button** — speaker icon on every AI message. Click → Venice TTS → plays inline. $3.50 per 1M characters is effectively free.

4. **Drag-and-drop file upload** — current upload requires clicking an icon. Modern chat apps accept drops anywhere in the chat area.

5. **Auto-title chats from first message** — currently chats default to timestamps. Use Venice to summarize the first exchange into a 5-word title. One call per new chat, negligible cost.

6. **Web search toggle in input** — small globe icon, click to force web search for the next message. Visual source strip above AI responses that used search.

7. **Model picker in Premium+** — since you advertise "all AI models access", actually let Premium users pick between your supported models. Suggested roster:
   - `venice-uncensored` (default, all tiers)
   - `olafangensan-glm-4.7-flash-heretic` (fallback, all tiers)
   - `qwen-3-vl-235b` (vision, Starter+)
   - `claude-sonnet-4-6` (Premium+, extended reasoning)
   - `deepseek-v3.2` (Premium+, coding)
   - `gpt-5-4` (Limitless only, flagship)

### 4.3 Differentiators (Unique to Infinet)

1. **Private Mode (E2EE)** — visible lock icon in chat header when on. Premium+ tier. Dedicated short landing-page section explaining what it means. **This is the flagship differentiator.**

2. **Depth slider** — Quick / Balanced / Deep. Maps to reasoning effort. Pair with a "reasoning visible" toggle so Premium users can see the chain-of-thought if they want.

3. **Conversation branching** — ability to fork a conversation from any message. Stated as "low priority" in the audit but would be genuinely unique; no major competitor has it.

4. **Cross-product flow to artifacial.io** — when a user asks Infinet to "draw/generate/create an image", have the model respond with a friendly pointer to artifacial.io (could be prompt-engineered or a classifier + canned response).

### 4.4 Pricing / Billing UX

- Remove the fake "strikethrough" prices on the pricing page (they're not real — nothing saves $50)
- Add a feature comparison matrix showing exactly what each tier gets
- Translate "tokens" into human terms on the pricing card: "Starter = ~500 long conversations/month"
- Add annual billing with 20% discount — standard SaaS move that bumps LTV
- Show the token usage bar on the first chat screen for free-tier users so they learn the economy

---

## Part 5 — Homepage / Landing Redesign

The audit called the current landing page "timid" — positioning is bold ("unfiltered") but design is corporate-safe. Fix that.

### 5.1 Positioning Gap

Current headline-level copy is oppositional ("no patronizing refusals") which frames the product in terms of what it *isn't*. Rewrite in terms of what it *is*:

> Current: "No content filters, no patronizing refusals"
>
> Better: "AI that treats you like an adult."
>
> Or: "Private, uncensored, and yours. The AI you actually own."

Lean into two pillars, not one:
1. **Unfiltered** — the current angle
2. **Private** — activated by the E2EE moat Venice uniquely enables

The "private" angle is both true (E2EE is real) and actually uncontested in the market. Don't leave this on the table.

### 5.2 Concrete Landing Page Changes

| Section | Issue | Fix |
|---|---|---|
| Hero | Monochromatic, generic | Bolder headline; show an actual chat screenshot; lead CTA should be "Try it free" not "Get started" |
| Comparison | Strawmans ChatGPT with "I can't help" quotes | Replace with a feature matrix vs OpenAI / Claude / Grok / Perplexity. Include privacy, pricing, features. |
| Social proof | None | Add testimonials, user count, or trust signals. Even "used by N users" is better than nothing. |
| Features | Vague ("Fast Responses") | Specific — "Web search, image generation, voice mode, 100+ personas, E2EE private mode" |
| CTAs | Three competing (Sign In / Get Started / View Pricing) | Single primary CTA per section; Sign In demoted to nav |
| Visual density | Single amber accent, muted backgrounds | Use more of the amber (and consider a second accent); sharpen the grid pattern overlay; increase contrast |
| Feature section | No demos | Inline mini-demos: scroll past a section showing an actual chat, an actual image generation, an actual voice response |

### 5.3 Page Structure (proposed)

```
1. Hero — single-focused headline, one CTA, inline demo video or animated screenshot
2. Core capabilities — 4 cards: Unfiltered / Private (E2EE) / Multi-modal / Your Data
3. Live comparison matrix — Infinet vs ChatGPT vs Claude vs Grok
4. Feature tour with inline demos — chat / image / voice / characters
5. Testimonials / social proof
6. Pricing preview — 3 tiers, "See all plans" link
7. FAQ (expandable accordion, not inline wall of text)
8. Final CTA
```

---

## Part 6 — Pricing & Tier Restructure

### 6.1 Current Problems

1. **Tokens are too abstract.** Users can't predict what their plan gives them. "10,000 tokens" means nothing to a normal person.
2. **Feature promises are not delivered** (Part 1).
3. **No way to charge differently for different modalities.** An image costs ~500 tokens-equivalent. A voice minute costs ~1,000. Currently it's all flat.
4. **Hard limit with no overage option** — users who hit their cap mid-conversation have to wait until the next cycle. Either offer overage or bump tiers.

### 6.2 Proposed Structure — Credit System

Move to a credit-based model where:
- 1 text message = 1 credit
- 1 voice minute (TTS + STT combined) = 2 credits
- 1 web search = 1 credit extra on top of message
- 1 vision analysis (image uploaded to chat) = 3 credits
- 1 document uploaded for Q&A = 5 credits to ingest

Suggested tiers (keeping the same price points):

| Tier | Price | Credits/mo | Features |
|---|---|---|---|
| Free | $0 | 50 | Text chat, basic models, no web search |
| Starter | $10 | 750 | + web search, + voice in/out |
| Premium | $50 | 4,000 | + all models, + vision analysis, + extended reasoning |
| Limitless | $150 | 15,000 | + E2EE private mode, + priority routing, + API access |

For image generation, users are pointed to artifacial.io via the homepage banner and (Phase 3) an in-chat handoff when the model detects an image-generation request.

This maps cleanly to Venice's actual cost structure for Infinet's text-first scope.

### 6.3 Address the "undelivered features" debt

Before launching the new tiers, deliver what's currently promised (or remove the promise):
- "All AI models access" — implement the model picker (Part 4.2)
- "Image generation included" — **remove this claim**; image generation moves to artifacial.io
- "Priority processing speed" — route Limitless requests to Venice Pro-tier models; it's real and measurable
- "API access" — expose a `/api/v2/public/chat` endpoint with user API keys; uses the same backend
- "Advanced analytics" — build a simple usage dashboard (credits used, per modality, per chat)
- "Email support" — at minimum a support@infinetai.org address with auto-response SLA

---

## Part 7 — Phased Implementation Roadmap

### Phase 1 — Fix What's Advertised (Week 1–2)

Priority: stop customer-facing dishonesty.

- [ ] Add model picker (even a 2-model one) for all tiers, better for Premium+
- [ ] **Remove image generation from Infinet** — redirect users to artifacial.io (homepage cross-promo already added)
- [ ] Update Premium tier copy to drop the "Image generation included" claim
- [ ] Wire up "priority routing" for Limitless (route to faster Venice models)
- [ ] Remove fake strikethrough prices from pricing page
- [ ] Add feature comparison table to pricing page
- [ ] Create support@infinetai.org + auto-response
- [ ] Fix code block copy button to always be visible
- [ ] Add message timestamps

### Phase 2 — Venice API Activation (Week 3–5)

Priority: turn on the features you're already paying for.

- [ ] Enable Venice built-in web search (`auto` mode by default) + citations UI
- [ ] Enable Venice web scraping (auto-detect URLs in messages)
- [ ] Add vision routing — detect image uploads, route to Qwen3-VL
- [ ] Add voice input (mic button) via Venice STT
- [ ] Add read-aloud (speaker button) via Venice TTS
- [ ] Add auto-title for new chats via 1 cheap summary call
- [ ] Fix mobile tap targets to 44×44
- [ ] Add drag-and-drop for file uploads

### Phase 3 — Differentiation (Week 6–10)

Priority: features no competitor has.

- [ ] Launch Private Mode (E2EE) as Premium+ flagship
- [ ] Expose reasoning depth slider on models that support it
- [ ] Add slash commands (`/summarize`, `/explain`, etc.)
- [ ] Add message actions (Copy, Edit, Delete, Regenerate, Branch)
- [ ] Redesign landing page with new positioning and live demos
- [ ] Add intelligent "this is an image request — try artifacial.io" handoff

### Phase 4 — Credit System + Advanced Features (Week 11–16)

Priority: pricing restructure and high-effort features.

- [ ] Migrate billing model from tokens to credits
- [ ] Build usage dashboard (Limitless tier)
- [ ] Expose public API for Limitless tier
- [ ] Add embeddings-powered chat history search
- [ ] Add document Q&A (embeddings + RAG over uploaded PDFs)
- [ ] Conversation branching (optional, genuinely unique)

---

## Part 8 — Cost Modeling

Quick math to confirm the new features are profitable at current pricing.

Image generation costs are excluded since that moves to artifacial.io. Numbers below reflect Infinet as a text-first product.

### Per-user monthly cost (Starter @ $10/mo)

Assume average Starter user does:
- 200 text messages × $0.001/msg = $0.20
- 100 web searches × $0.01 = $1.00
- 20 minutes of voice (10 in, 10 out) = ~$0.18 (voice in) + ~$0.02 (voice out) = $0.20
- **Total Venice cost: ~$1.40**

Starter gross margin: **$10 − $1.40 − Stripe fees ($0.60) = ~$8.00/mo** (80% margin). ✅ Very profitable.

### Premium ($50/mo)

Assume 2× usage + E2EE + vision:
- 400 text messages = $0.40
- 200 web searches = $2.00
- 40 voice minutes = $0.40
- 50 vision queries (higher token cost model) = $0.50
- **Total: ~$3.30**

Premium gross margin: **$50 − $3.30 − $2 Stripe = ~$44.70/mo** (89% margin). ✅ Very profitable.

### Limitless ($150/mo)

Heaviest users — 3× Premium + E2EE + API usage:
- 1,000 text messages = $1.00
- 500 searches = $5.00
- 100 voice minutes = $1.00
- Heavy vision + embeddings use = $2.00
- 10M API tokens = $3.00
- **Total: ~$12**

Limitless gross margin: **$150 − $12 − $5 Stripe = ~$133/mo** (89% margin). ✅ Very profitable.

**Conclusion:** Infinet as a text-first product (with image generation spun off to artifacial.io) actually runs at *higher* margins than a multi-modal version. Cross-promoting artifacial.io sends visual-gen users to the dedicated tool where pricing can be structured around GPU-intensive workloads.

---

## Part 9 — Risks & Dependencies

### 9.1 Vendor Lock-In

Committing deeper to Venice's ecosystem (characters, E2EE, built-in search) increases switching cost. Mitigations:
- Wrap everything behind abstractions (`SearchProvider`, `ModelProvider`, etc.)
- Keep model IDs configurable, not hardcoded
- Periodically sanity-check pricing vs alternatives

### 9.2 Venice API Reliability

You already hit a Venice outage earlier. Mitigations:
- Keep the fallback model chain (`venice-uncensored` → `glm-4.7-flash-heretic` → potentially Anthropic direct as last resort)
- Add observability (Sentry or similar) so outages don't silently degrade user experience
- Consider caching common responses (homepage demo, onboarding flow)

### 9.3 E2EE Complexity

E2EE mode is powerful but operationally harder:
- Can't log E2EE conversations for debugging
- Support requests become harder (you can't see what went wrong)
- Status page / error reporting needs careful design so failures are visible without leaking content

### 9.4 Feature Creep

The roadmap above is ambitious. Two protections:
- Stick to the phases; don't let Phase 3 bleed into Phase 1
- Ruthlessly remove features that don't get used after 30 days in production

### 9.5 Content Moderation

"Unfiltered + private" is the selling point, but US legal exposure exists. At minimum:
- Retain ability to ban users for TOS violations (hashes of banned content, not content itself)
- Have a clear TOS that prohibits CSAM, genuine harm-to-others planning, etc.
- Provide a report mechanism even in E2EE mode (user-initiated reports that bundle the conversation)

---

## Appendix A — Immediate Quick Wins (Can Ship This Week)

If you want highest-impact low-effort items before the formal roadmap:

1. Enable Venice web search (1 param change, ~15 min of work, huge UX upgrade)
2. Fix mobile tap targets (CSS-only, 30 min)
3. Code block copy always visible (1-line change)
4. Remove fake strikethrough prices from pricing page (copy change)
5. Add message timestamps (small component change)
6. Add support@infinetai.org (10 min)
7. Move "Image generation" to be actually tier-gated (simple middleware check)
8. Add an inline "auto-title from first message" call (30 min)
9. Add read-aloud button using Venice TTS (1-2 hours)
10. Add voice input button using Venice STT (2-3 hours)

All 10 of these combined = ~1 sprint of work for a dramatically more polished product.

---

## Appendix B — Open Questions

Before executing, decisions needed from Tanner:

1. **Positioning commitment**: Lead with "Unfiltered" alone or "Unfiltered + Private"? The second is stronger but means committing to E2EE as a flagship feature.
2. **Pricing migration**: Move to credits immediately or keep tokens through the current cohort and introduce credits on next major version? Existing users grandfathered to tokens?
3. **E2EE in which tier**: Premium or Limitless? I'd argue Premium — it's the strongest differentiator and putting it on Limitless means most of your customers never see it in marketing.
4. **Voice as free or paid**: TTS/STT are cheap enough to give free-tier users a taste, which dramatically improves first-run UX and conversion. Suggest: free users get 5 voice interactions/month.
5. **Annual billing**: Launch with annual at 20% off? This is the highest-leverage pricing move and costs nothing to build.
6. **Image-gen handoff style**: When a user asks Infinet "draw me X" — do we (a) just have the AI politely say "try artifacial.io", (b) auto-detect the intent and show a rich card linking out, or (c) stay silent and only use the homepage banner as the discovery channel?

---

*Document version: 1.0 — April 2026. Prepared based on: Venice.ai API spec as of March 26, 2026; Railway deployment; Clerk auth; Stripe live mode.*
