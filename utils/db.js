const { MongoClient } = require('mongodb');

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${host}:${port}`;

    this.client = new MongoClient(url);

    this.client.connect((err) => {
      if (err) this.db = false;
      else this.db = this.client.db(database);
    });
  }

  isAlive() {
    return !!this.db;
  }

  async nbUsers() {
    // eslint-disable-next-line no-return-await
    return this.db ? await this.db.collection('users').countDocuments() : 0;
  }

  async nbFiles() {
    // eslint-disable-next-line no-return-await
    return this.db ? await this.db.collection('files').countDocuments() : 0;
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
