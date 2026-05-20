export interface ProviderResponse {
    response: string;
}

export type AIProvider = 'ollama' | 'abaf';

export class AIProviderService {
    async analyzeTimeframe(
        provider: AIProvider,
        prompt: string,
        model: string,
        images: string[],
        endpoint: string,
        adminToken?: string
    ): Promise<string> {
        try {
            if (provider === 'ollama') {
                const bodyPayload: any = {
                    model,
                    prompt: `Analyze the following video content metadata/description for this timeframe: ${prompt}. Provide tactical insights.`,
                    stream: false,
                };
                if (images && images.length > 0) {
                    bodyPayload.images = images;
                }

                const response = await fetch(`${endpoint}/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bodyPayload),
                });

                if (!response.ok) throw new Error('Ollama connection failed.');
                const data = await response.json();
                return data.response;

            } else if (provider === 'abaf') {
                const bodyPayload = {
                    model_name: model,
                    prompt: `Analyze the following video content metadata/description for this timeframe: ${prompt}. Provide tactical insights.`,
                    images: images || []
                };

                const response = await fetch(`${endpoint}/vision/analyze`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${adminToken || ''}`
                    },
                    body: JSON.stringify(bodyPayload),
                });

                if (!response.ok) {
                    const errTxt = await response.text();
                    throw new Error(`ABAF connection failed: ${errTxt}`);
                }
                const data = await response.json();
                return data.response;
            }
            throw new Error('Unknown provider');
        } catch (error: any) {
            console.error('AI analysis error:', error);
            return `Error: ${error.message}`;
        }
    }

    async scanOllamaModels(endpoint: string): Promise<string[]> {
        try {
            const response = await fetch(`${endpoint}/tags`);
            if (!response.ok) return [];
            const data = await response.json();
            return data.models ? data.models.map((m: any) => m.name) : [];
        } catch {
            return [];
        }
    }
}

export const aiProviderService = new AIProviderService();
