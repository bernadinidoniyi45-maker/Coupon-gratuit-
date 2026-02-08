# Bot Telegram de Parrainage - DJETFLEX™

Bot Telegram complet avec système de parrainage, retraits, et gestion de contenu.

## 📋 Vue d'ensemble

Ce bot Telegram permet aux utilisateurs de:
- Gagner de l'argent en parrainant des amis (3000 FCFA par filleul)
- Retirer leurs gains via Mobile Money ou Orange Money (minimum 60,000 FCFA)
- Accéder à des coupons de paris sportifs et du contenu exclusif
- Suivre leur solde et leurs filleuls en temps réel

## 🚀 Configuration rapide

### 1. Obtenir un token de bot Telegram
1. Ouvrez Telegram et cherchez [@BotFather](https://t.me/BotFather)
2. Envoyez `/newbot` et suivez les instructions
3. Copiez le token API reçu

### 2. Configurer le bot dans Replit
1. Allez dans "Tools" → "Secrets"
2. Créez un nouveau secret:
   - Clé: `BOT_TOKEN`
   - Valeur: votre token de bot Telegram
3. Cliquez sur "Add secret"

### 3. Configurer les administrateurs
1. Ouvrez `config.js`
2. Modifiez `ADMIN_IDS` avec vos IDs Telegram
   - Pour obtenir votre ID: utilisez [@userinfobot](https://t.me/userinfobot)
   - Format: `ADMIN_IDS: ["VOTRE_ID_1", "VOTRE_ID_2"]`

### 4. Ajouter des canaux obligatoires
Utilisez la commande admin `/addchannel` dans le bot:
```
/addchannel @NomDuCanal
```
ou pour des canaux privés:
```
/addchannel -100XXXXXXXXX
```

**Important**: Le bot doit être administrateur du canal pour vérifier l'adhésion des utilisateurs.

## 🎯 Fonctionnalités principales

### Pour les utilisateurs

#### 🏆 Gagner de l'argent
- Recevez un lien de parrainage unique
- Gagnez 3000 FCFA par personne invitée
- Suivez votre nombre de filleuls

#### 💰 Solde
- Consultez votre solde actuel
- Voyez combien de filleuls vous avez
- Vérifiez les conditions de retrait

#### 🏧 Retirer de l'argent
- Formulaire en 4 étapes + confirmation:
  1. Nom complet
  2. Montant à retirer (avec validation)
  3. Numéro de téléphone
  4. Méthode de paiement
  5. **Vérification des informations** (l'utilisateur confirme tous les détails)
- Minimum de retrait: 60,000 FCFA
- 7 méthodes de paiement: Mobile Money, Orange Money, Airtel Money, Moov Money, Wave, Togocel, Vodafone Cash
- Auto-approbation après 10 minutes (pas d'intervention manuelle)
- Notification sécurisée au canal de retrait (sans username)

#### ⚽ Coupon grosses côtes
Sous-menu avec accès à:
- Instructions pour gagner
- Coupons sûrs du jour
- Tutoriels vidéo
- Canal officiel

### Pour les administrateurs

#### Gestion du contenu
```bash
# Ajouter du contenu (texte, photos, vidéos)
/add gagner          # Pour le bouton "Gagner de l'argent"
/add safe           # Pour "Safe du jour"
/add grosse         # Pour "Coupon grosses côtes"
/add comment        # Pour "Comment faire ?"
/add canal          # Pour "Canal officiel"

# Après avoir envoyé vos médias, terminez avec:
/done
```

#### Gestion des canaux
```bash
/addchannel @NomDuCanal       # Ajouter un canal obligatoire
/removechannel @NomDuCanal    # Retirer un canal
/listchannels                  # Voir tous les canaux
```

#### Statistiques
```bash
/stats          # Voir les statistiques globales
/top20          # Top 20 des parrains
/withdrawals    # Liste des demandes de retrait en attente
```

#### Communication
```bash
/announce Votre message ici   # Envoyer un message à tous les utilisateurs
```

#### Gestion du contenu
```bash
/list <key>     # Voir le nombre d'éléments pour une clé
/clear <key>    # Supprimer tout le contenu d'une clé
```

## 📊 Paramètres configurables

Dans `config.js`, vous pouvez modifier:

```javascript
// IDs des administrateurs
ADMIN_IDS: ["7886845549", "5584273202"]

// Canaux obligatoires (peut aussi être fait via /addchannel)
REQUIRED_CHANNELS: []

// Canal pour les notifications de retrait
WITHDRAW_CHANNEL: "https://t.me/RETRAIT90"

// Bonus de parrainage (en FCFA)
REF_BONUS: 3000

// Retrait minimum (en FCFA)
MIN_WITHDRAW: 60000
```

## 🔐 Sécurité

- Les tokens de bot ne sont jamais exposés dans le code
- Seuls les administrateurs peuvent gérer le contenu
- Les retraits s'approuvent automatiquement après 10 minutes (pas d'intervention manuelle)
- Confirmation obligatoire par l'utilisateur avant le traitement du retrait
- Les informations sensibles (username, contact) ne sont pas affichées publiquement au canal de retrait
- Base de données PostgreSQL sécurisée avec chiffrement des données sensibles
- Stockage des entités Telegram pour préserver le formatage exact du contenu

## 📂 Structure du projet

```
.
├── index.js           # Code principal du bot
├── config.js          # Configuration
├── database.json      # Base de données (créée automatiquement)
├── package.json       # Dépendances Node.js
└── replit.md         # Cette documentation
```

## 🗄️ Base de données

Le bot utilise lowdb pour stocker les données localement:

### Structure des utilisateurs
```json
{
  "id": 123456789,
  "username": "utilisateur",
  "fullname": "Nom Complet",
  "balance": 15000,
  "referrals": ["id1", "id2"],
  "referredBy": "id_parrain",
  "joinedAt": 1699999999999,
  "banned": false
}
```

### Structure des retraits
```json
{
  "id": "1699999999999",
  "userId": 123456789,
  "username": "utilisateur",
  "fullname": "Nom Complet",
  "amount": 60000,
  "phone": "+237XXXXXXXXX",
  "status": "pending|approved|rejected",
  "createdAt": 1699999999999,
  "processedAt": 1699999999999
}
```

## 🚫 Gestion des erreurs

Le bot refuse immédiatement et affiche des messages clairs pour:
- **Montant invalide**: "❌ <b>REFUSÉ!</b>" avec détails
- **Montant insuffisant**: "❌ <b>REFUSÉ!</b>" avec minimum requis
- **Montant dépasse le solde**: "❌ <b>REFUSÉ!</b>" avec solde disponible
- **Nom trop court**: "❌ <b>REFUSÉ!</b>" avec exigence de 3 caractères
- **Numéro invalide**: "❌ <b>REFUSÉ!</b>" avec exigence de 8 chiffres minimum
- **Message non configuré**: "❌ <b>MESSAGE REFUSÉ!</b>" redirection vers boutons

## ❓ Dépannage

### Le bot ne répond pas
1. Vérifiez que le workflow "telegram-bot" est en cours d'exécution
2. Vérifiez que le token BOT_TOKEN est correctement configuré dans les Secrets
3. Consultez les logs pour voir les erreurs

### Les utilisateurs ne peuvent pas accéder au menu
1. Assurez-vous que le bot est administrateur des canaux obligatoires
2. Vérifiez que les IDs de canaux sont corrects (format: @canal ou -100XXXXXXXXX)
3. Utilisez `/listchannels` pour voir les canaux configurés

### Les retraits ne fonctionnent pas
1. Vérifiez que le WITHDRAW_CHANNEL est correctement configuré
2. Assurez-vous que le bot peut envoyer des messages dans ce canal
3. Vérifiez que l'utilisateur a au moins 60,000 FCFA

### Le contenu ne s'affiche pas
1. Utilisez `/list <key>` pour vérifier si du contenu existe
2. Ajoutez du contenu avec `/add <key>`
3. Terminez toujours l'ajout avec `/done`

## 🎓 Guide d'utilisation pour les nouveaux administrateurs

### Premier lancement
1. Configurez le token du bot
2. Ajoutez votre ID à `ADMIN_IDS`
3. Configurez les canaux obligatoires avec `/addchannel`
4. Ajoutez du contenu initial avec `/add`

### Flux de travail typique
1. Un utilisateur clique sur un lien de parrainage
2. Le bot vérifie qu'il a rejoint les canaux obligatoires
3. L'utilisateur accède au menu et consulte son solde
4. Il partage son lien et gagne 3000 FCFA par filleul
5. À 60,000 FCFA, il peut demander un retrait
6. L'administrateur approuve ou rejette via les boutons inline
7. Le paiement est effectué manuellement par l'admin

## 📱 Commandes utilisateur

Les utilisateurs interagissent via les boutons du menu:
- 🏆 GAGNER DE L'ARGENT
- 💰 Solde
- 🧑‍🤝‍🧑 Lien de parrainage
- 🏧 Retirer de l'argent
- ⚽ Coupon grosses côtes
- 🎥 Comment faire ?
- 📢 Canal Officiel
- 📍 Menu Principal
- 🔙 Retour

## 📞 Support

Pour toute question ou problème:
1. Consultez cette documentation
2. Vérifiez les logs du workflow
3. Testez les commandes en tant qu'administrateur

## 🔄 Mise à jour du bot

Pour mettre à jour le bot après des modifications:
1. Modifiez le code dans `index.js` ou `config.js`
2. Le workflow redémarre automatiquement
3. Testez les nouvelles fonctionnalités

## 📝 Notes importantes

- Le bot fonctionne 24/7 tant que Replit est actif
- Les données sont sauvegardées automatiquement
- Les retraits sont approuvés manuellement pour éviter la fraude
- Le minimum de 20 filleuls n'est qu'informatif, le minimum réel est le solde
