import json, hashlib
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupShuffleSplit, StratifiedGroupKFold, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.dummy import DummyClassifier
from sklearn.metrics import accuracy_score, roc_auc_score, log_loss, brier_score_loss

ROOT=Path(__file__).resolve().parents[1]
df=pd.read_csv(ROOT/'data/titanic.csv')
def features(d,extended):
    age=pd.to_numeric(d.Age,errors='coerce')
    x=pd.DataFrame({'Pclass':d.Pclass,'Female':(d.Sex=='female').astype(int),'Age':age,'SibSp':d.SibSp,'Parch':d.Parch,'Fare':d.Fare,'EmbarkedC':(d.Embarked=='C').astype(int),'EmbarkedQ':(d.Embarked=='Q').astype(int),'AgeMissing':age.isna().astype(int)})
    if extended:
        x['FamilySize']=d.SibSp+d.Parch+1
        x['Alone']=(x.FamilySize==1).astype(int)
        x['FarePerPerson']=d.Fare/x.FamilySize
        x['Child']=(age<12).astype(int)
    return x
y=df.Survived
groups=df.Ticket
train,test=next(GroupShuffleSplit(n_splits=1,test_size=.2,random_state=42).split(df,y,groups))
assert set(groups.iloc[train]).isdisjoint(set(groups.iloc[test]))
cv=list(StratifiedGroupKFold(n_splits=5,shuffle=True,random_state=42).split(df.iloc[train],y.iloc[train],groups.iloc[train]))
for a,b in cv:
    assert set(groups.iloc[train].iloc[a]).isdisjoint(set(groups.iloc[train].iloc[b]))
specs=[('Baseline',False,DummyClassifier(strategy='prior')),('Logistic basic',False,LogisticRegression(C=1,max_iter=2000)),('Logistic family',True,LogisticRegression(C=1,max_iter=2000)),('Random forest basic',False,RandomForestClassifier(n_estimators=250,max_depth=6,min_samples_leaf=5,random_state=42,n_jobs=-1)),('Random forest family',True,RandomForestClassifier(n_estimators=250,max_depth=6,min_samples_leaf=5,random_state=42,n_jobs=-1)),('Gradient boosting family',True,GradientBoostingClassifier(n_estimators=100,max_depth=2,learning_rate=.05,min_samples_leaf=10,random_state=42))]
rows=[]; fitted={}
for name,ext,est in specs:
    x=features(df,ext)
    p=Pipeline([('imputer',SimpleImputer(strategy='median')),('scale',StandardScaler()),('model',est)])
    scores=cross_validate(p,x.iloc[train],y.iloc[train],cv=cv,scoring={'auc':'roc_auc','accuracy':'accuracy','loss':'neg_log_loss','brier':'neg_brier_score'})
    row={'model':name,'extended':ext,'cv_auc':float(scores['test_auc'].mean()),'cv_auc_std':float(scores['test_auc'].std()),'cv_accuracy':float(scores['test_accuracy'].mean()),'cv_log_loss':float(-scores['test_loss'].mean()),'cv_brier':float(-scores['test_brier'].mean())}
    rows.append(row); fitted[name]=(p,ext)
    print(json.dumps(row),flush=True)
best=min(rows,key=lambda r:r['cv_log_loss'])
p,ext=fitted[best['model']]; x=features(df,ext); p.fit(x.iloc[train],y.iloc[train]); pred=p.predict_proba(x.iloc[test])[:,1]
hold={'n':len(test),'accuracy':float(accuracy_score(y.iloc[test],pred>=.5)),'auc':float(roc_auc_score(y.iloc[test],pred)),'log_loss':float(log_loss(y.iloc[test],pred)),'brier':float(brier_score_loss(y.iloc[test],pred))}
report={'selected':best['model'],'selection_metric':'lowest 5-fold group CV log loss','rows':rows,'holdout':hold,'train_n':len(train),'seed':42,'group':'Ticket','source':'https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv','sha256':hashlib.sha256((ROOT/'data/titanic.csv').read_bytes()).hexdigest(),'holdout_passenger_ids':df.iloc[test].PassengerId.tolist()}
(ROOT/'report.json').write_text(json.dumps(report,indent=2),encoding='utf8')
# Evaluate only once on holdout, then refit selected architecture on all rows for deployment.
p.fit(x,y); est=p['model']
def tree(t,classification):
    v=t.value[:,0,:]
    value=(v[:,1]/v.sum(axis=1)).tolist() if classification else v[:,0].tolist()
    return {'left':t.children_left.tolist(),'right':t.children_right.tolist(),'feature':t.feature.tolist(),'threshold':t.threshold.tolist(),'value':value}
model={'name':best['model'],'extended':ext,'features':x.columns.tolist(),'median':p['imputer'].statistics_.tolist(),'mean':p['scale'].mean_.tolist(),'scale':p['scale'].scale_.tolist()}
if isinstance(est,LogisticRegression):model.update(kind='logistic',coef=est.coef_[0].tolist(),intercept=float(est.intercept_[0]))
elif isinstance(est,RandomForestClassifier):model.update(kind='forest',trees=[tree(t.tree_,True) for t in est.estimators_])
elif isinstance(est,GradientBoostingClassifier):model.update(kind='boost',trees=[tree(t[0].tree_,False) for t in est.estimators_],learning_rate=est.learning_rate,intercept=float(np.log(est.init_.class_prior_[1]/est.init_.class_prior_[0])))
else:raise RuntimeError('Baseline selected')
(ROOT/'model.json').write_text(json.dumps(model,separators=(',',':')),encoding='utf8')
fixtures=[]
for i in [0,1,7,62,100,500,890]:
    d=df.iloc[i]; inp={k:None if pd.isna(d[k]) else d[k].item() if isinstance(d[k],np.generic) else d[k] for k in ['Pclass','Sex','Age','SibSp','Parch','Fare','Embarked']}
    fixtures.append({'input':inp,'probability':float(p.predict_proba(x.iloc[[i]])[0,1])})
(ROOT/'tools/fixtures.json').write_text(json.dumps(fixtures),encoding='utf8')
df.to_json(ROOT/'data/records.json',orient='records')
print('SELECTED',best['model'],hold,flush=True)
