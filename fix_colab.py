import re

with open("/home/yip/Documents/GitHub/VideoEditor/src/services/ollamaService.ts", "r") as f:
    content = f.read()

# Update OllamaService to accept custom baseUrl
new_service = """export interface OllamaResponse {
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

export const ollamaService = new OllamaService();"""

with open("/home/yip/Documents/GitHub/VideoEditor/src/services/ollamaService.ts", "w") as f:
    f.write(new_service)

# Update EditorLayout.tsx
with open("/home/yip/Documents/GitHub/VideoEditor/src/components/EditorLayout.tsx", "r") as f:
    el_content = f.read()

# 1. Add state for endpoint
el_content = el_content.replace(
    "const [aiAnalysis, setAiAnalysis] = useState<string>(\"\");",
    "const [aiAnalysis, setAiAnalysis] = useState<string>(\"\");\n    const [ollamaEndpoint, setOllamaEndpoint] = useState<string>(localStorage.getItem('ollama_endpoint') || 'http://localhost:11434/api');"
)

# 2. Update runAiAnalysis
old_runAiAnalysis = """            const result = await ollamaService.analyzeTimeframe(
                `Analyze the sequence from ${startTime}s to ${endTime}s. Describe the visual content and actions in these frames.`,
                'llava',
                base64Frames
            );"""
new_runAiAnalysis = """            const result = await ollamaService.analyzeTimeframe(
                `Analyze the sequence from ${startTime}s to ${endTime}s. Describe the visual content and actions in these frames.`,
                'llava',
                base64Frames,
                ollamaEndpoint
            );"""
el_content = el_content.replace(old_runAiAnalysis, new_runAiAnalysis)

# 3. Save to localStorage when changed
el_content = el_content.replace(
    "localStorage.setItem('magic_editor_history', JSON.stringify(history));",
    "localStorage.setItem('magic_editor_history', JSON.stringify(history));\n        localStorage.setItem('ollama_endpoint', ollamaEndpoint);"
)

# 4. Update the UI card
old_card = """                                            <Card className="glass border-white/20 p-4">
                                                <h4 className="text-sm font-semibold mb-2">Local Connection</h4>
                                                <p className="text-xs text-muted-foreground">Connected to http://localhost:11434</p>
                                            </Card>"""

new_card = """                                            <Card className="glass border-white/20 p-4 flex flex-col justify-between">
                                                <div>
                                                    <h4 className="text-sm font-semibold mb-2">Ollama Endpoint</h4>
                                                    <p className="text-xs text-muted-foreground mb-2">Configure URL (Local or Colab ngrok)</p>
                                                </div>
                                                <input 
                                                    type="text" 
                                                    value={ollamaEndpoint}
                                                    onChange={(e) => setOllamaEndpoint(e.target.value)}
                                                    className="w-full text-xs p-2 rounded border bg-background text-primary focus:ring-1 focus:ring-primary outline-none"
                                                    placeholder="http://localhost:11434/api"
                                                />
                                            </Card>"""
el_content = el_content.replace(old_card, new_card)

with open("/home/yip/Documents/GitHub/VideoEditor/src/components/EditorLayout.tsx", "w") as f:
    f.write(el_content)

print("Updated Colab endpoint support.")
