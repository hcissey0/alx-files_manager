import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';

const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

class AuthController {
  static async getConnect(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).send({ error: 'Unauthorized' });
    const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString('utf-8');
    const [email, password] = credentials.split(':');

    const user = await dbClient.users.findOne({ email, password: sha1(password) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    const token = uuidv4();
    await redisClient.set(`auth_${token}`, user._id.toString(), 60 * 60 * 24);

    return res.status(200).send({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.headers['X-Token'];
    if (!token) return res.status(401).send({ error: 'Unauthorized' });
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).send({ error: 'Unauthorized' });
    await redisClient.del(`auth_${token}`);
    return res.status(204).send();
  }
}

module.exports = AuthController;
