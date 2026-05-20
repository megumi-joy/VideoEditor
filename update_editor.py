import re

with open("/home/yip/Documents/GitHub/VideoEditor/src/components/EditorLayout.tsx", "r") as f:
    content = f.read()

# Replace import
content = content.replace("import { ollamaService } from '@/services/ollamaService';", "import { aiProviderService, AIProvider } from '@/services/aiProviderService';")

# Add new states
old_states = """    const [aiAnalysis, setAiAnalysis] = useState<string>("");
    const [ollamaEndpoint, setOllamaEndpoint] = useState<string>(localStorage.getItem('ollama_endpoint') || 'http://localhost:11434/api');
    const [isAiLoading, setIsAiLoading] = useState(false);"""

new_states = """    const [aiAnalysis, setAiAnalysis] = useState<string>("");
    
    // AI Provider States
    const [aiProvider, setAiProvider] = useState<AIProvider>((localStorage.getItem('ai_provider') as AIProvider) || 'ollama');
    const [ollamaEndpoint, setOllamaEndpoint] = useState<string>(localStorage.getItem('ollama_endpoint') || 'http://localhost:11434/api');
    const [ollamaModels, setOllamaModels] = useState<string[]>(['llava']);
    const [abafEndpoint, setAbafEndpoint] = useState<string>(localStorage.getItem('abaf_endpoint') || 'https://finergiaflow.com/api');
    const [abafToken, setAbafToken] = useState<string>(localStorage.getItem('abaf_token') || '');
    const [selectedModel, setSelectedModel] = useState<string>('llava');
    
    const [isAiLoading, setIsAiLoading] = useState(false);"""

content = content.replace(old_states, new_states)

# Update runAiAnalysis
old_runAiAnalysis = """    const runAiAnalysis = async () => {
        setIsAiLoading(true);
        try {
            // Strip the data URL prefix to get raw base64 strings
            const base64Frames = frames.map(f => f.replace(/^data:image\/[a-z]+;base64,/, ''));
            const result = await ollamaService.analyzeTimeframe(
                `Analyze the sequence from ${startTime}s to ${endTime}s. Describe the visual content and actions in these frames.`,
                'llava',
                base64Frames,
                ollamaEndpoint
            );
            setAiAnalysis(result);
        } catch (err) {
            setAiAnalysis("Failed to connect to Ollama.");
        } finally {
            setIsAiLoading(false);
        }
    };"""

new_runAiAnalysis = """    const runAiAnalysis = async () => {
        setIsAiLoading(true);
        try {
            const base64Frames = frames.map(f => f.replace(/^data:image\\/[a-z]+;base64,/, ''));
            const endpoint = aiProvider === 'ollama' ? ollamaEndpoint : abafEndpoint;
            const result = await aiProviderService.analyzeTimeframe(
                aiProvider,
                `Analyze the sequence from ${startTime}s to ${endTime}s. Describe the visual content and actions in these frames.`,
                selectedModel,
                base64Frames,
                endpoint,
                abafToken
            );
            setAiAnalysis(result);
        } catch (err: any) {
            setAiAnalysis(`Failed: ${err.message}`);
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleScanOllama = async () => {
        const models = await aiProviderService.scanOllamaModels(ollamaEndpoint);
        if (models.length > 0) {
            setOllamaModels(models);
            setSelectedModel(models[0]);
        } else {
            alert("No models found or Ollama is unreachable.");
        }
    };"""

content = content.replace(old_runAiAnalysis, new_runAiAnalysis)

# Save to localStorage
old_ls = """        localStorage.setItem('magic_editor_history', JSON.stringify(history));
        localStorage.setItem('ollama_endpoint', ollamaEndpoint);"""
new_ls = """        localStorage.setItem('magic_editor_history', JSON.stringify(history));
        localStorage.setItem('ollama_endpoint', ollamaEndpoint);
        localStorage.setItem('abaf_endpoint', abafEndpoint);
        localStorage.setItem('abaf_token', abafToken);
        localStorage.setItem('ai_provider', aiProvider);"""
content = content.replace(old_ls, new_ls)

# Update UI cards
old_cards = """                                        <div className="grid grid-cols-2 gap-4">
                                            <Card className="glass border-white/20 p-4">
                                                <h4 className="text-sm font-semibold mb-2">Analysis Tool</h4>
                                                <p className="text-xs text-muted-foreground">Uses LLaVA to visually analyze objects and movement in the extracted frames for the selected sequence.</p>
                                            </Card>
                                            <Card className="glass border-white/20 p-4 flex flex-col justify-between">
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
                                            </Card>
                                        </div>"""

new_cards = """                                        <div className="grid grid-cols-2 gap-4">
                                            <Card className="glass border-white/20 p-4 flex flex-col gap-3">
                                                <div>
                                                    <h4 className="text-sm font-semibold mb-1">AI Provider</h4>
                                                    <select 
                                                        value={aiProvider} 
                                                        onChange={(e) => {
                                                            setAiProvider(e.target.value as AIProvider);
                                                            if(e.target.value === 'abaf') setSelectedModel('gemini-1.5-pro-latest');
                                                            else setSelectedModel(ollamaModels[0] || 'llava');
                                                        }}
                                                        className="w-full text-xs p-2 rounded border bg-background text-primary focus:ring-1 focus:ring-primary outline-none"
                                                    >
                                                        <option value="ollama">Ollama (Local/Colab)</option>
                                                        <option value="abaf">ABAF Cloud (Gemini)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold mb-1">Model</h4>
                                                    {aiProvider === 'ollama' ? (
                                                        <div className="flex gap-2">
                                                            <select 
                                                                value={selectedModel} 
                                                                onChange={(e) => setSelectedModel(e.target.value)}
                                                                className="flex-1 text-xs p-2 rounded border bg-background text-primary outline-none"
                                                            >
                                                                {ollamaModels.map(m => <option key={m} value={m}>{m}</option>)}
                                                            </select>
                                                            <Button variant="outline" size="sm" onClick={handleScanOllama}>Scan</Button>
                                                        </div>
                                                    ) : (
                                                        <input 
                                                            type="text" 
                                                            value={selectedModel}
                                                            onChange={(e) => setSelectedModel(e.target.value)}
                                                            className="w-full text-xs p-2 rounded border bg-background text-primary outline-none"
                                                            placeholder="gemini-1.5-flash"
                                                        />
                                                    )}
                                                </div>
                                            </Card>
                                            
                                            <Card className="glass border-white/20 p-4 flex flex-col gap-3">
                                                {aiProvider === 'ollama' ? (
                                                    <>
                                                        <div>
                                                            <h4 className="text-sm font-semibold mb-1">Ollama Endpoint</h4>
                                                            <input 
                                                                type="text" value={ollamaEndpoint} onChange={(e) => setOllamaEndpoint(e.target.value)}
                                                                className="w-full text-xs p-2 rounded border bg-background text-primary outline-none"
                                                                placeholder="http://localhost:11434/api"
                                                            />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div>
                                                            <h4 className="text-sm font-semibold mb-1">ABAF Endpoint</h4>
                                                            <input 
                                                                type="text" value={abafEndpoint} onChange={(e) => setAbafEndpoint(e.target.value)}
                                                                className="w-full text-xs p-2 rounded border bg-background text-primary outline-none"
                                                                placeholder="https://finergiaflow.com/api"
                                                            />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-semibold mb-1">Admin Token</h4>
                                                            <input 
                                                                type="password" value={abafToken} onChange={(e) => setAbafToken(e.target.value)}
                                                                className="w-full text-xs p-2 rounded border bg-background text-primary outline-none"
                                                                placeholder="Token..."
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </Card>
                                        </div>"""

content = content.replace(old_cards, new_cards)

with open("/home/yip/Documents/GitHub/VideoEditor/src/components/EditorLayout.tsx", "w") as f:
    f.write(content)

print("EditorLayout updated.")
