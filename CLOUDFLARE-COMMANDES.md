# 1608 — Commandes sécurisées sur Cloudflare

## Ce qui est construit (rien n'est déployé, la caisse reste désactivée)
- **Worker `1608-orders`** (`worker/`) + base **D1** : reçoit les demandes de la caisse.
- **Zéro commande perdue** : la commande est écrite en base *avant* toute alerte ; l'alerte Telegram est réessayée chaque minute jusqu'à confirmation ; rappel si une demande reste sans réponse > 1 h ; résumé chaque matin (8 h, heure de l'Est en hiver) ; côté client, copie locale + renvoi automatique si le réseau tombe, avec numéro anti-doublon.
- **Zéro fuite** : coordonnées chiffrées (AES-256-GCM) en base ; alerte Telegram **minimale** par défaut (prénom, ville, articles, total — pas d'adresse ni de courriel) ; prix recalculés par le serveur ; validation stricte ; limite de débit ; champ piège anti-robot ; CORS limité à tes domaines ; aucune donnée perso dans les journaux ni les erreurs ; page `commandes.html` accessible seulement via Cloudflare Access (refus par défaut si non configuré) ; CSP stricte + HSTS dans `_headers`.
- **Page `commandes.html`** : tes commandes sur ton téléphone, changement de statut, bouton « Renvoyer alerte ».
- Tests : `node worker/build.mjs && node worker/test/run.mjs` (13 tests).

## Tes étapes (je ne peux ni ne dois les faire à ta place)
1. **Telegram : ouvre @BotFather → /newbot → copie le token. Ne me l'envoie pas.** Écris ensuite un message à ton bot, puis ouvre `https://api.telegram.org/bot<TOKEN>/getUpdates` pour lire ton `chat.id`.
2. **Génère la clé de chiffrement : `openssl rand -base64 32`. Sauvegarde-la dans ton gestionnaire de mots de passe : si elle est perdue, les coordonnées déjà stockées sont illisibles.**
3. **Entre les secrets toi-même** (dossier `worker/`) : `npx wrangler secret put TELEGRAM_BOT_TOKEN`, `PII_KEY`, et `IP_SALT` (texte aléatoire). Variables non secrètes : `TELEGRAM_CHAT_IDS` (ton chat id), `ADMIN_EMAILS` (ton courriel).
4. **Ajoute 1608qc.com à Cloudflare** (changer les serveurs de noms chez ton registraire) — seulement quand tu es prêt pour la bascule.
5. **Cloudflare Access (Zero Trust, gratuit)** : crée une application protégeant `1608qc.com/commandes.html` et `1608qc.com/api/admin/*`, autorise seulement ton courriel, active la double authentification. Mets ensuite `ACCESS_TEAM_DOMAIN` (`xxx.cloudflareaccess.com`) et `ACCESS_AUD` (étiquette AUD de l'application) dans le Worker.
6. **Après mon feu vert : crée la base D1 `1608-orders`, applique `worker/schema.sql`, déploie, mets l'URL du Worker dans `apiUrl` (`assets/payment-config.js`) et passe `enabled` à `true`.** Teste d'abord avec une fausse commande.
7. Bascule hébergement : projet **Cloudflare Pages** sur ce dépôt (branche choisie) pour que `_headers` s'applique (GitHub Pages l'ignore).

## Limites honnêtes
- Telegram n'est pas chiffré de bout en bout pour les bots : c'est pourquoi l'alerte reste minimale. `NOTIFY_DETAILS="full"` ajoute nom, courriel, adresse — à tes risques.
- Aucun système n'est « 100 % » : la protection repose aussi sur ton compte Cloudflare (2FA obligatoire), ton téléphone et la garde de la clé `PII_KEY`.
- Interac reste manuel ; aucun paiement n'est traité en ligne.
