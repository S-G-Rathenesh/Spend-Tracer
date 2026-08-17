/**
 * AIService wrapper for app-wide AI inference access.
 */

import { SpendTracerAI, SpendTracerAIOutput } from './SpendTracerAI';
import { ModelLoader, ModelLoadStats } from './ModelLoader';

export class AIService {
  public static async init(): Promise<ModelLoadStats> {
    const loader = ModelLoader.getInstance();
    return await loader.initialize();
  }

  public static async analyzeSMS(smsText: string): Promise<SpendTracerAIOutput> {
    const ai = SpendTracerAI.getInstance();
    return await ai.processSMS(smsText);
  }

  public static isReady(): boolean {
    return ModelLoader.getInstance().isLoaded();
  }
}
