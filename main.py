import functions_framework

from dotenv import load_dotenv

from langchain import OpenAI, VectorDBQA
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.vectorstores import Pinecone
from langchain.callbacks import get_openai_callback

import os
import nltk
import pinecone
import uuid


class APIError(Exception):
    def __init__(self, statusCode=400, message="An unknown error occurred."):
        super().__init__(message)
        self.statusCode = statusCode


# Load the environment variables from the .env file
load_dotenv()

nltk.download('punkt')

# initialize pinecone
pinecone.init(api_key=os.environ["PINECONE_API_KEY"],
              environment="us-east1-gcp")

pinecone_index_name = os.environ["PINECONE_INDEX_NAME"]
namespace = os.environ["PINECONE_INDEX_NAME"]

llm = OpenAI(temperature=0, max_tokens=500)
embeddings = OpenAIEmbeddings()


@functions_framework.http
def chatdocs(request):
    # Set CORS headers for the preflight request
    if request.method == 'OPTIONS':
        # Allows POST requests from any origin with the Content-Type
        # header and caches preflight response for an 3600s
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '3600'
        }

        return ('', 204, headers)

    headers = {
        'Access-Control-Allow-Origin': '*'
    }

    try:
        query_id = str(uuid.uuid4())

        query = request.get_json().get('query')

        if not query:
            raise APIError(400, "No query provided.")

        docsearch = Pinecone.from_existing_index(
            pinecone_index_name, embeddings)

        qa = VectorDBQA.from_chain_type(llm=llm, chain_type="stuff", vectorstore=docsearch,
                                        return_source_documents=True, search_kwargs={"namespace": namespace})

        with get_openai_callback() as cb:
            result = qa({"query": query})
            answer = result["result"]
            source_documents = result["source_documents"]

        sites = []
        for doc in source_documents:
            if doc.metadata["url"] not in sites:
                sites.append(doc.metadata["url"])

        return ({
            'id': query_id,
            'query': query,
            'answer': answer,
            'sources': sites,
            'total_tokens': cb.total_tokens
        }, 200, headers)

    except APIError as e:
        print(e)
        return ({'error': str(e)}, e.statusCode, headers)

    except Exception as e:
        print(e)
        return ({'error': "An unknown error occurred."}, 400, headers)
