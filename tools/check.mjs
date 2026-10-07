import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {predict} from '../predict.js';
const model=JSON.parse(await fs.readFile('model.json','utf8'));
const fixtures=JSON.parse(await fs.readFile('tools/fixtures.json','utf8'));
let max=0;
for(const f of fixtures){const error=Math.abs(predict(model,f.input)-f.probability);max=Math.max(max,error);assert.ok(error<1e-6,`Parity mismatch: ${error}`);}
for(const Age of [null,0,80])for(const Sex of ['male','female']){const p=predict(model,{Age,Sex,Pclass:3,Fare:0,SibSp:0,Parch:0,Embarked:''});assert.ok(Number.isFinite(p)&&p>=0&&p<=1);}
console.log(`PASS: ${fixtures.length} sklearn/JavaScript parity cases; max error ${max}; six boundary cases.`);
