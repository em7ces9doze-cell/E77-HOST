'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {commands}=require('../commands');
test('legacy individual commands are no longer registered',()=>{
 const names=new Set(commands.map(x=>x.name));
 for(const old of ['help','balance','bank','deposit','withdraw','transactions','daily','work','pay','leaderboard','shop','buy','inventory','profile','hosting-room','hosting-embed','hosting-buy','coin-info','shopadd','shopremove','coinsadd','coinsremove','coinsset'])assert.equal(names.has(old),false,old+' should be grouped');
});
