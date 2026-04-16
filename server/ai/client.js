import OpenAI from 'openai';

let client = null;

function getClient() {
  if (!client) {
    client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': 'http://localhost:3001',
        'X-OpenRouter-Title': 'AI Hotspot Tracker',
      },
    });
  }
  return client;
}

/**
 * 调用快速模型 (GLM-4.7-Flash)
 */
export async function callFastModel(systemPrompt, userPrompt) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not set');
  }

  const response = await getClient().chat.completions.create({
    model: process.env.AI_MODEL_FAST || 'z-ai/glm-4.7-flash',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 1024,
  });

  return response.choices[0].message.content;
}

/**
 * 调用推理模型 (DeepSeek R1)
 */
export async function callReasoningModel(systemPrompt, userPrompt) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not set');
  }

  const response = await getClient().chat.completions.create({
    model: process.env.AI_MODEL_REASONING || 'deepseek/deepseek-r1',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 1024,
  });

  return response.choices[0].message.content;
}

/**
 * 调用快速模型并解析JSON输出
 */
export async function callFastJSON(systemPrompt, userPrompt) {
  const text = await callFastModel(systemPrompt, userPrompt);
  return extractJSON(text);
}

/**
 * 从AI响应中提取JSON
 */
function extractJSON(text) {
  // 尝试直接解析
  try {
    return JSON.parse(text);
  } catch {}

  // 尝试提取 ```json ... ``` 中的内容
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) {
    try {
      return JSON.parse(match[1].trim());
    } catch {}
  }

  // 尝试找到第一个 { 和最后一个 }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {}
  }

  return null;
}
