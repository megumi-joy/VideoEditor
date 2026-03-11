export interface GenerateRequest {
    prompt: string;
    negative_prompt?: string;
    model_name?: string;
    num_inference_steps?: number;
    width?: number;
    height?: number;
    type?: string;
}

export interface TaskStatus {
    id: string;
    prompt: string;
    progress: number;
    status: string;
}

export class ImageService {
    private baseUrl = 'http://localhost:11435/api';
    private outputsUrl = 'http://localhost:11435/outputs';

    async getModels() {
        try {
            const response = await fetch(`${this.baseUrl}/tags`);
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch models:', error);
            return { models: [] };
        }
    }

    async generate(request: GenerateRequest) {
        try {
            const response = await fetch(`${this.baseUrl}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
            });
            return await response.json();
        } catch (error) {
            console.error('Generation request failed:', error);
            throw error;
        }
    }

    async getActiveTask() {
        try {
            const response = await fetch(`${this.baseUrl}/tasks/active`);
            return await response.json();
        } catch (error) {
            return null;
        }
    }

    async getMagicPrompt() {
        try {
            const response = await fetch(`${this.baseUrl}/prompt/magic`);
            return await response.json();
        } catch (error) {
            return { prompt: "A magic ethereal landscape" };
        }
    }

    getOutputUrl(taskId: string, type: string = "image") {
        const ext = type === "video" ? "ogv" : "png";
        return `${this.outputsUrl}/${taskId}.${ext}`;
    }
}

export const imageService = new ImageService();
