import { SchematicData, SchematicBlock, parseMinecraftSchematic, generatePresetSchematic, cullHiddenBlocks } from './SchematicParser';

interface WorkerResponse {
  id: number;
  status: 'SUCCESS' | 'ERROR';
  payload?: {
    schematicData: SchematicData;
    visibleBlocks: SchematicBlock[];
  };
  error?: string;
}

let workerInstance: Worker | null = null;
let idCounter = 0;
const pendingCallbacks = new Map<number, { resolve: (val: { schematicData: SchematicData; visibleBlocks: SchematicBlock[] }) => void; reject: (err: any) => void }>();

function getWorker(): Worker | null {
  if (typeof window === 'undefined') return null;

  if (!workerInstance) {
    try {
      workerInstance = new Worker(new URL('./schematicWorker.ts', import.meta.url), { type: 'module' });
      workerInstance.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { id, status, payload, error } = event.data;
        const cb = pendingCallbacks.get(id);
        if (cb) {
          pendingCallbacks.delete(id);
          if (status === 'SUCCESS' && payload) {
            cb.resolve(payload);
          } else {
            cb.reject(new Error(error || 'Error procesando mapa en Web Worker'));
          }
        }
      };
      workerInstance.onerror = (err) => {
        console.warn('Web Worker error in Schematic processing. Using main-thread fallback.', err);
      };
    } catch (e) {
      console.warn('Unable to spawn Web Worker. Falling back to main-thread processing.', e);
      workerInstance = null;
    }
  }

  return workerInstance;
}

/**
 * Offloads NBT schematic parsing and occlusion culling to a Web Worker thread.
 */
export async function parseSchematicInWorker(
  buffer: ArrayBuffer,
  title: string
): Promise<{ schematicData: SchematicData; visibleBlocks: SchematicBlock[] }> {
  const worker = getWorker();

  if (worker) {
    return new Promise((resolve, reject) => {
      const id = ++idCounter;
      pendingCallbacks.set(id, { resolve, reject });
      worker.postMessage({ id, action: 'PARSE_BINARY', payload: { buffer, title } });
    });
  }

  // Direct main-thread fallback
  const schematicData = await parseMinecraftSchematic(buffer, title);
  const visibleBlocks = cullHiddenBlocks(schematicData.blocks);
  return { schematicData, visibleBlocks };
}

/**
 * Offloads procedural preset schematic generation and occlusion culling to a Web Worker thread.
 */
export async function generatePresetInWorker(
  presetName: string
): Promise<{ schematicData: SchematicData; visibleBlocks: SchematicBlock[] }> {
  const worker = getWorker();

  if (worker) {
    return new Promise((resolve, reject) => {
      const id = ++idCounter;
      pendingCallbacks.set(id, { resolve, reject });
      worker.postMessage({ id, action: 'GENERATE_PRESET', payload: { presetName } });
    });
  }

  // Direct main-thread fallback
  const schematicData = generatePresetSchematic(presetName);
  const visibleBlocks = cullHiddenBlocks(schematicData.blocks);
  return { schematicData, visibleBlocks };
}
