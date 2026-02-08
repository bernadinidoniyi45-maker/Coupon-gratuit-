// index.js
const { Telegraf, Markup } = require('telegraf');
const { SimpleDB } = require('./simple-db');
const fs = require('fs');
const express = require('express');
const config = require('./config');

// charger token depuis env
const BOT_TOKEN = process.env[config.BOT_TOKEN_ENV_VAR];
if (!BOT_TOKEN) {
  console.error("ERREUR : mets TON token dans les secrets avec la clé " + config.BOT_TOKEN_ENV_VAR);
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// setup database
if (!fs.existsSync('database.json')) {
  fs.writeFileSync('database.json', JSON.stringify({
    users: {},
    withdrawals: {},
    channels: [],
    settings: { min_withdraw: config.MIN_WITHDRAW, ref_bonus: config.REF_BONUS },
    contents: { gagner: [], safe: [], grosse: [], failles: [], comment: [], canal: [] }
  }, null, 2));
}

const db = new SimpleDB('database.json');

// initialize db with defaults
(async () => {
  await db.read();
  db.data = db.data || {};
  db.data.users = db.data.users || {};
  db.data.withdrawals = db.data.withdrawals || {};
  db.data.channels = db.data.channels || config.REQUIRED_CHANNELS || [];
  db.data.channelLinks = db.data.channelLinks || {};
  db.data.settings = db.data.settings || { min_withdraw: config.MIN_WITHDRAW, ref_bonus: config.REF_BONUS };
  db.data.contents = db.data.contents || {};
  db.data.contents.gagner = db.data.contents.gagner || [];
  db.data.contents.safe = db.data.contents.safe || [];
  db.data.contents.grosse = db.data.contents.grosse || [];
  db.data.contents.failles = db.data.contents.failles || [];
  db.data.contents.comment = db.data.contents.comment || [];
  db.data.contents.canal = db.data.contents.canal || [];
  
  // Initialiser les liens des canaux depuis le config si pas déjà en DB
  if (config.REQUIRED_CHANNELS && config.CHANNEL_LINKS) {
    config.REQUIRED_CHANNELS.forEach((ch, index) => {
      if (!db.data.channelLinks[ch] && config.CHANNEL_LINKS[index]) {
        db.data.channelLinks[ch] = config.CHANNEL_LINKS[index];
      }
    });
  }
  
  await db.write();
})();

// Helper : menu principal (boutons fixes)
function mainMenu() {
  return Markup.keyboard([
    ["🏆 GAGNER DE L'ARGENT", '💰 Solde'],
    ['🧑‍🤝‍🧑 Lien de parrainage', "🏧 Retirer de l'argent"],
    ['⚽ Coupon grosses côtes', '🎥 Comment faire ?'],
    ['📢 Canal Officiel', '📍 Menu Principal'],
    ['🔙 Retour']
  ]).resize();
}

// Helper : mapping bouton -> key contents
const BUTTON_TO_KEY = {
  "🏆 GAGNER DE L'ARGENT": 'gagner',
  '💰 Solde': 'solde',
  '🧑‍🤝‍🧑 Lien de parrainage': 'ref',
  "🏧 Retirer de l'argent": 'withdraw',
  '⚽ Coupon grosses côtes': 'grosse',
  '🎥 Comment faire ?': 'comment',
  '📢 Canal Officiel': 'canal',
  '📍 Menu Principal': 'menu',
  '🔙 Retour': 'back',
  "🤑 𝐆𝐀𝐆𝐍𝐄𝐑 𝐃𝐄 𝐋'𝐀𝐑𝐆𝐄𝐍𝐓 💰": 'gagner',
  '𝐒𝐀𝐅𝐄 𝐃𝐔 𝐉𝐎𝐔𝐑🥇': 'safe',
  '𝐂𝐎𝐌𝐌𝐄𝐍𝐓 𝐅𝐀𝐈𝐑𝐄 ?': 'comment',
  '𝐂𝐀𝐍𝐀𝐋 𝐎𝐅𝐅𝐈𝐂𝐈𝐄𝐋 ✅': 'canal'
};

// check if user member of all required channels
async function checkChannels(ctx, userId) {
  // Les admins contournent la vérification
  if (config.ADMIN_IDS.includes(String(userId))) {
    return { ok: true };
  }
  
  await db.read();
  const required = db.data.channels || [];
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
  await db.read();
  const userId = String(ctx.from.id);
  if (!db.data.users[userId]) {
    db.data.users[userId] = {
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
    if (refId && db.data.users[refId] && refId !== userId) {
      db.data.users[refId].balance = (db.data.users[refId].balance || 0) + (db.data.settings.ref_bonus || config.REF_BONUS);
      db.data.users[refId].referrals.push(userId);
      db.data.users[userId].referredBy = refId;
    }
    await db.write();
  }
  // vérifier canaux
  const check = await checkChannels(ctx, ctx.from.id);
  if (!check.ok) {
    const buttons = [];
    const channels = db.data.channels || config.REQUIRED_CHANNELS || [];
    const storedLinks = db.data.channelLinks || {};
    
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

// temporaries for admin add flow and withdraw flow
const adminAddFlow = {}; // adminId -> {key, items: []}
const withdrawFlow = {}; // userId -> {step, phone}

// broadcast helper
async function broadcastToAll(text) {
  await db.read();
  const users = Object.values(db.data.users || {});
  for (const u of users) {
    try {
      await bot.telegram.sendMessage(u.id, text, { parse_mode: 'HTML' });
    } catch (e) {
      // ignore
    }
  }
}

// handle simple text buttons
bot.hears(Object.keys(BUTTON_TO_KEY), async (ctx) => {
  const key = BUTTON_TO_KEY[ctx.message.text];
  await db.read();

  // process special keys
  if (key === 'solde') {
    const u = db.data.users[String(ctx.from.id)];
    const bal = u ? u.balance || 0 : 0;
    const nbFilleuls = u && u.referrals ? u.referrals.length : 0;
    const minWithdraw = db.data.settings.min_withdraw || config.MIN_WITHDRAW;
    
    const message = `💰 <b>SOLDE</b> 💰\n\n` +
      `💵 Votre solde actuel est de ${bal} FCFA 💵\n\n` +
      `👥 Vous avez actuellement ${nbFilleuls} membres dans votre équipe 👥\n\n` +
      `📌 Le retrait minimum est de ${minWithdraw.toLocaleString()} FCFA 🏧\n\n` +
      `Invitez vos amis pour augmenter vos chances de gagner énormément d'argent et de pouvoir retirer sans problème 🔥`;
    
    return ctx.replyWithHTML(message, mainMenu());
  }
  if (key === 'ref') {
    const botInfo = await bot.telegram.getMe();
    const link = `https://t.me/${botInfo.username}?start=${ctx.from.id}`;
    const u = db.data.users[String(ctx.from.id)] || {};
    const nb = (u.referrals && u.referrals.length) || 0;
    const refBonus = db.data.settings.ref_bonus || config.REF_BONUS;
    
    const message = `👥 <b>Lien de parrainage 🔗</b>\n\n` +
      `DJETFLEX™ 🔥 Voici votre lien de parrainage\n\n` +
      `${link}\n\n` +
      `💰 Vous gagnerez ${refBonus} FCFA pour chaque personne invité 👥\n\n` +
      `Actuellement vous avez ${nb} membres dans votre équipe 👥\n\n` +
      `Invité au moins 20 personne pour lancer votre premier retrait 🔥`;
    
    return ctx.replyWithHTML(message, mainMenu());
  }
  if (key === 'withdraw') {
    const u = db.data.users[String(ctx.from.id)];
    const bal = u ? u.balance || 0 : 0;
    const nbFilleuls = u && u.referrals ? u.referrals.length : 0;
    const minWithdraw = db.data.settings.min_withdraw || config.MIN_WITHDRAW;
    
    if (bal < minWithdraw || nbFilleuls < 20) {
      const botInfo = await bot.telegram.getMe();
      const link = `https://t.me/${botInfo.username}?start=${ctx.from.id}`;
      const refBonus = db.data.settings.ref_bonus || config.REF_BONUS;
      
      const message = `🏧 <b><i>LANCER UN RETRAIT</i></b> 🏧\n\n` +
        `❌ <b>accès refusé</b>\n\n` +
        `💰 Votre solde actuel est de ${bal.toLocaleString()} FCFA 💵\n\n` +
        `🎁 Le retrait minimum est de ${minWithdraw.toLocaleString()} FCFA 🏧\n\n` +
        `👥 Vous avez ${nbFilleuls} filleuls (minimum requis: 20)\n\n` +
        `Invité vos amis pour augmenter vos chances de gagner énormément d'argent et de pouvoir retirer sans problème 🔥\n\n` +
        `✈️ <b>Voici votre lien de parrainage</b>\n\n` +
        `${link}\n\n` +
        `${refBonus.toLocaleString()} FCFA pour chaque personne invité`;
      
      return ctx.replyWithHTML(message, mainMenu());
    }
    
    withdrawFlow[ctx.from.id] = { step: 'waiting_phone' };
    return ctx.reply(`🏧 <b>RETRAIT</b>\n\nVeuillez entrer votre numéro de téléphone Mobile Money (MoMo) ou Orange Money (OM) pour recevoir votre paiement :`, { parse_mode: 'HTML' });
  }
  if (key === 'menu') {
    return ctx.reply('📍 Menu principal', mainMenu());
  }
  if (key === 'back') {
    return ctx.reply('🔙 Retour au menu', mainMenu());
  }
  
  if (key === 'grosse') {
    const grosseMenu = Markup.keyboard([
      ["🤑 𝐆𝐀𝐆𝐍𝐄𝐑 𝐃𝐄 𝐋'𝐀𝐑𝐆𝐄𝐍𝐓 💰"],
      ['𝐒𝐀𝐅𝐄 𝐃𝐔 𝐉𝐎𝐔𝐑🥇'],
      ['𝐂𝐎𝐌𝐌𝐄𝐍𝐓 𝐅𝐀𝐈𝐑𝐄 ?'],
      ['𝐂𝐀𝐍𝐀𝐋 𝐎𝐅𝐅𝐈𝐂𝐈𝐄𝐋 ✅'],
      ['🔙 Retour']
    ]).resize();
    return ctx.reply('⚽ <b>COUPON GROSSE CÔTES</b> ⚽', { parse_mode: 'HTML', ...grosseMenu });
  }

  // content keys: envoyer tous les items de db.data.contents[key]
  const contentList = db.data.contents[key] || [];
  if (!contentList.length) {
    return ctx.reply("Aucun contenu pour le moment. Revenez plus tard ou contactez l'administrateur.");
  }

  for (const item of contentList) {
    try {
      if (item.type === 'text') {
        await ctx.reply(item.text, { parse_mode: 'HTML' });
      } else if (item.type === 'photo') {
        await ctx.replyWithPhoto(item.file_id, { caption: item.caption || '', parse_mode: 'HTML' });
      } else if (item.type === 'video') {
        await ctx.replyWithVideo(item.file_id, { caption: item.caption || '', parse_mode: 'HTML' });
      } else if (item.type === 'audio') {
        await ctx.replyWithAudio(item.file_id);
      } else if (item.type === 'voice') {
        await ctx.replyWithVoice(item.file_id);
      }
    } catch (e) {
      console.error('send content error', e);
    }
  }
});

// capture messages for withdraw flow and admin add flow
bot.on('message', async (ctx, next) => {
  // admin add flow capture: if admin started /add <key>
  const adminId = String(ctx.from.id);
  if (adminAddFlow[adminId] && config.ADMIN_IDS.includes(adminId)) {
    const flow = adminAddFlow[adminId];
    // save message depending on type
    const item = {};
    if (ctx.message.photo) {
      const fileId = ctx.message.photo.slice(-1)[0].file_id;
      item.type = 'photo';
      item.file_id = fileId;
      item.caption = ctx.message.caption || '';
    } else if (ctx.message.video) {
      item.type = 'video';
      item.file_id = ctx.message.video.file_id;
      item.caption = ctx.message.caption || '';
    } else if (ctx.message.audio) {
      item.type = 'audio';
      item.file_id = ctx.message.audio.file_id;
    } else if (ctx.message.voice) {
      item.type = 'voice';
      item.file_id = ctx.message.voice.file_id;
    } else if (ctx.message.text) {
      const text = ctx.message.text;
      if (text === '/done') {
        // finish flow: push collected items
        await db.read();
        db.data.contents[flow.key] = db.data.contents[flow.key] || [];
        db.data.contents[flow.key].push(...flow.items);
        await db.write();
        delete adminAddFlow[adminId];
        return ctx.reply(`✅ Contenu ajouté dans "${flow.key}" (${flow.items.length} éléments).`);
      } else {
        item.type = 'text';
        item.text = ctx.message.text;
      }
    } else {
      return ctx.reply('Type non supporté. Envoie texte, photo, vidéo, audio ou /done pour terminer.');
    }

    flow.items.push(item);
    return ctx.reply("Message ajouté au flow. Envoie d'autres éléments ou /done pour terminer.");
  }

  // withdraw flow capture (user)
  const wf = withdrawFlow[ctx.from.id];
  if (wf && wf.step === 'waiting_phone') {
    const phone = ctx.message.text || '';
    if (!phone || phone.length < 8) {
      return ctx.reply('❌ Numéro invalide. Veuillez entrer un numéro valide (au moins 8 chiffres):');
    }
    
    await db.read();
    const u = db.data.users[String(ctx.from.id)];
    const amount = u ? u.balance || 0 : 0;
    
    // create withdrawal with user's full balance
    const id = Date.now().toString();
    db.data.withdrawals[id] = { 
      id, 
      userId: ctx.from.id, 
      username: ctx.from.username || 'N/A',
      fullname: u.fullname || 'N/A',
      amount, 
      phone, 
      status: 'pending', 
      createdAt: Date.now() 
    };
    
    // débite le solde
    u.balance = 0;
    await db.write();
    delete withdrawFlow[ctx.from.id];

    // notify withdraw channel or admins
    const withdrawChannel = config.WITHDRAW_CHANNEL || (db.data.channels && db.data.channels.withdraw_channel);
    const msg = `🔔 <b>Nouvelle demande de retrait</b>\n\n` +
      `👤 User: @${ctx.from.username || ctx.from.id}\n` +
      `📛 Nom: ${u.fullname || 'N/A'}\n` +
      `💰 Montant: ${amount.toLocaleString()} FCFA\n` +
      `📱 Numéro: ${phone}\n` +
      `🆔 ID: ${id}`;
    const keyboard = Markup.inlineKeyboard([
      Markup.button.callback('✅ Approuver', `approve_${id}`),
      Markup.button.callback('❌ Rejeter', `reject_${id}`)
    ]);
    
    let notified = false;
    
    // Try to send to withdrawal channel first
    if (withdrawChannel) {
      try {
        await ctx.telegram.sendMessage(withdrawChannel, msg, { parse_mode: 'HTML', ...keyboard });
        notified = true;
      } catch (e) {
        console.error('Erreur envoi canal retraits:', e.message);
      }
    }
    
    // Fallback: notify all admins via DM if channel notification failed
    if (!notified) {
      for (const adminId of config.ADMIN_IDS) {
        try {
          await ctx.telegram.sendMessage(adminId, msg, { parse_mode: 'HTML', ...keyboard });
        } catch (e) {
          console.error(`Erreur notification admin ${adminId}:`, e.message);
        }
      }
    }
    await ctx.reply('✅ Demande de retrait créée.\n\nUn administrateur la traitera bientôt. Vous recevrez une notification une fois le paiement effectué.');
    return;
  }

  // si pas capturé, passe au reste
  return next();
});

// admin commands

// /add <key>  -> start add flow
bot.command('add', async (ctx) => {
  const fromId = String(ctx.from.id);
  if (!config.ADMIN_IDS.includes(fromId)) return ctx.reply('Commande admin seulement.');
  const parts = ctx.message.text.split(' ');
  if (parts.length < 2) return ctx.reply('Usage: /add <key>  (ex: /add safe or /add grosse)');
  const key = parts[1];
  if (!db.data.contents[key]) {
    await db.read();
    db.data.contents[key] = [];
    await db.write();
  }
  adminAddFlow[fromId] = { key, items: [] };
  return ctx.reply(`Ajout de contenu pour "${key}". Envoie photo/texte/video. Quand tu as fini envoie /done`);
});

// /list <key> -> list number of items
bot.command('list', async (ctx) => {
  const fromId = String(ctx.from.id);
  if (!config.ADMIN_IDS.includes(fromId)) return ctx.reply('Admin seul.');
  const parts = ctx.message.text.split(' ');
  const key = parts[1];
  await db.read();
  const arr = db.data.contents[key] || [];
  return ctx.reply(`Contenu "${key}" : ${arr.length} éléments.`);
});

// /clear <key>
bot.command('clear', async (ctx) => {
  const fromId = String(ctx.from.id);
  if (!config.ADMIN_IDS.includes(fromId)) return ctx.reply('Admin seul.');
  const parts = ctx.message.text.split(' ');
  const key = parts[1];
  await db.read();
  db.data.contents[key] = [];
  await db.write();
  return ctx.reply(`Contenu "${key}" vidé.`);
});

// /view <key> -> voir tous les éléments avec numéros
bot.command('view', async (ctx) => {
  const fromId = String(ctx.from.id);
  if (!config.ADMIN_IDS.includes(fromId)) return ctx.reply('Admin seul.');
  
  const parts = ctx.message.text.split(' ');
  if (parts.length < 2) {
    return ctx.reply('Usage: /view <key>\n\nExemple: /view safe');
  }
  
  const key = parts[1];
  await db.read();
  const arr = db.data.contents[key] || [];
  
  if (!arr.length) {
    return ctx.reply(`📋 Contenu "${key}" est vide.\n\nUtilisez /add ${key} pour ajouter du contenu.`);
  }
  
  let message = `📋 <b>Contenu de "${key}"</b>\n`;
  message += `Total: ${arr.length} élément(s)\n\n`;
  
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    message += `<b>${i + 1}.</b> `;
    
    if (item.type === 'text') {
      const preview = item.text.length > 50 ? item.text.substring(0, 50) + '...' : item.text;
      message += `📝 Texte: ${preview}\n`;
    } else if (item.type === 'photo') {
      message += `📷 Photo${item.caption ? ': ' + item.caption.substring(0, 30) : ''}\n`;
    } else if (item.type === 'video') {
      message += `🎥 Vidéo${item.caption ? ': ' + item.caption.substring(0, 30) : ''}\n`;
    } else if (item.type === 'audio') {
      message += `🎵 Audio\n`;
    } else if (item.type === 'voice') {
      message += `🎤 Message vocal\n`;
    } else {
      message += `❓ Type: ${item.type}\n`;
    }
  }
  
  message += `\n💡 Pour supprimer un élément, utilisez:\n<code>/delete ${key} numéro</code>`;
  
  return ctx.replyWithHTML(message);
});

// /delete <key> <numéro> -> supprimer un élément spécifique
bot.command('delete', async (ctx) => {
  const fromId = String(ctx.from.id);
  if (!config.ADMIN_IDS.includes(fromId)) return ctx.reply('Admin seul.');
  
  const parts = ctx.message.text.split(' ');
  if (parts.length < 3) {
    return ctx.reply('Usage: /delete <key> <numéro>\n\nExemple: /delete safe 2\n\n💡 Utilisez /view safe pour voir les numéros');
  }
  
  const key = parts[1];
  const index = parseInt(parts[2]) - 1; // -1 car l'utilisateur voit 1, 2, 3...
  
  await db.read();
  const arr = db.data.contents[key] || [];
  
  if (!arr.length) {
    return ctx.reply(`❌ Contenu "${key}" est vide.`);
  }
  
  if (index < 0 || index >= arr.length) {
    return ctx.reply(`❌ Numéro invalide. Le contenu "${key}" a ${arr.length} élément(s).\n\nUtilisez /view ${key} pour voir la liste.`);
  }
  
  const deleted = arr[index];
  db.data.contents[key].splice(index, 1);
  await db.write();
  
  let deletedInfo = '';
  if (deleted.type === 'text') {
    const preview = deleted.text.length > 50 ? deleted.text.substring(0, 50) + '...' : deleted.text;
    deletedInfo = `📝 ${preview}`;
  } else if (deleted.type === 'photo') {
    deletedInfo = '📷 Photo';
  } else if (deleted.type === 'video') {
    deletedInfo = '🎥 Vidéo';
  } else {
    deletedInfo = deleted.type;
  }
  
  return ctx.reply(`✅ Élément ${parts[2]} supprimé de "${key}"\n\n${