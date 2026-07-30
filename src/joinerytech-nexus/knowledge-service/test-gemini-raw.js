if (!process.env.GEMINI_API_KEY) {
  // Rotalva 2026-07-30: a kulcs korabban BEEGETVE volt egy PUBLIKUS repoban.
  // Szandekosan hangos hiba: nema fallback pont ezt a szivargast tartotta eletben.
  throw new Error('GEMINI_API_KEY nincs beallitva -- allitsd be a kornyezetben.');
}
const apiKey = process.env.GEMINI_API_KEY;

// Gemini embedding API endpoint (correct one)
const url = `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${apiKey}`;

const payload = {
  model: "models/embedding-001",
  content: {
    parts: [{ text: "test text for embedding" }]
  }
};

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
  .then(res => res.json())
  .then(data => {
    console.log('Response:', JSON.stringify(data, null, 2));
    if (data.embedding) {
      console.log('✅ Embedding length:', data.embedding.values?.length || 0);
      console.log('First 5 dims:', data.embedding.values?.slice(0, 5));
    }
  })
  .catch(err => console.error('Error:', err.message));
