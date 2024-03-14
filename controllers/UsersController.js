import sha1 from 'sha1';

const dbClient = require('../utils/db');

class UsersController {
  static async postNew(req, res) {
    if (!req.body.email) return res.status(400).send({ error: 'Missing email' });
    if (!req.body.password) return res.status(400).send({ error: 'Missing password' });

    const userExists = await dbClient.users.findOne({ email: req.body.email });
    if (userExists) return res.status(400).send({ error: 'Already exist' });

    const hashedPassword = sha1(req.body.password);
    const result = await dbClient.users.insertOne({
      email: req.body.email, password: hashedPassword,
    });

    return res.status(201).send({ id: result.insertId, email: req.body.email });
  }
}

module.exports = UsersController;
