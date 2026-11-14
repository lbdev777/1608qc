/* Réglages du paiement par virement Interac manuel.
   Pour OUVRIR les commandes : remplis les deux adresses courriel ci-dessous et mets enabled: true.
     - interacEmail : l'adresse qui reçoit les virements Interac
     - ordersEmail  : l'adresse qui reçoit les demandes de commande des clients
   Tant que enabled est false (ou qu'une adresse manque), la caisse affiche « Commandes bientôt ouvertes ».
   Ne jamais mettre de mot de passe ni de clé privée dans ce fichier : il est public. */
window.STORE_MANUAL_PAYMENT = Object.freeze({
  interacEmail: '',
  ordersEmail: '',
  enabled: false
});
