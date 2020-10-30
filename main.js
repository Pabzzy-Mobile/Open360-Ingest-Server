// General Utility modules
const path = require('path');
const fs = require('fs');
// For the HTTP server
const express = require("express");
const app = express();
const http = require('http').createServer(app);
// Child process manager
const execa = require('execa');

// Tell the server what port it should use. 4001 is for testing purposes
const PORT = parseInt(process.env.PORT) || 4001;

// Require our core modules
const { Util, CommandParser } = require("./core");

// Maybe use the public directory for files?
// app.use('/', express.static(path.join(__dirname, 'video_database')));

// TODO: THIS DOESN'T ACTUALLY WORK LIKE I WANT IT TO
//  X Make a parser for .m3u8 files
//  - Connect to video stream segmenter made by Apple or FFmpeg
//  - Child Processes?????
//  - ???
//  - Profit

// RESPONSES AND REQUESTS

// Respond to GET requests for video
app.get('/live/:id', function (req, res){
    // Import the video name (safe tho)
    let videoName = req.params.id.replace(/([^0-9])+/, '');
    // If the video requested wasn't just numbers then reply with not found
    if (videoName !== req.params.id) {
        res.send("Video with id: " + req.params.id + " was not found");
        return;
    }

    // Create the read stream
    // This should be a m3u8 file later
    let file = fs.createReadStream(path.join(__dirname, 'video_database') + "/" + videoName + "-VOD.mp4");

    // Set the content to mp4
    // Change this to application/vnd.apple.mpegurl or do some sort of procedural switch or something
    res.set('content-type', 'video/mp4');

    // Send the data in chunks
    file.on('data', function (chunk){
        res.write(chunk);
    });

    // In the event of an error with the video read just send a 404
    file.on("error", function (err){
        res.status(404).json({ message: "Stream was not found" });
    });

    // On end end
    file.on("end", function (){
        res.end();
    });
});

// Home page request
app.post('/upload/:id', function (req, res){
    // Import the video name (safe tho)
    let videoName = req.params.id.replace(/([^0-9])+/, '');
    // Create the output file (the final VOD)
    let file = fs.createWriteStream(path.join(__dirname, 'video_database') + "/" + videoName + "-VOD.mp4");
    // Define the video chunks it should save as
    let videoChunkCount = 0;
    let videoChunk = "";
    // Define the options to write chunk
    let chunkWriteOption = {
        path: path.join(__dirname, 'video_database') + "/" + videoName
    }
    // Receive the data chunks
    req.on('data', chunk => {
        // Add the chunk to the video chunk
        videoChunk += chunk.toString();
        // If the video chunk is over 1.2M of length, whatever 1.2M is
        // (I just picked a random number, it seems to be around 3.2MB)
        if (videoChunk.length > 1200000){
            // Add 1 to the chunk count
            videoChunkCount++;
            // Write the chunk to disk
            // TODO: Pass the chunk to the segmenter from apple
            Util.writeVideoChunk(videoChunk, videoChunkCount, chunkWriteOption, function (err){
                if (err) console.error(err);
            });
            // * Debug
            console.log("-> Video Chunk received: " + videoChunk.length);
            // Reset the video chunk
            videoChunk = "";
        }
        // Write the video chunk into the output stream
        file.write(chunk);
        // Send code saying everything is ok
        res.status(200);
    });
    req.on('end', () => {
        // Log that there was a stream and it finished
        console.log("Data stream finished:" + PORT);
        // Close the write of the output stream (making a VOD)
        file.end();
        // Write the last video chunk
        Util.writeVideoChunk(videoChunk, videoChunkCount, chunkWriteOption,function (err){
            // Check if there was an error with the last packet and respond accordingly
            if (err) {
                console.error(err);
                res.status(500).json({ message: "Stream was not saved as a VOD"});
            }
            // Write a log with the headers of the stream
            fs.writeFileSync(path.join(__dirname, 'video_database') + "/" + videoName + "-logs.txt", JSON.stringify(req.headers));
            res.status(201).json({message: "Stream completed successfully"});
        });
    });
});

app.listen(PORT, function (){
    // Check if video_database exists or make one
    let databaseExists = fs.existsSync(path.join(__dirname, 'video_database'));

    if (!databaseExists) { fs.mkdirSync(path.join(__dirname, 'video_database'))};

    console.info("Listening on: " + PORT);
});