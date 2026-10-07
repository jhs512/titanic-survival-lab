import { predict } from './predict.js';
const form = document.querySelector('#form');
try {
 const [model, report, people] = await Promise.all(['model.json','report.json','data/records.json'].map(async p => {const r=await fetch(p);if(!r.ok)throw new Error(p);return r.json();}));
 const percent = n => (100*n).toFixed(1)+'%';
 document.querySelector('#metrics').innerHTML = `<div class="metric"><span>선택 모델</span><strong>${report.selected}</strong></div><div class="metric"><span>별도 검증 정확도 (${report.holdout.n}명)</span><strong>${percent(report.holdout.accuracy)}</strong></div><div class="metric"><span>별도 검증 ROC AUC</span><strong>${report.holdout.auc.toFixed(3)}</strong></div>`;
 document.querySelector('#comparison').innerHTML = [...report.rows].sort((a,b)=>a.cv_log_loss-b.cv_log_loss).map(r=>`<tr class="${r.model===report.selected?'selected':''}"><td>${r.model}${r.model===report.selected?' · 선택':''}</td><td>${r.cv_auc.toFixed(3)}</td><td>${percent(r.cv_accuracy)}</td><td>${r.cv_log_loss.toFixed(3)}</td></tr>`).join('');
 function run() {
  const p = Object.fromEntries(new FormData(form));
  const probability = predict(model,p);
  document.querySelector('#prob').textContent=percent(probability);
  document.querySelector('#ring').style.background=`conic-gradient(#87dfc4 ${probability*100}%, #263e4c 0)`;
  document.querySelector('#verdict').textContent=probability>=.5?'생존 가능성이 더 높게 예측됩니다':'생존 가능성이 더 낮게 예측됩니다';
  document.querySelector('#description').textContent=`${p.Pclass}등석 · ${p.Sex==='female'?'여성':'남성'} · ${p.Age===''?'나이 미상':p.Age+'세'} · 동행 가족 ${Number(p.SibSp)+Number(p.Parch)}명`;
 }
 form.addEventListener('submit',e=>{e.preventDefault();if(form.reportValidity())run();});
 document.querySelector('#random').addEventListener('click',()=>{const p=people[Math.floor(Math.random()*people.length)];for(const k of ['Sex','Pclass','Age','Fare','SibSp','Parch','Embarked'])form.elements[k].value=p[k]??'';run();});
 document.querySelectorAll('button').forEach(b=>b.disabled=false);
 form.addEventListener('input',()=>{document.querySelector('#description').textContent='입력이 변경되었습니다. 예측 버튼을 눌러 결과를 갱신하세요.';});
} catch(e) {document.querySelector('#verdict').textContent='모델을 불러오지 못했습니다';document.querySelector('#description').textContent='인터넷 연결을 확인하고 페이지를 새로고침하세요.';console.error(e);}
