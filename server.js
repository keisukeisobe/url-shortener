require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const {MongoClient} = require('mongodb');
const bodyParser = require('body-parser');
const requestIp = require('request-ip');

async function main() {
  const uri = process.env.DB_URI;
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    // await createCounter(client);
    await createURLEntry(client, {url: 'https://www.facebook.com'});
  } catch (error) {
    console.error(error);
  } finally {
    await client.close();
  }
}

async function createURLEntry(client, newURL){
  await client.db("shorturls").collection("urls").insertOne({
    sequence: await getNextSequenceValue(client),
    url: newURL.url
  });
}

async function createCounter(client){
  await client.db("shorturls").collection("counters").insertOne({
    _id: "urlid",
    sequence_value: 0
  });
}

async function getNextSequenceValue(client){
  const sequenceDocument = await client.db("shorturls").collection("counters").findOneAndUpdate(
    {_id: "urlid"},
    {$inc:{sequence_value: 1}},
    true
  );
  console.log(`${sequenceDocument.value.sequence_value}`);
  return sequenceDocument.value.sequence_value;
}


main().catch(console.error);

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

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

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
