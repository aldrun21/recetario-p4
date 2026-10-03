import { GoogleGenAI } from '@google/genai';
import type { PagesFunction } from '../../types';

interface Env {
  GEMINI_API_KEY?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { headers: CORS_HEADERS });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const geminiApiKey = context.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY no configurado en Cloudflare Pages.' }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const body = (await context.request.json()) as any;
    const { prompt, systemInstruction } = body;

    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-cloudflare'
        }
      }
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          systemInstruction ||
          'Eres un asistente médico inteligente para redacción de recetas y análisis clínico dermatológico.'
      }
    });

    return new Response(JSON.stringify({ text: response.text }), {
      headers: CORS_HEADERS
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno al comunicarse con Gemini' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
