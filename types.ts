export enum AspectRatio {
  SQUARE = '1:1',
  LANDSCAPE = '16:9',
  PORTRAIT = '9:16',
  STANDARD = '4:3',
  TALL = '3:4'
}

export interface AppState {
  currentImage: string | null; // Base64 data URL
  history: string[];
  isGenerating: boolean;
  error: string | null;
  mode: 'generate' | 'edit';
}

export interface GenerationConfig {
  prompt: string;
  ratio: AspectRatio;
}
