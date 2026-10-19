import {DatabaseSync} from 'node:sqlite';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {profileUpgrades} from '../packages/storage-sqlite/migrations.ts';
function upgrade(db:DatabaseSync,from:number){
  for(const version of [...profileUpgrades].sort((a,b)=>a.toVersion-b.toVersion)){
    if(version.toVersion<=from)continue;
    db.exec('BEGIN');
    try{for(const statement of version.statements)db.prepare(statement).run();db.exec(`PRAGMA user_version=${version.toVersion}`);db.exec('COMMIT');}
    catch(error){db.exec('ROLLBACK');throw error;}
  }
}
test('STORE-005/006 native schema regression: each upgrade array entry executes as one statement',()=>{
  const db=new DatabaseSync(':memory:');try{
    upgrade(db,0);
    assert.equal(db.prepare('PRAGMA user_version').get()!.user_version,5);
    for(const table of ['profiles','profile_auth','profile_settings','records','profile_backgrounds'])assert.ok(db.prepare('SELECT name FROM sqlite_master WHERE type=? AND name=?').get('table',table));
  }finally{db.close();}
});
test('STORE-007: SQL migration preserves a populated v1 database and rolls back failed transaction',()=>{
  const db=new DatabaseSync(':memory:');try{
    for(const statement of profileUpgrades.find(v=>v.toVersion===1)!.statements)db.prepare(statement).run();
    db.prepare('INSERT INTO profiles VALUES (?,?,?,?,?)').run('fixture','Existing','Asia/Kolkata','2026-09-28','2026-09-28');
    db.prepare('INSERT INTO profile_settings VALUES (?,?)').run('fixture','synthetic-ciphertext');
    upgrade(db,1);
    assert.equal(db.prepare('SELECT status FROM profiles WHERE id=?').get('fixture')!.status,'active');
    assert.equal(db.prepare('SELECT encrypted_value FROM profile_settings WHERE profile_id=?').get('fixture')!.encrypted_value,'synthetic-ciphertext');
    db.exec('BEGIN');
    db.prepare('INSERT INTO records VALUES (?,?,?,?,?)').run('fixture','new','task',1,'encrypted');
    assert.throws(()=>db.prepare('INSERT INTO records VALUES (?,?,?,?,?)').run('fixture','new','task',1,'encrypted'));
    db.exec('ROLLBACK');assert.equal(db.prepare('SELECT count(*) AS count FROM records').get()!.count,0);
  }finally{db.close();}
});
