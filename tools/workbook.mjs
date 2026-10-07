import fs from 'node:fs/promises';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const report=JSON.parse(await fs.readFile('report.json','utf8'));
const records=JSON.parse(await fs.readFile('data/records.json','utf8'));
const wb=Workbook.create();const summary=wb.worksheets.add('모델 비교');const raw=wb.worksheets.add('승객 원본');
summary.getRange('A2').values=[['타이타닉 모델 비교']];
summary.getRange('A4:F4').values=[['모델','CV ROC AUC','CV AUC 표준편차','CV 정확도','CV 로그 손실','CV Brier']];
summary.getRange('A5:F10').values=report.rows.map(r=>[r.model,r.cv_auc,r.cv_auc_std,r.cv_accuracy,r.cv_log_loss,r.cv_brier]);
summary.getRange('A12:B17').values=[['선택 모델',report.selected],['학습 승객 수',report.train_n],['별도 검증 승객 수',report.holdout.n],['검증 정확도',report.holdout.accuracy],['검증 ROC AUC',report.holdout.auc],['검증 로그 손실',report.holdout.log_loss]];
summary.getRange('A19').values=[['검증: 티켓별 그룹 분리, 학습 내 5겹 교차 검증, 최저 로그 손실로 선택.']];
summary.getRange('A20').values=[['결측값 대체·표준화는 폴드별 학습 데이터에만 적합. 검증 데이터는 최종 1회 평가.']];
summary.getRange('A21').values=[['배포 모델은 선택 후 전체 891명으로 재학습. 표시 성능은 재학습 전 별도 검증 결과.']];
summary.getRange('A22').values=[['한계: 역사 표본, 보정되지 않은 확률, 티켓이 다른 가족의 완전한 격리는 보장하지 않음.']];
const keys=Object.keys(records[0]);raw.getRange('A1').values=[['Source: '+report.source]];raw.getRange('A3:L894').values=[keys,...records.map(r=>keys.map(k=>r[k]))];
for(const s of [summary,raw]){s.showGridLines=false;s.getUsedRange().format.font.name='Arial';s.getUsedRange().format.font.size=10;s.getUsedRange().format.rowHeight=23;s.getUsedRange().format.columnWidth=16;}
summary.getRange('A2').format.font.size=16;summary.getRange('A2').format.font.bold=true;summary.getRange('A4:F4').format.fill='#17364C';summary.getRange('A4:F4').format.font.color='#FFFFFF';summary.getRange('A4:F4').format.font.bold=true;summary.getRange('A5:A10').format.columnWidth=33;summary.getRange('B5:F10').setNumberFormat('0.000');summary.getRange('D5:D10').setNumberFormat('0.0%');summary.getRange('B15').setNumberFormat('0.0%');summary.getRange('B16:B17').setNumberFormat('0.000');summary.getRange('A10:F10').format.fill='#E0F4EE';
raw.getRange('A3:L3').format.fill='#17364C';raw.getRange('A3:L3').format.font.color='#FFFFFF';raw.getRange('D3:D894').format.columnWidth=58;raw.getRange('I3:I894').format.columnWidth=24;raw.freezePanes.freezeRows(3);raw.freezePanes.freezeColumns(1);
await wb.recalculate();
console.log((await wb.inspect({kind:'table',range:'모델 비교!A4:F10',tableMaxRows:7,tableMaxCols:6,maxChars:2000})).ndjson);
await fs.mkdir('outputs',{recursive:true});
for(const [sheetName,range,name] of [['모델 비교','A2:F17','summary'],['승객 원본','A3:F10','raw']]){const img=await wb.render({sheetName,range,scale:1.5,format:'png'});await fs.writeFile(`outputs/${name}.png`,new Uint8Array(await img.arrayBuffer()));}
const out=await SpreadsheetFile.exportXlsx(wb);await out.save('outputs/titanic.xlsx');console.log('Excel exported: 891 original records + 6 model comparisons.');
