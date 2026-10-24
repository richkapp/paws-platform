/** Original demo prose only. Real dog descriptions remain in the entered language.
 * This explicit dictionary is local: it never sends animal records to a translation service.
 */
const english: Record<string, string> = {
  "Calmo e curioso": "Calm and curious",
  "Meiga e observadora": "Gentle and observant",
  "Ativo e brincalhão": "Active and playful",
  "Tranquila e delicada": "Quiet and gentle",
  "Inteligente e atenta": "Clever and attentive",
  "Sociável e alegre": "Sociable and cheerful",
  "Doce e paciente": "Sweet and patient",
  "Afetuoso e divertido": "Affectionate and fun",
  "Um companheiro fictício que adora descobrir cheiros no jardim.": "A fictional companion who loves discovering scents in the garden.",
  "Uma personagem de exemplo que prefere conhecer pessoas com calma.": "An example character who prefers meeting people slowly.",
  "Um aventureiro inventado para demonstrar perfis com muita energia.": "An imaginary adventurer demonstrating high-energy profiles.",
  "Esta cadela fictícia gosta de rotinas previsíveis e passeios tranquilos.": "This fictional dog enjoys predictable routines and quiet walks.",
  "Uma exploradora de faz de conta que aprecia jogos e aprendizagem.": "A make-believe explorer who enjoys games and learning.",
  "Um cão imaginário que gosta de companhia e de uma boa brincadeira.": "An imaginary dog who enjoys company and a good game.",
  "Nesta história de demonstração, já encontrou uma família.": "In this demonstration story, she has already found a family.",
  "Uma adoção fictícia para demonstrar o estado adotado no site.": "A fictional adoption demonstrating the adopted status on the site.",
  "Animal e história inteiramente fictícios.": "Entirely fictional animal and story.",
  "Cruzado (exemplo)": "Mixed breed (example)"
};
export function demoDogText(value: string, locale: 'pt' | 'en'): string {
  if (locale === 'pt') return value;
  return value.split('\n').map((line) => {
    for (const [source, target] of Object.entries(english)) line = line.replaceAll(source, target);
    return line;
  }).join('\n');
}
