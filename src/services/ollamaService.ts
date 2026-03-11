export interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
}

export class OllamaService {
    private baseUrl = 'http://localhost:11434/api';

    async analyzeTimeframe(prompt: string, model: string = 'llama3'): Promise<string> {
        try {
            const response = await fetch(`${this.baseUrl}/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model,
                    prompt: `Analyze the following video content metadata/description for this timeframe: ${prompt}. Provide tactical insights.`,
                    stream: false,
                }),
            });

            if (!response.ok) {
                throw new Error('Ollama connection failed. Is it running locally?');
            }

            const data: OllamaResponse = await response.json();
            return data.response;
        } catch (error) {
            console.error('Ollama analysis error:', error);
            return "Error: Could not connect to Ollama. Make sure it's running locally on port 11434.";
        }
    }

    async checkStatus(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/tags`);
            return response.ok;
        } catch {
            return false;
        }
    }
}

export const ollamaService = new OllamaService();
