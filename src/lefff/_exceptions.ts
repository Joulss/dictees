import { normalizeKey } from './helpers/normalizeKey';

/**
 * Configuration d'une exception de mot
 */
interface WordException {
  surfaces: string[]; // Les formes concernées (ex: ["au", "aux", "du", "des"])
  exceptionType: string; // Label pour l'affichage (ex: "article contracté")
  description?: string; // Description optionnelle pour la documentation
}

/**
 * Liste des exceptions configurées
 *
 * Pour ajouter un nouveau type d'exception, ajoutez simplement une nouvelle entrée ici
 */
const WORD_EXCEPTIONS: WordException[] = [
  {
    surfaces      : ['au', 'aux', 'du', 'des'],
    exceptionType : 'article contracté',
    description   : 'Contraction obligatoire d\'une préposition (à/de) et d\'un article défini (le/les)'
  }
  // Exemples de futurs cas possibles :
  // {
  //   surfaces: ['hélas', 'zut', 'bah', 'euh', 'ouf'],
  //   exceptionType: 'interjection',
  //   description: 'Mot invariable exprimant une émotion ou une réaction'
  // },
  // {
  //   surfaces: ['meuh', 'cocorico', 'ouaf', 'miaou', 'tic-tac'],
  //   exceptionType: 'onomatopée',
  //   description: 'Mot imitant un son ou un bruit'
  // }
];

/**
 * Vérifie si un mot est exceptionnel et retourne son type
 * @param surface La forme de surface du mot
 * @returns Le type d'exception si trouvé, null sinon
 */
export function getWordException(surface: string): string | null {
  const normalized = normalizeKey(surface);
  for (const exception of WORD_EXCEPTIONS) {
    if (exception.surfaces.some(s => normalizeKey(s) === normalized)) {
      return exception.exceptionType;
    }
  }
  return null;
}

/**
 * Obtient toutes les surfaces exceptionnelles avec leur type (utile pour debug/admin)
 * @returns Map de surface → type d'exception
 */
export function getAllExceptionalWords(): Map<string, string> {
  const map = new Map<string, string>();
  for (const exception of WORD_EXCEPTIONS) {
    for (const surface of exception.surfaces) {
      map.set(surface, exception.exceptionType);
    }
  }
  return map;
}

/**
 * Obtient toutes les exceptions configurées (pour tests ou admin)
 * @returns Array des exceptions
 */
export function getAllExceptions(): ReadonlyArray<Readonly<WordException>> {
  return WORD_EXCEPTIONS;
}

