// Simple JSON database wrapper
const fs = require('fs');
const path = require('path');

class SimpleDB {
  constructor(filename) {
    this.filename = filename;
    this.data = null;
  }

  async read() {
    if (fs.existsSync(this.filename)) {
      const content = fs.readFileSync(this.filename, 'utf-8');
      this.data = JSON.parse(content);
    } else {
      this.data = {};
    }
    return this.data;
  }

  async write() {
    fs.writeFileSync(this.filename, JSON.stringify(this.data, null, 2), 'utf-8');
  }
}

module.exports = { SimpleDB };
