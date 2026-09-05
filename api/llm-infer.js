export async function POST(req) {
  const { prompt, model, max_tokens = 100, temperature = 0.7 } = req.body || {};

  if (!prompt || !model) {
    return new Response(
      JSON.stringify({ error: 'Missing prompt or model' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Try Anthropic first
  const anthropicResult = await tryAnthropic(prompt, model, max_tokens, temperature);
  if (anthropicResult.success) {
    return new Response(
      JSON.stringify({ provider: 'anthropic', result: anthropicResult.data }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Fallback to OpenRouter
  const openrouterResult = await tryOpenRouter(prompt, max_tokens, temperature);
  if (openrouterResult.success) {
    return new Response(
      JSON.stringify({ provider: 'openrouter', result: openrouterResult.data }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Fallback to Together
  const togetherResult = await tryTogether(prompt, max_tokens, temperature);
  if (togetherResult.success) {
    return new Response(
      JSON.stringify({ provider: 'together', result: togetherResult.data }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // All providers failed
  console.error('All LLM providers failed:', {
    anthropic: anthropicResult.error,
    openrouter: openrouterResult.error,
    together: togetherResult.error,
  });

  return new Response(
    JSON.stringify({ error: 'All providers failed' }),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  );
}

async function tryAnthropic(prompt, model, maxTokens, temperature) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { success: false, error: 'No API key' };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.text();
      console.error(`Anthropic error (${response.status}):`, error);
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const result = data.content?.[0]?.text || '';
    return { success: true, data: result };
  } catch (err) {
    console.error('Anthropic error:', err.message);
    return { success: false, error: err.message };
  }
}

async function tryOpenRouter(prompt, maxTokens, temperature) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { success: false, error: 'No API key' };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.text();
      console.error(`OpenRouter error (${response.status}):`, error);
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || '';
    return { success: true, data: result };
  } catch (err) {
    console.error('OpenRouter error:', err.message);
    return { success: false, error: err.message };
  }
}

async function tryTogether(prompt, maxTokens, temperature) {
  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) return { success: false, error: 'No API key' };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch('https://api.together.xyz/inference', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-2-7b-chat',
        prompt,
        max_tokens: maxTokens,
        temperature,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.text();
      console.error(`Together error (${response.status}):`, error);
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const result = data.output?.choices?.[0]?.text || '';
    return { success: true, data: result };
  } catch (err) {
    console.error('Together error:', err.message);
    return { success: false, error: err.message };
  }
}
