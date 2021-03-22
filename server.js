require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dns = require('dns');
const app = express();
const {MongoClient} = require('mongodb');
const bodyParser = require('body-parser');
const requestIp = require('request-ip');

const uri = process.env.DB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function main() {
  try {
    await client.connect();
    await createURLEntry({url: 'https://www.freecodecamp.org/learn/apis-and-microservices/#basic-node-and-express'});
  } catch (error) {
    console.error(error);
  } finally {
    await client.close();
  }
}

async function createURLEntry(newURL){
  await client.db("shorturls").collection("urls").insertOne({
    sequence: await getNextSequenceValue(),
    url: newURL.url
  });
}

async function getNextSequenceValue(){
  const sequenceDocument = await client.db("shorturls").collection("counters").findOneAndUpdate(
    {_id: "urlid"},
    {$inc:{sequence_value: 1}},
    true
  );
  return sequenceDocument.value.sequence_value;
}

main().catch(console.error);

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use(bodyParser.urlencoded({extended: true}));

app.use(bodyParser.json());

app.use(requestIp.mw());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.get('/api/timestamp', (req, res, next) =>{
  res.json({unix: (new Date()).valueOf(), utc: (new Date()).toUTCString()});
});

app.get('/api/timestamp/:date?', (req, res, next) => {
  if(/\d{5,}/.test(req.params.date)){
    const unix = parseInt(req.params.date);
    const dateString = (new Date(unix)).toUTCString();
    res.json({unix, utc: dateString});
  } else {
    const date = new Date(req.params.date);
    if (date.toString() === "Invalid Date"){
      res.json({error: "Invalid Date"});
    } else {
      res.json({unix: date.valueOf(), utc: date.toUTCString()});
    }
  }
});

app.get('/api/whoami', (req, res, next) => {
  const ipAddress = req.clientIp;
  const languages = req.acceptsLanguages();
  const software = req.get('User-Agent');
  res.json({
    ipaddress: ipAddress,
    language: [...languages].toString(),
    software
  });
});

app.post('/api/shorturl/new', async function(req, res) {
  console.log(req.body.url);
  await createURLEntry({url: req.body.url});
});

app.get('/api/shorturl/:url', function(req, res) {
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
