import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
// import processQueue from '../worker';

// const bull = require('bull');

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    const key = `auth_${token}`;

    const userId = await redisClient.get(key);
    if (!userId) return res.status(401).send({ error: 'Unauthorized' });
    const { name } = req.body;
    const { type } = req.body;
    const parentId = req.body.parentId || 0;
    const isPublic = req.body.isPublic || false;
    const { data } = req.body;
    const acceptedTypes = ['folder', 'file', 'image'];
    const files = dbClient.db.collection('files');
    if (!name) return res.status(400).send({ error: 'Missing name' });
    if (!type || !acceptedTypes.includes(type)) return res.status(400).send({ error: 'Missing type' });
    if (!data && type !== 'folder') return res.status(400).send({ error: 'Missing data' });

    if (parentId !== 0) {
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
}

module.exports = FilesController;
