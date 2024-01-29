const { resolveSoa } = require('dns');
const redis = require('redis');

class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.client.on('error', (err) => {
      console.error(err);
    });
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, val) => {
        if (err) return reject(err);
        return resolve(val);
      });
    });
  }

  async set(key, value, duration) {
    return new Promise((resolve, reject) => {
      this.client.set(key, value, 'EX', duration, (err, rep) => {
        if (err) return reject(err);
        return resolve(rep);
      });
    });
  }

  async del(key) {
    return new Promise((resolve, reject) => {
      this.client.del(key, (err, count) => {
        if (err) return reject(err);
        return resolve(count);
      });
    });
  }
}

const redisClient = new RedisClient();

module.exports = redisClient;
