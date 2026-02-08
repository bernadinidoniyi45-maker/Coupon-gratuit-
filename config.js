module.exports = {
  // NE PAS METTRE TON TOKEN ICI EN CLAIR — mets BOT_TOKEN dans les Secrets de Replit
  BOT_TOKEN_ENV_VAR: "BOT_TOKEN",

  // Admins (IDs utilisateurs admin - à configurer avec les vrais IDs admin)
  ADMIN_IDS: ["7886845549", "5584273202"],

  // Channels obligatoires au départ (IDs numériques des canaux)
  REQUIRED_CHANNELS: [
    "-1002011974263",
    "-1002645098690",
    "-1002239292620"
  ],

  // Liens des canaux pour les boutons de join (mettez les vrais liens d'invitation)
  CHANNEL_LINKS: [
    "https://t.me/+bYc1l-VIzfdhYjBk",
    "https://t.me/DJETFLEXy",
    "https://t.me/RETRAIT90"
  ],

  // Canal pour notifications de retraits (ID ou @username)
  WITHDRAW_CHANNEL: "-1002239292620",

  // Paramètres
  REF_BONUS: 3000,
  MIN_WITHDRAW: 60000
};
