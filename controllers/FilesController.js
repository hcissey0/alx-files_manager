import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
// import processQueue from '../worker';

// const bull = require('bull');

class FilesController {
  static async postUpload(req, res) {
    const users = dbClient.db.collection('users');
    const files = dbClient.db.collection('files');

    const token = req.headers['x-token'];
    const key = `auth_${token}`;

    const userId = await redisClient.get(key);
    if (!userId) return res.status(401).send({ error: 'Unauthorized' });

    const user = await users.findOne({ _id: ObjectId(userId) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    const { name } = req.body;
    const { type } = req.body;
    const parentId = req.body.parentId || '0';
    const isPublic = req.body.isPublic || false;
    const { data } = req.body;

    const acceptedTypes = ['folder', 'file', 'image'];

    if (!name) return res.status(400).send({ error: 'Missing name' });
    if (!type || !acceptedTypes.includes(type)) return res.status(400).send({ error: 'Missing type' });
    if (!data && type !== 'folder') return res.status(400).send({ error: 'Missing data' });

    if (parentId !== '0') {
      const file = await files.findOne({ _id: ObjectId(parentId) });
      if (!file) return res.status(400).send({ error: 'Parent not found' });
      if (file.type !== 'folder') return res.status(400).send({ error: 'Parent is not a folder' });
    }
    if (type === 'folder') {
      const newFile = await files.insertOne({
        userId,
        name,
        type,
        isPublic,
        parentId,
      });
      return res.status(201).send({
        id: newFile.insertedId,
        userId: newFile.ops[0].userId,
        name: newFile.ops[0].name,
        type: newFile.ops[0].type,
        isPublic: newFile.ops[0].isPublic,
        parentId: newFile.ops[0].parentId,
      });
    }

    const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(FOLDER_PATH)) fs.mkdirSync(FOLDER_PATH);
    const localPath = `${FOLDER_PATH}/${uuidv4()}`;
    const decode = Buffer.from(data, 'base64').toString('utf-8');
    await fs.promises.writeFile(localPath, decode);
    const newFile = await files.insertOne({
      userId,
      name,
      type,
      isPublic,
      parentId,
      localPath,
    });

    return res.status(201).send({
      id: newFile.insertedId,
      userId: newFile.ops[0].userId,
      name: newFile.ops[0].name,
      type: newFile.ops[0].type,
      isPublic: newFile.ops[0].isPublic,
      parentId: newFile.ops[0].parentId,
      localPath: newFile.ops[0].localPath,
    });
  }

  static async getShow(req, res) {
    const { id } = req.params;
    const token = req.headers['x-token'];
    if (!token) res.ststus(401).send({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).send({ error: 'Unauthorized' });

    const files = dbClient.db.collection('files');
    const users = dbClient.db.collection('users');

    const user = await users.findOne({ _id: ObjectId(userId) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    const file = await files.findOne({ _id: ObjectId(id) });
    if (!file) return res.status(404).send({ error: 'Not found' });
    return res.send(file);
  }

  static async getIndex(req, res) {
    const users = dbClient.db.collection('users');
    const files = dbClient.db.collection('files');

    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).send({ error: 'Unauthorized' });

    const user = await users.findOne({ _id: ObjectId(userId) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    const { parentId = '0', page = 0 } = req.query;

    // const allFiles = files.find({ parentId });
    // if (!allFiles) return res.send([]);

    try {
      const pipeline = [
        {
          $match: {
            userId,
            parentId,
          },
        },
        {
          $skip: page * 20,
        },
        {
          $limit: 20,
        },
      ];
      const allFiles = await files.aggregate(pipeline).toArray();

      return res.json(allFiles);
    } catch (error) {
      return res.status(500).send({ error: 'Internal Server Error' });
    }
  }

  static async putPublish(req, res) {
    return [req, res];
  }

  static async putUnpublish(req, res) {
    return [req, res];
  }
}

module.exports = FilesController;
