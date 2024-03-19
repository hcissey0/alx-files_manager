import sha1 from 'sha1';
import redisClient from '../utils/redis';

const dbClient = require('../utils/db');

class UsersController {
  static async postNew(req, res) {
    if (!req.body.email) return res.status(400).send({ error: 'Missing email' });
    if (!req.body.password) return res.status(400).send({ error: 'Missing password' });

    const userExists = await dbClient.db.collection('users').findOne({ email: req.body.email });
    if (userExists) return res.status(400).send({ error: 'Already exist' });

    const hashedPassword = sha1(req.body.password);
    console.log(hashedPassword);
    const result = await dbClient.db.collection('users').insertOne({
      email: req.body.email, password: hashedPassword,
    });
    console.log(result);

    return res.status(201).send({ id: result.insertedId, email: req.body.email });
  }

  static async getMe(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).send({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).send({ error: 'Unauthorized' });

    const user = await dbClient.db.collection('users').findOne({ userId });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    return res.status(200).send({ id: user._id.toString(), email: user.email });
  }
}

module.exports = UsersController;
