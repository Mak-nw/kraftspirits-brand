// Усі словники за мовою (для збірки й qa). Браузерний код імпортує лише runtime.js (малий словник js.*).
import uk, { files as ukFiles } from './uk/index.js';
import en, { files as enFiles } from './en/index.js';
export const DICTS = { uk, en };
export const DICT_FILES = { uk: ukFiles, en: enFiles };
