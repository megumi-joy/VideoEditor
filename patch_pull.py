import re

# 1. Update aiProviderService.ts
with open("/home/yip/Documents/GitHub/VideoEditor/src/services/aiProviderService.ts", "r") as f:
    content = f.read()

pull_func = """
    async pullOllamaModel(endpoint: string, modelName: string): Promise<boolean> {
        try {
            const response = await fetch(`${endpoint}/pull`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: modelName })
            });
            // Note: Ollama pull endpoint streams the status. 
            // For a simple implementation, we just wait for the request to complete.
            // In a real app, we'd handle the stream to show progress.
            return response.ok;
        } catch (e) {
            console.error('Pull failed:', e);
            return false;
        }
    }
}"""
content = content.replace("}\n\nexport const aiProviderService", pull_func + "\n\nexport const aiProviderService")

with open("/home/yip/Documents/GitHub/VideoEditor/src/services/aiProviderService.ts", "w") as f:
    f.write(content)

# 2. Update EditorLayout.tsx
with open("/home/yip/Documents/GitHub/VideoEditor/src/components/EditorLayout.tsx", "r") as f:
    el_content = f.read()

# Add states for pulling
old_states = """    const [isAiLoading, setIsAiLoading] = useState(false);"""
new_states = """    const [isAiLoading, setIsAiLoading] = useState(false);
    const [modelToPull, setModelToPull] = useState<string>('llava');
    const [isPulling, setIsPulling] = useState(false);"""
el_content = el_content.replace(old_states, new_states)

# Add handlePull function
old_scan = """    const handleScanOllama = async () => {
        const models = await aiProviderService.scanOllamaModels(ollamaEndpoint);
        if (models.length > 0) {
            setOllamaModels(models);
            setSelectedModel(models[0]);
        } else {
            alert("No models found or Ollama is unreachable.");
        }
    };"""
new_scan = """    const handleScanOllama = async () => {
        const models = await aiProviderService.scanOllamaModels(ollamaEndpoint);
        if (models.length > 0) {
            setOllamaModels(models);
            setSelectedModel(models[0]);
        } else {
            alert("No models found or Ollama is unreachable.");
        }
    };

    const handlePullOllama = async () => {
        if (!modelToPull) return;
        setIsPulling(true);
        try {
            const success = await aiProviderService.pullOllamaModel(ollamaEndpoint, modelToPull);
            if (success) {
                alert(`Successfully pulled ${modelToPull}!`);
                handleScanOllama(); // refresh list
            } else {
                alert(`Failed to pull ${modelToPull}. Check connection or model name.`);
            }
        } catch (err) {
            alert(`Error pulling model.`);
        } finally {
            setIsPulling(false);
        }
    };"""
el_content = el_content.replace(old_scan, new_scan)

# Update UI to add Pull section
old_ui = """                                                <div>
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
                                                </div>"""

new_ui = """                                                <div>
                                                    <h4 className="text-sm font-semibold mb-1">Model</h4>
                                                    {aiProvider === 'ollama' ? (
                                                        <>
                                                            <div className="flex gap-2 mb-2">
                                                                <select 
                                                                    value={selectedModel} 
                                                                    onChange={(e) => setSelectedModel(e.target.value)}
                                                                    className="flex-1 text-xs p-2 rounded border bg-background text-primary outline-none"
                                                                >
                                                                    {ollamaModels.map(m => <option key={m} value={m}>{m}</option>)}
                                                                </select>
                                                                <Button variant="outline" size="sm" onClick={handleScanOllama}>Scan</Button>
                                                            </div>
                                                            <div className="flex gap-2 items-center border-t border-white/10 pt-2 mt-2">
                                                                <input 
                                                                    type="text" 
                                                                    value={modelToPull}
                                                                    onChange={(e) => setModelToPull(e.target.value)}
                                                                    className="flex-1 text-xs p-2 rounded border bg-background text-primary outline-none"
                                                                    placeholder="e.g. llava"
                                                                />
                                                                <Button 
                                                                    variant="secondary" 
                                                                    size="sm" 
                                                                    onClick={handlePullOllama}
                                                                    disabled={isPulling}
                                                                >
                                                                    {isPulling ? "Pulling..." : "Download Model"}
                                                                </Button>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <input 
                                                            type="text" 
                                                            value={selectedModel}
                                                            onChange={(e) => setSelectedModel(e.target.value)}
                                                            className="w-full text-xs p-2 rounded border bg-background text-primary outline-none"
                                                            placeholder="gemini-1.5-flash"
                                                        />
                                                    )}
                                                </div>"""

el_content = el_content.replace(old_ui, new_ui)

with open("/home/yip/Documents/GitHub/VideoEditor/src/components/EditorLayout.tsx", "w") as f:
    f.write(el_content)

print("Updated VideoEditor with model pulling feature.")
