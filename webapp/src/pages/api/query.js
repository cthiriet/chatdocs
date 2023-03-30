import { OpenAIStream } from "@/lib/OpenAIStream";
import { PineconeClient } from "@pinecone-database/pinecone";

const pinecone = new PineconeClient();

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing env var from OpenAI");
}

export const config = {
  runtime: "edge",
};

/**
 *
 * @param {import('next').NextApiRequest} req
 * @returns
 */
const handler = async (req) => {
  try {
    const { namespace, query } = await req.json();

    await pinecone.init({
      environment: process.env.PINECONE_ENV,
      apiKey: process.env.PINECONE_API_KEY,
    });
    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);

    const res = await fetch("https://api.openai.com/v1/embeddings", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
      },
      method: "POST",
      body: JSON.stringify({
        model: "text-embedding-ada-002",
        input: query,
      }),
    });
    let embedding = await res.json();
    embedding = embedding.data[0].embedding;

    const queryResponse = await index.query({
      queryRequest: {
        namespace,
        topK: 4,
        includeMetadata: true,
        vector: embedding,
      },
    });

    const texts = queryResponse.matches.map((result) => result.metadata.text);

    const prompt = `Context: ${texts.join("")}
    
Question: ${query}

Helpful Answer:`;

    const messages = [
      {
        role: "system",
        content:
          "Use the pieces of context at the beginning of each query to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.",
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    const payload = {
      model: "gpt-3.5-turbo",
      stream: true,
      messages,
    };

    const stream = await OpenAIStream(payload);
    return new Response(stream);
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err.message,
      }),
      { status: err.statusCode || 500 }
    );
  }
};

export default handler;
