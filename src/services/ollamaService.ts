export interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
}

export class OllamaService {
    async analyzeTimeframe(prompt: string, model: string = 'llava', images?: string[], customBaseUrl?: string): Promise<string> {
        const baseUrl = customBaseUrl || 'http://localhost:11434/api';
        try {
            const bodyPayload: any = {
                model,
                prompt: `Analyze the following video content metadata/description for this timeframe: ${prompt}. Provide tactical insights.`,
                stream: false,
            };
            if (images && images.length > 0) {
                bodyPayload.images = images;
            }

            const response = await fetch(`${baseUrl}/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bodyPayload),
            });

            if (!response.ok) {
                throw new Error('Ollama connection failed. Is it running locally?');
            }

            const data: OllamaResponse = await response.json();
            return data.response;
        } catch (error) {
            console.error('Ollama analysis error:', error);
            return `Error: Could not connect to Ollama at ${baseUrl}. Make sure the URL is correct and allows CORS.`;
        }
    }

    async checkStatus(customBaseUrl?: string): Promise<boolean> {
        const baseUrl = customBaseUrl || 'http://localhost:11434/api';
        try {
            const response = await fetch(`${baseUrl}/tags`);
            return response.ok;
        } catch {
            return false;
        }
    }
}

export const ollamaService = new OllamaService();