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
import { VerifyDiscordRequest, DiscordRequest } from "./utils.js";
import { TOUR_COMMAND, SET_TOUR_COMMAND, SET_ZONE_COMMAND, TIME_ZONE_COMMAND, HasCommands, DeleteGuildCommands } from "./commands.js";
import { SetupDatabase, GetZone, SetZone, GetMonsterTimes, SetMonsterTime } from './database.js';
import { Monsters, Servers } from './enums.js';

const monsterTimers = {};

// Setup database
SetupDatabase().then(async function() {
  const data = await GetMonsterTimes();
  
  data.forEach((row) => {
    monsterTimers[row.server] = {}
    monsterTimers[row.server][row.id] = moment(row.last_time);
  });
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
  const { type, id, data, member } = req.body;

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
        tour(data, member, res);
        break;
      }
      case "set_tour": {
        setTour(data, member, res);
        break;
      }
      case "set_zone": {
        setZone(data, member, res);
        break;
      }
      case "time_zone": {
        var content = "";
        
        var userId = member.user.id;
        var zoneOffset = data.options[0].value;
        
        await SetZone(userId, zoneOffset);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "Your timezone is  " + zoneOffset + "."
          }
        });
        break;
      }
    }
  }
});

app.listen(3000, () => {
  console.log("Listening on port 3000");

  // Check if guild commands from commands.json are installed (if not, install them)
  HasCommands(process.env.APP_ID, process.env.GUILD_ID, [TOUR_COMMAND, SET_TOUR_COMMAND, SET_ZONE_COMMAND]);
});

async function tour(data, member, res) {
  const server = data.options.find((v) => v.name === 'server').value;

  if (!Monsters.Myotismon in monsterTimers[server]) {
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content:
          "The last/next known time is not set, please set it with /set_tour.",
          ephemeral: true,
      },
    });
  }

  var zone = parseInt(await GetZone(member.user.id));
  var content = "The next Myotismon tour will start at ";
  var now = moment.utc();
  var next = moment(monsterTimers[server][Monsters.Myotismon]).utcOffset(zone);

  if (next < now) {
      var diffHours = moment.duration(now.diff(next)).asHours();
      var times = Math.ceil(diffHours / 2);

      next.add(2 * times, 'h');
  }

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
  var content = "";
  var zoneOffset = parseInt(await GetZone(member.user.id));

  const server = data.options.find((v) => v.name === 'server').value;

  if(data.options.find((v) => v.name === 'time') === undefined) {
    monsterTimers[server][Monsters.Myotismon] = moment.utc();
    content = "Set Myotismon tour time to current time."
  } else {
    
    const time = data.options.find((v) => v.name === 'time').value;
    const parsedTime = moment.parseZone(time + " " + formatZone(zoneOffset), "HH:mm ZZ", true);

    if(!parsedTime.isValid()) {
      content = "Invalid time.";
    } else {
      monsterTimers[server][Monsters.Myotismon] = moment.utc(parsedTime);
      content = "Set Myotismon tour time to " + parsedTime.format("HH:mm") + ".";
    }
  }
  
  await SetMonsterTime(Monsters.Myotismon, server, monsterTimers[server][Monsters.Myotismon].format());

  return res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: content
    }
  });
}

async function setZone(data, member, res) {
  var content = "";
        
  var userId = member.user.id;
  var zoneOffset = data.options[0].value;

  if(zoneOffset < -11)
    zoneOffset = -11;
  else if (zoneOffset > 14)
    zoneOffset = 14;

  await SetZone(userId, zoneOffset);
  
  var content = "Set your timezone to UTC";
  
  if(zoneOffset > 0)
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

function formatZone(zone) {  
  var result = "00".split("");
  var zoneString = String(zone);
  for(var j = 1; j >= 0; j--) {
    if(j < zoneString.length)
      continue;
    
    result[j] = zoneString[j - zoneString.length];
  }
  
  result = result.join("");
  
  if(zone < 0)
    result = "-" + result;
  else
    result = "+" + result;
  
  return result + ":00";
}