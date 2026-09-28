import json
import numpy as np
import pandas as pd
import shap
from pathlib import Path
from backend.app.services.model_serving import model_serving

root = Path(r'C:\Users\A1\Desktop\PCCOE\urban-environmental-digital-twin\ml')
meta = json.load(open(root / 'models' / 'feature_names.json'))
core = meta['core_features']
model_serving.initialize()
model = model_serving.loaded_models['gradient_boosting_baseline']
pre = model_serving.preprocessor

df = pd.read_csv(root / 'data' / 'processed' / 'features' / 'train.csv')
row = df[df['target_available'] == 1].head(1).copy()
X_proc = pre.transform(row[core])
X_dense = X_proc.toarray() if hasattr(X_proc, 'toarray') else X_proc
print('X shape', X_dense.shape)
print('first 5 names', pre.get_feature_names_out()[:5])
print('is hist model', hasattr(model, 'estimators_'), type(model).__name__)
raw = shap.TreeExplainer(model).shap_values(X_dense)
print('raw type', type(raw))
if isinstance(raw, list):
    print('raw list len', len(raw))
    print('raw[0] shape', np.asarray(raw[0]).shape)
    print('raw[0] sample', np.asarray(raw[0])[0][:10])
else:
    arr = np.asarray(raw)
    print('shape', arr.shape)
    print('sample', arr[0][:10])
    print('max abs', np.max(np.abs(arr[0])))
    print('mean abs', np.mean(np.abs(arr[0])))

values = np.asarray(raw if not isinstance(raw, list) else raw[0])
row_contrib = values[0] if values.ndim > 1 else values
print('row_contrib sample', row_contrib[:10])
print('row_contrib max abs', np.max(np.abs(row_contrib)))
print('backend call', model_serving.explain_prediction('gradient_boosting_baseline', row[core])[:5])
