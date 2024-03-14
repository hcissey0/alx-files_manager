const express = require('express');
const routes = require('./routes/index');

const port = process.env.PORT || 5000;
const app = express(port);

app.use('/', routes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
