import os
import pickle
import json
import logging
import numpy as np

logger = logging.getLogger(__name__)

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "model.pkl")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")
META_PATH = os.path.join(MODEL_DIR, "model_metadata.json")
ANN_PATH = os.path.join(MODEL_DIR, "ann_model.h5")
ENCODERS_PATH = os.path.join(MODEL_DIR, "label_encoders.pkl")

_model = None
_scaler = None
_metadata = None
_ann_model = None
_encoders = None
_explainer = None

EXPLAINER_PATH = os.path.join(MODEL_DIR, "explainer.pkl")


def _load_model():
    global _model, _scaler, _metadata, _ann_model, _encoders, _explainer

    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, "rb") as f:
            _model = pickle.load(f)
        logger.info("Loaded sklearn model from %s", MODEL_PATH)
    else:
        logger.warning("model.pkl not found — running in demo mode")

    if os.path.exists(SCALER_PATH):
        with open(SCALER_PATH, "rb") as f:
            _scaler = pickle.load(f)

    if os.path.exists(META_PATH):
        with open(META_PATH) as f:
            _metadata = json.load(f)

    if os.path.exists(ANN_PATH):
        try:
            from tensorflow.keras.models import load_model as keras_load
            _ann_model = keras_load(ANN_PATH)
            logger.info("Loaded ANN model from %s", ANN_PATH)
        except Exception as e:
            logger.warning("Could not load ANN model: %s", e)

    if os.path.exists(ENCODERS_PATH):
        try:
            with open(ENCODERS_PATH, "rb") as f:
                _encoders = pickle.load(f)
            logger.info("Loaded label encoders from %s", ENCODERS_PATH)
        except Exception as e:
            logger.warning("Could not load encoders: %s", e)

    if os.path.exists(EXPLAINER_PATH):
        try:
            with open(EXPLAINER_PATH, "rb") as f:
                _explainer = pickle.load(f)
            logger.info("Loaded SHAP explainer from %s", EXPLAINER_PATH)
        except Exception as e:
            logger.warning("Could not load explainer: %s", e)

def reload_models():
    """Forces the models to be reloaded from disk dynamically."""
    global _model, _scaler, _metadata, _ann_model, _encoders, _explainer
    _model = _scaler = _metadata = _ann_model = _encoders = _explainer = None
    logger.info("Models forcefully unloaded. Reloading triggered...")
    _load_model()
    return True

def get_explainer():
    global _explainer
    if _explainer is None and not is_demo_mode():
        _load_model()
    return _explainer

def get_model():
    global _model
    if _model is None:
        _load_model()
    return _model

_custom_models = {}

def get_model_by_type(model_type=None):
    global _custom_models
    if not model_type:
        return get_model()

    model_key = str(model_type).lower().strip().replace(" ", "_")
    if model_key in ["rf", "randomforest", "random_forest"]:
        filename = "model_random_forest.pkl"
    elif model_key in ["gb", "gradientboosting", "gradient_boosting"]:
        filename = "model_gradient_boosting.pkl"
    elif model_key in ["dt", "decisiontree", "decision_tree"]:
        filename = "model_decision_tree.pkl"
    elif model_key in ["knn", "k_nearest_neighbors"]:
        filename = "model_knn.pkl"
    elif model_key in ["lr", "logisticregression", "logistic_regression"]:
        filename = "model_logistic_regression.pkl"
    elif model_key in ["nb", "naivebayes", "naive_bayes"]:
        filename = "model_naive_bayes.pkl"
    else:
        return get_model()

    if model_key not in _custom_models:
        path = os.path.join(MODEL_DIR, filename)
        if os.path.exists(path):
            try:
                with open(path, "rb") as f:
                    _custom_models[model_key] = pickle.load(f)
                logger.info("Loaded custom model %s from %s", model_key, path)
            except Exception as e:
                logger.warning("Could not load custom model %s: %s", model_key, e)
                return get_model()
        else:
            logger.warning("Custom model %s not found at %s — using default model", model_key, path)
            return get_model()

    return _custom_models[model_key]


def get_scaler():
    global _scaler
    if _scaler is None:
        _load_model()
    return _scaler


def get_metadata():
    global _metadata
    if _metadata is None:
        _load_model()
    return _metadata


def get_ann():
    global _ann_model
    if _ann_model is None:
        _load_model()
    return _ann_model


def get_encoders():
    global _encoders
    if _encoders is None:
        _load_model()
    return _encoders


def is_demo_mode():
    return not os.path.exists(MODEL_PATH)
