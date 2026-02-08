// Script de migration de database.json vers PostgreSQL
const { PostgresDB } = require('./db-postgres');
const fs = require('fs');
const config = require('./config');

async function migrate() {
  console.log('🚀 Début de la migration vers PostgreSQL...\n');
  
  const db = new PostgresDB();
  
  try {
    // Initialiser les tables
    await db.init();
    console.log('✅ Tables créées\n');
    
    // Charger database.json
    if (!fs.existsSync('database.json')) {
      console.log('❌ database.json n\'existe pas');
      return;
    }
    
    const jsonData = JSON.parse(fs.readFileSync('database.json', 'utf-8'));
    console.log('✅ database.json chargé\n');
    
    // Migrer les settings
    console.log('📊 Migration des paramètres...');
    const settings = jsonData.settings || {};
    await db.setSetting('min_withdraw', settings.min_withdraw || config.MIN_WITHDRAW);
    await db.setSetting('ref_bonus', settings.ref_bonus || config.REF_BONUS);
    console.log('✅ Paramètres migrés\n');
    
    // Migrer les canaux
    console.log('📢 Migration des canaux...');
    const channels = jsonData.channels || [];
    const channelLinks = jsonData.channelLinks || {};
    
    // Ajouter les canaux du config s'ils n'existent pas déjà
    if (config.REQUIRED_CHANNELS && config.CHANNEL_LINKS) {
      for (let i = 0; i < config.REQUIRED_CHANNELS.length; i++) {
        const channelId = config.REQUIRED_CHANNELS[i];
        const link = config.CHANNEL_LINKS[i];
        if (!channels.includes(channelId)) {
          channels.push(channelId);
        }
        if (link && !channelLinks[channelId]) {
          channelLinks[channelId] = link;
        }
      }
    }
    
    for (const channelId of channels) {
      const link = channelLinks[channelId] || null;
      await db.addChannel(channelId, link);
    }
    console.log(`✅ ${channels.length} canaux migrés\n`);
    
    // Migrer les utilisateurs
    console.log('👥 Migration des utilisateurs...');
    const users = jsonData.users || {};
    let userCount = 0;
    for (const userId in users) {
      const user = users[userId];
      await db.createUser(userId, user);
      userCount++;
    }
    console.log(`✅ ${userCount} utilisateurs migrés\n`);
    
    // Migrer les retraits
    console.log('💰 Migration des retraits...');
    const withdrawals = jsonData.withdrawals || {};
    let withdrawalCount = 0;
    for (const withdrawalId in withdrawals) {
      const withdrawal = withdrawals[withdrawalId];
      await db.createWithdrawal(withdrawalId, withdrawal);
      withdrawalCount++;
    }
    console.log(`✅ ${withdrawalCount} retraits migrés\n`);
    
    // Migrer les contenus
    console.log('📦 Migration des contenus...');
    const contents = jsonData.contents || {};
    let contentCount = 0;
    for (const category in contents) {
      const items = contents[category];
      if (Array.isArray(items) && items.length > 0) {
        await db.addContent(category, items);
        contentCount += items.length;
        console.log(`  - ${category}: ${items.length} éléments`);
      }
    }
    console.log(`✅ ${contentCount} contenus migrés au total\n`);
    
    console.log('🎉 Migration terminée avec succès !');
    console.log('\n📋 Résumé:');
    console.log(`   - ${userCount} utilisateurs`);
    console.log(`   - ${withdrawalCount} retraits`);
    console.log(`   - ${channels.length} canaux`);
    console.log(`   - ${contentCount} contenus`);
    console.log(`   - 2 paramètres (min_withdraw, ref_bonus)`);
    
  } catch (error) {
    console.error('❌ Erreur pendant la migration:', error);
    throw error;
  } finally {
    await db.pool.end();
  }
}

// Exécuter la migration
migrate().catch(console.error);
