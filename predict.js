export function predict(model, p) {
  const age = p.Age === null || p.Age === '' ? null : Number(p.Age);
  const family = Number(p.SibSp) + Number(p.Parch) + 1;
  const raw = [Number(p.Pclass), +(p.Sex === 'female'), age, Number(p.SibSp), Number(p.Parch), Number(p.Fare), +(p.Embarked === 'C'), +(p.Embarked === 'Q'), +(age === null)];
  if (model.extended) raw.push(family, +(family === 1), Number(p.Fare) / family, +(age !== null && age < 12));
  const x = raw.map((v, i) => ((v === null ? model.median[i] : v) - model.mean[i]) / model.scale[i]);
  function tree(t) { let n = 0; while (t.left[n] !== -1) n = x[t.feature[n]] <= t.threshold[n] ? t.left[n] : t.right[n]; return t.value[n]; }
  if (model.kind === 'forest') return model.trees.reduce((s, t) => s + tree(t), 0) / model.trees.length;
  const z = model.kind === 'logistic' ? model.intercept + x.reduce((s, v, i) => s + v * model.coef[i], 0) : model.intercept + model.learning_rate * model.trees.reduce((s, t) => s + tree(t), 0);
  return 1 / (1 + Math.exp(-z));
}
