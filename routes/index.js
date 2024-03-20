import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';

const router = express.Router();

router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

router.post('/users', UsersController.postNew);
router.get('/users/me', UsersController.getMe);

router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);

router.post('/files', FilesController.postUpload);
router.get('/files', FilesController.getIndex);

router.get('/files/:id', FilesController.getShow);

router.put('/files/:id/publish', FilesController.putPublish);
router.put('/files/:id/unpublish', FilesController.putUnpublish);

// delete this later
// eslint-disable-next-line import/first
import dbClient from '../utils/db';

router.get('/all', async (req, res) => {
  const files = await dbClient.db.collection('files').find().toArray();
  const users = await dbClient.db.collection('users').find().toArray();
  res.send({ files, users });
});

router.delete('/clean', async (req, res) => {
  const fileResult = await dbClient.db.collection('files').deleteMany({}, (err, result) => {
    if (err) return { error: err };
    return result;
  });
  const usersResult = await dbClient.db.collection('users').deleteMany({}, (err, result) => {
    if (err) return { error: err };
    return result;
  });

  res.send({ fileResult, usersResult });
});
module.exports = router;
