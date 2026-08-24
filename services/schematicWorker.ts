import { parseMinecraftSchematic, generatePresetSchematic, cullHiddenBlocks, SchematicData, SchematicBlock } from './SchematicParser';

self.onmessage = async (event: MessageEvent) => {
  const { id, action, payload } = event.data;

  try {
    if (action === 'PARSE_BINARY') {
      const { buffer, title } = payload;
      const schematicData: SchematicData = await parseMinecraftSchematic(buffer, title);
      const visibleBlocks: SchematicBlock[] = cullHiddenBlocks(schematicData.blocks);

      self.postMessage({
        id,
        status: 'SUCCESS',
        payload: { schematicData, visibleBlocks }
      });
    } else if (action === 'GENERATE_PRESET') {
      const { presetName } = payload;
      const schematicData: SchematicData = generatePresetSchematic(presetName);
      const visibleBlocks: SchematicBlock[] = cullHiddenBlocks(schematicData.blocks);

      self.postMessage({
        id,
        status: 'SUCCESS',
        payload: { schematicData, visibleBlocks }
      });
    } else {
      throw new Error(`Acción no reconocida: ${action}`);
    }
  } catch (err: any) {
    self.postMessage({
      id,
      status: 'ERROR',
      error: err?.message || 'Error interno en Web Worker de Schematics'
    });
  }
};
