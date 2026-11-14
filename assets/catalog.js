/* 1608 — catalogue et règles de la boutique.
   Tout ce qui se règle (prix, rabais, livraison gratuite) est dans CE fichier.
   Les prix sont en cents CAD : 8900 = 89,00 $. */

/* ───────── Réglages de la boutique ───────── */
window.STORE_CONFIG = Object.freeze({
  siteUrl: 'https://1608qc.com',
  /* Livraison gratuite si le total des articles (après rabais) atteint ce montant, en cents.
     Mettre 0 pour désactiver complètement l'offre. */
  freeShippingOver: 15000,
  /* Délai de livraison affiché partout (pièces produites à la commande).
     À ajuster selon ce que ton fournisseur confirme. */
  leadTime: '2 à 3 semaines',
  /* Rabais ensemble : nombre de modèles DIFFÉRENTS dans le panier. */
  duoPercent: 10,
  trioPercent: 15,
  /* Looks : si toutes les pièces sont au panier, le rabais s'applique dès deux pièces. */
  looks: [
    { id: 'uniforme', name: 'LE LOOK UNIFORME', items: ['uniforme-zip', 'uniforme-jogger'], percent: 15 }
  ]
});

/* ───────── Produits ───────── */
window.STORE_PRODUCTS = Object.freeze([
  {
    id: 'orbite-noir', name: 'ORBITE 1608', variant: 'NOIR / QC·CA', category: 'hoodies',
    price: 8900, fit: 'COUPE OVERSIZED', material: 'MOLLETON NOIR',
    photos: ['assets/cb08506f9e9f4d24a062305fbe3a0427.webp', 'assets/e07bf23c434a460b9634a7b5fd4fa1cb.webp'],
    short: 'Fleurs de lys devant. Grand graphisme orbital au dos.',
    description: 'Un logo 1608 encadré de fleurs de lys sur la poitrine. Au dos, un grand graphisme orbital dessine notre signature QC/CA. Un hoodie noir oversized qui change de perspective selon l’angle.',
    features: ['Coupe oversized', '1608 et fleurs de lys sur la poitrine', 'Grand graphisme orbital blanc au dos', 'Capuche à cordon contrastant'],
    story: { title: 'LE CENTRE DE GRAVITÉ.', copy: 'Devant, les fleurs de lys encadrent 1608. Derrière, une orbite, un globe et notre signature QC/CA. Deux vues, une identité qui reste en tête.' },
    sizes: ['S', 'M', 'L', 'XL'], isNew: true
  },
  {
    id: 'terrain-camo', name: 'TERRAIN 1608', variant: 'CAMOUFLAGE FORÊT', category: 'hoodies',
    price: 8900, fit: 'COUPE BOXY', material: 'TEXTURE GAUFRÉE',
    photos: ['assets/terrain-front.webp', 'assets/terrain-back.webp'],
    short: 'Camouflage forêt. Un paysage graphique dans le dos.',
    description: 'Camouflage forêt, signature discrète sur la poitrine. Au dos, un paysage graphique traverse la pièce. Une silhouette ample pensée pour sortir du cadre.',
    features: ['Camouflage forêt texturé', 'Logo discret à l’avant', 'Grand motif montagne au dos', 'Coupe boxy unisexe'],
    story: { title: 'SORTIR DU CADRE.', copy: 'Devant, la signature reste discrète. Derrière, un paysage prend toute la place. Le camouflage forêt rencontre une coupe boxy.' },
    sizes: ['S', 'M', 'L', 'XL', '2XL']
  },
  {
    id: 'horizon-noir', name: 'HORIZON 1608', variant: 'NOIR INTÉGRAL', category: 'hoodies',
    price: 6900, fit: 'COUPE OVERSIZED', material: 'NOIR / BLANC',
    photos: ['assets/6a1acf7402a04ced88bf9d9334aa40a2.webp', 'assets/602c6f2b7a8c48eb94d47467b7a53e45.webp'],
    short: 'Logo script devant, globe blanc au dos.',
    description: 'Un logo signé 1608 devant. Une autre perspective derrière. Le globe blanc rencontre une silhouette noire à l’allure intemporelle.',
    features: ['Logo script sur la poitrine', 'Graphisme globe au dos', 'Coupe oversized', 'Noir et blanc'],
    story: { title: 'DEUX FACES. UNE SIGNATURE.', copy: 'Un logo devant, un globe derrière. HORIZON prend une silhouette noire essentielle et lui donne sa perspective.' },
    sizes: ['S', 'M', 'L', 'XL', '2XL']
  },
  {
    id: 'signature-brode', name: 'SIGNATURE 1608', variant: 'NOIR / LETTRAGE BLANC', category: 'hoodies',
    price: 6900, fit: 'COUPE BOXY', material: 'DOS UNI',
    photos: ['assets/3594dcaa9f47498a85141f0fcd303e7d.webp', 'assets/e1287343258341579fbf693f24305b27.webp'],
    short: 'Lettrage signature en blanc. Dos volontairement uni.',
    description: 'Un seul détail suffit. La signature MilleSixCentHuit en blanc sur la poitrine. Dos volontairement uni, volume ample et allure nette.',
    features: ['Lettrage signature blanc sur la poitrine', 'Dos uni', 'Coupe boxy', 'Noir essentiel'],
    story: { title: 'RIEN À AJOUTER.', copy: 'Le lettrage fait tout le travail. Un détail blanc sur noir, une coupe boxy et un dos volontairement uni.' },
    sizes: ['S', 'M', 'L', 'XL', '2XL']
  },
  {
    id: 'contraste-marine', name: 'CONTRASTE 1608', variant: 'MARINE / IVOIRE', category: 'hoodies',
    price: 8900, fit: 'COUPE RAGLAN', material: 'BICOLORE',
    photos: ['assets/369259aed9eb45dabaf0d5381f59a522.webp', 'assets/7482beb55a15466a96b32ab1888e3a39.webp'],
    short: 'Marine profond, capuche ivoire, emblème au dos.',
    description: 'Marine profond et capuche ivoire. Deux fleurs de lys encadrent le 1608 à l’avant. Au dos, notre emblème signature prend toute la place.',
    features: ['Capuche ivoire contrastante', 'Manches raglan', 'Emblème grand format au dos', 'Poche avant'],
    story: { title: 'LE CONTRASTE JUSTE.', copy: 'Marine profond. Capuche ivoire. Deux fleurs de lys en façade, un emblème au dos. Les détails portent la pièce.' },
    sizes: ['S', 'M', 'L', 'XL', '2XL']
  },
  {
    id: 'archive-denim', name: 'ARCHIVE 1608', variant: 'DENIM DÉLAVÉ', category: 'denim',
    price: 6900, fit: 'COUPE LARGE', material: 'DENIM GRIS',
    photos: ['assets/a759c522e675400aaceb6aabeb5356d6.webp', 'assets/009795ccb75940d0967947b4e9f32de1.webp'],
    short: 'Short long en denim gris délavé. Signature verticale.',
    description: 'Un short long en denim gris délavé. Signature verticale sur la jambe, détails usés et volume assumé. Une pièce qui se remarque sans en faire trop.',
    features: ['Denim gris délavé', 'Lettrage vertical blanc', 'Coupe large', 'Poches avant et arrière'],
    story: { title: 'LE DENIM, SANS DÉTOUR.', copy: 'Un gris délavé, une coupe large et un marquage vertical. ARCHIVE joue sur les proportions, pas sur les artifices.' },
    sizes: ['S', 'M', 'L', 'XL', '2XL']
  },
  {
    id: 'heritage-noir', name: 'HÉRITAGE 1608', variant: 'NOIR / GRAPHISME', category: 'hoodies',
    price: 10900, fit: 'COUPE AMPLE', material: 'HEAVYWEIGHT',
    photos: ['assets/9fe74b8725ae46c4b48458ce342efb62.webp', 'assets/7d1c7f4ba5054b3aa26d3cb72500235c.webp'],
    short: 'Heavyweight. Manches et dos entièrement travaillés.',
    description: 'Une signature compacte sur la poitrine. Des manches et un dos travaillés en contraste. HÉRITAGE assemble les codes 1608 sur un hoodie à présence forte.',
    features: ['Coton ouaté heavyweight', 'Graphismes sur les manches', 'Impression au dos', 'Coupe ample'],
    story: { title: 'SIGNÉ DE PARTOUT.', copy: 'Une signature compacte devant, des manches travaillées et un dos graphique. HÉRITAGE rassemble les codes 1608.' },
    sizes: ['S', 'M', 'L', 'XL', '2XL']
  },
  {
    id: 'uniforme-zip', name: 'UNIFORME ZIP 1608', variant: 'NOIR DÉLAVÉ / SIGNATURE', category: 'hoodies',
    price: 9900, fit: 'COUPE AMPLE', material: 'FERMETURE ÉCLAIR',
    photos: ['assets/b628367f22434b5bb29ac5968e05b077.webp', 'assets/e18d77ba9c5c427eb264409ffacbb8ed.webp'],
    short: 'Zip noir délavé. À porter seul ou avec le jogger.',
    description: 'Zip à capuche noir délavé. Signature manuscrite sur la poitrine, grand 1608 au dos et fermeture pleine longueur. À porter seul ou avec le jogger assorti.',
    features: ['Noir à effet délavé', 'Fermeture éclair pleine longueur', 'Signature blanche sur la poitrine', 'Marquage grand format au dos'],
    story: { title: 'LE ZIP. LA SIGNATURE.', copy: 'Un effet délavé, une signature manuscrite et un grand 1608 au dos. Combine-le au jogger coordonné pour faire le look complet.' },
    sizes: ['S', 'M', 'L', 'XL', '2XL'], pairedWith: 'uniforme-jogger'
  },
  {
    id: 'uniforme-jogger', name: 'UNIFORME JOGGER 1608', variant: 'NOIR / SIGNATURE', category: 'pants',
    price: 7900, fit: 'COUPE DÉCONTRACTÉE', material: 'TAILLE ÉLASTIQUE',
    photos: ['assets/e5a25fb4c850489785a491f805092f4a.webp', 'assets/d76dd70aeebd4c25ba02bf651df1dbab.webp'],
    short: 'Jogger noir assorti au zip. Signature sur la cuisse.',
    description: 'Pantalon jogger noir assorti au zip UNIFORME. Signature blanche sur la cuisse, cordon à la taille et chevilles resserrées. Une silhouette coordonnée sans en faire trop.',
    features: ['Pantalon noir', 'Signature blanche sur la cuisse', 'Taille élastique avec cordon', 'Bas de jambe resserrés'],
    story: { title: 'LA SILHOUETTE COMPLÈTE.', copy: 'Une jambe ample, une signature discrète et les bons détails. Le jogger vient compléter le zip UNIFORME 1608.' },
    sizes: ['S', 'M', 'L', 'XL', '2XL'], pairedWith: 'uniforme-zip'
  }
]);

window.STORE_CURRENCY = cents => new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 2 }).format(cents / 100);

/* ───────── Calcul du panier (partagé par le panier, la caisse et les pages) ───────── */
window.STORE_BUNDLE_PRICING = Object.freeze({
  calculate(lines) {
    const cfg = window.STORE_CONFIG;
    const catalog = window.STORE_PRODUCTS || [];
    const valid = (Array.isArray(lines) ? lines : []).filter(line =>
      catalog.some(p => p.id === line.id) && Number.isInteger(line.qty) && line.qty > 0 && line.qty <= 10);
    const subtotal = valid.reduce((sum, line) => sum + catalog.find(p => p.id === line.id).price * line.qty, 0);
    const ids = new Set(valid.map(line => line.id));
    const models = ids.size;

    const look = cfg.looks.find(l => l.items.every(id => ids.has(id))) || null;
    let percent = models >= 3 ? cfg.trioPercent : models === 2 ? cfg.duoPercent : 0;
    if (look) percent = Math.max(percent, look.percent);

    const discount = Math.round(subtotal * percent / 100);
    const total = subtotal - discount;

    /* Prochain palier de rabais (pour encourager sans tromper). */
    let next = null;
    if (models === 1) next = { percent: cfg.duoPercent, text: 'Ajoute un 2e modèle différent pour −' + cfg.duoPercent + ' %' };
    else if (models === 2 && percent < cfg.trioPercent) next = { percent: cfg.trioPercent, text: 'Ajoute un 3e modèle différent pour −' + cfg.trioPercent + ' %' };

    const threshold = cfg.freeShippingOver;
    const freeShipping = threshold > 0 && subtotal > 0 && total >= threshold;
    const toFreeShipping = threshold > 0 && subtotal > 0 ? Math.max(0, threshold - total) : 0;

    return { subtotal, discount, total, percent, models, look, next, threshold, freeShipping, toFreeShipping };
  }
});
