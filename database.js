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
      user_id VARCHAR NOT NULL,
      monster_time_id NUMBER NOT NULL,
      notify BOOLEAN NOT NULL,
      PRIMARY KEY (user_id, monster_time_id)
      FOREIGN KEY (monster_time_id) references monster_times(id)
    );
  `);
}

export async function GetZone(userId) {
  const result = await db.get('SELECT * FROM user_zones WHERE user_id = ?', userId);
  
  return result.zone ?? 0;
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

export async function SetMonsterTime(id, server, last_time) {
  const result = await db.run(`
    INSERT OR REPLACE INTO monster_times(id, server, last_time) VALUES (?, ?, ?)
  `, id, server, last_time);
}

export async function GetNotification() {
  const result = await db.run(`SELECT * FROM monster_times_notifications WHERE notify is TRUE`);
  return result;
}

export async function SetNotification(userId, monster_time_id) {
  let result = await db.get('SELECT * FROM monster_times_notifications WHERE user_id = ? AND monster_time_id = ?', userId, monster_time_id);

  let notify = true;
  if(result != null) {
    notify = !result.notify;
  }

  result = await db.run(`
    INSERT OR REPLACE INTO monster_times_notifications(user_id, monster_time_id, notify) VALUES (?, ?, ?)
  `, userId, monster_time_id, notify);

  return notify;
}