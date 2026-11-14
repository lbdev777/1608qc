# 1608 — Boutique / mode de préouverture

**Site public :** https://1608qc.com/ (GitHub Pages; fichier `CNAME` présent).

## Site actuellement publié
- `index.html` : vraie page publique **De retour bientôt**, sobre, adaptée au mobile.
- `assets/coming-soon.css` / `assets/coming-soon.js` : page d’attente, aperçus floutés de véritables produits, bouton d’indice et discret easter egg.
- `admin.html` : portail **public** donnant accès à la **connexion officielle de GitHub** pour gérer le dépôt. Ce n’est **pas** un tableau de bord privé ni une authentification interne.
- `boutique-preview.html` : copie de l’ancien accueil conservée pour travailler sur le design. **Cette URL est publiquement accessible** si connue. Les commandes demeurent désactivées.
- Les anciens fichiers `produit-*.html`, `produit.html` et `checkout.html` restent disponibles dans le dépôt pour la reprise, mais `assets/site.js` redirige actuellement les visiteurs vers l’accueil. Ce blocage est une redirection d’expérience utilisateur (ne remplace pas la sécurité serveur).
- `404.html` ramène les anciennes adresses inexistantes vers l’accueil.

## Avant de rouvrir
1. Confirmer disponibilités, coûts, tailles, guides des tailles, livraison, taxes et retours.
2. Vérifier les neuf pages produits, leurs photos, les filtres, le panier et les rabais duo/trio.
3. Mettre à jour les informations légales, le domaine canonique et les images de partage.
4. Réactiver l’accueil depuis `boutique-preview.html`, puis retirer la redirection de maintenance de `assets/site.js`. Tester le déploiement GitHub Pages réel.
5. Configurer la réception des commandes seulement après validation des adresses du commerçant et du processus de vérification des virements.

## Paiement
`assets/payment-config.js` contient toujours **`enabled: false`**, avec les adresses `ordersEmail` et `interacEmail` vides. Aucun virement n’est collecté par le site. Même après configuration, le mécanisme `mailto:` ne fait que préparer un courriel que le visiteur doit envoyer manuellement; il ne crée pas de commande en backend.

## Sécurité de l’administration
GitHub Pages n’exécute pas de code serveur et ne peut pas assurer seul un mot de passe, une session privée ou des autorisations robustes pour `/admin.html`. Pour l’instant, la page transmet aux outils de gestion GitHub et la connexion est **effectuée sur github.com**. Pour une véritable administration privée sous le domaine 1608qc.com, il faudra un fournisseur d'identité et un backend, par exemple avec OAuth GitHub côté serveur. Ne jamais mettre de mot de passe, de jeton, de secret OAuth ou de clé API dans un fichier JavaScript public.

## Déploiement
Paramètres GitHub → Pages → source `main` → `/(root)`. La configuration DNS doit pointer vers GitHub Pages. Le fichier `CNAME` du dépôt contient `1608qc.com`.
