const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

class PostgresDB {
  constructor() {
    this.pool = pool;
  }

  async init() {
    await this.createTables();
  }

  async createTables() {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          telegram_id BIGINT UNIQUE NOT NULL,
          username TEXT,
          fullname TEXT,
          balance INTEGER DEFAULT 0,
          referrals TEXT[] DEFAULT '{}',
          referred_by TEXT,
          joined_at BIGINT NOT NULL,
          banned BOOLEAN DEFAULT FALSE
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS withdrawals (
          id TEXT PRIMARY KEY,
          user_id BIGINT NOT NULL,
          username TEXT,
          fullname TEXT,
          amount INTEGER NOT NULL,
          phone TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at BIGINT NOT NULL,
          processed_at BIGINT
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS contents (
          id SERIAL PRIMARY KEY,
          category TEXT NOT NULL,
          type TEXT NOT NULL,
          file_id TEXT,
          text TEXT,
          caption TEXT,
          entities JSONB DEFAULT '[]',
          caption_entities JSONB DEFAULT '[]',
          created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
        )
      `);
      
      await client.query(`
        ALTER TABLE contents ADD COLUMN IF NOT EXISTS entities JSONB DEFAULT '[]'
      `);
      await client.query(`
        ALTER TABLE contents ADD COLUMN IF NOT EXISTS caption_entities JSONB DEFAULT '[]'
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS channels (
          channel_id TEXT PRIMARY KEY,
          link TEXT
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value INTEGER NOT NULL
        )
      `);

      await client.query('COMMIT');
      console.log('✅ Tables PostgreSQL créées avec succès');
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('❌ Erreur création tables:', e.message);
      throw e;
    } finally {
      client.release();
    }
  }

  async getUser(userId, client = null) {
    const executor = client || this.pool;
    const result = await executor.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      id: row.telegram_id,
      username: row.username,
      fullname: row.fullname,
      balance: row.balance,
      referrals: row.referrals || [],
      referredBy: row.referred_by,
      joinedAt: parseInt(row.joined_at),
      banned: row.banned
    };
  }

  async createUser(userId, data, client = null) {
    const executor = client || this.pool;
    await executor.query(
      `INSERT INTO users (id, telegram_id, username, fullname, balance, referrals, referred_by, joined_at, banned)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [
        userId,
        data.id,
        data.username,
        data.fullname,
        data.balance || 0,
        data.referrals || [],
        data.referredBy,
        data.joinedAt,
        data.banned || false
      ]
    );
  }

  async updateUser(userId, data, client = null) {
    const executor = client || this.pool;
    await executor.query(
      `UPDATE users SET username = $2, fullname = $3, balance = $4, referrals = $5, referred_by = $6, banned = $7
       WHERE id = $1`,
      [
        userId,
        data.username,
        data.fullname,
        data.balance,
        data.referrals || [],
        data.referredBy,
        data.banned
      ]
    );
  }

  async getAllUsers() {
    const result = await this.pool.query('SELECT * FROM users');
    const users = {};
    for (const row of result.rows) {
      users[row.id] = {
        id: row.telegram_id,
        username: row.username,
        fullname: row.fullname,
        balance: row.balance,
        referrals: row.referrals || [],
        referredBy: row.referred_by,
        joinedAt: parseInt(row.joined_at),
        banned: row.banned
      };
    }
    return users;
  }

  async getWithdrawal(withdrawalId, client = null) {
    const executor = client || this.pool;
    const result = await executor.query('SELECT * FROM withdrawals WHERE id = $1', [withdrawalId]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      username: row.username,
      fullname: row.fullname,
      amount: row.amount,
      phone: row.phone,
      status: row.status,
      createdAt: parseInt(row.created_at),
      processedAt: row.processed_at ? parseInt(row.processed_at) : null
    };
  }

  async createWithdrawal(withdrawalId, data, client = null) {
    const executor = client || this.pool;
    await executor.query(
      `INSERT INTO withdrawals (id, user_id, username, fullname, amount, phone, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        withdrawalId,
        data.userId,
        data.username,
        data.fullname,
        data.amount,
        data.phone,
        data.status,
        data.createdAt
      ]
    );
  }

  async updateWithdrawal(withdrawalId, data, client = null) {
    const executor = client || this.pool;
    await executor.query(
      `UPDATE withdrawals SET status = $2, processed_at = $3 WHERE id = $1`,
      [withdrawalId, data.status, data.processedAt || Date.now()]
    );
  }

  async getAllWithdrawals() {
    const result = await this.pool.query('SELECT * FROM withdrawals');
    const withdrawals = {};
    for (const row of result.rows) {
      withdrawals[row.id] = {
        id: row.id,
        userId: row.user_id,
        username: row.username,
        fullname: row.fullname,
        amount: row.amount,
        phone: row.phone,
        status: row.status,
        createdAt: parseInt(row.created_at),
        processedAt: row.processed_at ? parseInt(row.processed_at) : null
      };
    }
    return withdrawals;
  }

  async getContents(category) {
    const result = await this.pool.query(
      'SELECT * FROM contents WHERE category = $1 ORDER BY created_at DESC',
      [category]
    );
    return result.rows.map(row => {
      let entities = [];
      let caption_entities = [];
      
      // Parse entities if they're JSON strings
      if (row.entities) {
        if (typeof row.entities === 'string') {
          try { entities = JSON.parse(row.entities); } catch(e) { entities = []; }
        } else {
          entities = row.entities;
        }
      }
      
      if (row.caption_entities) {
        if (typeof row.caption_entities === 'string') {
          try { caption_entities = JSON.parse(row.caption_entities); } catch(e) { caption_entities = []; }
        } else {
          caption_entities = row.caption_entities;
        }
      }
      
      return {
        type: row.type,
        file_id: row.file_id,
        text: row.text,
        caption: row.caption,
        entities: entities,
        caption_entities: caption_entities
      };
    });
  }

  async addContent(category, items) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const item of items) {
        await client.query(
          `INSERT INTO contents (category, type, file_id, text, caption, entities, caption_entities)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            category, 
            item.type, 
            item.file_id || null, 
            item.text || null, 
            item.caption || null,
            JSON.stringify(item.entities || []),
            JSON.stringify(item.caption_entities || [])
          ]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async clearContents(category) {
    await this.pool.query('DELETE FROM contents WHERE category = $1', [category]);
  }

  async deleteContent(category, index) {
    const result = await this.pool.query(
      'SELECT id FROM contents WHERE category = $1 ORDER BY created_at DESC',
      [category]
    );
    if (index >= 0 && index < result.rows.length) {
      const id = result.rows[index].id;
      await this.pool.query('DELETE FROM contents WHERE id = $1', [id]);
      return true;
    }
    return false;
  }

  async getChannels() {
    const result = await this.pool.query('SELECT * FROM channels');
    return result.rows.map(row => row.channel_id);
  }

  async getChannelLinks() {
    const result = await this.pool.query('SELECT * FROM channels');
    const links = {};
    for (const row of result.rows) {
      if (row.link) {
        links[row.channel_id] = row.link;
      }
    }
    return links;
  }

  async addChannel(channelId, link = null) {
    await this.pool.query(
      `INSERT INTO channels (channel_id, link) VALUES ($1, $2)
       ON CONFLICT (channel_id) DO UPDATE SET link = $2`,
      [channelId, link]
    );
  }

  async removeChannel(channelId) {
    await this.pool.query('DELETE FROM channels WHERE channel_id = $1', [channelId]);
  }

  async clearChannels() {
    await this.pool.query('DELETE FROM channels');
  }

  async getSetting(key) {
    const result = await this.pool.query('SELECT value FROM settings WHERE key = $1', [key]);
    return result.rows.length > 0 ? result.rows[0].value : null;
  }

  async setSetting(key, value) {
    await this.pool.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      [key, value]
    );
  }

  async getSettings() {
    const result = await this.pool.query('SELECT * FROM settings');
    const settings = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }
    return settings;
  }

  async runInTransaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async addReferralBonus(referrerId, newUserId, bonusAmount) {
    return await this.runInTransaction(async (client) => {
      await client.query(
        'UPDATE users SET balance = balance + $1, referrals = array_append(referrals, $2) WHERE id = $3',
        [bonusAmount, newUserId, referrerId]
      );
    });
  }

  async seedDefaults(config) {
    const channels = await this.getChannels();
    if (channels.length === 0 && config.REQUIRED_CHANNELS) {
      for (let i = 0; i < config.REQUIRED_CHANNELS.length; i++) {
        const channelId = config.REQUIRED_CHANNELS[i];
        const link = config.CHANNEL_LINKS ? config.CHANNEL_LINKS[i] : null;
        await this.addChannel(channelId, link);
      }
    }

    const settings = await this.getSettings();
    if (!settings.min_withdraw) {
      await this.setSetting('min_withdraw', config.MIN_WITHDRAW);
    }
    if (!settings.ref_bonus) {
      await this.setSetting('ref_bonus', config.REF_BONUS);
    }
  }
}

module.exports = { PostgresDB };
