const NodeMediaServer = require('node-media-server');
const fs = require("fs");

// Load the config
const config = require('./config/default.json');
const {Util} = require("./core/");

let nms = new NodeMediaServer(config);

fs.mkdir("./video_database/live", {recursive: true}, (err) => {
    console.error(err);
});
fs.mkdir("./video_database/video", {recursive: true}, (err) => {
    console.error(err);
});

nms.run();

/*
TODO LIST
    - Unique Stream keys
    - Verify Stream keys with the web server
    - Shared Stream key database
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
    generateStreamThumbnail(streamKey);

    let session = nms.getSession(id);

    // INFO
    // this is where the stream key verification should be
    // also the path rerouting for the database
    console.log(session);
    console.log(session.publishStreamPath);
    // let session = nms.getSession(id);
    // session.reject();
});

nms.on('postPublish', (id, streamPath, args) => {
    let streamKey = getStreamKeyFromStreamPath(streamPath);
    console.log('[NodeEvent on postPublish]', `id=${id} streamPath=${streamPath} args=${JSON.stringify(args)}`);
});

nms.on('donePublish', (id, streamPath, args) => {
    let streamKey = getStreamKeyFromStreamPath(streamPath);
    console.log('[NodeEvent on donePublish]', `id=${id} streamPath=${streamPath} args=${JSON.stringify(args)}`);
    Util.makeVOD(streamKey)
        .then(() => {
            console.log("[NodeEvent on donePublish]", `id=${id}`, "VOD saved");
        });
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