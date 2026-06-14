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

Generate exactly 10 possible approaches or agreements, ranging from straightforward to more creative. For each, give:
- "title": max 6 words, plain language
- "description": one sentence, max 18 words, concrete
- "scores": integers 1-10 for satisfactionYou, satisfactionThem, fearReductionYou, fearReductionThem, identityYou, identityThem (how well this option serves the user's top priority/fear/identity, and how well it might serve the other person's, per the user's notes)

Then an "analysis" object with arrays of 0-based option indices (1-3 each):
- strongestWinWin
- easiestToPropose
- highestAcceptance
- mostCreative
- deeperMotivations (options that address underlying wants/fears rather than the stated position)

Respond with ONLY valid JSON, no markdown formatting, no preamble or explanation, exactly matching this shape:
{"options":[{"title":"","description":"","scores":{"satisfactionYou":0,"satisfactionThem":0,"fearReductionYou":0,"fearReductionThem":0,"identityYou":0,"identityThem":0}}],"analysis":{"strongestWinWin":[0],"easiestToPropose":[0],"highestAcceptance":[0],"mostCreative":[0],"deeperMotivations":[0]}}`;

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
        max_tokens: 1000,
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
