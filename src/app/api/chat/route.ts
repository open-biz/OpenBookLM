import { NextResponse } from 'next/server';
import Cerebras from '@cerebras/cerebras_cloud_sdk';

if (!process.env.CEREBRAS_API_KEY) {
  throw new Error('Missing CEREBRAS_API_KEY environment variable');
}

const client = new Cerebras({
  apiKey: process.env.CEREBRAS_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Validate messages
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid messages format' },
        { status: 400 }
      );
    }

    const completionResponse = await client.chat.completions.create({
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      model: 'llama3.3-70b',
      temperature: 0.7,
      max_tokens: 1000,
    });

    return NextResponse.json(completionResponse);
  } catch (error) {
    console.error('Cerebras API Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'An error occurred while processing your request'
      },
      { status: 500 }
    );
  }
}
