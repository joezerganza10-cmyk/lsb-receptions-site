/**
 * LSB RÉCEPTIONS — Formules.
 *
 * Catégories de service confirmées par l'agence. Aucun menu détaillé, prix
 * unitaire ou minimum de commande n'est encore validé par les traiteurs
 * partenaires — chaque formule affiche donc "Proposition personnalisée"
 * plutôt qu'un menu ou un prix inventé (voir brief : ne jamais fabriquer
 * de contenu commercial non confirmé). À mettre à jour dès qu'un
 * partenaire confirme un menu, des inclusions et/ou un prix pour une
 * formule donnée — remplacer alors `confirmed:false` par le contenu réel.
 */
const FORMULES = [
  {
    id: 'buffets',
    name: 'Buffets chauds et froids',
    short: 'Un buffet généreux et varié, pensé pour les grands groupes.',
    occasions: 'Idéal pour les réceptions, événements corporatifs et rassemblements communautaires.',
    photo: null,
    confirmed: false,
  },
  {
    id: 'boites-repas',
    name: 'Boîtes-repas',
    short: 'Un repas individuel, pratique pour les groupes en mouvement.',
    occasions: 'Parfait pour les formations, journées de travail et événements avec horaire serré.',
    photo: null,
    confirmed: false,
  },
  {
    id: 'cocktails',
    name: 'Cocktails et bouchées',
    short: 'Une sélection de bouchées raffinées pour un cocktail dînatoire.',
    occasions: 'Pensé pour les réceptions debout, 5 à 7 et lancements.',
    photo: null,
    confirmed: false,
  },
  {
    id: 'repas-service',
    name: 'Repas avec service',
    short: 'Un repas assis, servi à table par du personnel dédié.',
    occasions: 'Pour les mariages, galas et réceptions plus formelles.',
    photo: null,
    confirmed: false,
  },
  {
    id: 'dejeuners',
    name: 'Déjeuners et pauses-café',
    short: 'De quoi bien commencer une journée de rencontres ou de formation.',
    occasions: 'Pour les événements corporatifs en matinée ou en avant-midi.',
    photo: null,
    confirmed: false,
  },
];

if (typeof module !== 'undefined') module.exports = { FORMULES };
