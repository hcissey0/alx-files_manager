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
    let parentId = req.body.parentId || '0';
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
      parentId = file._id;
    }
    if (type === 'folder') {
      const newFile = await files.insertOne({
        userId: user._id,
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
      userId: user._id,
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

    const file = await files.findOne({ _id: ObjectId(id), userId: user._id });
    if (!file) return res.status(404).send({ error: 'Not found' });
    return res.send({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
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

    try {
      const pipeline = [
        {
          $match: {
            userId: user._id,
            ...(parentId !== '0' && { parentId: ObjectId(parentId) }),
          },
        },
        {
          $skip: page * 20,
        },
        {
          $limit: 20,
        },
      ];
      const allFiles = await files.aggregate(pipeline)
        .project({
          _id: 0,
          id: '$_id',
          userId: 1,
          name: 1,
          isPublic: 1,
          parentId: 1,
        }).toArray();
      return res.json(allFiles);
    } catch (error) {
      return res.status(500).send({ error: error.message });
    }
  }

  static async putPublish(req, res) {
    const users = dbClient.db.collection('users');
    const files = dbClient.db.collection('files');

    const { id } = req.params;
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).send({ error: 'Unauthorized' });

    const user = await users.findOne({ _id: ObjectId(userId) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    try {
      await files.updateOne(
        { _id: ObjectId(id), userId: user._id },
        { $set: { isPublic: true } },
      );
      const file = await files.findOne({ _id: ObjectId(id), userId: user._id });

      if (!file) return res.status(404).send({ error: 'Not found' });
      return res.send({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      });
    } catch (error) {
      return res.status(404).send({ error: 'Not found' });
    }
  }

  static async putUnpublish(req, res) {
    const users = dbClient.db.collection('users');
    const files = dbClient.db.collection('files');

    const { id } = req.params;

    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    const user = await users.findOne({ _id: ObjectId(userId) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    await files.updateOne(
      { _id: ObjectId(id), userId: user._id },
      { $set: { isPublic: false } },
    );
    const file = await files.findOne({ _id: ObjectId(id), userId: user._id });

    if (!file) return res.status(404).send({ error: 'Not found' });
    return res.send({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }
}

module.exports = FilesController;
