# 📖 GUIDE ADMINISTRATEUR - Bot Telegram

## ✅ PROBLÈME RÉSOLU
Les administrateurs peuvent maintenant utiliser le bot **sans vérification des canaux**. Vous pouvez directement accéder au bot et utiliser toutes les commandes.

---

## 📝 COMMENT AJOUTER DU CONTENU AUX BOUTONS

### ÉTAPE 1 : Commencer l'ajout
Dans le chat du bot, tapez la commande suivante selon le bouton que vous voulez remplir :

#### Boutons disponibles et leurs clés:

| Bouton visible | Commande à taper |
|----------------|------------------|
| 🏆 GAGNER DE L'ARGENT | `/add gagner` |
| 𝐒𝐀𝐅𝐄 𝐃𝐔 𝐉𝐎𝐔𝐑🥇 | `/add safe` |
| ⚽ Coupon grosses côtes | `/add grosse` |
| 🎥 Comment faire ? | `/add comment` |
| 📢 Canal Officiel | `/add canal` |
| 🎰 FAILLES JEUX 🎰 | `/add failles` |

### ÉTAPE 2 : Envoyer le contenu
Après avoir tapé `/add <key>`, le bot vous dira :
```
Ajout de contenu pour "safe". Envoie photo/texte/video. Quand tu as fini envoie /done
```

Vous pouvez maintenant envoyer :
- ✅ **Texte** : Tapez directement votre message
- ✅ **Photos** : Envoyez une image (avec ou sans légende)
- ✅ **Vidéos** : Envoyez une vidéo (avec ou sans légende)
- ✅ **Audio** : Envoyez un fichier audio

### ÉTAPE 3 : Terminer l'ajout
Quand vous avez fini d'ajouter tout le contenu, tapez :
```
/done
```

Le bot confirmera que le contenu a été ajouté.

---

## 📋 EXEMPLE PRATIQUE

**Pour ajouter du contenu au bouton "SAFE DU JOUR" :**

1. Tapez : `/add safe`
2. Le bot répond : "Ajout de contenu pour "safe"..."
3. Envoyez votre photo de coupon
4. Envoyez un texte explicatif
5. Envoyez une autre photo si besoin
6. Tapez : `/done`
7. ✅ C'est terminé !

Maintenant quand un utilisateur clique sur "𝐒𝐀𝐅𝐄 𝐃𝐔 𝐉𝐎𝐔𝐑🥇", il recevra tout le contenu que vous avez ajouté.

---

## 🔧 AUTRES COMMANDES UTILES

### Voir le contenu ajouté
```
/list safe
```
Montre combien d'éléments sont dans "safe"

### Vider tout le contenu
```
/clear safe
```
Supprime tout le contenu de "safe" (attention, irréversible !)

### Gérer les canaux obligatoires

#### ⭐ NOUVELLE : Ajouter/Modifier un canal avec son lien (RECOMMANDÉ)
```
/setcanal -1002011974263 https://t.me/+bYc1l-VIzfdhYjBk
```
Cette commande ajoute OU modifie un canal et son lien en une seule fois !

**Exemples:**
```
/setcanal -1002011974263 https://t.me/+bYc1l-VIzfdhYjBk
/setcanal -1002645098690 https://t.me/DJETFLEXy
/setcanal -1002239292620 https://t.me/RETRAIT90
```

#### Ajouter un canal (ancienne méthode)
```
/addchannel -1002011974263
```
⚠️ Avec cette méthode, vous devrez ensuite utiliser /setcanal pour ajouter le lien.

#### Supprimer un canal
```
/removechannel -1002011974263
```
Supprime le canal ET son lien associé.

#### Voir tous les canaux configurés
```
/listchannels
```
Affiche la liste complète des canaux avec leurs liens.

### Statistiques
```
/stats
```
Affiche le nombre d'utilisateurs, soldes totaux, retraits

### Top parrains
```
/top20
```
ou
```
/topref
```
Affiche le classement des meilleurs parrains

### Retraits en attente
```
/withdrawals
```
Liste toutes les demandes de retrait

### Envoyer un message à tous
```
/announce Votre message ici
```
Envoie un message à tous les utilisateurs du bot

---

## 💰 NOTIFICATIONS DE RETRAIT AUTOMATIQUES

✅ **Le bot est maintenant configuré pour publier automatiquement les demandes de retrait dans le canal RETRAIT90 !**

Quand un utilisateur demande un retrait :
1. 📱 Le bot envoie automatiquement la demande dans le canal `-1002239292620` (RETRAIT90)
2. 🎛️ Les admins voient directement les boutons ✅ Approuver / ❌ Rejeter
3. ✅ Quand vous approuvez, l'utilisateur reçoit une notification automatique
4. ❌ Quand vous rejetez, le solde est automatiquement recrédité et l'utilisateur est notifié

**Important:** Le bot doit être **administrateur** dans le canal RETRAIT90 avec la permission d'envoyer des messages.

---

## ⚠️ IMPORTANT : CONFIGURATION DES CANAUX

**Pourquoi les utilisateurs normaux ne peuvent pas passer la vérification ?**

Le bot doit être **administrateur** dans vos canaux pour vérifier si les utilisateurs les ont rejoints.

**Solution :**

1. Ouvrez votre canal Telegram
2. Allez dans les paramètres du canal
3. Cliquez sur "Administrateurs"
4. Ajoutez votre bot comme administrateur
5. Donnez-lui au minimum la permission : **"Voir les membres"** ou **"Inviter des utilisateurs"**

Faites cela pour chaque canal :
- https://t.me/+bYc1l-VIzfdhYjBk
- https://t.me/DJETFLEXy
- https://t.me/RETRAIT90 (+ permission d'envoyer des messages pour les notifications)

**Note:** Les administrateurs (IDs dans ADMIN_IDS) contournent automatiquement cette vérification.

Une fois le bot ajouté comme admin, les utilisateurs normaux pourront passer la vérification !

---

## 🎯 RÉSUMÉ RAPIDE

1. **Ajouter du contenu** : `/add <clé>` → envoyer messages/photos → `/done`
2. **Voir le contenu** : `/list <clé>`
3. **Vider le contenu** : `/clear <clé>`
4. **Ajouter le bot comme admin dans les canaux** pour que la vérification fonctionne

---

## 💡 CONSEIL

Testez toujours avec un compte utilisateur normal (pas admin) pour voir ce que vos utilisateurs verront réellement !
