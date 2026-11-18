'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gb-'));process.env.GULF_BANK_DATA_FILE=path.join(dir,'bank.json');const db=require('../bank-store');
test('new users start with 1000 virtual credits',()=>assert.equal(db.balance('u1').balance,1000));
test('daily reward can only be claimed once per day',()=>{assert.equal(db.daily('u1').ok,true);assert.equal(db.daily('u1').ok,false);});
test('dice uses a 1 to 10 range and bounded stake',()=>{const r=db.dice('u2',100);assert.equal(r.ok,true);assert.ok(r.player>=1&&r.player<=10&&r.bank>=1&&r.bank<=10);assert.equal(db.dice('u2',999999).ok,false);});
test('transfers and savings preserve balances',()=>{db.balance('u3');assert.equal(db.transfer('u2','u3',50).ok,true);assert.equal(db.savings('u2','in',20).ok,true);assert.equal(db.balance('u3').balance,1050);});
test('virtual market supports buy and sell',()=>{assert.equal(db.trade('u2','buy','GOLD',1).ok,true);assert.equal(db.trade('u2','sell','GOLD',1).ok,true);});
