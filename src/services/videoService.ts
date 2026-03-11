import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';

export class VideoService {
    private ffmpeg: FFmpeg | null = null;
    private loaded = false;

    async load() {
        if (this.loaded) return;

        this.ffmpeg = new FFmpeg();
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

        await this.ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        this.loaded = true;
        console.log('FFmpeg loaded');
    }

    async extractFrames(videoFile: File, count: number = 5): Promise<string[]> {
        if (!this.ffmpeg) throw new Error('FFmpeg not loaded');

        await this.ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));

        // Simple logic to extract frames at intervals
        // In a real app, we'd use duration to calculate specific timestamps
        await this.ffmpeg.exec(['-i', 'input.mp4', '-vf', `fps=${count}/10`, 'frame%d.jpg']);

        const frames: string[] = [];
        for (let i = 1; i <= count; i++) {
            try {
                const data: any = await this.ffmpeg.readFile(`frame${i}.jpg`);
                const blob = new Blob([data], { type: 'image/jpeg' });
                frames.push(URL.createObjectURL(blob));
            } catch (e) {
                console.warn(`Could not read frame ${i}`, e);
            }
        }

        return frames;
    }

    async applyEffect(videoFile: File, effect: string): Promise<Blob> {
        if (!this.ffmpeg) throw new Error('FFmpeg not loaded');

        await this.ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));

        let filter = '';
        switch (effect.toLowerCase()) {
            case 'noir':
                filter = 'colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3';
                break;
            case 'vintage':
                filter = 'curves=vintage';
                break;
            case 'glow':
                filter = 'unsharp=5:5:1.0:5:5:0.0';
                break;
            default:
                filter = 'copy';
        }

        await this.ffmpeg.exec(['-i', 'input.mp4', '-vf', filter, 'output.mp4']);
        const data: any = await this.ffmpeg.readFile('output.mp4');
        return new Blob([data], { type: 'video/mp4' });
    }
    async cut(videoFile: File, start: number, end: number): Promise<Blob> {
        if (!this.ffmpeg) throw new Error('FFmpeg not loaded');

        await this.ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));

        // duration = end - start
        const duration = end - start;
        await this.ffmpeg.exec([
            '-ss', start.toString(),
            '-i', 'input.mp4',
            '-t', duration.toString(),
            '-c', 'copy',
            'output.mp4'
        ]);

        const data: any = await this.ffmpeg.readFile('output.mp4');
        return new Blob([data], { type: 'video/mp4' });
    }

    async montage(files: File[]): Promise<Blob> {
        if (!this.ffmpeg) throw new Error('FFmpeg not loaded');

        const listContent = files.map((_, i) => `file 'input${i}.mp4'`).join('\n');
        await this.ffmpeg.writeFile('list.txt', listContent);

        for (let i = 0; i < files.length; i++) {
            await this.ffmpeg.writeFile(`input${i}.mp4`, await fetchFile(files[i]));
        }

        await this.ffmpeg.exec([
            '-f', 'concat',
            '-safe', '0',
            '-i', 'list.txt',
            '-c', 'copy',
            'output.mp4'
        ]);

        const data: any = await this.ffmpeg.readFile('output.mp4');
        return new Blob([data], { type: 'video/mp4' });
    }
}

export const videoService = new VideoService();
