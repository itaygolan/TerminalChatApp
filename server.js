const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const Chatkit = require("@pusher/chatkit-server");

const app = express();
const chatkit = new Chatkit.default({
    instanceLocator: "v1:us1:9ceb4a40-ab7d-452d-ac35-42bf08649899",
    key: "f6c2e16e-e25c-4b34-b804-84b6bf1e793c:gj1Lzh6On2mS/SXBXdJ7PI9I7aoxAHciGOF4Vri3ZoI="
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

app.post('/users', (req, res) => {
    const { username } = req.body;
    chatkit
      .createUser({
          id: username,
          name: username
      })
      .then(() => {
          console.log(`User created: ${username}`);
          res.sendStatus(201);
      })
      .catch(err => {
          if (err.error === 'services/chatkit/user_already_exists') {
              console.log(`User already exists: ${username}`);
              res.sendStatus(200);
          }
          else {
              res.status(err.status).json(err);
          }
      });
});

app.post('/authenticate', (req, res) => {
    const authData = chatkit.authenticate({ userId: req.query.user_id });
    res.status(authData.status).send(authData.body)
});

const PORT = 3001;
app.listen(PORT, err => {
    if (err) {
        console.log(err);
    }
    else {
        console.log(`Running on local host port ${PORT}`);
    }
});
