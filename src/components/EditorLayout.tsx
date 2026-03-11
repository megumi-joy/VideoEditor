import React, { useState, useRef, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Video,
    Wand2,
    Download,
    Upload,
    Settings,
    Image as ImageIcon,
    Type,
    FolderOpen,
    Play,
    Loader2,
    History,
    Scissors,
    Layers,
    RotateCcw,
    Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { videoService } from '@/services/videoService';
import { ollamaService } from '@/services/ollamaService';
import { imageService } from '@/services/imageService';

interface EditHistoryItem {
    id: string;
    type: 'cut' | 'effect' | 'montage';
    timestamp: number;
    label: string;
}

const EditorLayout: React.FC = () => {
    const [activeTab, setActiveTab] = useState("edit");
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [frames, setFrames] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<string>("");
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [magicPrompt, setMagicPrompt] = useState("");
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<{ id: string, url: string }[]>([]);

    // New State for Advanced Editing
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(10);
    const [duration, setDuration] = useState(0);
    const [history, setHistory] = useState<EditHistoryItem[]>([]);
    const [montageQueue, setMontageQueue] = useState<{ id: string, start: number, end: number }[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        videoService.load().catch(console.error);
        const savedHistory = localStorage.getItem('magic_editor_history');
        if (savedHistory) {
            setHistory(JSON.parse(savedHistory));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('magic_editor_history', JSON.stringify(history));
    }, [history]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setVideoFile(file);
            setVideoUrl(URL.createObjectURL(file));
            setIsProcessing(true);
            try {
                const extractedFrames = await videoService.extractFrames(file, 6);
                setFrames(extractedFrames);
            } catch (err) {
                console.error("Frame extraction failed", err);
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const onVideoLoaded = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
            setEndTime(videoRef.current.duration);
        }
    };

    const addToHistory = (type: EditHistoryItem['type'], label: string) => {
        const newItem: EditHistoryItem = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            timestamp: Date.now(),
            label
        };
        setHistory(prev => [newItem, ...prev].slice(0, 20));
    };

    const applyEffect = async (effect: string) => {
        if (!videoFile) return;
        setIsProcessing(true);
        try {
            const resultBlob = await videoService.applyEffect(videoFile, effect);
            const resultUrl = URL.createObjectURL(resultBlob);
            setVideoUrl(resultUrl);
            addToHistory('effect', `Applied ${effect}`);
        } catch (err) {
            console.error("Effect application failed", err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCut = async () => {
        if (!videoFile) return;
        setIsProcessing(true);
        try {
            const resultBlob = await videoService.cut(videoFile, startTime, endTime);
            const resultUrl = URL.createObjectURL(resultBlob);
            setVideoUrl(resultUrl);
            addToHistory('cut', `Cut: ${startTime.toFixed(1)}s - ${endTime.toFixed(1)}s`);
        } catch (err) {
            console.error("Cut failed", err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAddToMontage = () => {
        const newSegment = {
            id: Math.random().toString(36).substr(2, 9),
            start: startTime,
            end: endTime
        };
        setMontageQueue(prev => [...prev, newSegment]);
        addToHistory('montage', `Added segment ${startTime.toFixed(1)}s-${endTime.toFixed(1)}s to montage`);
    };

    const handleRenderMontage = async () => {
        if (!videoFile || montageQueue.length === 0) return;
        setIsProcessing(true);
        try {
            // This is a simplified version. Ideally we'd cut each segment first.
            // For now, let's just cut the first 2 segments and join them as a proof of concept.
            const segments = [];
            for (const seg of montageQueue) {
                const blob = await videoService.cut(videoFile, seg.start, seg.end);
                segments.push(new File([blob], `seg_${seg.id}.mp4`, { type: 'video/mp4' }));
            }

            const resultBlob = await videoService.montage(segments);
            const resultUrl = URL.createObjectURL(resultBlob);
            setVideoUrl(resultUrl);
            addToHistory('montage', `Rendered montage with ${montageQueue.length} segments`);
            setMontageQueue([]);
        } catch (err) {
            console.error("Montage failed", err);
        } finally {
            setIsProcessing(false);
        }
    };

    const runAiAnalysis = async () => {
        setIsAiLoading(true);
        try {
            const result = await ollamaService.analyzeTimeframe(`Analyze the sequence from ${startTime}s to ${endTime}s.`);
            setAiAnalysis(result);
        } catch (err) {
            setAiAnalysis("Failed to connect to Ollama.");
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleGenerateMagicPrompt = async () => {
        const res = await imageService.getMagicPrompt();
        setMagicPrompt(res.prompt);
    };

    const handleGenerateImage = async () => {
        if (!magicPrompt) return;
        setIsGeneratingImage(true);
        try {
            const res = await imageService.generate({ prompt: magicPrompt });
            const taskId = res.task_id;

            // Poll for task completion (simplified for this demo)
            // In a real app we'd check status, here we'll just wait a bit and assume success
            await new Promise(r => setTimeout(r, 5000));

            const imageUrl = imageService.getOutputUrl(taskId);
            setGeneratedImages(prev => [{ id: taskId, url: imageUrl }, ...prev]);
        } catch (err) {
            console.error("Image generation failed", err);
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const handleSaveAs = async () => {
        if (!videoUrl) return;
        try {
            if ('showSaveFilePicker' in window) {
                const handle = await (window as any).showSaveFilePicker({
                    suggestedName: 'magic-edit.mp4',
                    types: [{
                        description: 'Video File',
                        accept: { 'video/mp4': ['.mp4'] },
                    }],
                });
                const writable = await handle.createWritable();
                const response = await fetch(videoUrl);
                const blob = await response.blob();
                await writable.write(blob);
                await writable.close();
            } else {
                const a = document.createElement('a');
                a.href = videoUrl;
                a.download = 'magic-edit.mp4';
                a.click();
            }
        } catch (err) {
            console.error("Save failed", err);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col font-sans">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="video/*"
                onChange={handleFileChange}
            />

            {/* Header */}
            <header className="h-16 border-b glass flex items-center justify-between px-6 sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 magic-gradient rounded-lg flex items-center justify-center shadow-lg">
                        <Video className="text-white w-5 h-5" />
                    </div>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent magic-gradient">
                        MagicEditor
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="gap-2">
                        <FolderOpen className="w-4 h-4" />
                        Open Folder
                    </Button>
                    <Button variant="magic" size="sm" className="gap-2" onClick={handleSaveAs} disabled={!videoUrl}>
                        <Download className="w-4 h-4" />
                        Save As
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                    <div className="border-b bg-card/50 px-6 py-2 flex items-center gap-4">
                        <TabsList className="bg-muted/50">
                            <TabsTrigger value="edit" className="gap-2">
                                <ImageIcon className="w-4 h-4" /> Edit
                            </TabsTrigger>
                            <TabsTrigger value="ai" className="gap-2">
                                <Wand2 className="w-4 h-4" /> AI Analysis
                            </TabsTrigger>
                            <TabsTrigger value="render" className="gap-2">
                                <Download className="w-4 h-4" /> Render
                            </TabsTrigger>
                        </TabsList>
                        <div className="h-6 w-px bg-border" />
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1"><Type className="w-4 h-4" /> Text</span>
                            <span className="flex items-center gap-1"><ImageIcon className="w-4 h-4" /> Image</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto p-6">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="h-full"
                            >
                                <TabsContent value="edit" className="h-full m-0">
                                    <div className="grid grid-cols-12 gap-6 h-full">
                                        <Card className="col-span-8 flex flex-col overflow-hidden glass border-white/40">
                                            <CardHeader className="py-3 px-4 flex-row items-center justify-between border-b bg-muted/20">
                                                <CardTitle className="text-sm font-medium">
                                                    {videoFile ? videoFile.name : "Video Preview"}
                                                </CardTitle>
                                                <div className="flex gap-4 items-center">
                                                    <div className="flex items-center gap-2 text-xs font-mono">
                                                        <span className="text-primary">{startTime.toFixed(1)}s</span>
                                                        <span className="text-muted-foreground">→</span>
                                                        <span className="text-primary">{endTime.toFixed(1)}s</span>
                                                    </div>
                                                    {isProcessing && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <Settings className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="flex-1 flex flex-col items-center justify-center p-0 bg-black/5 relative group">
                                                {videoUrl ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                                        <video
                                                            ref={videoRef}
                                                            src={videoUrl}
                                                            controls
                                                            className="max-h-[80%] max-w-full shadow-2xl rounded"
                                                            onLoadedMetadata={onVideoLoaded}
                                                        />
                                                        <div className="w-full mt-6 px-8 flex flex-col gap-4">
                                                            <div className="space-y-2">
                                                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                                                    <span>Start: {startTime.toFixed(1)}s</span>
                                                                    <span>End: {endTime.toFixed(1)}s</span>
                                                                </div>
                                                                <div className="relative h-6 flex items-center">
                                                                    <div className="absolute inset-x-0 h-1 bg-muted rounded-full" />
                                                                    <input
                                                                        type="range"
                                                                        min={0}
                                                                        max={duration || 100}
                                                                        step={0.1}
                                                                        value={startTime}
                                                                        onChange={(e) => setStartTime(Math.min(parseFloat(e.target.value), endTime - 0.1))}
                                                                        className="absolute inset-x-0 h-1 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:ring-2 [&::-webkit-slider-thumb]:ring-white"
                                                                    />
                                                                    <input
                                                                        type="range"
                                                                        min={0}
                                                                        max={duration || 100}
                                                                        step={0.1}
                                                                        value={endTime}
                                                                        onChange={(e) => setEndTime(Math.max(parseFloat(e.target.value), startTime + 0.1))}
                                                                        className="absolute inset-x-0 h-1 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:ring-2 [&::-webkit-slider-thumb]:ring-white"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2 justify-center">
                                                                <Button variant="outline" className="gap-2" onClick={handleCut} disabled={isProcessing}>
                                                                    <Scissors className="w-4 h-4" /> Cut Range
                                                                </Button>
                                                                <Button variant="outline" className="gap-2" onClick={handleAddToMontage} disabled={isProcessing}>
                                                                    <Layers className="w-4 h-4" /> Add to Montage
                                                                </Button>
                                                            </div>
                                                            {montageQueue.length > 0 && (
                                                                <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                                                                    <div className="flex justify-between items-center mb-2">
                                                                        <span className="text-[10px] font-bold uppercase">Montage Queue ({montageQueue.length})</span>
                                                                        <Button variant="magic" size="sm" className="h-6 text-[10px]" onClick={handleRenderMontage} disabled={isProcessing}>
                                                                            Render montage
                                                                        </Button>
                                                                    </div>
                                                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                                                        {montageQueue.map((seg) => (
                                                                            <div key={seg.id} className="bg-white/50 border rounded p-1 text-[9px] min-w-[60px] text-center relative group">
                                                                                {seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s
                                                                                <button
                                                                                    onClick={() => setMontageQueue(q => q.filter(s => s.id !== seg.id))}
                                                                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3 h-3 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                >
                                                                                    ×
                                                                                </button>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center p-12">
                                                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-primary/30 group-hover:border-primary transition-colors">
                                                            <Upload className="text-muted-foreground w-8 h-8" />
                                                        </div>
                                                        <p className="text-muted-foreground mb-4">Upload a video to start editing</p>
                                                        <Button variant="magic" onClick={() => fileInputRef.current?.click()}>Select Video</Button>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>

                                        <Card className="col-span-4 glass border-white/40 flex flex-col">
                                            <CardHeader className="py-3 px-4 border-b bg-muted/20 flex flex-row items-center justify-between">
                                                <CardTitle className="text-sm font-medium">Tools & History</CardTitle>
                                                <Clock className="w-4 h-4 text-muted-foreground" />
                                            </CardHeader>
                                            <CardContent className="p-4 flex-1 flex flex-col gap-6 overflow-hidden">
                                                <Tabs defaultValue="tools" className="flex-1 flex flex-col">
                                                    <TabsList className="grid grid-cols-2 w-full mb-4">
                                                        <TabsTrigger value="tools">Tools</TabsTrigger>
                                                        <TabsTrigger value="history">History</TabsTrigger>
                                                    </TabsList>

                                                    <TabsContent value="tools" className="space-y-6 overflow-auto pr-1">
                                                        <div className="space-y-3">
                                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                                <Wand2 className="w-3 h-3" /> Effects
                                                            </label>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {['Vintage', 'Noir', 'Glow', 'Identity'].map(effect => (
                                                                    <Button
                                                                        key={effect}
                                                                        variant="outline"
                                                                        className="justify-start h-12 relative overflow-hidden group hover:border-primary/50"
                                                                        onClick={() => applyEffect(effect === 'Identity' ? 'default' : effect)}
                                                                        disabled={!videoFile || isProcessing}
                                                                    >
                                                                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                        {effect}
                                                                    </Button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-3 pt-4 border-t">
                                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 text-primary">
                                                                <Wand2 className="w-3 h-3" /> Magic Asset Generation
                                                            </label>
                                                            <div className="space-y-2">
                                                                <div className="flex gap-2">
                                                                    <textarea
                                                                        className="flex-1 min-h-[60px] text-xs p-2 rounded border bg-background resize-none focus:ring-1 focus:ring-primary outline-none"
                                                                        placeholder="Describe an image to generate..."
                                                                        value={magicPrompt}
                                                                        onChange={(e) => setMagicPrompt(e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <Button variant="outline" size="sm" className="flex-1 text-[10px]" onClick={handleGenerateMagicPrompt}>
                                                                        Magic Prompt
                                                                    </Button>
                                                                    <Button variant="magic" size="sm" className="flex-1 text-[10px]" onClick={handleGenerateImage} disabled={isGeneratingImage || !magicPrompt}>
                                                                        {isGeneratingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : "Generate"}
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-2 mt-2">
                                                                {generatedImages.map((img) => (
                                                                    <div key={img.id} className="aspect-square rounded border overflow-hidden bg-muted group relative">
                                                                        <img src={img.url} className="w-full h-full object-cover" />
                                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                                                                            <Upload className="text-white w-4 h-4" />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </TabsContent>

                                                    <TabsContent value="history" className="flex-1 flex flex-col overflow-hidden">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Recent Edits</span>
                                                            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setHistory([])}>Clear</Button>
                                                        </div>
                                                        <div className="flex-1 overflow-auto space-y-2 pr-1">
                                                            {history.length > 0 ? history.map((item) => (
                                                                <div key={item.id} className="flex flex-col p-2 rounded border bg-card/50 text-[11px] gap-1 hover:bg-muted/30 transition-colors">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="font-semibold text-primary">{item.type.toUpperCase()}</span>
                                                                        <span className="text-[9px] text-muted-foreground">{new Date(item.timestamp).toLocaleTimeString()}</span>
                                                                    </div>
                                                                    <p className="text-muted-foreground line-clamp-1">{item.label}</p>
                                                                </div>
                                                            )) : (
                                                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2 pt-8">
                                                                    <RotateCcw className="w-8 h-8 opacity-10" />
                                                                    <p className="text-xs">No edit history yet</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TabsContent>
                                                </Tabs>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </TabsContent>

                                <TabsContent value="ai" className="h-full m-0">
                                    <div className="max-w-4xl mx-auto space-y-6">
                                        <Card className="glass border-white/40">
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <Wand2 className="w-5 h-5 text-primary" />
                                                    Ollama Timeframe Analysis
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-6">
                                                <div className="flex justify-between items-center text-sm px-2">
                                                    <span className="text-muted-foreground italic">Analyzing sequence: <span className="text-primary font-mono">{startTime.toFixed(1)}s - {endTime.toFixed(1)}s</span></span>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <Clock className="w-3 h-3" />
                                                        <span>{(endTime - startTime).toFixed(1)}s Duration</span>
                                                    </div>
                                                </div>
                                                <div className="min-h-[240px] bg-muted/20 rounded-xl p-6 border-2 border-dashed border-muted/50">
                                                    {isAiLoading ? (
                                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                                                            <Loader2 className="w-8 h-8 animate-spin" />
                                                            <p>AI is analyzing the timeframe...</p>
                                                        </div>
                                                    ) : aiAnalysis ? (
                                                        <div className="prose prose-sm max-w-none">
                                                            <p className="whitespace-pre-wrap leading-relaxed">{aiAnalysis}</p>
                                                        </div>
                                                    ) : (
                                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                                                            <ImageIcon className="w-12 h-12 opacity-20" />
                                                            <p>Select a range in the Edit tab and click analyze</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="magic"
                                                    className="w-full h-12 text-md shadow-xl"
                                                    onClick={runAiAnalysis}
                                                    disabled={!videoFile || isAiLoading}
                                                >
                                                    {isAiLoading ? "Processing..." : "Generate Tactical Insight"}
                                                </Button>
                                            </CardContent>
                                        </Card>

                                        <div className="grid grid-cols-2 gap-4">
                                            <Card className="glass border-white/20 p-4">
                                                <h4 className="text-sm font-semibold mb-2">Analysis Tool</h4>
                                                <p className="text-xs text-muted-foreground">Uses Llama3 to analyze objects and movement in the selected sequence.</p>
                                            </Card>
                                            <Card className="glass border-white/20 p-4">
                                                <h4 className="text-sm font-semibold mb-2">Local Connection</h4>
                                                <p className="text-xs text-muted-foreground">Connected to http://localhost:11434</p>
                                            </Card>
                                        </div>
                                    </div>
                                </TabsContent>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </Tabs>
            </main>

            {/* Timeline */}
            <footer className="h-48 border-t glass p-4 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                        {videoRef.current ? Math.floor(videoRef.current.currentTime) : 0}s / {Math.floor(duration)}s
                    </span>
                    <div className="flex-1 h-2 bg-muted rounded-full relative overflow-hidden">
                        <div
                            className="absolute top-0 h-full magic-gradient transition-all duration-300"
                            style={{
                                left: `${(startTime / duration) * 100}%`,
                                width: `${((endTime - startTime) / duration) * 100}%`
                            }}
                        />
                    </div>
                </div>
                <div className="flex-1 w-full overflow-x-auto overflow-y-hidden flex gap-2 p-1 bg-muted/10 rounded-lg border border-dashed border-muted/30">
                    {frames.length > 0 ? frames.map((f, i) => (
                        <div key={i} className="h-full aspect-video rounded-sm overflow-hidden border border-border/50 flex-shrink-0 hover:scale-105 transition-transform cursor-grab active:cursor-grabbing">
                            <img src={f} className="w-full h-full object-cover" />
                        </div>
                    )) : (
                        <div className="w-full flex items-center justify-center text-xs text-muted-foreground italic">
                            Timeline empty - frames will appear here after upload
                        </div>
                    )}
                </div>
            </footer>
        </div>
    );
};

export default EditorLayout;
