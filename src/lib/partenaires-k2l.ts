/** Partenaires K2L et actions types par défaut (extensibles par le Manager) */

export interface PartenaireDef {
  id: string;
  name: string;
  actions: string[];
  is_active?: boolean;
}

/** Catalogue initial — le Manager peut en ajouter d'autres en base */
export const PARTENAIRES_DEFAUT: PartenaireDef[] = [
  {
    id: 'orange-bank',
    name: 'ORANGE BANK',
    actions: [
      'Ouverture de compte',
      'Collecte KYC',
      'Activation mobile money',
      'Prospection terrain',
      'Suivi client existant',
    ],
  },
  {
    id: 'mansa-bank',
    name: 'MANSA BANK',
    actions: [
      'Ouverture de compte',
      'Collecte documents',
      'Prospection terrain',
      'Activation produit',
      'Suivi dossier',
    ],
  },
  {
    id: 'nsia-bank',
    name: 'NSIA BANK',
    actions: [
      'Ouverture de compte',
      'Souscription assurance',
      'Collecte KYC',
      'Prospection terrain',
      'Suivi client',
    ],
  },
];

export const PARTENAIRE_AUTRE = 'Autre partenaire';

export function actionsForPartenaire(
  name: string,
  catalogue: PartenaireDef[] = PARTENAIRES_DEFAUT
): string[] {
  const found = catalogue.find(
    p => p.name.toLowerCase() === (name || '').toLowerCase() && p.name !== PARTENAIRE_AUTRE
  );
  return found?.actions?.length ? found.actions : [
    'Prospection terrain',
    'Ouverture de compte',
    'Collecte documents',
    'Suivi client',
    'Autre action',
  ];
}
