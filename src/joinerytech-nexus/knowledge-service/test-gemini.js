if (!process.env.GEMINI_API_KEY) {
  // Rotalva 2026-07-30: a kulcs korabban BEEGETVE volt egy PUBLIKUS repoban.
  // Szandekosan hangos hiba: nema fallback pont ezt a szivargast tartotta eletben.
  throw new Error('GEMINI_API_KEY nincs beallitva -- allitsd be a kornyezetben.');
}
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');

const apiKey = process.env.GEMINI_API_KEY;

const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey,
  modelName: 'gemini-embedding-001',
});

embeddings.embedDocuments(['test text 1', 'test text 2'])
  .then(result => {
    console.log('Success! Embeddings:', result.length, 'vectors');
    console.log('First embedding length:', result[0]?.length);
    console.log('First 5 dims:', result[0]?.slice(0, 5));
  })
  .catch(err => {
    console.error('Error:', err.message);
    console.error('Full error:', err);
  });
