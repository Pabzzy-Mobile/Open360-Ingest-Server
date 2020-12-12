const NodeMediaServer = require('node-media-server');
const http = require('http');
const fs = require("fs");

const redis = require('redis');
// Create the database client
let RedisClient = redis.createClient({
    host: 'open360-redis-ingest',
    port: 6379
});

// Listen for any database errors
RedisClient.on("error", function(error) {
    console.error(error);
});

// Load the config
const config = require('./config/default.json');
const Util = require("open360-util");

let nms = new NodeMediaServer(config);

fs.mkdir("./video_database/live", {recursive: true}, (err) => {
    if (err)
        console.error(err);
});
fs.mkdir("./video_database/video", {recursive: true}, (err) => {
    if (err)
        console.error(err);
});

nms.run();

/*
TODO LIST
    - Unique Stream keys DONE
    - Verify Stream keys with the web server DONE
    - Shared Stream key database KINDA DONE
    - Fix thumbnails
 */

nms.on('preConnect', (id, args) => {
    console.log('[NodeEvent on preConnect]', `id=${id} args=${JSON.stringify(args)}`);
    // let session = nms.getSession(id);
    // session.reject();
});

nms.on('postConnect', (id, args) => {
    console.log('[NodeEvent on postConnect]', `id=${id} args=${JSON.stringify(args)}`);
});

nms.on('doneConnect', (id, args) => {
    console.log('[NodeEvent on doneConnect]', `id=${id} args=${JSON.stringify(args)}`);
});

nms.on('prePublish', (id, streamPath, args) => {
    let streamKey = getStreamKeyFromStreamPath(streamPath);
    console.log('[NodeEvent on prePublish]', `id=${id} streamPath=${streamPath} args=${JSON.stringify(args)}`);

    let session = nms.getSession(id);

    // INFO
    // this is where the stream key verification should be
    // also the path rerouting for the database
    //console.log(session);
    //console.log(session.publishStreamPath);
    // let session = nms.getSession(id);
    // session.reject();

    requestCheckStreamKeyExist(streamKey)
        .then((exists) => {
            console.log('[NodeEvent on prePublish]', "Stream Key: ", exists ? "authorized" : "rejected");
            if (!exists){
                // Key is not real so reject
                session.reject();
            } else {
                // Key is real and so do some stuff
                // Send the signal that the server is live and ready
                sendChannelLivePOST(streamKey, true)
                    .then(() => {
                        // Create a thumbnail generator
                        let thumbGenerationTask = setInterval(() => {
                            generateStreamThumbnail(streamKey);
                        }, 1800);
                        // Remember the ID of the generator
                        RedisClient.set(session.id + "thumbGeneratorTask", thumbGenerationTask);
                    });
            }
        })
        .catch((err) => {
            console.error(err);
            session.reject();
        })
});

nms.on('postPublish', (id, streamPath, args) => {
    let streamKey = getStreamKeyFromStreamPath(streamPath);
    console.log('[NodeEvent on postPublish]', `id=${id} streamPath=${streamPath} args=${JSON.stringify(args)}`);
});

nms.on('donePublish', (id, streamPath, args) => {
    let streamKey = getStreamKeyFromStreamPath(streamPath);
    console.log('[NodeEvent on donePublish]', `id=${id} streamPath=${streamPath} args=${JSON.stringify(args)}`);
    // Get the session id
    let session = nms.getSession(id);
    RedisClient.get(session.id + "thumbGeneratorTask", (err, taskID) => {
        clearInterval(taskID);
    });
    // Set a task later to make the VOD mp4 of the stream and set the stream to offline
    setTimeout(() => {
        Util.segmentation.makeVOD(streamKey)
            .then(() => {
                console.log("[NodeEvent on donePublish]", `id=${id}`, "VOD saved");
                sendChannelLivePOST(streamKey, false);
            })
    },1000);
});

nms.on('prePlay', (id, streamPath, args) => {
    console.log('[NodeEvent on prePlay]', `id=${id} streamPath=${streamPath} args=${JSON.stringify(args)}`);
    // let session = nms.getSession(id);
    // session.reject();
});

nms.on('postPlay', (id, streamPath, args) => {
    console.log('[NodeEvent on postPlay]', `id=${id} streamPath=${streamPath} args=${JSON.stringify(args)}`);
});

nms.on('donePlay', (id, streamPath, args) => {
    console.log('[NodeEvent on donePlay]', `id=${id} streamPath=${streamPath} args=${JSON.stringify(args)}`);
});

// CONNECT TO THE INTERNAL API

// Socket for connecting to the internal API
const io = require("socket.io-client");

const socket = io("ws://open-360-api-sock:4000", {
    reconnectionDelayMax: 10000,
    query: {
        name: "open360:ingest-api-server"
    }
});

socket.on("connect", function (){
    console.log("Connected to Internal API");
    socket.emit("log",{log:"Connected to Internal API", type:"info"});
});

socket.on("ingest-api", (data) => {
    if (data.type == Util.api.APIMessageType.question){
        switch (data.package.prompt){
            case "status":
                let pack = {
                    prompt: "status-reply",
                    status: "alive"
                }
                Util.api.sendMessage(socket, data.ack, "ingest-api", pack);
                break;
        }
    }
});

/**
 * @param {string} streamKey
 * @return {Promise<boolean>}
 */
let requestCheckStreamKeyExist = function (streamKey) {
    return new Promise((resolve, reject) => {
        let pack = {
            prompt: "checkKeyExists",
            data: {streamKey: streamKey},
            message: "Checking Stream Key"
        }
        Util.api.sendQuestion(socket, "web-api", "ingest-api", pack);
        socket.on("ingest-api", function (data) {
            if (data.package.prompt == "checkKeyExists-reply")
                resolve(data.package.data);
        });
    });
}

/**
 * @param {string} streamKey
 * @param {boolean} online
 * @return {Promise<boolean>}
 */
let sendChannelLivePOST = function (streamKey, online) {
    return new Promise((resolve) => {
        let pack = {
            prompt: "setOnline",
            data: {online: online, streamKey: streamKey},
            message: "Setting online status"
        }
        Util.api.sendMessage(socket, "web-api", "ingest-api", pack);
        resolve();
    });
}

// ------ END OF INTERNAL API RESPONSES

let getStreamKeyFromStreamPath = (path) => {
    let parts = path.split('/');
    return parts[parts.length - 1];
};

const spawn = require('child_process').spawn,
    cmd = config.trans.ffmpeg;

const generateStreamThumbnail = (streamKey) => {
    let args = [
        '-y',
        '-i', 'http://127.0.0.1:8000/live/'+streamKey+'/master.m3u8',
        '-ss', '00:00:01',
        '-vframes', '1',
        '-vf', 'scale=-2:300',
        config.http.mediaroot + "/live/" + streamKey + "/thumb.png",
    ];

    spawn(cmd, args, {
        detached: true,
        stdio: 'ignore'
    }).unref();
};