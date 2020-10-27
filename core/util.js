const fs = require("fs");

Util = {}

/**
 * @callback writeChunkCallback
 * @param {ErrnoException|null} err
 */

/**
 *
 * @param {string} videoChunk
 * @param {number} videoChunkCount
 * @param {Object} options
 * @param {string} options.path
 * @param {writeChunkCallback} callback
 */
Util.writeVideoChunk = function (videoChunk, videoChunkCount, options, callback){
    fs.writeFile(options.path + "_" + videoChunkCount + ".ts", videoChunk, callback);
}

/**
 * Cuts up a string into an array on new line chars
 * @param {string} string
 * @return {string[]}
 */
Util.diceUp = function (string){
    return string.split("\n");
}

/**
 * Returns the value after the ":" symbol of a string
 * @param {string} string
 * @return {string}
 */
Util.getValue = function (string){
    return string.substring(string.indexOf(":"))
}

/**
 * @typedef {Object} Conveyor
 * @property {number} Capacity
 * @property {*[]} Items
 * @property {number} Count
 */
class Conveyor {
    /**
     * Creates a Conveyor with the max capacity given
     * @param {number} capacity
     */
    constructor(capacity) {
        this.Capacity = capacity;
        this.Items = [];
        this.Count = 0;
    }

    /**
     * Adds an element to the conveyor
     * @param {*} element
     * @return {Conveyor}
     * @constructor
     */
    Add(element){
        this.items[this.count++] = element;
        if (this.count > this.capacity) this.items.shift();
        return this;
    }

    /**
     * Returns the first value on the conveyor
     * @return {*}
     * @constructor
     */
    Next(){
        return this.items[this.count];
    }

    /**
     * Removes items to ensure a new capacity of the conveyor.
     * @param {number} newCapacity
     * @return {*[]} - an array with the removed items
     * @constructor
     */
    EnsureCapacity(newCapacity){
        // Set the new capacity
        this.capacity = newCapacity;
        // Define the return array
        let removedItems = [];
        // Remove each item until the new capacity is achieved
        while (this.items.length > this.capacity){
            removedItems.push(this.items.shift());
        }
        // Return the removed items
        return removedItems;
    }
}

/**
 * @typedef PlaylistParser
 * @property {SimpleMediaPlaylist} Playlist - the current playlist that will be parsed and unparsed
 */

class PlaylistParser {
    /**
     * Creates a playlist parser
     * @param {SimpleMediaPlaylist} [playlist] - If none is given a new one will be created
     */
    constructor(playlist) {
        this.Playlist = playlist || new SimpleMediaPlaylist();
    }

    /**
     * Sets the current playlist the parser is using
     * @param {SimpleMediaPlaylist} playlist
     */
    SetPlaylist(playlist){
        this.Playlist = playlist;
    }

    /**
     * Gets the current playlist the parser is using
     * @returns {SimpleMediaPlaylist}
     */
    GetPlaylist(){
        return this.Playlist;
    }

    /**
     * @return {string} - A stringified mess
     */
    toString(){
        return this.Playlist.toString();
    }

    /**
     * Parses the string into a SimpleMediaPlaylist object
     * @param {string} stringifiedPlaylist
     * @return {SimpleMediaPlaylist|null}
     */
    fromString(stringifiedPlaylist){
        // Define the parsed playlist
        let out = new SimpleMediaPlaylist();
        // Check if the string doesn't start with #EXTM3U
        if (!stringifiedPlaylist.startsWith("#EXTM3U\n")) return null;
        // Trim that line
        let s = stringifiedPlaylist.substring(8);
        // Convert to array
        let lineArray = Util.diceUp(s);
        for (let i = 0; i < lineArray.length; i++) {
            // Define the line to read
            let line = lineArray[i];
            // Check if each line starts with a EXT M3U tag
            // Target Duration Parsing
            if (line.startsWith("#EXT-X-TARGETDURATION")){
                // Get the number from the line
                let n = Util.getValue(line);
                // Parse the number
                out.TargetDuration = parseFloat(n);
            }
            // Version Parsing
            if (line.startsWith("#EXT-X-VERSION")){
                let n = Util.getValue(line);
                out.Version = parseFloat(n);
            }
            // Media Sequence Parsing
            if (line.startsWith("#EXT-X-MEDIA-SEQUENCE")){
                let n = Util.getValue(line);
                out.MediaSequenceNumber = parseInt(n);
                out.NextFullSegmentIndex = parseInt(n);
            }
            // Segment Parsing
            if (line.startsWith("#EXTINF")){
                let n = Util.getValue(line);
                // Create a new segment
                let segment = new SimpleSegment();
                // Set the duration and the URI
                segment.Duration = parseFloat(n);
                segment.URI = lineArray[i++];
                // While the next line doesn't start with a "#" then add it to the ExtraLines of the segment
                while (!lineArray[i++].startsWith("#")){
                    segment.ExtraLines.push(lineArray[i]);
                }
            }
            // Preload Hint Parsing
            if (line.startsWith("#EXT-X-PRELOAD-HINT")){
                let v = Util.getValue(line);
                // Split "type=values"
                let params = v.split(",");
                // Define the preload hint
                let hintType = "";
                let hintURI = "";
                for (let j = 0; j > params.length; j++){
                    // Split the parameters
                    let parts = params[j].split("=");
                    let key = parts[0];
                    let value = parts[1];
                    switch (key){
                        case "TYPE":
                            hintType = value;
                            break;
                        case "URI":
                            hintURI = value;
                            break;
                    }
                }
                // Save those juicy preload hints
                out.PreloadHints[hintType] = hintURI
            }
        }
        // Return the completed playlist
        return out;
    }
}

/**
 * @typedef {Object} SimpleMediaPlaylist - Describes the information of a m3u8 playlist file
 * @property {number} TargetDuration - Target duration of the full playlist
 * @property {number} Version - Version of the format
 * @property {number} PartTargetDuration - Target duration of each segment
 * @property {number} MediaSequenceNumber - Number of the first segment of this playlist
 * @property {SimpleSegment[]} Segments - Array of full segments
 * @property {number} NextFullSegmentIndex - Index of the next full segment
 * @property {number} NextPartIndex - Index of the next segment
 * @property {number} MaxPartIndex - Max segments
 * @property {Map} PreloadHints - List of URI to preload
 */

class SimpleMediaPlaylist {
    /**
     * Creates a Playlist object
     * @constructor
     */
    constructor() {
        this.TargetDuration = 0;
        this.Version = 0;
        this.PartTargetDuration = 0;
        this.MediaSequenceNumber = 0;
        this.Segments = [];
        this.NextFullSegmentIndex = 0;
        this.NextPartIndex = 0;
        this.MaxPartIndex = 0;
        this.PreloadHints = new Map();
    }

    /**
     * Adds a segment to the playlist
     * @param {SimpleSegment} segment
     */
    AddSimpleSegment(segment) {
        this.Segments.push(segment);
        // Check if the new segment has a bigger duration
        if (this.PartTargetDuration < segment.Duration)
            // Set the longer duration to the target duration of the playlist
            this.PartTargetDuration = segment.Duration;
        // Increment the max parts index
        this.MaxPartIndex++;
    }


    /**w
     * Builds a m3u8 formatted playlist and returns it
     * @return {string} - A stringified mess
     */
    toString(){
        let s = '';
        s += "#EXTM3U\n";
        s += "#EXT-X-TARGETDURATION:" + this.TargetDuration + "\n";
        s += "#EXT-X-VERSION:" + this.Version + "\n"
        s += "#EXT-X-MEDIA-SEQUENCE" + this.MediaSequenceNumber + "\n";
        // Add each segment to the string but start on the Media Sequence Number to skip the ones the user doesn't need
        for (let i = this.MediaSequenceNumber; i > this.Segments.length; i++){
            let segment = this.Segments[i];
            s += segment.toString() + "\n";
        }
        // If there is no Preload Hints then return early
        if (!this.PreloadHints.size > 0) return s.toString();
        // Add each preload hint
        this.PreloadHints.forEach(((type, value) => {
            s += type + "=" + value + ",";
        }));
        // Delete the last ","
        s = s.slice(0,-1);
        // Return the stringified mess
        return s.toString();
    }
}

/**
 * @typedef {Object} SimpleSegment
 * @property {number} Duration - Target duration of this segment
 * @property {string} URI - The URI of the file of this segment
 * @property {string[]} ExtraLines - Any extra lines that should be bundled with this segment
 * @property {boolean} Independent - Determines if this segment has all the information for decode and encode
 */

class SimpleSegment {
    /**
     * Creates a segment object
     * @constructor
     */
    constructor() {
        this.Duration = 0;
        this.URI = "";
        this.ExtraLines = [];
        this.Independent = false;
    }

    toString = function (){
        let s = '';
        s += "#EXTINF:" + this.Duration + "\n";
        s += this.URI + "\n";
        for (let i = 0; i < this.ExtraLines.length; i++) {
            s += this.ExtraLines[i] + "\n";
        }
        return s.toString();
    }
}

/**
 * @typedef {Object} FullSegment
 * @property {SimpleSegment} Self - A reference to the first or only segment
 * @property {SimpleSegment[]} Parts - An array of the segments that make this segment whole
 */

class FullSegment {
    /**
     * Creates a full segment object
     * @constructor
     */
    constructor() {
        this.Self = new SimpleSegment();
        this.Parts = [];
    }
}

module.exports = Util;