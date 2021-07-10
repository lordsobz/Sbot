// Import
const Discord = require("discord.js");
const { prefix, token } = require("./config.json");
const ytdl = require("ytdl-core");

const client = new Discord.Client();

const queue = new Map();

//State
client.once("ready", () => {
  console.log("Bot is now ready!");
});

client.once("reconnecting", () => {
  console.log("Bot is reconnecting!");
});

client.once("disconnect", () => {
  console.log("Bot disconnected!");
});

// Chech command syntax input
client.on("message", async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const serverQueue = queue.get(message.guild.id);

  if (message.content.startsWith(`${prefix}play`)) {
    execute(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}skip`)) {
    skip(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}stop`)) {
    stop(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}pause`)) {
    pause(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}resume`)) {
    resume(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}nowplaying`)) {
    nowplaying(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}leave`)) {
    leave(message, serverQueue);
    return;
  } else {
    message.channel.send("Command input error! Please re-enter the right syntax!");
  }
});
 
// Check user in voice chat or Bot has perrmisson
async function execute(message, serverQueue) {
    const args = message.content.split(" ");

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
        return message.channel.send(
        "You need to be in a voice channel to play music!"
        );
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send(
        "I need the permissions to join and speak in your voice channel!"
        );
    }

    // Getting song info 
    const songInfo = await ytdl.getInfo(args[1]);
    const song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
    };

    // Save to queue
    // Check if queue is playing => add song and not re define it again
    if (!serverQueue) {
        // Create contract for queue (IDK what this is though :>)
        const queueContruct = {
        textChannel: message.channel,
        voiceChannel: voiceChannel,
        connection: null,
        songs: [],
        volume: 5,
        playing: true
        };

        // SEtting queue using contract
        queue.set(message.guild.id, queueContruct);

        // Push song into array
        queueContruct.songs.push(song);

        try {
            // Connect to voicechat and save connection to our object
            var connection = await voiceChannel.join();
            queueContruct.connection = connection;
            // Calling the play function
            play(message.guild, queueContruct.songs[0]);
            } catch (err) {
                // Print error if bot fail to join voicechat
                console.log(err);
                queue.delete(message.guild.id);
                return message.channel.send(err);
            }
    } else {
        serverQueue.songs.push(song);
        return message.channel.send(`${song.title} has been added to the queue!`);
    }
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        queue.delete(guild.id);
        return;
    }
    const dispatcher = serverQueue.connection
        .play(ytdl(song.url))
        .on("finish", () => {
        serverQueue.songs.shift();
        play(guild, serverQueue.songs[0]);
        })
        .on("error", error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Start playing: **${song.title}**`);
}

function pause(message, serverQueue) {    
	if (!message.member.voice.channel) return message.channel.send('You have to be in a voice channel to pause the music!');
	if (!serverQueue) return message.channel.send('There is no song that I could pause!');
	if (serverQueue.connection.dispatcher.paused) return message.channel.send('Song already paused!');
	serverQueue.connection.dispatcher.pause();
}

function resume(message, serverQueue){
    if (!message.member.voice.channel) return message.channel.send('You have to be in a voice channel to resume the music!');
	if (!serverQueue) return message.channel.send('There is no song that I could resume!');
	if (!serverQueue.connection.dispatcher.paused) return message.channel.send('Song already resumed!');
	serverQueue.connection.dispatcher.resume();
}

function skip(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
        "You have to be in a voice channel to stop the music!"
        );
    if (!serverQueue)
        return message.channel.send("There is no song to skip!");
    serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
        "You have to be in a voice channel to stop the music!"
        );
        
    if (!serverQueue)
        return message.channel.send("There is no song to stop!");
        
    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
}

function nowplaying(messnage, serverQueue) {
	if (!serverQueue) return message.channel.send('There is nothing playing.');
	return message.channel.send(`Now playing: ${serverQueue.songs[0].title}`);
}


client.login(token);
