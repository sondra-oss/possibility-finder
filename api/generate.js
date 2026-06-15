// api/generate.js
// Deploy this on Vercel. It keeps your Anthropic API key on the server —
// nothing in the browser ever sees it. The front-end tool (whether it's
// this HTML file or whatever GHL AI Studio builds) calls THIS endpoint
// instead of calling api.anthropic.com directly.

export default async function handler(req, res) {
  // Allow the tool to call this from anywhere (GHL, claude artifacts, etc.)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing "prompt" in request body' });
  }

  const systemPrompt = `You help someone find possible approaches to a conflict or negotiation, based on a structured reflection they've just done.

Core principle: everything they wrote about the other person is a hypothesis, not a fact, and is framed generously (the hero principle) - the other person likely sees themselves as protecting or pursuing something reasonable, even if the user disagrees.

First, write a "reflection" object with two sections, "you" and "them", each containing three short sentences (max 25 words each):
- "wants": what they're actually after, in plain language - go one layer deeper than what was written, don't just repeat it
- "fears": what they're protecting against, same approach
- "identity": who they're trying to be in this situation

Write these the way the most insightful, perceptive person in the room would say them out loud - plain, warm, a little surprising, never clinical or coach-like. No therapy-speak.

Then add "insight": one or two sentences (max 40 words) naming a pattern, connection, or blind spot across both sides that the person may not have seen yet.

Then generate exactly 10 possible approaches or agreements, ranging from straightforward to more creative. For each, give:
- "title": max 6 words, plain language
- "description": one sentence, max 18 words, concrete
- "scores": integers 1-10 for satisfactionYou, satisfactionThem, fearReductionYou, fearReductionThem, identityYou, identityThem (how well this option serves the user's top priority/fear/identity, and how well it might serve the other person's, per the user's notes)
- "insight": one short sentence, max 20 words, starting with "Works because" — the reasoning for why this option could work for both sides, not the action itself

Then an "analysis" object with one array of 0-based option indices (1-3), under the key "strongestWinWin" — the options that best balance both sides.

Respond with ONLY valid JSON, no markdown formatting, no preamble or explanation, exactly matching this shape:
{"reflection":{"you":{"wants":"","fears":"","identity":""},"them":{"wants":"","fears":"","identity":""},"insight":""},"options":[{"title":"","description":"","insight":"","scores":{"satisfactionYou":0,"satisfactionThem":0,"fearReductionYou":0,"fearReductionThem":0,"identityYou":0,"identityThem":0}}],"analysis":{"strongestWinWin":[0]}}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1800,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: (data.error && data.error.message) || 'Anthropic API error'
      });
    }

    const textBlocks = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text);
    let raw = textBlocks.join('\n').trim();
    raw = raw.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return res.status(502).json({ error: 'Could not parse the model response as JSON' });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown server error' });
  }
}
