/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ImageModelType, IdentityEngineType, GenerationParams, CharacterProfile } from './types';

export interface ModelSpecification {
  id: ImageModelType;
  displayName: string;
  provider: 'local_gpu' | 'cloud_api';
  minVRAM_MB: number;
  recommendedVRAM_MB: number;
  compatibleIdentityEngines: IdentityEngineType[];
  supportsInpainting: boolean;
  supportsControlNet: boolean;
  defaultSteps: number;
  defaultCFG: number;
  supportedResolutions: [number, number][];
  pricingOrLicense: string;
}

export interface ModelAdapter {
  spec: ModelSpecification;
  validateCompatibility(params: GenerationParams): { compatible: boolean; error?: string };
  formatPrompt(character: CharacterProfile, basePrompt: string): string;
  generateComfyUINodes(params: GenerationParams, character: CharacterProfile): Record<string, any>;
}

export class ModelAdapterRegistry {
  private static adapters: Map<ImageModelType, ModelAdapter> = new Map();

  public static initialize(): void {
    if (this.adapters.size > 0) return;

    // 1. FLUX.2 Max Adapter
    this.adapters.set('FLUX.2 Max', {
      spec: {
        id: 'FLUX.2 Max',
        displayName: 'FLUX.2 Max (12B Rectified Flow)',
        provider: 'local_gpu',
        minVRAM_MB: 12288,
        recommendedVRAM_MB: 16384,
        compatibleIdentityEngines: ['PuLID', 'LoRA Dedicated', 'Character Identity Lock'],
        supportsInpainting: true,
        supportsControlNet: true,
        defaultSteps: 28,
        defaultCFG: 3.5,
        supportedResolutions: [[1024, 1024], [768, 1360], [1360, 768], [896, 1152]],
        pricingOrLicense: 'Black Forest Labs FLUX.1 Non-Commercial / Dev License'
      },
      validateCompatibility(params: GenerationParams) {
        if (params.identityEngine === 'IP-Adapter FaceID') {
          return {
            compatible: false,
            error: 'Incompatible Architecture: IP-Adapter FaceID is designed for SD1.5/SDXL UNet models. Use "PuLID" or "LoRA Dedicated" with FLUX.2 Max.'
          };
        }
        return { compatible: true };
      },
      formatPrompt(character: CharacterProfile, basePrompt: string) {
        return `${basePrompt}, character ${character.name}, age ${character.age}, ${character.gender}, ${character.ethnicity}, ${character.hairColor} ${character.hairStyle}, eyes ${character.eyeColor}, wearing ${character.defaultOutfit}, ${character.facialFeatures}, photorealistic 8k, ultra-sharp focus, masterwork`;
      },
      generateComfyUINodes(params: GenerationParams, character: CharacterProfile) {
        return {
          '1': {
            class_type: 'UNETLoader',
            inputs: { unet_name: 'flux2_max_fp8.safetensors', weight_dtype: 'fp8_e4m3fn' }
          },
          '2': {
            class_type: 'DualCLIPLoader',
            inputs: { clip_name1: 't5xxl_fp8_e4m3fn.safetensors', clip_name2: 'clip_l.safetensors', type: 'flux' }
          },
          '3': {
            class_type: 'VAELoader',
            inputs: { vae_name: 'ae.safetensors' }
          },
          '4': {
            class_type: 'PuLIDApply',
            inputs: {
              model: ['1', 0],
              pulid_file: 'pulid_flux_v1.safetensors',
              weight: 0.90,
              start_at: 0.0,
              end_at: 1.0,
              reference_embedding: character.embedding.vector.slice(0, 16)
            }
          },
          '5': {
            class_type: 'CLIPTextEncode',
            inputs: { clip: ['2', 0], text: this.formatPrompt(character, params.prompt) }
          },
          '6': {
            class_type: 'KSampler',
            inputs: {
              model: ['4', 0],
              positive: ['5', 0],
              seed: params.seed,
              steps: params.steps,
              cfg: params.cfgScale,
              sampler_name: 'euler',
              scheduler: 'simple'
            }
          }
        };
      }
    });

    // 2. GPT Image Adapter (OpenAI DALL-E / GPT-Image Cloud Gateway)
    this.adapters.set('GPT Image', {
      spec: {
        id: 'GPT Image',
        displayName: 'GPT Image (Cloud API Gateway)',
        provider: 'cloud_api',
        minVRAM_MB: 0,
        recommendedVRAM_MB: 0,
        compatibleIdentityEngines: ['Character Identity Lock', 'LoRA Dedicated'],
        supportsInpainting: true,
        supportsControlNet: false,
        defaultSteps: 40,
        defaultCFG: 7.0,
        supportedResolutions: [[1024, 1024], [1024, 1792], [1792, 1024]],
        pricingOrLicense: 'OpenAI API Standard Cloud Rates'
      },
      validateCompatibility(params: GenerationParams) {
        if (params.identityEngine === 'PuLID') {
          return {
            compatible: false,
            error: 'Incompatible Architecture: PuLID requires direct access to model latent layers and cannot be injected via OpenAI cloud image API. Use "Character Identity Lock".'
          };
        }
        return { compatible: true };
      },
      formatPrompt(character: CharacterProfile, basePrompt: string) {
        return `High-fidelity photorealistic portrait. Person named ${character.name}, consistent facial appearance with ${character.facialFeatures}, ${character.hairColor} ${character.hairStyle}, ${character.eyeColor} eyes, dressed in ${character.defaultOutfit}. Context: ${basePrompt}`;
      },
      generateComfyUINodes(params: GenerationParams, character: CharacterProfile) {
        return {
          '1': {
            class_type: 'OpenAI_Image_Gateway',
            inputs: {
              endpoint: 'https://api.openai.com/v1/images/generations',
              model: 'dall-e-3',
              prompt: this.formatPrompt(character, params.prompt),
              size: `${params.width}x${params.height}`,
              quality: 'hd'
            }
          }
        };
      }
    });

    // 3. Google Nano Banana Adapter (Gemini API Integration)
    this.adapters.set('Google Nano Banana', {
      spec: {
        id: 'Google Nano Banana',
        displayName: 'Google Nano Banana (Edge & Cloud Accelerated)',
        provider: 'cloud_api',
        minVRAM_MB: 0,
        recommendedVRAM_MB: 0,
        compatibleIdentityEngines: ['Character Identity Lock', 'LoRA Dedicated'],
        supportsInpainting: true,
        supportsControlNet: true,
        defaultSteps: 25,
        defaultCFG: 5.0,
        supportedResolutions: [[1024, 1024], [896, 1152], [1152, 896]],
        pricingOrLicense: 'Google DeepMind Developer Tier'
      },
      validateCompatibility(params: GenerationParams) {
        return { compatible: true };
      },
      formatPrompt(character: CharacterProfile, basePrompt: string) {
        return `Detailed photographic image of character ${character.name}. Facial identity features: ${character.facialFeatures}, hair: ${character.hairColor} ${character.hairStyle}, eyes: ${character.eyeColor}. Action and background: ${basePrompt}. Hyper-detailed, realistic skin pore texture, natural studio cinematic lighting.`;
      },
      generateComfyUINodes(params: GenerationParams, character: CharacterProfile) {
        return {
          '1': {
            class_type: 'Google_NanoBanana_Pipeline',
            inputs: {
              model: 'imagen-3.0-generate-002',
              prompt: this.formatPrompt(character, params.prompt),
              aspect_ratio: params.aspectRatio,
              safety_filter_level: 'block_medium_and_above'
            }
          }
        };
      }
    });

    // 4. Seedream 5 Pro Adapter
    this.adapters.set('Seedream 5 Pro', {
      spec: {
        id: 'Seedream 5 Pro',
        displayName: 'Seedream 5 Pro (Cinematic Lighting Edition)',
        provider: 'cloud_api',
        minVRAM_MB: 0,
        recommendedVRAM_MB: 0,
        compatibleIdentityEngines: ['Character Identity Lock', 'IP-Adapter FaceID'],
        supportsInpainting: true,
        supportsControlNet: true,
        defaultSteps: 35,
        defaultCFG: 6.5,
        supportedResolutions: [[1024, 1024], [720, 1280], [1280, 720]],
        pricingOrLicense: 'ByteDance Seedream Commercial Cloud'
      },
      validateCompatibility(params: GenerationParams) {
        return { compatible: true };
      },
      formatPrompt(character: CharacterProfile, basePrompt: string) {
        return `${basePrompt}, character: ${character.name}, cinematic lighting, photoreal skin texture, 35mm film grain, ${character.facialFeatures}`;
      },
      generateComfyUINodes(params: GenerationParams, character: CharacterProfile) {
        return {
          '1': {
            class_type: 'Seedream_API_Node',
            inputs: {
              engine: 'seedream-5-pro',
              prompt: this.formatPrompt(character, params.prompt),
              steps: params.steps,
              seed: params.seed
            }
          }
        };
      }
    });

    // 5. SDXL Custom Adapter (Diffusers / Local ComfyUI)
    this.adapters.set('SDXL Custom', {
      spec: {
        id: 'SDXL Custom',
        displayName: 'SDXL Custom (PyTorch & Diffusers Local)',
        provider: 'local_gpu',
        minVRAM_MB: 8192,
        recommendedVRAM_MB: 12288,
        compatibleIdentityEngines: ['IP-Adapter FaceID', 'LoRA Dedicated', 'Character Identity Lock'],
        supportsInpainting: true,
        supportsControlNet: true,
        defaultSteps: 30,
        defaultCFG: 7.0,
        supportedResolutions: [[1024, 1024], [896, 1152], [1152, 896], [768, 1344]],
        pricingOrLicense: 'Open-Source CreativeML OpenRAIL++-M License'
      },
      validateCompatibility(params: GenerationParams) {
        if (params.identityEngine === 'PuLID') {
          return {
            compatible: false,
            error: 'Incompatible Architecture: PuLID is designed exclusively for FLUX models. For SDXL Custom, please use "IP-Adapter FaceID" or "LoRA Dedicated".'
          };
        }
        return { compatible: true };
      },
      formatPrompt(character: CharacterProfile, basePrompt: string) {
        return `<lora:${character.loraModel}:${character.loraWeight}>, ${basePrompt}, ${character.name}, ${character.gender}, ${character.ethnicity}, detailed eyes, realistic skin, 8k resolution, raw photo`;
      },
      generateComfyUINodes(params: GenerationParams, character: CharacterProfile) {
        return {
          '1': {
            class_type: 'CheckpointLoaderSimple',
            inputs: { ckpt_name: 'sd_xl_base_1.0.safetensors' }
          },
          '2': {
            class_type: 'IPAdapterFaceID',
            inputs: {
              model: ['1', 0],
              ipadapter_file: 'ip-adapter-faceid-plusv2_sdxl.bin',
              weight: 0.85,
              face_embedding: character.embedding.vector.slice(0, 16)
            }
          },
          '3': {
            class_type: 'LoraLoader',
            inputs: {
              model: ['2', 0],
              lora_name: character.loraModel,
              strength_model: character.loraWeight
            }
          },
          '4': {
            class_type: 'KSampler',
            inputs: {
              model: ['3', 0],
              seed: params.seed,
              steps: params.steps,
              cfg: params.cfgScale
            }
          }
        };
      }
    });
  }

  public static getAdapter(model: ImageModelType): ModelAdapter {
    this.initialize();
    const adapter = this.adapters.get(model);
    if (!adapter) {
      throw new Error(`Model adapter not found for "${model}". Available models: ${Array.from(this.adapters.keys()).join(', ')}`);
    }
    return adapter;
  }

  public static getAllSpecifications(): ModelSpecification[] {
    this.initialize();
    return Array.from(this.adapters.values()).map(a => a.spec);
  }
}
