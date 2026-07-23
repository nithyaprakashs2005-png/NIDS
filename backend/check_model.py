import pickle, warnings
warnings.filterwarnings("ignore")

le = pickle.load(open("models/label_encoders.pkl", "rb"))
print("=== LABEL ENCODERS (class -> integer index) ===")
for col, enc in le.items():
    mapping = {cls: i for i, cls in enumerate(enc.classes_)}
    print(f"  {col}: {mapping}")

model = pickle.load(open("models/model.pkl", "rb"))
print(f"\n=== MODEL ===")
print(f"  n_features_in_: {model.n_features_in_}")
if hasattr(model, "feature_names_in_"):
    print(f"  feature_names_in_: {list(model.feature_names_in_)}")
else:
    print("  feature_names_in_: Not stored (array-based training)")

scaler = pickle.load(open("models/scaler.pkl", "rb"))
print(f"\n=== SCALER ===")
print(f"  type: {type(scaler).__name__}")
print(f"  n_features_in_: {scaler.n_features_in_}")
