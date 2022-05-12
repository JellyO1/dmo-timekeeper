import { DiscordRequest, CommandOptionType } from './utils.js';
import { Monsters, Servers } from './enums.js';

const ServersChoices = Object.entries(Servers).map(([server, val]) => {
  return {
    name: server,
    value: val
  };
});

const MonstersChoices = Object.entries(Monsters).map(([monster, val]) => {
  return {
    name: monster,
    value: val
  }
});

export async function DeleteCommands(appId, guildId) {
  await DeleteGuildCommands(appId, guildId);
  await DeleteGlobalCommands(appId, guildId);
}

async function DeleteGuildCommands(appId, guildId) {
  const endpoint = `applications/${appId}/guilds/${guildId}/commands`;
  const res = await DiscordRequest(endpoint, { method: 'GET' });
  const data = await res.json();

  await data.forEach(async (c) => {
    // API endpoint to delete command
    const endpoint = `applications/${appId}/guilds/${guildId}/commands/${c['id']}`;

    try {
      await DiscordRequest(endpoint, { method: 'DELETE' });
    } catch (err) {
      console.error(err);
    }
  });
}

async function DeleteGlobalCommands(appId, guildId) {
  const endpoint = `applications/${appId}/commands`;
  const res = await DiscordRequest(endpoint, { method: 'GET' });
  const data = await res.json();

  await data.forEach(async (c) => {
    // API endpoint to delete command
    const endpoint = `applications/${appId}/commands/${c['id']}`;

    try {
      await DiscordRequest(endpoint, { method: 'DELETE' });
    } catch (err) {
      console.error(err);
    }
  });
}

export async function HasCommands(appId, guildId, commands) {
  if (appId === '') return;

  // API endpoint to get and post guild commands
  var endpoint = `applications/${appId}/commands`;

  if (process.env.ENVIROMENT == "DEBUG") {
    endpoint = `applications/${appId}/guilds/${guildId}/commands`;
  }

  try {
    const res = await DiscordRequest(endpoint, { method: 'GET' });
    const data = await res.json();

    if (data) {
      const usedCommands = commands.map((c) => c['name']);
      await data.forEach(async (c) => {
        if (!usedCommands.includes(c['name'])) {
          await DeleteGlobalCommand(appId, guildId, c['id']);
        }
      });

      commands.forEach((c) => HasGlobalCommand(appId, guildId, data, c));
    }
  } catch (err) {
    console.error(err);
  }
}

// Checks for a command
async function HasGlobalCommand(appId, guildId, commands, command) {
  try {
    const installedNames = commands.map((c) => c['name']);

    // This is just matching on the name, so it's not good for updates
    if (!installedNames.includes(command['name'])) {
      console.log(`Installing "${command['name']}"`);
      InstallGlobalCommand(appId, guildId, command);
    } else {
      console.log(`"${command['name']}" command already installed`);
    }
  } catch (err) {
    console.error(err);
  }
}

// Deletes a Guild command
async function DeleteGlobalCommand(appId, guildId, command) {
  // API endpoint to get and post guild commands
  var endpoint = `applications/${appId}/commands/${command}`;

  if (process.env.ENVIROMENT == "DEBUG") {
    endpoint = `applications/${appId}/guilds/${guildId}/commands/${command}`;
  }

  try {
    await DiscordRequest(endpoint, { method: 'DELETE' });
  } catch (err) {
    console.error(err);
  }
}

// Installs a command
export async function InstallGlobalCommand(appId, guildId, command) {
  // API endpoint to get and post guild commands
  var endpoint = `applications/${appId}/commands`;

  if (process.env.ENVIROMENT == "DEBUG") {
    endpoint = `applications/${appId}/guilds/${guildId}/commands`;
  }

  // install command
  try {
    await DiscordRequest(endpoint, { method: 'POST', body: command });
  } catch (err) {
    console.error(err);
  }
}

export async function DMUser(userId, message) {
  let channel_endpoint = `/users/@me/channels`;

  try {
    var channel = await DiscordRequest(channel_endpoint, { method: 'POST', body: { recepient_id: userId } });

    let message_endpoint = `/channels/${channel.id}/messages`;

    await DiscordRequest(message_endpoint, { method: 'POST', body: { content: message }});

  } catch (err) {
    console.error(err);
  }
}

// Myo tour command
export const TOUR_COMMAND = {
  name: 'tour',
  description: 'Checks the time until the next myo tour.',
  type: 1, // CHAT_INPUT
  options: [
    {
      name: 'server',
      type: CommandOptionType.Integer,
      description: 'The server that you want to get the tour time.',
      choices: ServersChoices,
      required: true
    }
  ]
};

export const SET_TOUR_COMMAND = {
  name: 'set_tour',
  description: 'Sets the time that the myo tour has/will occur in.',
  type: 1, // CHAT_INPUT
  options: [
    {
      name: 'server',
      type: CommandOptionType.Integer, // INTEGER
      description: 'The server that you want to set the tour time.',
      choices: ServersChoices,
      required: true
    },
    {
      name: 'time',
      type: CommandOptionType.String,// STRING
      description: 'The time the tour has/will occur. (hh:mm)',
    }
  ]
}

export const SET_ZONE_COMMAND = {
  name: 'set_zone',
  description: 'Sets your UTC offset on the server for automatic conversion when calling /tour command.',
  type: 1,
  options: [
    {
      name: 'zone',
      type: CommandOptionType.Integer, // INTEGER,
      description: 'The offset from UTC (between -11 and +14)',
      required: true
    }
  ]
}
// Time Zone
export const TIME_ZONE_COMMAND = {
  name: 'time_zone',
  description: 'Checks the time zone you are in.',
  type: 1, //CHAT INPUT
};

export const NOTIFY_COMMAND = {
  name: 'notify',
  description: 'Sets or unsets the notification for a certain (server, monster) combination.',
  type: 1, // CHAT_INPUT
  options: [
    {
      name: 'server',
      type: CommandOptionType.Integer,
      description: 'The server that you want to set the notification for.',
      choices: ServersChoices,
      required: true,
    },
    {
      name: 'monster',
      type: CommandOptionType.Integer,
      description: 'The monster that you want to set the notification for.',
      choices: MonstersChoices,
      required: true
    }
  ]
};