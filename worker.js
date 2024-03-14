import dbClient from './utils/db';

const imageThumbnail = require('image-thumbnail');
// eslint-disable-next-line import/no-unresolved
const fileQueue = require('fileQueue');

// eslint-disable-next-line no-unused-vars
function processQueue(job) {
  fileQueue.process(async (job) => {
    if (!job.data.fileId) throw new Error('Missing fileId');
    if (!job.data.userId) throw new Error('Missing userId');

    const files = dbClient.db.collection('files');
    const file = files.findOne({ _id: job.data.fileId, userId: job.data.userId });
    if (!file) throw new Error('File not found');

    const thumb1 = await imageThumbnail('image.png', { witdh: 500 });
    const thumb2 = await imageThumbnail('image.png', { witdh: 250 });
    const thumb3 = await imageThumbnail('image.png', { width: 100 });

    return { thumb1, thumb2, thumb3 };
  });
}

module.exports = processQueue;
