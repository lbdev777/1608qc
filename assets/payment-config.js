/* Configuration marchande 1608. Ne jamais mettre de mot de passe ou clé privée ici. 
   Les adresses publiques seront complétées après confirmation du propriétaire. */
window.STORE_MANUAL_PAYMENT = Object.freeze({
  interacEmail: 'paiementsmillesixcenthuit@gmail.com',
  ordersEmail: 'paiementsmillesixcenthuit@gmail.com',
  // URL HTTPS publique du Worker de commandes (voir CLOUDFLARE-COMMANDES.md). Vide = ancien mode courriel.
  apiUrl: 'https://1608-orders.louisbeaulieu33.workers.dev',
  // Collecte de statistiques de visite (sans cookie ni IP). Vide = aucune statistique.
  trackUrl: 'https://1608-track.louisbeaulieu33.workers.dev',
  enabled: true
});
