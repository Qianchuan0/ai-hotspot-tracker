import OpenAI from 'openai';

// 两个独立的客户端：GLM（快）+ DeepSeek（推理）
let fastClient = null;
let reasoningClient = null;

function getFastClient() {
  if (!fastClient) {
    fastClient = new OpenAI({
      baseURL: process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
      apiKey: process.env.GLM_API_KEY,
    });
  }
  return fastClient;
}

function getReasoningClient() {
  if (!reasoningClient) {
    reasoningClient = new OpenAI({
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
  }
  return reasoningClient;
}

/**
 * 调用快速模型 (GLM-4.7-Flash)
 */
export async function callFastModel(systemPrompt, userPrompt) {
  if (!process.env.GLM_API_KEY) {
    throw new Error('GLM_API_KEY not set');
  }

  const response = await getFastClient().chat.completions.create({
    model: process.env.AI_MODEL_FAST || 'glm-4.7-flash',
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
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY not set');
  }

  const response = await getReasoningClient().chat.completions.create({
    model: process.env.AI_MODEL_REASONING || 'deepseek-reasoner',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 2048,
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
  try {
    return JSON.parse(text);
  } catch {}

  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) {
    try {
      return JSON.parse(match[1].trim());
    } catch {}
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {}
  }

  return null;
}
