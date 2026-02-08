// index.js
const { Telegraf, Markup } = require('telegraf');
const { PostgresDB } = require('./db-postgres');
const express = require('express');
const config = require('./config');

// charger token depuis env
const BOT_TOKEN = process.env[config.BOT_TOKEN_ENV_VAR];
if (!BOT_TOKEN) {
  console.error("ERREUR : mets TON token dans les secrets avec la clé " + config.BOT_TOKEN_ENV_VAR);
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// setup PostgreSQL database
const db = new PostgresDB();

// Initialize database (will be awaited before starting bot)
let dbInitialized = false;
const initializeDatabase = async () => {
  try {
    await db.init();
    await db.seedDefaults(config);
    dbInitialized = true;
    console.log('✅ Base de données PostgreSQL initialisée');
  } catch (error) {
    console.error('❌ Erreur initialisation database:', error);
    throw error;
  }
};

// Helper : menu principal (boutons fixes)
function mainMenu() {
  return Markup.keyboard([
    ["🏆 GAGNER DE L'ARGENT"],
    ['⚽ Coupon grosses côtes', '🥇 Safe du jour'],
    ['🎯 Failles du jour', '🎥 Comment faire ?'],
    ['📢 Canal Officiel'],
    ['🔙 Retour']
  ]).resize();
}

// Helper : sous-menu GAGNER DE L'ARGENT
function gagnerMenu() {
  return Markup.keyboard([
    ['💰 Mon Solde'],
    ['🧑‍🤝‍🧑 Lien de parrainage'],
    ["🏧 Retirer de l'argent"],
    ['🔙 Retour']
  ]).resize();
}

// Helper : mapping bouton -> key contents
const BUTTON_TO_KEY = {
  "🏆 GAGNER DE L'ARGENT": 'gagner_menu',  // Ouvre le sous-menu
  '⚽ Coupon grosses côtes': 'grosse',      // Affiche contenu grosse
  '🥇 Safe du jour': 'safe',                 // Affiche contenu safe
  '🎯 Failles du jour': 'failles',           // Affiche contenu failles
  '🎥 Comment faire ?': 'comment',           // Affiche contenu comment
  '📢 Canal Officiel': 'canal',              // Affiche contenu canal
  '🔙 Retour': 'back',
  // Sous-menu "GAGNER DE L'ARGENT"
  '💰 Mon Solde': 'solde',
  '🧑‍🤝‍🧑 Lien de parrainage': 'ref',
  "🏧 Retirer de l'argent": 'withdraw'
};

// check if user member of all required channels
async function checkChannels(ctx, userId) {
  // Les admins contournent la vérification
  if (config.ADMIN_IDS.includes(String(userId))) {
    return { ok: true };
  }
  
  const required = await db.getChannels();
  if (!required.length) return { ok: true };
  for (const ch of required) {
    try {
      const member = await ctx.telegram.getChatMember(ch, userId);
      if (['left','kicked'].includes(member.status)) {
        return { ok: false, channel: ch };
      }
    } catch (e) {
      // si erreur, retourne non ok (souvent bot n'est pas admin ou canal privé)
      console.log(`Erreur vérification canal ${ch} pour user ${userId}:`, e.message);
      return { ok: false, channel: ch };
    }
  }
  return { ok: true };
}

// start handler (gestion parrainage via payload)
bot.start(async (ctx) => {
  const userId = String(ctx.from.id);
  let user = await db.getUser(userId);
  
  if (!user) {
    const newUser = {
      id: ctx.from.id,
      username: ctx.from.username || null,
      fullname: `${ctx.from.first_name||''} ${ctx.from.last_name||''}`.trim(),
      balance: 0,
      referrals: [],
      referredBy: null,
      joinedAt: Date.now(),
      banned: false
    };
    
    // gestion param start (ex: start=REFID)
    const payload = ctx.startPayload || '';
    const refId = payload ? payload.split('_')[0] : null;
    
    await db.createUser(userId, newUser);
    
    if (refId && refId !== userId) {
      const referrer = await db.getUser(refId);
      if (referrer) {
        const settings = await db.getSettings();
        const refBonus = settings.ref_bonus || config.REF_BONUS;
        await db.addReferralBonus(refId, userId, refBonus);
        newUser.referredBy = refId;
        await db.updateUser(userId, newUser);
      }
    }
  }
  
  // vérifier canaux
  const check = await checkChannels(ctx, ctx.from.id);
  if (!check.ok) {
    const buttons = [];
    const channels = await db.getChannels();
    const storedLinks = await db.getChannelLinks();
    
    // Créer un bouton pour chaque canal avec son lien correspondant
    channels.forEach((ch, index) => {
      // Priorité: lien stocké en DB > lien du config > lien auto-généré
      let link = storedLinks[ch] || (config.CHANNEL_LINKS && config.CHANNEL_LINKS[index]);
      
      if (link) {
        buttons.push([Markup.button.url(`📢 Rejoindre canal ${index + 1}`, link)]);
      } else if (ch.startsWith('@')) {
        const channelLink = ch.replace('@', '');
        buttons.push([Markup.button.url(`📢 Rejoindre ${ch}`, `https://t.me/${channelLink}`)]);
      }
    });
    
    buttons.push([Markup.button.callback('🔄 J\'ai rejoint', 'CHECK_CHANNELS')]);
    
    const message = `⚠️ <b>Veuillez rejoindre tous les canaux obligatoires pour continuer</b>\n\n` +
      `Pour utiliser ce bot, vous devez d'abord rejoindre nos canaux officiels.`;
    
    return ctx.replyWithHTML(message, Markup.inlineKeyboard(buttons));
  }

  await ctx.replyWithHTML(`Bienvenue <b>${ctx.from.first_name}</b> 👋\n\nUtilisez le menu ci-dessous pour naviguer.`, mainMenu());
});

// action check channels
bot.action('CHECK_CHANNELS', async (ctx) => {
  const check = await checkChannels(ctx, ctx.from.id);
  if (check.ok) {
    await ctx.answerCbQuery('✅ Merci ! Vous avez rejoint tous les canaux');
    await ctx.reply('Bienvenue ! Voici le menu principal :', mainMenu());
  } else {
    await ctx.answerCbQuery('❌ Vous devez rejoindre tous les canaux obligatoires', { show_alert: true });
  }
});

// Withdrawal form payment method callbacks
bot.action(/method_(momo|om|airtel|moov|wave|togocel|vodafone|cancel)/, async (ctx) => {
  const method = ctx.match[1];
  const wf = withdrawFlow[ctx.from.id];
  
  if (!wf) {
    return ctx.answerCbQuery('❌ Session expirée. Veuillez recommencer.', { show_alert: true });
  }
  
  if (method === 'cancel') {
    delete withdrawFlow[ctx.from.id];
    await ctx.answerCbQuery('❌ Retrait annulé');
    await ctx.editMessageText('❌ Demande de retrait annulée.', gagnerMenu());
    return;
  }
  
  // Store payment method and show confirmation
  const paymentMethods = {
    momo: 'Mobile Money (MoMo)',
    om: 'Orange Money',
    airtel: 'Airtel Money',
    moov: 'Moov Money',
    wave: 'Wave',
    togocel: 'Togocel',
    vodafone: 'Vodafone Cash'
  };
  const paymentMethod = paymentMethods[method] || 'Paiement';
  wf.paymentMethod = paymentMethod;
  
  // Show confirmation with all details
  const amount = wf.amount || 0;
  const phone = wf.phone;
  const fullname = wf.fullname;
  
  const confirmationMsg = `📋 <b>VÉRIFICATION DES INFORMATIONS</b>\n\n` +
    `👤 Nom: ${fullname}\n` +
    `💰 Montant: ${amount.toLocaleString()} FCFA\n` +
    `📱 Téléphone: ${phone}\n` +
    `💳 Méthode: ${paymentMethod}\n\n` +
    `Vérifiez que toutes les informations sont correctes avant de confirmer.`;
  
  const confirmButtons = Markup.inlineKeyboard([
    [Markup.button.callback('✅ Confirmer', 'confirm_withdraw')],
    [Markup.button.callback('❌ Annuler', 'cancel_withdraw')]
  ]);
  
  await ctx.answerCbQuery('');
  return await ctx.editMessageText(confirmationMsg, { parse_mode: 'HTML', ...confirmButtons });
});

// Confirm withdrawal callback
bot.action('confirm_withdraw', async (ctx) => {
  const wf = withdrawFlow[ctx.from.id];
  
  if (!wf) {
    return ctx.answerCbQuery('❌ Session expirée. Veuillez recommencer.', { show_alert: true });
  }
  
  // Finalize withdrawal with confirmed details
  const u = await db.getUser(String(ctx.from.id));
  const amount = wf.amount || 0;
  const phone = wf.phone;
  const fullname = wf.fullname;
  const paymentMethod = wf.paymentMethod;
  
  // TRANSACTION: create withdrawal + debit balance atomically
  const id = Date.now().toString();
  try {
    await db.runInTransaction(async (client) => {
      await db.createWithdrawal(id, { 
        userId: ctx.from.id, 
        username: ctx.from.username || 'N/A',
        fullname: fullname,
        amount, 
        phone, 
        status: 'pending', 
        createdAt: Date.now() 
      }, client);
      
      // débite le montant demandé (pas tout le solde)
      u.balance -= amount;
      await db.updateUser(String(ctx.from.id), u, client);
    });
  } catch (error) {
    console.error('Erreur lors de la création du retrait:', error);
    delete withdrawFlow[ctx.from.id];
    await ctx.answerCbQuery('❌ Erreur', { show_alert: true });
    return ctx.editMessageText('❌ Une erreur est survenue. Veuillez réessayer.', gagnerMenu());
  }
  
  delete withdrawFlow[ctx.from.id];

  // Message pour les admins (avec boutons)
  const adminMsg = `🏧 <b>NOUVELLE DEMANDE DE RETRAIT</b>\n\n` +
    `👤 Nom: ${fullname}\n` +
    `💰 Montant: ${amount.toLocaleString()} FCFA\n` +
    `📱 Téléphone: ${phone}\n` +
    `💳 Méthode: ${paymentMethod}\n` +
    `🆔 ID: ${id}\n` +
    `📅 Date: ${new Date().toLocaleString('fr-FR')}`;
  
  // Message pour le canal (sans boutons, info seulement)
  const channelMsg = `🏧 <b>NOUVELLE DEMANDE</b>\n\n` +
    `👤 ${fullname}\n` +
    `💰 ${amount.toLocaleString()} FCFA\n` +
    `💳 ${paymentMethod}\n` +
    `⏱️ En attente\n` +
    `🆔 ${id}`;
  
  // Boutons d'approbation pour les admins
  const approvalButtons = Markup.inlineKeyboard([
    [Markup.button.callback('✅ Approuver', `approve_${id}`)],
    [Markup.button.callback('❌ Rejeter', `reject_${id}`)]
  ]);
  
  // 1. Envoyer au canal de retrait (notification simple)
  const withdrawChannel = config.WITHDRAW_CHANNEL;
  if (withdrawChannel) {
    try {
      await bot.telegram.sendMessage(withdrawChannel, channelMsg, { parse_mode: 'HTML' });
      console.log(`✅ Retrait envoyé au canal ${withdrawChannel} (ID: ${id})`);
    } catch (e) {
      console.error(`Erreur envoi canal:`, e.message);
    }
  }
  
  // 2. Envoyer à tous les admins en privé (avec boutons)
  for (const adminId of config.ADMIN_IDS) {
    try {
      await bot.telegram.sendMessage(adminId, adminMsg, { parse_mode: 'HTML', ...approvalButtons });
      console.log(`✅ Retrait envoyé à l'admin ${adminId} (ID: ${id})`);
    } catch (e) {
      console.error(`Erreur envoi admin ${adminId}:`, e.message);
    }
  }
  
  await ctx.answerCbQuery('✅ Retrait créé');
  await ctx.editMessageText(`✅ <b>Demande de retrait créée</b>\n\n📋 Récapitulatif:\n👤 Nom: ${fullname}\n📱 Téléphone: ${phone}\n💰 Montant: ${amount.toLocaleString()} FCFA\n💳 Méthode: ${paymentMethod}\n\nUn administrateur traitera votre demande bientôt. Vous recevrez une notification une fois le paiement effectué.`, { parse_mode: 'HTML', ...gagnerMenu() });
});

// Cancel withdrawal callback
bot.action('cancel_withdraw', async (ctx) => {
  const wf = withdrawFlow[ctx.from.id];
  
  if (!wf) {
    return ctx.answerCbQuery('❌ Session expirée.', { show_alert: true });
  }
  
  delete withdrawFlow[ctx.from.id];
  await ctx.answerCbQuery('❌ Retrait annulé');
  await ctx.editMessageText('❌ Demande de retrait annulée.', gagnerMenu());
});

// Admin approve withdrawal
bot.action(/^approve_(.+)$/, async (ctx) => {
  const fromId = String(ctx.from.id);
  if (!config.ADMIN_IDS.includes(fromId)) {
    return ctx.answerCbQuery('❌ Accès refusé', { show_alert: true });
  }
  
  const withdrawalId = ctx.match[1];
  const withdrawalsObj = await db.getAllWithdrawals();
  const withdrawal = withdrawalsObj[withdrawalId];
  
  if (!withdrawal) {
    return ctx.answerCbQuery('❌ Retrait non trouvé', { show_alert: true });
  }
  
  // Approuver le retrait
  await db.updateWithdrawal(withdrawalId, { status: 'approved', processedAt: Date.now() });
  
  // Notifier l'utilisateur
  const userMsg = `✅ <b>Retrait approuvé!</b>\n\n💰 Montant: ${withdrawal.amount.toLocaleString()} FCFA\n📱 Numéro: ${withdrawal.phone}\n\nVotre paiement a été envoyé. Vous devriez le recevoir dans quelques minutes.`;
  try {
    await bot.telegram.sendMessage(withdrawal.userId, userMsg, { parse_mode: 'HTML' });
    console.log(`✅ Utilisateur ${withdrawal.userId} notifié de l'approbation`);
  } catch (e) {
    console.error('Erreur notification user:', e.message);
  }
  
  // Envoyer notification d'approbation au canal de retrait
  const withdrawChannel = config.WITHDRAW_CHANNEL;
  if (withdrawChannel) {
    const channelApprovalMsg = `✅ <b>RETRAIT APPROUVÉ</b>\n\n` +
      `👤 ${withdrawal.fullname}\n` +
      `💰 ${withdrawal.amount.toLocaleString()} FCFA\n` +
      `🆔 ${withdrawalId}\n` +
      `📅 ${new Date().toLocaleString('fr-FR')}`;
    try {
      await bot.telegram.sendMessage(withdrawChannel, channelApprovalMsg, { parse_mode: 'HTML' });
      console.log(`✅ Notification d'approbation envoyée au canal ${withdrawChannel}`);
    } catch (e) {
      console.error('Erreur envoi canal approbation:', e.message);
    }
  }
  
  // Éditer le message dans le bot (pour l'admin)
  try {
    await ctx.editMessageText(
      `✅ <b>RETRAIT APPROUVÉ</b>\n\n` +
      `👤 Nom: ${withdrawal.fullname}\n` +
      `💰 Montant: ${withdrawal.amount.toLocaleString()} FCFA\n` +
      `📱 Téléphone: ${withdrawal.phone}\n` +
      `🆔 ID: ${withdrawalId}\n` +
      `📅 Traité le: ${new Date().toLocaleString('fr-FR')}`,
      { parse_mode: 'HTML' }
    );
  } catch (e) {
    console.error('Erreur édition message:', e.message);
  }
  await ctx.answerCbQuery('✅ Retrait approuvé');
});

// Admin reject withdrawal
bot.action(/^reject_(.+)$/, async (ctx) => {
  const fromId = String(ctx.from.id);
  if (!config.ADMIN_IDS.includes(fromId)) {
    return ctx.answerCbQuery('❌ Accès refusé', { show_alert: true });
  }
  
  const withdrawalId = ctx.match[1];
  const withdrawalsObj = await db.getAllWithdrawals();
  const withdrawal = withdrawalsObj[withdrawalId];
  
  if (!withdrawal) {
    return ctx.answerCbQuery('❌ Retrait non trouvé', { show_alert: true });
  }
  
  // Rejeter le retrait
  await db.updateWithdrawal(withdrawalId, { status: 'rejected', processedAt: Date.now() });
  
  // Rembourser l'utilisateur
  const user = await db.getUser(String(withdrawal.userId));
  if (user) {
    user.balance += withdrawal.amount;
    await db.updateUser(String(withdrawal.userId), user);
  }
  
  // Notifier l'utilisateur
  const userMsg = `❌ <b>Retrait rejeté</b>\n\n💰 Montant: ${withdrawal.amount.toLocaleString()} FCFA\n\nVotre montant a été crédité à votre compte.`;
  try {
    await bot.telegram.sendMessage(withdrawal.userId, userMsg, { parse_mode: 'HTML' });
    console.log(`✅ Utilisateur ${withdrawal.userId} notifié du rejet`);
  } catch (e) {
    console.error('Erreur notification user:', e.message);
  }
  
  // Éditer le message dans le bot (pour l'admin)
  try {
    await ctx.editMessageText(
      `❌ <b>RETRAIT REJETÉ</b>\n\n` +
      `👤 Nom: ${withdrawal.fullname}\n` +
      `💰 Montant: ${withdrawal.amount.toLocaleString()} FCFA (remboursé)\n` +
      `📱 Téléphone: ${withdrawal.phone}\n` +
      `🆔 ID: ${withdrawalId}\n` +
      `📅 Traité le: ${new Date().toLocaleString('fr-FR')}`,
      { parse_mode: 'HTML' }
    );
  } catch (e) {
    console.error('Erreur édition message:', e.message);
  }
  await ctx.answerCbQuery('❌ Retrait rejeté');
});

// temporaries for admin add flow, withdraw flow and announce flow
const adminAddFlow = {}; // adminId -> {key, items: []}
const withdrawFlow = {}; // userId -> {step, phone}
const announceFlow = {}; // adminId -> {message: {type, text, entities, file_id, caption, caption_entities}}

// broadcast helper - supports text with entities, photos, videos
async function broadcastToAll(message) {
  const allUsers = await db.getAllUsers();
  const users = Object.values(allUsers);
  console.log(`📢 Broadcast: ${users.length} utilisateurs trouvés`);
  let sent = 0;
  let failed = 0;
  
  for (const u of users) {
    console.log(`📤 Envoi à user ${u.id} (${u.fullname || 'N/A'})`);
    try {
      if (message.type === 'text') {
        // Send text with entities (preserve formatting)
        if (message.entities && message.entities.length > 0) {
          await bot.telegram.sendMessage(u.id, message.text, { entities: message.entities });
        } else {
          await bot.telegram.sendMessage(u.id, message.text);
        }
      } else if (message.type === 'photo') {
        const opts = {};
        if (message.caption) opts.caption = message.caption;
        if (message.caption_entities && message.caption_entities.length > 0) {
          opts.caption_entities = message.caption_entities;
        }
        await bot.telegram.sendPhoto(u.id, message.file_id, opts);
      } else if (message.type === 'video') {
        const opts = {};
        if (message.caption) opts.caption = message.caption;
        if (message.caption_entities && message.caption_entities.length > 0) {
          opts.caption_entities = message.caption_entities;
        }
        await bot.telegram.sendVideo(u.id, message.file_id, opts);
      }
      sent++;
    } catch (e) {
      failed++;
    }
  }
  
  return { sent, failed, total: users.length };
}

// handle simple text buttons
bot.hears(Object.keys(BUTTON_TO_KEY), async (ctx) => {
  const key = BUTTON_TO_KEY[ctx.message.text];

  // process special keys
  if (key === 'solde') {
    const u = await db.getUser(String(ctx.from.id));
    const bal = u ? u.balance || 0 : 0;
    const nbFilleuls = u && u.referrals ? u.referrals.length : 0;
    const settings = await db.getSettings();
    const minWithdraw = settings.min_withdraw || config.MIN_WITHDRAW;
    
    const message = `💰 <b>SOLDE</b> 💰\n\n` +
      `💵 Votre solde actuel est de ${bal} FCFA 💵\n\n` +
      `👥 Vous avez actuellement ${nbFilleuls} membres dans votre équipe 👥\n\n` +
      `📌 Le retrait minimum est de ${minWithdraw.toLocaleString()} FCFA 🏧\n\n` +
      `Invitez vos amis pour augmenter vos chances de gagner énormément d'argent et de pouvoir retirer sans problème 🔥`;
    
    return ctx.replyWithHTML(message, gagnerMenu());
  }
  if (key === 'ref') {
    const botInfo = await bot.telegram.getMe();
    const link = `https://t.me/${botInfo.username}?start=${ctx.from.id}`;
    const u = await db.getUser(String(ctx.from.id));
    const nb = (u && u.referrals && u.referrals.length) || 0;
    const settings = await db.getSettings();
    const refBonus = settings.ref_bonus || config.REF_BONUS;
    
    const message = `👥 <b>Lien de parrainage 🔗</b>\n\n` +
      `DJETFLEX™ 🔥 Voici votre lien de parrainage\n\n` +
      `${link}\n\n` +
      `💰 Vous gagnerez ${refBonus} FCFA pour chaque personne invité 👥\n\n` +
      `Actuellement vous avez ${nb} membres dans votre équipe 👥\n\n` +
      `Invité au moins 20 personne pour lancer votre premier retrait 🔥`;
    
    return ctx.replyWithHTML(message, gagnerMenu());
  }
  if (key === 'withdraw') {
    const u = await db.getUser(String(ctx.from.id));
    const bal = u ? u.balance || 0 : 0;
    const nbFilleuls = u && u.referrals ? u.referrals.length : 0;
    const settings = await db.getSettings();
    const minWithdraw = settings.min_withdraw || config.MIN_WITHDRAW;
    const refBonus = settings.ref_bonus || config.REF_BONUS;
    
    if (bal < minWithdraw || nbFilleuls < 20) {
      const botInfo = await bot.telegram.getMe();
      const link = `https://t.me/${botInfo.username}?start=${ctx.from.id}`;
      
      const message = `🏧 <b><i>LANCER UN RETRAIT</i></b> 🏧\n\n` +
        `❌ <b>accès refusé</b>\n\n` +
        `💰 Votre solde actuel est de ${bal.toLocaleString()} FCFA 💵\n\n` +
        `🎁 Le retrait minimum est de ${minWithdraw.toLocaleString()} FCFA 🏧\n\n` +
        `👥 Vous avez ${nbFilleuls} filleuls (minimum requis: 20)\n\n` +
        `Invité vos amis pour augmenter vos chances de gagner énormément d'argent et de pouvoir retirer sans problème 🔥\n\n` +
        `✈️ <b>Voici votre lien de parrainage</b>\n\n` +
        `${link}\n\n` +
        `${refBonus.toLocaleString()} FCFA pour chaque personne invité`;
      
      return ctx.replyWithHTML(message, gagnerMenu());
    }
    
    withdrawFlow[ctx.from.id] = { step: 'waiting_name'