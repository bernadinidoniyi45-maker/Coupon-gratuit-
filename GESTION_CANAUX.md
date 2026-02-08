# 🔧 GUIDE : GESTION DES CANAUX OBLIGATOIRES

## 📋 VOIR TOUS LES CANAUX

Tapez simplement :
```
/listchannels
```

Cette commande vous montre :
- 📢 Tous les canaux obligatoires configurés
- 🔗 Leurs liens d'invitation
- 💡 Les commandes disponibles pour les gérer

---

## ➕ AJOUTER UN NOUVEAU CANAL

### Méthode simple (recommandée) :

```
/setcanal -1002011974263 https://t.me/+bYc1l-VIzfdhYjBk
```

**Format :** `/setcanal <ID_DU_CANAL> <LIEN_D_INVITATION>`

### Exemples concrets :

```
/setcanal -1002011974263 https://t.me/+bYc1l-VIzfdhYjBk
/setcanal -1002645098690 https://t.me/DJETFLEXy
/setcanal -1002239292620 https://t.me/RETRAIT90
```

✅ **Cette commande ajoute LE canal ET son lien en une seule fois !**

---

## ✏️ MODIFIER LE LIEN D'UN CANAL

Utilisez la même commande `/setcanal` avec le nouvel ID ou lien :

```
/setcanal -1002011974263 https://t.me/+NOUVEAU_LIEN
```

Le bot mettra à jour automatiquement le lien du canal.

---

## ❌ SUPPRIMER UN CANAL

### Supprimer un canal spécifique :

```
/removechannel -1002011974263
```

**Format :** `/removechannel <ID_DU_CANAL>`

Exemple :
```
/removechannel -1002645098690
```

Le bot supprimera le canal ET son lien associé.

---

## 🗑️ VIDER TOUS LES CANAUX

Si vous voulez supprimer TOUS les canaux obligatoires d'un coup :

```
/clearcanaux
```

⚠️ **Attention :** Cette commande supprime tous les canaux ! Utilisez-la avec précaution.

---

## 📝 WORKFLOW COMPLET

### Scénario 1 : Configuration initiale

1. Tapez `/listchannels` pour voir l'état actuel
2. Ajoutez vos canaux un par un :
   ```
   /setcanal -1002011974263 https://t.me/+bYc1l-VIzfdhYjBk
   /setcanal -1002645098690 https://t.me/DJETFLEXy
   /setcanal -1002239292620 https://t.me/RETRAIT90
   ```
3. Tapez `/listchannels` pour confirmer

### Scénario 2 : Modifier un lien

1. Tapez `/listchannels` pour voir les canaux actuels
2. Trouvez l'ID du canal à modifier
3. Utilisez `/setcanal` avec le nouveau lien :
   ```
   /setcanal -1002011974263 https://t.me/+NOUVEAU_LIEN
   ```

### Scénario 3 : Supprimer un canal

1. Tapez `/listchannels` pour voir les canaux
2. Copiez l'ID du canal à supprimer
3. Tapez :
   ```
   /removechannel -1002011974263
   ```

### Scénario 4 : Tout recommencer

1. Tapez `/clearcanaux` pour tout vider
2. Ajoutez les nouveaux canaux avec `/setcanal`

---

## 💡 ASTUCES

### Comment trouver l'ID d'un canal Telegram ?

1. Ajoutez le bot **@username_to_id_bot** à votre canal
2. Il vous donnera l'ID du canal (ex: -1002011974263)
3. Utilisez cet ID avec `/setcanal`

### Comment trouver le lien d'invitation d'un canal ?

1. Ouvrez votre canal dans Telegram
2. Allez dans les paramètres du canal
3. Cliquez sur "Lien d'invitation" ou "Inviter par lien"
4. Copiez le lien (ex: https://t.me/+bYc1l-VIzfdhYjBk)

---

## ⚠️ IMPORTANT

Pour que la vérification des canaux fonctionne :

1. **Ajoutez votre bot comme administrateur** dans chaque canal
2. Donnez-lui la permission : **"Voir les membres"**
3. Pour le canal RETRAIT90, ajoutez aussi : **"Envoyer des messages"**

**Note :** En tant qu'administrateur (votre ID est dans ADMIN_IDS), vous contournez automatiquement la vérification des canaux.

---

## 🎯 RÉSUMÉ RAPIDE

| Action | Commande |
|--------|----------|
| Voir tous les canaux | `/listchannels` |
| Ajouter/Modifier un canal | `/setcanal ID LIEN` |
| Supprimer un canal | `/removechannel ID` |
| Vider tous les canaux | `/clearcanaux` |

---

**Besoin d'aide ?** Tapez `/listchannels` dans le bot pour voir les commandes disponibles !
