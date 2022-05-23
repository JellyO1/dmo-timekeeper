import sqlite3 from 'sqlite3';
import { open } from "sqlite";

var db;

export async function SetupDatabase() {
  db = await open({
    filename: 'data.db',
    driver: sqlite3.Database
  });;
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_zones (
      user_id VARCHAR NOT NULL PRIMARY KEY,
      zone VARCHAR NOT NULL
    );
  `);
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS monster_times (
      id NUMBER NOT NULL,
      server NUMBER NOT NULL,
      last_time VARCHAR NOT NULL,
      PRIMARY KEY (id, server)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS monster_times_notifications (
      channel_id VARCHAR NOT NULL,
      server NUMBER NOT NULL,
      monster NUMBER NOT NULL,
      notify BOOLEAN NOT NULL,
      PRIMARY KEY (channel_id, server, monster)
      FOREIGN KEY (monster, server) references monster_times(id, server)
    );
  `);
}

export async function GetZone(userId) {
  const result = await db.get('SELECT * FROM user_zones WHERE user_id = ?', userId);

  if(result == null)
    return 0;

  return result.zone;
}

export async function GetMonsterTimes(server) {
  const result = await db.all('SELECT * FROM monster_times');
  
  return result;
}

export async function SetZone(userId, zone) {
  const result = await db.run(`
    INSERT OR REPLACE INTO user_zones(user_id, zone) VALUES (? , ?)
  `, userId, zone);
}

export async function SetMonsterTime(id, server, lastTime) {
  const result = await db.run(`
    INSERT OR REPLACE INTO monster_times(id, server, last_time) VALUES (?, ?, ?)
  `, id, server, lastTime);
}

export async function GetNotifications() {
  const result = await db.all(`SELECT * FROM monster_times_notifications WHERE notify is TRUE`);
  return result;
}

export async function GetNotification(server, monster) {
  const result = await db.get('SELECT * FROM monster_tiems_notifications WHERE notify is TRUE AND server = ? AND monster = ?', server, monster);
  return result;
}

export async function SetNotification(channelId, server, monster) {
  let result = await db.get('SELECT * FROM monster_times_notifications WHERE channel_id = ? AND server = ? AND monster = ?', channelId, server, monster);

  let notify = true;
  if(result != null) {
    notify = !result.notify;
  }

  result = await db.run(`
    INSERT OR REPLACE INTO monster_times_notifications(channel_id, server, monster, notify) VALUES (?, ?, ?, ?)
  `, channelId, server, monster, notify);

  return notify;
}