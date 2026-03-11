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
    Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { videoService } from '@/services/videoService';
import { ollamaService } from '@/services/ollamaService';

const EditorLayout: React.FC = () => {
    const [activeTab, setActiveTab] = useState("edit");
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [frames, setFrames] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<string>("");
    const [isAiLoading, setIsAiLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        videoService.load().catch(console.error);
    }, []);

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

    const applyEffect = async (effect: string) => {
        if (!videoFile) return;
        setIsProcessing(true);
        try {
            const resultBlob = await videoService.applyEffect(videoFile, effect);
            const resultUrl = URL.createObjectURL(resultBlob);
            setVideoUrl(resultUrl);
        } catch (err) {
            console.error("Effect application failed", err);
        } finally {
            setIsProcessing(false);
        }
    };

    const runAiAnalysis = async () => {
        setIsAiLoading(true);
        try {
            const result = await ollamaService.analyzeTimeframe("Analyze the visual composition of this video sequence.");
            setAiAnalysis(result);
        } catch (err) {
            setAiAnalysis("Failed to connect to Ollama.");
        } finally {
            setIsAiLoading(false);
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
                                                <div className="flex gap-2">
                                                    {isProcessing && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <Settings className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="flex-1 flex items-center justify-center p-0 bg-black/5 relative group">
                                                {videoUrl ? (
                                                    <video
                                                        src={videoUrl}
                                                        controls
                                                        className="max-h-full max-w-full shadow-2xl rounded"
                                                    />
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

                                        <Card className="col-span-4 glass border-white/40">
                                            <CardHeader className="py-3 px-4 border-b bg-muted/20">
                                                <CardTitle className="text-sm font-medium">Effects & Tools</CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-4 space-y-6">
                                                <div className="space-y-3">
                                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                        <Wand2 className="w-3 h-3" /> Effects
                                                    </label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {['Vintage', 'Noir', 'Glow', 'Identity'].map(effect => (
                                                            <Button
                                                                key={effect}
                                                                variant="outline"
                                                                className="justify-start h-14 relative overflow-hidden group hover:border-primary/50"
                                                                onClick={() => applyEffect(effect === 'Identity' ? 'default' : effect)}
                                                                disabled={!videoFile || isProcessing}
                                                            >
                                                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                {effect}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                        <ImageIcon className="w-3 h-3" /> Extracted Frames
                                                    </label>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {frames.length > 0 ? frames.map((f, i) => (
                                                            <div key={i} className="aspect-video rounded border overflow-hidden bg-muted group relative">
                                                                <img src={f} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                                    <Play className="text-white w-4 h-4" />
                                                                </div>
                                                            </div>
                                                        )) : (
                                                            Array(6).fill(0).map((_, i) => (
                                                                <div key={i} className="aspect-video rounded border-2 border-dashed border-muted bg-muted/10" />
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
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
                                                <div className="min-h-[200px] bg-muted/20 rounded-xl p-6 border-2 border-dashed border-muted/50">
                                                    {isAiLoading ? (
                                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                                                            <Loader2 className="w-8 h-8 animate-spin" />
                                                            <p>AI is analyzing the frames...</p>
                                                        </div>
                                                    ) : aiAnalysis ? (
                                                        <div className="prose prose-sm max-w-none">
                                                            <p className="whitespace-pre-wrap">{aiAnalysis}</p>
                                                        </div>
                                                    ) : (
                                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                                                            <ImageIcon className="w-12 h-12 opacity-20" />
                                                            <p>Upload video and click analyze to start</p>
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
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">00:00:00 / 00:00:00</span>
                    <div className="flex-1 h-2 bg-muted rounded-full relative cursor-pointer group">
                        <div className="absolute top-0 left-0 h-full w-0 group-hover:w-full transition-all bg-primary/10" />
                        <div className="absolute top-0 left-0 h-full w-1/3 magic-gradient rounded-full shadow-lg" />
                        <div className="absolute top-1/2 left-1/3 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-primary rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform" />
                    </div>
                </div>
                <div className="flex-1 w-full overflow-x-auto overflow-y-hidden flex gap-1 p-1 bg-muted/10 rounded-lg border border-dashed border-muted/30">
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
