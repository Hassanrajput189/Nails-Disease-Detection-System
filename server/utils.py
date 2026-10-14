
import base64
import cv2
import numpy as np
import tensorflow as tf
from ultralytics import YOLO
from decouple import config
from tensorflow.keras.applications.mobilenet_v3 import preprocess_input
from huggingface_hub import hf_hub_download


HF_REPO = config("HF_REPO")
HF_TOKEN = config("HF_TOKEN")
detector_path = config("DETECTOR_PATH")
classifier_path = config("CLASSIFIER_PATH")
model = None
model_YOLO = None



def download_and_load_classifier():    
    global model
    model_path = hf_hub_download(
            repo_id=HF_REPO,
            filename=classifier_path,
            token=HF_TOKEN
        )          
    model = tf.keras.models.load_model(model_path)        
    print("Downloaded & loaded model to path:", model_path)    
    


def download_and_load_detector():
    global model_YOLO

    YOLO_path = hf_hub_download(
        repo_id=HF_REPO,
        filename=detector_path,
        token=HF_TOKEN
    )

    model_YOLO = YOLO(YOLO_path)

    print("Downloaded & loaded YOLO model to path:", YOLO_path)




def predict(img):    
    img_array = img[np.newaxis, ...]        
    # preprocess input 
    img_array_prep = preprocess_input(img_array)
    # ── Predict ──    
    y_pred = model.predict(img_array_prep)[0]    
    print(f"Prediction completed. Prediction: {y_pred}")
    return y_pred



 
# `models` is your existing dict of { model name:keras model}
_cam_cache = {}
 
 

# Model helpers

def _find_backbone(model, base_layer_name=None):
    """Find the nested backbone by name, or the first nested Model (robust to
    Rescaling/augmentation layers placed before it)."""
    if base_layer_name:
        return model.get_layer(base_layer_name)
    for layer in model.layers:
        if isinstance(layer, tf.keras.Model):
            return layer
    raise ValueError("No nested backbone model found; pass base_layer_name explicitly.")
 
 
def _find_last_conv(base_layer, last_conv_name=None):
    """Find the last layer in the backbone that outputs a 4D feature map."""
    if last_conv_name:
        return base_layer.get_layer(last_conv_name)
    for layer in reversed(base_layer.layers):
        out = getattr(layer, "output", None)
        if out is not None and len(out.shape) == 4:
            return layer
    raise ValueError("No 4D conv/activation layer found in backbone; pass last_conv_name.")
 
 
def build_logit_classifier(model, base_layer, last_conv_layer):
    """Rebuild the classifier head (everything after the backbone) with the
    final Dense outputting logits instead of softmax probabilities."""
    classifier_input = tf.keras.Input(shape=last_conv_layer.output.shape[1:])
    last_dense = [l for l in model.layers if isinstance(l, tf.keras.layers.Dense)][-1]
 
    x = classifier_input
    found = False
    for layer in model.layers:
        if found:
            if layer is last_dense:
                logit_layer = tf.keras.layers.Dense(
                    units=layer.units,
                    activation=None,
                    use_bias=layer.use_bias,
                    name=layer.name + "_logits",
                )
                x = logit_layer(x)
                logit_layer.set_weights(layer.get_weights())
            else:
                x = layer(x)
        if layer is base_layer:
            found = True
 
    if not found:
        raise ValueError("Backbone layer not found in model.layers.")
    return tf.keras.Model(inputs=classifier_input, outputs=x)
 
 
def get_cam_models(base_layer_name=None, last_conv_name=None):
    """Build once per (model, layer config) and cache.
    Returns two tf.function wrappers with a dynamic batch dimension,
    so changing batch sizes never triggers retracing."""
    key = ( base_layer_name, last_conv_name)
    if key not in _cam_cache:
        base = _find_backbone(model, base_layer_name)
        last_conv = _find_last_conv(base, last_conv_name)
 
        conv_model = tf.keras.Model(base.input, last_conv.output)
        classifier_model = build_logit_classifier(model, base, last_conv)
 
        conv_fn = tf.function(
            lambda x: conv_model(x, training=False),
            input_signature=[tf.TensorSpec([None, *conv_model.input_shape[1:]], tf.float32)],
        )
        cls_fn = tf.function(
            lambda x: classifier_model(x, training=False),
            input_signature=[tf.TensorSpec([None, *classifier_model.input_shape[1:]], tf.float32)],
        )
 
        _cam_cache[key] = (conv_fn, cls_fn)
        print("Built Score-CAM models for 'F%s' (last conv: %s)", last_conv.name)
    return _cam_cache[key]
    

# Score-CAM
def make_scorecam_heatmap(
    img_array,
    max_channels=64,
    class_idx=None,        # None -> predicted class; pass e.g. the true KL grade to compare
    batch_size=32,
    normalize="minmax",    # "minmax" (default) or "softmax" (paper-style)
    use_increase=True,     # score = masked logit - baseline logit (paper-style)
    base_layer_name=None,
    last_conv_name=None,
    return_info=False,
):
    """
    Logit-based Score-CAM.
    Returns heatmap in [0, 1] of shape (H, W) of the last conv feature map.
    If return_info=True, returns (heatmap, info) where info has pred_index,
    class_idx, logits, used_fallback.
    """
    print("cache is ",_cam_cache)
    # ---- input validation ----
    img_array = np.asarray(img_array)
    if img_array.ndim != 4 or img_array.shape[0] != 1 or img_array.shape[-1] != 3:
        raise ValueError(f"img_array must have shape (1, H, W, 3), got {img_array.shape}")
    img_array = img_array.astype(np.float32, copy=False)
    if normalize not in ("minmax", "softmax"):
        raise ValueError("normalize must be 'minmax' or 'softmax'")
 
    conv_model, classifier_model = get_cam_models(base_layer_name, last_conv_name)
 
    # ---- single backbone pass, reused for baseline ----
    feature_maps = conv_model(img_array).numpy()[0]  # H, W, C
    H, W, C = feature_maps.shape
    input_H, input_W = img_array.shape[1], img_array.shape[2]
 
    baseline_logits = classifier_model(feature_maps[None]).numpy()[0]
    pred_index = int(np.argmax(baseline_logits))
    target = pred_index if class_idx is None else int(class_idx)
    if not 0 <= target < len(baseline_logits):
        raise ValueError(f"class_idx {target} out of range (0..{len(baseline_logits) - 1})")
    baseline_score = float(baseline_logits[target])
    print("Baseline logits: %s (target class %d)", baseline_logits, target)
 
    # ---- channel selection: highest-variance channels, not uniform sampling ----
    k = min(max_channels, C)
    variances = feature_maps.reshape(-1, C).var(axis=0)
    channel_indices = np.argsort(variances)[::-1][:k]
    fm = feature_maps[:, :, channel_indices]                      # H, W, K
 
    fmin = fm.min(axis=(0, 1))
    fmax = fm.max(axis=(0, 1))
    valid = (fmax - fmin) > 1e-8                                   # dead-channel mask
    masks_small = (fm - fmin) / np.where(valid, fmax - fmin, 1.0)  # H, W, K
 
    # "black" in preprocessed space, so masking removes info instead of making mid-gray
    black = float(img_array.min())
 
    # ---- batched masked forward passes ----
    raw_scores = np.empty(k, dtype=np.float32)
    for s in range(0, k, batch_size):
        e = min(s + batch_size, k)
        masks = np.stack(
            [cv2.resize(masks_small[:, :, j], (input_W, input_H)) for j in range(s, e)]
        )[..., None].astype(np.float32)                            # b, h, w, 1
        masked_input = (black + masks * (img_array - black)).astype(np.float32)
        conv = conv_model(masked_input)
        logits = classifier_model(conv).numpy()
        raw_scores[s:e] = logits[:, target]
 
    if use_increase:
        raw_scores = raw_scores - baseline_score
 
    # ---- dead channels get the lowest valid score (or zero if none valid) ----
    if valid.any():
        raw_scores[~valid] = raw_scores[valid].min()
    else:
        raw_scores[:] = 0.0
 
    print("Scores min=%.4f max=%.4f std=%.4f",
                 raw_scores.min(), raw_scores.max(), raw_scores.std())
 
    # ---- weights ----
    used_fallback = False
    score_range = float(raw_scores.max() - raw_scores.min())
 
    if not valid.any() or score_range < 1e-6:
        used_fallback = True
        print("Score-CAM scores are flat; falling back to mean activation "
                       "(NOT class-specific).")
        heatmap = np.maximum(feature_maps, 0).mean(axis=-1)
    else:
        if normalize == "softmax":
            z = raw_scores - raw_scores.max()
            weights = np.exp(z) / np.exp(z).sum()
        else:
            weights = (raw_scores - raw_scores.min()) / score_range
        heatmap = np.tensordot(fm, weights.astype(np.float32), axes=([2], [0]))  # H, W
        heatmap = np.maximum(heatmap, 0)
 
    heatmap = heatmap.astype(np.float32)
    if heatmap.max() > 0:
        heatmap /= heatmap.max()
 
    if return_info:
        info = {
            "pred_index": pred_index,
            "class_idx": target,
            "logits": baseline_logits,
            "used_fallback": used_fallback,
        }
        return heatmap, info
    return heatmap
 
 

# Overlay / encoding

def _to_uint8_rgb(img):
    """Normalise any reasonable image to uint8 RGB (H, W, 3)."""
    img = np.asarray(img)
    if img.ndim == 2:
        img = np.stack([img] * 3, axis=-1)
    elif img.ndim == 3 and img.shape[-1] == 1:
        img = np.repeat(img, 3, axis=-1)
    elif img.ndim == 3 and img.shape[-1] == 4:
        img = img[..., :3]
    elif img.ndim != 3 or img.shape[-1] != 3:
        raise ValueError(f"Unsupported image shape {img.shape}")
 
    if img.dtype != np.uint8:
        img = img.astype(np.float32)
        if img.max() <= 1.0:
            img = img * 255.0
        img = np.clip(img, 0, 255).astype(np.uint8)
    return np.ascontiguousarray(img)
 
 
def overlay_heatmap(img_rgb, heatmap, alpha=0.4, threshold=0.2, blue_background=True):
    """
    blue_background=True: tint the whole image with JET at constant `alpha`,
    so unanalyzed (zero-activation) areas appear blue.
    blue_background=False: old behavior, transparent below `threshold`.
    """
    img_rgb = _to_uint8_rgb(img_rgb)
    h, w = img_rgb.shape[:2]

    hm = cv2.resize(np.asarray(heatmap, dtype=np.float32), (w, h),
                    interpolation=cv2.INTER_CUBIC)
    hm = np.clip(hm, 0.0, 1.0)

    colored_bgr = cv2.applyColorMap(np.uint8(255 * hm), cv2.COLORMAP_JET)
    colored = cv2.cvtColor(colored_bgr, cv2.COLOR_BGR2RGB).astype(np.float32)

    if blue_background:
        a = alpha  # constant: zero-activation pixels become JET blue
    else:
        # 0 below threshold, ramps up to `alpha` at the hottest areas
        a = alpha * np.clip((hm - threshold) / (1.0 - threshold), 0.0, 1.0)[..., None]
    out = img_rgb.astype(np.float32) * (1.0 - a) + colored * a
    
    return np.clip(out, 0, 255).astype(np.uint8)
 
def convert_to_base64(img, fmt="png", data_uri=False):
    """
    Encode an RGB image to base64. PNG is lossless (default); use fmt="jpg" for smaller size.
    data_uri=True returns a ready-to-use 'data:image/...;base64,...' string.
    """
    fmt = fmt.lower().lstrip(".")
    if fmt not in ("png", "jpg", "jpeg"):
        raise ValueError("fmt must be 'png' or 'jpg'")
 
    img = _to_uint8_rgb(img)
    img_bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
 
    ext = ".png" if fmt == "png" else ".jpg"
    ok, buffer = cv2.imencode(ext, img_bgr)
    if not ok:
        raise RuntimeError("cv2.imencode failed")
 
    b64 = base64.b64encode(buffer).decode("utf-8")
    if data_uri:
        mime = "image/png" if fmt == "png" else "image/jpeg"
        return f"data:{mime};base64,{b64}"
    return b64