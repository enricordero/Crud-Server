'use strict';

import cors from 'cors';
import http from 'http';
import fs from 'fs';
import express, { NextFunction, Request, Response } from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

/* ********************** Mongo config ********************** */
dotenv.config({ path: '.env' });
const dbName = process.env.dbName;
const connectionString = process.env.connectionStringAtlas!;

/* ********************** HTTP server ********************** */
const port = process.env.PORT;
let paginaErrore: string;
const app = express();
const server = http.createServer(app);
server.listen(port, () => {
  init();
  console.log(`Server listening on port ${port}`);
});
function init() {
  fs.readFile('./static/error.html', (err, data) => {
    if (!err) {
      paginaErrore = data.toString();
    } else {
      paginaErrore = '<h1>Risorsa non trovata</h1>';
    }
  });
}
/* ********************** Middleware ********************** */
// 1. Request log
app.use('/', (req: any, res: any, next: any) => {
  console.log(req.method + ': ' + req.originalUrl);
  next();
});

// 2. Static resources
app.use('/', express.static('./static'));

// 3. Body params
app.use('/', express.json({ limit: '50mb' })); // Parsifica i parametri in formato json
app.use('/', express.urlencoded({ limit: '50mb', extended: true })); // Parsifica i parametri urlencoded

// 4. Params log
app.use('/', (req, res, next) => {
  if (Object.keys(req.query).length > 0) {
    console.log('--> Parametri GET: ' + JSON.stringify(req.query));
  }
  if (Object.keys(req.body).length > 0) {
    console.log('--> Parametri BODY: ' + JSON.stringify(req.body));
  }
  next();
});

// 5. CORS
const corsOptions = {
  origin: function (origin, callback) {
    return callback(null, true);
  },
  credentials: true
}
app.use("/", cors(corsOptions));

/* ********************** Client routes ********************** */
app.get('/api/getCollections', async (req: Request, res: Response, next: NextFunction) => {
  const client = new MongoClient(connectionString);
  await client.connect();
  const db = client.db(dbName);
  const request = db.listCollections().toArray();
  request.then((data) => {
    res.send(data);
  });
  request.catch((err) => {
    res.status(500).send(`Collections access error: ${err}`);
  });
  request.finally(() => {
    client.close();
  });
});

app.get('/api/:collection', async (req: Request, res: Response, next: NextFunction) => {
  let filters = req.query
  const collectionName = req.params.collection;
  const client = new MongoClient(connectionString);
  await client.connect();
  const collection = client.db(dbName).collection(collectionName);
  const request = collection.find(filters).toArray();
  request.catch((err) => {
    res.status(500).send(`Errore esecuzione query: ${err}`);
  });
  request.then((data) => {
    res.send(data);
  });
  request.finally(() => {
    client.close();
  });
});

app.get('/api/:collection/:id', async (req: Request, res: Response, next: NextFunction) => {
  let { id } = req.params;
  let _id;
  if (ObjectId.isValid(id)) {
    _id = new ObjectId(id);
  }
  else {
    _id = id;
  }

  let collectionName = req.params.collection;
  const client = new MongoClient(connectionString);
  await client.connect();
  let collection = client.db(dbName).collection(collectionName);

  collection
    .findOne({ _id })
    .catch((err) => {
      res.status(500).send('Error in query execution: ' + err);
    })
    .then((data) => {
      res.send(data);
    })
    .finally(() => {
      client.close();
    });
});

app.post('/api/:collection/', async (req: Request, res: Response) => {
  const newRecord = req.body;

  let collectionName = req.params.collection;
  const client = new MongoClient(connectionString);
  await client.connect();
  let collection = client.db(dbName).collection(collectionName);

  collection
    .insertOne(newRecord)
    .catch((err) => {
      res.status(500).send('Error in query execution: ' + err);
    })
    .then((data) => {
      res.send(data);
    })
    .finally(() => {
      client.close();
    });
});

app.delete('/api/:collection/:id', async (req: Request, res: Response) => {
  const { id: _id, collection: collectionName } = req.params;
  let objectId;
  if (ObjectId.isValid(_id)) {
    objectId = new ObjectId(_id);
  }
  else {
    objectId = _id;
  }

  const client = new MongoClient(connectionString);
  await client.connect();
  const collection = client.db(dbName).collection(collectionName);

  collection
    .deleteOne({ _id: objectId })
    .catch((err) => {
      res.status(500).send('Error in query execution: ' + err);
    })
    .then((data) => {
      res.send(data);
    })
    .finally(() => {
      client.close();
    });
});

app.put('/api/:collection/:id', async (req: Request, res: Response) => {
  const { action } = req.body;
  let { id: _id, collection: collectionName } = req.params;
  let objectId;
  if (ObjectId.isValid(_id)) {
    objectId = new ObjectId(_id);
  }
  else {
    objectId = _id;
  }
  const client = new MongoClient(connectionString);
  await client.connect();
  const collection = client.db(dbName).collection(collectionName);

  collection
    .updateOne({ _id: objectId }, action)
    .catch((err) => {
      res.status(500).send('Error in query execution: ' + err);
    })
    .then((data) => {
      res.send(data);
    })
    .finally(() => {
      client.close();
    });
});

app.patch('/api/:collection/:id', async (req: Request, res: Response) => {
  const { id: _id, collection: collectionName } = req.params;
  const { action } = req.body;
  let objectId;
  if (ObjectId.isValid(_id)) {
    objectId = new ObjectId(_id);
  }
  else {
    objectId = _id;
  }
  const client = new MongoClient(connectionString);
  await client.connect();
  const collection = client.db(dbName).collection(collectionName);

  collection
    .updateOne({ _id: objectId }, { $set: action })
    .catch((err) => {
      res.status(500).send('Error in query execution: ' + err);
    })
    .then((data) => {
      res.send(data);
    })
    .finally(() => {
      client.close();
    });
});
/* ********************** Default Route & Error Handler ********************** */
app.use('/', (req: Request, res: Response, next: NextFunction) => {
  res.status(404);
  if (!req.originalUrl.startsWith('/api/')) {
    res.send(paginaErrore);
  } else {
    res.send(`Resource not found: ${req.originalUrl}`);
  }
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.log(err.stack);
  res.status(500).send(err.message);
});
