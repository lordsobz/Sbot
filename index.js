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
  } else {
    message.channel.send("Sai lệnh bạn êy! Biết gõ phím không đếy??");
  }
});
 
// Check user in voice chat or Bot has perrmisson
async function execute(message, serverQueue) {
    const args = message.content.split(" ");

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
        return message.channel.send(
        "Chưa vào phòng voicechat mà xài lệnh? T phải đi đâu bây giờ?? Vào room voicechat đi!"
        );
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send(
        "Bố m không có quyền nói trong này! Cấp quyền cho mình cái bạn êy!"
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
	serverQueue.voiceChannel.leave();
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
	if (!message.member.voice.channel) return message.channel.send("Chưa vào phòng voicechat mà xài lệnh? T phải đi đâu bây giờ?? Vào room voicechat đi!");
	if (!serverQueue) return message.channel.send('Làm đel gì có nhạc mà tạm dừng! Ngáo à?');
	if (serverQueue.connection.dispatcher.paused) return message.channel.send('Dừng rồi!');
	serverQueue.connection.dispatcher.pause();
}

function resume(message, serverQueue){
    if (!message.member.voice.channel) return message.channel.send("Chưa vào phòng voicechat mà xài lệnh? T phải đi đâu bây giờ?? Vào room voicechat đi!");
	if (!serverQueue) return message.channel.send('Làm gì có nhạc mà tiếp tục');
	if (!serverQueue.connection.dispatcher.paused) return message.channel.send('Không thấy nhạc đang phát à? Lại chơi đồ rồi!');
	serverQueue.connection.dispatcher.resume();
}

function skip(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
        "Vào room voice chat đi rôi dùng lệnh nhá bạn"
        );
    if (!serverQueue)
        return message.channel.send("Làm gì có bài nào tiếp theo đâu mà skip");
    serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
        "Vào room voice chat đi rôi dùng lệnh nhá bạn"
        );
        
    if (!serverQueue)
        return message.channel.send('Làm đel gì có nhạc mà tạm dừng! Ngáo à?');
        
    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
}

function nowplaying(messnage, serverQueue) {
	if (!serverQueue) return message.channel.send("Chả có gì đang phát cả");
	return message.channel.send(`Now playing: ${serverQueue.songs[0].title}`);
}

client.login(token);
