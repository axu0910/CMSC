process.stdin.setEncoding("utf8");

const http = require('http');
const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, 'credentialsDontPost/.env')
})
const express = require("express"); /* Accessing express module */
const app = express(); /* app is a request handler function */
const bodyParser = require("body-parser"); /* To handle post parameters */
const {
    MongoClient,
    ServerApiVersion
} = require('mongodb');

const axios = require("axios");

const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const database = process.env.MONGO_DB_NAME;
const collection = process.env.MONGO_COLLECTION;

const uri = `mongodb+srv://${userName}:${password}@cluster0.vmjxi.mongodb.net/myFirstDatabase?`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1
});

app.set("views", path.resolve(__dirname, "templates"));
app.use(bodyParser.urlencoded({
    extended: false
}));
app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));

let portNumber = 4000;

async function insert(cl, d, c, data) {
    await cl.db(d).collection(c).insertOne(data);
}

async function lookUp(cl, d, c, data) {
    const result = await cl.db(d).collection(c).findOne({
        name: data
    });
    return JSON.parse(JSON.stringify(result));
}

async function deleteAll(cl, d, c) {
    const result = await cl.db(d).collection(c).deleteMany({});
    return result.deletedCount
}

let webServer = http.createServer(app).listen(portNumber);

console.log(`Web server started and running at http://localhost:${portNumber}`);
console.log("Stop to shutdown the server: ");
process.stdin.on('readable', function () {

    let dataInput = process.stdin.read();
    if (dataInput !== null) {
        let command = dataInput.trim();
        if (command === "stop") {
            console.log("Shutting down the server");
            process.exit(0);
        } else {
            console.log(`Invalid command: ${command}`);
        }
        process.stdin.resume();
    }
});

app.get("/", (request, response) => {
    response.render("index", {
        port: portNumber
    });
});

app.post("/processApplication", (request, response) => {

    let n = request.body.name;
    let e = request.body.email;
    let s = request.body.stock;

    response.render("processApplication", {
        name: n,
        email: e,
        stock: s
    });

    let data = {
        name: n,
        email: e,
        stock: s
    };

    (async () => {
        try {
            await client.connect();
            await insert(client, database, collection, data);

        } catch (r) {
            console.log("ERROR, ERROR: " + r);
        }
    })();
});

app.get("/lookup", (request, response) => {
    response.render("lookUp", {
        port: portNumber
    });
});

app.post("/processLookup", (request, response) => {
    (async () => {
        try {
            await client.connect();
            let r = await lookUp(client, database, collection, request.body.name);
            const options = {
                method: 'GET',
                url: 'https://realstonks.p.rapidapi.com/'+ r.stock,
                headers: {
                  'X-RapidAPI-Host': 'realstonks.p.rapidapi.com',
                  'X-RapidAPI-Key': '76ee331c8cmsh0ba3befbe88f5fap15deecjsn9ea6b4b2cf7f'
                }
              };
              
              axios.request(options).then(function (sresponse) {
                let result = JSON.parse(JSON.stringify(sresponse.data));
                response.render("processLookup", {
                    name: r.stock,
                    price: result.price,
                    change: result.change_percentage,
                    volume: result.total_vol
                });
              }).catch(function (error) {
                  console.error(error);
              });

            
        } catch (e) {
            console.log("ERROR, ERROR: " + e);
        }
    })();
});

app.post("/processStock", (request, response) => {
    (async () => {
        try {
            await client.connect();
            const options = {
                method: 'GET',
                url: 'https://realstonks.p.rapidapi.com/'+ request.body.stock,
                headers: {
                  'X-RapidAPI-Host': 'realstonks.p.rapidapi.com',
                  'X-RapidAPI-Key': '76ee331c8cmsh0ba3befbe88f5fap15deecjsn9ea6b4b2cf7f'
                }
              };
              
              axios.request(options).then(function (sresponse) {
                let result = JSON.parse(JSON.stringify(sresponse.data));
                response.render("processLookup", {
                    name: request.body.stock,
                    price: Number(result.price).toFixed(2),
                    change: result.change_percentage,
                    volume: result.total_vol
                });
              }).catch(function (error) {
                  console.error(error);
              });

            
        } catch (e) {
            console.log("ERROR, ERROR: " + e);
        }
    })();
});


app.get("/remove", (request, response) => {
    response.render("remove", {
        port: portNumber
    });
});

app.post("/processRemove", (request, response) => {
    (async () => {
        try {
            await client.connect();
            let count = await deleteAll(client, database, collection);
            response.render("processRemove", {
                count: count
            });
        } catch (e) {
            console.log("ERROR, ERROR: " + e);
        }
    })();
});
