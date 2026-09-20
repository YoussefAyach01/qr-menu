/** Flash messages shown on dashboard/login/signup, keyed by the ?msg= / ?error= codes the actions redirect with. */
export const MESSAGES: Record<string, string> = {
  welcome: 'Bienvenue ! Commencez par ajouter une catégorie, puis vos plats.',
  settings_saved: 'Réglages enregistrés.',
  category_added: 'Catégorie ajoutée.',
  category_deleted: 'Catégorie supprimée avec ses plats.',
  item_added: 'Plat ajouté.',
  item_saved: 'Plat mis à jour.',
  item_deleted: 'Plat supprimé.',
};

export const ERRORS: Record<string, string> = {
  rate: 'Trop de tentatives. Réessayez dans quelques minutes.',
  email_taken: 'Un compte existe déjà avec cet e-mail. Connectez-vous plutôt.',
  invalid_credentials: 'E-mail ou mot de passe incorrect.',
  invalid_email: 'Entrez une adresse e-mail valide.',
  invalid_password: 'Le mot de passe doit contenir au moins 10 caractères.',
  invalid_restaurantName: 'Entrez le nom de votre restaurant (2 caractères minimum).',
  invalid_whatsapp: 'Numéro WhatsApp invalide. Exemple : 0612345678.',
  invalid_settings: 'Réglages invalides : vérifiez le nom, le numéro WhatsApp et la couleur.',
  invalid_category: 'Donnez un nom à la catégorie (60 caractères maximum).',
  invalid_item: 'Plat invalide : nom obligatoire et prix valide (ex. 45 ou 12,50).',
  category_not_found: 'Catégorie introuvable.',
  plan_limit: 'Limite de 20 plats atteinte sur l’offre gratuite. Passez à Pro pour en ajouter davantage.',
};

export const pick = (map: Record<string, string>, code: string | undefined): string | undefined =>
  code ? map[code] : undefined;
