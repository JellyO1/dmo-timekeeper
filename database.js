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
      id NUMBER NOT NULL PRIMARY KEY,
      server NUMBER NOT NULL,
      last_time VARCHAR NOT NULL
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