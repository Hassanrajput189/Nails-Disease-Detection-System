
export function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read image.'));

    reader.readAsDataURL(file);
  });
}

export function makeThumb(src, size = 96) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = size / Math.min(img.width, img.height);

      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const context = canvas.getContext('2d');

      if (!context) {
        reject(new Error('Unable to create image thumbnail.'));
        return;
      }

      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };

    img.onerror = () => reject(new Error('Invalid image file.'));
    img.src = src;
  });
}

const API_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export async function predict(file) {
  const formData = new FormData();

  // Backend expects the upload field to be named "image".
  formData.append('image', file);

  const response = await fetch(`${API_URL}/predict`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.detail || 'Prediction failed. Please try another image.'
    );
  }

  if (
    !data.predicted_category ||
    typeof data.confidence !== 'number' ||
    !data.class_probabilities
  ) {
    throw new Error('The backend returned an unexpected prediction result.');
  }

  const preds = Object.entries(data.class_probabilities)
    .map(([label, probability]) => ({
      l: label.replaceAll('_', ' '),
      p: Number((probability * 100).toFixed(2)),
    }))
    .sort((a, b) => b.p - a.p);

  return {
    predicted_category: data.predicted_category,
    confidence: data.confidence,
    preds,
    heatmap: data.heatmap,
    processing_time: data.processing_time,
  };
}

/*
  Decides whether a predicted class means "healthy" (=> confetti celebration).
  Matches labels like Healthy, Healthy_Nail, Normal, Not_Biting, No_Bite ...
  Labels such as Unhealthy / Not healthy are NOT healthy.
  If your backend uses a different class name, add it to the HEALTHY_PATTERN below.
*/
const HEALTHY_PATTERN = /\b(healthy|normal|(not|non|no)\s+(biting|biter|bite|bitten))\b/;
const UNHEALTHY_PATTERN = /\b(un|not|non)\s?-?healthy\b/;

export function isHealthy(category = '') {
  const label = String(category).replace(/[_-]+/g, ' ').trim().toLowerCase();
  if (UNHEALTHY_PATTERN.test(label)) return false;
  return HEALTHY_PATTERN.test(label);
}
