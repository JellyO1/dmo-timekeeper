import "dotenv/config";
import express from "express";
import moment from "moment";
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  MessageComponentTypes,
  ButtonStyleTypes,
} from "discord-interactions";
import { VerifyDiscordRequest, DiscordRequest, formatZone } from "./utils.js";
import { TOUR_COMMAND, SET_TOUR_COMMAND, SET_ZONE_COMMAND, TIME_ZONE_COMMAND, HasCommands, DeleteCommands, NOTIFY_COMMAND, SendChannelMessage } from "./commands.js";
import { SetupDatabase, GetZone, SetZone, GetMonsterTimes, SetMonsterTime, SetNotification, GetNotifications } from './database.js';
import { Monsters, Servers } from './enums.js';

const monsterTimers = {};

// Setup database
SetupDatabase().then(async function () {
  const data = await GetMonsterTimes();

  data.forEach((row) => {
    setMonsterTime(row.server, row.id, moment(row.last_time));
  });

  for (let [serverKey, serverMonsters] of Object.entries(monsterTimers)) {
    for (let [monsterKey, monsterData] of Object.entries(serverMonsters)) {
      setNotificationTimers(serverKey, monsterKey);
    }
  }
});

// Create an express app
const app = express();
// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

app.get("/", async function (req, res) {
  return res.send("OK");
});

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post("/interactions", async function (req, res) {
  // Interaction type and data
  const { type, id, data, member, channel_id } = req.body;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = data;

    switch (name) {
      case "tour": {
        await tour(data, member, res);
        break;
      }
      case "set_tour": {
        await setTour(data, member, res);
        break;
      }
      case "set_zone": {
        await setZone(data, member, res);
        break;
      }
      case "time_zone": {
        let content = "";

        const userId = member.user.id;
        const zoneOffset = data.options[0].value;

        await SetZone(userId, zoneOffset);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "Your timezone is  " + zoneOffset + "."
          }
        });
        break;
      }
      case "notify": {
        await notify(data, channel_id, res);
        break;
      }
    }
  }
});

app.listen(3000, () => {
  console.log("Listening on port 3000");

  // Check if guild commands from commands.json are installed (if not, install them)
  HasCommands(process.env.APP_ID, process.env.GUILD_ID, [TOUR_COMMAND, SET_TOUR_COMMAND, SET_ZONE_COMMAND, NOTIFY_COMMAND]);
});

async function tour(data, member, res) {
  const server = data.options.find((v) => v.name === 'server').value;
  const myoTime = GetMonsterTimes(server, Monsters.Myotismon);
  if (myoTime == null) {
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content:
          "The last/next known time is not set, please set it with /set_tour.",
        ephemeral: true,
      },
    });
  }

  const zone = parseInt(await GetZone(member.user.id));
  let content = "The next Myotismon tour will start at ";
  const last = moment(myoTime).utcOffset(zone);
  const next = nextTimeOnHourInterval(last, zone, 2);

  content += next.format("HH:mm") + " UTC" + formatZone(zone) + ".";

  // Send a message into the channel where command was triggered from
  return res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: content,
      ephemeral: true,
    },
  });
}

async function setTour(data, member, res) {
  let content = "";
  let zoneOffset = parseInt(await GetZone(member.user.id));

  const server = data.options.find((v) => v.name === 'server').value;

  if (data.options.find((v) => v.name === 'time') === undefined) {
    setMonsterTime(server, Monsters.Myotismon, moment.utc());
    content = "Set Myotismon tour time to current time."
  } else {

    const time = data.options.find((v) => v.name === 'time').value;
    const parsedTime = moment.parseZone(time + " " + formatZone(zoneOffset), "HH:mm ZZ", true);

    if (!parsedTime.isValid()) {
      content = "Invalid time.";
    } else {
      setMonsterTime(server, Monsters.Myotismon, moment.utc(parsedTime));
      console.log(getMonsterTime(server, Monsters.Myotismon).format());
      content = "Set Myotismon tour time to " + parsedTime.format("HH:mm") + ".";
    }
  }

  await SetMonsterTime(Monsters.Myotismon, server, getMonsterTime(server, Monsters.Myotismon).format());
  setNotificationTimers(server, Monsters.Myotismon);

  return res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: content
    }
  });
}

async function setZone(data, member, res) {
  let content = "";

  let userId = member.user.id;
  let zoneOffset = data.options[0].value;

  if (zoneOffset < -12)
    zoneOffset = -12;
  else if (zoneOffset > 14)
    zoneOffset = 14;

  await SetZone(userId, zoneOffset);

  content = "Set your timezone to UTC";

  if (zoneOffset > 0)
    content += "+" + zoneOffset;
  else
    content += "-" + zoneOffset;

  content += ".";

  return res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: content
    }
  });
}

async function notify(data, channel_id, res) {
  const server = data.options.find((v) => v.name === 'server').value;
  const monster = data.options.find((v) => v.name === 'monster').value;
  let notifyState = (await SetNotification(channel_id, server, monster)) ? "enabled" : "disabled";
  let content = `Set notification in the current channel for the server ${Object.keys(Servers)[server]}, ${Object.keys(Monsters)[monster]} to ${notifyState}.`;


  return res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: content
    }
  });
}

async function executeNotifications(server, monster) {
  console.log('Notifying for ' + Object.keys(Servers)[server] + ', monster ' + Object.keys(Monsters)[monster]);

  let res = await GetNotifications(server, monster);

  for(let key in res) {
    SendChannelMessage(res[key].channel_id, Object.keys(Monsters)[monster] + " starts in 10 minutes.");
  }

  return;
}

function nextTimeOnHourInterval(last_time, offset = null, hourInterval) {
  const now = moment.utc();
  let last_moment;

  if (offset)
    last_moment = moment(last_time).utcOffset(offset);
  else
    last_moment = moment(last_time).utc();

  if (last_moment < now) {
    const diffHours = moment.duration(now.diff(last_moment)).asHours();
    const times = Math.ceil(diffHours / 2);

    last_moment.add(hourInterval * times, 'h');
  }

  return last_moment;
}

function setNotificationTimers(server, monster) {
  const monsterData = monsterTimers[server][monster];

  const next = nextTimeOnHourInterval(monsterData.time, null, 2).subtract(10, 'm');
  let timeoutInterval = Math.max(0, next.diff(moment.utc()));

  console.log(monster + " timeout:" + timeoutInterval);

  if('timeout' in monsterData)
    clearTimeout(monsterData.timeout);

  if('interval' in monsterData)
    clearInterval(monsterData.interval);

  let monsterTimeout = setTimeout(() => {
    executeNotifications(server, monster);

    // Notify every 1h
    let notificationInterval = 60 * 60 * 1000;
    if (monster === Monsters.Myotismon) {
      // Notify every 1h:50m
      notificationInterval = 110 * 60 * 1000;
    }

    let monsterInterval = setInterval(() => {
      executeNotifications(server, monster);
    }, notificationInterval);

    monsterTimers[server][monster].interval = monsterInterval;
  }, timeoutInterval);

  monsterTimers[server][monster].timeout = monsterTimeout;
}

function setMonsterTime(server, monster, time) {
  if(!(server in monsterTimers))
    monsterTimers[server] = {}

  if (!(monster in monsterTimers[server]))
    monsterTimers[server][monster] = {};

  monsterTimers[server][monster].time = time;
}

function getMonsterTime(server, monster) {
  return monsterTimers[server][monster].time;
}