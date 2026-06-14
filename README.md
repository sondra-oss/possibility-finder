# Deploying this to Vercel

This is a tiny backend with one job: hold your Anthropic API key on the
server and proxy the "find some possibilities" request. Nothing you give
to GHL, or to other people, ever contains the key.

## 1. Get an Anthropic API key (if you don't have one)
console.anthropic.com → sign in → Settings → API Keys → Create Key.
Copy it somewhere safe — you'll paste it into Vercel, not into any tool.

## 2. Create a Vercel account
vercel.com → sign up (free tier is plenty for this).

## 3. Deploy this folder
Easiest path if you're not using the command line: push this folder to a
new GitHub repo, then in Vercel click "Add New Project" → "Import" →
pick that repo. Vercel will detect the `api/generate.js` file
automatically — no build settings needed.

(If you're comfortable with a terminal: `npm i -g vercel`, then run
`vercel` from inside this folder and follow the prompts.)

## 4. Add your API key as an environment variable
In the Vercel project → Settings → Environment Variables:
- Name: `ANTHROPIC_API_KEY`
- Value: the key you copied in step 1
- Apply to: Production (and Preview if you want)

Redeploy after adding it (Vercel will prompt you, or use the "Redeploy"
button on the latest deployment).

## 5. Find your endpoint
Once deployed, your function lives at:

    https://YOUR-PROJECT-NAME.vercel.app/api/generate

That's the URL the front-end tool will call.

## 6. How the front-end should call it
A single POST request, JSON body with one field, `prompt`, containing the
compiled text (situation, your side, their side, etc. — see
possibility-finder-content.txt for what goes into that text).

    fetch('https://YOUR-PROJECT-NAME.vercel.app/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: compiledText })
    })
      .then(r => r.json())
      .then(result => {
        // result = { options: [...10 items...], analysis: {...} }
      });

This is the same shape the original tool expected back from
api.anthropic.com directly, so the rendering logic (option cards, bars,
grouped analysis) doesn't need to change — only the URL it's pointed at.

## 7. Plug it into GHL
Whatever AI Studio recreates for the "find some possibilities" step,
point its call at the Vercel URL above instead of any AI Studio-internal
model step. GHL becomes the front-end; Vercel quietly does the one thing
that needs a secret.

## Cost / limits to know about
- Vercel's free tier covers this easily for personal/small-group use.
- You're billed by Anthropic per API call this function makes — same as
  if you were calling it yourself. Worth keeping an eye on usage if this
  gets shared widely.
- If you ever want to shut it off, delete the environment variable or the
  whole Vercel project — the key stops working immediately from your side
  (you can also just revoke the key in the Anthropic console).
